import { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, Plus, LayoutDashboard, History, PiggyBank, Edit3, Trash2, X, Save, Search, Filter } from 'lucide-react';

const Finance = () => {
  const [activeTab, setActiveTab] = useState('history'); // Default to history as requested for better view
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTrx, setEditingTrx] = useState<any>(null);
  
  const [transactions, setTransactions] = useState([
    { id: 'TRX-001', title: 'Penghapusan PC 21 Des 2024', category: 'Administrasi', amount: '3161400', type: 'income', date: '2026-01-09' },
    { id: 'TRX-002', title: 'Hasil jual rongsokan 25 Juni 2025', category: 'Lainnya', amount: '2015000', type: 'income', date: '2026-01-09' },
    { id: 'TRX-003', title: 'Trafo 19 Sept 2024', category: 'Sarpras', amount: '2500000', type: 'income', date: '2026-01-09' },
    { id: 'TRX-004', title: 'Hasil jual besi kedua 6 Maret 2025', category: 'Lainnya', amount: '3972000', type: 'income', date: '2026-01-09' },
    { id: 'TRX-005', title: 'Hasil jual rongsokan 22 Juni 2025', category: 'Lainnya', amount: '1200000', type: 'income', date: '2026-01-09' },
    { id: 'TRX-006', title: 'Cashback & Pemusnahan', category: 'Administrasi', amount: '4883055', type: 'income', date: '2026-01-09' },
    { id: 'TRX-007', title: 'Cashback danang', category: 'Administrasi', amount: '2300000', type: 'income', date: '2026-01-09' },
    { id: 'TRX-008', title: 'Hasil sewa streaming', category: 'IT Support', amount: '100000', type: 'income', date: '2026-01-21' },
    { id: 'TRX-009', title: 'Sisa rombeng 4 feb 2025', category: 'Lainnya', amount: '1533000', type: 'income', date: '2026-01-21' },
    { id: 'TRX-010', title: 'Lembur Pak Yoko', category: 'Administrasi', amount: '75000', type: 'expense', date: '2026-01-22' },
    { id: 'TRX-011', title: 'Parkir ke AZKO', category: 'Lainnya', amount: '2000', type: 'expense', date: '2026-01-22' },
    { id: 'TRX-012', title: 'Makan malam siswa Tefa', category: 'Laboratorium', amount: '27000', type: 'expense', date: '2026-01-23' },
    { id: 'TRX-013', title: 'Makan malam siswa Tefa', category: 'Laboratorium', amount: '39500', type: 'expense', date: '2026-01-26' },
    { id: 'TRX-014', title: 'Honor Pak Rudi CS Jan 2026', category: 'Administrasi', amount: '120000', type: 'expense', date: '2026-01-27' },
    { id: 'TRX-015', title: 'Snack siswa Tefa', category: 'Laboratorium', amount: '105000', type: 'expense', date: '2026-01-27' },
    { id: 'TRX-016', title: 'Snack siswa Tefa', category: 'Laboratorium', amount: '95000', type: 'expense', date: '2026-01-29' },
    { id: 'TRX-017', title: 'Snack siswa Tefa', category: 'Laboratorium', amount: '96000', type: 'expense', date: '2026-01-29' },
    { id: 'TRX-018', title: 'Makan lembur bapak/ibu sarpra', category: 'Sarpras', amount: '48000', type: 'expense', date: '2026-01-29' },
    { id: 'TRX-019', title: 'Makan lembur bapak/ibu sarpra', category: 'Sarpras', amount: '50000', type: 'expense', date: '2026-01-30' },
    { id: 'TRX-020', title: 'Makan lembur bapak/ibu sarpra', category: 'Sarpras', amount: '28000', type: 'expense', date: '2026-01-31' },
    { id: 'TRX-021', title: 'Snack siswa Tefa', category: 'Laboratorium', amount: '116000', type: 'expense', date: '2026-02-02' },
    { id: 'TRX-022', title: 'Lembur Pak Yoko', category: 'Administrasi', amount: '25000', type: 'expense', date: '2026-02-02' },
    { id: 'TRX-023', title: 'Snack siswa Tefa', category: 'Laboratorium', amount: '100000', type: 'expense', date: '2026-02-02' },
    { id: 'TRX-024', title: 'Snack siswa Tefa', category: 'Laboratorium', amount: '100000', type: 'expense', date: '2026-02-03' },
    { id: 'TRX-025', title: 'Ganti service motor OB Pak Adi', category: 'Sarpras', amount: '150000', type: 'expense', date: '2026-02-06' },
    { id: 'TRX-026', title: 'Snack lembur bapak/ibu sarpra', category: 'Sarpras', amount: '175000', type: 'expense', date: '2026-02-11' },
    { id: 'TRX-027', title: 'Rapat koordinasi dan buka bersama', category: 'Administrasi', amount: '1299000', type: 'expense', date: '2026-03-02' },
    { id: 'TRX-028', title: 'Lembur Pak Suko', category: 'Administrasi', amount: '50000', type: 'expense', date: '2026-03-04' },
    { id: 'TRX-029', title: 'THR PAK YUDI', category: 'Administrasi', amount: '300000', type: 'expense', date: '2026-03-16' },
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));

  const [formData, setFormData] = useState({
    title: '',
    category: 'Administrasi',
    amount: '',
    type: 'expense',
    date: new Date().toISOString().split('T')[0]
  });

  const formatIDR = (val: string | number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));
  };

  const handleCreate = () => {
    setEditingTrx(null);
    setFormData({
      title: '',
      category: 'Administrasi',
      amount: '',
      type: 'expense',
      date: new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleEdit = (trx: any) => {
    setEditingTrx(trx);
    setFormData({
      title: trx.title,
      category: trx.category,
      amount: trx.amount,
      type: trx.type,
      date: trx.date
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Hapus laporan keuangan ini?')) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const handleSave = () => {
    if (editingTrx) {
      setTransactions(transactions.map(t => t.id === editingTrx.id ? { ...t, ...formData } : t).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } else {
      const newTrx = {
        ...formData,
        id: `TRX-${Math.floor(100 + Math.random() * 900)}`,
      };
      setTransactions([...transactions, newTrx].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    }
    setShowModal(false);
  };

  // Calculate Running Balance
  let currentBalance = 0;
  const transactionsWithBalance = transactions.map(t => {
    if (t.type === 'income') currentBalance += Number(t.amount);
    else currentBalance -= Number(t.amount);
    return { ...t, runningBalance: currentBalance };
  });

  // Totals
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const finalBalance = totalIncome - totalExpense;

  const filteredTransactions = transactionsWithBalance.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.date.includes(searchTerm)
  ).reverse(); // Latest on top in table view

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div className="flex-row-responsive" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Tata Kelola Keuangan</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Portal pelaporan kas operasional terpusat bapak/ibu sarpra.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '400px', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            <PiggyBank size={18} /> <span className="mobile-hide">Riwayat Saldo</span><span style={{ display: 'none' }} className="mobile-show">Saldo</span>
          </button>
          <button className="btn btn-primary" onClick={handleCreate} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            <Plus size={18} /> <span className="mobile-hide">Input Transaksi</span><span style={{ display: 'none' }} className="mobile-show">Input</span>
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        {[
          { title: 'Total Pemasukan', value: totalIncome, icon: TrendingUp, color: 'var(--accent-emerald)', trend: 'Akumulasi Debit' },
          { title: 'Total Pengeluaran', value: totalExpense, icon: TrendingDown, color: 'var(--accent-rose)', trend: 'Akumulasi Kredit' },
          { title: 'Saldo Kas Saat Ini', value: finalBalance, icon: Wallet, color: 'var(--accent-violet)', trend: 'Saldo Akhir Tersedia' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`glass-panel stat-card delay-${(i + 1) * 100}`}>
              <div className="stat-header">
                <span className="stat-title">{stat.title}</span>
                <div className="stat-icon-wrapper" style={{ background: `${stat.color}15`, color: stat.color }}>
                  <Icon size={20} />
                </div>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <div className="stat-value" style={{ fontSize: '1.6rem' }}>{formatIDR(stat.value)}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{stat.trend}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-panel" style={{ padding: '0.5rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.03)' }}>
         <button 
           onClick={() => setActiveTab('history')}
           style={{ 
             flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', 
             background: activeTab === 'history' ? 'var(--accent-blue)' : 'transparent',
             color: activeTab === 'history' ? 'white' : 'var(--text-secondary)',
             fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.3s ease', cursor: 'pointer',
             display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
           }}
         >
           <History size={16} /> Riwayat Arus Kas
         </button>
         <button 
           onClick={() => setActiveTab('summary')}
           style={{ 
             flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', 
             background: activeTab === 'summary' ? 'var(--accent-blue)' : 'transparent',
             color: activeTab === 'summary' ? 'white' : 'var(--text-secondary)',
             fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.3s ease', cursor: 'pointer',
             display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
           }}
         >
           <LayoutDashboard size={16} /> Analisis Per Unit
         </button>
      </div>

      <div className="glass-panel flex-row-responsive delay-100" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Cari transaksi atau tanggal..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-responsive"
          />
        </div>
        <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} /> <span className="mobile-hide">Filter Periode</span>
        </button>
      </div>

      {activeTab === 'summary' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <TrendingDown size={20} color="var(--accent-rose)" /> Distribusi Pengeluaran Terbesar
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {[
                { name: 'Administrasi & Honor', amount: transactions.filter(t => t.category === 'Administrasi' && t.type === 'expense').reduce((a,c) => a+Number(c.amount), 0), color: 'var(--accent-blue)' },
                { name: 'Laboratorium (Tefa/Siswa)', amount: transactions.filter(t => t.category === 'Laboratorium' && t.type === 'expense').reduce((a,c) => a+Number(c.amount), 0), color: 'var(--accent-violet)' },
                { name: 'Sarpras & Operasional', amount: transactions.filter(t => t.category === 'Sarpras' && t.type === 'expense').reduce((a,c) => a+Number(c.amount), 0), color: 'var(--accent-emerald)' },
              ].map((uni, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{uni.name}</span>
                    <span style={{ fontWeight: 600 }}>{formatIDR(uni.amount)}</span>
                  </div>
                  <div className="progress-bar-bg" style={{ height: '6px' }}>
                    <div className="progress-bar-fill" style={{ width: `${(uni.amount / totalExpense) * 100}%`, background: uni.color }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel table-container">
          <table>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ width: '100px' }}>TANGGAL</th>
                <th>KETERANGAN</th>
                <th style={{ textAlign: 'right' }}>DEBIT (MASUK)</th>
                <th style={{ textAlign: 'right' }}>KREDIT (KELUAR)</th>
                <th style={{ textAlign: 'right', background: 'rgba(0,0,0,0.1)' }}>SALDO</th>
                <th style={{ width: '80px', textAlign: 'center' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((trx) => (
                <tr className="ticket-row" key={trx.id}>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {new Date(trx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{trx.title}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{trx.category} • {trx.id}</div>
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                    {trx.type === 'income' ? formatIDR(trx.amount) : ''}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--accent-rose)', fontWeight: 600 }}>
                    {trx.type === 'expense' ? formatIDR(trx.amount) : ''}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', background: 'rgba(255,255,255,0.02)' }}>
                    {formatIDR(trx.runningBalance)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                      <button className="btn-icon" onClick={() => handleEdit(trx)} style={{ color: 'var(--accent-blue)', padding: '4px' }}>
                        <Edit3 size={14} />
                      </button>
                      <button className="btn-icon" onClick={() => handleDelete(trx.id)} style={{ color: 'var(--accent-rose)', padding: '4px' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', border: '1px solid var(--accent-blue-ghost)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {editingTrx ? <Edit3 size={20} color="var(--accent-blue)" /> : <Plus size={20} color="var(--accent-blue)" />}
                {editingTrx ? 'Ubah Transaksi' : 'Input Transaksi Baru'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '8px' }}>
                 <button 
                   onClick={() => setFormData({...formData, type: 'expense'})}
                   className={`btn ${formData.type === 'expense' ? 'btn-danger' : ''}`}
                   style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: formData.type === 'expense' ? 'var(--accent-rose)' : 'transparent', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
                 >Kredit (Keluar)</button>
                 <button 
                   onClick={() => setFormData({...formData, type: 'income'})}
                   style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: formData.type === 'income' ? 'var(--accent-emerald)' : 'transparent', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
                 >Debit (Masuk)</button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Keterangan Transaksi</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Contoh: Hasil jual rongsokan" 
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.75rem', color: 'white', outline: 'none' }} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Kategori</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    style={{ width: '100%', background: '#1a1a1a', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.75rem', color: 'white', outline: 'none' }}
                  >
                    <option>Administrasi</option>
                    <option>Laboratorium</option>
                    <option>Sarpras</option>
                    <option>IT Support</option>
                    <option>Lainnya</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Tanggal</label>
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.75rem', color: 'white', outline: 'none' }} 
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Nominal (Rp)</label>
                <input 
                  type="number" 
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="0" 
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.75rem', color: 'white', outline: 'none' }} 
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button onClick={() => setShowModal(false)} className="btn btn-outline" style={{ flex: 1 }}>Batal</button>
                <button 
                  onClick={handleSave}
                  className="btn btn-primary" 
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Save size={18} /> Simpan Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
