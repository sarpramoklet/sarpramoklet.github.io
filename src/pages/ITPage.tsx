import React, { useState, useEffect } from 'react';
import { Server, Wifi, Shield, Edit2, Trash2, X, Activity, Smartphone, Loader2, DatabaseBackup, TrendingUp } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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

// Format tanggal ke dd-mm-yy (dari berbagai format: ISO, "31 Mar 2026", dsb.)
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const s = dateStr.trim();
  // ISO format: 2026-03-30T17:00:00.000Z atau 2026-03-30
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      return `${dd}-${mm}-${yy}`;
    }
  }
  // Format: "31 Mar 2026" atau "31 Mar 26"
  const parts = s.split(' ');
  if (parts.length >= 3) {
    const dd = String(parseInt(parts[0])).padStart(2, '0');
    const mm = String((monthMap[parts[1]] ?? 0) + 1).padStart(2, '0');
    const year = parts[2].length === 2 ? parts[2] : String(parseInt(parts[2])).slice(-2);
    return `${dd}-${mm}-${year}`;
  }
  return s;
};

// Helper Components
const ISPNode = ({ name, rx, tx, active, type }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
    <div className={`badge ${active || type === 'astinet' ? 'badge-success' : ''}`} style={{ 
      padding: '0.5rem 1rem', 
      borderRadius: '8px', 
      background: active ? '#22c55e' : (type === 'astinet' ? 'white' : '#e5e7eb'), 
      color: type === 'astinet' ? 'black' : 'white',
      fontWeight: 700,
      fontSize: '0.75rem',
      boxShadow: active ? '0 4px 12px rgba(34, 197, 94, 0.3)' : 'none'
    }}>
      {name}
    </div>
    <div className="glass-panel" style={{ padding: '0.4rem 0.6rem', fontSize: '0.65rem', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
      <div>Rx: {rx} Mbps</div>
      <div>Tx: {tx} Mbps</div>
    </div>
  </div>
);

const ServerNode = ({ name, cpu, mem, disk, virt, urgent }: any) => (
  <div className="glass-panel" style={{ 
    padding: '1rem', 
    width: '200px', 
    textAlign: 'center', 
    border: urgent ? '2px solid var(--accent-rose)' : '1px solid var(--border-subtle)',
    background: urgent ? 'var(--accent-rose-ghost)' : 'linear-gradient(to bottom, rgba(34, 197, 94, 0.1), transparent)'
  }}>
    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
      <Server size={14} color={urgent ? 'var(--accent-rose)' : 'var(--accent-emerald)'} /> {name}
    </div>
    <div style={{ fontSize: '0.7rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
      <span>cpu: <b style={{ color: parseInt(cpu) > 70 ? 'var(--accent-rose)' : 'inherit' }}>{cpu}%</b></span>
      <span>mem: {mem}%</span>
      {virt && <span>virt: {virt}%</span>}
      <span>disk: {disk}%</span>
    </div>
  </div>
);

const GroupTitle = ({ title }: any) => (
  <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.25rem', marginTop: '0.5rem' }}>
    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase' }}>{title}</span>
  </div>
);

const NetInput = ({ label, name, onChange }: any) => (
  <div>
    <label style={{ fontSize: '0.7rem', display: 'block', marginBottom: '0.25rem' }}>{label}</label>
    <input 
      type="text" 
      placeholder="0.0" 
      style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }}
      onChange={e => onChange((prev: any) => ({ ...prev, [name]: e.target.value }))}
    />
  </div>
);

const ONT_LIST = [
  { key: 'i1', label: 'Indibizz 1', color: '#3b82f6' },
  { key: 'i2', label: 'Indibizz 2', color: '#8b5cf6' },
  { key: 'i3', label: 'Indibizz 3', color: '#f59e0b' },
  { key: 'i4', label: 'Indibizz 4', color: '#10b981' },
  { key: 'i5', label: 'Indibizz 5', color: '#ec4899' },
  { key: 'ast', label: 'Astinet',    color: '#f97316' },
];

const ITPage = () => {
  const [deviceData, setDeviceData] = useState<any[]>([]);
  const [netData, setNetData] = useState<any>(null);
  const [netHistory, setNetHistory] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [netLoading, setNetLoading] = useState(false);
  const [trafficView, setTrafficView] = useState<'rx'|'tx'>('rx');
  
  const [isNetFormOpen, setIsNetFormOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    date: '',
    count: '',
    overloads: '',
    note: ''
  });

  const [netFormData, setNetFormData] = useState({
    date: '',
    i1_rx: '', i1_tx: '',
    i2_rx: '', i2_tx: '',
    i3_rx: '', i3_tx: '',
    i4_rx: '', i4_tx: '',
    i5_rx: '', i5_tx: '',
    ast_rx: '', ast_tx: '',
    dhcp_cpu: '', dhcp_mem: '', dhcp_disk: '',
    sang_cpu: '', sang_mem: '', sang_virt: '', sang_disk: ''
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
            date: formatDate(dateStr),
            count: parseInt(item.count || item.Count || 0),
            overloads: parseInt(item.overloads || item.Overloads || 0),
            note: item.note || item.Note || "",
            isPreview: false
          };
        });
        
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
        setDeviceData(initialDeviceData.map(d => ({ ...d, isPreview: true })));
      }
    } catch (e) {
      setDeviceData(initialDeviceData.map(d => ({ ...d, isPreview: true })));
    } finally {
      setLoading(false);
    }
  };

  const fetchNetData = async () => {
    setNetLoading(true);
    try {
      const resp = await fetch(`${API_URL}?sheetName=Monitor_Net`);
      const data = await resp.json();
      if (data && Array.isArray(data) && data.length > 0) {
        // Ambil semua record untuk histori
        const mapped = data
          .filter((d: any) => d.id || d.ID)
          .map((d: any) => ({
            id: d.id || d.ID,
            tanggal: formatDate(String(d.tanggal || d.Tanggal || '')),
            i1_rx: parseFloat(d.i1_rx || 0), i1_tx: parseFloat(d.i1_tx || 0),
            i2_rx: parseFloat(d.i2_rx || 0), i2_tx: parseFloat(d.i2_tx || 0),
            i3_rx: parseFloat(d.i3_rx || 0), i3_tx: parseFloat(d.i3_tx || 0),
            i4_rx: parseFloat(d.i4_rx || 0), i4_tx: parseFloat(d.i4_tx || 0),
            i5_rx: parseFloat(d.i5_rx || 0), i5_tx: parseFloat(d.i5_tx || 0),
            ast_rx: parseFloat(d.ast_rx || 0), ast_tx: parseFloat(d.ast_tx || 0),
            dhcp_cpu: d.dhcp_cpu, dhcp_mem: d.dhcp_mem, dhcp_disk: d.dhcp_disk,
            sang_cpu: d.sang_cpu, sang_mem: d.sang_mem, sang_virt: d.sang_virt, sang_disk: d.sang_disk,
          }));
        setNetHistory(mapped);
        setNetData(mapped[mapped.length - 1]);
      }
    } catch (e) {
      console.log('Error fetching net monitor', e);
    } finally {
      setNetLoading(false);
    }
  };

  const handleDeleteTraffic = async (id: any) => {
    if (!window.confirm('Hapus record traffic ini?')) return;
    setNetHistory(prev => prev.filter(d => d.id !== id));
    try {
      await fetch(API_URL, {
        method: 'POST', mode: 'no-cors',
        body: JSON.stringify({ action: 'DELETE_RECORD', sheetName: 'Monitor_Net', id })
      });
    } catch (e) { fetchNetData(); }
  };

  const handleSeedNetToDB = async () => {
    if (!window.confirm("Kirim data contoh jaringan dari gambar ke DB? (Hanya klik sekali)")) return;
    setNetLoading(true);
    try {
      const sampleItem = {
        action: 'FINANCE_RECORD',
        sheetName: 'Monitor_Net',
        id: `NET-SAMPLE`,
        tanggal: 'Senin, 06 Apr 2026',
        i1_rx: '366', i1_tx: '21.8',
        i2_rx: '253', i2_tx: '15.4',
        i3_rx: '270', i3_tx: '18.7',
        i4_rx: '101', i4_tx: '14.3',
        i5_rx: '130', i5_tx: '5.44',
        ast_rx: '28.9', ast_tx: '1.21',
        dhcp_cpu: '12', dhcp_mem: '2', dhcp_disk: '18',
        sang_cpu: '80', sang_mem: '48', sang_virt: '48', sang_disk: '45'
      };
      await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(sampleItem) });
      alert('Berhasil seed data contoh jaringan!');
      fetchNetData();
    } catch (e) {
      alert('Gagal seed');
    } finally {
      setNetLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchNetData();
  }, []);

  useEffect(() => {
    if (window.location.hash === '#net') {
      setTimeout(() => {
        document.getElementById('net')?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  }, []);

  const handleSyncPreviewToDB = async () => {
    if (!window.confirm("Kirim data PREVIEW ini ke Cloud Spreadsheet sekarang?")) return;
    setLoading(true);
    try {
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
      alert('Sinkronisasi Berhasil!');
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
    if (!window.confirm('Hapus data monitoring harian ini?')) return;
    setDeviceData(prev => prev.filter(d => d.id !== id));
    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({
          action: 'DELETE_RECORD',
          sheetName: 'Monitor_Wifi',
          id: id
        })
      });
    } catch (e) {
      fetchData();
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
      note: formData.note,
      isPreview: false
    };

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
        body: JSON.stringify({
          action: 'FINANCE_RECORD',
          sheetName: 'Monitor_Wifi',
          id: newId,
          tanggal: formData.date,
          count: formData.count,
          overloads: formData.overloads,
          note: formData.note
        })
      });
    } catch(e) {
      fetchData();
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const cleanLabel = label.replace(/\s+2026|\s+26/g, '');
      return (
        <div className="glass-panel" style={{ padding: '10px 15px', border: '1px solid var(--accent-blue)', borderRadius: '8px' }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{cleanLabel}</p>
          <p style={{ margin: 0, color: 'var(--accent-blue)', fontSize: '1.2rem', fontWeight: 600 }}>
            {payload[0].value} <span style={{ fontSize: '0.8rem' }}>Perangkat</span>
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
        <div className="glass-panel stat-card">
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

        <div className="glass-panel stat-card">
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

        <div className="glass-panel stat-card">
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

      {/* WIFI MONITOR SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '3rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Smartphone color="var(--accent-blue)" /> Pemantauan Trend Perangkat (WiFi Client)
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {deviceData.some(d => d.isPreview) && !loading && (
            <button onClick={handleSyncPreviewToDB} className="btn" style={{ background: 'var(--accent-emerald)', color: 'white', fontSize: '0.75rem' }}>
              <DatabaseBackup size={14} /> Sinkronkan Preview ke DB
            </button>
          )}
          {loading && <Loader2 size={16} className="animate-spin" />}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', height: '350px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={deviceData}>
              <XAxis dataKey="date" tickFormatter={(val) => val.replace(/\s+2026|\s+26/g, '')} />
              <YAxis domain={['dataMin - 50', 'dataMax + 50']} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" stroke="var(--accent-blue)" fill="var(--accent-blue-ghost)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem' }} className="grid-responsive">
          <div className="glass-panel" style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left' }}>
               <thead>
                 <tr>
                    <th style={{ padding: '1rem' }}>Tanggal</th>
                    <th style={{ padding: '1rem' }}>Client</th>
                    <th style={{ padding: '1rem' }}>Overload</th>
                    <th style={{ padding: '1rem' }}>Catatan</th>
                    <th style={{ padding: '1rem' }}>Aksi</th>
                 </tr>
               </thead>
               <tbody>
                  {deviceData.map((item) => (
                    <tr key={item.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '1rem' }}>{item.date} {item.isPreview && <small style={{ color: 'var(--accent-amber)' }}>(PREVIEW)</small>}</td>
                      <td style={{ padding: '1rem' }}>{item.count}</td>
                      <td style={{ padding: '1rem' }}>{item.overloads}</td>
                      <td style={{ padding: '1rem', fontSize: '0.8rem' }}>{item.note}</td>
                      <td style={{ padding: '1rem' }}>
                        <button onClick={() => handleEdit(item)}><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
               </tbody>
            </table>
          </div>

          <div id="crud-form" className="glass-panel" style={{ padding: '1.5rem' }}>
             <h3 style={{ marginBottom: '1rem' }}>{isEditing ? 'Edit Data' : 'Tambah Data'}</h3>
             <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input className="input-field" name="date" value={formData.date} onChange={handleInputChange} placeholder="Tanggal" required />
                <input className="input-field" name="count" value={formData.count} onChange={handleInputChange} placeholder="Total Client" type="number" required />
                <input className="input-field" name="overloads" value={formData.overloads} onChange={handleInputChange} placeholder="Overload" type="number" />
                <input className="input-field" name="note" value={formData.note} onChange={handleInputChange} placeholder="Catatan" />
                <button type="submit" className="btn" style={{ background: 'var(--accent-blue)', color: 'white' }}>Simpan</button>
             </form>
          </div>
        </div>
      </div>

      {/* NETWORK SECTION */}
      <div id="net" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Activity color="var(--accent-emerald)" /> Monitoring Infrastruktur & Bandwidth
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!netData && !netLoading && (
            <button onClick={handleSeedNetToDB} className="btn" style={{ background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)', fontSize: '0.75rem' }}>
              <DatabaseBackup size={14} /> Seed Data Gambar
            </button>
          )}
          <button onClick={() => setIsNetFormOpen(true)} className="btn btn-outline" style={{ fontSize: '0.75rem' }}>
            Update Status Harian
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', minHeight: '300px', position: 'relative' }}>
         <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Status Update: </span>
            <span style={{ fontWeight: 600 }}>{netData?.tanggal || 'Senin, 06 Apr 2026 (Sample)'}</span>
         </div>
         
         <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <ISPNode name="Indibizz 5" rx={netData?.i5_rx || "130"} tx={netData?.i5_tx || "5.44"} active />
                <ISPNode name="Indibizz 4" rx={netData?.i4_rx || "101"} tx={netData?.i4_tx || "14.3"} active />
              </div>
              <ServerNode name="DHCP Server" cpu={netData?.dhcp_cpu || "12"} mem={netData?.dhcp_mem || "2"} disk={netData?.dhcp_disk || "18"} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <ISPNode name="Indibizz 1" rx={netData?.i1_rx || "366"} tx={netData?.i1_tx || "21.8"} />
                <ISPNode name="Indibizz 2" rx={netData?.i2_rx || "253"} tx={netData?.i2_tx || "15.4"} />
                <ISPNode name="Indibizz 3" rx={netData?.i3_rx || "270"} tx={netData?.i3_tx || "18.7"} />
              </div>
              <ServerNode name="SANGFOR" cpu={netData?.sang_cpu || "80"} mem={netData?.sang_mem || "48"} disk={netData?.sang_disk || "45"} virt={netData?.sang_virt || "48"} urgent={parseInt(netData?.sang_cpu || "0") > 75} />
            </div>

            <ISPNode name="Astinet" rx={netData?.ast_rx || "28.9"} tx={netData?.ast_tx || "1.21"} type="astinet" />
         </div>
      </div>

      {/* ===== TRAFFIC PER ONT HISTORY ===== */}
      <div style={{ marginTop: '3rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <TrendingUp color="var(--accent-amber)" /> Histori Traffic per ONT
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setTrafficView('rx')}
            className="btn"
            style={{ fontSize: '0.75rem', background: trafficView === 'rx' ? 'var(--accent-blue)' : 'transparent', color: trafficView === 'rx' ? 'white' : 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
          >↓ Rx (Download)</button>
          <button
            onClick={() => setTrafficView('tx')}
            className="btn"
            style={{ fontSize: '0.75rem', background: trafficView === 'tx' ? 'var(--accent-rose)' : 'transparent', color: trafficView === 'tx' ? 'white' : 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
          >↑ Tx (Upload)</button>
          {netLoading && <Loader2 size={16} className="animate-spin" />}
        </div>
      </div>

      {/* Chart Tren */}
      {netHistory.length > 0 ? (
        <div className="glass-panel" style={{ padding: '1.5rem', height: '320px', marginBottom: '1.5rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={netHistory} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <XAxis dataKey="tanggal" tick={{ fontSize: '0.65rem' }} />
              <YAxis unit=" Mbps" tick={{ fontSize: '0.7rem' }} />
              <Tooltip
                contentStyle={{ background: 'rgba(15,20,40,0.95)', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontSize: '0.75rem' }}
                formatter={(val: any, name: any) => [`${val} Mbps`, String(name).replace('_rx','').replace('_tx','').replace(/^i(\d)/,'Indibizz $1').replace(/^ast$/,'Astinet')]}
              />
              <Legend wrapperStyle={{ fontSize: '0.7rem' }} formatter={(v) => v.replace('_rx',' Rx').replace('_tx',' Tx').replace(/^i(\d)/,'Indibizz $1').replace('ast','Astinet')} />
              {ONT_LIST.map(ont => (
                <Line
                  key={ont.key}
                  type="monotone"
                  dataKey={`${ont.key}_${trafficView}`}
                  name={`${ont.key}_${trafficView}`}
                  stroke={ont.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          <TrendingUp size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p style={{ margin: 0 }}>Belum ada data histori. Klik <b>Update Status Harian</b> untuk mulai merekam.</p>
        </div>
      )}

      {/* Tabel Histori */}
      {netHistory.length > 0 && (
        <div className="glass-panel" style={{ overflow: 'auto', marginBottom: '2rem' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.78rem', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TANGGAL</th>
                {ONT_LIST.map(ont => (
                  <th key={ont.key} style={{ padding: '0.75rem 0.5rem', color: ont.color, fontWeight: 600, textAlign: 'center' }}>{ont.label}</th>
                ))}
                <th style={{ padding: '0.75rem 1rem' }}></th>
              </tr>
              <tr style={{ borderBottom: '2px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)' }}>
                <td style={{ padding: '0.4rem 1rem', fontSize: '0.65rem', color: 'var(--text-secondary)' }}></td>
                {ONT_LIST.map(ont => (
                  <td key={ont.key} style={{ padding: '0.4rem 0.5rem', textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: '#60a5fa' }}>↓Rx</span> / <span style={{ color: '#f87171' }}>↑Tx</span> (Mbps)
                  </td>
                ))}
                <td></td>
              </tr>
            </thead>
            <tbody>
              {[...netHistory].reverse().map((row) => (
                <tr key={row.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.tanggal}</td>
                  {ONT_LIST.map(ont => (
                    <td key={ont.key} style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                      <span style={{ color: '#60a5fa', fontWeight: 600 }}>{row[`${ont.key}_rx`]}</span>
                      <span style={{ color: 'var(--text-secondary)', margin: '0 3px' }}>/</span>
                      <span style={{ color: '#f87171' }}>{row[`${ont.key}_tx`]}</span>
                    </td>
                  ))}
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <button onClick={() => handleDeleteTraffic(row.id)} title="Hapus" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-rose)', opacity: 0.6 }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isNetFormOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3>Update Status Network Harian</h3>
              <button onClick={() => setIsNetFormOpen(false)}><X /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setNetLoading(true);
              try {
                await fetch(API_URL, {
                  method: 'POST',
                  mode: 'no-cors',
                  body: JSON.stringify({
                    action: 'FINANCE_RECORD',
                    sheetName: 'Monitor_Net',
                    id: `NET-${Date.now()}`,
                    tanggal: netFormData.date || 'Update Hari ini',
                    ...netFormData
                  })
                });
                alert('Berhasil Update!');
                setIsNetFormOpen(false);
                fetchNetData();
              } catch (err) { alert('Gagal'); }
              finally { setNetLoading(false); }
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                <input className="input-field" style={{ gridColumn: '1 / -1' }} placeholder="Tanggal (Contoh: Senin, 06 Apr 2026)" onChange={e => setNetFormData({...netFormData, date: e.target.value})} />
                <GroupTitle title="Indibizz 1" /><NetInput label="Rx" name="i1_rx" onChange={setNetFormData} /><NetInput label="Tx" name="i1_tx" onChange={setNetFormData} />
                <GroupTitle title="Indibizz 2" /><NetInput label="Rx" name="i2_rx" onChange={setNetFormData} /><NetInput label="Tx" name="i2_tx" onChange={setNetFormData} />
                <GroupTitle title="Indibizz 3" /><NetInput label="Rx" name="i3_rx" onChange={setNetFormData} /><NetInput label="Tx" name="i3_tx" onChange={setNetFormData} />
                <GroupTitle title="Indibizz 4" /><NetInput label="Rx" name="i4_rx" onChange={setNetFormData} /><NetInput label="Tx" name="i4_tx" onChange={setNetFormData} />
                <GroupTitle title="Indibizz 5" /><NetInput label="Rx" name="i5_rx" onChange={setNetFormData} /><NetInput label="Tx" name="i5_tx" onChange={setNetFormData} />
                <GroupTitle title="Astinet" /><NetInput label="Rx" name="ast_rx" onChange={setNetFormData} /><NetInput label="Tx" name="ast_tx" onChange={setNetFormData} />
                <GroupTitle title="Server Health" />
                <NetInput label="DHCP CPU" name="dhcp_cpu" onChange={setNetFormData} />
                <NetInput label="DHCP MEM" name="dhcp_mem" onChange={setNetFormData} />
                <NetInput label="SANG CPU" name="sang_cpu" onChange={setNetFormData} />
                <NetInput label="SANG MEM" name="sang_mem" onChange={setNetFormData} />
              </div>
              <button type="submit" className="btn" style={{ background: 'var(--accent-emerald)', color: 'white', width: '100%', marginTop: '2rem' }}>Simpan Update</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ITPage;
