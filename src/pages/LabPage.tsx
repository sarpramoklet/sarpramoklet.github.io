import { Monitor, Lightbulb, Microscope, ArrowUpRight } from 'lucide-react';

const LabPage = () => {
  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
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
            <div className="stat-trend trend-up">Siap untuk digunakan Semester 2</div>
          </div>
        </div>

        <div className="glass-panel stat-card delay-200">
          <div className="stat-header">
            <span className="stat-title">Konten Diproduksi</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-violet-ghost)', color: 'var(--accent-violet)' }}>
              <Monitor size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value">124</div>
            <div className="stat-trend trend-up">Video Pembelajaran IT</div>
          </div>
        </div>

        <div className="glass-panel stat-card delay-300">
          <div className="stat-header">
            <span className="stat-title">Inovasi / HKI Masuk</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-amber-ghost)', color: 'var(--accent-amber)' }}>
              <Lightbulb size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value">6</div>
            <div className="stat-trend trend-up">Aplikasi Terdaftar Layanan HKI</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="glass-panel delay-300" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Jadwal Ketersediaan Laboratorium Praktikum Harian</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Laboratorium</th>
                  <th>Sesi 1 (Pagi)</th>
                  <th>Sesi 2 (Siang)</th>
                  <th>Status Kesiapan Fisik</th>
                </tr>
              </thead>
              <tbody>
                {['Lab Jaringan Dasar (Lt 2)', 'Lab AI & Big Data (Lt 3)', 'Lab Multimedia (Lt 1)', 'Lab IoT & Mikrokontroler'].map((lab, i) => (
                  <tr key={i} className="ticket-row">
                    <td style={{ fontWeight: 600 }}>{lab}</td>
                    <td>
                      <span className="badge badge-success">Terjadwal (XR-Telkom)</span>
                    </td>
                    <td>
                      <span className="badge badge-info">Kosong</span>
                    </td>
                    <td>
                      {i === 2 ? (
                        <span style={{ color: 'var(--accent-warning)' }}>Maintenance PC No 4,8</span>
                      ) : (
                        <span style={{ color: 'var(--accent-emerald)' }}>100% Siap Dipakai</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel delay-400" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-focus)' }}>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: 600 }}>HKI Program Komputer</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Beberapa hasil kerja tim telah meloloskan pencatatan atau pengajuan HKI kategori program komputer.
          </p>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <a href="https://molecul-game.vercel.app/" target="_blank" rel="noreferrer" className="badge" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', padding: '0.5rem 1rem', textDecoration: 'none', transition: 'var(--trans-fast)', fontSize: '0.85rem' }}>
              MoLeCuL <ArrowUpRight size={14} />
            </a>
            <a href="https://mexpo.id/" target="_blank" rel="noreferrer" className="badge" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', padding: '0.5rem 1rem', textDecoration: 'none', transition: 'var(--trans-fast)', fontSize: '0.85rem' }}>
              Mexpo <ArrowUpRight size={14} />
            </a>
            <a href="https://myedotel.id" target="_blank" rel="noreferrer" className="badge" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', padding: '0.5rem 1rem', textDecoration: 'none', transition: 'var(--trans-fast)', fontSize: '0.85rem' }}>
              myedotel.id <ArrowUpRight size={14} />
            </a>
            <a href="https://telkom-society.smktelkom-mlg.sch.id/" target="_blank" rel="noreferrer" className="badge" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', padding: '0.5rem 1rem', textDecoration: 'none', transition: 'var(--trans-fast)', fontSize: '0.85rem' }}>
              Telkom Society <ArrowUpRight size={14} />
            </a>
            <a href="https://portofolio.smktelkom-mlg.sch.id/" target="_blank" rel="noreferrer" className="badge" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', padding: '0.5rem 1rem', textDecoration: 'none', transition: 'var(--trans-fast)', fontSize: '0.85rem' }}>
              Portofolio Siswa <ArrowUpRight size={14} />
            </a>
            <a href="https://app.smktelkom-mlg.sch.id/" target="_blank" rel="noreferrer" className="badge" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', padding: '0.5rem 1rem', textDecoration: 'none', transition: 'var(--trans-fast)', fontSize: '0.85rem' }}>
              Moklet App <ArrowUpRight size={14} />
            </a>
            <a href="https://drive.google.com/drive/folders/1n5pXVCFvSc5UmkaUkwjlIEQsmvXCBPql?usp=sharing" target="_blank" rel="noreferrer" className="badge" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: 'none', background: '#b91c1c', color: 'white', padding: '0.5rem 1rem', textDecoration: 'none', transition: 'var(--trans-fast)', fontSize: '0.85rem', boxShadow: '0 4px 14px rgba(185, 28, 28, 0.4)' }}>
               Sertifikat HKI Moklet <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabPage;
