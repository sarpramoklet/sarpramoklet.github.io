import React, { useState, useEffect, useRef } from 'react';
import { Server, Wifi, Shield, Edit2, Trash2, X, Activity, Smartphone, Loader2, DatabaseBackup, TrendingUp, Upload, Sparkles, CheckCircle, AlertCircle, Image } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';

const API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";
// Dapatkan API key gratis di https://aistudio.google.com/apikey
const GEMINI_API_KEY = "AIzaSyC2j7PVLmqEYN0BdJJSiEXD2Qx9pqXw5Yk"; // Ganti dengan API key Anda

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

const NetInput = ({ label, name, onChange, value }: any) => (
  <div>
    <label style={{ fontSize: '0.7rem', display: 'block', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>{label}</label>
    <input 
      type="text"
      value={value ?? ''}
      placeholder="0.0" 
      style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }}
      onChange={e => onChange((prev: any) => ({ ...prev, [name]: e.target.value }))}
    />
  </div>
);

// Analisis gambar traffic via Gemini Vision
const analyzeTrafficImage = async (base64: string, mimeType: string): Promise<any> => {
  const prompt = `Kamu adalah sistem OCR untuk monitoring infrastruktur jaringan sekolah.
Analisis gambar ini yang menampilkan dashboard/topologi jaringan dengan ISP/ONT (Indibizz dan Astinet) dan server.
Ekstrak SEMUA nilai traffic yang terlihat di gambar.

Kembalikan HANYA JSON murni tanpa markdown, tanpa penjelasan:
{
  "tanggal": "jika ada tanggal di gambar, format dd-mm-yy, jika tidak ada isi string kosong",
  "i1_rx": "Rx Indibizz 1 dalam Mbps, angka saja tanpa satuan",
  "i1_tx": "Tx Indibizz 1",
  "i2_rx": "Rx Indibizz 2",
  "i2_tx": "Tx Indibizz 2",
  "i3_rx": "Rx Indibizz 3",
  "i3_tx": "Tx Indibizz 3",
  "i4_rx": "Rx Indibizz 4",
  "i4_tx": "Tx Indibizz 4",
  "i5_rx": "Rx Indibizz 5",
  "i5_tx": "Tx Indibizz 5",
  "ast_rx": "Rx Astinet",
  "ast_tx": "Tx Astinet",
  "dhcp_cpu": "CPU% DHCP Server, angka saja",
  "dhcp_mem": "MEM% DHCP Server",
  "dhcp_disk": "Disk% DHCP Server",
  "sang_cpu": "CPU% SANGFOR",
  "sang_mem": "MEM% SANGFOR",
  "sang_virt": "Virt% SANGFOR",
  "sang_disk": "Disk% SANGFOR"
}

Hanya kembalikan JSON. Jika nilai tidak terlihat, isi dengan string kosong "".`;

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: base64 } }
        ]}]
      })
    }
  );
  const result = await resp.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  // Bersihkan markdown code block jika ada
  const clean = text.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(clean);
};

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
  const [netFormTab, setNetFormTab] = useState<'upload'|'manual'>('upload');
  const [uploadImage, setUploadImage] = useState<string | null>(null);
  const [uploadMime, setUploadMime] = useState('image/png');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiError, setAiError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  
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
          // Parse dd-mm-yy format
          const parseDDMMYY = (s: string) => {
            const p = s.split('-');
            if (p.length === 3) {
              const dd = parseInt(p[0]) || 1;
              const mm = (parseInt(p[1]) || 1) - 1;
              const yy = parseInt(p[2]) || 0;
              const year = yy < 100 ? 2000 + yy : yy;
              return new Date(year, mm, dd).getTime();
            }
            return 0;
          };
          return parseDDMMYY(a.date) - parseDDMMYY(b.date);
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
    // format date dari yyyy-mm-dd (input type=date) ke dd-mm-yy
    const formattedDate = formatDate(formData.date);
    const sortFn = (a: any, b: any) => {
      const p = (s: string) => { const x = s.split('-'); return x.length===3 ? new Date(2000+(parseInt(x[2])||0), (parseInt(x[1])||1)-1, parseInt(x[0])||1).getTime() : 0; };
      return p(a.date) - p(b.date);
    };
    const newItem = {
      id: newId,
      date: formattedDate,
      count: parseInt(formData.count),
      overloads: parseInt(formData.overloads) || 0,
      note: formData.note,
      isPreview: false
    };

    if (isEditing) {
      setDeviceData(prev => [...prev.map(d => d.id === newId ? newItem : d)].sort(sortFn));
    } else {
      setDeviceData(prev => [...prev, newItem].sort(sortFn));
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
          tanggal: formattedDate,
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
      return (
        <div className="glass-panel" style={{ padding: '10px 15px', border: '1px solid var(--accent-blue)', borderRadius: '8px' }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', fontSize: '0.85rem' }}>{label}</p>
          <p style={{ margin: 0, color: 'var(--accent-blue)', fontSize: '1.2rem', fontWeight: 600 }}>
            {payload[0].value?.toLocaleString()} <span style={{ fontSize: '0.8rem' }}>Perangkat</span>
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
             <BarChart data={deviceData} margin={{ top: 24, right: 16, left: 0, bottom: 5 }} barCategoryGap="28%">
               <XAxis
                 dataKey="date"
                 tick={{ fontSize: '0.72rem', fill: 'var(--text-secondary)' }}
                 axisLine={{ stroke: 'var(--border-subtle)' }}
                 tickLine={false}
               />
               <YAxis
                 domain={[(dataMin: number) => Math.max(0, dataMin - 80), (dataMax: number) => dataMax + 80]}
                 tick={{ fontSize: '0.7rem', fill: 'var(--text-secondary)' }}
                 axisLine={false}
                 tickLine={false}
                 width={55}
               />
               <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
               <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={72}>
                 <LabelList
                   dataKey="count"
                   position="top"
                   style={{ fontSize: '0.72rem', fontWeight: 700, fill: 'var(--text-secondary)' }}
                 />
                 {(() => {
                   if (deviceData.length === 0) return null;
                   const counts = deviceData.map((d: any) => d.count);
                   const minVal = Math.min(...counts);
                   const maxVal = Math.max(...counts);
                   return deviceData.map((d: any, i: number) => {
                     let color = '#3b82f6'; // biru default
                     if (d.count === minVal) color = '#10b981'; // terendah = hijau (bagus!)
                     else if (d.count === maxVal) color = '#f43f5e'; // tertinggi = merah
                     else if (i > 0 && d.count < deviceData[i-1].count) color = '#34d399'; // turun = hijau muda
                     else if (i > 0 && d.count > deviceData[i-1].count) color = '#fb7185'; // naik = merah muda
                     return <Cell key={i} fill={color} fillOpacity={0.9} />;
                   });
                 })()}
               </Bar>
             </BarChart>
           </ResponsiveContainer>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem' }} className="grid-responsive">
          <div className="glass-panel" style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
               <thead>
                 <tr style={{ borderBottom: '2px solid var(--border-subtle)', background: 'rgba(0,0,0,0.15)' }}>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tanggal</th>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client</th>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overload</th>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Catatan</th>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aksi</th>
                 </tr>
               </thead>
               <tbody>
                  {[...deviceData].reverse().map((item) => {
                    const counts = deviceData.map((d:any) => d.count);
                    const minVal = Math.min(...counts);
                    const maxVal = Math.max(...counts);
                    const isLowest = item.count === minVal;
                    const isHighest = item.count === maxVal;
                    return (
                    <tr key={item.id} style={{ borderTop: '1px solid var(--border-subtle)', transition: 'background 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{item.date} {item.isPreview && <small style={{ color: 'var(--accent-amber)' }}>(PREVIEW)</small>}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          fontWeight: 700,
                          color: isLowest ? '#10b981' : isHighest ? '#f43f5e' : 'inherit',
                          fontSize: '1rem'
                        }}>{item.count.toLocaleString()}</span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
                          background: item.overloads === 0 ? 'rgba(16,185,129,0.15)' : item.overloads > 8 ? 'rgba(244,63,94,0.15)' : 'rgba(251,191,36,0.15)',
                          color: item.overloads === 0 ? '#10b981' : item.overloads > 8 ? '#f43f5e' : '#fbbf24'
                        }}>{item.overloads} ruang</span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.note}</td>
                      <td style={{ padding: '0.85rem 1rem', display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleEdit(item)} style={{ background: 'rgba(59,130,246,0.15)', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: 'var(--accent-blue)' }}><Edit2 size={13} /></button>
                        <button onClick={() => handleDelete(item.id)} style={{ background: 'rgba(244,63,94,0.15)', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: '#f43f5e' }}><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  )})}
               </tbody>
            </table>
          </div>

          <div id="crud-form" className="glass-panel" style={{ padding: '1.5rem' }}>
             <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>{isEditing ? '✏️ Edit Data' : '➕ Tambah Data'}</h3>
             <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', display: 'block', marginBottom: '0.3rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tanggal</label>
                  <input className="input-field" type="date" name="date"
                    value={formData.date}
                    onChange={e => {
                      // simpan raw yyyy-mm-dd dari input date, format saat display
                      setFormData({ ...formData, date: e.target.value });
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', display: 'block', marginBottom: '0.3rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Client</label>
                  <input className="input-field" name="count" value={formData.count} onChange={handleInputChange} placeholder="Contoh: 1359" type="number" required />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', display: 'block', marginBottom: '0.3rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ruang Overload</label>
                  <input className="input-field" name="overloads" value={formData.overloads} onChange={handleInputChange} placeholder="Contoh: 4" type="number" />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', display: 'block', marginBottom: '0.3rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Catatan</label>
                  <input className="input-field" name="note" value={formData.note} onChange={handleInputChange} placeholder="Keterangan singkat..." />
                </div>
                <button type="submit" className="btn" style={{ background: 'var(--accent-blue)', color: 'white', marginTop: '0.5rem' }}>Simpan</button>
                {isEditing && (
                  <button type="button" onClick={resetForm} className="btn" style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>Batal</button>
                )}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '900px', maxHeight: '92vh', overflow: 'auto', padding: '0' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface-glass)', backdropFilter: 'blur(20px)', zIndex: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Update Status Network Harian</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Upload screenshot traffic atau input manual</p>
              </div>
              <button onClick={() => { setIsNetFormOpen(false); setUploadImage(null); setAiResult(null); setAiError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}><X size={20} /></button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
              {(['upload', 'manual'] as const).map(tab => (
                <button key={tab} onClick={() => setNetFormTab(tab)} style={{
                  flex: 1, padding: '0.85rem', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                  background: netFormTab === tab ? 'rgba(59,130,246,0.1)' : 'transparent',
                  color: netFormTab === tab ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  borderBottom: netFormTab === tab ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  transition: 'all 0.2s'
                }}>
                  {tab === 'upload' ? '🤖  Upload & Analisis AI' : '✏️  Input Manual'}
                </button>
              ))}
            </div>

            <div style={{ padding: '2rem' }}>
              {/* === TAB UPLOAD === */}
              {netFormTab === 'upload' && (
                <div>
                  {/* Dropzone */}
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => {
                      e.preventDefault(); setDragOver(false);
                      const file = e.dataTransfer.files[0];
                      if (file && file.type.startsWith('image/')) {
                        setUploadMime(file.type);
                        const reader = new FileReader();
                        reader.onload = ev => { setUploadImage(ev.target?.result as string); setAiResult(null); setAiError(''); };
                        reader.readAsDataURL(file);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${dragOver ? 'var(--accent-blue)' : uploadImage ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`,
                      borderRadius: '12px',
                      padding: uploadImage ? '1rem' : '3rem 2rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: dragOver ? 'rgba(59,130,246,0.08)' : uploadImage ? 'rgba(16,185,129,0.05)' : 'rgba(0,0,0,0.1)',
                      transition: 'all 0.2s',
                      marginBottom: '1.5rem'
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadMime(file.type);
                          const reader = new FileReader();
                          reader.onload = ev => { setUploadImage(ev.target?.result as string); setAiResult(null); setAiError(''); };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    {uploadImage ? (
                      <div>
                        <img src={uploadImage} alt="preview" style={{ maxHeight: '280px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain' }} />
                        <p style={{ margin: '0.75rem 0 0', fontSize: '0.78rem', color: 'var(--accent-emerald)' }}>✓ Gambar siap dianalisis — klik untuk ganti</p>
                      </div>
                    ) : (
                      <div>
                        <Upload size={40} style={{ opacity: 0.4, marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
                        <p style={{ margin: 0, fontWeight: 600 }}>Drag & drop screenshot traffic di sini</p>
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>atau klik untuk pilih gambar • PNG, JPG, WebP</p>
                      </div>
                    )}
                  </div>

                  {/* Analyze Button */}
                  {uploadImage && !aiResult && (
                    <button
                      disabled={aiLoading}
                      onClick={async () => {
                        setAiLoading(true); setAiError('');
                        try {
                          const base64 = uploadImage.split(',')[1];
                          const extracted = await analyzeTrafficImage(base64, uploadMime);
                          setAiResult(extracted);
                          // Otomatis isi form manual juga
                          setNetFormData(prev => ({ ...prev, ...extracted, date: extracted.tanggal || prev.date }));
                        } catch (err: any) {
                          setAiError('Gagal menganalisis gambar. Pastikan API key Gemini sudah diset. ' + (err.message || ''));
                        } finally { setAiLoading(false); }
                      }}
                      className="btn"
                      style={{ width: '100%', padding: '0.9rem', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: 'white', fontWeight: 700, fontSize: '0.95rem', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}
                    >
                      {aiLoading ? <><Loader2 size={18} className="animate-spin" /> Menganalisis dengan AI...</> : <><Sparkles size={18} /> Analisis Otomatis dengan Gemini AI</>}
                    </button>
                  )}

                  {/* Error */}
                  {aiError && (
                    <div style={{ padding: '1rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <AlertCircle size={16} color="#f43f5e" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#f43f5e' }}>{aiError}</p>
                    </div>
                  )}

                  {/* Result Preview */}
                  {aiResult && (
                    <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <CheckCircle size={18} color="#10b981" />
                        <span style={{ fontWeight: 700, color: '#10b981' }}>Berhasil diekstrak oleh AI</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>Review & koreksi jika perlu di tab Manual</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.6rem' }}>
                        {aiResult.tanggal && (
                          <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>TANGGAL</div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{aiResult.tanggal}</div>
                          </div>
                        )}
                        {ONT_LIST.map(ont => (
                          <div key={ont.key} style={{ padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: `3px solid ${ont.color}` }}>
                            <div style={{ fontSize: '0.65rem', color: ont.color, marginBottom: '4px', fontWeight: 700 }}>{ont.label}</div>
                            <div style={{ fontSize: '0.82rem' }}>
                              <span style={{ color: '#60a5fa' }}>↓ {aiResult[`${ont.key}_rx`] || '--'} Mbps</span>
                              <span style={{ color: 'var(--text-secondary)', margin: '0 6px' }}>/</span>
                              <span style={{ color: '#f87171' }}>↑ {aiResult[`${ont.key}_tx`] || '--'} Mbps</span>
                            </div>
                          </div>
                        ))}
                        {(aiResult.dhcp_cpu || aiResult.sang_cpu) && (
                          <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', gridColumn: 'span 2' }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>SERVER HEALTH</div>
                            <div style={{ fontSize: '0.78rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                              {aiResult.dhcp_cpu && <span>DHCP cpu: <b>{aiResult.dhcp_cpu}%</b> mem: {aiResult.dhcp_mem}%</span>}
                              {aiResult.sang_cpu && <span>SANGFOR cpu: <b style={{ color: parseInt(aiResult.sang_cpu) > 75 ? '#f43f5e' : 'inherit' }}>{aiResult.sang_cpu}%</b> mem: {aiResult.sang_mem}%</span>}
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={async () => {
                          setNetLoading(true);
                          try {
                            const payload = { action: 'FINANCE_RECORD', sheetName: 'Monitor_Net', id: `NET-${Date.now()}`, tanggal: aiResult.tanggal || formatDate(new Date().toISOString()), ...aiResult };
                            await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
                            alert('✅ Data traffic berhasil disimpan!');
                            setIsNetFormOpen(false); setUploadImage(null); setAiResult(null);
                            fetchNetData();
                          } catch { alert('Gagal menyimpan.'); }
                          finally { setNetLoading(false); }
                        }}
                        className="btn"
                        style={{ width: '100%', marginTop: '1rem', background: '#10b981', color: 'white', fontWeight: 700, padding: '0.8rem', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      >
                        {netLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                        Simpan Data Hasil Analisis
                      </button>
                    </div>
                  )}

                  {!uploadImage && (
                    <div style={{ padding: '1.5rem', background: 'rgba(99,102,241,0.07)', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <Image size={16} color="#6366f1" />
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#6366f1' }}>Cara Kerja</span>
                      </div>
                      <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                        <li>Screenshot tampilan monitoring traffic Anda (MikroTik, WhatsApp Info, dll)</li>
                        <li>Upload gambar di sini (drag & drop atau klik)</li>
                        <li>AI <b style={{ color: '#6366f1' }}>Gemini</b> akan otomatis membaca dan mengekstrak nilai Rx/Tx tiap ONT + server health</li>
                        <li>Review hasil, lalu simpan sebagai record harian</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {/* === TAB MANUAL === */}
              {netFormTab === 'manual' && (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setNetLoading(true);
                  try {
                    const tanggal = netFormData.date ? formatDate(netFormData.date) : formatDate(new Date().toISOString());
                    await fetch(API_URL, {
                      method: 'POST', mode: 'no-cors',
                      body: JSON.stringify({ action: 'FINANCE_RECORD', sheetName: 'Monitor_Net', id: `NET-${Date.now()}`, tanggal, ...netFormData })
                    });
                    alert('Berhasil Update!');
                    setIsNetFormOpen(false); fetchNetData();
                  } catch { alert('Gagal'); }
                  finally { setNetLoading(false); }
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', display: 'block', marginBottom: '0.3rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Tanggal</label>
                      <input type="date" className="input-field" style={{ width: '100%' }} value={netFormData.date || ''} onChange={e => setNetFormData({...netFormData, date: e.target.value})} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.85rem' }}>
                    <GroupTitle title="Indibizz 1" />
                    <NetInput label="Rx (Mbps)" name="i1_rx" onChange={setNetFormData} value={netFormData.i1_rx} />
                    <NetInput label="Tx (Mbps)" name="i1_tx" onChange={setNetFormData} value={netFormData.i1_tx} />
                    <GroupTitle title="Indibizz 2" />
                    <NetInput label="Rx (Mbps)" name="i2_rx" onChange={setNetFormData} value={netFormData.i2_rx} />
                    <NetInput label="Tx (Mbps)" name="i2_tx" onChange={setNetFormData} value={netFormData.i2_tx} />
                    <GroupTitle title="Indibizz 3" />
                    <NetInput label="Rx (Mbps)" name="i3_rx" onChange={setNetFormData} value={netFormData.i3_rx} />
                    <NetInput label="Tx (Mbps)" name="i3_tx" onChange={setNetFormData} value={netFormData.i3_tx} />
                    <GroupTitle title="Indibizz 4" />
                    <NetInput label="Rx (Mbps)" name="i4_rx" onChange={setNetFormData} value={netFormData.i4_rx} />
                    <NetInput label="Tx (Mbps)" name="i4_tx" onChange={setNetFormData} value={netFormData.i4_tx} />
                    <GroupTitle title="Indibizz 5" />
                    <NetInput label="Rx (Mbps)" name="i5_rx" onChange={setNetFormData} value={netFormData.i5_rx} />
                    <NetInput label="Tx (Mbps)" name="i5_tx" onChange={setNetFormData} value={netFormData.i5_tx} />
                    <GroupTitle title="Astinet" />
                    <NetInput label="Rx (Mbps)" name="ast_rx" onChange={setNetFormData} value={netFormData.ast_rx} />
                    <NetInput label="Tx (Mbps)" name="ast_tx" onChange={setNetFormData} value={netFormData.ast_tx} />
                    <GroupTitle title="Server Health" />
                    <NetInput label="DHCP CPU %" name="dhcp_cpu" onChange={setNetFormData} value={netFormData.dhcp_cpu} />
                    <NetInput label="DHCP MEM %" name="dhcp_mem" onChange={setNetFormData} value={netFormData.dhcp_mem} />
                    <NetInput label="DHCP Disk %" name="dhcp_disk" onChange={setNetFormData} value={netFormData.dhcp_disk} />
                    <NetInput label="SANGFOR CPU %" name="sang_cpu" onChange={setNetFormData} value={netFormData.sang_cpu} />
                    <NetInput label="SANGFOR MEM %" name="sang_mem" onChange={setNetFormData} value={netFormData.sang_mem} />
                    <NetInput label="SANGFOR Virt %" name="sang_virt" onChange={setNetFormData} value={netFormData.sang_virt} />
                    <NetInput label="SANGFOR Disk %" name="sang_disk" onChange={setNetFormData} value={netFormData.sang_disk} />
                  </div>
                  <button type="submit" className="btn" style={{ background: 'var(--accent-emerald)', color: 'white', width: '100%', marginTop: '1.5rem', padding: '0.85rem', fontWeight: 700, borderRadius: '10px', border: 'none', cursor: 'pointer' }}
                  >{netLoading ? <Loader2 size={16} className="animate-spin" /> : 'Simpan Update'}</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ITPage;
