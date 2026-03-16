import { Monitor, Lightbulb, Microscope, ArrowUpRight } from 'lucide-react';

const LabPage = () => {
  return (
    <div className="animate-fade-in">
      <div className="flex-row-responsive" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Laboratorium & Digitalisasi</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Riset, Inovasi, Kesiapan Praktikum & Produksi Konten</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="glass-panel stat-card delay-100">
          <div className="stat-header">
            <span className="stat-title">Kesiapan Alat Lab</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-emerald-ghost)', color: 'var(--accent-emerald)' }}>
              <Microscope size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value">92%</div>
            <div className="stat-trend trend-up">Siap Pakai Sem. 2</div>
          </div>
        </div>

        <div className="glass-panel stat-card delay-200">
          <div className="stat-header">
            <span className="stat-title">Konten Produksi</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-violet-ghost)', color: 'var(--accent-violet)' }}>
              <Monitor size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value">124</div>
            <div className="stat-trend trend-up">Video Pembelajaran</div>
          </div>
        </div>

        <div className="glass-panel stat-card delay-300">
          <div className="stat-header">
            <span className="stat-title">Layanan HKI</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-amber-ghost)', color: 'var(--accent-amber)' }}>
              <Lightbulb size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value">6</div>
            <div className="stat-trend trend-up">Aplikasi Terdaftar</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="glass-panel delay-300" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>Jadwal Ketersediaan Laboratorium Praktikum Harian</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Laboratorium</th>
                  <th>Pagi</th>
                  <th className="mobile-hide">Siang</th>
                  <th className="mobile-hide">Kesiapan Fisik</th>
                </tr>
              </thead>
              <tbody>
                {['Lab Jaringan Dasar', 'Lab AI & Big Data', 'Lab Multimedia', 'Lab IoT & Mikrokontroler'].map((lab, i) => (
                  <tr key={i} className="ticket-row">
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lab}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }} className="mobile-show">Sesi 1 • Sesi 2 • Ready</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <span className="badge badge-success" style={{ whiteSpace: 'nowrap' }}>Terjadwal</span>
                        <span className="badge badge-info mobile-show" style={{ whiteSpace: 'nowrap' }}>Kosong</span>
                      </div>
                    </td>
                    <td className="mobile-hide">
                      <span className="badge badge-info">Kosong</span>
                    </td>
                    <td className="mobile-hide">
                      {i === 2 ? (
                        <span style={{ color: 'var(--accent-amber)', fontSize: '0.85rem' }}>Maintenance PC 4,8</span>
                      ) : (
                        <span style={{ color: 'var(--accent-emerald)', fontSize: '0.85rem' }}>100% Siap</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>


        <div className="glass-panel delay-400" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: 600 }}>HKI Program Komputer</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6, maxWidth: '600px' }}>
            Portofolio produk digital tim yang telah terdaftar secara resmi di Direktorat Jenderal Kekayaan Intelektual.
          </p>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {[
              { name: 'MoLeCuL', url: 'https://molecul-game.vercel.app/' },
              { name: 'Mexpo', url: 'https://mexpo.id/' },
              { name: 'myedotel.id', url: 'https://myedotel.id' },
              { name: 'Telkom Society', url: 'https://telkom-society.smktelkom-mlg.sch.id/' },
              { name: 'Portofolio Siswa', url: 'https://portofolio.smktelkom-mlg.sch.id/' },
              { name: 'Moklet App', url: 'https://app.smktelkom-mlg.sch.id/' }
            ].map((item) => (
              <a key={item.name} href={item.url} target="_blank" rel="noreferrer" className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', padding: '0.4rem 0.75rem', textDecoration: 'none', transition: 'var(--trans-fast)', fontSize: '0.8rem' }}>
                {item.name} <ArrowUpRight size={12} />
              </a>
            ))}
            
            <a href="https://drive.google.com/drive/folders/1n5pXVCFvSc5UmkaUkwjlIEQsmvXCBPql?usp=sharing" target="_blank" rel="noreferrer" className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', border: 'none', background: 'var(--accent-rose)', color: 'white', padding: '0.4rem 1rem', textDecoration: 'none', transition: 'var(--trans-fast)', fontSize: '0.8rem', fontWeight: 700, width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
               LIHAT SERTIFIKAT HKI MOKLET <ArrowUpRight size={14} />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LabPage;
