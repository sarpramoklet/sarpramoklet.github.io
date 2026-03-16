import { useState } from 'react';
import { Users, TrendingUp, AlertTriangle, CheckSquare, Clock10, AlertCircle, LayoutGrid, Target } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const trendData = [
  { name: 'Okt', Masuk: 120, Selesai: 110 },
  { name: 'Nov', Masuk: 140, Selesai: 135 },
  { name: 'Des', Masuk: 110, Selesai: 105 },
  { name: 'Jan', Masuk: 160, Selesai: 150 },
  { name: 'Feb', Masuk: 180, Selesai: 165 },
  { name: 'Mar', Masuk: 142, Selesai: 120 },
];

const subProcessData = [
  { name: 'Dev Software', total: 45, selesai: 40, overdue: 2 },
  { name: 'Infrastruktur', total: 60, selesai: 55, overdue: 0 },
  { name: 'Praktikum', total: 50, selesai: 45, overdue: 3 },
  { name: 'Manajemen Gedung', total: 80, selesai: 60, overdue: 5 },
  { name: 'Pengadaan', total: 30, selesai: 15, overdue: 8 },
];

const MeetingDashboard = () => {
  const [activeTab, setActiveTab] = useState<'internal' | 'eksternal'>('internal');

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div className="flex-row-responsive" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Executive Meeting Dashboard</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Sajian Data Berbasis Keputusan untuk Rapat Bulanan</p>
        </div>
        <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '0.25rem', borderRadius: '12px', border: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '0.25rem' }}>
          <button 
            onClick={() => setActiveTab('internal')}
            style={{ 
              flex: '1 1 auto',
              padding: '0.6rem 1.25rem', 
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'internal' ? 'var(--accent-blue-ghost)' : 'transparent',
              color: activeTab === 'internal' ? 'var(--accent-blue)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'internal' ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap',
              fontSize: '0.85rem'
            }}
          >
            1. Rapat Internal Tim
          </button>
          <button 
            onClick={() => setActiveTab('eksternal')}
            style={{ 
              flex: '1 1 auto',
              padding: '0.6rem 1.25rem', 
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'eksternal' ? 'var(--accent-violet-ghost)' : 'transparent',
              color: activeTab === 'eksternal' ? 'var(--accent-violet)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'eksternal' ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap',
              fontSize: '0.85rem'
            }}
          >
            2. Rapat Antar Unit
          </button>
        </div>
      </div>

      {/* RINGKASAN UTAMA */}
      <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1rem' }}>A. Ringkasan Utama Bulan Ini</h3>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
        <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
          <div className="stat-header"><span className="stat-title" style={{ fontSize: '0.65rem' }}>Pekerjaan Masuk</span><Users size={14} color="var(--accent-blue)" /></div>
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>142</div>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
          <div className="stat-header"><span className="stat-title" style={{ fontSize: '0.65rem' }}>Pekerjaan Selesai</span><CheckSquare size={14} color="var(--accent-emerald)" /></div>
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>120</div>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
          <div className="stat-header"><span className="stat-title" style={{ fontSize: '0.65rem' }}>Tiket Overdue</span><AlertTriangle size={14} color="var(--accent-rose)" /></div>
          <div className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--accent-rose)' }}>18</div>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
          <div className="stat-header"><span className="stat-title" style={{ fontSize: '0.65rem' }}>Respon (Avg)</span><Clock10 size={14} color="var(--accent-amber)" /></div>
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>14<span style={{ fontSize: '0.8rem' }}>m</span></div>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
          <div className="stat-header"><span className="stat-title" style={{ fontSize: '0.65rem' }}>Durasi Kerja</span><Target size={14} color="var(--accent-cyan)" /></div>
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>3.2<span style={{ fontSize: '0.8rem' }}>j</span></div>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
          <div className="stat-header"><span className="stat-title" style={{ fontSize: '0.65rem' }}>Capaian KPI</span><TrendingUp size={14} color="var(--accent-violet)" /></div>
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>84.5%</div>
        </div>
      </div>

      {activeTab === 'internal' && (
        <div className="animate-fade-in">
          <div className="dashboard-grid">
            {/* GRAFIK TREN */}
            <div className="glass-panel chart-container" style={{ minHeight: '300px' }}>
              <div className="chart-header">
                <h3 style={{ fontSize: '0.9rem' }}>B. Kinerja Per Subproses</h3>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subProcessData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                    <XAxis type="number" stroke="var(--text-muted)" fontSize={10} />
                    <YAxis dataKey="name" type="category" width={80} stroke="var(--text-muted)" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-focus)', borderRadius: '8px' }} />
                    <Bar dataKey="total" name="Total" fill="var(--accent-blue-ghost)" stroke="var(--accent-blue)" />
                    <Bar dataKey="selesai" name="Selesai" fill="var(--accent-emerald)" />
                    <Bar dataKey="overdue" name="Overdue" fill="var(--accent-rose)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel chart-container" style={{ minHeight: '300px' }}>
              <div className="chart-header">
                <h3 style={{ fontSize: '0.9rem' }}>Tren Tiket Masuk vs Selesai</h3>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSelesai" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} />
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-focus)', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="Masuk" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMasuk)" />
                    <Area type="monotone" dataKey="Selesai" stroke="#10b981" fillOpacity={1} fill="url(#colorSelesai)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} color="var(--accent-rose)" /> C. Pekerjaan Kritis (Eskalasi)
            </h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Isu / Subproses</th>
                    <th className="mobile-hide">Status</th>
                    <th className="mobile-hide">Kendala</th>
                    <th>Rekomendasi Keputusan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Pengadaan 20 PC Lab</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lab &gt; Pengadaan</div>
                      <div className="mobile-show" style={{ marginTop: '0.4rem' }}>
                         <span className="badge badge-danger">Lewat SLA</span>
                      </div>
                    </td>
                    <td className="mobile-hide"><span className="badge badge-danger">Lewat SLA</span></td>
                    <td className="mobile-hide" style={{ fontSize: '0.85rem' }}>Anggaran belum turun</td>
                    <td style={{ color: 'var(--accent-amber)', fontSize: '0.85rem' }}>Approve eskalasi ke Pusat</td>
                  </tr>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Tembok Lorong Kelas X Rembes</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sarpras &gt; Gedung</div>
                      <div className="mobile-show" style={{ marginTop: '0.4rem' }}>
                         <span className="badge badge-warning">Isu Berulang</span>
                      </div>
                    </td>
                    <td className="mobile-hide"><span className="badge badge-warning">Isu Berulang</span></td>
                    <td className="mobile-hide" style={{ fontSize: '0.85rem' }}>Talang air cacat struktur</td>
                    <td style={{ color: 'var(--accent-amber)', fontSize: '0.85rem' }}>Persetujuan renovasi total</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>D. Akar Masalah & Top Isu</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <li style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.9rem', marginBottom: '0.4rem' }}>1. AC Lab Sering Mati</div>
                  <span className="badge badge-warning">Masalah Vendor</span>
                </li>
                <li style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.9rem', marginBottom: '0.4rem' }}>2. Delay Respon Helpdesk</div>
                  <span className="badge badge-danger">Kurang Personil</span>
                </li>
              </ul>
            </div>
            
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-emerald)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>E. & F. Rencana Bulan Depan</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>1. Eksekusi Pengadaan Tandon Air</h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Target: 15 Apr 2026</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>2. Migrasi Database Siakad</h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Target: 20 Apr 2026</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'eksternal' && (
        <div className="animate-fade-in">
          
          <div className="dashboard-grid">
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LayoutGrid size={18} color="var(--accent-blue)" /> B. Peta Layanan Lintas Unit
              </h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Proyek / Unit</th>
                      <th className="mobile-hide">Hambatan</th>
                      <th>Tindak Lanjut</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Ujian CBT Genap</div>
                        <div style={{ marginTop: '0.4rem' }}>
                           <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>IT • Lab • Kurikulum</span>
                        </div>
                      </td>
                      <td className="mobile-hide" style={{ fontSize: '0.85rem' }}>Bandwidth Lab 3 upgrade</td>
                      <td style={{ fontSize: '0.85rem' }}>IT upgrade H-7 ujian</td>
                    </tr>
                    <tr>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Pameran TEFA</div>
                        <div style={{ marginTop: '0.4rem' }}>
                           <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Sarpra • Lab • Humas</span>
                        </div>
                      </td>
                      <td className="mobile-hide" style={{ fontSize: '0.85rem' }}>Listrik booth belum clear</td>
                      <td style={{ fontSize: '0.85rem' }}>Tarik kabel dari panel</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>C. Matriks Prioritas</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                <div style={{ background: 'var(--accent-rose-ghost)', padding: '0.75rem', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-rose)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>DO FIRST</div>
                  <ul style={{ fontSize: '0.8rem', paddingLeft: '1.1rem', margin: 0 }}>
                    <li>Perbaikan Server Database Utama</li>
                    <li>Genset Backup Mati</li>
                  </ul>
                </div>
                <div style={{ background: 'var(--accent-blue-ghost)', padding: '0.75rem', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>SCHEDULE</div>
                  <ul style={{ fontSize: '0.8rem', paddingLeft: '1.1rem', margin: 0 }}>
                    <li>Pengadaan Router Kelas Baru</li>
                    <li>SOP Keamanan Siber</li>
                  </ul>
                </div>
                <div style={{ background: 'var(--accent-amber-ghost)', padding: '0.75rem', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-amber)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>DELEGATE</div>
                  <ul style={{ fontSize: '0.8rem', paddingLeft: '1.1rem', margin: 0 }}>
                    <li>Setting Proyektor Yayasan</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>D. Capaian Program Strategis</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Program / Target</th>
                    <th>Realisasi</th>
                    <th className="mobile-hide">Hambatan</th>
                    <th>Keputusan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>FO Antar Gedung</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target: Instalasi Fisik</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '80px' }}>
                        <span style={{ fontSize: '0.8rem' }}>80%</span>
                        <div style={{ flex: 1, height: '4px', background: 'var(--bg-primary)', borderRadius: '2px' }}>
                          <div style={{ width: '80%', height: '100%', background: 'var(--accent-cyan)', borderRadius: '2px' }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="mobile-hide" style={{ fontSize: '0.85rem' }}>Rute kabel tertutup renovasi</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--accent-amber)' }}>Ubah rute via lorong B</td>
                  </tr>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>ISO Lab Kejuruan</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target: Submit Dokumen</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '80px' }}>
                        <span style={{ fontSize: '0.8rem' }}>100%</span>
                        <div style={{ flex: 1, height: '4px', background: 'var(--bg-primary)', borderRadius: '2px' }}>
                          <div style={{ width: '100%', height: '100%', background: 'var(--accent-emerald)', borderRadius: '2px' }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="mobile-hide" style={{ fontSize: '0.85rem' }}>Lancar</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--accent-emerald)' }}>Lanjut evaluasi</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default MeetingDashboard;
