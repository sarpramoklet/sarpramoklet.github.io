import { useState } from 'react';
import { Users, TrendingUp, AlertTriangle, CheckSquare, Clock10, AlertCircle, LayoutGrid, Target } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Executive Meeting Dashboard</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Sajian Data Berbasis Keputusan untuk Rapat Bulanan</p>
        </div>
        <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '0.25rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          <button 
            onClick={() => setActiveTab('internal')}
            style={{ 
              padding: '0.6rem 1.5rem', 
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'internal' ? 'var(--accent-blue-ghost)' : 'transparent',
              color: activeTab === 'internal' ? 'var(--accent-blue)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'internal' ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            1. Rapat Internal Tim
          </button>
          <button 
            onClick={() => setActiveTab('eksternal')}
            style={{ 
              padding: '0.6rem 1.5rem', 
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'eksternal' ? 'var(--accent-violet-ghost)' : 'transparent',
              color: activeTab === 'eksternal' ? 'var(--accent-violet)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'eksternal' ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            2. Rapat Antar Unit
          </button>
        </div>
      </div>

      {/* RINGKASAN UTAMA (MUNCUL DI KEDUANYA DENGAN KONTEKS BERBEDA) */}
      <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>A. Ringkasan Utama Bulan Ini</h3>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
          <div className="stat-header"><span className="stat-title">Masuk</span><Users size={16} color="var(--accent-blue)" /></div>
          <div className="stat-value" style={{ fontSize: '1.8rem' }}>142</div>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
          <div className="stat-header"><span className="stat-title">Selesai</span><CheckSquare size={16} color="var(--accent-emerald)" /></div>
          <div className="stat-value" style={{ fontSize: '1.8rem' }}>120</div>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
          <div className="stat-header"><span className="stat-title">Overdue</span><AlertTriangle size={16} color="var(--accent-rose)" /></div>
          <div className="stat-value" style={{ fontSize: '1.8rem', color: 'var(--accent-rose)' }}>18</div>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
          <div className="stat-header"><span className="stat-title">Waktu Respon</span><Clock10 size={16} color="var(--accent-amber)" /></div>
          <div className="stat-value" style={{ fontSize: '1.8rem' }}>14<span style={{ fontSize: '0.8rem' }}>m</span></div>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
          <div className="stat-header"><span className="stat-title">Penyelesaian</span><Target size={16} color="var(--accent-cyan)" /></div>
          <div className="stat-value" style={{ fontSize: '1.8rem' }}>3.2<span style={{ fontSize: '0.8rem' }}>j</span></div>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
          <div className="stat-header"><span className="stat-title">Capaian KPI</span><TrendingUp size={16} color="var(--accent-violet)" /></div>
          <div className="stat-value" style={{ fontSize: '1.8rem' }}>84.5%</div>
        </div>
      </div>

      {activeTab === 'internal' && (
        <div className="animate-fade-in">
          <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {/* GRAFIK TREN */}
            <div className="glass-panel chart-container">
              <div className="chart-header">
                <h3 style={{ fontSize: '1rem' }}>B. Kinerja Per Subproses</h3>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subProcessData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                    <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis dataKey="name" type="category" width={120} stroke="var(--text-muted)" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-focus)', borderRadius: '8px' }} />
                    <Legend />
                    <Bar dataKey="total" name="Total Tugas" fill="var(--accent-blue-ghost)" stroke="var(--accent-blue)" />
                    <Bar dataKey="selesai" name="Selesai" fill="var(--accent-emerald)" />
                    <Bar dataKey="overdue" name="Overdue" fill="var(--accent-rose)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel chart-container">
              <div className="chart-header">
                <h3 style={{ fontSize: '1rem' }}>Tren Tiket Masuk vs Selesai (Per Bulan)</h3>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-focus)', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="Masuk" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMasuk)" />
                    <Area type="monotone" dataKey="Selesai" stroke="#10b981" fillOpacity={1} fill="url(#colorSelesai)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} color="var(--accent-rose)" /> C. Daftar Pekerjaan Kritis (Eskalasi)
            </h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nama Pekerjaan / Isu</th>
                    <th>Subproses</th>
                    <th>Status</th>
                    <th>Kendala</th>
                    <th>Keputusan yang Dibutuhkan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Pengadaan 20 PC Lab Tertunda</td>
                    <td>Lab &gt; Pengadaan</td>
                    <td><span className="badge badge-danger">Lewat SLA (14 Hari)</span></td>
                    <td>Anggaran belum turun dari Yayasan</td>
                    <td style={{ color: 'var(--accent-amber)' }}>Approve eskalasi ke Keuangan Pusat</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Tembok Lorong Kelas X Rembes Berulang</td>
                    <td>Sarpras &gt; Gedung</td>
                    <td><span className="badge badge-warning">Isu Berulang (3x)</span></td>
                    <td>Talang air utama cacat struktur</td>
                    <td style={{ color: 'var(--accent-amber)' }}>Persetujuan renovasi talang total (Bukan tambal)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>D. Evaluasi Akar Masalah & Top 5 Isu</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <span>1. AC Lab Sering Mati mendadak</span>
                  <span className="badge badge-warning">Masalah Vendor / Sistemik</span>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <span>2. Delay Respon Helpdesk &gt; 30 Menit</span>
                  <span className="badge badge-danger">Masalah SDM (Kurang Personil)</span>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <span>3. Jadwal Pakai Ruang Aula Bentrok</span>
                  <span className="badge badge-info">Masalah Alur Kerja / Koordinasi</span>
                </li>
              </ul>
            </div>
            
            <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-emerald)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>E. & F. Rencana & Komitmen Bulan Depan</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>1. Eksekusi Pengadaan Tandon Air Utara</h4>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem' }}>
                    <span>PIC: Tim Sarpras</span>
                    <span>Target: 15 Apr 2026</span>
                  </div>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>2. Migrasi Database Siakad ke Server B</h4>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem' }}>
                    <span>PIC: Tim Infrastruktur IT</span>
                    <span>Target: 20 Apr 2026</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'eksternal' && (
        <div className="animate-fade-in">
          
          <div className="dashboard-grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LayoutGrid size={18} color="var(--accent-blue)" /> B. Peta Layanan Lintas Unit & Ketergantungan
              </h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Kebutuhan / Proyek</th>
                      <th>Unit Terlibat</th>
                      <th>Hambatan Koordinasi</th>
                      <th>Tindak Lanjut</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Ujian CBT Semester Genap</td>
                      <td><span className="badge badge-info">IT + Lab + Kurikulum</span></td>
                      <td>Kapasitas bandwidth Lab 3 belum di-upgrade</td>
                      <td>IT mengeksekusi upgrade H-7 ujian</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Pameran Karya Inovasi (TEFA)</td>
                      <td><span className="badge badge-warning">Sarpras + Lab + Humas</span></td>
                      <td>Instalasi listrik booth belum clear</td>
                      <td>Sarpras menarik kabel ekstensi dari panel utama</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>C. Matriks Prioritas (Bulan Depan)</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '0.5rem', flex: 1 }}>
                <div style={{ background: 'var(--accent-rose-ghost)', padding: '1rem', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-rose)', marginBottom: '0.5rem' }}>DO FIRST (Tinggi Dampak, Tinggi Urgensi)</div>
                  <ul style={{ fontSize: '0.85rem', paddingLeft: '1rem', margin: 0 }}>
                    <li>Perbaikan Server Database Utama</li>
                    <li>Genset Backup Mati</li>
                  </ul>
                </div>
                <div style={{ background: 'var(--accent-blue-ghost)', padding: '1rem', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '0.5rem' }}>SCHEDULE (Tinggi Dampak, Rendah Urgensi)</div>
                  <ul style={{ fontSize: '0.85rem', paddingLeft: '1rem', margin: 0 }}>
                    <li>Pengadaan Router Kelas Baru</li>
                    <li>SOP Keamanan Siber</li>
                  </ul>
                </div>
                <div style={{ background: 'var(--accent-amber-ghost)', padding: '1rem', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-amber)', marginBottom: '0.5rem' }}>DELEGATE (Rendah Dampak, Tinggi Urgensi)</div>
                  <ul style={{ fontSize: '0.85rem', paddingLeft: '1rem', margin: 0 }}>
                    <li>Setting Proyektor Rapat Yayasan</li>
                    <li>Restock Tinta Printer Guru</li>
                  </ul>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                   <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>ELIMINATE (Rendah Dampak, Rendah Urgensi)</div>
                   <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ticket minor tanpa kejelasan pengaju</span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>D. Capaian Program Strategis Lintas Fungsi</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nama Program</th>
                    <th>Target Bulan Ini</th>
                    <th>Realisasi %</th>
                    <th>Deviasi / Hambatan</th>
                    <th>Keputusan yang Diperlukan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Tarik Fiber Optic Antar Gedung</td>
                    <td>Selesai Instalasi Fisik</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>80%</span>
                        <div style={{ flex: 1, height: '6px', background: 'var(--bg-primary)', borderRadius: '3px' }}>
                          <div style={{ width: '80%', height: '100%', background: 'var(--accent-cyan)', borderRadius: '3px' }}></div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--accent-amber)' }}>Rute kabel tertutup renovasi aula</td>
                    <td>Ubah rute kabel via lorong B (Perlu anggaran extra 2jt)</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Sertifikasi ISO Lab Kejuruan</td>
                    <td>Submit Dokumen Tahap 1</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>100%</span>
                        <div style={{ flex: 1, height: '6px', background: 'var(--bg-primary)', borderRadius: '3px' }}>
                          <div style={{ width: '100%', height: '100%', background: 'var(--accent-emerald)', borderRadius: '3px' }}></div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--accent-emerald)' }}>Tidak ada hambatan</td>
                    <td>Lanjut ke persiapan evaluasi asesor luar</td>
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
