import React, { useState, useEffect } from 'react';
import { Server, Wifi, Shield, Database, TriangleAlert, Edit2, Trash2, Plus, Save, X, Activity, Smartphone, Loader2, DatabaseBackup } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";

const initialDeviceData = [
  { id: 1, date: '31 Mar 2026', count: 1529, overloads: 13, note: '1.529 Client (13 Ruang Overload) - Hari Awal' },
  { id: 2, date: '1 Apr 2026', count: 1402, overloads: 10, note: '1.402 Client (10 Ruang Overload) - Bertahap Turun' },
  { id: 3, date: '2 Apr 2026', count: 1371, overloads: 7, note: '1.371 Client (7 Ruang Overload) - Area R.11 - R.20 Sangat Stabil' },
  { id: 4, date: '6 Apr 2026', count: 1359, overloads: 4, note: '1.359 Client (4 Ruang Overload) - Rekor Terendah! Sisa 4 Titik Kritis (R.7, R.23, R.37, R.1)' }
];

const monthMap: any = { 
  'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5, 
  'Jul': 6, 'Agt': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11 
};

const ITPage = () => {
  const [deviceData, setDeviceData] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    date: '',
    count: '',
    overloads: '',
    note: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}?sheetName=Monitor_Wifi`);
      const data = await resp.json();
      if (data && Array.isArray(data) && data.length > 0) {
        const mapped = data.filter((d:any) => (d.id || d.ID) && (d.tanggal || d.Tanggal)).map((item:any) => {
          let dateStr = String(item.tanggal || item.Tanggal || '').trim();
          
          return {
            id: item.id || item.ID,
            date: dateStr,
            count: parseInt(item.count || item.Count || 0),
            overloads: parseInt(item.overloads || item.Overloads || 0),
            note: item.note || item.Note || "",
            isPreview: false
          };
        });
        
        // Sorting Berdasarkan Tanggal
        mapped.sort((a, b) => {
          const parseDate = (s: string) => {
            const p = s.split(' ');
            const d = parseInt(p[0]) || 1;
            const m = monthMap[p[1]] || 0;
            const y = p[2] ? (p[2].length === 2 ? 2000 + parseInt(p[2]) : parseInt(p[2])) : 2026;
            return new Date(y, m, d).getTime();
          };
          return parseDate(a.date) - parseDate(b.date);
        });

        setDeviceData(mapped);
      } else {
        // Tampilkan Initial Data sebagai PREVIEW jika DB Kosong
        setDeviceData(initialDeviceData.map(d => ({ ...d, isPreview: true })));
      }
    } catch (e) {
      console.log('Error fetching wifi monitor', e);
      setDeviceData(initialDeviceData.map(d => ({ ...d, isPreview: true })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSyncPreviewToDB = async () => {
    if (!window.confirm("Kirim data PREVIEW ini ke Cloud Spreadsheet sekarang?")) return;
    setLoading(true);
    try {
      // Loop hanya data yang isPreview: true
      const previews = deviceData.filter(d => d.isPreview);
      for (const item of previews) {
        await fetch(API_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({
            action: 'FINANCE_RECORD',
            sheetName: 'Monitor_Wifi',
            sheet: 'Monitor_Wifi',
            id: `WIFI-${item.id}`,
            ID: `WIFI-${item.id}`,
            tanggal: item.date,
            Tanggal: item.date,
            count: item.count.toString(),
            Count: item.count.toString(),
            overloads: item.overloads.toString(),
            Overloads: item.overloads.toString(),
            note: item.note,
            Note: item.note
          })
        });
      }
      alert('Sinkronisasi Berhasil! Data preview telah dimasukkan ke DB.');
      setTimeout(fetchData, 1000);
    } catch (e) {
      alert('Gagal sinkronisasi');
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleEdit = (item: any) => {
    setIsEditing(true);
    setCurrentId(item.id);
    setFormData({
      date: item.date,
      count: item.count.toString(),
      overloads: item.overloads.toString(),
      note: item.note
    });
    document.getElementById('crud-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDelete = async (id: any) => {
    if (!window.confirm('Hapus data monitoring harian ini dari Cloud Database?')) return;
    
    setDeviceData(prev => prev.filter(d => d.id !== id)); // Optimistic UI
    
    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: 'DELETE_RECORD',
          sheetName: 'Monitor_Wifi',
          sheet: 'Monitor_Wifi',
          id: id,
          ID: id
        })
      });
    } catch (e) {
      alert("Hapus ke Cloud gagal.");
      fetchData(); // Rollback
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({ date: '', count: '', overloads: '', note: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.count) return;
    
    const newId = (isEditing && currentId !== null) ? currentId : `WIFI-${Date.now()}`;
    const newItem = {
      id: newId,
      date: formData.date,
      count: parseInt(formData.count),
      overloads: parseInt(formData.overloads) || 0,
      note: formData.note
    };

    // Optimistic Update
    if (isEditing) {
      setDeviceData(prev => prev.map(d => d.id === newId ? newItem : d));
    } else {
      setDeviceData(prev => [...prev, newItem]);
    }
    resetForm();

    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: 'FINANCE_RECORD',
          sheetName: 'Monitor_Wifi',
          sheet: 'Monitor_Wifi',
          id: newId,
          ID: newId,
          tanggal: formData.date,
          Tanggal: formData.date,
          count: formData.count,
          Count: formData.count,
          overloads: formData.overloads,
          Overloads: formData.overloads,
          note: formData.note,
          Note: formData.note
        })
      });
    } catch(e) {
      alert("Gagal simpan ke DB");
      fetchData(); // Rollback
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const cleanLabel = label.replace(/\s+2026|\s+26/g, '');
      return (
        <div className="glass-panel" style={{ padding: '10px 15px', border: '1px solid var(--accent-blue)', borderRadius: '8px' }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: 'var(--text-primary)' }}>{cleanLabel}</p>
          <p style={{ margin: 0, color: 'var(--accent-blue)', fontSize: '1.2rem', fontWeight: 600 }}>
            {payload[0].value} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Perangkat</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-row-responsive" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">IT Services Dashboard</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Pemantauan Infrastruktur, Jaringan, dan Keamanan / PDP</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="glass-panel stat-card delay-100">
          <div className="stat-header">
            <span className="stat-title">Uptime Jaringan</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-emerald-ghost)', color: 'var(--accent-emerald)' }}>
              <Wifi size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value">99.8%</div>
            <div className="stat-trend trend-up">Target: 99.5%</div>
          </div>
        </div>

        <div className="glass-panel stat-card delay-200">
          <div className="stat-header">
            <span className="stat-title">Tiket Baru</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)' }}>
              <Server size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value">12</div>
            <div className="stat-trend trend-down">3 Kritis</div>
          </div>
        </div>

        <div className="glass-panel stat-card delay-300">
          <div className="stat-header">
            <span className="stat-title">Insiden Keamanan</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-rose-ghost)', color: 'var(--accent-rose)' }}>
              <Shield size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value">0</div>
            <div className="stat-trend trend-up">Clear (30 Hari)</div>
          </div>
        </div>
      </div>

      {/* DEVICE MONITORING SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '3rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Smartphone color="var(--accent-blue)" /> Pemantauan Trend Perangkat (WiFi Client)
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {deviceData.some(d => d.isPreview) && !loading && (
            <button onClick={handleSyncPreviewToDB} className="btn" style={{ background: 'var(--accent-emerald)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
              <DatabaseBackup size={14} /> Sinkronkan Preview ke DB
            </button>
          )}
          {loading && <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}><Loader2 size={16} className="animate-spin" /> Sinkronisasi DB...</span>}
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* CHART ROW */}
        <div className="glass-panel" style={{ padding: '1.5rem', width: '100%', height: '350px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={16} /> Grafik Total Client Harian (Cloud Sync)
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            {deviceData.length > 0 ? (
              <AreaChart data={deviceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  stroke="var(--text-muted)" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => val.replace(/\s+2026|\s+26/g, '')}
                />
                <YAxis domain={['dataMin - 50', 'dataMax + 50']} stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" stroke="var(--accent-blue)" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--accent-blue)' }} />
              </AreaChart>
            ) : (
               <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                 {loading ? 'Mengambil data dari Cloud...' : 'Belum ada data visualisasi. Tambahkan data!'}
               </div>
            )}
          </ResponsiveContainer>
        </div>

        {/* CRUD & TABLE ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '1.5rem' }} className="grid-responsive">
          
          {/* Table */}
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Data Rekapitulasi Harian</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>Tanggal</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>Total Client</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>Ruang &gt; 50</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>Catatan</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {deviceData.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.2s ease', background: item.isPreview ? 'rgba(245, 158, 11, 0.05)' : (currentId === item.id ? 'var(--accent-blue-ghost)' : 'transparent') }}>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>
                        {item.date} 
                        {item.isPreview && <span style={{ marginLeft: '8px', fontSize: '10px', color: 'var(--accent-amber)', fontWeight: 700 }}> (PREVIEW)</span>}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--accent-blue)', fontWeight: 600 }}>{item.count}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span className={`badge ${item.overloads > 10 ? 'badge-danger' : item.overloads > 5 ? 'badge-warning' : 'badge-success'}`}>
                          {item.overloads} Ruang
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.note}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => handleEdit(item)} className="icon-btn" style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' }}>
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="icon-btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-rose)' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {deviceData.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data di Spreadsheet. Silakan Seed atau Tambah baru.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form */}
          <div id="crud-form" className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isEditing ? <Edit2 size={16} color="var(--accent-blue)" /> : <Plus size={16} color="var(--accent-emerald)" />}
                {isEditing ? 'Edit Data Harian' : 'Input Data Baru'}
              </h3>
              {isEditing && (
                <button type="button" onClick={resetForm} className="icon-btn" style={{ padding: '0.25rem', background: 'transparent' }}>
                  <X size={16} />
                </button>
              )}
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Tanggal (Contoh: 07 Apr)</label>
                <input 
                  type="text" 
                  name="date" 
                  value={formData.date} 
                  onChange={handleInputChange} 
                  required
                  placeholder="Mis: 08 Apr"
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Total Client</label>
                  <input 
                    type="number" 
                    name="count" 
                    value={formData.count} 
                    onChange={handleInputChange} 
                    required
                    placeholder="Mis: 1350"
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Ruang &gt;50</label>
                  <input 
                    type="number" 
                    name="overloads" 
                    value={formData.overloads} 
                    onChange={handleInputChange} 
                    placeholder="Mis: 4"
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Catatan Tambahan</label>
                <input 
                  type="text" 
                  name="note" 
                  value={formData.note} 
                  onChange={handleInputChange} 
                  placeholder="Catatan analisis..."
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)' }}
                />
              </div>

              <button 
                type="submit" 
                style={{ 
                  marginTop: '0.5rem',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '0.5rem', 
                  padding: '0.75rem', 
                  background: isEditing ? 'var(--accent-blue)' : 'var(--accent-emerald)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s ease'
                }}
              >
                <Save size={16} />
                {isEditing ? 'Simpan Perubahan' : 'Tambah Data'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="dashboard-grid delay-300" style={{ marginTop: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Status Sistem & Server</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {['E-Learning Moodle', 'SIAKAD', 'Database Keuangan', 'Web Profile Utama'].map((sys, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <Database size={16} color="var(--accent-blue)" />
                  <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{sys}</span>
                </div>
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Online</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TriangleAlert color="var(--accent-amber)" size={18} /> Peringatan Sistem
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1rem', borderLeft: '3px solid var(--accent-rose)', background: 'var(--accent-rose-ghost)', borderRadius: '0 8px 8px 0' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>Storage Server Backup Kritis</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Kapasitas storage backup harian mencapai 92% (Purge segera).</p>
            </div>
            <div style={{ padding: '1rem', borderLeft: '3px solid var(--accent-amber)', background: 'var(--accent-amber-ghost)', borderRadius: '0 8px 8px 0' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>SSL Kadaluarsa (14 Hari)</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Sertifikat SSL siakad.telkom.sch.id segera berakhir.</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ITPage;
