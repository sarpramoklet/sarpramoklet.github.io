import { USERS } from '../data/organization';
import { Search, Filter, TrendingUp, Clock10, ShieldCheck } from 'lucide-react';
import { useProfileThumbByEmail } from '../hooks/useProfileThumbByEmail';
import UserAvatar from '../components/UserAvatar';

const mockPerformance = USERS.filter(u => u.atasanLangsung !== null).map((user) => {
  return {
    ...user,
    selesai: Math.floor(Math.random() * 50) + 10,
    durasi: Math.floor(Math.random() * 24) + 2, // 2 - 26 jam
    sla: Math.floor(Math.random() * 20) + 80, // 80 - 100%
    kontribusi: Math.floor(Math.random() * 30) + 10, // 10 - 40%
  };
});

const Performance = () => {
  const profileThumbByEmail = useProfileThumbByEmail();

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div className="flex-row-responsive" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Kinerja Personel</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Analisis capaian SLA, kecepatan dan kontribusi tim</p>
        </div>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'flex-start' }}>
          <TrendingUp size={16} /> <span className="mobile-hide">Unduh Laporan Kinerja</span><span style={{ display: 'none' }} className="mobile-show">Laporan</span>
        </button>
      </div>

      <div className="glass-panel delay-100 flex-row-responsive" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Cari Personel / Divisi..." 
            className="input-responsive"
          />
        </div>
        <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
          <Filter size={16} /> Periode: Bulan Ini
        </button>
      </div>

      <div className="glass-panel delay-200 table-container">
        <table>
          <thead>
            <tr>
              <th>Personel / Jabatan</th>
              <th className="mobile-hide">Tugas</th>
              <th className="mobile-hide">Rerata Durasi</th>
              <th>Capaian SLA</th>
              <th className="mobile-hide">Kontribusi</th>
            </tr>
          </thead>
          <tbody>
            {mockPerformance.map((perf) => (
              <tr className="ticket-row" key={perf.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="mobile-hide">
                      <UserAvatar
                        name={perf.nama}
                        email={perf.email}
                        photoUrl={perf.fotoProfil}
                        profileThumbByEmail={profileThumbByEmail}
                        size={36}
                        border={`1px solid ${perf.sla >= 95 ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`}
                      />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{perf.nama}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{perf.jabatan} <span className="mobile-show">• {perf.selesai} Selesai</span></div>
                    </div>
                  </div>
                </td>
                <td className="mobile-hide" style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>
                  {perf.selesai}
                </td>
                <td className="mobile-hide">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                    <Clock10 size={14} color="var(--accent-amber)" />
                    {perf.durasi}j
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={16} color={perf.sla >= 90 ? 'var(--accent-emerald)' : 'var(--accent-warning)'} />
                    <span style={{ fontWeight: 700, color: perf.sla >= 90 ? 'var(--accent-emerald)' : 'var(--accent-warning)', fontSize: '0.9rem' }}>
                      {perf.sla}%
                    </span>
                  </div>
                </td>
                <td className="mobile-hide" style={{ minWidth: '120px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Unit</span>
                      <span style={{ fontWeight: 600 }}>{perf.kontribusi}%</span>
                    </div>
                    <div className="progress-bar-bg" style={{ height: '4px' }}>
                      <div className="progress-bar-fill" style={{ width: `${perf.kontribusi}%`, background: 'var(--accent-violet)' }}></div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default Performance;
