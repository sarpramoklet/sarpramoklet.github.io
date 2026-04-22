import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LabelList, LineChart, Line, Legend } from 'recharts';
import { UserCircle2, Wallet, Loader2, Zap, Droplets, Calendar, Info, UserCheck, MessageSquare, AlertCircle, Edit3, Trash2, Wind, Briefcase, Smartphone, Activity, Coins, Camera, X, RefreshCw, Heart, ExternalLink } from 'lucide-react';
import { getCurrentUser, ROLES, USERS } from '../data/organization';
import { mergeCapexProjects } from '../data/capexProjects';
import { getUtilityChartData } from '../data/utilities';
import { useProfileThumbByEmail } from '../hooks/useProfileThumbByEmail';
import UserAvatar from '../components/UserAvatar';
import { getMotivationForLogin, getPublicEducationalMotivation } from '../utils/motivation';
import { pushActionNotification } from '../utils/actionNotifications';
import {
  buildMonitorIssueSummary,
  CLASSROOM_LOCATION_OPTIONS,
  CLASSROOM_MONITOR_SHEET,
  CLASSROOM_REFERENCE_TOTAL,
  compareClassroomRooms,
  getShortClassroomLabel,
  normalizeClassroomMonitorRows,
} from '../utils/classroomMonitor';
import type { ClassroomMonitorEntry } from '../utils/classroomMonitor';

const FINANCE_API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";
const MOKLET_BASIC_AUTH_USERNAME_KEY = 'mokletBasicAuthUsername';
const MOKLET_BASIC_AUTH_PASSWORD_KEY = 'mokletBasicAuthPassword';

const canUseSessionStorage = () => typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const getStoredMokletBasicAuth = () => {
  if (!canUseSessionStorage()) return { username: '', password: '' };

  return {
    username: window.sessionStorage.getItem(MOKLET_BASIC_AUTH_USERNAME_KEY)?.trim() || '',
    password: window.sessionStorage.getItem(MOKLET_BASIC_AUTH_PASSWORD_KEY) || '',
  };
};

const hasStoredMokletBasicAuth = () => {
  const credentials = getStoredMokletBasicAuth();
  return Boolean(credentials.username && credentials.password);
};

const setStoredMokletBasicAuth = (username: string, password: string) => {
  if (!canUseSessionStorage()) return;

  window.sessionStorage.setItem(MOKLET_BASIC_AUTH_USERNAME_KEY, username.trim());
  window.sessionStorage.setItem(MOKLET_BASIC_AUTH_PASSWORD_KEY, password);
};

const clearStoredMokletBasicAuth = () => {
  if (!canUseSessionStorage()) return;

  window.sessionStorage.removeItem(MOKLET_BASIC_AUTH_USERNAME_KEY);
  window.sessionStorage.removeItem(MOKLET_BASIC_AUTH_PASSWORD_KEY);
};



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
const ONT_SERIES = [
  { key: 'ast', label: 'Astinet', color: '#fb923c' },
  { key: 'i1', label: 'Indibizz 1', color: '#60a5fa' },
  { key: 'i2', label: 'Indibizz 2', color: '#a78bfa' },
  { key: 'i3', label: 'Indibizz 3', color: '#fbbf24' },
  { key: 'i4', label: 'Indibizz 4', color: '#34d399' },
  { key: 'i5', label: 'Indibizz 5', color: '#f472b6' }
];
const toNum = (v: any): number => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const inferDateFromNetId = (id: any): string => {
  const m = String(id || '').match(/NET-(\d{2})(\d{2})(\d{2})$/);
  if (!m) return '';
  return `${m[1]}-${m[2]}-${m[3]}`;
};
const inferLegacySeedDate = (row: any): string => {
  const sig = [
    toNum(row?.i1_rx), toNum(row?.i1_tx),
    toNum(row?.i2_rx), toNum(row?.i2_tx),
    toNum(row?.i3_rx), toNum(row?.i3_tx),
    toNum(row?.i4_rx), toNum(row?.i4_tx),
    toNum(row?.i5_rx), toNum(row?.i5_tx),
    toNum(row?.ast_rx), toNum(row?.ast_tx),
  ].join('|');
  if (sig === '278|30.9|277|22.5|280|58.6|162|8.26|118|8.75|5.97|2.22') return '01-04-26';
  if (sig === '366|21.8|253|15.4|270|18.7|101|14.3|130|5.44|28.9|1.21') return '06-04-26';
  return '';
};
const toShortDate = (raw: any): string => {
  const d = parseWifiDateValue(raw);
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
};
const parseShortDateTs = (shortDate: string): number => {
  const p = String(shortDate || '').split('-');
  if (p.length !== 3) return 0;
  const dd = parseInt(p[0], 10) || 1;
  const mm = (parseInt(p[1], 10) || 1) - 1;
  const yy = parseInt(p[2], 10) || 0;
  return new Date(2000 + yy, mm, dd).getTime();
};
const parseWifiDateValue = (raw: any): Date | null => {
  const s = String(raw || '').trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/);
  if (dmy) {
    const dd = parseInt(dmy[1], 10) || 1;
    const mm = (parseInt(dmy[2], 10) || 1) - 1;
    const yyRaw = parseInt(dmy[3], 10) || 0;
    const yyyy = yyRaw < 100 ? 2000 + yyRaw : yyRaw;
    return new Date(yyyy, mm, dd);
  }

  const parts = s.split(' ');
  if (parts.length >= 3 && monthMap[parts[1]] !== undefined) {
    const dd = parseInt(parts[0], 10) || 1;
    const mm = monthMap[parts[1]];
    const yyRaw = parseInt(parts[2], 10) || 0;
    const yyyy = yyRaw < 100 ? 2000 + yyRaw : yyRaw;
    return new Date(yyyy, mm, dd);
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const formatWifiDateDisplay = (raw: any): string => {
  const d = parseWifiDateValue(raw);
  if (!d) return String(raw || '-');
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = monthList[d.getMonth()] || 'Jan';
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd} ${mm} ${yy}`;
};

type CashRow = {
  tanggal: string;
  keterangan: string;
  debit: number;
  kredit: number;
  saldo: number;
};

type UtilityChartPoint = {
  name: string;
  PLN: number;
  PDAM: number;
};

const toCashNumber = (val: any) => {
  const num = Number(val ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const normalizeCashRows = (rows: any[]): CashRow[] => {
  return rows
    .map((item: any) => ({
      tanggal: String(item.tanggal || item.Tanggal || '').trim(),
      keterangan: String(item.keterangan || item.Keterangan || '').trim(),
      debit: toCashNumber(item.debit || item.Debit),
      kredit: toCashNumber(item.kredit || item.Kredit),
      saldo: toCashNumber(item.saldo || item.Saldo)
    }))
    .filter((item) => (item.tanggal && item.keterangan) || item.debit > 0 || item.kredit > 0);
};

const calculateTuBalance = (rows: CashRow[]) => {
  if (rows.length === 0) return 0;

  let currentBalance = 0;
  if (rows[0].saldo > 0 && rows[0].debit === 0 && rows[0].kredit === 0) {
    currentBalance = rows[0].saldo;
    for (let i = 1; i < rows.length; i++) {
      currentBalance = currentBalance + rows[i].debit - rows[i].kredit;
    }
    return currentBalance;
  }

  for (const item of rows) {
    currentBalance = currentBalance + item.debit - item.kredit;
  }
  return currentBalance;
};

const calculateAcBalance = (rows: CashRow[]) => {
  return rows.reduce((sum, item) => sum + item.debit - item.kredit, 0);
};

const normalizeUtilityMonth = (value: any): string => {
  const raw = String(value ?? '').trim().replace(/^'+/, '');
  if (!raw) return '';

  if (/^\d{4}-\d{2}$/.test(raw)) return raw;

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
      });
      const parts = formatter.formatToParts(parsed);
      const year = parts.find((part) => part.type === 'year')?.value || '1970';
      const month = parts.find((part) => part.type === 'month')?.value || '01';
      return `${year}-${month}`;
    }
    return raw.slice(0, 7);
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
  }

  return '';
};

const parseLegacyUtilityId = (value: any) => {
  const id = String(value || '').trim().toUpperCase();
  if (!id.startsWith('UTL-')) return null;

  const parts = id.split('-').filter(Boolean);
  if (parts.length < 3) return null;

  let month = '';
  if (/^\d{6}$/.test(parts[1])) {
    month = `${parts[1].slice(0, 4)}-${parts[1].slice(4, 6)}`;
  } else {
    const shortMonthMap: Record<string, string> = {
      JAN: '01',
      FEB: '02',
      MAR: '03',
      APR: '04',
      MEI: '05',
      JUN: '06',
      JUL: '07',
      AGT: '08',
      SEP: '09',
      OKT: '10',
      NOV: '11',
      DES: '12',
    };
    const match = parts[1].match(/^([A-Z]{3})(\d{2})$/);
    if (match && shortMonthMap[match[1]]) {
      month = `20${match[2]}-${shortMonthMap[match[1]]}`;
    }
  }

  let jenis = '';
  if (parts[2] === 'PLN' || parts[2] === 'PDAM') {
    jenis = parts[2];
  } else {
    const tail = parts[parts.length - 1];
    if (tail === 'PLN' || tail === 'PDAM') jenis = tail;
  }

  if (!month || !jenis) return null;
  return { month, jenis };
};

const buildUtilityChartFromRows = (rows: any[]): UtilityChartPoint[] => {
  const monthTotals = new Map<string, { PLN: number; PDAM: number }>();

  rows.forEach((row: any) => {
    const legacy = parseLegacyUtilityId(row.ID || row.id);
    const bulan = normalizeUtilityMonth(row.Bulan || row.bulan || row.tanggal || row.Tanggal || legacy?.month);
    const jenisRaw = String(row.Jenis || row.jenis || row.type || row.Type || legacy?.jenis || '').trim().toUpperCase();
    const jenis = jenisRaw === 'PDAM' ? 'PDAM' : 'PLN';
    const nominal = Number(row.Nominal || row.nominal || row.amount || row.Amount || 0) || 0;

    if (!bulan || nominal <= 0) return;

    const current = monthTotals.get(bulan) || { PLN: 0, PDAM: 0 };
    current[jenis] += nominal;
    monthTotals.set(bulan, current);
  });

  const monthKeys = Array.from(monthTotals.keys()).sort((a, b) => a.localeCompare(b)).slice(-5);
  const referenceYear = monthKeys[monthKeys.length - 1]?.slice(0, 4) || '';

  return monthKeys.map((month) => {
    const totals = monthTotals.get(month) || { PLN: 0, PDAM: 0 };
    const [year, mm] = month.split('-');
    const monthIndex = Math.max(0, Math.min(11, (parseInt(mm, 10) || 1) - 1));
    const shortName = monthList[monthIndex] || 'Jan';
    return {
      name: year === referenceYear ? shortName : `${shortName} ${year.slice(-2)}`,
      PLN: totals.PLN,
      PDAM: totals.PDAM,
    };
  });
};

const resolveDutyNoteUser = (note: any) => {
  const senderEmail = String(
    note.senderEmail ||
      note.SenderEmail ||
      note.email ||
      note.Email ||
      ''
  )
    .trim()
    .toLowerCase();

  if (senderEmail) {
    const matchedByEmail = USERS.find((user) => user.email.toLowerCase() === senderEmail);
    if (matchedByEmail) return matchedByEmail;
  }

  const senderName = String(note.keterangan || note.Sender || '').trim().toLowerCase();
  if (!senderName) return undefined;

  return USERS.find((user) => {
    const fullName = user.nama.trim().toLowerCase();
    return fullName === senderName || fullName.includes(senderName) || senderName.includes(fullName);
  });
};

const wrapChartLabel = (value: string, maxCharsPerLine = 28) => {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ['-'];

  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    if (!currentLine) {
      currentLine = word;
      return;
    }

    const candidate = `${currentLine} ${word}`;
    if (candidate.length <= maxCharsPerLine) {
      currentLine = candidate;
      return;
    }

    lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) lines.push(currentLine);
  return lines;
};

const getCapexProgressColor = (progress: number) => {
  if (progress >= 100) return '#10b981';
  if (progress >= 75) return '#22c55e';
  if (progress >= 50) return '#3b82f6';
  return '#f59e0b';
};

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
  const [classroomMonitorRows, setClassroomMonitorRows] = useState<ClassroomMonitorEntry[]>([]);
  const [classroomMonitorLoading, setClassroomMonitorLoading] = useState(false);

  const [acMonitorData, setAcMonitorData] = useState<any>(null);
  const [acLoading, setAcLoading] = useState(false);

  const [capexProjects, setCapexProjects] = useState<any[]>([]);
  const [capexLoading, setCapexLoading] = useState(false);

  // Moklet Service Dashboard data
  const [mokletService, setMokletService] = useState<{
    complaints: { waitingConfirmation: number; onProcess: number } | null;
    roomReservation: { waitingConfirmation: number; activeReservation: number } | null;
    toolsLoan: { waitingConfirmation: number; haveNotReturn: number } | null;
    loading: boolean;
    lastUpdated: Date | null;
    error: boolean;
  }>({
    complaints: null,
    roomReservation: null,
    toolsLoan: null,
    loading: false,
    lastUpdated: null,
    error: false,
  });
  const [mokletRefresh, setMokletRefresh] = useState(0);
  const [showServicePopup, setShowServicePopup] = useState(false);
  const [servicePopupUrl, setServicePopupUrl] = useState('https://app.smktelkom-mlg.sch.id/teacher/dashboard');

  const [wifiData, setWifiData] = useState<any[]>([]);
  const [wifiLoading, setWifiLoading] = useState(false);
  const [netTrafficHistory, setNetTrafficHistory] = useState<any[]>([]);
  const [utilityChartData, setUtilityChartData] = useState<UtilityChartPoint[]>(getUtilityChartData());
  const [trafficView, setTrafficView] = useState<'rx' | 'tx'>('rx');
  const [netSnapshot, setNetSnapshot] = useState<any>(null);
  const [netSnapshotThumb, setNetSnapshotThumb] = useState<any>(null);
  const [netSnapshotLightbox, setNetSnapshotLightbox] = useState<{ src: string; tanggal: string } | null>(null);
  const [mokletBasicAuthReady, setMokletBasicAuthReady] = useState(() => hasStoredMokletBasicAuth());
  const [publicVisitorSeed] = useState(() => {
    const existing = localStorage.getItem('publicVisitorSeed');
    if (existing) return existing;
    const generated = `PUB-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('publicVisitorSeed', generated);
    return generated;
  });
  const sortedCapexProjects = capexProjects
    .slice()
    .sort((a, b) => b.progress - a.progress)
    .map((p, i) => {
      const numberedNama = `${i + 1}. ${p.nama}`;
      const wrappedNama = wrapChartLabel(numberedNama, 30);

      return {
        ...p,
        numberedNama,
        wrappedNama,
      };
    });
  const profileThumbByEmail = useProfileThumbByEmail();
  const capexLabelLineMap = new Map(sortedCapexProjects.map((project) => [project.numberedNama, project.wrappedNama]));
  const capexAverageProgress = sortedCapexProjects.length > 0
    ? sortedCapexProjects.reduce((sum, project) => sum + (Number(project.progress) || 0), 0) / sortedCapexProjects.length
    : 0;
  const capexCompletedProjects = sortedCapexProjects.filter((project) => (Number(project.progress) || 0) >= 100).length;
  const capexPriorityProjects = sortedCapexProjects.filter((project) => (Number(project.progress) || 0) < 50).length;
  const capexChartHeight = Math.max(
    360,
    sortedCapexProjects.reduce((sum, project) => sum + 34 + ((project.wrappedNama?.length || 1) - 1) * 18, 0)
  );

  const [motivationIndex, setMotivationIndex] = useState(0);
  useEffect(() => {
    const intv = setInterval(() => {
      setMotivationIndex(prev => prev + 1);
    }, 10000); // Berganti setiap 10 detik
    return () => clearInterval(intv);
  }, []);

  const loginSessionSeed = localStorage.getItem('loginSessionSeed') || '';
  const motivationText = getMotivationForLogin(currentUser, `seed-${loginSessionSeed}-${motivationIndex}`);
  const publicMotivationText = getPublicEducationalMotivation(`public-${publicVisitorSeed}-${motivationIndex}`);


  const personnelForDashboard = USERS;

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
          const rowsTU = normalizeCashRows(dataTU);
          const totalKredit = rowsTU.reduce((sum, item) => sum + item.kredit, 0);
          const balance = calculateTuBalance(rowsTU);

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
        } else {
          setTuFinance({ balance: 0, expense: 0 });
          setTuLastTx(null);
        }

        // Fetch Kas AC
        const respAC = await fetch(`${FINANCE_API_URL}?sheetName=Kas_AC`);
        const dataAC = await respAC.json();
        if (dataAC && Array.isArray(dataAC) && dataAC.length > 0) {
          const rowsAC = normalizeCashRows(dataAC);
          const totalKredit = rowsAC.reduce((sum, item) => sum + item.kredit, 0);
          const balance = calculateAcBalance(rowsAC);

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
        } else {
          setAcFinance({ balance: 0, expense: 0 });
          setAcLastTx(null);
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
            .map((item: any) => ({
              ...item,
              senderEmail: String(
                item.senderEmail ||
                  item.SenderEmail ||
                  item.email ||
                  item.Email ||
                  ''
              )
                .trim()
                .toLowerCase(),
              likes: item.likes || item.Likes || "[]"
            }))
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

    const fetchClassroomMonitor = async () => {
      setClassroomMonitorLoading(true);
      try {
        const resp = await fetch(`${FINANCE_API_URL}?sheetName=${CLASSROOM_MONITOR_SHEET}`);
        const data = await resp.json();
        const normalized = Array.isArray(data) ? normalizeClassroomMonitorRows(data) : [];
        setClassroomMonitorRows(normalized);
      } catch (e) {
        console.error("Dashboard classroom monitor fetch error:", e);
        setClassroomMonitorRows([]);
      } finally {
        setClassroomMonitorLoading(false);
      }
    };

    const fetchACMonitor = async () => {
      setAcLoading(true);
      try {
        const resp = await fetch(`${FINANCE_API_URL}?sheetName=Monitor_AC`);
        const data = await resp.json();
        if (data && Array.isArray(data)) {
          let terpasang = 0, belum = 0, baik = 0, perbaikan = 0, rusak = 0;

          const fetchedMap = new Map();
          data.forEach(item => {
            const ruang = parseInt(item.ruang || item.Ruang);
            if (!isNaN(ruang)) fetchedMap.set(ruang, item);
          });

          for (let i = 1; i <= 40; i++) {
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
          setCapexProjects(mergeCapexProjects(data));
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
          const mapped = data.filter((d: any) => (d.id || d.ID) && (d.tanggal || d.Tanggal)).map((item: any) => {
            const dateStr = String(item.tanggal || item.Tanggal || '').trim();
            const parsed = parseWifiDateValue(dateStr);

            return {
              id: item.id || item.ID,
              date: formatWifiDateDisplay(dateStr),
              count: parseInt(item.count || item.Count || 0),
              _sortTs: parsed ? parsed.getTime() : 0
            };
          });

          // Sorting Berdasarkan Tanggal
          mapped.sort((a, b) => {
            return a._sortTs - b._sortTs;
          });

          setWifiData(mapped.map(({ _sortTs, ...rest }) => rest));
        } else {
          setWifiData(initialDeviceData.map((d) => ({ ...d, date: formatWifiDateDisplay(d.date) }))); // Fallback to demo layout logic
        }
      } catch (e) {
        setWifiData(initialDeviceData.map((d) => ({ ...d, date: formatWifiDateDisplay(d.date) })));
      } finally {
        setWifiLoading(false);
      }
    };

    const fetchNetSnapshot = async () => {
      try {
        const resp = await fetch(`${FINANCE_API_URL}?sheetName=Monitor_Net`);
        const data = await resp.json();
        if (data && Array.isArray(data) && data.length > 0) {
          const normalized = data.map((row: any, idx: number) => {
            const rawId = String(row?.id || row?.ID || '').trim();
            const rawDate = pickDateField(row);
            const inferredTanggal = inferDateFromNetId(rawId) || toShortDate(rawDate) || inferLegacySeedDate(row) || '';
            const fallbackTs = parseWifiDateValue(rawDate)?.getTime() || 0;
            const ts = parseShortDateTs(inferredTanggal) || fallbackTs || idx + 1;

            const i1_rx = toNum(row.i1_rx);
            const i1_tx = toNum(row.i1_tx);
            const i2_rx = toNum(row.i2_rx);
            const i2_tx = toNum(row.i2_tx);
            const i3_rx = toNum(row.i3_rx);
            const i3_tx = toNum(row.i3_tx);
            const i4_rx = toNum(row.i4_rx);
            const i4_tx = toNum(row.i4_tx);
            const i5_rx = toNum(row.i5_rx);
            const i5_tx = toNum(row.i5_tx);
            const ast_rx = toNum(row.ast_rx);
            const ast_tx = toNum(row.ast_tx);
            const metrics = [ast_rx, ast_tx, i1_rx, i1_tx, i2_rx, i2_tx, i3_rx, i3_tx, i4_rx, i4_tx, i5_rx, i5_tx];
            const nonZeroCount = metrics.filter((v) => v > 0).length;
            const score = metrics.reduce((acc, v) => acc + Math.max(0, v), 0);

            return {
              ...row,
              id: rawId || row?.id || row?.ID || '',
              tanggal: inferredTanggal || row?.tanggal || row?.Tanggal || '',
              _ts: ts,
              _snapshot: String(getSnapshotSource(row) || '').trim(),
              _nonZeroCount: nonZeroCount,
              _score: score,
              i1_rx, i1_tx,
              i2_rx, i2_tx,
              i3_rx, i3_tx,
              i4_rx, i4_tx,
              i5_rx, i5_tx,
              ast_rx, ast_tx,
            };
          }).sort((a: any, b: any) => a._ts - b._ts);

          const trafficRows = normalized.filter((r: any) => r._nonZeroCount > 0 && String(r.tanggal || '').trim() !== '');
          const perDateBest = new Map<string, any>();
          trafficRows.forEach((row: any) => {
            const key = String(row.tanggal || '').trim();
            if (!key) return;
            const existing = perDateBest.get(key);
            if (!existing) {
              perDateBest.set(key, row);
              return;
            }
            const existingValue = Number(existing._nonZeroCount || 0) * 100000 + Number(existing._score || 0);
            const currentValue = Number(row._nonZeroCount || 0) * 100000 + Number(row._score || 0);
            if (currentValue > existingValue || (currentValue === existingValue && Number(row._ts || 0) > Number(existing._ts || 0))) {
              perDateBest.set(key, row);
            }
          });

          const trafficBestRows = Array.from(perDateBest.values())
            .sort((a: any, b: any) => parseShortDateTs(String(a.tanggal || '')) - parseShortDateTs(String(b.tanggal || '')));

          const trafficHistory = trafficBestRows
            .map((r: any) => ({
              tanggal: String(r.tanggal || ''),
              ast_rx: r.ast_rx, ast_tx: r.ast_tx,
              i1_rx: r.i1_rx, i1_tx: r.i1_tx,
              i2_rx: r.i2_rx, i2_tx: r.i2_tx,
              i3_rx: r.i3_rx, i3_tx: r.i3_tx,
              i4_rx: r.i4_rx, i4_tx: r.i4_tx,
              i5_rx: r.i5_rx, i5_tx: r.i5_tx,
            }));
          setNetTrafficHistory(trafficHistory);

          const latestMetricsRow = trafficBestRows[trafficBestRows.length - 1]
            || [...normalized].reverse().find((r: any) => r._nonZeroCount > 0);
          setNetSnapshot(latestMetricsRow || normalized[normalized.length - 1] || data[data.length - 1]);

          const snapshotCandidates = normalized.filter((r: any) => r._snapshot);
          const latestWithSnapshot = snapshotCandidates
            .sort((a: any, b: any) => {
              const ta = parseShortDateTs(String(a.tanggal || '')) || Number(a._ts || 0);
              const tb = parseShortDateTs(String(b.tanggal || '')) || Number(b._ts || 0);
              return ta - tb;
            })
            .pop();
          setNetSnapshotThumb(latestWithSnapshot || null);
        } else {
          setNetSnapshot(null);
          setNetSnapshotThumb(null);
          setNetTrafficHistory([]);
        }
      } catch (e) {
        console.error("Net monitor fetch error:", e);
        setNetSnapshotThumb(null);
        setNetTrafficHistory([]);
      }
    };

    const fetchUtilityChart = async () => {
      try {
        const resp = await fetch(`${FINANCE_API_URL}?sheetName=Tagihan_Utilitas`);
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
          const chartRows = buildUtilityChartFromRows(data);
          if (chartRows.length > 0) {
            setUtilityChartData(chartRows);
            return;
          }
        }
        setUtilityChartData(getUtilityChartData());
      } catch (e) {
        console.error("Dashboard utility fetch error:", e);
        setUtilityChartData(getUtilityChartData());
      }
    };

    fetchClassroomMonitor();
    fetchACMonitor();
    fetchCapexProjects();
    fetchWifiMonitor();
    fetchNetSnapshot();
    fetchUtilityChart();

    // Fetch Moklet Service Dashboard data langsung (menggunakan perantara Google Apps Script)
    const fetchMokletService = async () => {
      // Hanya berjalan jika user sudah login sbg pimpinan
      if (!isLoggedIn || currentUser?.email !== 'hadi@smktelkom-mlg.sch.id') return;

      const credentials = getStoredMokletBasicAuth();
      setMokletBasicAuthReady(Boolean(credentials.username && credentials.password));
      if (!credentials.username || !credentials.password) {
        setMokletService(prev => ({ ...prev, loading: false, error: false }));
        return;
      }

      setMokletService(prev => ({ ...prev, loading: true, error: false }));
      try {
        const targetUrl = 'https://service.smktelkom-mlg.sch.id/administrator/dashboard';
        const authHeader = `Basic ${window.btoa(`${credentials.username}:${credentials.password}`)}`;

        const resp = await fetch(targetUrl, {
          headers: {
            Authorization: authHeader,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(12000),
        });

        if (!resp.ok) {
          throw new Error(`Moklet Service auth failed (${resp.status})`);
        }

        const text = await resp.text();
        const complaintsSection = text.match(/Complaints(.*?)Room Reservation/s) || [text];
        const roomSection = text.match(/Room Reservation(.*?)Tools Loan/s) || [text];
        const toolsSection = text.match(/Tools Loan(.*?)$/s) || [text];

        const data = {
          complaints: {
            waiting: (complaintsSection[0].match(/(\d+)\s*Waiting for Confirmation/is) || [])[1] || 0,
            processing: (complaintsSection[0].match(/(\d+)\s*On Process/is) || [])[1] || 0
          },
          rooms: {
            waiting: (roomSection[0].match(/(\d+)\s*Waiting for Confirmation/is) || [])[1] || 0,
            active: (roomSection[0].match(/(\d+)\s*Active Reservation/is) || [])[1] || 0
          },
          tools: {
            waiting: (toolsSection[0].match(/(\d+)\s*Waiting for Confirmation/is) || [])[1] || 0,
            notReturn: (toolsSection[0].match(/(\d+)\s*Have not return/is) || [])[1] || 0
          }
        };

        setMokletService({
          complaints: {
            waitingConfirmation: Number(data.complaints.waiting || 0),
            onProcess: Number(data.complaints.processing || 0),
          },
          roomReservation: {
            waitingConfirmation: Number(data.rooms.waiting || 0),
            activeReservation: Number(data.rooms.active || 0),
          },
          toolsLoan: {
            waitingConfirmation: Number(data.tools.waiting || 0),
            haveNotReturn: Number(data.tools.notReturn || 0),
          },
          loading: false,
          lastUpdated: new Date(),
          error: false,
        });
      } catch (e) {
        console.warn('Moklet Service monitoring failed:', e);
        setMokletService(prev => ({ ...prev, loading: false, error: true }));
      }
    };

    if (isLoggedIn && currentUser?.email === 'hadi@smktelkom-mlg.sch.id') {
      fetchMokletService();
      const mokletInterval = setInterval(fetchMokletService, 5 * 60 * 1000); // refresh every 5 mins
      return () => clearInterval(mokletInterval);
    }

  }, [isAuthorizedFinance, isLoggedIn, mokletRefresh]);

  const handleSetMokletBasicAuth = () => {
    const currentCredentials = getStoredMokletBasicAuth();
    const username = window.prompt(
      'Masukkan username Basic Auth untuk Moklet Service:',
      currentCredentials.username || ''
    );

    if (username === null) return;

    const password = window.prompt(
      'Masukkan password Basic Auth untuk Moklet Service:',
      currentCredentials.password || ''
    );

    if (password === null) return;
    if (!username.trim() || !password) {
      alert('Username dan password Basic Auth harus diisi.');
      return;
    }

    setStoredMokletBasicAuth(username, password);
    setMokletBasicAuthReady(true);
    setMokletRefresh((prev) => prev + 1);
  };

  const handleClearMokletBasicAuth = () => {
    if (!confirm('Hapus kredensial Basic Auth Moklet Service dari sesi browser ini?')) return;

    clearStoredMokletBasicAuth();
    setMokletBasicAuthReady(false);
    setMokletService((prev) => ({
      ...prev,
      loading: false,
      error: false,
      lastUpdated: null,
    }));
  };

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
      pushActionNotification({
        id: `piket-del:${id}:${Date.now()}`,
        dedupeKey: `piket-del:${id}`,
        type: 'piket_deleted',
        title: '🗑️ Catatan Piket Dihapus',
        message: `${currentUser.nama.split(',')[0]} menghapus catatan piket dari "${(keterangan || '').substring(0, 35)}".`,
        path: '/duty-notes',
        iconKey: 'trash',
        color: 'var(--accent-rose)',
        bg: 'rgba(244, 63, 94, 0.1)'
      });
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

  const handleLikePiket = async (note: any) => {
    if (!isLoggedIn || !currentUser) {
      alert("Silakan login untuk memberikan interaksi.");
      return;
    }

    const userIdentifier = currentUser.email || currentUser.nama || 'unknown';
    let currentLikes: string[] = [];
    try {
      if (typeof note.likes === 'string') currentLikes = JSON.parse(note.likes);
      else if (Array.isArray(note.likes)) currentLikes = [...note.likes];
    } catch (e) {
      if (typeof note.likes === 'string' && note.likes.trim() !== '') {
        currentLikes = note.likes.split(',').map((s: string) => s.trim());
      }
    }

    if (currentLikes.includes(userIdentifier)) {
      currentLikes = currentLikes.filter(e => e !== userIdentifier);
    } else {
      currentLikes.push(userIdentifier);
    }

    const newLikesStr = JSON.stringify(currentLikes);

    // Optimistic UI update
    setPiketNotes(prev => prev.map(n => n.id === note.id ? { ...n, likes: newLikesStr } : n));

    try {
      await fetch(FINANCE_API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: 'FINANCE_RECORD',
          sheetName: 'Piket',
          sheet: 'Piket',
          id: note.id,
          ID: note.id,
          tanggal: note.tanggal,
          Tanggal: note.tanggal,
          keterangan: note.keterangan || '-',
          Sender: note.keterangan || '-',
          senderEmail: note.senderEmail || '-',
          SenderEmail: note.senderEmail || '-',
          email: note.senderEmail || '-',
          Email: note.senderEmail || '-',
          kategori: note.kategori || '-',
          Category: note.kategori || '-',
          amount: note.amount || '-',
          Amount: note.amount || '-',
          type: note.type || '-',
          Priority: note.type || '-',
          debit: note.debit ? "TRUE" : "FALSE",
          Read: note.debit ? "TRUE" : "FALSE",
          kredit: note.kredit || "-",
          Followup: note.kredit || "-",
          likes: newLikesStr,
          Likes: newLikesStr
        })
      });
    } catch (error) {
      console.error("Like dashboard piket failed:", error);
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

      const dd = String(d.getDate()).padStart(2, '0');
      const mmm = monthList[d.getMonth()] || 'Jan';
      const yy = String(d.getFullYear()).slice(-2);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');

      return `${dd} ${mmm} ${yy} ${hh}:${mm}`;
    } catch (e) {
      return dateValue;
    }
  };

  const getClassroomStatusMeta = (score: number) => {
    if (score >= 95) {
      return {
        label: 'Teladan',
        color: 'var(--accent-emerald)',
        bg: 'rgba(16,185,129,0.12)',
        border: 'rgba(16,185,129,0.28)',
      };
    }
    if (score >= 85) {
      return {
        label: 'Aman',
        color: 'var(--accent-blue)',
        bg: 'rgba(59,130,246,0.12)',
        border: 'rgba(59,130,246,0.28)',
      };
    }
    if (score >= 70) {
      return {
        label: 'Pantau',
        color: 'var(--accent-amber)',
        bg: 'rgba(245,158,11,0.14)',
        border: 'rgba(245,158,11,0.28)',
      };
    }
    return {
      label: 'Prioritas',
      color: 'var(--accent-rose)',
      bg: 'rgba(244,63,94,0.12)',
      border: 'rgba(244,63,94,0.28)',
    };
  };

  // Cutoff: Senin minggu ini s.d. hari ini (sinkron dengan halaman Monitor Pantauan Kelas)
  const _cmToday = new Date(); _cmToday.setHours(0, 0, 0, 0);
  const _cmDow = _cmToday.getDay(); // 0=Min,1=Sen,...,6=Sab
  const _cmCutoff = new Date(_cmToday);
  _cmCutoff.setDate(_cmCutoff.getDate() - (_cmDow === 0 ? 6 : _cmDow - 1));
  const _cmPad = (n: number) => String(n).padStart(2, '0');
  const _cmCutoffStr = `${_cmCutoff.getFullYear()}-${_cmPad(_cmCutoff.getMonth() + 1)}-${_cmPad(_cmCutoff.getDate())}`;
  const classroomWeekRows = classroomMonitorRows.filter(
    (row) => row.tanggal >= _cmCutoffStr
  );

  const classroomRoomSummaries = CLASSROOM_LOCATION_OPTIONS.map((ruang) => {
    const roomRows = classroomWeekRows.filter((item) => item.ruang === ruang);
    const latestRow = roomRows
      .slice()
      .sort((a, b) => (parseWifiDateValue(b.tanggal)?.getTime() || 0) - (parseWifiDateValue(a.tanggal)?.getTime() || 0))[0] || null;

    const energyFindings = roomRows.reduce((sum, item) => sum + item.lampu + item.tv + item.ac + item.kipas + item.lainnya, 0);
    const cleanlinessFindings = roomRows.reduce((sum, item) => sum + item.sampah + item.kotoran, 0);
    const tidinessFindings = roomRows.reduce((sum, item) => sum + item.rapih, 0);
    const totalFindings = roomRows.reduce((sum, item) => sum + item.total, 0);
    const observationCount = roomRows.length;
    const score = Math.max(
      0,
      100 - (energyFindings * 12) - (cleanlinessFindings * 15) - (tidinessFindings * 10) - Math.max(0, observationCount - 1) * 3
    );
    const status = getClassroomStatusMeta(score);

    return {
      ruang,
      observationCount,
      energyFindings,
      cleanlinessFindings,
      tidinessFindings,
      totalFindings,
      score,
      status,
      latestDate: latestRow?.tanggal || '',
      latestDateLabel: latestRow ? formatWifiDateDisplay(latestRow.tanggal) : '-',
      latestNote: latestRow?.keterangan || (latestRow ? buildMonitorIssueSummary(latestRow) : 'Belum ada data'),
    };
  });

  const classroomObservedRooms = classroomRoomSummaries.filter((room) => room.observationCount > 0);
  const classroomRoomsNeedAttention = classroomObservedRooms
    .filter((room) => room.totalFindings > 0)
    .sort((a, b) => b.totalFindings - a.totalFindings || a.score - b.score || compareClassroomRooms(a.ruang, b.ruang));
  const classroomSafeRooms = classroomObservedRooms.filter((room) => room.totalFindings === 0);
  const classroomCoverage = classroomObservedRooms.length;
  const classroomCoverageRate = classroomCoverage > 0 ? Math.round((classroomCoverage / CLASSROOM_REFERENCE_TOTAL) * 100) : 0;
  const classroomTotalEnergyFindings = classroomObservedRooms.reduce((sum, room) => sum + room.energyFindings, 0);
  const classroomTotalCleanlinessFindings = classroomObservedRooms.reduce((sum, room) => sum + room.cleanlinessFindings, 0);
  const classroomTotalTidinessFindings = classroomObservedRooms.reduce((sum, room) => sum + room.tidinessFindings, 0);
  const classroomSnapshotDate = classroomWeekRows
    .slice()
    .sort((a, b) => (parseWifiDateValue(b.tanggal)?.getTime() || 0) - (parseWifiDateValue(a.tanggal)?.getTime() || 0))[0]?.tanggal || '';
  const hasClassroomMonitorData = classroomWeekRows.length > 0;
  const classroomIssueComposition = [
    { name: 'Kebersihan', value: classroomTotalCleanlinessFindings, color: '#06b6d4' },
    { name: 'Kerapihan', value: classroomTotalTidinessFindings, color: '#8b5cf6' },
    { name: 'Hemat energi', value: classroomTotalEnergyFindings, color: '#f59e0b' },
  ].filter((item) => item.value > 0);
  const classroomPriorityChartData = classroomRoomsNeedAttention.slice(0, 8).map((room) => ({
    ruang: getShortClassroomLabel(room.ruang),
    score: room.score,
    temuan: room.totalFindings,
    fill: room.status.color,
  }));
  const classroomFollowUpItems = classroomRoomsNeedAttention.slice(0, 5).map((room) => {
    const recipients = room.energyFindings > 0 ? 'Guru mapel & wali kelas' : 'Wali kelas & petugas piket';
    let action = 'Perlu penguatan budaya kelas agar kondisi ruang tetap siap dipakai berikutnya.';

    if (room.cleanlinessFindings > 0 && room.energyFindings > 0) {
      action = 'Arahkan piket kelas membereskan sampah/area lantai, lalu pastikan seluruh perangkat dimatikan sebelum ruang ditinggal.';
    } else if (room.cleanlinessFindings > 0) {
      action = 'Minta piket kelas menutup hari dengan sweep sampah dan cek lantai sebelum jam terakhir selesai.';
    } else if (room.energyFindings > 0) {
      action = 'Ingatkan guru terakhir dan ketua kelas untuk cek kipas, lampu, TV, atau AC sebelum meninggalkan ruangan.';
    } else if (room.tidinessFindings > 0) {
      action = 'Rapikan formasi meja kursi dan area depan kelas agar siap untuk pembelajaran berikutnya.';
    }

    return {
      ...room,
      recipients,
      action,
    };
  });

  const classroomMonitorSection = (
    <div
      className="glass-panel delay-100"
      style={{
        marginBottom: '2rem',
        background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(59,130,246,0.03) 55%, transparent)',
        borderLeft: '4px solid var(--accent-cyan)',
      }}
    >
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} color="var(--accent-cyan)" /> Monitor Rekap Pantauan Kelas
          </h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '760px' }}>
            Ringkasan kebersihan, kerapihan, dan awareness penghematan energi agar wali kelas dan guru cepat tahu ruang yang perlu ditindaklanjuti.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <a href="#/classroom-monitor" className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>
            Detail & Input
          </a>
          <span className="badge badge-info" style={{ background: 'rgba(6,182,212,0.12)', color: 'var(--accent-cyan)', borderColor: 'rgba(6,182,212,0.28)' }}>
            Snapshot {classroomSnapshotDate ? formatWifiDateDisplay(classroomSnapshotDate) : 'Belum ada data'}
          </span>
          <span className="badge badge-success">
            Cakupan {classroomCoverage}/{CLASSROOM_REFERENCE_TOTAL} lokasi
          </span>
        </div>
      </div>

      <div style={{ padding: '1.25rem' }}>
        {classroomMonitorLoading ? (
          <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
            <Loader2 className="animate-spin" color="var(--accent-cyan)" />
          </div>
        ) : !hasClassroomMonitorData ? (
          <div style={{ padding: '1rem 0' }}>
            <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-subtle)' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Belum ada data pantauan kelas di database
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '760px' }}>
                Dashboard ini sekarang hanya menampilkan data live dari sheet `{CLASSROOM_MONITOR_SHEET}`. Silakan isi pantauan pertama dari menu <strong style={{ color: 'var(--text-primary)' }}>Monitor Kelas</strong> agar rekap untuk wali kelas dan guru langsung terbentuk otomatis.
              </div>
              <div style={{ marginTop: '0.9rem' }}>
                <a href="#/classroom-monitor" className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '0.5rem 0.9rem' }}>
                  Buka Monitor Kelas
                </a>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="stats-grid" style={{ marginBottom: '1.25rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ruang aman terpantau</div>
                <div style={{ marginTop: '0.35rem', fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                  {classroomSafeRooms.length}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  {classroomSafeRooms.length} lokasi tanpa temuan pada snapshot terbaru.
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Butuh tindak lanjut</div>
                <div style={{ marginTop: '0.35rem', fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent-rose)' }}>
                  {classroomRoomsNeedAttention.length}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  Prioritaskan koordinasi dengan wali kelas untuk ruang yang masih bermasalah.
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fokus temuan</div>
                <div style={{ marginTop: '0.35rem', fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                  {classroomTotalCleanlinessFindings >= classroomTotalEnergyFindings && classroomTotalCleanlinessFindings >= classroomTotalTidinessFindings
                    ? 'Kebersihan'
                    : classroomTotalEnergyFindings >= classroomTotalTidinessFindings
                      ? 'Hemat energi'
                      : 'Kerapihan'}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  {classroomTotalCleanlinessFindings + classroomTotalEnergyFindings + classroomTotalTidinessFindings} temuan tercatat dari data pantauan.
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coverage monitor</div>
                <div style={{ marginTop: '0.35rem', fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent-blue)' }}>
                  {classroomCoverageRate}%
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  Siap disambungkan ke sheet `{CLASSROOM_MONITOR_SHEET}` untuk rekap harian otomatis.
                </div>
              </div>
            </div>

            <div className="dashboard-grid" style={{ marginBottom: '1.25rem' }}>
              <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', minHeight: '320px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Prioritas ruang untuk diinformasikan</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      Skor makin rendah berarti butuh perhatian lebih cepat.
                    </div>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Berdasarkan form pantauan kelas
                  </span>
                </div>

                {classroomPriorityChartData.length > 0 ? (
                  <div style={{ width: '100%', height: '250px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={classroomPriorityChartData} layout="vertical" margin={{ left: 8, right: 24, top: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} stroke="var(--text-muted)" fontSize={11} tickFormatter={(value) => `${value}%`} />
                        <YAxis dataKey="ruang" type="category" width={44} stroke="var(--text-muted)" fontSize={11} />
                        <RechartsTooltip
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-focus)', borderRadius: '10px' }}
                          formatter={(value: any, name: any) => {
                            if (name === 'score') return [`${value}%`, 'Skor kondisi'];
                            return [`${value}`, 'Jumlah temuan'];
                          }}
                          labelFormatter={(label) => `Kelas ${label}`}
                        />
                        <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={24}>
                          {classroomPriorityChartData.map((item, idx) => (
                            <Cell key={`priority-${idx}`} fill={item.fill} fillOpacity={0.9} />
                          ))}
                          <LabelList dataKey="score" position="right" formatter={(value: any) => `${value}%`} style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    Belum ada ruang yang membutuhkan tindak lanjut.
                  </div>
                )}
              </div>

              <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', minHeight: '320px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Sebaran jenis temuan</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Membantu fokus pembinaan: kebersihan, kerapihan, atau penghematan energi.
                </div>

                <div style={{ flex: 1, position: 'relative', minHeight: '210px', marginTop: '0.5rem' }}>
                  {classroomIssueComposition.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={classroomIssueComposition}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={52}
                            outerRadius={82}
                            paddingAngle={2}
                          >
                            {classroomIssueComposition.map((entry, idx) => (
                              <Cell key={`composition-${idx}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-focus)', borderRadius: '8px', fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {classroomIssueComposition.reduce((sum, item) => sum + item.value, 0)}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            total temuan
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ paddingTop: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      Belum ada data komposisi temuan.
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginTop: '0.4rem' }}>
                  {classroomIssueComposition.map((item) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.55rem 0.65rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '999px', background: item.color, display: 'inline-block' }} />
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="dashboard-grid" style={{ marginBottom: 0 }}>
              <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                  Arahan cepat untuk wali kelas & guru
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {classroomFollowUpItems.length > 0 ? classroomFollowUpItems.map((item) => (
                    <div key={item.ruang} style={{ padding: '0.85rem', borderRadius: '12px', background: item.status.bg, border: `1px solid ${item.status.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.ruang}</span>
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', color: item.status.color, background: item.status.bg, border: `1px solid ${item.status.border}` }}>
                              {item.status.label}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            <strong style={{ color: 'var(--text-primary)' }}>Temuan:</strong> {item.latestNote}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: '90px' }}>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: item.status.color }}>{item.score}%</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Skor kelas</div>
                        </div>
                      </div>
                      <div style={{ marginTop: '0.55rem', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Sampaikan ke:</strong> {item.recipients}
                      </div>
                      <div style={{ marginTop: '0.2rem', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Aksi:</strong> {item.action}
                      </div>
                    </div>
                  )) : (
                    <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      Semua ruang yang terpantau berada dalam kondisi aman.
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                  Ringkasan komunikasi harian
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  <div style={{ padding: '0.8rem', borderRadius: '12px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ruang bersih & siap pakai</div>
                    <div style={{ marginTop: '0.3rem', fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-blue)' }}>
                      {classroomSafeRooms.length} lokasi
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.5 }}>
                      Contoh lokasi aman: {classroomSafeRooms.slice(0, 6).map((room) => getShortClassroomLabel(room.ruang)).join(', ') || '-'}
                    </div>
                  </div>

                  <div style={{ padding: '0.8rem', borderRadius: '12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Catatan untuk briefing guru</div>
                    <div style={{ marginTop: '0.35rem', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                      Tekankan budaya cek akhir kelas: sampah terangkat, lantai/area depan bersih, dan kipas/lampu/TV/AC dipastikan mati setelah KBM.
                    </div>
                  </div>

                  <div style={{ padding: '0.8rem', borderRadius: '12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Catatan implementasi</div>
                    <div style={{ marginTop: '0.35rem', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                      Section ini otomatis memakai seed dari form contoh, dan akan memakai data live saat sheet `{CLASSROOM_MONITOR_SHEET}` sudah tersedia.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const acMonitorSection = (
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
                  <Link
                    to="/ac-monitor?focus=trouble"
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: 'var(--accent-rose-ghost)',
                      borderRadius: '8px',
                      borderLeft: '2px solid var(--accent-rose)',
                      textDecoration: 'none',
                      display: 'block',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      cursor: 'pointer'
                    }}
                    title="Lihat daftar AC yang mati atau sedang perbaikan"
                  >
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-rose)' }}>{acMonitorData.perbaikan + acMonitorData.rusak}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Mati / Perbaikan</div>
                  </Link>
                  <div style={{ flex: 1, padding: '0.75rem', background: 'var(--accent-emerald-ghost)', borderRadius: '8px', borderLeft: '2px solid var(--accent-emerald)' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>{acMonitorData.baik}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Normal / Baik</div>
                  </div>
                </div>
              </div>
            </div>

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
                      {[
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
  );

  const infrastructureHealthSection = (
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
  );

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
            <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>Hai, {currentUser.nama.split(' ')[0]}!</h2>
            <p 
              key={`auth-${motivationIndex}`}
              className="animate-fade-in"
              style={{ 
                fontSize: '0.75rem', 
                color: 'var(--text-primary)', 
                margin: '0.2rem 0 0 0', 
                fontStyle: 'italic', 
                opacity: 0.9,
                textShadow: '0 0 10px rgba(59, 130, 246, 0.7), 0 0 20px rgba(59, 130, 246, 0.4)',
                transition: 'opacity 1s ease-in-out'
              }}
            >
              "{motivationText}"
            </p>
          </div>
        </div>
      )}

      <div className="flex-row-responsive" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Pusat Kendali Layanan</h1>
          <p className="page-subtitle" style={{ margin: 0, maxWidth: '800px' }}>
            Monitor penugasan, progres rutin, dan proyek tim IT, Lab & Sarana Prasarana.
          </p>
          {!isLoggedIn && (
            <div
              className="glass-panel"
              style={{
                marginTop: '0.9rem',
                padding: '0.75rem 0.95rem',
                maxWidth: '820px',
                borderLeft: '3px solid var(--accent-emerald)',
                background: 'linear-gradient(90deg, var(--accent-emerald-ghost), transparent)'
              }}
            >
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45, fontStyle: 'italic' }}>
                "{publicMotivationText}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Moklet Service Integration Boxes (hanya saat login) ── */}
      {isLoggedIn && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: mokletService.error ? '#f87171' : mokletService.loading ? '#fbbf24' : '#34d399', boxShadow: `0 0 6px ${mokletService.error ? '#f8717160' : mokletService.loading ? '#fbbf2460' : '#34d39960'}` }} />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Moklet Service — Status Layanan</span>
              <button
                onClick={() => { setServicePopupUrl('https://app.smktelkom-mlg.sch.id/teacher/dashboard'); setShowServicePopup(true); }}
                style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.85, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                title="Buka Moklet Service Dashboard"
              >
                <ExternalLink size={11} /> Buka Service
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {isPimpinan && (
                <>
                  <button
                    onClick={handleSetMokletBasicAuth}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      fontSize: '0.72rem', fontWeight: 600, padding: '0.35rem 0.75rem',
                      background: mokletBasicAuthReady ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-card)',
                      color: mokletBasicAuthReady ? 'var(--accent-emerald)' : 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px', cursor: 'pointer'
                    }}
                  >
                    {mokletBasicAuthReady ? 'Auth Tersimpan' : 'Set Basic Auth'}
                  </button>
                  {mokletBasicAuthReady && (
                    <button
                      onClick={handleClearMokletBasicAuth}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                        fontSize: '0.72rem', fontWeight: 600, padding: '0.35rem 0.75rem',
                        background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)',
                        borderRadius: '6px', cursor: 'pointer'
                      }}
                    >
                      Reset Auth
                    </button>
                  )}
                  <button
                    onClick={() => setMokletRefresh(prev => prev + 1)}
                    disabled={mokletService.loading || !mokletBasicAuthReady}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      fontSize: '0.72rem', fontWeight: 600, padding: '0.35rem 0.75rem',
                      background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)',
                      borderRadius: '6px', cursor: mokletService.loading || !mokletBasicAuthReady ? 'not-allowed' : 'pointer', opacity: mokletService.loading || !mokletBasicAuthReady ? 0.7 : 1
                    }}
                  >
                    <RefreshCw size={12} className={mokletService.loading ? "animate-spin" : ""} />
                    Refresh Data
                  </button>
                </>
              )}
              {mokletService.lastUpdated && (
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  Update: {mokletService.lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          {isPimpinan && !mokletBasicAuthReady && (
            <div className="glass-panel" style={{ padding: '0.9rem 1rem', marginBottom: '1rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.18)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-amber)', marginBottom: '0.2rem' }}>
                Basic Auth Moklet Service belum diatur
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Klik `Set Basic Auth` untuk menyimpan kredensial login `app.smktelkom-mlg.sch.id`, lalu dashboard akan mengambil data langsung dari `service.smktelkom-mlg.sch.id`.
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>

            {/* Box 1: Complaints */}
            <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(251,146,60,0.25)', background: 'linear-gradient(135deg, rgba(251,146,60,0.05), transparent)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #f97316, #fb923c)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <div style={{ padding: '0.45rem', background: 'rgba(249,115,22,0.15)', borderRadius: '8px', color: '#f97316', display: 'flex' }}>
                  <AlertCircle size={16} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f97316' }}>Pengaduan</span>
              </div>
              {mokletService.loading && !mokletService.complaints ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}><Loader2 size={20} className="animate-spin" color="#f97316" /></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', opacity: mokletService.loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Menunggu Konfirmasi</span>
                    <span style={{ fontWeight: 800, fontSize: '1.3rem', color: '#f97316', lineHeight: 1 }}>{mokletService.complaints?.waitingConfirmation ?? '-'}</span>
                  </div>
                  <div style={{ height: '1px', background: 'var(--border-subtle)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Sedang Diproses</span>
                    <span style={{ fontWeight: 800, fontSize: '1.3rem', color: '#fb923c', lineHeight: 1 }}>{mokletService.complaints?.onProcess ?? '-'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Box 2: Room Reservation */}
            <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(52,211,153,0.25)', background: 'linear-gradient(135deg, rgba(52,211,153,0.05), transparent)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #10b981, #34d399)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <div style={{ padding: '0.45rem', background: 'rgba(16,185,129,0.15)', borderRadius: '8px', color: '#10b981', display: 'flex' }}>
                  <Calendar size={16} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#10b981' }}>Peminjaman Ruang</span>
              </div>
              {mokletService.loading && !mokletService.roomReservation ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}><Loader2 size={20} className="animate-spin" color="#10b981" /></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', opacity: mokletService.loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Menunggu Konfirmasi</span>
                    <span style={{ fontWeight: 800, fontSize: '1.3rem', color: '#6b7280', lineHeight: 1 }}>{mokletService.roomReservation?.waitingConfirmation ?? '-'}</span>
                  </div>
                  <div style={{ height: '1px', background: 'var(--border-subtle)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Reservasi Aktif</span>
                    <span style={{ fontWeight: 800, fontSize: '1.3rem', color: '#10b981', lineHeight: 1 }}>{mokletService.roomReservation?.activeReservation ?? '-'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Box 3: Tools Loan */}
            <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(59,130,246,0.25)', background: 'linear-gradient(135deg, rgba(59,130,246,0.05), transparent)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <div style={{ padding: '0.45rem', background: 'rgba(59,130,246,0.15)', borderRadius: '8px', color: '#3b82f6', display: 'flex' }}>
                  <Briefcase size={16} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#3b82f6' }}>Peminjaman Alat</span>
              </div>
              {mokletService.loading && !mokletService.toolsLoan ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}><Loader2 size={20} className="animate-spin" color="#3b82f6" /></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', opacity: mokletService.loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Menunggu Konfirmasi</span>
                    <span style={{ fontWeight: 800, fontSize: '1.3rem', color: '#6b7280', lineHeight: 1 }}>{mokletService.toolsLoan?.waitingConfirmation ?? '-'}</span>
                  </div>
                  <div style={{ height: '1px', background: 'var(--border-subtle)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Belum Dikembalikan</span>
                    <span style={{ fontWeight: 800, fontSize: '1.3rem', color: '#3b82f6', lineHeight: 1 }}>{mokletService.toolsLoan?.haveNotReturn ?? '-'}</span>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {classroomMonitorSection}

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
                    tickFormatter={(val) => formatWifiDateDisplay(val)}
                  />
                  <YAxis
                    domain={['dataMin - 50', 'dataMax + 50']}
                    stroke="var(--text-muted)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                  />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-focus)', borderRadius: '8px', fontSize: '11px' }}
                    formatter={(value: any) => [`${Number(value).toLocaleString()} Perangkat`, 'Total Client']}
                    labelFormatter={(label) => formatWifiDateDisplay(label)}
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

      <div className="glass-panel delay-155" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(59,130,246,0.03), transparent)', borderLeft: '4px solid var(--accent-cyan)' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.02rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="var(--accent-cyan)" /> Histori Traffic per ONT
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Pantau tren bandwidth setiap link internet (download/upload).
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setTrafficView('rx')}
              className="btn"
              style={{
                fontSize: '0.75rem',
                border: '1px solid var(--border-subtle)',
                background: trafficView === 'rx' ? 'var(--accent-blue)' : 'transparent',
                color: trafficView === 'rx' ? 'white' : 'var(--text-secondary)'
              }}
            >
              ↓ Rx (Download)
            </button>
            <button
              onClick={() => setTrafficView('tx')}
              className="btn"
              style={{
                fontSize: '0.75rem',
                border: '1px solid var(--border-subtle)',
                background: trafficView === 'tx' ? 'var(--accent-rose)' : 'transparent',
                color: trafficView === 'tx' ? 'white' : 'var(--text-secondary)'
              }}
            >
              ↑ Tx (Upload)
            </button>
          </div>
        </div>
        <div style={{ padding: '1.25rem' }}>
          {netTrafficHistory.length > 0 ? (
            <div style={{ width: '100%', height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={netTrafficHistory} margin={{ top: 10, right: 10, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="tanggal" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} unit=" Mbps" />
                  <RechartsTooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-focus)', borderRadius: '10px' }}
                    formatter={(val: any, name: any) => {
                      const n = String(name);
                      const base = ONT_SERIES.find(s => n.startsWith(s.key));
                      const suffix = n.endsWith('_rx') ? 'Rx' : 'Tx';
                      return [`${val} Mbps`, `${base?.label || n} ${suffix}`];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '0.72rem' }}
                    formatter={(value: any) => {
                      const n = String(value);
                      const base = ONT_SERIES.find(s => n.startsWith(s.key));
                      return `${base?.label || n} ${n.endsWith('_rx') ? 'Rx' : 'Tx'}`;
                    }}
                  />
                  {ONT_SERIES.map((series) => (
                    <Line
                      key={`${series.key}_${trafficView}`}
                      type="monotone"
                      dataKey={`${series.key}_${trafficView}`}
                      stroke={series.color}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Belum ada histori traffic jaringan.</div>
          )}
        </div>
      </div>

      {infrastructureHealthSection}

      {/* DASHBOARD AC MONITORING SECTION */}
      {acMonitorSection}

      {/* DASHBOARD CAPEX PROJECTS SECTION */}
      <div className="glass-panel delay-200" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(245,158,11,0.03), transparent)', borderLeft: '4px solid var(--accent-amber)' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Briefcase size={18} color="var(--accent-amber)" /> 5. Progres Pekerjaan & Pengadaan CAPEX
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pemantauan target penyelesaian peremajaan dan pembangunan 2026</p>
          </div>
          {isLoggedIn ? (
            <a href="#/capex" className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>Monitor CAPEX &rarr;</a>
          ) : (
            <span className="badge badge-warning" style={{ textTransform: 'none', letterSpacing: 0 }}>
              Ringkasan publik aktif
            </span>
          )}
        </div>

        <div style={{ padding: '1.25rem' }}>
          {capexLoading ? (
            <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" color="var(--accent-amber)" /></div>
          ) : sortedCapexProjects.length > 0 ? (
            <div className="dashboard-grid" style={{ marginBottom: 0, alignItems: 'stretch' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rerata progres proyek</div>
                  <div style={{ marginTop: '0.35rem', fontSize: '1.7rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                    {capexAverageProgress.toFixed(1)}%
                  </div>
                  <div style={{ marginTop: '0.2rem', fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Grafik ini tampil untuk pengguna login maupun publik agar progres pekerjaan strategis tetap terbaca dari dashboard utama.
                  </div>
                </div>

                <div className="stats-grid" style={{ marginBottom: 0, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                  <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selesai</div>
                    <div style={{ marginTop: '0.3rem', fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                      {capexCompletedProjects}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Proyek sudah 100%.</div>
                  </div>

                  <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prioritas</div>
                    <div style={{ marginTop: '0.3rem', fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                      {capexPriorityProjects}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Proyek di bawah 50%.</div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                    Daftar pekerjaan bernomor
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                    {sortedCapexProjects.slice(0, 5).map((project) => (
                      <div
                        key={project.id || project.numberedNama}
                        style={{
                          padding: '0.8rem 0.9rem',
                          borderRadius: '12px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                          {project.numberedNama}
                        </div>
                        <div style={{ marginTop: '0.35rem', display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            Unit: {project.unit || project.Unit || 'Sarpras'}
                          </span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: getCapexProgressColor(Number(project.progress) || 0) }}>
                            {Math.round(Number(project.progress) || 0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Grafik progres pekerjaan CAPEX
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem', lineHeight: 1.5 }}>
                      Judul proyek dibuat bernomor dan dibungkus ke beberapa baris agar tidak terpotong.
                    </div>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    {sortedCapexProjects.length} proyek
                  </span>
                </div>

                <div style={{ width: '100%', height: `${capexChartHeight}px` }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sortedCapexProjects} layout="vertical" margin={{ left: 20, right: 42, top: 12, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} stroke="var(--text-muted)" fontSize={11} tickFormatter={(value) => `${value}%`} />
                      <YAxis
                        dataKey="numberedNama"
                        type="category"
                        width={320}
                        stroke="var(--text-muted)"
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        tick={({ x, y, payload }: any) => {
                          const lines = capexLabelLineMap.get(payload.value) || [String(payload.value || '-')];
                          const firstLineOffset = ((lines.length - 1) * 14) / 2;

                          return (
                            <g transform={`translate(${x},${y})`}>
                              <text x={-8} y={0} textAnchor="end" fill="var(--text-secondary)" fontSize={11}>
                                {lines.map((line: string, index: number) => (
                                  <tspan key={`${payload.value}-${index}`} x={-8} dy={index === 0 ? -firstLineOffset : 14}>
                                    {line}
                                  </tspan>
                                ))}
                              </text>
                            </g>
                          );
                        }}
                      />
                      <RechartsTooltip
                        formatter={(value: any) => [`${Math.round(Number(value) || 0)}%`, 'Progres']}
                        labelFormatter={(label) => String(label || '')}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-focus)', borderRadius: '8px', fontSize: '0.8rem' }}
                      />
                      <Bar dataKey="progress" radius={[0, 6, 6, 0]} barSize={24}>
                        {sortedCapexProjects.map((project, idx) => (
                          <Cell key={`cell-${idx}`} fill={getCapexProgressColor(Number(project.progress) || 0)} />
                        ))}
                        <LabelList
                          dataKey="progress"
                          position="right"
                          formatter={(value: any) => `${Math.round(Number(value) || 0)}%`}
                          style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
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
                    {item.personnel.map((p, pIdx) => {
                      const user = USERS.find(u => u.nama.includes(p));
                      return (
                        <div key={pIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem', color: p === 'Rudi' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          <UserAvatar
                            name={user?.nama || p}
                            email={user?.email}
                            photoUrl={user?.fotoProfil}
                            profileThumbByEmail={profileThumbByEmail}
                            size={22}
                          />
                          <span style={{ fontWeight: p === 'Rudi' ? 600 : 400 }}>{p}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {isLoggedIn && (
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
          )}
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
                      {(() => {
                        const sender = resolveDutyNoteUser(note);
                        return (
                          <UserAvatar
                            name={sender?.nama || note.keterangan}
                            email={note.senderEmail || sender?.email}
                            photoUrl={sender?.fotoProfil}
                            profileThumbByEmail={profileThumbByEmail}
                            size={18}
                          />
                        );
                      })()}
                      {note.keterangan.split(' ')[0]}
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button
                        onClick={(e) => { e.preventDefault(); handleLikePiket(note); }}
                        style={{ 
                          background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px',
                          display: 'flex', alignItems: 'center', gap: '0.25rem',
                          color: (() => {
                            let cl: string[] = [];
                            try { cl = JSON.parse(note.likes || '[]'); } catch(e){}
                            return cl.includes(currentUser?.email || currentUser?.nama || 'unknown') ? 'var(--accent-rose)' : 'var(--text-muted)';
                          })(),
                          transition: 'all 0.2s ease'
                        }}
                        title={(() => {
                          let cl: string[] = [];
                          try { cl = JSON.parse(note.likes || '[]'); } catch(e){}
                          return cl.includes(currentUser?.email || currentUser?.nama || 'unknown') ? 'Batal Suka' : 'Suka';
                        })()}
                      >
                        <Heart size={14} fill={(() => {
                            let cl: string[] = [];
                            try { cl = JSON.parse(note.likes || '[]'); } catch(e){}
                            return cl.includes(currentUser?.email || currentUser?.nama || 'unknown') ? 'var(--accent-rose)' : 'none';
                        })()} />
                        <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>
                          {(() => {
                            let cl: string[] = [];
                            try { cl = JSON.parse(note.likes || '[]'); } catch(e){}
                            return cl.length > 0 ? cl.length : '';
                          })()}
                        </span>
                      </button>
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
              <BarChart data={utilityChartData} margin={{ top: 25, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `Rp${v / 1000000}jt`} />
                <RechartsTooltip
                  formatter={(v: any) => formatIDR(v as number)}
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-focus)', borderRadius: '8px', fontSize: '10px' }}
                />
                <Bar dataKey="PLN" fill="var(--accent-amber)" radius={[4, 4, 0, 0]} barSize={24}>
                  <LabelList
                    dataKey="PLN"
                    position="top"
                    formatter={(v: any) => `${(Number(v) / 1000000).toFixed(1)}jt`}
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
              <BarChart data={utilityChartData} margin={{ top: 25, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `Rp${(v / 1000000).toFixed(1)}jt`} />
                <RechartsTooltip
                  formatter={(v: any) => formatIDR(v as number)}
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-focus)', borderRadius: '8px', fontSize: '10px' }}
                />
                <Bar dataKey="PDAM" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} barSize={24}>
                  <LabelList
                    dataKey="PDAM"
                    position="top"
                    formatter={(v: any) => Number(v) < 1000000 ? `${(Number(v) / 1000).toFixed(0)}rb` : `${(Number(v) / 1000000).toFixed(1)}jt`}
                    style={{ fill: 'var(--accent-cyan)', fontSize: '10px', fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-panel delay-050" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--accent-violet)', background: 'linear-gradient(135deg, rgba(139,92,246,0.06), transparent)' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
          <div>
            <h3 style={{ fontSize: '1.02rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCheck size={18} color="var(--accent-violet)" /> Seluruh Personil Sarpramoklet
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Data personil diambil dari halaman Personnel, thumbnail dari riwayat login Google.
            </p>
          </div>
          <span className="badge badge-info" style={{ borderColor: 'rgba(139,92,246,0.35)', color: 'var(--accent-violet)', background: 'rgba(139,92,246,0.12)' }}>
            {personnelForDashboard.length} Personil
          </span>
        </div>
        <div style={{ padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.8rem' }}>
          {personnelForDashboard.map((person) => {
            return (
              <div key={person.id} className="glass-panel" style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                  <UserAvatar
                    name={person.nama}
                    email={person.email}
                    photoUrl={person.fotoProfil}
                    profileThumbByEmail={profileThumbByEmail}
                    size={38}
                    background="rgba(255,255,255,0.03)"
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
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
                          color: person.roleAplikasi === ROLES.PIMPINAN ? 'var(--accent-amber)' : person.roleAplikasi.includes('Koordinator') ? 'var(--accent-blue)' : 'var(--accent-emerald)',
                          background: person.roleAplikasi === ROLES.PIMPINAN ? 'rgba(245,158,11,0.14)' : person.roleAplikasi.includes('Koordinator') ? 'rgba(59,130,246,0.14)' : 'rgba(16,185,129,0.14)',
                          border: person.roleAplikasi === ROLES.PIMPINAN ? '1px solid rgba(245,158,11,0.3)' : person.roleAplikasi.includes('Koordinator') ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(16,185,129,0.3)'
                        }}
                      >
                        {person.roleAplikasi === ROLES.PIMPINAN ? 'Pimpinan' : person.roleAplikasi.includes('Koordinator') ? 'Koordinator' : 'PIC'}
                      </span>
                    </div>
                    <div style={{ marginTop: '0.45rem', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                      {person.jabatan}
                    </div>
                    <div style={{ marginTop: '0.45rem', fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                      {isLoggedIn && <span>NIP: {person.nip}</span>}
                      <span>{person.unit}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>



      {/* ══════════════ MOKLET SERVICE POPUP ══════════════ */}
      {showServicePopup && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          zIndex: 2000, display: 'flex', flexDirection: 'column', padding: '1rem',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.75rem 1rem', marginBottom: '0.5rem',
            background: 'rgba(255,255,255,0.04)', borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
              <div style={{ padding: '0.4rem', background: 'rgba(59,130,246,0.15)', borderRadius: '8px', color: 'var(--accent-blue)', display: 'flex', flexShrink: 0 }}>
                <ExternalLink size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Moklet Service Dashboard</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {servicePopupUrl}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              {servicePopupUrl.includes('app.smktelkom-mlg.sch.id') && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  fontSize: '0.72rem', color: 'var(--accent-amber)',
                  background: 'rgba(245,158,11,0.12)', padding: '0.3rem 0.65rem', borderRadius: '6px',
                  fontWeight: 600,
                }}>
                  ⚡ Login dulu via Google SSO
                </div>
              )}
              <button
                onClick={() => setServicePopupUrl('https://app.smktelkom-mlg.sch.id/teacher/dashboard')}
                style={{
                  fontSize: '0.75rem', fontWeight: 600, padding: '0.4rem 0.75rem',
                  background: servicePopupUrl.includes('app.smktelkom-mlg') ? 'rgba(59,130,246,0.15)' : 'transparent',
                  color: 'var(--accent-blue)', border: '1px solid var(--border-subtle)',
                  borderRadius: '6px', cursor: 'pointer',
                }}
                title="Buka halaman login SSO"
              >
                🔐 Login SSO
              </button>
              <button
                onClick={() => setServicePopupUrl('https://service.smktelkom-mlg.sch.id/administrator/dashboard')}
                style={{
                  fontSize: '0.75rem', fontWeight: 600, padding: '0.4rem 0.75rem',
                  background: servicePopupUrl.includes('service.smktelkom-mlg') ? 'rgba(16,185,129,0.15)' : 'transparent',
                  color: 'var(--accent-emerald)', border: '1px solid var(--border-subtle)',
                  borderRadius: '6px', cursor: 'pointer',
                }}
                title="Buka service dashboard"
              >
                📊 Service Dashboard
              </button>
              <button
                onClick={() => window.open(servicePopupUrl, '_blank')}
                style={{
                  fontSize: '0.75rem', fontWeight: 600, padding: '0.4rem 0.75rem',
                  background: 'transparent', color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)', borderRadius: '6px', cursor: 'pointer',
                }}
                title="Buka di tab baru"
              >
                ↗ Tab Baru
              </button>
              <button
                onClick={() => setShowServicePopup(false)}
                style={{
                  background: 'rgba(244,63,94,0.12)', border: 'none', color: 'var(--accent-rose)',
                  cursor: 'pointer', padding: '0.4rem', borderRadius: '8px', display: 'flex',
                }}
                title="Tutup popup service"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Iframe Container */}
          <div style={{
            flex: 1, borderRadius: '12px', overflow: 'hidden',
            border: '1px solid var(--border-subtle)', background: '#fff',
            position: 'relative',
          }}>
            <iframe
              src={servicePopupUrl}
              title="Moklet Service Dashboard"
              style={{ width: '100%', height: '100%', border: 'none' }}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
          </div>

          {/* Footer hint */}
          <div style={{
            padding: '0.5rem 1rem', marginTop: '0.5rem', textAlign: 'center',
            fontSize: '0.7rem', color: 'var(--text-muted)',
          }}>
            💡 Login di halaman SSO (app.smktelkom-mlg.sch.id/teacher/dashboard), lalu klik "📊 Service Dashboard" untuk melihat data layanan.
            Jika iframe diblokir, gunakan "↗ Tab Baru".
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
