import React, { useState, useEffect } from 'react';
import { Plus, Search, User, Loader2, X, RefreshCw, Edit3, Trash2 } from 'lucide-react';
import { USERS, getCurrentUser } from '../data/organization';

// URL Apps Script DB_Sarpramoklet (URL Terbaru)
const API_URL = "https://script.google.com/macros/s/AKfycbyiQcb0i1TRlhPgXSXks1SxEYSfRgk-PkFOKuoJn1hK-en708kYHMiYZqBZ1JhZuwROBg/exec";

const DutyNotes = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);

  const currentUser = getCurrentUser();
  const isAuthorizedToManage = (noteSender: string) => {
    if (!currentUser) return false;
    
    const sender = (noteSender || '').trim().toLowerCase();
    const currentName = (currentUser.nama || '').trim().toLowerCase();
    const role = (currentUser.roleAplikasi || '').toLowerCase();
    
    return sender === currentName || 
           role.includes('pimpinan') || 
           role.includes('admin') ||
           role.includes('executive');
  };

  // Form State
  const [formData, setFormData] = useState({
    kategori: 'Temuan',
    type: 'Info',
    amount: '',
    kredit: '',
    senderId: getCurrentUser().id
  });

  useEffect(() => {
    fetchNotes();
  }, []);

  const formatDate = (dateValue: any) => {
    if (!dateValue || dateValue === "") return "-";
    try {
      const d = new Date(dateValue);
      // Cek apakah date valid, jika tidak gunakan string aslinya
      if (isNaN(d.getTime())) return dateValue;
      
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateValue;
    }
  };

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?sheetName=Piket`);
      const data = await response.json();
      
      if (data && Array.isArray(data)) {
        // PERBAIKAN: Filter baris kosong & Normalisasi data
        const normalized = data
          .filter(item => item.id && (item.amount !== "" || item.Amount !== "")) // Filter baris yang punya ID dan Isi
          .map(item => ({
            id: item.id || item.ID,
            tanggal: formatDate(item.tanggal || item.Tanggal), // Pastikan format tanggal seragam
            keterangan: item.keterangan || item.Keterangan || "Petugas",
            kategori: item.kategori || item.Kategori || "Pesan",
            amount: item.amount || item.Amount,
            type: item.type || item.Type || "Info",
            debit: item.debit === true || item.debit === "TRUE" || item.Debit === "TRUE",
            kredit: item.kredit || item.Kredit || ""
          }));
        setNotes(normalized.reverse());
      } else {
        setNotes([]);
      }
    } catch (error) {
      console.error("Error connecting to DB:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (note: any) => {
    setEditingNote(note);
    setFormData({
      kategori: note.kategori,
      type: note.type,
      amount: note.amount,
      kredit: note.kredit === "-" ? "" : note.kredit,
      senderId: USERS.find(u => u.nama === note.keterangan)?.id || currentUser.id
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, keterangan: string) => {
    if (!confirm(`Hapus catatan dari "${keterangan}"?`)) return;
    
    setLoading(true);
    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ 
          action: 'DELETE_RECORD', 
          sheetName: 'Piket',
          id: id,
          ID: id
        })
      });
      
      // Update local state immediately
      setNotes(prev => prev.filter(n => n.id !== id));
      setTimeout(fetchNotes, 2000);
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Gagal menghapus. Cek koneksi Anda.");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount.trim()) return;
    
    setIsSubmitting(true);
    const senderName = USERS.find(u => u.id === formData.senderId)?.nama || currentUser.nama;
    
    const payload = {
      action: 'FINANCE_RECORD',
      sheetName: 'Piket',
      // Send both cases for record ID
      id: editingNote ? editingNote.id : `NOTE-${Math.floor(1000 + Math.random() * 9000)}`,
      ID: editingNote ? editingNote.id : `NOTE-${Math.floor(1000 + Math.random() * 9000)}`,
      
      // Standard header names in Sheets (mapped in both cases)
      tanggal: editingNote ? editingNote.tanggal : new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      Tanggal: editingNote ? editingNote.tanggal : new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      
      keterangan: senderName,
      Sender: senderName,
      
      kategori: formData.kategori,
      Category: formData.kategori,
      
      amount: formData.amount,
      Amount: formData.amount,
      
      type: formData.type,
      Priority: formData.type,
      
      debit: editingNote ? (editingNote.debit ? "TRUE" : "FALSE") : "FALSE",
      Read: editingNote ? (editingNote.debit ? "TRUE" : "FALSE") : "FALSE",
      
      kredit: formData.kredit || "-",
      Followup: formData.kredit || "-"
    };

    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        redirect: "follow",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });
      
      setIsModalOpen(false);
      setEditingNote(null);
      setFormData({ ...formData, amount: '', kredit: '' });
      setTimeout(fetchNotes, 3000); // Sinkronisasi ulang dengan jeda lebih lama agar DB sempat update
    } catch (error) {
      console.error("Submit failed:", error);
      alert("Gagal mengirim ke database. Coba cek koneksi Anda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredNotes = notes.filter(n => 
    n.amount?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.keterangan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.kategori?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.kredit?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && notes.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 size={32} className="animate-spin" color="var(--accent-blue)" />
        <p style={{ color: 'var(--text-secondary)' }}>Membaca Catatan dari Cloud DB...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex-row-responsive" style={{ marginBottom: '2rem' }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>SQL_CLOUD_SYNC</span>
              <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)' }}>Sheet: Piket</span>
           </div>
           <h1 className="page-title gradient-text">Buku Catatan Piket</h1>
           <p className="page-subtitle" style={{ margin: 0 }}>Koordinasi & tindak lanjut operasional lapangan</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ alignSelf: 'flex-start' }}>
          <Plus size={18} /> <span>Tambah Catatan</span>
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div className="flex-row-responsive" style={{ gap: '1rem' }}>
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari dalam catatan..." 
              className="input-responsive"
              style={{ width: '100%', paddingLeft: '2.75rem' }}
            />
          </div>
          <button onClick={fetchNotes} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Sync Live
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
        {filteredNotes.length === 0 && !loading ? (
          <div className="glass-panel" style={{ gridColumn: '1/-1', padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
             <p>Tidak ada catatan yang ditemukan.</p>
          </div>
        ) : filteredNotes.map((note) => (
          <div 
            key={note.id} 
            className="glass-panel" 
            style={{ 
              padding: '1.5rem', 
              borderLeft: `4px solid ${note.type === 'Urgent' ? 'var(--accent-rose)' : 'var(--accent-blue)'}`,
              background: note.debit ? 'transparent' : 'rgba(59, 130, 246, 0.05)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className={`badge ${note.kategori === 'Temuan' ? 'badge-danger' : 'badge-info'}`} style={{ fontSize: '0.65rem' }}>
                  {note.kategori}
                </span>
                {note.type === 'Urgent' && <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>URGENT</span>}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{note.tanggal}</div>
            </div>

            <p style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>{note.amount}</p>

            {note.kredit && note.kredit !== "-" && (
              <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--accent-emerald-ghost)', border: '1px solid rgba(16, 185, 129, 0.1)', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--accent-emerald)', fontWeight: 700, marginBottom: '0.25rem', textTransform: 'uppercase' }}>Tindak Lanjut:</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{note.kredit}</div>
              </div>
            )}

            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={14} />
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{note.keterangan}</span>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {!note.debit && <div style={{ fontSize: '0.65rem', color: 'var(--accent-blue)', fontWeight: 700, marginRight: '0.5rem' }}>BARU</div>}
                
                {isAuthorizedToManage(note.keterangan) && (
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button 
                      onClick={() => handleEdit(note)} 
                      className="btn-icon" 
                      style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
                      title="Edit Catatan"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(note.id, note.keterangan)} 
                      className="btn-icon" 
                      style={{ padding: '6px', background: 'rgba(244, 63, 94, 0.05)', color: 'var(--accent-rose)' }}
                      title="Hapus Catatan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100
        }}>
          <div className="glass-panel" style={{ width: '500px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{editingNote ? 'Edit Catatan' : 'Tambah Catatan'}</h2>
              <button onClick={() => { setIsModalOpen(false); setEditingNote(null); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Kategori</label>
                  <select value={formData.kategori} onChange={(e) => setFormData({...formData, kategori: e.target.value})} style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', color: 'white' }}>
                    <option value="Temuan">🚨 Temuan</option>
                    <option value="Pesan">💬 Pesan</option>
                  </select>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Prioritas</label>
                  <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', color: 'white' }}>
                    <option value="Info">Normal</option>
                    <option value="Urgent">Penting / Urgent</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Isi Catatan *</label>
                <textarea required value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} rows={3} placeholder="Apa temuannya?" style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', color: 'white', resize: 'none' }}></textarea>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tindak Lanjut</label>
                <textarea value={formData.kredit} onChange={(e) => setFormData({...formData, kredit: e.target.value})} rows={2} placeholder="Opsi tindak lanjut..." style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border-subtle)', color: 'white', resize: 'none' }}></textarea>
              </div>

              <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ padding: '0.75rem' }}>
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (editingNote ? 'Simpan Perubahan' : 'Kirim Catatan')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DutyNotes;
