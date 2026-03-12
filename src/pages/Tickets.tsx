import React, { useState, useEffect } from 'react';
import { Filter, Search, Plus, Loader2, X } from 'lucide-react';
import { ORGANIZATION_UNITS } from '../data/organization';

const API_URL = "https://script.google.com/macros/s/AKfycbyyXOLhUEs7IaRtlAgq-S6On6KuUuaAGSkw-sG6IPLmFH1-YHPRT2ZvsNRcRbcUypHljg/exec";

// Fallback data if API returns empty or fails
const mockTickets = [
  { id: 'TKT-1049', date: '12 Mar 2026', unit: 'IT', category: 'Infrastruktur', priority: 'High', status: 'Dikerjakan', progress: 60, pic: 'Ahmad S.', description: 'Server Utama Down' },
  { id: 'TKT-1048', date: '11 Mar 2026', unit: 'Sarpras', category: 'Manajemen Gedung', priority: 'Medium', status: 'Direncanakan', progress: 40, pic: 'Budi W.', description: 'AC Bocor' },
];

const Tickets = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    unit: 'IT',
    category: ORGANIZATION_UNITS.IT.subProcess[0],
    priority: 'Medium',
    description: '',
    pic: ''
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      if (data && data.length > 0) {
        setTickets(data);
      } else {
        // If empty, show some fallback data to still look good
        setTickets([]);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      setTickets(mockTickets); // fallback
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'unit') {
      // Auto-update category when unit changes
      const unitKey = Object.keys(ORGANIZATION_UNITS).find(
        k => ORGANIZATION_UNITS[k as keyof typeof ORGANIZATION_UNITS].name === value
      );
      const newCategory = unitKey ? ORGANIZATION_UNITS[unitKey as keyof typeof ORGANIZATION_UNITS].subProcess[0] : '';
      setFormData(prev => ({ ...prev, unit: value, category: newCategory }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newTicket = {
      id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      unit: formData.unit,
      category: formData.category,
      priority: formData.priority,
      status: 'Diajukan',
      progress: 0,
      pic: formData.pic || 'Belum Ada',
      description: formData.description
    };

    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain",
        },
        body: JSON.stringify(newTicket)
      });
      // Refresh tickets
      await fetchTickets();
      setIsModalOpen(false);
      setFormData({ unit: 'IT', category: ORGANIZATION_UNITS.IT.subProcess[0], priority: 'Medium', description: '', pic: '' });
    } catch (error) {
      console.error("Error submitting ticket:", error);
      alert("Gagal menambahkan tiket. Cek koneksi Anda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentDisplayTickets = tickets.length > 0 ? tickets : mockTickets;

  return (
    <div className="animate-fade-in" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Manajemen Tiket & Work Order</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Pusat tracking dan distribusi pekerjaan terintegrasi Google Sheets</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Buat Tiket Baru
        </button>
      </div>

      <div className="glass-panel delay-100" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Cari ID Tiket / Deskripsi..." 
              style={{ 
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', 
                color: 'var(--text-primary)', padding: '0.5rem 1rem 0.5rem 2.2rem', 
                borderRadius: '8px', outline: 'none', width: '300px'
              }} 
            />
          </div>
          <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} /> Filter
          </button>
          {loading && <Loader2 size={16} className="animate-spin" color="var(--accent-blue)" />}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span className="badge" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-focus)' }}>Total ({tickets.length})</span>
          <span className="badge" style={{ background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)' }}>Live API</span>
        </div>
      </div>

      <div className="glass-panel delay-200 table-container">
        <table>
          <thead>
            <tr>
              <th>Nomor Tiket</th>
              <th>Tanggal</th>
              <th>Unit Tujuan</th>
              <th>Kategori</th>
              <th>Prioritas</th>
              <th>Progres & Status</th>
              <th>PIC</th>
            </tr>
          </thead>
          <tbody>
            {loading && tickets.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 1rem auto' }} />
                  Memuat data dari Google Sheets...
                </td>
              </tr>
            ) : currentDisplayTickets.map((ticket, i) => (
              <tr className="ticket-row" key={i}>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ticket.id}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{ticket.date}</td>
                <td>{ticket.unit}</td>
                <td>{ticket.category}</td>
                <td>
                  <span className={`badge ${ticket.priority === 'High' ? 'badge-danger' : ticket.priority === 'Medium' ? 'badge-warning' : 'badge-info'}`}>
                    {ticket.priority}
                  </span>
                </td>
                <td style={{ minWidth: '200px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{ticket.status}</span>
                      <span style={{ fontWeight: 600 }}>{ticket.progress}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${ticket.progress}%` }}></div>
                    </div>
                  </div>
                </td>
                <td>{ticket.pic}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Buat Tiket */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '500px', padding: '2rem', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Buat Tiket Baru</h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Unit Tujuan</label>
                  <select name="unit" value={formData.unit} onChange={handleInputChange} style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white' }}>
                    {Object.values(ORGANIZATION_UNITS).map(u => (
                      <option key={u.name} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Prioritas</label>
                  <select name="priority" value={formData.priority} onChange={handleInputChange} style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white' }}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Kategori Isu (Sub-bidang)</label>
                <select name="category" value={formData.category} onChange={handleInputChange} style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white' }}>
                  {Object.values(ORGANIZATION_UNITS)
                    .find(u => u.name === formData.unit)
                    ?.subProcess.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nama PIC (Opsional)</label>
                <input type="text" name="pic" value={formData.pic} onChange={handleInputChange} placeholder="Nama pelapor/PIC" style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Deskripsi Kendala *</label>
                <textarea required name="description" value={formData.description} onChange={handleInputChange} rows={3} placeholder="Ceritakan detail kendala atau kebutuhan" style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white', resize: 'vertical' }}></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : 'Kirim Tiket'}
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

export default Tickets;
