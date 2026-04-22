import { useState, useEffect, useMemo } from 'react';
import { 
  Wind, Plus, Search, Filter, Loader2, Download, Trash2, Edit3, 
  Save, X, ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp,
  Calendar, Info
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { getCurrentUser, ROLES } from '../data/organization';
import { pushActionNotification } from '../utils/actionNotifications';

const API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";

interface Transaction {
  id: string;
  tanggal: string;
  keterangan: string;
  debit: number;
  kredit: number;
  saldo: number;
  hasRealId?: boolean;
}

const SEED_DATA: Transaction[] = [
  { id: 'AC-1', tanggal: '19-Jan', keterangan: 'Diterima dari Bu Anum jatah Des 2025-Jan 2026', debit: 1667000, kredit: 0, saldo: 1667000 },
  { id: 'AC-2', tanggal: '19-Jan', keterangan: 'Sisa jatah AC nov 2025', debit: 1200000, kredit: 0, saldo: 2867000 },
  { id: 'AC-3', tanggal: '19-Jan', keterangan: 'Pemeliharaan AC des-jan', debit: 0, kredit: 2690000, saldo: 177000 },
  { id: 'AC-4', tanggal: '23-Feb', keterangan: 'Jatah AC Februari 2026', debit: 1667000, kredit: 0, saldo: 1844000 },
  { id: 'AC-5', tanggal: '23-Feb', keterangan: 'Pemeliharaan AC feb', debit: 0, kredit: 1285000, saldo: 559000 },
  { id: 'AC-6', tanggal: '5-Mar', keterangan: 'Jatah AC Maret 2026', debit: 1667000, kredit: 0, saldo: 2226000 },
];

const ACCash = () => {
  const currentUser = getCurrentUser();
  const isAdmin = currentUser.roleAplikasi === ROLES.PIMPINAN || currentUser.roleAplikasi === ROLES.PIC_ADMIN;
  
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTrx, setEditingTrx] = useState<Transaction | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    tanggal: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
    keterangan: '',
    debit: 0,
    kredit: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const calculateBalances = (data: Transaction[]) => {
    let currentBalance = 0;
    return data.map(item => {
      currentBalance = currentBalance + (item.debit || 0) - (item.kredit || 0);
      return { ...item, saldo: currentBalance };
    });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?sheetName=Kas_AC`);
      const data = await response.json();
      
      if (data && Array.isArray(data) && data.length > 0) {
        const mappedData = data
          .map((item: any) => ({
            id: item.id || item.ID || `AC-${Date.now()}-${Math.random()}`,
            tanggal: item.tanggal || item.Tanggal || '',
            keterangan: item.keterangan || item.Keterangan || '',
            debit: Number(item.debit || item.Debit || 0),
            kredit: Number(item.kredit || item.Kredit || 0),
            saldo: 0, // Will be recalculated
            hasRealId: !!(item.id || item.ID)
          }))
          .filter(item => 
            (item.tanggal && item.keterangan) || 
            (item.debit > 0 || item.kredit > 0)
          );

        if (mappedData.length > 0) {
          setTransactions(calculateBalances(mappedData));
        } else {
          setTransactions(calculateBalances(SEED_DATA));
        }
      } else {
        setTransactions(calculateBalances(SEED_DATA));
      }
    } catch (error) {
      console.error("Error fetching AC cash data:", error);
      setTransactions(calculateBalances(SEED_DATA));
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const income = transactions.reduce((sum, t) => sum + Number(t.debit), 0);
    const expense = transactions.reduce((sum, t) => sum + Number(t.kredit), 0);
    const balance = income - expense;
    return { income, expense, balance };
  }, [transactions]);

  const chartData = useMemo(() => {
    let currentBalance = 0;
    return transactions.map(t => {
      currentBalance = t.saldo;
      return {
        name: t.tanggal,
        saldo: currentBalance
      };
    });
  }, [transactions]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const id = editingTrx ? editingTrx.id : `AC-${Date.now()}`;
    
    // Recalculate balance for the new entry based on last entry
    const lastBalance = transactions.length > 0 ? transactions[transactions.length - 1].saldo : 0;
    const newSaldo = lastBalance + Number(formData.debit) - Number(formData.kredit);

    const newRecord = {
      action: 'FINANCE_RECORD',
      sheetName: 'Kas_AC',
      id: id,
      ID: id,
      ...formData,
      debit: Number(formData.debit),
      kredit: Number(formData.kredit),
      saldo: newSaldo
    };

    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(newRecord)
      });
      
      // Update local state
      if (editingTrx) {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...formData, debit: Number(formData.debit), kredit: Number(formData.kredit), saldo: newSaldo } : t));
      } else {
        const newTrx = { id, ...formData, debit: Number(formData.debit), kredit: Number(formData.kredit), saldo: newSaldo, hasRealId: true };
        setTransactions(prev => [...prev, newTrx]);
      }
      
      const isEditing = Boolean(editingTrx);
      const nominalDisplay = (Number(formData.debit) || Number(formData.kredit)).toLocaleString('id-ID');
      pushActionNotification({
        id: `ac:${id}:${Date.now()}`,
        dedupeKey: isEditing ? `ac-upd:${id}` : `ac-new:${id}`,
        type: isEditing ? 'ac_cash_updated' : 'ac_cash_created',
        title: isEditing ? '✏️ Kas AC Diperbarui' : '❄️ Transaksi Kas AC Baru',
        message: `${currentUser.nama.split(',')[0]} ${isEditing ? 'memperbarui' : 'mencatat'} transaksi AC: "${(formData.keterangan || '').substring(0, 35)}" - Rp ${nominalDisplay}.`,
        path: '/ac-cash',
        iconKey: isEditing ? 'edit' : 'message',
        color: isEditing ? 'var(--accent-blue)' : 'var(--accent-blue)',
        bg: isEditing ? 'var(--accent-blue-ghost)' : 'rgba(59, 130, 246, 0.1)'
      });

      setShowModal(false);
      setEditingTrx(null);
      setFormData({ 
        tanggal: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }), 
        keterangan: '', 
        debit: 0, 
        kredit: 0 
      });
      
      // Refresh to ensure spreadsheet consistency
      setTimeout(fetchData, 2000);
      alert("Terima kasih! Data kas perawatan AC berhasil diperbarui.");
    } catch (error) {
      console.error("Error saving AC cash entry:", error);
      alert("Gagal menghubungi server database.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (trx: Transaction) => {
    if (!trx.hasRealId && !trx.id.toString().startsWith('AC-')) {
      alert("Peringatan: Transaksi ini tidak memiliki ID unik di database. Silakan edit dan simpan transaksi ini sekali lagi agar mendapatkan ID permanen sebelum dihapus.");
      return;
    }

    if (!confirm(`Hapus riwayat transaksi AC "${trx.keterangan}" dari database?`)) return;
    
    const id = trx.id;
    setLoading(true);
    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ 
          action: 'DELETE_RECORD', 
          sheetName: 'Kas_AC',
          id: id,
          ID: id
        })
      });
      
      setTransactions(prev => prev.filter(t => t.id !== id));
      pushActionNotification({
        id: `ac-del:${id}:${Date.now()}`,
        dedupeKey: `ac-del:${id}`,
        type: 'ac_cash_deleted',
        title: '🗑️ Kas AC Dihapus',
        message: `${currentUser.nama.split(',')[0]} menghapus transaksi AC "${(trx.keterangan || '').substring(0, 35)}" dari database.`,
        path: '/ac-cash',
        iconKey: 'trash',
        color: 'var(--accent-rose)',
        bg: 'rgba(244, 63, 94, 0.1)'
      });
      setTimeout(fetchData, 2000);
    } catch (error) {
      console.error("Error deleting AC cash entry:", error);
      alert("Gagal menghubungi server database.");
      setLoading(false);
    }
  };

  const handleEdit = (trx: Transaction) => {
    setEditingTrx(trx);
    setFormData({
      tanggal: trx.tanggal,
      keterangan: trx.keterangan,
      debit: trx.debit,
      kredit: trx.kredit
    });
    setShowModal(true);
  };

  const filteredTransactions = transactions.filter(t => 
    t.keterangan.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.tanggal.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = String(d.getFullYear()).slice(-2);
      return `${day}-${month}-${year}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Header & Stats Section */}
      <div className="flex-row-responsive" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Wind size={32} color="var(--accent-blue)" /> Kas Perawatan AC
          </h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Pencatatan termin jatah dan pemeliharaan AC sekolah</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={18} /> <span className="mobile-hide">Export PDF</span>
          </button>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => { setEditingTrx(null); setShowModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={18} /> <span>Transaksi Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '2.5rem' }}>
        {[
          { title: 'Total Jatah Masuk', value: totals.income, icon: ArrowUpCircle, color: 'var(--accent-emerald)', label: 'Total Jatah Masuk' },
          { title: 'Total Pemeliharaan', value: totals.expense, icon: ArrowDownCircle, color: 'var(--accent-rose)', label: 'Total Pemeliharaan' },
          { title: 'Saldo Kas Saat Ini', value: totals.balance, icon: Wallet, color: 'var(--accent-blue)', label: 'Saldo Saat Ini' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="glass-panel" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: `${stat.color}15`, padding: '0.5rem 1rem', display: 'flex', alignItems: 'center' }}>
                <Icon size={20} color={stat.color} />
              </div>
              <div style={{ padding: '1.5rem 1.25rem' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{stat.label.split(' ').slice(0, -1).join(' ')}</div>
                <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{stat.label.split(' ').pop()} <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginLeft: '0.25rem' }}>{formatCurrency(stat.value)}</span></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & History Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Main Chart */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} color="var(--accent-blue)" /> Visualisasi Trend Saldo AC
            </h3>
            <div className="badge badge-info" style={{ fontSize: '0.7rem' }}>Realtime Monitoring</div>
          </div>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSaldoAC" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  tickFormatter={(val) => `Rp${val/1000}rb`}
                />
                <RechartsTooltip 
                  contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--accent-blue)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="saldo" 
                  stroke="var(--accent-blue)" 
                  fillOpacity={1} 
                  fill="url(#colorSaldoAC)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Transaction History */}
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Calendar size={18} color="var(--accent-emerald)" /> Riwayat Transaksi AC
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', flex: 1, justifyContent: 'flex-end', minWidth: '200px' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
                <Search size={14} style={{ position: 'absolute', top: '10px', left: '10px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Cari transaksi..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', fontSize: '0.85rem', color: 'var(--text-primary)' }}
                />
              </div>
              <button className="btn btn-outline" style={{ padding: '0 0.75rem' }} title="Filter transaksi"><Filter size={16} /></button>
            </div>
          </div>

          <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <table>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)' }}>
                <tr>
                  <th>Tanggal</th>
                  <th>Keterangan</th>
                  <th style={{ textAlign: 'right' }}>Debit (Masuk)</th>
                  <th style={{ textAlign: 'right' }}>Kredit (Keluar)</th>
                  <th style={{ textAlign: 'right' }}>Saldo Akhir</th>
                  {isAdmin && <th style={{ textAlign: 'center' }}>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {loading && transactions.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '3rem' }}>
                      <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 1rem auto', color: 'var(--accent-blue)' }} />
                      <p style={{ color: 'var(--text-muted)' }}>Menghubungkan ke Google Sheets...</p>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      <Info size={32} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                      <p>Data tidak ditemukan</p>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((trx) => (
                    <tr key={trx.id} className="ticket-row">
                      <td style={{ fontSize: '0.85rem' }}>{formatDisplayDate(trx.tanggal)}</td>
                      <td style={{ fontSize: '0.9rem', fontWeight: 500 }}>{trx.keterangan}</td>
                      <td style={{ textAlign: 'right', color: 'var(--accent-emerald)', fontSize: '0.85rem' }}>
                        {trx.debit > 0 ? formatCurrency(trx.debit) : '-'}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--accent-rose)', fontSize: '0.85rem' }}>
                        {trx.kredit > 0 ? formatCurrency(trx.kredit) : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {formatCurrency(trx.saldo)}
                      </td>
                      {isAdmin && (
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button className="btn btn-outline" onClick={() => handleEdit(trx)} style={{ padding: '0.3rem', borderRadius: '4px' }} title="Edit transaksi">
                              <Edit3 size={14} />
                            </button>
                            <button className="btn btn-outline" onClick={() => handleDelete(trx)} style={{ padding: '0.3rem', borderRadius: '4px', color: 'var(--accent-rose)' }} title="Hapus transaksi">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Entry Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel animate-scale-in" style={{ width: '100%', maxWidth: '450px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{editingTrx ? 'Edit Transaksi' : 'Transaksi Baru Kas AC'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} title="Tutup modal"><X size={24} /></button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tanggal (Contoh: 19-Jan)</label>
                <input 
                  type="text" 
                  value={formData.tanggal}
                  onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                  required
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: '0.75rem', borderRadius: '8px', color: 'white' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Deskripsi Keperluan / Jatah</label>
                <input 
                  type="text" 
                  value={formData.keterangan}
                  onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                  required
                  placeholder="Contoh: Pembayaran Service AC Lab..."
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: '0.75rem', borderRadius: '8px', color: 'white' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Debit (Masuk)</label>
                  <input 
                    type="number" 
                    value={formData.debit}
                    onChange={(e) => setFormData({...formData, debit: Number(e.target.value)})}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: '0.75rem', borderRadius: '8px', color: 'white' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Kredit (Keluar)</label>
                  <input 
                    type="number" 
                    value={formData.kredit}
                    onChange={(e) => setFormData({...formData, kredit: Number(e.target.value)})}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: '0.75rem', borderRadius: '8px', color: 'white' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Simpan</>}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ACCash;
