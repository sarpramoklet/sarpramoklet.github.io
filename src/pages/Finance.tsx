import { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, Plus, Download, ArrowUpRight, ArrowDownRight, LayoutDashboard, History, PiggyBank, ReceiptText } from 'lucide-react';

const Finance = () => {
  const [activeTab, setActiveTab] = useState('summary');

  const stats = [
    { title: 'Saldo Awal (Mar)', value: 'Rp 45.000.000', icon: PiggyBank, color: 'var(--accent-blue)' },
    { title: 'Pemasukan', value: 'Rp 12.500.000', icon: TrendingUp, color: 'var(--accent-emerald)' },
    { title: 'Pengeluaran', value: 'Rp 8.240.000', icon: TrendingDown, color: 'var(--accent-rose)' },
    { title: 'Saldo Saat Ini', value: 'Rp 49.260.000', icon: Wallet, color: 'var(--accent-violet)' },
  ];

  const transactions = [
    { id: 'TRX-001', title: 'Pembelian Router Core Lab', category: 'IT Support', amount: 'Rp 3.500.000', type: 'expense', date: '12 Mar 2026', status: 'Approved' },
    { id: 'TRX-002', title: 'Pemeliharaan AC Ruang Server', category: 'Sarpras', amount: 'Rp 1.250.000', type: 'expense', date: '14 Mar 2026', status: 'Pending' },
    { id: 'TRX-003', title: 'Top-up Anggaran Operasional', category: 'Yayasan', amount: 'Rp 10.000.000', type: 'income', date: '15 Mar 2026', status: 'Success' },
    { id: 'TRX-004', title: 'Bahan Praktik Siswa (IoT)', category: 'Laboratorium', amount: 'Rp 2.400.000', type: 'expense', date: '16 Mar 2026', status: 'Approved' },
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Tata Kelola Keuangan</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Pelaporan kas, pengeluaran operasional, dan saldo terpusat.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={18} /> Ekspor PDF
          </button>
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> Tambah Laporan
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        {stats.map((stat, i) => {
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
                <div className="stat-value" style={{ fontSize: '1.5rem' }}>{stat.value}</div>
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
                <th>ID</th>
                <th>Keterangan</th>
                <th>Kategori</th>
                <th>Tanggal</th>
                <th>Nilai</th>
                <th>Status</th>
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
                      {trx.amount}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${trx.status === 'Approved' || trx.status === 'Success' ? 'badge-success' : 'badge-warning'}`}>
                      {trx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Finance;
