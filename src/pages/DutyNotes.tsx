import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Search, MessageSquare, AlertCircle, CheckCircle2, User, Calendar, Loader2, X, Filter } from 'lucide-react';
import { USERS, getCurrentUser } from '../data/organization';

const DutyNotes = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    type: 'Temuan',
    priority: 'Info',
    content: '',
    senderId: getCurrentUser().id
  });

  useEffect(() => {
    // Simulate loading local data
    const savedNotes = localStorage.getItem('sarpramoklet_duty_notes');
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    } else {
      // Mock data for initial view
      const mockNotes = [
        {
          id: 'NOTE-001',
          date: '30 Mar 2026',
          sender: 'Whyna Agustin',
          type: 'Pesan',
          content: 'Kunci gudang belakang ada di Pak Rudi, dipinjam untuk perbaikan pipa.',
          priority: 'Info',
          isRead: true
        },
        {
          id: 'NOTE-002',
          date: '30 Mar 2026',
          sender: 'Zainul Abidin',
          type: 'Temuan',
          content: 'Kabel LAN di Lab Cyber 1 ada yang terkelupas, mohon dicek besok.',
          priority: 'Urgent',
          isRead: false
        }
      ];
      setNotes(mockNotes);
      localStorage.setItem('sarpramoklet_duty_notes', JSON.stringify(mockNotes));
    }
    setLoading(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const sender = USERS.find(u => u.id === formData.senderId)?.nama || 'Unknown';
    
    const newNote = {
      id: `NOTE-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      sender: sender,
      type: formData.type,
      content: formData.content,
      priority: formData.priority,
      isRead: false
    };

    // Update state and local storage
    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    localStorage.setItem('sarpramoklet_duty_notes', JSON.stringify(updatedNotes));

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setIsModalOpen(false);
    setFormData({ ...formData, content: '' });
    setIsSubmitting(false);
  };

  const toggleReadStatus = (id: string) => {
    const updatedNotes = notes.map(note => 
      note.id === id ? { ...note, isRead: !note.isRead } : note
    );
    setNotes(updatedNotes);
    localStorage.setItem('sarpramoklet_duty_notes', JSON.stringify(updatedNotes));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 size={32} className="animate-spin" color="var(--accent-blue)" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex-row-responsive" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Buku Catatan Piket</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Penyambung informasi antar petugas piket (Serah Terima Temuan & Pesan)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ alignSelf: 'flex-start' }}>
          <Plus size={18} /> <span className="mobile-hide">Tambah Catatan</span><span style={{ display: 'none' }} className="mobile-show">Tambah</span>
        </button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '1.5rem' }}>
        <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)' }}>
                    <MessageSquare size={20} />
                </div>
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Catatan</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{notes.length}</div>
                </div>
            </div>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'var(--accent-rose-ghost)', color: 'var(--accent-rose)' }}>
                    <AlertCircle size={20} />
                </div>
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Belum Terbaca</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{notes.filter(n => !n.isRead).length}</div>
                </div>
            </div>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'var(--accent-emerald-ghost)', color: 'var(--accent-emerald)' }}>
                    <CheckCircle2 size={20} />
                </div>
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sudah Terbaca</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{notes.filter(n => n.isRead).length}</div>
                </div>
            </div>
        </div>
      </div>

      <div className="glass-panel flex-row-responsive" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', gap: '1rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Cari dalam catatan..." 
            className="input-responsive"
            style={{ width: '100%', paddingLeft: '2.5rem' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
           <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
             <Filter size={16} /> Filter
           </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {notes.length === 0 ? (
          <div className="glass-panel" style={{ gridColumn: '1/-1', padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
             <ClipboardList size={48} style={{ margin: '0 auto 1.5rem auto', opacity: 0.2 }} />
             <p>Belum ada catatan piket untuk ditampilkan.</p>
          </div>
        ) : notes.map((note) => (
          <div 
            key={note.id} 
            className="glass-panel" 
            style={{ 
              padding: '1.5rem', 
              position: 'relative', 
              borderLeft: `4px solid ${note.priority === 'Urgent' ? 'var(--accent-rose)' : 'var(--accent-blue)'}`,
              background: note.isRead ? 'transparent' : 'linear-gradient(90deg, rgba(255,255,255,0.02), transparent)',
              opacity: note.isRead ? 0.8 : 1
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className={`badge ${note.type === 'Temuan' ? 'badge-danger' : 'badge-info'}`} style={{ fontSize: '0.65rem' }}>
                  {note.type}
                </span>
                {note.priority === 'Urgent' && (
                  <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>URGENT</span>
                )}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={12} /> {note.date}
              </div>
            </div>

            <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
              "{note.content}"
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                  <User size={14} />
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{note.sender}</span>
              </div>
              <button 
                onClick={() => toggleReadStatus(note.id)}
                className={`btn ${note.isRead ? 'btn-outline' : 'btn-primary'}`} 
                style={{ padding: '0.3rem 0.8rem', fontSize: '0.7rem' }}
              >
                {note.isRead ? 'Tandai Belum Terbaca' : 'Tandai Sudah Terbaca'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Tambah Catatan */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '450px', padding: '2rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-focus)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Tambah Catatan Piket</h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Jenis Catatan</label>
                  <select name="type" value={formData.type} onChange={handleInputChange} style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white' }}>
                    <option value="Temuan">Temuan</option>
                    <option value="Pesan">Pesan</option>
                  </select>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Prioritas</label>
                  <select name="priority" value={formData.priority} onChange={handleInputChange} style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white' }}>
                    <option value="Info">Info Biasa</option>
                    <option value="Urgent">Penting / Urgent</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Petugas Piket (Pengirim)</label>
                <select name="senderId" value={formData.senderId} onChange={handleInputChange} style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white' }}>
                  {USERS.filter(u => ['Sarpras', 'Semua Unit', 'IT', 'Laboratorium'].includes(u.unit)).map(u => (
                    <option key={u.id} value={u.id}>{u.nama}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Isi Pesan / Temuan *</label>
                <textarea 
                  required 
                  name="content" 
                  value={formData.content} 
                  onChange={handleInputChange} 
                  rows={4} 
                  placeholder="Instruksi untuk petugas shift berikutnya atau temuan barang/fasilitas..." 
                  style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white', resize: 'none', lineHeight: '1.5' }}
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ minWidth: '140px' }}>
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : 'Simpan Catatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Style overrides to make select inputs look right in dark mode */}
      <style>{`
        select option { background: var(--bg-secondary); color: var(--text-primary); }
      `}</style>
    </div>
  );
};

export default DutyNotes;
