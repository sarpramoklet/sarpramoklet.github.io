import { USERS, getCurrentUser, ROLES } from '../data/organization';
import { Search, ShieldCheck, UserCircle2, Edit3, Calendar, Plus, X, Save } from 'lucide-react';
import { useState } from 'react';

const Personnel = () => {
  const currentUser = getCurrentUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State for editing
  const [tempJobdesk, setTempJobdesk] = useState<string[]>([]);
  const [newJob, setNewJob] = useState('');

  const isKaur = currentUser.roleAplikasi.includes('Koordinator');
  const isPimpinan = currentUser.roleAplikasi === ROLES.PIMPINAN;

  const filteredUsers = USERS.filter(user => {
    // Hadi sees all
    if (isPimpinan) {
       return user.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
              user.unit.toLowerCase().includes(searchTerm.toLowerCase());
    }
    // Kaurs see their unit
    if (user.unit === currentUser.unit || user.unit === 'Semua Unit') {
       return user.nama.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return false;
  });

  const handleManage = (user: any) => {
    setSelectedUser(user);
    setTempJobdesk([...user.scopePekerjaan]);
    setIsModalOpen(true);
  };

  const handleAddJob = () => {
    if (newJob.trim()) {
      setTempJobdesk([...tempJobdesk, newJob]);
      setNewJob('');
    }
  };

  const removeJob = (index: number) => {
    setTempJobdesk(tempJobdesk.filter((_, i) => i !== index));
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div className="flex-row-responsive" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Manajemen Personel {currentUser.unit !== 'Semua Unit' ? `- Unit ${currentUser.unit}` : ''}</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Daftar personel, role aplikasi, dan struktur organisasi</p>
        </div>
        {isKaur && (
          <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
            <Plus size={18} /> <span className="mobile-hide">Tambah Personel Baru</span><span style={{ display: 'none' }} className="mobile-show">Tambah</span>
          </button>
        )}
      </div>

      <div className="glass-panel delay-100 flex-row-responsive" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Cari Nama Personel..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-responsive"
          />
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }} className="mobile-hide">
          Menampilkan {filteredUsers.length} Personel
        </div>
      </div>

      <div className="glass-panel delay-200 table-container">
        <table>
          <thead>
            <tr>
              <th>Personel</th>
              <th>Unit</th>
              <th>Jabatan & Role Aplikasi</th>
              <th>Status Kerja</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr className="ticket-row" key={user.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '8px', background: 'var(--bg-primary)', borderRadius: '50%', border: '1px solid var(--border-subtle)' }}>
                      <UserCircle2 size={20} color="var(--accent-blue)" />
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
                  <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{user.jabatan}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <ShieldCheck size={12} /> {user.roleAplikasi}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-success">Aktif</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user.scopePekerjaan.length} Jobdesk</span>
                  </div>
                </td>
                <td>
                  {(isKaur || isPimpinan) && (
                    <button 
                      className="btn btn-outline" 
                      onClick={() => handleManage(user)}
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Edit3 size={14} /> Kelola Job & Jadwal
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Management Modal */}
      {isModalOpen && selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel animate-scale-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
              <div style={{ padding: '12px', background: 'var(--accent-blue-ghost)', borderRadius: '50%', color: 'var(--accent-blue)' }}>
                <UserCircle2 size={32} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Kelola Personel: {selectedUser.nama}</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>ID: {selectedUser.nip} | Unit {selectedUser.unit}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={18} color="var(--accent-blue)" /> Daftar Jobdesk / Tugas Utama
              </h3>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  placeholder="Tambah Jobdesk baru..." 
                  value={newJob}
                  onChange={(e) => setNewJob(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddJob()}
                  style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: '0.6rem 1rem', borderRadius: '8px', color: 'var(--text-primary)' }}
                />
                <button className="btn btn-primary" onClick={handleAddJob} style={{ padding: '0 1rem' }}>
                   <Plus size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {tempJobdesk.map((job, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.9rem' }}>{job}</span>
                    <button onClick={() => removeJob(i)} style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer' }}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={18} color="var(--accent-emerald)" /> Jadwal Kerja Rutin / Mingguan
              </h3>
              <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--border-subtle)', textAlign: 'center' }}>
                 <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Fitur penjadwalan visual kalender sedang dikembangkan.</p>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                    {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map((day, i) => (
                      <div key={i} style={{ padding: '8px 4px', background: i < 5 ? 'var(--accent-emerald-ghost)' : 'var(--bg-primary)', borderRadius: '4px', fontSize: '0.7rem', color: i < 5 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                        {day}
                      </div>
                    ))}
                 </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setIsModalOpen(false)}>
                <Save size={18} /> Simpan Perubahan
              </button>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setIsModalOpen(false)}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Personnel;
