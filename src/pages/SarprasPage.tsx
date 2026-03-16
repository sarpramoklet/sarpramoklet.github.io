
import { Building, Wrench, HardHat } from 'lucide-react';

const SarprasPage = () => {
  return (
    <div className="animate-fade-in">
      <div className="flex-row-responsive" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Sarana & Prasarana</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Gedung, Kebersihan, Keamanan, Preventive Maintenance</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="glass-panel stat-card delay-100">
          <div className="stat-header">
            <span className="stat-title">Ruang Layak Pakai</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-emerald-ghost)', color: 'var(--accent-emerald)' }}>
              <Building size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value">98.5%</div>
            <div className="stat-trend trend-up">Seluruh Area MTP</div>
          </div>
        </div>

        <div className="glass-panel stat-card delay-200">
          <div className="stat-header">
            <span className="stat-title">Maintenance Aktif</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-amber-ghost)', color: 'var(--accent-amber)' }}>
              <Wrench size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value">18</div>
            <div className="stat-trend trend-down">Turun dari pekan lalu</div>
          </div>
        </div>

        <div className="glass-panel stat-card delay-300">
          <div className="stat-header">
            <span className="stat-title">Proyek Renovasi</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)' }}>
              <HardHat size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value">2</div>
            <div className="stat-trend trend-up">Parkir Tim. & Aula</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid delay-300">
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>Maintenance Rutin Minggu Ini</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Objek / Lokasi</th>
                  <th className="mobile-hide">Kategori</th>
                  <th className="mobile-hide">Pelaksana</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { obj: 'Cuci AC Central MTP', loc: 'Gedung SML', cat: 'Fasilitas', pic: 'PT Indo Prima', status: 'Selesai' },
                  { obj: 'Cek Pompa Air Tanah', loc: 'Tangki Utara', cat: 'Utilitas', pic: 'Tim Sarpras', status: 'Dikerjakan' },
                  { obj: 'Panel Listrik Utama', loc: 'Basement', cat: 'Listrik', pic: 'Petugas PLN', status: 'Direncanakan' },
                  { obj: 'Peremajaan Cat Tembok', loc: 'Lorong Kls X', cat: 'Bangunan', pic: 'Tim Sarpras', status: 'Direncanakan' },
                ].map((m, i) => (
                  <tr key={i} className="ticket-row">
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{m.obj}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.loc} <span className="mobile-show">• {m.cat}</span></div>
                    </td>
                    <td className="mobile-hide"><span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{m.cat}</span></td>
                    <td className="mobile-hide" style={{ fontSize: '0.85rem' }}>{m.pic}</td>
                    <td>
                      <span style={{ 
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: m.status === 'Selesai' ? 'var(--accent-emerald)' : 
                               m.status === 'Dikerjakan' ? 'var(--accent-blue)' : 
                               'var(--text-muted)' 
                      }}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};

export default SarprasPage;
