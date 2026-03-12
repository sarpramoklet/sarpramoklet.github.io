import { USERS } from '../data/organization';
import { Search, Filter, ShieldCheck, UserCircle2 } from 'lucide-react';

const Personnel = () => {
  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Manajemen Personel</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Daftar personel, role aplikasi, dan struktur organisasi</p>
        </div>
        <button className="btn btn-primary">
          Tambah Personel
        </button>
      </div>

      <div className="glass-panel delay-100" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Cari Nama / Unit..." 
              style={{ 
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', 
                color: 'var(--text-primary)', padding: '0.5rem 1rem 0.5rem 2.2rem', 
                borderRadius: '8px', outline: 'none', width: '300px'
              }} 
            />
          </div>
          <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} /> Filter Unit
          </button>
        </div>
      </div>

      <div className="glass-panel delay-200 table-container">
        <table>
          <thead>
            <tr>
              <th>Personel</th>
              <th>Unit</th>
              <th>Jabatan & Role Aplikasi</th>
              <th>Sub Bidang (Fokus)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {USERS.map((user) => (
              <tr className="ticket-row" key={user.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '8px', background: 'var(--bg-primary)', borderRadius: '50%', border: '1px solid var(--border-subtle)' }}>
                      <UserCircle2 size={20} color="var(--text-secondary)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.nama}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NIP: {user.nip}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="badge" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-focus)' }}>
                    {user.unit}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>{user.jabatan}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <ShieldCheck size={12} /> {user.roleAplikasi}
                  </div>
                </td>
                <td style={{ maxWidth: '200px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {user.subBidang.length > 0 ? user.subBidang.map(sb => (
                      <span key={sb} style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                        {sb}
                      </span>
                    )) : <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mencakup Semua</span>}
                  </div>
                </td>
                <td>
                  <span className="badge badge-success">Aktif</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Personnel;
