import { Monitor, Lightbulb, Microscope } from 'lucide-react';

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
            <div className="stat-value">4</div>
            <div className="stat-trend trend-up">Aplikasi IoT, Media Interaktif</div>
          </div>
        </div>
      </div>

      <div className="glass-panel delay-300" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Jadwal Ketersediaan Laboratorium Praktikum Harian</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Laboratorium</th>
                <th>Sesi 1 (Pagi)</th>
                <th>Sesi 2 (Siang)</th>
                <th>Sesi 3 (Sore)</th>
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
                    <span className="badge badge-success">Terjadwal (Klub IoT)</span>
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
    </div>
  );
};

export default LabPage;
