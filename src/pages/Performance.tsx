import { USERS } from '../data/organization';
import { Search, Filter, TrendingUp, Award, Clock10, ShieldCheck } from 'lucide-react';

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
  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Kinerja Personel</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Analisis capaian SLA, kecepatan dan kontribusi tim</p>
        </div>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={16} /> Unduh Laporan Kinerja
        </button>
      </div>

      <div className="glass-panel delay-100" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Cari Personel / Divisi..." 
              style={{ 
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', 
                color: 'var(--text-primary)', padding: '0.5rem 1rem 0.5rem 2.2rem', 
                borderRadius: '8px', outline: 'none', width: '300px'
              }} 
            />
          </div>
          <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} /> Periode: Bulan Ini
          </button>
        </div>
      </div>

      <div className="glass-panel delay-200 table-container">
        <table>
          <thead>
            <tr>
              <th>Nama Personel & Jabatan</th>
              <th>Kategori Dominan</th>
              <th>Tugas Selesai</th>
              <th>Rata-rata Durasi</th>
              <th>Kepatuhan SLA</th>
              <th>Kontribusi Unit</th>
            </tr>
          </thead>
          <tbody>
            {mockPerformance.map((perf) => (
              <tr className="ticket-row" key={perf.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '8px', background: 'var(--bg-primary)', borderRadius: '50%', border: '1px solid var(--border-subtle)' }}>
                      <Award size={20} color={perf.sla >= 95 ? 'var(--accent-emerald)' : 'var(--text-secondary)'} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{perf.nama}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{perf.jabatan}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="badge" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-focus)' }}>
                    {perf.subBidang.length > 0 ? perf.subBidang[0] : 'Umum'}
                  </span>
                </td>
                <td style={{ fontWeight: 600, color: 'var(--accent-blue)', fontSize: '1.1rem' }}>
                  {perf.selesai}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock10 size={14} color="var(--accent-amber)" />
                    {perf.durasi} Jam
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={16} color={perf.sla >= 90 ? 'var(--accent-emerald)' : 'var(--accent-warning)'} />
                    <span style={{ fontWeight: 600, color: perf.sla >= 90 ? 'var(--accent-emerald)' : 'var(--accent-warning)' }}>
                      {perf.sla}%
                    </span>
                  </div>
                </td>
                <td style={{ minWidth: '150px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Proporsi Unit ({perf.unit})</span>
                      <span style={{ fontWeight: 600 }}>{perf.kontribusi}%</span>
                    </div>
                    <div className="progress-bar-bg" style={{ height: '6px' }}>
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
