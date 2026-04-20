import React, { useState, useEffect, useRef } from 'react';
import { Server, Wifi, Shield, Edit2, Trash2, X, Activity, Smartphone, Loader2, DatabaseBackup, TrendingUp, Upload, Sparkles, CheckCircle, AlertCircle, Image, Camera } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import { getCurrentUser, ROLES } from '../data/organization';
import { requireGeminiApiKey } from '../utils/env';
import { generateGeminiJsonFromImage } from '../utils/gemini';

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
const monthList = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

// Format tanggal ke dd-mm-yy (dari berbagai format: ISO, "31 Mar 2026", "6-04-2026", dsb.)
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
  // Format "Hari Senin Tanggal 6-04-2026" → ekstrak bagian tanggal
  const tanggalMatch = s.match(/tanggal\s+(\d{1,2}[-/]\d{2}[-/]\d{4})/i);
  if (tanggalMatch) return formatDate(tanggalMatch[1]);
  // Format d-mm-yyyy atau d/mm/yyyy (misal: "6-04-2026", "1/04/2026")
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, '0');
    const mm = dmyMatch[2].padStart(2, '0');
    const yy = dmyMatch[3].slice(-2);
    return `${dd}-${mm}-${yy}`;
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

const getSystemDateInput = (): string => {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const toInputDate = (dateStr: string): string => {
  const norm = formatDate(dateStr);
  const p = norm.split('-');
  if (p.length === 3) return `20${p[2]}-${p[1]}-${p[0]}`;
  return getSystemDateInput();
};

const toDisplayDate = (dateStr: string): string => {
  const norm = formatDate(dateStr);
  const p = norm.split('-');
  if (p.length === 3) {
    const dd = String(parseInt(p[0], 10) || 0).padStart(2, '0');
    const mIdx = (parseInt(p[1], 10) || 1) - 1;
    const yy = String(parseInt(p[2], 10) || 0).padStart(2, '0');
    return `${dd} ${monthList[mIdx] || 'Jan'} ${yy}`;
  }
  return norm || '-';
};

const normalizeWifiDateFromDb = (raw: any): string => {
  const s = String(raw || '').trim();
  if (!s) return '';

  // Jika dari Sheet menjadi ISO, gunakan tanggal lokal apa adanya (tanpa tukar day/month).
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const dd = d.getDate();
      const mm = d.getMonth() + 1;
      const yy = d.getFullYear() % 100;
      return `${String(dd).padStart(2, '0')}-${String(mm).padStart(2, '0')}-${String(yy).padStart(2, '0')}`;
    }
  }

  return formatDate(s);
};

const toSheetWifiDate = (value: string): string => {
  const norm = formatDate(value || '');
  const p = norm.split('-');
  if (p.length === 3) {
    const dd = String(parseInt(p[0], 10) || 0).padStart(2, '0');
    const mIdx = (parseInt(p[1], 10) || 1) - 1;
    const yy = String(parseInt(p[2], 10) || 0).padStart(2, '0');
    return `${dd} ${monthList[mIdx] || 'Jan'} ${yy}`;
  }
  return value;
};

const isShortDate = (dateStr: string): boolean => /^\d{2}-\d{2}-\d{2}$/.test(dateStr);

const inferDateFromNetId = (id: any): string => {
  const m = String(id || '').match(/NET-(\d{2})(\d{2})(\d{2})$/);
  if (!m) return '';
  return `${m[1]}-${m[2]}-${m[3]}`;
};

const netIdFromDate = (dateStr: string): string => {
  const d = formatDate(dateStr);
  const p = d.split('-');
  if (p.length !== 3) return '';
  return `NET-${p[0]}${p[1]}${p[2]}`;
};

const inferLegacySeedDate = (row: any): string => {
  const n = (v: any) => {
    const x = parseFloat(String(v ?? '').replace(',', '.'));
    return Number.isFinite(x) ? x : 0;
  };
  const sig = [
    n(row?.i1_rx), n(row?.i1_tx),
    n(row?.i2_rx), n(row?.i2_tx),
    n(row?.i3_rx), n(row?.i3_tx),
    n(row?.i4_rx), n(row?.i4_tx),
    n(row?.i5_rx), n(row?.i5_tx),
    n(row?.ast_rx), n(row?.ast_tx)
  ].join('|');
  if (sig === '278|30.9|277|22.5|280|58.6|162|8.26|118|8.75|5.97|2.22') return '01-04-26';
  if (sig === '366|21.8|253|15.4|270|18.7|101|14.3|130|5.44|28.9|1.21') return '06-04-26';
  return '';
};

const normalizeDateForSave = (value: string): string => {
  const formatted = formatDate(value || '');
  if (isShortDate(formatted)) return formatted;
  return formatDate(getSystemDateInput());
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

// Bersihkan nilai hasil AI: hilangkan satuan, ambil angka saja
const cleanNum = (v: any): string => {
  if (v === null || v === undefined || v === '') return '';
  const s = String(v).replace(/[^0-9.]/g, '').trim();
  return s || '';
};

// Normalisasi semua field numerik dari hasil AI
const cleanAiResult = (raw: any): any => {
  const numFields = [
    'i1_rx','i1_tx','i2_rx','i2_tx','i3_rx','i3_tx',
    'i4_rx','i4_tx','i5_rx','i5_tx','ast_rx','ast_tx',
    'dhcp_cpu','dhcp_mem','dhcp_disk',
    'sang_cpu','sang_mem','sang_virt','sang_disk'
  ];
  const cleaned: any = { ...raw };
  numFields.forEach(f => { cleaned[f] = cleanNum(raw[f]); });
  // Normalisasi tanggal
  if (raw.tanggal) {
    cleaned.tanggal = formatDate(String(raw.tanggal));
    // formatDate kembalikan string kosong jika format tidak dikenal
    if (!cleaned.tanggal || cleaned.tanggal === raw.tanggal) {
      // Coba parse format lain: "Senin, 06 Apr 2026", "April 6, 2026", "6/4/2026" dll
      const d = new Date(raw.tanggal);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2,'0');
        const mm = String(d.getMonth()+1).padStart(2,'0');
        const yy = String(d.getFullYear()).slice(-2);
        cleaned.tanggal = `${dd}-${mm}-${yy}`;
      }
    }
  }
  return cleaned;
};

// Analisis gambar traffic via Gemini Vision
const analyzeTrafficImage = async (base64: string, mimeType: string): Promise<any> => {
  const prompt = `You are an OCR system reading a network infrastructure monitoring screenshot from an Indonesian school.

The image shows a NETWORK TOPOLOGY DIAGRAM with this EXACT structure:
- TOP TITLE: "Hari [day name] Tanggal [d-mm-yyyy]" → extract the date part (e.g. "6-04-2026")
- ISP NODES (boxes at top): Indibizz 1, Indibizz 2, Indibizz 3, Indibizz 4, Indibizz 5, Astinet
  - Each node shows: "Rx: [number] Mbps" and "Tx: [number] Mbps" below it
- SERVER BOXES (green boxes at bottom):
  - "DHCP Server" → shows "cpu: [n]% mem: [n]% disk: [n]%"
  - "SANGFOR" → shows "cpu: [n]% mem: [n]% virt: [n]% disk: [n]%"

Example from a real screenshot:
  Title: "Hari Senin Tanggal 6-04-2026"
  Indibizz 5: Rx: 130 Mbps / Tx: 5.44 Mbps
  Indibizz 4: Rx: 101 Mbps / Tx: 14.3 Mbps
  Indibizz 1: Rx: 366 Mbps / Tx: 21.8 Mbps
  Indibizz 2: Rx: 253 Mbps / Tx: 15.4 Mbps
  Indibizz 3: Rx: 270 Mbps / Tx: 18.7 Mbps
  Astinet: Rx: 28.9 Mbps / Tx: 1.21 Mbps
  DHCP Server: cpu: 12% mem: 2% disk: 18%
  SANGFOR: cpu: 80% mem: 48% virt: 48% disk: 45%

RULES:
- Extract ALL visible numbers from the image carefully
- ALL Rx/Tx values: NUMBER ONLY without unit (e.g. "366" not "366 Mbps")
- ALL CPU/MEM/Disk/Virt: NUMBER ONLY without % sign (e.g. "80" not "80%")
- For tanggal: extract ONLY the date portion like "6-04-2026" then format as dd-mm-yy → "06-04-26"
- If a value is truly not visible, use empty string ""
- Return ONLY the JSON object below, NO other text, NO markdown:

{
  "tanggal": "dd-mm-yy (e.g. 06-04-26)",
  "i1_rx": "366",
  "i1_tx": "21.8",
  "i2_rx": "253",
  "i2_tx": "15.4",
  "i3_rx": "270",
  "i3_tx": "18.7",
  "i4_rx": "101",
  "i4_tx": "14.3",
  "i5_rx": "130",
  "i5_tx": "5.44",
  "ast_rx": "28.9",
  "ast_tx": "1.21",
  "dhcp_cpu": "12",
  "dhcp_mem": "2",
  "dhcp_disk": "18",
  "sang_cpu": "80",
  "sang_mem": "48",
  "sang_virt": "48",
  "sang_disk": "45"
}

IMPORTANT: The values above are EXAMPLE values for the example image. Read the ACTUAL values from the provided image.`;

  const raw = await generateGeminiJsonFromImage({
    apiKey: requireGeminiApiKey(),
    prompt,
    base64,
    mimeType,
  });
  return cleanAiResult(raw);
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
  const [snapshotLightbox, setSnapshotLightbox] = useState<{ src: string; tanggal: string } | null>(null);
  const [manualSnapshotImage, setManualSnapshotImage] = useState<string | null>(null);

  const currentEmail = (localStorage.getItem('userEmail') || '').toLowerCase();
  const isLoggedInUser = Boolean(currentEmail);
  const currentUser = isLoggedInUser ? getCurrentUser() : null;
  const canCrudITNetwork = (() => {
    if (!isLoggedInUser) return false;
    const nicoEmails = ['nico@smktelkom-mlg.sch.id'];
    if (nicoEmails.includes(currentEmail)) return true;
    const allowedRoles = [
      ROLES.PIMPINAN,
      ROLES.KOORDINATOR_IT,
      ROLES.PIC_IT_NETWORK,
      ROLES.PIC_IT_BACKEND,
      ROLES.PIC_IT_MOBILE,
      ROLES.PIC_IT_UIUX,
      ROLES.PIC_IT_SUPPORT
    ];
    return allowedRoles.includes((currentUser?.roleAplikasi || '') as any);
  })();

  const ensureCrudAccess = () => {
    if (canCrudITNetwork) return true;
    alert('Akses CRUD menu IT & Jaringan hanya untuk user berwenang. Silakan login dengan akun Nico / tim IT.');
    return false;
  };

  
  const [formData, setFormData] = useState({
    date: getSystemDateInput(),
    count: '',
    overloads: '',
    note: ''
  });

  const [netFormData, setNetFormData] = useState({
    date: getSystemDateInput(),
    i1_rx: '', i1_tx: '',
    i2_rx: '', i2_tx: '',
    i3_rx: '', i3_tx: '',
    i4_rx: '', i4_tx: '',
    i5_rx: '', i5_tx: '',
    ast_rx: '', ast_tx: '',
    dhcp_cpu: '', dhcp_mem: '', dhcp_disk: '',
    sang_cpu: '', sang_mem: '', sang_virt: '', sang_disk: ''
  });

  const toNum = (v: any) => {
    const n = parseFloat(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };

  const hasNetPayload = (row: any) => {
    const keys = [
      'i1_rx', 'i1_tx', 'i2_rx', 'i2_tx', 'i3_rx', 'i3_tx',
      'i4_rx', 'i4_tx', 'i5_rx', 'i5_tx', 'ast_rx', 'ast_tx',
      'dhcp_cpu', 'dhcp_mem', 'dhcp_disk', 'sang_cpu', 'sang_mem', 'sang_virt', 'sang_disk',
      'snapshot', 'Snapshot', 'snapshot_url', 'Snapshot_URL',
      'tanggal', 'Tanggal'
    ];
    return keys.some((k) => String(row?.[k] ?? '').trim() !== '');
  };

  const getSnapshotSource = (row: any) => row?.snapshot || row?.Snapshot || row?.snapshot_url || row?.Snapshot_URL || '';

  const resetNetFormState = () => {
    setNetFormTab('upload');
    setUploadImage(null);
    setAiResult(null);
    setAiError('');
    setDragOver(false);
    setAiLoading(false);
    setManualSnapshotImage(null);
    setNetFormData({
      date: getSystemDateInput(),
      i1_rx: '', i1_tx: '',
      i2_rx: '', i2_tx: '',
      i3_rx: '', i3_tx: '',
      i4_rx: '', i4_tx: '',
      i5_rx: '', i5_tx: '',
      ast_rx: '', ast_tx: '',
      dhcp_cpu: '', dhcp_mem: '', dhcp_disk: '',
      sang_cpu: '', sang_mem: '', sang_virt: '', sang_disk: ''
    });
  };

  const openNetModal = () => {
    if (!ensureCrudAccess()) return;
    resetNetFormState();
    setIsNetFormOpen(true);
  };

  const closeNetModal = () => {
    setIsNetFormOpen(false);
    resetNetFormState();
  };

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
            date: normalizeWifiDateFromDb(dateStr),
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

  // Kompres gambar via Canvas → JPEG ~40% quality agar muat di GSheets cell
  const compressImage = (dataUrl: string): Promise<string> =>
    new Promise((resolve) => {
      const img = document.createElement('img');
      img.onload = () => {
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > MAX) { h = Math.round((h * MAX) / w); w = MAX; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.4));
      };
      img.src = dataUrl;
    });

  const fetchNetData = async () => {
    setNetLoading(true);
    try {
      const resp = await fetch(`${API_URL}?sheetName=Monitor_Net`);
      const data = await resp.json();
      if (data && Array.isArray(data) && data.length > 0) {
        const mappedRaw = data
          .filter((d: any) => hasNetPayload(d))
          .map((d: any, idx: number) => {
            const rawId = String(d.id || d.ID || '').trim();
            const parsedTanggal = formatDate(String(d.tanggal || d.Tanggal || ''));
            const inferredFromId = inferDateFromNetId(rawId);
            const inferredFromLegacy = inferLegacySeedDate(d);
            const tanggal = inferredFromId || parsedTanggal || inferredFromLegacy || '';
            const normalizedId = rawId || netIdFromDate(tanggal) || `ROW-${idx + 1}`;
            const sourceSnapshot = getSnapshotSource(d);
            return {
              id: normalizedId,
              tanggal,
              i1_rx: toNum(d.i1_rx), i1_tx: toNum(d.i1_tx),
              i2_rx: toNum(d.i2_rx), i2_tx: toNum(d.i2_tx),
              i3_rx: toNum(d.i3_rx), i3_tx: toNum(d.i3_tx),
              i4_rx: toNum(d.i4_rx), i4_tx: toNum(d.i4_tx),
              i5_rx: toNum(d.i5_rx), i5_tx: toNum(d.i5_tx),
              ast_rx: toNum(d.ast_rx), ast_tx: toNum(d.ast_tx),
              dhcp_cpu: d.dhcp_cpu ?? '',
              dhcp_mem: d.dhcp_mem ?? '',
              dhcp_disk: d.dhcp_disk ?? '',
              sang_cpu: d.sang_cpu ?? '',
              sang_mem: d.sang_mem ?? '',
              sang_virt: d.sang_virt ?? '',
              sang_disk: d.sang_disk ?? '',
              snapshot: sourceSnapshot,
              snapshot_url: d.snapshot_url || d.Snapshot_URL || ''
            };
          });

        // Dedup jika ada data ganda (mis. seed lama + seed perbaikan) berdasarkan ID atau tanggal.
        const seen = new Set<string>();
        const mapped = mappedRaw.filter((row: any) => {
          const key = String(row.id || '').startsWith('NET-') ? String(row.id) : `DATE-${row.tanggal || ''}`;
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        const parseNetDate = (s: string) => {
          const p = String(s || '').split('-');
          if (p.length !== 3) return 0;
          const dd = parseInt(p[0], 10) || 1;
          const mm = (parseInt(p[1], 10) || 1) - 1;
          const yy = parseInt(p[2], 10) || 0;
          return new Date(2000 + yy, mm, dd).getTime();
        };
        mapped.sort((a: any, b: any) => parseNetDate(a.tanggal) - parseNetDate(b.tanggal));

        if (mapped.length > 0) {
          setNetHistory(mapped);
          const latestWithMetrics = [...mapped].reverse().find((r: any) =>
            [r.i1_rx, r.i1_tx, r.i2_rx, r.i2_tx, r.i3_rx, r.i3_tx, r.i4_rx, r.i4_tx, r.i5_rx, r.i5_tx, r.ast_rx, r.ast_tx].some((v: any) => Number(v) > 0)
          );
          setNetData(latestWithMetrics || mapped[mapped.length - 1]);
        }
      }
    } catch (e) {
      console.log('Error fetching net monitor', e);
    } finally {
      setNetLoading(false);
    }
  };

  const handleDeleteTraffic = async (id: any) => {
    if (!ensureCrudAccess()) return;
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
    if (!ensureCrudAccess()) return;
    if (!window.confirm("Kirim 2 data awal jaringan (01-04-26 & 06-04-26) ke DB?")) return;
    setNetLoading(true);
    try {
      const seedRecords = [
        {
          id: 'NET-010426',
          tanggal: '01-04-26',
          i1_rx: '278', i1_tx: '30.9',
          i2_rx: '277', i2_tx: '22.5',
          i3_rx: '280', i3_tx: '58.6',
          i4_rx: '162', i4_tx: '8.26',
          i5_rx: '118', i5_tx: '8.75',
          ast_rx: '5.97', ast_tx: '2.22',
          dhcp_cpu: '13', dhcp_mem: '2', dhcp_disk: '18',
          sang_cpu: '85', sang_mem: '48', sang_virt: '48', sang_disk: '45'
        },
        {
          id: 'NET-060426',
          tanggal: '06-04-26',
          i1_rx: '366', i1_tx: '21.8',
          i2_rx: '253', i2_tx: '15.4',
          i3_rx: '270', i3_tx: '18.7',
          i4_rx: '101', i4_tx: '14.3',
          i5_rx: '130', i5_tx: '5.44',
          ast_rx: '28.9', ast_tx: '1.21',
          dhcp_cpu: '12', dhcp_mem: '2', dhcp_disk: '18',
          sang_cpu: '80', sang_mem: '48', sang_virt: '48', sang_disk: '45'
        }
      ];

      for (const record of seedRecords) {
        const tanggal = normalizeDateForSave(record.tanggal);
        const id = netIdFromDate(tanggal) || record.id;
        await fetch(API_URL, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify({
            action: 'FINANCE_RECORD',
            sheetName: 'Monitor_Net',
            sheet: 'Monitor_Net',
            ...record,
            id,
            ID: id,
            tanggal,
            Tanggal: tanggal
          })
        });
      }

      alert('Terima kasih! Berhasil seed 2 data awal jaringan!');
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
    if (!ensureCrudAccess()) return;
    if (!window.confirm("Kirim data PREVIEW ini ke Cloud Spreadsheet sekarang?")) return;
    setLoading(true);
    try {
      const previews = deviceData.filter(d => d.isPreview);
      for (const item of previews) {
        const sheetDate = toSheetWifiDate(item.date);
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
            tanggal: sheetDate,
            Tanggal: sheetDate,
            count: item.count.toString(),
            Count: item.count.toString(),
            overloads: item.overloads.toString(),
            Overloads: item.overloads.toString(),
            note: item.note,
            Note: item.note
          })
        });
      }
      alert('Terima kasih! Sinkronisasi Berhasil!');
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
    if (!ensureCrudAccess()) return;
    setIsEditing(true);
    setCurrentId(item.id);
    setFormData({
      date: toInputDate(item.date),
      count: item.count.toString(),
      overloads: item.overloads.toString(),
      note: item.note
    });
    document.getElementById('crud-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDelete = async (id: any) => {
    if (!ensureCrudAccess()) return;
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
    setFormData({ date: getSystemDateInput(), count: '', overloads: '', note: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ensureCrudAccess()) return;
    if (!formData.date || !formData.count) return;
    const newId = (isEditing && currentId !== null) ? currentId : `WIFI-${Date.now()}`;
    // format date dari yyyy-mm-dd (input type=date) ke dd-mm-yy
    const formattedDate = formatDate(formData.date);
    const sheetDate = toSheetWifiDate(formattedDate);
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
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: 'FINANCE_RECORD',
          sheetName: 'Monitor_Wifi',
          sheet: 'Monitor_Wifi',
          id: newId,
          ID: newId,
          tanggal: sheetDate,
          Tanggal: sheetDate,
          count: formData.count,
          Count: formData.count,
          overloads: formData.overloads,
          Overloads: formData.overloads,
          note: formData.note,
          Note: formData.note
        })
      });
      setTimeout(fetchData, 900);
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

  const latestWifi = deviceData.length > 0 ? deviceData[deviceData.length - 1] : null;
  const previousWifi = deviceData.length > 1 ? deviceData[deviceData.length - 2] : null;
  const wifiDelta = latestWifi && previousWifi ? latestWifi.count - previousWifi.count : 0;
  const wifiTrendLabel = latestWifi && previousWifi
    ? (wifiDelta <= 0 ? `${Math.abs(wifiDelta)} klien turun` : `${wifiDelta} klien naik`)
    : 'Belum ada pembanding';

  const sangCpu = parseFloat(netData?.sang_cpu || 0);
  const dhcpCpu = parseFloat(netData?.dhcp_cpu || 0);
  const overloadRooms = latestWifi?.overloads || 0;
  const needsAttentionCount = [sangCpu > 75, dhcpCpu > 75, overloadRooms > 8].filter(Boolean).length;
  const latestSnapshotRecord = [...netHistory].reverse().find((row: any) => getSnapshotSource(row));

  return (
    <div className="animate-fade-in it-dashboard-page">
      <div className="glass-panel it-hero-panel">
        <div className="it-hero-main">
          <span className="it-hero-kicker">IT OPERATIONS CENTER</span>
          <h1 className="page-title gradient-text" style={{ marginBottom: '0.35rem' }}>IT Services Dashboard</h1>
          <p className="it-hero-subtitle">Pemantauan Infrastruktur, Jaringan, dan Keamanan / PDP</p>
          <div className="it-hero-badges">
            <span className="badge badge-info">NOC Monitoring</span>
            <span className="badge badge-success">WiFi & Backbone</span>
            <span className="badge badge-warning">Server Health</span>
          </div>
        </div>
        <div className="it-hero-side">
          <div className="it-hero-meta-card">
            <span className="it-hero-meta-label">Update WiFi Terakhir</span>
            <b className="it-hero-meta-value">{latestWifi?.date ? toDisplayDate(latestWifi.date) : '-'}</b>
          </div>
          <div className="it-hero-meta-card">
            <span className="it-hero-meta-label">Update Network Terakhir</span>
            <b className="it-hero-meta-value">{netData?.tanggal || '-'}</b>
          </div>
        </div>
      </div>

      {!canCrudITNetwork && (
        <div className="glass-panel" style={{ marginBottom: '1rem', padding: '0.7rem 1rem', border: '1px solid rgba(245,158,11,0.35)', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
          Mode baca saja aktif. CRUD menu IT & Jaringan tersedia untuk akun Nico dan tim IT berwenang.
        </div>
      )}

      <div className="it-kpi-grid">
        <div className="glass-panel it-kpi-card">
          <div className="it-kpi-head">
            <span className="it-kpi-title">Uptime Jaringan</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-emerald-ghost)', color: 'var(--accent-emerald)', padding: '0.45rem' }}>
              <Wifi size={20} />
            </div>
          </div>
          <div className="it-kpi-value">99.8%</div>
          <div className="stat-trend trend-up">Target SLA: 99.5%</div>
        </div>

        <div className="glass-panel it-kpi-card">
          <div className="it-kpi-head">
            <span className="it-kpi-title">Klien WiFi Aktif</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)', padding: '0.45rem' }}>
              <Smartphone size={20} />
            </div>
          </div>
          <div className="it-kpi-value">{latestWifi?.count?.toLocaleString() || '-'}</div>
          <div className={`stat-trend ${wifiDelta <= 0 ? 'trend-up' : 'trend-down'}`}>{wifiTrendLabel}</div>
        </div>

        <div className="glass-panel it-kpi-card">
          <div className="it-kpi-head">
            <span className="it-kpi-title">PDP / Keamanan</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-rose-ghost)', color: 'var(--accent-rose)', padding: '0.45rem' }}>
              <Shield size={20} />
            </div>
          </div>
          <div className="it-kpi-value">{needsAttentionCount === 0 ? 'Aman' : `${needsAttentionCount} Atensi`}</div>
          <div className={`stat-trend ${needsAttentionCount === 0 ? 'trend-up' : 'trend-down'}`}>
            {needsAttentionCount === 0 ? 'Tidak ada alert kritis' : 'Perlu tindak lanjut'}
          </div>
        </div>
      </div>

      {/* WIFI MONITOR SECTION */}
      <div className="it-section-header">
        <div>
          <h2 className="it-section-title">
            <Smartphone color="var(--accent-blue)" size={20} /> Pemantauan Trend Perangkat (WiFi Client)
          </h2>
          <p className="it-section-subtitle">Monitoring jumlah klien harian, area overload, dan catatan stabilisasi per ruang.</p>
        </div>
        <div className="it-section-actions">
          {canCrudITNetwork && deviceData.some(d => d.isPreview) && !loading && (
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
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{toDisplayDate(item.date)} {item.isPreview && <small style={{ color: 'var(--accent-amber)' }}>(PREVIEW)</small>}</td>
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
                        <button
                          onClick={() => handleEdit(item)}
                          disabled={!canCrudITNetwork}
                          style={{ background: 'rgba(59,130,246,0.15)', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: canCrudITNetwork ? 'pointer' : 'not-allowed', color: 'var(--accent-blue)', opacity: canCrudITNetwork ? 1 : 0.45 }}
                        ><Edit2 size={13} /></button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={!canCrudITNetwork}
                          style={{ background: 'rgba(244,63,94,0.15)', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: canCrudITNetwork ? 'pointer' : 'not-allowed', color: '#f43f5e', opacity: canCrudITNetwork ? 1 : 0.45 }}
                        ><Trash2 size={13} /></button>
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
                  <label style={{ fontSize: '0.7rem', display: 'block', marginBottom: '0.3rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tanggal (default: sistem)</label>
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
                <button
                  type="submit"
                  disabled={!canCrudITNetwork}
                  className="btn"
                  style={{ background: canCrudITNetwork ? 'var(--accent-blue)' : '#64748b', color: 'white', marginTop: '0.5rem', cursor: canCrudITNetwork ? 'pointer' : 'not-allowed', opacity: canCrudITNetwork ? 1 : 0.7 }}
                >Simpan</button>
                {isEditing && (
                  <button type="button" onClick={resetForm} className="btn" style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>Batal</button>
                )}
             </form>
          </div>
        </div>
      </div>

      {/* NETWORK SECTION */}
      <div id="net" className="it-section-header" style={{ marginTop: '2.5rem' }}>
        <div>
          <h2 className="it-section-title">
            <Activity color="var(--accent-emerald)" size={20} /> Monitoring Infrastruktur & Bandwidth
          </h2>
          <p className="it-section-subtitle">Pantau utilisasi setiap link ISP, kondisi gateway, serta kesehatan layanan inti jaringan.</p>
        </div>
        <div className="it-section-actions">
          {canCrudITNetwork && !netData && !netLoading && (
            <button onClick={handleSeedNetToDB} className="btn" style={{ background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)', fontSize: '0.75rem' }}>
              <DatabaseBackup size={14} /> Seed Data Gambar
            </button>
          )}
          <button onClick={openNetModal} disabled={!canCrudITNetwork} className="btn btn-outline" style={{ fontSize: '0.75rem', cursor: canCrudITNetwork ? 'pointer' : 'not-allowed', opacity: canCrudITNetwork ? 1 : 0.6 }}>
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

      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '0.5rem', border: '1px solid rgba(59,130,246,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Camera size={16} color="var(--accent-blue)" /> Kondisi Gambar Jaringan Terkini
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Snapshot terakhir: {latestSnapshotRecord?.tanggal ? toDisplayDate(latestSnapshotRecord.tanggal) : '-'}
            </p>
          </div>
          <button onClick={openNetModal} disabled={!canCrudITNetwork} className="btn btn-outline" style={{ fontSize: '0.75rem', cursor: canCrudITNetwork ? 'pointer' : 'not-allowed', opacity: canCrudITNetwork ? 1 : 0.6 }}>
            Update + Simpan Gambar
          </button>
        </div>

        {latestSnapshotRecord && getSnapshotSource(latestSnapshotRecord) ? (
          <button
            onClick={() => setSnapshotLightbox({ src: getSnapshotSource(latestSnapshotRecord), tanggal: latestSnapshotRecord.tanggal || '-' })}
            style={{ width: '100%', border: 'none', padding: 0, background: 'transparent', cursor: 'zoom-in' }}
            title="Klik untuk lihat gambar ukuran penuh"
          >
            <img
              src={getSnapshotSource(latestSnapshotRecord)}
              alt={`Snapshot jaringan ${latestSnapshotRecord?.tanggal || ''}`}
              style={{ width: '100%', maxHeight: '260px', objectFit: 'contain', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)' }}
            />
          </button>
        ) : (
          <div style={{ border: '1px dashed var(--border-subtle)', borderRadius: '10px', padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            Belum ada snapshot tersimpan. Klik <b>Update + Simpan Gambar</b> untuk upload screenshot kondisi jaringan.
          </div>
        )}
      </div>

      {/* ===== TRAFFIC PER ONT HISTORY ===== */}
      <div className="it-section-header" style={{ marginTop: '2.5rem' }}>
        <div>
          <h2 className="it-section-title">
            <TrendingUp color="var(--accent-amber)" size={20} /> Histori Traffic per ONT
          </h2>
          <p className="it-section-subtitle">Analisis tren download/upload antar hari untuk deteksi anomali beban jaringan.</p>
        </div>
        <div className="it-section-actions">
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
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Riwayat Update ({Math.min(netHistory.length, 7)} Terakhir)</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>📸 Klik ikon kamera untuk lihat foto kondisi jaringan</span>
          </div>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.78rem', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TANGGAL</th>
                {ONT_LIST.map(ont => (
                  <th key={ont.key} style={{ padding: '0.75rem 0.5rem', color: ont.color, fontWeight: 600, textAlign: 'center' }}>{ont.label}</th>
                ))}
                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'center' }}>FOTO</th>
                <th style={{ padding: '0.75rem 1rem' }}></th>
              </tr>
              <tr style={{ borderBottom: '2px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)' }}>
                <td style={{ padding: '0.4rem 1rem', fontSize: '0.65rem', color: 'var(--text-secondary)' }}></td>
                {ONT_LIST.map(ont => (
                  <td key={ont.key} style={{ padding: '0.4rem 0.5rem', textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: '#60a5fa' }}>↓Rx</span> / <span style={{ color: '#f87171' }}>↑Tx</span> (Mbps)
                  </td>
                ))}
                <td style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Snapshot</td>
                <td></td>
              </tr>
            </thead>
            <tbody>
              {[...netHistory].reverse().slice(0, 7).map((row) => (
                <tr key={row.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{toDisplayDate(String(row.tanggal || ''))}</td>
                  {ONT_LIST.map(ont => (
                    <td key={ont.key} style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                      <span style={{ color: '#60a5fa', fontWeight: 600 }}>{row[`${ont.key}_rx`]}</span>
                      <span style={{ color: 'var(--text-secondary)', margin: '0 3px' }}>/</span>
                      <span style={{ color: '#f87171' }}>{row[`${ont.key}_tx`]}</span>
                    </td>
                  ))}
                  {/* Kolom Foto */}
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    {getSnapshotSource(row) ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <button
                          onClick={() => setSnapshotLightbox({ src: getSnapshotSource(row), tanggal: row.tanggal || '-' })}
                          title="Lihat foto kondisi jaringan"
                          style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', cursor: 'pointer', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-blue)' }}
                        >
                          <Camera size={14} />
                          <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>Lihat</span>
                        </button>
                        {(row.snapshot_url || String(getSnapshotSource(row)).startsWith('http')) && (
                          <a
                            href={row.snapshot_url || getSnapshotSource(row)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.62rem', color: 'var(--accent-emerald)', textDecoration: 'none' }}
                          >
                            Buka Link
                          </a>
                        )}
                      </div>
                    ) : canCrudITNetwork ? (
                      <label title="Upload foto kondisi jaringan untuk tanggal ini" style={{ cursor: 'pointer', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: 'var(--text-muted)', opacity: 0.5 }}>
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
                            const compressed = await compressImage(ev.target?.result as string);
                            // Simpan ke DB
                            try {
                              const tanggal = normalizeDateForSave(String(row.tanggal || getSystemDateInput()));
                              const recordId = String(row.id || '').startsWith('ROW-') ? (netIdFromDate(tanggal) || `NET-${Date.now()}`) : String(row.id);
                              await fetch(API_URL, {
                                method: 'POST', mode: 'no-cors',
                                body: JSON.stringify({
                                  action: 'FINANCE_RECORD',
                                  sheetName: 'Monitor_Net',
                                  sheet: 'Monitor_Net',
                                  id: recordId,
                                  ID: recordId,
                                  tanggal,
                                  Tanggal: tanggal,
                                  snapshot: compressed
                                })
                              });
                              setNetHistory(prev => prev.map(r => r.id === row.id ? { ...r, id: recordId, snapshot: compressed } : r));
                            } catch { alert('Gagal upload foto.'); }
                          };
                          reader.readAsDataURL(file);
                        }} />
                        <Camera size={14} />
                        <span style={{ fontSize: '0.6rem' }}>Upload</span>
                      </label>
                    ) : (
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', opacity: 0.65 }}>Read only</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <button onClick={() => handleDeleteTraffic(row.id)} disabled={!canCrudITNetwork} title="Hapus" style={{ background: 'none', border: 'none', cursor: canCrudITNetwork ? 'pointer' : 'not-allowed', color: 'var(--accent-rose)', opacity: canCrudITNetwork ? 0.6 : 0.3 }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Lightbox Foto Jaringan ── */}
      {snapshotLightbox && (
        <div
          onClick={() => setSnapshotLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '1.25rem 1.5rem 1.5rem', cursor: 'zoom-out', overflowY: 'auto' }}
        >
          <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
            <button onClick={() => setSnapshotLightbox(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', color: 'white', cursor: 'pointer', padding: '8px', display: 'flex' }}>
              <X size={20} />
            </button>
          </div>
          <div style={{ marginTop: '0.25rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Camera size={14} />
            <span>Kondisi Jaringan — {snapshotLightbox.tanggal}</span>
          </div>
          <img
            src={snapshotLightbox.src}
            alt={`Kondisi Jaringan ${snapshotLightbox.tanggal}`}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 120px)', borderRadius: '12px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', objectFit: 'contain', cursor: 'default' }}
          />
          <p style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>Klik di luar gambar untuk menutup</p>
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
              <button onClick={closeNetModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}><X size={20} /></button>
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
                          setNetFormData(prev => ({ ...prev, ...extracted, date: extracted.tanggal ? toInputDate(extracted.tanggal) : prev.date }));
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
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>Koreksi jika ada yang salah lalu simpan</span>
                      </div>

                      {/* Tanggal — wajib diisi */}
                      <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', flexShrink: 0 }}>Tanggal</span>
                        <input
                          type="date"
                          className="input-field"
                          style={{ flex: 1, minWidth: '180px', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                          value={(() => {
                            // Konversi dd-mm-yy ke yyyy-mm-dd untuk input type=date
                            const t = aiResult.tanggal;
                            if (!t) return '';
                            const p = t.split('-');
                            if (p.length === 3) return `20${p[2]}-${p[1]}-${p[0]}`;
                            return '';
                          })()}
                          onChange={e => {
                            setAiResult((prev: any) => ({ ...prev, tanggal: formatDate(e.target.value) }));
                          }}
                        />
                        {!aiResult.tanggal && (
                          <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>⚠️ AI tidak menemukan tanggal — pilih manual</span>
                        )}
                        {aiResult.tanggal && (
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981' }}>{aiResult.tanggal}</span>
                        )}
                      </div>

                      {/* Grid data ONT */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '0.6rem', marginBottom: '1rem' }}>
                        {ONT_LIST.map(ont => (
                          <div key={ont.key} style={{ padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: `3px solid ${ont.color}` }}>
                            <div style={{ fontSize: '0.65rem', color: ont.color, marginBottom: '4px', fontWeight: 700 }}>{ont.label}</div>
                            <div style={{ fontSize: '0.82rem' }}>
                              <span style={{ color: '#60a5fa' }}>↓ {aiResult[`${ont.key}_rx`] || <span style={{color:'#f59e0b'}}>?</span>} Mbps</span>
                              <span style={{ color: 'var(--text-secondary)', margin: '0 6px' }}>/</span>
                              <span style={{ color: '#f87171' }}>↑ {aiResult[`${ont.key}_tx`] || <span style={{color:'#f59e0b'}}>?</span>} Mbps</span>
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

                      {/* Tombol Simpan */}
                      <button
                        disabled={!canCrudITNetwork || !aiResult.tanggal || netLoading}
                        onClick={async () => {
                          if (!ensureCrudAccess()) return;
                          if (!aiResult.tanggal) {
                            alert('Pilih tanggal terlebih dahulu.');
                            return;
                          }
                          setNetLoading(true);
                          try {
                            const tanggal = normalizeDateForSave(aiResult.tanggal);
                            const newId = netIdFromDate(tanggal) || `NET-${Date.now()}`;
                            const { tanggal: _ignoredTanggal, ...fields } = aiResult;
                            // Kompres gambar upload (yang dipakai AI) jadi snapshot
                            const snapshotData = uploadImage ? await compressImage(uploadImage) : '';
                            const payload = {
                              action: 'FINANCE_RECORD',
                              sheetName: 'Monitor_Net',
                              sheet: 'Monitor_Net',
                              id: newId,
                              ID: newId,
                              tanggal,
                              Tanggal: tanggal,
                              snapshot: snapshotData,
                              ...fields
                            };
                            await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
                            // Update histori langsung tanpa reload
                            const newRecord = {
                              id: newId, tanggal, snapshot: snapshotData,
                              i1_rx: parseFloat(fields.i1_rx||0), i1_tx: parseFloat(fields.i1_tx||0),
                              i2_rx: parseFloat(fields.i2_rx||0), i2_tx: parseFloat(fields.i2_tx||0),
                              i3_rx: parseFloat(fields.i3_rx||0), i3_tx: parseFloat(fields.i3_tx||0),
                              i4_rx: parseFloat(fields.i4_rx||0), i4_tx: parseFloat(fields.i4_tx||0),
                              i5_rx: parseFloat(fields.i5_rx||0), i5_tx: parseFloat(fields.i5_tx||0),
                              ast_rx: parseFloat(fields.ast_rx||0), ast_tx: parseFloat(fields.ast_tx||0),
                              dhcp_cpu: fields.dhcp_cpu, dhcp_mem: fields.dhcp_mem, dhcp_disk: fields.dhcp_disk,
                              sang_cpu: fields.sang_cpu, sang_mem: fields.sang_mem, sang_virt: fields.sang_virt, sang_disk: fields.sang_disk,
                            };
                            setNetHistory(prev => [...prev, newRecord]);
                            setNetData(newRecord);
                            closeNetModal();
                            alert('Terima kasih! ✅ Data traffic berhasil disimpan!');
                          } catch (err: any) {
                            alert('Gagal menyimpan: ' + (err.message || ''));
                          } finally { setNetLoading(false); }
                        }}
                        className="btn"
                        style={{
                          width: '100%', marginTop: '0.5rem',
                          background: canCrudITNetwork && aiResult.tanggal ? '#10b981' : '#6b7280',
                          color: 'white', fontWeight: 700, padding: '0.85rem',
                          borderRadius: '8px', border: 'none',
                          cursor: canCrudITNetwork && aiResult.tanggal ? 'pointer' : 'not-allowed',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                          opacity: canCrudITNetwork && aiResult.tanggal ? 1 : 0.6
                        }}
                      >
                        {netLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                        Simpan Data Hasil Analisis ke Histori
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
                  if (!ensureCrudAccess()) return;
                  setNetLoading(true);
                  try {
                    const tanggal = normalizeDateForSave(netFormData.date || getSystemDateInput());
                    const netId = netIdFromDate(tanggal) || `NET-${Date.now()}`;
                    const manualSnapshotData = manualSnapshotImage ? await compressImage(manualSnapshotImage) : '';
                    await fetch(API_URL, {
                      method: 'POST', mode: 'no-cors',
                      body: JSON.stringify({
                        action: 'FINANCE_RECORD',
                        sheetName: 'Monitor_Net',
                        sheet: 'Monitor_Net',
                        id: netId,
                        ID: netId,
                        tanggal,
                        Tanggal: tanggal,
                        snapshot: manualSnapshotData,
                        ...netFormData
                      })
                    });
                    alert('Terima kasih! Berhasil Update!');
                    closeNetModal();
                    fetchNetData();
                  } catch { alert('Gagal'); }
                  finally { setNetLoading(false); }
                }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.7rem', display: 'block', marginBottom: '0.3rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      Snapshot Kondisi Jaringan (Opsional)
                    </label>
                    <label style={{ border: '1px dashed var(--border-subtle)', borderRadius: '10px', padding: manualSnapshotImage ? '0.5rem' : '0.85rem', display: 'block', cursor: canCrudITNetwork ? 'pointer' : 'not-allowed', textAlign: 'center', background: manualSnapshotImage ? 'rgba(16,185,129,0.06)' : 'rgba(0,0,0,0.12)', opacity: canCrudITNetwork ? 1 : 0.7 }}>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={!canCrudITNetwork}
                        style={{ display: 'none' }}
                        onChange={(ev) => {
                          const file = ev.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (e2) => setManualSnapshotImage(e2.target?.result as string);
                          reader.readAsDataURL(file);
                        }}
                      />
                      {manualSnapshotImage ? (
                        <div>
                          <img src={manualSnapshotImage} alt="Preview snapshot manual" style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain' }} />
                          <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>✓ Snapshot akan ikut disimpan</p>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Klik untuk upload screenshot/foto kondisi jaringan</span>
                      )}
                    </label>
                    {manualSnapshotImage && canCrudITNetwork && (
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setManualSnapshotImage(null)}
                        style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}
                      >
                        Hapus Snapshot
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', display: 'block', marginBottom: '0.3rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Tanggal (otomatis dari sistem)</label>
                      <input type="date" className="input-field" style={{ width: '100%' }} value={netFormData.date || ''} onChange={e => setNetFormData({...netFormData, date: e.target.value})} disabled={!canCrudITNetwork} />
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
                  <button type="submit" disabled={!canCrudITNetwork} className="btn" style={{ background: canCrudITNetwork ? 'var(--accent-emerald)' : '#64748b', color: 'white', width: '100%', marginTop: '1.5rem', padding: '0.85rem', fontWeight: 700, borderRadius: '10px', border: 'none', cursor: canCrudITNetwork ? 'pointer' : 'not-allowed', opacity: canCrudITNetwork ? 1 : 0.75 }}
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
