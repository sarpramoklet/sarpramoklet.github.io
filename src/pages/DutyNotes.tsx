import React, { useState, useEffect } from 'react';
import { Plus, Search, User, Loader2, X, RefreshCw } from 'lucide-react';
import { USERS, getCurrentUser } from '../data/organization';

// URL Apps Script DB_Sarpramoklet
const API_URL = "https://script.google.com/macros/s/AKfycbzIk_jtgDIgpcKq_CFRUrRo0kosl1upxt6QTZRTypc-PAnA01p5ZKfHhIFk8Wt1k3u_zQ/exec";

const DutyNotes = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State disesuaikan dengan skema DB baru
  const [formData, setFormData] = useState({
    kategori: 'Temuan',
    type: 'Info',
    amount: '', // Isi Pesan
    kredit: '', // Tindak Lanjut
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
        // Normalisasi data dari DB sesuai header user: id, tanggal, keterangan, kategori, amount, type, debit, kredit
        const normalized = data.map(item => ({
          id: item.id,
          tanggal: item.tanggal,
          keterangan: item.keterangan, // Sender
          kategori: item.kategori, // Temuan/Pesan
          amount: item.amount, // Content
          type: item.type, // Priority
          debit: item.debit === true || item.debit === "TRUE", // Read Status
          kredit: item.kredit // Follow-up
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount.trim()) return;
    
    setIsSubmitting(true);

    const currentUser = getCurrentUser();
    const senderName = USERS.find(u => u.id === formData.senderId)?.nama || currentUser.nama;
    
    // Mapping Payload sesuai header Spreadsheet: id, tanggal, keterangan, kategori, amount, type, debit, kredit
    const payload = {
      sheetName: 'Piket',
      id: `NOTE-${Math.floor(1000 + Math.random() * 9000)}`,
      tanggal: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      keterangan: senderName,
      kategori: formData.kategori,
      amount: formData.amount,
      type: formData.type,
      debit: "FALSE", // Default status baca
      kredit: formData.kredit || "-" // Tindak Lanjut
    };

    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });
      
      setIsModalOpen(false);
      setFormData({ ...formData, amount: '', kredit: '' });
      setTimeout(fetchNotes, 1500);
    } catch (error) {
      console.error("Submit failed:", error);
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
        <p style={{ color: 'var(--text-secondary)' }}>Menyambungkan ke Database...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex-row-responsive" style={{ marginBottom: '2rem' }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>DB_Sarpramoklet</span>
              <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)' }}>Sheet: Piket</span>
           </div>
           <h1 className="page-title gradient-text">Buku Catatan Piket</h1>
           <p className="page-subtitle" style={{ margin: 0 }}>Koordinasi temuan & tindak lanjut operasional lapangan</p>
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
              placeholder="Cari pesan, petugas, atau tindak lanjut..." 
              className="input-responsive"
              style={{ width: '100%', paddingLeft: '2.75rem' }}
            />
          </div>
          <button onClick={fetchNotes} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Sync
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
        {filteredNotes.map((note) => (
          <div 
            key={note.id} 
            className="glass-panel" 
            style={{ 
              padding: '1.5rem', 
              borderLeft: `4px solid ${note.type === 'Urgent' ? 'var(--accent-rose)' : 'var(--accent-blue)'}`,
              background: note.debit ? 'transparent' : 'rgba(59, 130, 246, 0.03)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className={`badge ${note.kategori === 'Temuan' ? 'badge-danger' : 'badge-info'}`} style={{ fontSize: '0.65rem' }}>
                  {note.kategori}
                </span>
                {note.type === 'Urgent' && <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>URGENT</span>}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{note.tanggal}</div>
            </div>

            <p style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>"{note.amount}"</p>

            {note.kredit && note.kredit !== "-" && (
              <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--accent-emerald-ghost)', border: '1px solid rgba(16, 185, 129, 0.1)', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--accent-emerald)', fontWeight: 700, marginBottom: '0.25rem', textTransform: 'uppercase' }}>Tindak Lanjut / Follow-up:</div>
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
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Tambah Catatan Piket</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Kategori</label>
                  <select value={formData.kategori} onChange={(e) => setFormData({...formData, kategori: e.target.value})} style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', color: 'white' }}>
                    <option value="Temuan">Temuan</option>
                    <option value="Pesan">Pesan</option>
                  </select>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Prioritas</label>
                  <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', color: 'white' }}>
                    <option value="Info">Info Biasa</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pesan / Temuan *</label>
                <textarea required value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} rows={3} placeholder="Ceritakan temuan Anda..." style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', color: 'white', resize: 'none' }}></textarea>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tindak Lanjut (Opsional)</label>
                <textarea value={formData.kredit} onChange={(e) => setFormData({...formData, kredit: e.target.value})} rows={2} placeholder="Misal: Sudah diperbaiki, Sudah dikunci, dll." style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border-subtle)', color: 'white', resize: 'none' }}></textarea>
              </div>

              <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ padding: '0.75rem' }}>
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Simpan ke Google Sheets'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DutyNotes;
