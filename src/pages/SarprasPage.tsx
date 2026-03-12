
import { Building, Wrench, HardHat } from 'lucide-react';

const SarprasPage = () => {
  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Sarana & Prasarana</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Gedung, Kebersihan, Keamanan, Kelistrikan & Preventive Maintenance</p>
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
            <div className="stat-trend trend-up">Seluruh Area Sekolah MTP</div>
          </div>
        </div>

        <div className="glass-panel stat-card delay-200">
          <div className="stat-header">
            <span className="stat-title">Kerusakan/Perbaikan Aktif</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-amber-ghost)', color: 'var(--accent-amber)' }}>
              <Wrench size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value">18</div>
            <div className="stat-trend trend-down">Menurun dari minggu lalu (24)</div>
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
            <div className="stat-trend trend-up">Renovasi Area Parkir Timur</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid delay-300" style={{ gridTemplateColumns: '1fr' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Maintenance Rutin Minggu Ini</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Objek Maintenance</th>
                  <th>Lokasi</th>
                  <th>Kategori</th>
                  <th>Vendor / PIC</th>
                  <th>Status Pelaksanaan</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { obj: 'Cuci AC Central MTP', loc: 'Gedung SML', cat: 'Fasilitas', pic: 'Vendor: PT Indo Prima', status: 'Selesai' },
                  { obj: 'Cek Pompa Air Tanah', loc: 'Area Tangki Utara', cat: 'Utilitas', pic: 'Tim Sarpras', status: 'Dikerjakan' },
                  { obj: 'Pemeliharaan Panel Listrik Utama', loc: 'Basement', cat: 'Listrik', pic: 'Petugas PLN', status: 'Direncanakan (Sabtu)' },
                  { obj: 'Peremajaan Cat Tembok', loc: 'Lorong Kelas X', cat: 'Bangunan', pic: 'Tim Sarpras', status: 'Direncanakan (Minggu)' },
                ].map((m, i) => (
                  <tr key={i} className="ticket-row">
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{m.obj}</td>
                    <td>{m.loc}</td>
                    <td><span className="badge badge-info">{m.cat}</span></td>
                    <td>{m.pic}</td>
                    <td>
                      {m.status.includes('Selesai') ? (
                        <span style={{ color: 'var(--accent-emerald)' }}>{m.status}</span>
                      ) : m.status.includes('Dikerjakan') ? (
                        <span style={{ color: 'var(--accent-blue)' }}>{m.status}</span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>{m.status}</span>
                      )}
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
