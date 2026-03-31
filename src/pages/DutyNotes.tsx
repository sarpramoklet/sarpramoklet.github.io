import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Search, MessageSquare, AlertCircle, CheckCircle2, User, Calendar, Loader2, X, RefreshCw } from 'lucide-react';
import { USERS, getCurrentUser } from '../data/organization';

// URL Apps Script DB_Sarpramoklet (SSO Terbaru)
const API_URL = "https://script.google.com/macros/s/AKfycbzIk_jtgDIgpcKq_CFRUrRo0kosl1upxt6QTZRTypc-PAnA01p5ZKfHhIFk8Wt1k3u_zQ/exec";

const DutyNotes = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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
      const response = await fetch(`${API_URL}?sheetName=Piket`);
      const data = await response.json();
      
      if (data && Array.isArray(data)) {
        // Normalisasi data dari DB (handle string boolean dari Sheets)
        const normalized = data.map(item => ({
          ...item,
          isRead: item.isRead === true || item.isRead === "TRUE"
        }));
        // Urutkan terbaru di atas
        setNotes(normalized.reverse());
      } else {
        setNotes([]);
      }
    } catch (error) {
      console.error("Error connecting to DB:", error);
      // Fallback local jika network error
      const saved = localStorage.getItem('sarpramoklet_duty_notes');
      if (saved) setNotes(JSON.parse(saved));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) return;
    
    setIsSubmitting(true);

    const currentUser = getCurrentUser();
    const senderName = USERS.find(u => u.id === formData.senderId)?.nama || currentUser.nama;
    
    const payload = {
      sheetName: 'Piket',
      id: `PKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      sender: senderName,
      type: formData.type,
      content: formData.content,
      priority: formData.priority,
      isRead: false
    };

    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });
      
      // Optimistic update UI
      setNotes([payload, ...notes]);
      setIsModalOpen(false);
      setFormData({ ...formData, content: '' });
      
      // Sinkronisasi ulang setelah jeda singkat
      setTimeout(fetchNotes, 2000);
    } catch (error) {
      console.error("Submit failed:", error);
      alert("Koneksi gagal. Periksa sinyal Anda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Logic Pencarian Terpadu
  const filteredNotes = notes.filter(n => 
    n.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.sender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: notes.length,
    unread: notes.filter(n => !n.isRead).length,
    read: notes.filter(n => n.isRead).length
  };

  if (loading && notes.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1.5rem' }}>
        <Loader2 size={40} className="animate-spin" color="var(--accent-blue)" />
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Sinkronisasi Database...</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Menghubungkan ke DB_Sarpramoklet cloud service</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header Section */}
      <div className="flex-row-responsive" style={{ marginBottom: '2rem' }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span className="badge badge-info" style={{ fontSize: '0.65rem', borderRadius: '4px' }}>LIVE DATABASE</span>
              <span className="badge" style={{ fontSize: '0.65rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>Sheet: Piket</span>
           </div>
           <h1 className="page-title gradient-text">Buku Catatan Piket</h1>
           <p className="page-subtitle" style={{ margin: 0 }}>Penyambung informasi dan temuan antar shift petugas sarana</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ alignSelf: 'flex-start' }}>
          <Plus size={18} /> <span>Buat Catatan</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '1.5rem' }}>
        <div className="glass-panel stat-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.6rem', borderRadius: '12px', background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)' }}>
                    <MessageSquare size={24} />
                </div>
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Catatan</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.total}</div>
                </div>
            </div>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.6rem', borderRadius: '12px', background: 'var(--accent-rose-ghost)', color: 'var(--accent-rose)' }}>
                    <AlertCircle size={24} />
                </div>
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Belum Dibaca</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.unread}</div>
                </div>
            </div>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.6rem', borderRadius: '12px', background: 'var(--accent-emerald-ghost)', color: 'var(--accent-emerald)' }}>
                    <CheckCircle2 size={24} />
                </div>
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Sudah Dilihat</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.read}</div>
                </div>
            </div>
        </div>
      </div>

      {/* Search & Action Bar */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div className="flex-row-responsive" style={{ gap: '1rem' }}>
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari pesan, nama petugas, atau jenis temuan..." 
              className="input-responsive"
              style={{ width: '100%', paddingLeft: '2.75rem', background: 'rgba(0,0,0,0.1)' }}
            />
          </div>
          <button 
            onClick={fetchNotes} 
            disabled={loading}
            className="btn btn-outline" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '130px', justifyContent: 'center' }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} 
            {loading ? 'Syncing...' : 'Sync Cloud'}
          </button>
        </div>
      </div>

      {/* Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
        {filteredNotes.length === 0 ? (
          <div className="glass-panel" style={{ gridColumn: '1/-1', padding: '5rem 2rem', textAlign: 'center' }}>
             <ClipboardList size={64} style={{ margin: '0 auto 1.5rem auto', opacity: 0.1, color: 'var(--accent-blue)' }} />
             <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Catatan Tidak Ditemukan</h3>
             <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>
                {searchTerm ? `Tidak ada hasil untuk "${searchTerm}". Coba kata kunci lain.` : 'Belum ada catatan di database awan. Mulai koordinasi hari ini!'}
             </p>
          </div>
        ) : filteredNotes.map((note) => (
          <div 
            key={note.id} 
            className="glass-panel note-card" 
            style={{ 
              padding: '1.75rem', 
              display: 'flex',
              flexDirection: 'column',
              borderLeft: `4px solid ${note.priority === 'Urgent' ? 'var(--accent-rose)' : 'var(--accent-blue)'}`,
              background: note.isRead ? 'rgba(255,255,255,0.01)' : 'rgba(59, 130, 246, 0.03)',
              transition: 'all 0.3s ease',
              minHeight: '220px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className={`badge ${note.type === 'Temuan' ? 'badge-danger' : 'badge-info'}`} style={{ fontSize: '0.65rem', padding: '0.2rem 0.6rem' }}>
                  {note.type}
                </span>
                {note.priority === 'Urgent' && (
                  <span className="badge badge-warning animate-pulse" style={{ fontSize: '0.65rem', padding: '0.2rem 0.6rem' }}>URGENT</span>
                )}
                {note.isRead && (
                  <span className="badge badge-emerald-ghost" style={{ fontSize: '0.65rem' }}>DILIHAT</span>
                )}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
                <Calendar size={14} /> {note.date}
              </div>
            </div>

            <p style={{ fontSize: '1rem', lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '2rem', whiteSpace: 'pre-wrap' }}>
              {note.content}
            </p>

            <div style={{ marginTop: 'auto', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{note.sender}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Petugas Piket</div>
                </div>
              </div>
              
              {!note.isRead && (
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-blue)', fontSize: '0.75rem', fontWeight: 600 }}>
                   <div className="pulse-dot"></div> New Message
                 </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Section */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100
        }}>
          <div className="glass-panel animate-scale-in" style={{ width: '500px', padding: '2.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-focus)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 700 }}>Catatan Baru</h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Berikan pesan/instruksi untuk shift berikutnya</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1.25rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Jenis</label>
                  <select name="type" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', color: 'white' }}>
                    <option value="Temuan">🚨 Temuan</option>
                    <option value="Pesan">💬 Pesan</option>
                  </select>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Prioritas</label>
                  <select name="priority" value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', color: 'white' }}>
                    <option value="Info">Normal</option>
                    <option value="Urgent">Penting / Urgent</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Petugas Piket (Pengirim)</label>
                <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', color: 'var(--accent-blue)', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <User size={18} /> {USERS.find(u => u.id === formData.senderId)?.nama || 'Unknown User'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Pesan / Deskripsi *</label>
                <textarea 
                  required 
                  name="content" 
                  value={formData.content} 
                  onChange={(e) => setFormData({...formData, content: e.target.value})} 
                  rows={5} 
                  placeholder="Ceritakan detail temuan atau pesan operasional di sini..." 
                  style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', color: 'white', resize: 'none', lineHeight: '1.6', fontSize: '0.95rem' }}
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ padding: '0.75rem 1.5rem' }} onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ minWidth: '180px', padding: '0.75rem 1.5rem', fontSize: '0.95rem', fontWeight: 700 }}>
                  {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Mengirim...</> : 'Simpan ke Cloud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global CSS Enhancements */}
      <style>{`
        select option { background: var(--bg-secondary); color: var(--text-primary); }
        .note-card:hover { transform: translateY(-4px); box-shadow: 0 10px 30px rgba(0,0,0,0.3); border-color: var(--accent-blue); }
        .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent-blue); box-shadow: 0 0 10px var(--accent-blue); animation: pulse 2s infinite; }
        @keyframes pulse { 0% { transform: scale(0.95); opacity: 0.7; } 70% { transform: scale(1.2); opacity: 0; } 100% { transform: scale(0.95); opacity: 0; } }
      `}</style>
    </div>
  );
};

export default DutyNotes;
