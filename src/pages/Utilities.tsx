import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Plus, ReceiptText, FileText, BarChart3 } from 'lucide-react';

const formatRupiah = (number: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
};

const Utilities = () => {
  const [activeTab, setActiveTab] = useState('rekap');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Data from image
  const utlitiesData = [
    {
      id: 1,
      pelanggan: 'PLN – Yayasan Sandykara',
      type: 'PLN',
      history: {
        'Des 25': 7336630,
        'Jan': 4592250,
        'Feb': 6556510,
        'Mar': 4631850
      }
    },
    {
      id: 2,
      pelanggan: 'PLN – SMK Telkom',
      type: 'PLN',
      history: {
        'Des 25': 9874990,
        'Jan': 7814800,
        'Feb': 11782720,
        'Mar': 7814800
      }
    },
    {
      id: 3,
      pelanggan: 'PLN – Kantin',
      type: 'PLN',
      history: {
        'Des 25': 4992210,
        'Jan': 2126160,
        'Feb': 5994190,
        'Mar': 3833910
      }
    },
    {
      id: 4,
      pelanggan: 'PDAM – Yys Sandhikara',
      type: 'PDAM',
      history: {
        'Des 25': 1041000,
        'Jan': 1041000,
        'Feb': 792500,
        'Mar': 1072500
      }
    }
  ];

  const months = ['Des 25', 'Jan', 'Feb', 'Mar'];

  const calculateTotal = (month: string) => {
    return utlitiesData.reduce((acc, curr) => acc + (curr.history[month as keyof typeof curr.history] || 0), 0);
  };

  const chartData = months.map(month => {
    return {
      name: month,
      PLN: utlitiesData.filter(d => d.type === 'PLN').reduce((acc, curr) => acc + (curr.history[month as keyof typeof curr.history] || 0), 0),
      PDAM: utlitiesData.filter(d => d.type === 'PDAM').reduce((acc, curr) => acc + (curr.history[month as keyof typeof curr.history] || 0), 0),
    };
  });

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div className="flex-row-responsive" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Manajemen Utilitas</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Pemantauan Tagihan Listrik (PLN) dan Air (PDAM)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ alignSelf: 'flex-start' }}>
          <Plus size={18} /> <span className="mobile-hide">Input Nota Baru</span><span style={{ display: 'none' }} className="mobile-show">Input</span>
        </button>
      </div>

      <div className="flex-row-responsive" style={{ gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <button 
          className={`btn ${activeTab === 'rekap' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('rekap')}
          style={{ flex: 1, border: activeTab === 'rekap' ? 'none' : '1px solid var(--border-subtle)', background: activeTab === 'rekap' ? 'var(--accent-blue)' : 'transparent', color: activeTab === 'rekap' ? 'white' : 'var(--text-secondary)' }}
        >
          <ReceiptText size={18} /> <span className="mobile-hide">Rekap Perbandingan</span><span style={{ display: 'none' }} className="mobile-show">Rekap</span>
        </button>
        <button 
          className={`btn ${activeTab === 'grafik' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('grafik')}
          style={{ flex: 1, border: activeTab === 'grafik' ? 'none' : '1px solid var(--border-subtle)', background: activeTab === 'grafik' ? 'var(--accent-blue)' : 'transparent', color: activeTab === 'grafik' ? 'white' : 'var(--text-secondary)' }}
        >
          <BarChart3 size={18} /> <span className="mobile-hide">Tren Pengeluaran</span><span style={{ display: 'none' }} className="mobile-show">Grafik</span>
        </button>
      </div>

      {activeTab === 'rekap' && (
        <div className="glass-panel delay-100 animate-fade-in">
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BarChart3 size={24} color="var(--accent-blue)" />
            <div>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Perbandingan Tagihan PLN & PDAM</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>Rekap biaya utilitas 4 bulan terakhir</p>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr style={{ background: 'rgba(244, 63, 94, 0.1)' }}>
                  <th style={{ color: 'var(--accent-rose)', fontSize: '0.75rem' }}>PELANGGAN</th>
                  {months.map((m, idx) => (
                    <th key={m} className={idx === 0 ? 'mobile-hide' : ''} style={{ textAlign: 'center', color: 'var(--accent-rose)', fontSize: '0.75rem' }}>{m.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {utlitiesData.map((data, rowIdx) => (
                  <tr className="ticket-row" key={data.id} style={{ background: rowIdx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{data.pelanggan}</td>
                    {months.map((m, idx) => (
                      <td key={m} className={idx === 0 ? 'mobile-hide' : ''} style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {formatRupiah(data.history[m as keyof typeof data.history])}
                      </td>
                    ))}
                  </tr>
                ))}
                
                {/* Total Row */}
                <tr style={{ background: 'rgba(255,255,255,0.05)', borderTop: '2px solid var(--border-focus)' }}>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>Total</td>
                  {months.map((m, idx) => (
                    <td key={m} className={idx === 0 ? 'mobile-hide' : ''} style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent-rose)', fontSize: '0.9rem' }}>
                      {formatRupiah(calculateTotal(m))}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'grafik' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel delay-100 animate-fade-in" style={{ padding: '1.25rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--accent-amber)', margin: 0 }}>Tren Pengeluaran PLN (Listrik)</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>Fluktuasi biaya listrik bulanan</p>
            </div>
            <div style={{ height: '250px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis 
                    stroke="var(--text-muted)" 
                    fontSize={11}
                    tickFormatter={(value) => `Rp${(value / 1000000).toFixed(0)}jt`}
                  />
                  <RechartsTooltip 
                    formatter={(value: any) => formatRupiah(value as number)}
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-focus)', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="PLN" fill="var(--accent-amber)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel delay-200 animate-fade-in" style={{ padding: '1.25rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--accent-cyan)', margin: 0 }}>Tren Pengeluaran PDAM (Air)</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>Fluktuasi biaya pemakaian air bulanan</p>
            </div>
            <div style={{ height: '250px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis 
                    stroke="var(--text-muted)" 
                    fontSize={11}
                    tickFormatter={(value) => `Rp${(value / 1000000).toFixed(1)}jt`}
                  />
                  <RechartsTooltip 
                    formatter={(value: any) => formatRupiah(value as number)}
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-focus)', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="PDAM" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}



      {/* Modal Input Nota Baru */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '500px', padding: '2rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-focus)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ padding: '8px', background: 'var(--accent-blue-ghost)', borderRadius: '8px', color: 'var(--accent-blue)' }}>
                  <FileText size={20} />
                </div>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Input Nota Pembayaran</h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="btn btn-outline"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem' }}
              >
                ✕
              </button>
            </div>

            <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status Berkas</label>
                <select style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white' }}>
                  <option value="lunas">Telah Dibayar (Lunas)</option>
                  <option value="belum">Mengajukan Pembayaran</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Titik Pelanggan</label>
                <select style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white' }}>
                  <optgroup label="PLN">
                    <option value="PLN-1">PLN – Yayasan Sandykara</option>
                    <option value="PLN-2">PLN – SMK Telkom</option>
                    <option value="PLN-3">PLN – Kantin</option>
                  </optgroup>
                  <optgroup label="PDAM">
                    <option value="PDAM-1">PDAM – Yys Sandhikara</option>
                  </optgroup>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Bulan Pemakaian</label>
                  <select style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white' }}>
                    <option value="Apr 26">April 2026</option>
                    <option value="Mei 26">Mei 2026</option>
                    <option value="Jun 26">Juni 2026</option>
                  </select>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Nominal (Rp)</label>
                  <input type="number" placeholder="Contoh: 1500000" style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Upload Bukti Transaksi / PDF Tagihan</label>
                <div style={{ border: '1px dashed var(--border-focus)', padding: '1.5rem', textAlign: 'center', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', color: 'var(--text-muted)' }}>
                  Klik di sini untuk unggah file atau tarik file ke area ini
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="button" className="btn btn-primary" onClick={() => setIsModalOpen(false)}>
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Style overrides for select options in dark mode */}
      <style>{`
        select option, select optgroup { background: var(--bg-secondary); color: var(--text-primary); }
      `}</style>
    </div>
  );
};

export default Utilities;
