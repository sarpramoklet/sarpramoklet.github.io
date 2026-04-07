import { useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LabelList } from 'recharts';
import { UserCircle2, Wallet, Loader2, Zap, Droplets, Calendar, Info, UserCheck, ShieldCheck, MessageSquare, AlertCircle, Edit3, Trash2, Wind, Briefcase, Smartphone, Activity, Coins, Camera, X } from 'lucide-react';
import { getCurrentUser, ROLES, USERS } from '../data/organization';
import { getUtilityChartData } from '../data/utilities';

const FINANCE_API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";



interface DashboardProps {
  isLoggedIn?: boolean;
  userPicture?: string;
}

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

const Dashboard = ({ isLoggedIn = false, userPicture = '' }: DashboardProps) => {
  const currentUser = getCurrentUser();
  const isPimpinan = currentUser.roleAplikasi === ROLES.PIMPINAN;
  const isAuthorizedFinance = isPimpinan || currentUser.roleAplikasi === ROLES.PIC_ADMIN;
  
  const [financeLoading, setFinanceLoading] = useState(true);
  const [internalFinance, setInternalFinance] = useState({ balance: 0, expense: 0, categories: [] as any[] });
  const [tuFinance, setTuFinance] = useState<{ balance: number; expense: number }>({ balance: 0, expense: 0 });
  const [acFinance, setAcFinance] = useState<{ balance: number; expense: number }>({ balance: 0, expense: 0 });
  const [internalLastTx, setInternalLastTx] = useState<any>(null);
  const [tuLastTx, setTuLastTx] = useState<any>(null);
  const [acLastTx, setAcLastTx] = useState<any>(null);
  const [piketNotes, setPiketNotes] = useState<any[]>([]);
  const [piketLoading, setPiketLoading] = useState(false);
  
  const [acMonitorData, setAcMonitorData] = useState<any>(null);
  const [acLoading, setAcLoading] = useState(false);

  const [capexProjects, setCapexProjects] = useState<any[]>([]);
  const [capexLoading, setCapexLoading] = useState(false);

  const [wifiData, setWifiData] = useState<any[]>([]);
  const [wifiLoading, setWifiLoading] = useState(false);
  const [netSnapshot, setNetSnapshot] = useState<any>(null);
  const [netSnapshotThumb, setNetSnapshotThumb] = useState<any>(null);
  const [netSnapshotLightbox, setNetSnapshotLightbox] = useState<{ src: string; tanggal: string } | null>(null);
  const sortedCapexProjects = capexProjects.slice().sort((a, b) => b.progress - a.progress);
  const sarprasPersonnel = USERS
    .filter((u) => u.roleAplikasi === ROLES.PIMPINAN || u.unit === 'Sarpras')
    .sort((a, b) => {
      const rank = (role: string) => {
        if (role === ROLES.PIMPINAN) return 0;
        if (role === ROLES.KOORDINATOR_SARPRAS) return 1;
        return 2;
      };
      const diff = rank(a.roleAplikasi) - rank(b.roleAplikasi);
      if (diff !== 0) return diff;
      return a.nama.localeCompare(b.nama, 'id');
    });

  const pickDateField = (row: any) => String(
    row?.tanggal || row?.Tanggal || row?.date || row?.Date || row?.waktu || row?.Waktu || ''
  ).trim();

  const formatTxDate = (raw: any) => {
    const s = String(raw || '').trim();
    if (!s) return '-';
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: '2-digit' }).format(d);
    }
    return s;
  };

  const pickLatestRow = (rows: any[], isValid: (row: any) => boolean) => {
    const valid = rows.filter(isValid);
    if (valid.length === 0) return null;
    const dated = valid.map((row, idx) => {
      const ts = new Date(pickDateField(row)).getTime();
      return { row, idx, ts };
    });
    const parseable = dated.filter((d) => !isNaN(d.ts));
    if (parseable.length > 0) {
      parseable.sort((a, b) => a.ts - b.ts);
      return parseable[parseable.length - 1].row;
    }
    return valid[valid.length - 1];
  };

  const txAmountText = (amount: number, type: 'in' | 'out' | 'unknown') => {
    const nominal = formatIDR(Math.abs(Number(amount || 0)));
    if (type === 'in') return `+ ${nominal}`;
    if (type === 'out') return `- ${nominal}`;
    return nominal;
  };

  const getSnapshotSource = (row: any) => row?.snapshot || row?.Snapshot || row?.snapshot_url || row?.Snapshot_URL || '';

  const formatSnapshotDate = (raw: any): string => {
    const s = String(raw || '').trim();
    if (!s) return '-';

    const fmt = (dd: number, mm: number, yy: number) => {
      const d = String(dd).padStart(2, '0');
      const m = monthList[Math.max(0, Math.min(11, mm - 1))] || 'Jan';
      const y = String(yy).padStart(2, '0');
      return `${d} ${m} ${y}`;
    };

    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return fmt(d.getDate(), d.getMonth() + 1, d.getFullYear() % 100);
    }

    const tanggalMatch = s.match(/tanggal\s+(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/i);
    if (tanggalMatch) {
      const dd = parseInt(tanggalMatch[1], 10) || 1;
      const mm = parseInt(tanggalMatch[2], 10) || 1;
      const yyRaw = parseInt(tanggalMatch[3], 10) || 0;
      const yy = yyRaw > 99 ? yyRaw % 100 : yyRaw;
      return fmt(dd, mm, yy);
    }

    const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (dmyMatch) {
      const dd = parseInt(dmyMatch[1], 10) || 1;
      const mm = parseInt(dmyMatch[2], 10) || 1;
      const yyRaw = parseInt(dmyMatch[3], 10) || 0;
      const yy = yyRaw > 99 ? yyRaw % 100 : yyRaw;
      return fmt(dd, mm, yy);
    }

    const parts = s.split(' ');
    if (parts.length >= 3 && monthMap[parts[1]] !== undefined) {
      const dd = parseInt(parts[0], 10) || 1;
      const mm = (monthMap[parts[1]] || 0) + 1;
      const yyRaw = parseInt(parts[2], 10) || 0;
      const yy = yyRaw > 99 ? yyRaw % 100 : yyRaw;
      return fmt(dd, mm, yy);
    }

    return s;
  };

  useEffect(() => {
    const fetchFinanceData = async () => {
      setFinanceLoading(true);
      try {
        // Fetch Internal Sarpra Finance
        const respInternal = await fetch(`${FINANCE_API_URL}?sheetName=Finance`);
        const dataInternal = await respInternal.json();
        
        if (dataInternal && Array.isArray(dataInternal)) {
          const mapped = dataInternal.map((item: any) => ({
            amount: Number(item.amount || item.Amount || 0),
            type: item.type || item.Tipe || '',
            category: item.category || item.Kategori || 'Lainnya'
          }));
          const income = mapped.filter(i => i.type === 'income').reduce((a, b) => a + b.amount, 0);
          const expense = mapped.filter(i => i.type === 'expense').reduce((a, b) => a + b.amount, 0);
          
          const cats: any = {};
          mapped.filter(i => i.type === 'expense').forEach(i => {
            cats[i.category] = (cats[i.category] || 0) + i.amount;
          });
          const categoryList = Object.keys(cats).map(k => ({ name: k, value: cats[k] })).sort((a, b) => b.value - a.value);

          setInternalFinance({ balance: income - expense, expense, categories: categoryList });

          const latestInternal = pickLatestRow(dataInternal, (item: any) =>
            Number(item.amount || item.Amount || 0) > 0 ||
            String(item.title || item.Keterangan || '').trim() !== ''
          );
          if (latestInternal) {
            const txType = String(latestInternal.type || latestInternal.Tipe || '').toLowerCase();
            setInternalLastTx({
              date: formatTxDate(pickDateField(latestInternal)),
              note: String(latestInternal.title || latestInternal.Keterangan || latestInternal.category || latestInternal.Kategori || 'Transaksi').trim(),
              amount: Number(latestInternal.amount || latestInternal.Amount || 0),
              type: txType === 'income' ? 'in' : (txType === 'expense' ? 'out' : 'unknown')
            });
          } else {
            setInternalLastTx(null);
          }
        }

        // Fetch Kas TU
        const respTU = await fetch(`${FINANCE_API_URL}?sheetName=Kas_TU`);
        const dataTU = await respTU.json();
        
        if (dataTU && Array.isArray(dataTU) && dataTU.length > 0) {
          let balance = 0;
          let totalDebit = 0;
          let totalKredit = 0;
          let txCount = 0;

          dataTU.forEach((item: any) => {
            const d = Number(item.debit || item.Debit || 0);
            const k = Number(item.kredit || item.Kredit || 0);
            if (d > 0 || k > 0) {
              totalDebit += d;
              totalKredit += k;
              txCount++;
            }
          });
          balance = totalDebit - totalKredit;
          
          setTuFinance({ balance, expense: totalKredit });

          const latestTU = pickLatestRow(dataTU, (item: any) =>
            Number(item.debit || item.Debit || 0) > 0 || Number(item.kredit || item.Kredit || 0) > 0
          );
          if (latestTU) {
            const debit = Number(latestTU.debit || latestTU.Debit || 0);
            const kredit = Number(latestTU.kredit || latestTU.Kredit || 0);
            setTuLastTx({
              date: formatTxDate(pickDateField(latestTU)),
              note: String(latestTU.keterangan || latestTU.Keterangan || 'Tanpa keterangan').trim(),
              amount: debit > 0 ? debit : kredit,
              type: debit > 0 ? 'in' : 'out'
            });
          } else {
            setTuLastTx(null);
          }
        }

        // Fetch Kas AC
        const respAC = await fetch(`${FINANCE_API_URL}?sheetName=Kas_AC`);
        const dataAC = await respAC.json();
        if (dataAC && Array.isArray(dataAC) && dataAC.length > 0) {
          let balance = 0;
          let totalDebit = 0;
          let totalKredit = 0;
          let txCount = 0;

          dataAC.forEach((item: any) => {
            const d = Number(item.debit || item.Debit || 0);
            const k = Number(item.kredit || item.Kredit || 0);
            if (d > 0 || k > 0) {
              totalDebit += d;
              totalKredit += k;
              txCount++;
            }
          });
          balance = totalDebit - totalKredit;
          
          setAcFinance({ balance, expense: totalKredit });

          const latestAC = pickLatestRow(dataAC, (item: any) =>
            Number(item.debit || item.Debit || 0) > 0 || Number(item.kredit || item.Kredit || 0) > 0
          );
          if (latestAC) {
            const debit = Number(latestAC.debit || latestAC.Debit || 0);
            const kredit = Number(latestAC.kredit || latestAC.Kredit || 0);
            setAcLastTx({
              date: formatTxDate(pickDateField(latestAC)),
              note: String(latestAC.keterangan || latestAC.Keterangan || 'Tanpa keterangan').trim(),
              amount: debit > 0 ? debit : kredit,
              type: debit > 0 ? 'in' : 'out'
            });
          } else {
            setAcLastTx(null);
          }
        }
      } catch (error) {
        console.error("Dashboard monitor fetch error:", error);
      } finally {
        setFinanceLoading(false);
      }
    };
    
    if (isLoggedIn && isAuthorizedFinance) fetchFinanceData();
    else setFinanceLoading(false);

    // Fetch Recent Piket Notes
    const fetchPiketNotes = async () => {
      setPiketLoading(true);
      try {
        const resp = await fetch(`${FINANCE_API_URL}?sheetName=Piket`);
        const data = await resp.json();
        if (data && Array.isArray(data)) {
          // Ambil 3 catatan terbaru yang isinya tidak kosong
          const valid = data
            .filter((item: any) => item.id && item.amount)
            .reverse()
            .slice(0, 3);
          setPiketNotes(valid);
        }
      } catch (e) {
        console.error("Dashboard piket fetch error:", e);
      } finally {
        setPiketLoading(false);
      }
    };

    fetchPiketNotes();

    const fetchACMonitor = async () => {
      setAcLoading(true);
      try {
        const resp = await fetch(`${FINANCE_API_URL}?sheetName=Monitor_AC`);
        const data = await resp.json();
        if (data && Array.isArray(data)) {
          let terpasang = 0, belum = 0, baik = 0, perbaikan = 0, rusak = 0;
          
          let fetchedMap = new Map();
          data.forEach(item => {
            const ruang = parseInt(item.ruang || item.Ruang);
            if (!isNaN(ruang)) fetchedMap.set(ruang, item);
          });
          
          for (let i=1; i<=40; i++) {
            let status = 'Belum Terpasang';
            let kondisi = '-';
            if (fetchedMap.has(i)) {
              status = fetchedMap.get(i).status || fetchedMap.get(i).Status || 'Belum Terpasang';
              kondisi = fetchedMap.get(i).kondisi || fetchedMap.get(i).Kondisi || '-';
            } else {
              if (i >= 1 && i <= 6) { status = 'Terpasang'; kondisi = 'Baik'; }
              else if ((i >= 17 && i <= 20) || (i >= 25 && i <= 40)) { status = 'Terpasang'; kondisi = 'Baik'; }
            }
            
            if (status === 'Terpasang') terpasang++; else belum++;
            if (kondisi === 'Baik') baik++;
            else if (kondisi === 'Perbaikan') perbaikan++;
            else if (kondisi === 'Rusak') rusak++;
          }
          
          setAcMonitorData({ terpasang, belum, baik, perbaikan, rusak, total: 40 });
        }
      } catch (e) {
        console.error("Dashboard AC fetch error:", e);
      } finally {
        setAcLoading(false);
      }
    };
    
    const fetchCapexProjects = async () => {
      setCapexLoading(true);
      try {
        const resp = await fetch(`${FINANCE_API_URL}?sheetName=Progres_CAPEX`);
        const data = await resp.json();
        if (data && Array.isArray(data)) {
          const defaults = [
            { id: 'PRJ-1', nama: 'Peremajaan keramik pada 3 ruang kelas (R.1 – R.3)', progress: 0 },
            { id: 'PRJ-2', nama: 'Peremajaan talang air pada dak beton lantai 3', progress: 0 },
            { id: 'PRJ-3', nama: 'Peremajaan dak beton masjid', progress: 0 },
            { id: 'PRJ-4', nama: 'Peremajaan cat dinding pada 10 ruang kelas (R.7 – R.16)', progress: 0 },
            { id: 'PRJ-5', nama: 'Peremajaan beton lapangan olahraga (basket)', progress: 0 },
            { id: 'PRJ-6', nama: 'Pengadaan interior Laboratorium TEFA (Lab. 3)', progress: 0 },
            { id: 'PRJ-7', nama: 'Pembangunan Malang Techno Park (Lanjutan)', progress: 0 }
          ];
          const mapped = defaults.map(def => {
            const found = data.find((d:any) => d.id === def.id || d.ID === def.id);
            return {
              ...def,
              progress: found ? Number(found.progress || found.Progress || 0) : 0
            };
          });
          setCapexProjects(mapped);
        }
      } catch (e) {
        console.error("Capex fetch error:", e);
      } finally {
        setCapexLoading(false);
      }
    };
    
    const fetchWifiMonitor = async () => {
      setWifiLoading(true);
      try {
        const resp = await fetch(`${FINANCE_API_URL}?sheetName=Monitor_Wifi`);
        const data = await resp.json();
        if (data && Array.isArray(data) && data.length > 0) {
          const mapped = data.filter((d:any) => (d.id || d.ID) && (d.tanggal || d.Tanggal)).map((item:any) => {
            let dateStr = String(item.tanggal || item.Tanggal || '').trim();

            return {
              id: item.id || item.ID,
              date: dateStr,
              count: parseInt(item.count || item.Count || 0)
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

          setWifiData(mapped);
        } else {
           setWifiData(initialDeviceData); // Fallback to demo layout logic
        }
      } catch (e) {
        setWifiData(initialDeviceData);
      } finally {
        setWifiLoading(false);
      }
    };

    const fetchNetSnapshot = async () => {
      try {
        const resp = await fetch(`${FINANCE_API_URL}?sheetName=Monitor_Net`);
        const data = await resp.json();
        if (data && Array.isArray(data) && data.length > 0) {
          setNetSnapshot(data[data.length - 1]);
          const latestWithSnapshot = [...data].reverse().find((row: any) => String(getSnapshotSource(row)).trim() !== '');
          setNetSnapshotThumb(latestWithSnapshot || null);
        } else {
          setNetSnapshot(null);
          setNetSnapshotThumb(null);
        }
      } catch (e) {
        console.error("Net monitor fetch error:", e);
        setNetSnapshotThumb(null);
      }
    };

    if (isLoggedIn) fetchACMonitor();
    fetchCapexProjects();
    fetchWifiMonitor();
    fetchNetSnapshot();

  }, [isAuthorizedFinance, isLoggedIn]);

  const handleDeletePiket = async (id: string, keterangan: string) => {
    if (!confirm(`Hapus catatan dari "${keterangan}"?`)) return;
    
    setPiketLoading(true);
    try {
      await fetch(FINANCE_API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ 
          action: 'DELETE_RECORD', 
          sheetName: 'Piket',
          sheet: 'Piket',
          id: id,
          ID: id
        })
      });
      
      setPiketNotes(prev => prev.filter(n => n.id !== id));
      // Refresh after a delay
      setTimeout(() => {
        // Simple manual refresh of state
        setPiketLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Delete dashboard piket failed:", error);
      alert("Gagal menghapus.");
      setPiketLoading(false);
    }
  };

  const isAuthorizedToManagePiket = (noteSender: string) => {
    if (!isLoggedIn || !currentUser) return false;
    
    const sender = (noteSender || '').trim().toLowerCase();
    const currentName = (currentUser.nama || '').trim().toLowerCase();
    const role = (currentUser.roleAplikasi || '').toLowerCase();
    
    return sender === currentName || 
           role.includes('pimpinan') || 
           role.includes('admin') ||
           role.includes('executive');
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const formatPiketDate = (dateValue: any) => {
    if (!dateValue || dateValue === "") return "-";
    try {
      const d = new Date(dateValue);
      if (isNaN(d.getTime())) return dateValue;
      
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      const h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, '0');
      
      return `${mm}-${dd}-${yyyy} ${h}:${m}`;
    } catch (e) {
      return dateValue;
    }
  };



  return (
    <div className="animate-fade-in">
      {isLoggedIn && (
        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--accent-blue)', background: 'linear-gradient(90deg, var(--accent-blue-ghost), transparent)' }}>
          <div style={{ padding: userPicture ? '0' : '8px', background: 'var(--bg-card)', borderRadius: '12px', color: 'var(--accent-blue)', border: '1px solid var(--border-subtle)', width: '40px', height: '40px', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {userPicture ? (
              <img src={userPicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <UserCircle2 size={20} />
            )}
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>Hai, {getCurrentUser().nama.split(' ')[0]}!</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0', fontStyle: 'italic', opacity: 0.9 }}>"Melayani dengan hati, memberikan yang terbaik untuk setiap solusi."</p>
          </div>
        </div>
      )}

      <div className="flex-row-responsive" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Pusat Kendali Layanan</h1>
          <p className="page-subtitle" style={{ margin: 0, maxWidth: '800px' }}>
            Monitor penugasan, progres rutin, dan proyek tim IT, Lab & Sarana Prasarana.
          </p>
        </div>
      </div>

      <div className="glass-panel delay-050" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--accent-violet)', background: 'linear-gradient(135deg, rgba(139,92,246,0.06), transparent)' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
          <div>
            <h3 style={{ fontSize: '1.02rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCheck size={18} color="var(--accent-violet)" /> Personil Sarpras
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Susunan personil mulai Pimpinan hingga PIC operasional.
            </p>
          </div>
          <span className="badge badge-info" style={{ borderColor: 'rgba(139,92,246,0.35)', color: 'var(--accent-violet)', background: 'rgba(139,92,246,0.12)' }}>
            {sarprasPersonnel.length} Personil
          </span>
        </div>
        <div style={{ padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.8rem' }}>
          {sarprasPersonnel.map((person) => (
            <div key={person.id} className="glass-panel" style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35 }}>
                  {person.nama}
                </div>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    whiteSpace: 'nowrap',
                    color: person.roleAplikasi === ROLES.PIMPINAN ? 'var(--accent-amber)' : person.roleAplikasi === ROLES.KOORDINATOR_SARPRAS ? 'var(--accent-blue)' : 'var(--accent-emerald)',
                    background: person.roleAplikasi === ROLES.PIMPINAN ? 'rgba(245,158,11,0.14)' : person.roleAplikasi === ROLES.KOORDINATOR_SARPRAS ? 'rgba(59,130,246,0.14)' : 'rgba(16,185,129,0.14)',
                    border: person.roleAplikasi === ROLES.PIMPINAN ? '1px solid rgba(245,158,11,0.3)' : person.roleAplikasi === ROLES.KOORDINATOR_SARPRAS ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(16,185,129,0.3)'
                  }}
                >
                  {person.roleAplikasi === ROLES.PIMPINAN ? 'Pimpinan' : person.roleAplikasi === ROLES.KOORDINATOR_SARPRAS ? 'Koordinator' : 'PIC'}
                </span>
              </div>
              <div style={{ marginTop: '0.45rem', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {person.jabatan}
              </div>
              <div style={{ marginTop: '0.45rem', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                NIP: {person.nip}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DASHBOARD AC MONITORING SECTION */}
      {isLoggedIn && (
        <div className="glass-panel delay-100" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(59,130,246,0.03), transparent)', borderLeft: '4px solid var(--accent-blue)' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Wind size={18} color="var(--accent-blue)" /> Pemantauan Kondisi AC Kelas (R.1 - 40)
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status ketersediaan dan kesiapan operasional pendingin ruangan</p>
            </div>
            <a href="#/ac-monitor" className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>Detail AC Ruang</a>
          </div>
          
          <div style={{ padding: '1.25rem' }}>
            {acLoading ? (
              <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" color="var(--accent-blue)" /></div>
            ) : acMonitorData ? (
              <div className="dashboard-grid">
                {/* Stats Kiri */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="glass-panel" style={{ padding: '1rem', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cakupan Terpasang</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-blue)' }}>{((acMonitorData.terpasang / 40) * 100).toFixed(0)}%</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700 }}>{acMonitorData.terpasang} Ruang</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--accent-rose)' }}>{acMonitorData.belum} Belum Ada</div>
                    </div>
                  </div>
                  
                  <div className="glass-panel" style={{ padding: '1rem', background: 'var(--bg-card)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Penanganan & Perbaikan Terkini</div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, padding: '0.75rem', background: 'var(--accent-rose-ghost)', borderRadius: '8px', borderLeft: '2px solid var(--accent-rose)' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-rose)' }}>{acMonitorData.perbaikan + acMonitorData.rusak}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Mati / Perbaikan</div>
                      </div>
                      <div style={{ flex: 1, padding: '0.75rem', background: 'var(--accent-emerald-ghost)', borderRadius: '8px', borderLeft: '2px solid var(--accent-emerald)' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>{acMonitorData.baik}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Normal / Baik</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grafik Kanan */}
                <div className="glass-panel" style={{ padding: '1rem', background: 'var(--bg-card)', height: '220px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Ratio Kondisi Fisik AC</div>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={[
                            { name: 'Baik', value: acMonitorData.baik, color: '#10b981' },
                            { name: 'Perbaikan', value: acMonitorData.perbaikan, color: '#f59e0b' },
                            { name: 'Rusak Total', value: acMonitorData.rusak, color: '#e11d48' },
                          ].filter(d => d.value > 0)} 
                          innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value"
                        >
                          { [
                            { name: 'Baik', value: acMonitorData.baik, color: '#10b981' },
                            { name: 'Perbaikan', value: acMonitorData.perbaikan, color: '#f59e0b' },
                            { name: 'Rusak Total', value: acMonitorData.rusak, color: '#e11d48' },
                          ].filter(d => d.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-focus)', borderRadius: '8px', fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                      <Wind size={20} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Data tidak tersedia.</div>
            )}
          </div>
        </div>
      )}

      {/* DASHBOARD WIFI MONITORING SECTION */}
      <div className="glass-panel delay-150" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(59,130,246,0.03), transparent)', borderLeft: '4px solid var(--accent-blue)' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Smartphone size={18} color="var(--accent-blue)" /> Pemantauan Trend Perangkat (WiFi Client)
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Grafik total riwayat perangkat terhubung harian</p>
            </div>
            <a href="#/it" className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>Detail & Update &rarr;</a>
          </div>
          
          <div style={{ padding: '1.25rem' }}>
            {wifiLoading ? (
               <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" color="var(--accent-blue)" /></div>
            ) : (
              <div style={{ width: '100%', height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wifiData} margin={{ top: 28, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="date"
                      stroke="var(--text-muted)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => {
                        const parts = String(val).split('-');
                        return parts.length === 3 ? `${parts[0]}/${parts[1]}` : String(val).replace(/\s+2026|\s+26/g, '');
                      }}
                    />
                    <YAxis
                      domain={['dataMin - 50', 'dataMax + 50']}
                      stroke="var(--text-muted)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}
                    />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-focus)', borderRadius: '8px', fontSize: '11px' }}
                      formatter={(value: any) => [`${Number(value).toLocaleString()} Perangkat`, 'Total Client']}
                      labelFormatter={(label) => {
                        const parts = String(label).split('-');
                        return parts.length === 3 ? `${parts[0]}-${parts[1]}-${parts[2]}` : String(label).replace(/\s+2026|\s+26/g, '');
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                      {wifiData.map((entry: any, index: number) => {
                        const counts = wifiData.map((d: any) => d.count);
                        const min = Math.min(...counts);
                        const max = Math.max(...counts);
                        const prev = index > 0 ? wifiData[index - 1].count : entry.count;
                        let color = '#3b82f6';
                        if (entry.count === min) color = '#10b981';
                        else if (entry.count === max) color = '#f43f5e';
                        else color = entry.count < prev ? '#22c55e' : '#f87171';
                        return <Cell key={`cell-${index}`} fill={color} fillOpacity={0.85} />;
                      })}
                      <LabelList dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 700, fill: 'var(--text-secondary)' }} formatter={(v: any) => Number(v).toLocaleString()} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

          </div>
      </div>

      {/* DASHBOARD CAPEX PROJECTS SECTION */}
      <div className="glass-panel delay-200" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(245,158,11,0.03), transparent)', borderLeft: '4px solid var(--accent-amber)' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <Briefcase size={18} color="var(--accent-amber)" /> Progres Pekerjaan & Pengadaan CAPEX
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pemantauan target penyelesaian peremajaan dan pembangunan 2026</p>
            </div>
            <a href="#/capex" className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>Monitor CAPEX &rarr;</a>
          </div>
          
          <div style={{ padding: '1.25rem' }}>
            {capexLoading ? (
              <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" color="var(--accent-amber)" /></div>
            ) : capexProjects.length > 0 ? (
              <div style={{ width: '100%', height: '280px' }}>
                <ResponsiveContainer>
                  <BarChart data={sortedCapexProjects} layout="vertical" margin={{ left: 10, right: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} stroke="var(--text-muted)" fontSize={11} tickFormatter={v => `${v}%`} />
                    <YAxis dataKey="nama" type="category" width={180} stroke="var(--text-muted)" fontSize={10} tickFormatter={(val) => val.length > 25 ? val.substring(0, 25) + '...' : val} />
                    <RechartsTooltip formatter={(v: any) => [`${v}%`, 'Progres']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-focus)', borderRadius: '8px' }} />
                    <Bar dataKey="progress" radius={[0, 4, 4, 0]} barSize={20}>
                      {sortedCapexProjects.map((ent, idx) => (
                        <Cell key={`cell-${idx}`} fill={ent.progress >= 100 ? '#10b981' : ent.progress >= 50 ? '#3b82f6' : '#f59e0b'} />
                      ))}
                      <LabelList dataKey="progress" position="right" formatter={(v: any) => `${Math.round(Number(v) || 0)}%`} style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Data proyek belum tersedia.</div>
            )}
          </div>
      </div>

      {/* Jadwal Piket Sarpras Section - Moved to Top */}
      <div className="glass-panel delay-300" style={{ marginBottom: '2rem', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'linear-gradient(90deg, var(--accent-violet-ghost), transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Calendar size={20} color="var(--accent-violet)" /> Jadwal Piket Peminjaman Sarpras
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Berlaku mulai 31 Maret 2026</p>
          </div>
          <div className="badge badge-info" style={{ background: 'var(--accent-violet-ghost)', color: 'var(--accent-violet)', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
            UPDATE TERBARU
          </div>
        </div>
        
        <div className="flex-row-responsive" style={{ padding: '1.25rem', gap: '2rem', alignItems: 'flex-start' }}>
          {/* Day Cards */}
          <div style={{ flex: 1.5, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            {[
              { day: 'Senin', personnel: ['Chusni', 'Whyna', 'Rudi'], color: 'var(--accent-blue)' },
              { day: 'Selasa', personnel: ['Bidin', 'Bagus', 'Rudi'], color: 'var(--accent-emerald)' },
              { day: 'Rabu', personnel: ['Zakaria', 'Yoko', 'Rudi'], color: 'var(--accent-violet)' },
              { day: 'Kamis', personnel: ['Chandra', 'Nico', 'Rudi'], color: 'var(--accent-amber)' },
              { day: 'Jumat', personnel: ['Ayat', 'Amalia', 'Rudi'], color: 'var(--accent-rose)' },
            ].map((item, idx) => {
              const today = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date());
              const isToday = today.toLowerCase() === item.day.toLowerCase();
              
              return (
                <div key={idx} style={{ 
                  padding: '1rem', 
                  borderRadius: '12px', 
                  background: isToday ? `${item.color}15` : 'rgba(255,255,255,0.02)', 
                  border: `1px solid ${isToday ? item.color : 'var(--border-subtle)'}`,
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  boxShadow: isToday ? `0 0 15px ${item.color}20` : 'none',
                  transform: isToday ? 'scale(1.02)' : 'none',
                  zIndex: isToday ? 2 : 1
                }}>
                  {isToday && (
                    <div style={{ 
                      position: 'absolute', 
                      top: '-10px', 
                      right: '10px', 
                      background: item.color, 
                      color: 'white', 
                      fontSize: '0.6rem', 
                      fontWeight: 800, 
                      padding: '2px 8px', 
                      borderRadius: '10px',
                      textTransform: 'uppercase',
                      boxShadow: `0 2px 8px ${item.color}60`
                    }}>
                      Hari Ini
                    </div>
                  )}
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', color: isToday ? item.color : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {item.day}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {item.personnel.map((p, pIdx) => (
                      <div key={pIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: p === 'Rudi' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {p === 'Rudi' ? <ShieldCheck size={14} color="var(--accent-blue)" /> : <UserCheck size={14} />}
                        <span style={{ fontWeight: p === 'Rudi' ? 600 : 400 }}>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Provisions & Rules */}
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '1.25rem', border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: '0.9rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)' }}>
              <Info size={18} /> Ketentuan & Himbauan
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                "Piket berdasarkan jumlah jam kosong terbanyak.",
                "Standby di Sarpras saat jam kosong untuk melayani.",
                "Pak Rudi standby penuh setiap hari (Backup non-guru).",
                "Layanan mencakup peminjaman barang harian.",
                "Ruang, mobil & event tanggung jawab Pak Ekon (dibantu piket).",
                "Wajib memastikan semua data terinput di aplikasi.",
                "Pastikan pengembalian barang tepat waktu/konfirmasi.",
                "Sampaikan informasi handover ke petugas piket berikutnya."
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: '18px', height: '18px', borderRadius: '50%', background: 'var(--accent-cyan-ghost)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>
                    {i + 1}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', lineHeight: '1.4', color: 'var(--text-secondary)' }}>{text}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1.25rem', padding: '0.75rem', borderRadius: '8px', background: 'var(--accent-amber-ghost)', border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '0.7rem', color: 'var(--accent-amber)', fontStyle: 'italic' }}>
              * mari bekerja sama untuk kelancaran layanan excelent dari sarana
            </div>
          </div>
        </div>
      </div>

      {/* Catatan Piket Terkini */}
      <div className="glass-panel delay-300" style={{ marginBottom: '2rem', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={18} color="var(--accent-blue)" /> Catatan Temuan Piket Terkini
          </h3>
          <a href="#/duty-notes" style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 600, textDecoration: 'none' }}>Lihat Semua &rarr;</a>
        </div>
        <div style={{ padding: '0 1.25rem 1.25rem 1.25rem' }}>
          {piketLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}><Loader2 size={24} className="animate-spin" color="var(--accent-blue)" /></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {piketNotes.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed var(--border-subtle)' }}>
                  Belum ada catatan temuan baru di database.
                </div>
              ) : piketNotes.map((note, idx) => (
                <div key={idx} className="note-card-dashboard" style={{ 
                  padding: '1rem', 
                  borderRadius: '12px', 
                  background: 'rgba(255,255,255,0.02)', 
                  border: `1px solid ${note.type === 'Urgent' ? 'rgba(244, 63, 94, 0.2)' : 'var(--border-subtle)'}`,
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span className={`badge ${note.kategori === 'Temuan' ? 'badge-danger' : 'badge-info'}`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>
                      {note.kategori}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{formatPiketDate(note.tanggal)}</span>
                  </div>
                  <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.4', fontStyle: 'italic' }}>
                    "{note.amount}"
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 600 }}>
                      <UserCircle2 size={14} /> {note.keterangan.split(' ')[0]}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      {isAuthorizedToManagePiket(note.keterangan) && (
                        <>
                          <button 
                            onClick={(e) => { e.preventDefault(); window.location.hash = '/duty-notes'; }} 
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                            title="Edit"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button 
                            onClick={(e) => { e.preventDefault(); handleDeletePiket(note.id, note.keterangan); }} 
                            style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', padding: '2px' }}
                            title="Hapus"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                      {note.type === 'Urgent' && <AlertCircle size={14} color="var(--accent-rose)" className="animate-pulse" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


      {isLoggedIn && isAuthorizedFinance && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {/* Internal Sarpra Cash Monitor */}
          <div className="glass-panel stat-card" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, var(--accent-blue-ghost), transparent)', borderLeft: '4px solid var(--accent-blue)' }}>
             <div className="flex-row-responsive" style={{ gap: '1rem', alignItems: 'flex-start' }}>
               <div style={{ flex: 1 }}>
                 <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <Wallet size={18} color="var(--accent-blue)" /> Kas Internal Sarpra {financeLoading && <Loader2 size={14} className="animate-spin" />}
                 </h3>
                 <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Monitoring dana operasional internal</p>
               </div>
               <div style={{ textAlign: 'right' }}>
                 <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                   {financeLoading ? '---' : formatIDR(internalFinance.balance)}
                 </div>
                 <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Saldo Sarpra</div>
               </div>
             </div>
             {internalFinance.categories.length > 0 && (
               <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                 <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Analisa Pengeluaran Internal:</p>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                   {internalFinance.categories.slice(0, 3).map((c, idx) => (
                     <div key={idx}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.25rem' }}>
                         <span style={{ color: 'var(--text-muted)' }}>{c.name}</span>
                         <span style={{ fontWeight: 600 }}>{formatIDR(c.value)}</span>
                       </div>
                       <div className="progress-bar-bg" style={{ height: '4px' }}>
                         <div className="progress-bar-fill" style={{ width: `${(c.value / internalFinance.expense) * 100}%`, background: 'var(--accent-blue)' }}></div>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             )}
             <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px dashed var(--border-subtle)' }}>
               <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Transaksi terakhir</div>
               {internalLastTx ? (
                 <div style={{ marginTop: '0.2rem', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                   <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{internalLastTx.date}</span> · {internalLastTx.note}
                   <span style={{ marginLeft: '0.45rem', fontWeight: 700, color: internalLastTx.type === 'in' ? 'var(--accent-emerald)' : internalLastTx.type === 'out' ? 'var(--accent-rose)' : 'var(--text-primary)' }}>
                     {txAmountText(internalLastTx.amount, internalLastTx.type)}
                   </span>
                 </div>
               ) : (
                 <div style={{ marginTop: '0.2rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>Belum ada transaksi.</div>
               )}
             </div>
          </div>

          {/* TU Cash Monitor */}
          <div className="glass-panel stat-card" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, var(--accent-rose-ghost), transparent)', borderLeft: '4px solid var(--accent-rose)' }}>
             <div className="flex-row-responsive" style={{ gap: '1rem', alignItems: 'flex-start' }}>
               <div style={{ flex: 1 }}>
                 <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <Coins size={18} color="var(--accent-rose)" /> Kas Operasional TU {financeLoading && <Loader2 size={14} className="animate-spin" />}
                 </h3>
                 <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Dana operasional dari Bendahara TU</p>
               </div>
               <div style={{ textAlign: 'right' }}>
                 <div style={{ fontSize: '1.15rem', fontWeight: 700, color: tuFinance.balance >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                   {financeLoading ? '---' : formatIDR(tuFinance.balance)}
                 </div>
                 <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Saldo TU</div>
               </div>
             </div>
             <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Akumulasi Kredit (Keluar)</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-rose)' }}>{financeLoading ? '---' : formatIDR(tuFinance.expense)}</div>
               </div>
               <a href="#/operational-cash" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent-rose)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.6rem', background: 'rgba(244,63,94,0.1)', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.2)' }}>Lihat Detail →</a>
             </div>
             <div style={{ marginTop: '0.7rem', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
               <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.15rem' }}>Transaksi terakhir</div>
               {tuLastTx ? (
                 <span>
                   <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{tuLastTx.date}</span> · {tuLastTx.note}
                   <span style={{ marginLeft: '0.45rem', fontWeight: 700, color: tuLastTx.type === 'in' ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                     {txAmountText(tuLastTx.amount, tuLastTx.type)}
                   </span>
                 </span>
               ) : 'Belum ada transaksi.'}
             </div>
          </div>

          {/* AC Cash Monitor */}
          <div className="glass-panel stat-card" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, var(--accent-emerald-ghost), transparent)', borderLeft: '4px solid var(--accent-emerald)' }}>
             <div className="flex-row-responsive" style={{ gap: '1rem', alignItems: 'flex-start' }}>
               <div style={{ flex: 1 }}>
                 <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <Wind size={18} color="var(--accent-emerald)" /> Kas Pemeliharaan AC {financeLoading && <Loader2 size={14} className="animate-spin" />}
                 </h3>
                 <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Monitoring dana perawatan AC</p>
               </div>
               <div style={{ textAlign: 'right' }}>
                 <div style={{ fontSize: '1.15rem', fontWeight: 700, color: acFinance.balance >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                   {financeLoading ? '---' : formatIDR(acFinance.balance)}
                 </div>
                 <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Saldo AC</div>
               </div>
             </div>
             <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Akumulasi Kredit (Keluar)</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>{financeLoading ? '---' : formatIDR(acFinance.expense)}</div>
               </div>
               <a href="#/ac-cash" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent-emerald)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.6rem', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>Lihat Detail →</a>
             </div>
             <div style={{ marginTop: '0.7rem', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
               <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.15rem' }}>Transaksi terakhir</div>
               {acLastTx ? (
                 <span>
                   <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{acLastTx.date}</span> · {acLastTx.note}
                   <span style={{ marginLeft: '0.45rem', fontWeight: 700, color: acLastTx.type === 'in' ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                     {txAmountText(acLastTx.amount, acLastTx.type)}
                   </span>
                 </span>
               ) : 'Belum ada transaksi.'}
             </div>
          </div>
        </div>
      )}


      {/* NETWORK INFRASTRUCTURE SUMMARY */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(16,185,129,0.03), transparent)', borderLeft: '4px solid var(--accent-emerald)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="var(--accent-emerald)" /> Infrastructure Health Snapshot
            </h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              Last update: {formatSnapshotDate(netSnapshot?.tanggal || netSnapshot?.Tanggal || '')}
            </span>
          </div>
          
          <div className="dashboard-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>ISP Status (Avg)</span>
                <span className="badge badge-success">Optimal</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Server Uptime</span>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>99.9%</span>
              </div>
              <div style={{ marginTop: '0.35rem' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Camera size={12} /> Snapshot terbaru
                </div>
                {netSnapshotThumb && getSnapshotSource(netSnapshotThumb) ? (
                  <button
                    onClick={() => setNetSnapshotLightbox({
                      src: getSnapshotSource(netSnapshotThumb),
                      tanggal: formatSnapshotDate(netSnapshotThumb?.tanggal || netSnapshotThumb?.Tanggal || '')
                    })}
                    title="Klik untuk zoom snapshot jaringan"
                    style={{ border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.25rem', background: 'rgba(0,0,0,0.2)', cursor: 'zoom-in', width: '130px', display: 'block' }}
                  >
                    <img
                      src={getSnapshotSource(netSnapshotThumb)}
                      alt="Thumbnail snapshot jaringan terbaru"
                      style={{ width: '100%', height: '72px', objectFit: 'cover', borderRadius: '7px', display: 'block' }}
                    />
                  </button>
                ) : (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', border: '1px dashed var(--border-subtle)', borderRadius: '8px', padding: '0.55rem 0.6rem', display: 'inline-block' }}>
                    Belum ada snapshot
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div className="glass-panel" style={{ padding: '0.75rem', flex: 1, minWidth: '150px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Sangfor CPU Load</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: parseInt(netSnapshot?.sang_cpu || "0") > 75 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                  {netSnapshot?.sang_cpu || "80"}%
                </div>
              </div>
              <div className="glass-panel" style={{ padding: '0.75rem', flex: 1, minWidth: '150px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Peak Traffic Line 1</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{netSnapshot?.i1_rx || "366"} <small style={{ fontWeight: 400, fontSize: '0.6rem' }}>Mbps</small></div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '1rem', textAlign: 'right' }}>
            <a href="#/it" style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', textDecoration: 'none' }}>View Network Topology Map &rarr;</a>
          </div>
      </div>

      {netSnapshotLightbox && (
        <div
          onClick={() => setNetSnapshotLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2100, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column', padding: '1rem 1.25rem 1.25rem', cursor: 'zoom-out', overflowY: 'auto' }}
        >
          <button
            onClick={() => setNetSnapshotLightbox(null)}
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '999px', width: '34px', height: '34px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Tutup zoom snapshot"
          >
            <X size={18} />
          </button>
          <div style={{ width: '100%', maxWidth: '960px', textAlign: 'center', marginTop: '0.25rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: '0.65rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>
              Snapshot Jaringan — {netSnapshotLightbox.tanggal}
            </div>
            <img
              src={netSnapshotLightbox.src}
              alt={`Snapshot Jaringan ${netSnapshotLightbox.tanggal}`}
              style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 120px)', objectFit: 'contain', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}
            />
          </div>
        </div>
      )}

      {/* Analisa Utilitas PLN & PDAM */}
      <div className="dashboard-grid delay-300" style={{ marginBottom: '1.5rem' }}>
        <div className="glass-panel chart-container" style={{ minHeight: '320px', background: 'linear-gradient(135deg, var(--accent-amber-ghost), transparent)' }}>
          <div className="chart-header">
            <div>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={18} color="var(--accent-amber)" /> Tren Tagihan PLN (Listrik)
              </h3>
              <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Fasilitas & Gedung Sekolah</p>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getUtilityChartData()} margin={{ top: 25, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `Rp${v/1000000}jt`} />
                <RechartsTooltip 
                  formatter={(v: any) => formatIDR(v as number)}
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-focus)', borderRadius: '8px', fontSize: '10px' }}
                />
                <Bar dataKey="PLN" fill="var(--accent-amber)" radius={[4, 4, 0, 0]} barSize={24}>
                  <LabelList 
                    dataKey="PLN" 
                    position="top" 
                    formatter={(v: any) => `${(Number(v)/1000000).toFixed(1)}jt`} 
                    style={{ fill: 'var(--accent-amber)', fontSize: '10px', fontWeight: 600 }} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel chart-container" style={{ minHeight: '320px', background: 'linear-gradient(135deg, var(--accent-cyan-ghost), transparent)' }}>
          <div className="chart-header">
            <div>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Droplets size={18} color="var(--accent-cyan)" /> Tren Tagihan PDAM (Air)
              </h3>
              <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Pemakaian Air Bersih Terpusat</p>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getUtilityChartData()} margin={{ top: 25, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `Rp${(v/1000000).toFixed(1)}jt`} />
                <RechartsTooltip 
                  formatter={(v: any) => formatIDR(v as number)}
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-focus)', borderRadius: '8px', fontSize: '10px' }}
                />
                <Bar dataKey="PDAM" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} barSize={24}>
                  <LabelList 
                    dataKey="PDAM" 
                    position="top" 
                    formatter={(v: any) => Number(v) < 1000000 ? `${(Number(v)/1000).toFixed(0)}rb` : `${(Number(v)/1000000).toFixed(1)}jt`} 
                    style={{ fill: 'var(--accent-cyan)', fontSize: '10px', fontWeight: 600 }} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>



    </div>
  );
};

export default Dashboard;
