import { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, Plus, ArrowUpRight, ArrowDownRight, LayoutDashboard, History, PiggyBank, ReceiptText, Edit3, Trash2, X, Save } from 'lucide-react';

const Finance = () => {
  const [activeTab, setActiveTab] = useState('summary');
  const [showModal, setShowModal] = useState(false);
  const [editingTrx, setEditingTrx] = useState<any>(null);
  const [transactions, setTransactions] = useState([
    { id: 'TRX-001', title: 'Pembelian Router Core Lab', category: 'IT Support', amount: '3500000', type: 'expense', date: '2026-03-12', status: 'Approved' },
    { id: 'TRX-002', title: 'Pemeliharaan AC Ruang Server', category: 'Sarpras', amount: '1250000', type: 'expense', date: '2026-03-14', status: 'Pending' },
    { id: 'TRX-003', title: 'Top-up Anggaran Operasional', category: 'Yayasan', amount: '10000000', type: 'income', date: '2026-03-15', status: 'Success' },
    { id: 'TRX-004', title: 'Bahan Praktik Siswa (IoT)', category: 'Laboratorium', amount: '2400000', type: 'expense', date: '2026-03-16', status: 'Approved' },
  ]);

  const [formData, setFormData] = useState({
    title: '',
    category: 'IT Support',
    amount: '',
    type: 'expense',
    date: new Date().toISOString().split('T')[0]
  });

  const formatIDR = (val: string) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));
  };

  const handleCreate = () => {
    setEditingTrx(null);
    setFormData({
      title: '',
      category: 'IT Support',
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
      setTransactions(transactions.map(t => t.id === editingTrx.id ? { ...t, ...formData } : t));
    } else {
      const newTrx = {
        ...formData,
        id: `TRX-00${transactions.length + 1}`,
        status: formData.type === 'expense' ? 'Pending' : 'Success'
      };
      setTransactions([newTrx, ...transactions]);
    }
    setShowModal(false);
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Tata Kelola Keuangan</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Pelaporan kas, pengeluaran operasional, dan saldo terpusat.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PiggyBank size={18} /> Kelola Saldo
          </button>
          <button className="btn btn-primary" onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> Tambah Laporan
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        {[
          { title: 'Saldo Awal (Mar)', value: '45000000', icon: PiggyBank, color: 'var(--accent-blue)' },
          { title: 'Pemasukan', value: transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0).toString(), icon: TrendingUp, color: 'var(--accent-emerald)' },
          { title: 'Pengeluaran', value: transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0).toString(), icon: TrendingDown, color: 'var(--accent-rose)' },
          { title: 'Saldo Saat Ini', value: (45000000 + transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0) - transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0)).toString(), icon: Wallet, color: 'var(--accent-violet)' },
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
                <div className="stat-value" style={{ fontSize: '1.5rem' }}>{formatIDR(stat.value)}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-panel" style={{ padding: '0.5rem', marginBottom: '2rem', display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.03)' }}>
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
           <LayoutDashboard size={16} /> Ikhtisar Keuangan
         </button>
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
           <History size={16} /> Riwayat Transaksi
         </button>
      </div>

      {activeTab === 'summary' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <TrendingUp size={20} color="var(--accent-emerald)" /> Alokasi Pengeluaran Unit
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {[
                { name: 'Unit IT', amount: 'Rp 6.400.000', progress: 45, color: 'var(--accent-blue)' },
                { name: 'Unit Laboratorium', amount: 'Rp 4.200.000', progress: 30, color: 'var(--accent-violet)' },
                { name: 'Unit Sarpras', amount: 'Rp 3.500.000', progress: 25, color: 'var(--accent-emerald)' },
              ].map((uni, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{uni.name}</span>
                    <span style={{ fontWeight: 600 }}>{uni.amount}</span>
                  </div>
                  <div className="progress-bar-bg" style={{ height: '6px' }}>
                    <div className="progress-bar-fill" style={{ width: `${uni.progress}%`, background: uni.color }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ReceiptText size={20} color="var(--accent-blue)" /> Pesan Monitoring Pimpinan
            </h3>
            <div style={{ padding: '1rem', background: 'var(--accent-blue-ghost)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                "Harap Amalia melakukan rekapitulasi nota fisik sebelum tanggal 20 setiap bulannya. Pastikan alokasi dana untuk pemeliharaan rutin sarpras didahulukan."
              </p>
              <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 600 }}>
                — Waka Bidang Sarpra
              </div>
            </div>
            <div style={{ padding: '1rem', border: '1px dashed var(--border-subtle)', borderRadius: '12px', textAlign: 'center' }}>
               <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Belum ada laporan baru yang perlu verifikasi hari ini.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel table-container">
          <table>
            <thead>
              <tr>
                <th>Pilihan</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((trx) => (
                <tr className="ticket-row" key={trx.id}>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{trx.id}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{trx.title}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{trx.category}</span>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{trx.date}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: trx.type === 'expense' ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                      {trx.type === 'expense' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                      {formatIDR(trx.amount)}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${trx.status === 'Approved' || trx.status === 'Success' ? 'badge-success' : 'badge-warning'}`}>
                      {trx.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-icon" onClick={() => handleEdit(trx)} style={{ color: 'var(--accent-blue)' }}>
                        <Edit3 size={16} />
                      </button>
                      <button className="btn-icon" onClick={() => handleDelete(trx.id)} style={{ color: 'var(--accent-rose)' }}>
                        <Trash2 size={16} />
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
                {editingTrx ? 'Ubah Laporan Keuangan' : 'Tambah Laporan Keuangan'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '8px' }}>
                 <button 
                   onClick={() => setFormData({...formData, type: 'expense'})}
                   style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: formData.type === 'expense' ? 'var(--accent-rose)' : 'transparent', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
                 >Pengeluaran</button>
                 <button 
                   onClick={() => setFormData({...formData, type: 'income'})}
                   style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: formData.type === 'income' ? 'var(--accent-emerald)' : 'transparent', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
                 >Pemasukan</button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Keterangan / Judul</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Contoh: Pembelian Alat Lab" 
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
                    <option>IT Support</option>
                    <option>Laboratorium</option>
                    <option>Sarpras</option>
                    <option>Yayasan</option>
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
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Nilai (Rp)</label>
                <input 
                  type="number" 
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="Masukkan nominal..." 
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
                  <Save size={18} /> Simpan Laporan
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
