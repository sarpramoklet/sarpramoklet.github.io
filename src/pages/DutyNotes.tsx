import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Search, MessageSquare, AlertCircle, CheckCircle2, User, Calendar, Loader2, X } from 'lucide-react';
import { USERS, getCurrentUser } from '../data/organization';

// URL Apps Script DB_Sarpramoklet (URL Terbaru)
const API_URL = "https://script.google.com/macros/s/AKfycbzIk_jtgDIgpcKq_CFRUrRo0kosl1upxt6QTZRTypc-PAnA01p5ZKfHhIFk8Wt1k3u_zQ/exec";

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
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      // Menambahkan ?sheetName=Piket untuk query data
      const response = await fetch(`${API_URL}?sheetName=Piket`);
      const data = await response.json();
      
      if (data && Array.isArray(data)) {
        // Balik urutan agar catatan terbaru tampil paling atas
        setNotes(data.reverse());
      } else {
        setNotes([]);
      }
    } catch (error) {
      console.error("Error fetching notes from Google Sheets:", error);
      // Fallback data if API fails to show visual
      const savedNotes = localStorage.getItem('sarpramoklet_duty_notes');
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const currentUser = getCurrentUser();
    const sender = USERS.find(u => u.id === formData.senderId)?.nama || currentUser.nama;
    
    const newNote = {
      id: `NOTE-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      sender: sender,
      type: formData.type,
      content: formData.content,
      priority: formData.priority,
      isRead: false,
      sheetName: 'Piket' // Mengirim instruksi tujuan sheet ke Apps Script
    };

    try {
      // POST ke Apps Script
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain",
        },
        body: JSON.stringify(newNote)
      });
      
      // Update tampilan lokal segera agar responsif
      setNotes([newNote, ...notes]);
      localStorage.setItem('sarpramoklet_duty_notes', JSON.stringify([newNote, ...notes]));
      
      setIsModalOpen(false);
      setFormData({ ...formData, content: '' });
      
      // Refresh dari server untuk memastikan data sinkron
      setTimeout(fetchNotes, 1500);
    } catch (error) {
      console.error("Error submitting note to Google Sheets:", error);
      alert("Gagal menyimpan ke Google Sheets. Data sementara disimpan secara lokal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleReadStatus = async (id: string) => {
    // Di Apps Script, biasanya ini butuh logic khusus (UPDATE)
    // Untuk saat ini kita simulasikan secara lokal di UI agar responsif
    const updatedNotes = notes.map(note => 
      note.id === id ? { ...note, isRead: !note.isRead } : note
    );
    setNotes(updatedNotes);
    localStorage.setItem('sarpramoklet_duty_notes', JSON.stringify(updatedNotes));
  };

  if (loading && notes.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 size={32} className="animate-spin" color="var(--accent-blue)" />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Menghubungkan ke DB_Sarpramoklet (Sheet: Piket)...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex-row-responsive" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Buku Catatan Piket</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Penyambung informasi antar petugas piket (Live Sync Google Sheets: Piket)</p>
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
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{notes.filter(n => n.isRead === false || n.isRead === "FALSE" || n.isRead === "").length}</div>
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
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{notes.filter(n => n.isRead === true || n.isRead === "TRUE").length}</div>
                </div>
            </div>
        </div>
      </div>

      <div className="glass-panel flex-row-responsive" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', gap: '1rem' }}>
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Cari dalam catatan..." 
            className="input-responsive"
            style={{ width: '100%', paddingLeft: '2.5rem' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
           <button onClick={fetchNotes} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
             <Loader2 size={16} className={loading ? 'animate-spin' : ''} /> Sync Data
           </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {notes.length === 0 && !loading ? (
          <div className="glass-panel" style={{ gridColumn: '1/-1', padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
             <ClipboardList size={48} style={{ margin: '0 auto 1.5rem auto', opacity: 0.2 }} />
             <p>Belum ada catatan piket di Cloud DB. Klik (+) untuk menulis pertama kali.</p>
          </div>
        ) : notes.map((note) => {
          const isRead = note.isRead === true || note.isRead === "TRUE";
          return (
            <div 
              key={note.id} 
              className="glass-panel" 
              style={{ 
                padding: '1.5rem', 
                position: 'relative', 
                borderLeft: `4px solid ${note.priority === 'Urgent' ? 'var(--accent-rose)' : 'var(--accent-blue)'}`,
                background: isRead ? 'transparent' : 'linear-gradient(90deg, rgba(59, 130, 246, 0.05), transparent)',
                opacity: isRead ? 0.75 : 1
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
                {note.content}
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
                  className={`btn ${isRead ? 'btn-outline' : 'btn-primary'}`} 
                  style={{ padding: '0.3rem 0.8rem', fontSize: '0.7rem' }}
                >
                  {isRead ? 'Sudah Dibaca' : 'Tandai Selesai'}
                </button>
              </div>
            </div>
          );
        })}
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
                <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', color: 'var(--accent-blue)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={16} /> {USERS.find(u => u.id === formData.senderId)?.nama || 'Unknown'}
                </div>
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
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Mengirim...</> : 'Simpan ke Cloud'}
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
