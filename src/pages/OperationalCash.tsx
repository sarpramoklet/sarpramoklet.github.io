import { useState, useEffect, useMemo } from 'react';
import { 
  Coins, Plus, Search, Filter, Loader2, Download, Trash2, Edit3, 
  Save, X, ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp,
  Calendar, Info
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { getCurrentUser, ROLES } from '../data/organization';

const API_URL = "https://script.google.com/macros/s/AKfycbwzimTeSIIEpjUMVfI4EEc90ZDEixIeMBM9WFBQKPulYHYGF2CqhwjHgQe0ZMB7SfNSGw/exec";

interface Transaction {
  id: string;
  tanggal: string;
  keterangan: string;
  debit: number;
  kredit: number;
  saldo: number;
}

const SEED_DATA: Transaction[] = [
  { id: '1', tanggal: '9-Jan', keterangan: 'Sisa Operasional dari Bu Rosel', debit: 9050000, kredit: 0, saldo: 9050000 },
  { id: '2', tanggal: '23/12/2025', keterangan: 'Pembayaran biaya service printer EPSON dan CANON', debit: 0, kredit: 185000, saldo: 8865000 },
  { id: '3', tanggal: '9-Jan', keterangan: 'Pembayaran upah perbaikan kaca jendela ruang 23', debit: 0, kredit: 900000, saldo: 7965000 },
  { id: '4', tanggal: '9-Jan', keterangan: 'Pembayaran upah perbaikan pipa di kantin', debit: 0, kredit: 600000, saldo: 7365000 },
  { id: '5', tanggal: '10-Jan', keterangan: 'Biaya Cloud Dedicated Server (Januari 2026)', debit: 0, kredit: 6315901, saldo: 1049099 },
  { id: '6', tanggal: '10-Jan', keterangan: 'Pembayaran biaya cuci mobil sekolah Innova', debit: 0, kredit: 50000, saldo: 999099 },
  { id: '7', tanggal: '13-Jan', keterangan: 'Pembelian paku beton untuk pemasangan artefak', debit: 0, kredit: 29000, saldo: 970099 },
  { id: '8', tanggal: '14-Jan', keterangan: 'Pembelian pengharum mobil sekolah', debit: 0, kredit: 105300, saldo: 864799 },
  { id: '9', tanggal: '15-Jan', keterangan: 'Pembelian standing brosur Lab 2 & Buku Besar', debit: 0, kredit: 87000, saldo: 777799 },
  { id: '10', tanggal: '15-Jan', keterangan: 'Pengiriman dokumen PKWT Satpam', debit: 0, kredit: 20000, saldo: 757799 },
  { id: '11', tanggal: '19-Jan', keterangan: 'Operasional Desember (dari Bu Anum)', debit: 7788200, kredit: 0, saldo: 8545999 },
  { id: '12', tanggal: '21-Jan', keterangan: 'Sisa Operasional (dari Bu Rosel)', debit: 1083800, kredit: 0, saldo: 9629799 },
  { id: '13', tanggal: '22-Jan', keterangan: 'Pembelian tisu & rak kamar mandi Kepsek', debit: 0, kredit: 205800, saldo: 9423999 },
  { id: '14', tanggal: '22-Jan', keterangan: 'Pembelian stop kontak & lampu LED', debit: 0, kredit: 558000, saldo: 8865999 },
  { id: '15', tanggal: '22-Jan', keterangan: 'Pembelian pengharum ruangan Lab', debit: 0, kredit: 58000, saldo: 8807999 },
  { id: '16', tanggal: '26-Jan', keterangan: 'Pembayaran upah perbaikan paving', debit: 0, kredit: 180000, saldo: 8627999 },
  { id: '17', tanggal: '26-Jan', keterangan: 'Pembayaran upah perbaikan kantin', debit: 0, kredit: 205000, saldo: 8422999 },
  { id: '18', tanggal: '27-Jan', keterangan: 'Pembelian tempat sampah kamar mandi Kepsek', debit: 0, kredit: 20000, saldo: 8402999 },
  { id: '19', tanggal: '28-Jan', keterangan: 'Upah perawatan gorong gorong (Pak Yudi)', debit: 0, kredit: 500000, saldo: 7902999 },
  { id: '20', tanggal: '27-Jan', keterangan: 'Pembelian senar gitar & senar bass', debit: 0, kredit: 510000, saldo: 7392999 },
  { id: '21', tanggal: '28-Jan', keterangan: 'Pembelian bahan perbaikan kran & kunci', debit: 0, kredit: 294000, saldo: 7098999 },
  { id: '22', tanggal: '4-Feb', keterangan: 'Pembelian pengharum ruangan Lab', debit: 0, kredit: 63600, saldo: 7035399 },
  { id: '23', tanggal: '6-Feb', keterangan: 'Filaement 3D Printer Praktikum', debit: 0, kredit: 137000, saldo: 6898399 },
  { id: '24', tanggal: '11-Feb', keterangan: 'Cetak tata tertib laboratorium', debit: 0, kredit: 35000, saldo: 6863399 },
  { id: '25', tanggal: '12-Feb', keterangan: 'Operasional Januari (dari Bu Anum)', debit: 10864000, kredit: 0, saldo: 17727399 },
  { id: '26', tanggal: '13-Feb', keterangan: 'Cloud Dedicated Server Web Sekolah', debit: 0, kredit: 6316226, saldo: 11411173 },
  { id: '27', tanggal: '18-Feb', keterangan: 'Bahan & upah perbaikan kabel aula', debit: 0, kredit: 537325, saldo: 10873848 },
  { id: '28', tanggal: '23-Feb', keterangan: 'Upah & perbaikan panel listrik pos satpam', debit: 0, kredit: 710000, saldo: 10163848 },
  { id: '29', tanggal: '23-Feb', keterangan: 'Paket data orbit Expo Expose', debit: 0, kredit: 47000, saldo: 10116848 },
  { id: '30', tanggal: '26-Feb', keterangan: 'Bahan & upah perbaikan kunci', debit: 0, kredit: 120000, saldo: 9996848 },
  { id: '31', tanggal: '27-Feb', keterangan: 'Bahan & upah perbaikan bocoran lab', debit: 0, kredit: 1350326, saldo: 8646522 },
  { id: '32', tanggal: '27-Feb', keterangan: 'Upah perawatan gorong gorong (Pak Yudi)', debit: 0, kredit: 500000, saldo: 8146522 },
  { id: '33', tanggal: '27-Feb', keterangan: 'Pembelian pakan ikan & bensin', debit: 0, kredit: 125000, saldo: 8021522 },
  { id: '34', tanggal: '2-Mar', keterangan: 'Filaement 3D Printer Praktikum', debit: 0, kredit: 216400, saldo: 7805122 },
  { id: '35', tanggal: '4-Mar', keterangan: 'Pembelian pengharum mobil sekolah', debit: 0, kredit: 150094, saldo: 7655028 },
  { id: '36', tanggal: '5-Mar', keterangan: 'Operasional Februari (dari Bu Anum)', debit: 7845500, kredit: 0, saldo: 15500528 },
  { id: '37', tanggal: '6-Mar', keterangan: 'Cloud Dedicated Server (Maret 2026)', debit: 0, kredit: 6318401, saldo: 9182127 },
  { id: '38', tanggal: '9-Mar', keterangan: 'Pengembalian uang daftar WA Business', debit: 123210, kredit: 0, saldo: 9305337 },
  { id: '39', tanggal: '10-Mar', keterangan: 'Kabel ties besar 4,8 * 300 mm', debit: 0, kredit: 47515, saldo: 9257822 },
  { id: '40', tanggal: '11-Mar', keterangan: 'Pembayaran biaya pengiriman dokumen', debit: 0, kredit: 21000, saldo: 9236822 },
  { id: '41', tanggal: '12-Mar', keterangan: 'Pengiriman dokumen ke Direktorat SMK', debit: 0, kredit: 17000, saldo: 9219822 },
  { id: '42', tanggal: '13-Mar', keterangan: 'Bahan & upah perbaikan pintu sarpra', debit: 0, kredit: 1347000, saldo: 7872822 },
  { id: '43', tanggal: '13-Mar', keterangan: 'Upah perbaikan lantai depan TU', debit: 0, kredit: 50000, saldo: 7822822 },
];

const OperationalCash = () => {
  const currentUser = getCurrentUser();
  const isAuthorized = currentUser.roleAplikasi === ROLES.PIMPINAN || currentUser.roleAplikasi === ROLES.PIC_ADMIN;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [editingTrx, setEditingTrx] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState({
    tanggal: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
    keterangan: '',
    type: 'kredit',
    nominal: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}?sheetName=Kas_TU&sheet=Kas_TU`);
      const data = await resp.json();
      if (data && Array.isArray(data) && data.length > 0) {
        // Map fields if they coming from Sheet with Uppercase headers
        const mapped = data.map((item: any, idx) => ({
          id: item.id || item.ID || `sheet-${idx}`,
          tanggal: item.tanggal || item.Tanggal || '',
          keterangan: item.keterangan || item.Keterangan || '',
          debit: Number(item.debit || item.Debit || 0),
          kredit: Number(item.kredit || item.Kredit || 0),
          saldo: Number(item.saldo || item.Saldo || 0)
        })).filter((item: any) => item.tanggal && (item.debit > 0 || item.kredit > 0 || item.keterangan));
        setTransactions(calculateBalances(mapped));
      } else {
        setTransactions(SEED_DATA);
      }
    } catch (error) {
      console.error("Error fetching operational cash:", error);
      setTransactions(SEED_DATA);
    } finally {
      setLoading(false);
    }
  };

  const calculateBalances = (data: Transaction[]) => {
    let currentBalance = 0;
    // We assume chronological order from sheet
    return data.map(item => {
      currentBalance = currentBalance + (Number(item.debit) || 0) - (Number(item.kredit) || 0);
      return { ...item, saldo: currentBalance };
    });
  };

  const handleEdit = (trx: Transaction) => {
    setEditingTrx(trx);
    setFormData({
      tanggal: trx.tanggal,
      keterangan: trx.keterangan,
      type: trx.debit > 0 ? 'debit' : 'kredit',
      nominal: (trx.debit || trx.kredit).toString()
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (trx: Transaction) => {
    if (!confirm(`Hapus riwayat transaksi "${trx.keterangan}" dari database?`)) return;
    
    const id = trx.id;
    setLoading(true);
    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ 
          action: 'DELETE_RECORD', 
          sheetName: 'Kas_TU',
          sheet: 'Kas_TU',
          id: id,
          ID: id
        })
      });
      
      // Update local state immediately
      setTransactions(prev => prev.filter(t => t.id !== id));
      // Refresh for consistency
      setTimeout(fetchData, 2000);
    } catch (error) {
      console.error("Error deleting cash entry:", error);
      alert("Gagal menghapus data.");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const nominalValue = Number(formData.nominal);
    const debit = formData.type === 'debit' ? nominalValue : 0;
    const kredit = formData.type === 'kredit' ? nominalValue : 0;
    const id = editingTrx ? editingTrx.id : `TU-${Date.now()}`;

    const newEntry: any = {
      action: 'FINANCE_RECORD',
      sheetName: 'Kas_TU',
      id,
      ID: id,
      // Sending both cases for safety
      Tanggal: formData.tanggal,
      Keterangan: formData.keterangan,
      Debit: debit,
      Kredit: kredit,
      // Lowercase too
      tanggal: formData.tanggal,
      keterangan: formData.keterangan,
      debit: debit,
      kredit: kredit
    };

    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(newEntry)
      });
      
      // Update locally
      const localRecord = { id, tanggal: formData.tanggal, keterangan: formData.keterangan, debit, kredit, saldo: 0 };
      if (editingTrx) {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...localRecord } : t));
      } else {
        setTransactions([...transactions, localRecord as any]);
      }

      setIsModalOpen(false);
      setEditingTrx(null);
      setFormData({ 
        tanggal: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }), 
        keterangan: '', 
        type: 'kredit', 
        nominal: '' 
      });
      
      setTimeout(fetchData, 1500);
    } catch (error) {
      console.error("Error submitting cash entry:", error);
      alert("Gagal menyimpan data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const transactionsWithBalance = useMemo(() => {
    let currentBalance = 0;
    return transactions.map(item => {
      currentBalance = currentBalance + (Number(item.debit) || 0) - (Number(item.kredit) || 0);
      return { ...item, saldo: currentBalance };
    });
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactionsWithBalance.filter(t => 
      t.keterangan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tanggal.toLowerCase().includes(searchTerm.toLowerCase())
    ).reverse();
  }, [transactionsWithBalance, searchTerm]);

  const stats = useMemo(() => {
    const totalDebit = transactions.reduce((acc, curr) => acc + (Number(curr.debit) || 0), 0);
    const totalKredit = transactions.reduce((acc, curr) => acc + (Number(curr.kredit) || 0), 0);
    return {
      totalDebit,
      totalKredit,
      saldo: totalDebit - totalKredit
    };
  }, [transactions]);

  // Mini Chart Data (latest 15 saldo points)
  const chartData = useMemo(() => {
    return transactionsWithBalance.slice(-15).map(t => ({
      name: t.tanggal,
      saldo: t.saldo
    }));
  }, [transactionsWithBalance]);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Header Section */}
      <div className="flex-row-responsive" style={{ marginBottom: '2.5rem', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            padding: '12px', 
            background: 'linear-gradient(135deg, var(--accent-amber), #f59e0b)', 
            borderRadius: '16px', 
            color: 'white',
            boxShadow: '0 8px 16px rgba(245, 158, 11, 0.2)'
          }}>
            <Coins size={32} />
          </div>
          <div>
            <h1 className="page-title gradient-text" style={{ margin: 0, fontSize: '1.8rem' }}>Kas Operasional TU</h1>
            <p className="page-subtitle" style={{ margin: 0, opacity: 0.8 }}>Manajemen Dana Taktis & Operasional Tata Kelola</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
           <button className="btn btn-primary shadow-lg" onClick={() => setIsModalOpen(true)} style={{ padding: '0.75rem 1.5rem' }}>
            <Plus size={20} /> Tambah Transaksi
          </button>
        </div>
      </div>

      {/* Main Grid: Stats & Mini Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Statistics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
          <div className="glass-panel stat-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <div className="stat-header">
              <span className="stat-title" style={{ color: 'var(--accent-emerald)' }}>Saldo Tersedia</span>
              <div className="stat-icon-wrapper" style={{ background: 'var(--accent-emerald)', color: 'white' }}>
                <Wallet size={18} />
              </div>
            </div>
            <div className="stat-value" style={{ color: 'var(--text-primary)', fontSize: '2rem' }}>{formatRupiah(stats.saldo)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--accent-emerald)' }}>
              <TrendingUp size={14} /> <span>Dana siap digunakan</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="glass-panel stat-card">
              <div className="stat-header">
                <span className="stat-title">Pemasukan</span>
                <ArrowUpCircle size={18} color="var(--accent-blue)" />
              </div>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>{formatRupiah(stats.totalDebit)}</div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-header">
                <span className="stat-title">Pengeluaran</span>
                <ArrowDownCircle size={18} color="var(--accent-rose)" />
              </div>
              <div className="stat-value" style={{ fontSize: '1.2rem', color: 'var(--accent-rose)' }}>{formatRupiah(stats.totalKredit)}</div>
            </div>
          </div>
        </div>

        {/* Mini Chart Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.9rem', margin: 0, fontWeight: 600, color: 'var(--text-secondary)' }}>Tren Saldo (15 Terakhir)</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Real-time sync</span>
          </div>
          <div style={{ flex: 1, minHeight: '150px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-amber)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent-amber)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis dataKey="name" hide />
                <YAxis hide domain={['auto', 'auto']} />
                <RechartsTooltip 
                  formatter={(value: any) => formatRupiah(value as number)}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-focus)', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="saldo" stroke="var(--accent-amber)" fillOpacity={1} fill="url(#colorSaldo)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="glass-panel shadow-sm" style={{ padding: '0.8rem 1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
        <Info size={18} color="var(--accent-blue)" />
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
          Sistem ini terhubung langsung dengan Google Spreadsheet <strong>DB_Sarpramoklet</strong>. Pastikan terdapat sheet bernama <code>Kas_TU</code> untuk sinkronisasi otomatis.
        </p>
      </div>

      {/* Toolbar & Search */}
      <div className="glass-panel flex-row-responsive" style={{ padding: '1.25rem', marginBottom: '1.5rem', gap: '1.5rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', top: '11px', left: '12px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Cari transaksi atau tanggal tertentu..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-responsive"
            style={{ width: '100%', paddingLeft: '2.5rem' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" style={{ borderRadius: '10px' }}><Filter size={18} /> Filter</button>
          <button className="btn btn-outline" style={{ borderRadius: '10px' }}><Download size={18} /> Export</button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-panel table-container shadow-xl">
        <table style={{ borderCollapse: 'separate', borderSpacing: '0' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
              <th style={{ padding: '1.25rem' }}>Status</th>
              <th>Tanggal</th>
              <th>Deskripsi Transaksi</th>
              <th style={{ textAlign: 'right' }}>Debit</th>
              <th style={{ textAlign: 'right' }}>Kredit</th>
              <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Running Saldo</th>
              {isAuthorized && <th style={{ textAlign: 'center' }}>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {loading && transactions.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '5rem' }}>
                  <Loader2 size={40} className="animate-spin" style={{ margin: '0 auto 1.5rem', color: 'var(--accent-blue)' }} />
                  <p style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Sinkronisasi Database...</p>
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                  Tidak ada transaksi yang cocok dengan pencarian Anda.
                </td>
              </tr>
            ) : filteredTransactions.map((trx) => (
              <tr key={trx.id} className="ticket-row border-b" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '1.25rem', width: '50px' }}>
                  {trx.debit > 0 ? (
                    <div style={{ background: 'var(--accent-emerald-ghost)', color: 'var(--accent-emerald)', padding: '6px', borderRadius: '8px', display: 'flex' }}><ArrowUpCircle size={18} /></div>
                  ) : (
                    <div style={{ background: 'var(--accent-rose-ghost)', color: 'var(--accent-rose)', padding: '6px', borderRadius: '8px', display: 'flex' }}><ArrowDownCircle size={18} /></div>
                  )}
                </td>
                <td style={{ whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                     <Calendar size={14} style={{ opacity: 0.5 }} /> {trx.tanggal}
                   </div>
                </td>
                <td style={{ maxWidth: '400px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.4' }}>{trx.keterangan}</div>
                </td>
                <td style={{ textAlign: 'right', color: trx.debit > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)', fontWeight: trx.debit > 0 ? 700 : 400 }}>
                  {trx.debit > 0 ? formatRupiah(trx.debit) : '-'}
                </td>
                <td style={{ textAlign: 'right', color: trx.kredit > 0 ? 'var(--accent-rose)' : 'var(--text-muted)', fontWeight: trx.kredit > 0 ? 700 : 400 }}>
                  {trx.kredit > 0 ? formatRupiah(trx.kredit) : '-'}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 800, paddingRight: '1.5rem', color: 'var(--accent-amber)' }}>
                  {formatRupiah(trx.saldo)}
                </td>
                {isAuthorized && (
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                      <button 
                        className="btn-icon" 
                        onClick={() => handleEdit(trx)}
                        style={{ padding: '8px', background: 'rgba(255,255,255,0.05)' }}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button 
                        className="btn-icon" 
                        onClick={() => handleDelete(trx)}
                        style={{ padding: '8px', color: 'var(--accent-rose)', background: 'rgba(244, 63, 94, 0.05)' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dynamic Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 1000,
          padding: '1rem', paddingTop: '4rem', overflowY: 'auto'
        }}>
          <div className="glass-panel animate-scale-in shadow-2xl" style={{ width: '480px', padding: '2.5rem', border: '1px solid var(--border-focus)', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                 <div style={{ padding: '8px', background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)', borderRadius: '10px' }}>
                   {editingTrx ? <Edit3 size={24} /> : <Plus size={24} />}
                 </div>
                 <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{editingTrx ? 'Ubah Transaksi' : 'Catat Kas Baru'}</h2>
              </div>
              <button 
                onClick={() => { setIsModalOpen(false); setEditingTrx(null); }} 
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>Tanggal</label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '12px', opacity: 0.5 }} />
                    <input 
                      type="text" 
                      value={formData.tanggal}
                      onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                      className="input-responsive"
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="Contoh: 14-Mar"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>Tipe Kas</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="input-responsive"
                    style={{ background: 'var(--bg-secondary)', color: 'white' }}
                  >
                    <option value="kredit">Pengeluaran (Kredit)</option>
                    <option value="debit">Pemasukan (Debit)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>Keterangan Transaksi</label>
                <textarea 
                  value={formData.keterangan}
                  onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                  className="input-responsive"
                  rows={3}
                  placeholder="Contoh: Pembelian tinta printer & ATK unit IT..."
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>Nominal (Rp)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '10px', fontWeight: 700, color: 'var(--accent-amber)' }}>Rp</span>
                  <input 
                    type="number" 
                    value={formData.nominal}
                    onChange={(e) => setFormData({...formData, nominal: e.target.value})}
                    className="input-responsive"
                    style={{ paddingLeft: '2.5rem', fontSize: '1.2rem', fontWeight: 700 }}
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1, padding: '1rem' }} onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary shadow-xl" style={{ flex: 1, padding: '1rem' }} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                      <Loader2 size={20} className="animate-spin" /> Menghitung...
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                      <Save size={20}/> Simpan Rekaman
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationalCash;
