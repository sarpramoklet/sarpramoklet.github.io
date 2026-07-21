import { mergeCapexProjects, type CapexProjectRecord } from '../data/capexProjects';
import { USERS } from '../data/organization';
import {
  CLASSROOM_MONITOR_SHEET,
  CLASSROOM_REFERENCE_TOTAL,
  formatClassroomIdentityLabel,
  getEffectiveRoomDetails,
  getShortClassroomLabel,
  normalizeClassroomMonitorRows,
} from './classroomMonitor';
import { SARMOK_DASHBOARD_API_URL, parseSarmokDashboardBody } from './sarmokDashboard';

export const FINANCE_API_URL =
  'https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec';

const SARMOK_BASIC_AUTH_USERNAME = import.meta.env.VITE_SARMOK_BASIC_AUTH_USERNAME?.trim() || '';
const SARMOK_BASIC_AUTH_PASSWORD = import.meta.env.VITE_SARMOK_BASIC_AUTH_PASSWORD || '';
const SARMOK_DEFAULT_BASIC_AUTH_HEADER = 'Basic bW9rbGV0TWFsYW5nOnRlbGtvbUhlYmF0MjAyMw==';

const SARMOK_COMPLAINT_DETAIL_API_URL = 'https://api.smktelkom-mlg.sch.id/sarpra-complaint/sarmok/complaint';
const SARMOK_ROOM_DETAIL_API_URL = 'https://api.smktelkom-mlg.sch.id/sarpra-room-reservation/sarmok/room';
const SARMOK_BORROW_DETAIL_API_URL = 'https://api.smktelkom-mlg.sch.id/sarpra-borrow/sarmok/borrow';

const monthMap: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  Mei: 4,
  Jun: 5,
  Jul: 6,
  Agt: 7,
  Sep: 8,
  Okt: 9,
  Nov: 10,
  Des: 11,
};

const monthList = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

const ONT_SERIES = [
  { key: 'ast', label: 'Astinet' },
  { key: 'i1', label: 'Indibizz 1' },
  { key: 'i2', label: 'Indibizz 2' },
  { key: 'i3', label: 'Indibizz 3' },
  { key: 'i4', label: 'Indibizz 4' },
  { key: 'i5', label: 'Indibizz 5' },
] as const;

const DUTY_SCHEDULE = [
  { day: 'Senin',  personnel: ['Rudi', 'Nico', 'Bagus'] },
  { day: 'Selasa', personnel: ['Rudi', 'Bidin', 'Zakaria'] },
  { day: 'Rabu',   personnel: ['Rudi', 'Whyna', 'Ayat'] },
  { day: 'Kamis',  personnel: ['Rudi', 'Amalia', 'Chandra'] },
  { day: 'Jumat',  personnel: ['Rudi', 'Chusni', 'Yoko', 'Ekon'] },
];

export type DashboardSectionKey =
  | 'mokletService'
  | 'classroom'
  | 'ac'
  | 'capex'
  | 'wifi'
  | 'network'
  | 'utilities'
  | 'piket'
  | 'finance'
  | 'personnel'
  | 'duty';

export const DASHBOARD_SECTION_LABELS: Record<DashboardSectionKey, string> = {
  mokletService: 'Layanan Sarmok',
  classroom: 'Pantauan Kelas',
  ac: 'Monitor AC',
  capex: 'Progres CAPEX',
  wifi: 'Monitor Wi-Fi',
  network: 'Monitor Jaringan',
  utilities: 'Tagihan Utilitas',
  piket: 'Catatan Piket',
  finance: 'Ringkasan Keuangan',
  personnel: 'Personel',
  duty: 'Jadwal Piket',
};

export type DashboardSectionState = {
  key: DashboardSectionKey;
  label: string;
  state: 'live' | 'local' | 'unavailable';
  message: string;
};

export type SarmokComplaintSummary = {
  pending: number;
  inProgress: number;
  complete: number;
  rejected: number;
};

export type SarmokRoomSummary = {
  waitingConfirmation: number;
  activeReservation: number;
  inUseReservation: number;
  rejectedReservation: number;
};

export type SarmokToolsSummary = {
  waitingConfirmation: number;
  haveNotReturn: number;
  returned: number;
  rejected: number;
};

export type DashboardMokletServiceSnapshot = {
  complaints: SarmokComplaintSummary;
  roomReservation: SarmokRoomSummary;
  toolsLoan: SarmokToolsSummary;
  totalOpen: number;
  alerts: string[];
};

export type DashboardClassroomIssue = {
  room: string;
  label: string;
  total: number;
  summary: string;
  waliKelas: string;
};

export type DashboardClassroomSnapshot = {
  latestDate: string;
  monitoredRooms: number;
  referenceRooms: number;
  coverageRatio: number;
  issueRooms: number;
  cleanRooms: number;
  totalFindings: number;
  issueBreakdown: {
    lampu: number;
    tv: number;
    ac: number;
    kipas: number;
    lainnya: number;
    sampah: number;
    kotoran: number;
    rapih: number;
  };
  topIssueRooms: DashboardClassroomIssue[];
};

export type DashboardACTroubleRoom = {
  ruang: number;
  label: string;
  kondisi: string;
  status: string;
  pk: string;
};

export type DashboardACSnapshot = {
  total: number;
  terpasang: number;
  belum: number;
  baik: number;
  perbaikan: number;
  rusak: number;
  troubleRooms: DashboardACTroubleRoom[];
};

export type DashboardCapexItem = Pick<CapexProjectRecord, 'id' | 'nama' | 'progress' | 'owner' | 'updatedBy' | 'lastUpdated'>;

export type DashboardCapexSnapshot = {
  totalProjects: number;
  averageProgress: number;
  completedProjects: number;
  priorityProjects: number;
  topLagging: DashboardCapexItem[];
  topLeading: DashboardCapexItem[];
};

export type DashboardWifiSnapshot = {
  latestDate: string;
  latestCount: number;
  previousCount: number | null;
  delta: number | null;
  peakDate: string;
  peakCount: number;
};

export type DashboardTrafficLane = {
  label: string;
  value: number;
};

export type DashboardNetworkSnapshot = {
  latestDate: string;
  totalRx: number;
  totalTx: number;
  topRx: DashboardTrafficLane[];
  topTx: DashboardTrafficLane[];
  snapshotAvailable: boolean;
};

export type DashboardUtilityPoint = {
  name: string;
  PLN: number;
  PDAM: number;
};

export type DashboardUtilitySnapshot = {
  latestLabel: string;
  latestPLN: number;
  latestPDAM: number;
  previousLabel: string;
  deltaPLN: number | null;
  deltaPDAM: number | null;
  history: DashboardUtilityPoint[];
};

export type DashboardDutyNoteSnapshot = {
  id: string;
  tanggal: string;
  petugas: string;
  kategori: string;
  isi: string;
  likes: number;
};

export type DashboardPiketSnapshot = {
  recentNotes: DashboardDutyNoteSnapshot[];
};

export type DashboardPersonnelUnitSummary = {
  unit: string;
  count: number;
  members: string[];
};

export type DashboardPersonnelSnapshot = {
  total: number;
  byUnit: DashboardPersonnelUnitSummary[];
};

export type DashboardDutySnapshot = {
  day: string;
  personnel: string[];
};

export type DashboardFinanceLastTransaction = {
  date: string;
  note: string;
  amount: number;
  type: 'in' | 'out' | 'unknown';
};

export type DashboardFinanceCardSnapshot = {
  balance: number;
  expense: number;
  lastTransaction: DashboardFinanceLastTransaction | null;
  topCategories?: Array<{ name: string; value: number }>;
};

export type DashboardFinanceSnapshot = {
  internal: DashboardFinanceCardSnapshot;
  tu: DashboardFinanceCardSnapshot;
  ac: DashboardFinanceCardSnapshot;
};

export type DashboardAssistantSnapshot = {
  generatedAt: string;
  sectionStates: DashboardSectionState[];
  errors: string[];
  mokletService: DashboardMokletServiceSnapshot;
  classroom: DashboardClassroomSnapshot;
  ac: DashboardACSnapshot;
  capex: DashboardCapexSnapshot;
  wifi: DashboardWifiSnapshot;
  network: DashboardNetworkSnapshot;
  utilities: DashboardUtilitySnapshot;
  piket: DashboardPiketSnapshot;
  finance: DashboardFinanceSnapshot | null;
  personnel: DashboardPersonnelSnapshot;
  duty: DashboardDutySnapshot;
};

type CashRow = {
  tanggal: string;
  keterangan: string;
  debit: number;
  kredit: number;
  saldo: number;
};

type SarmokDetailKind = 'complaints' | 'roomReservation' | 'toolsLoan';

const emptyMokletSnapshot = (): DashboardMokletServiceSnapshot => ({
  complaints: { pending: 0, inProgress: 0, complete: 0, rejected: 0 },
  roomReservation: { waitingConfirmation: 0, activeReservation: 0, inUseReservation: 0, rejectedReservation: 0 },
  toolsLoan: { waitingConfirmation: 0, haveNotReturn: 0, returned: 0, rejected: 0 },
  totalOpen: 0,
  alerts: [],
});

const emptyClassroomSnapshot = (): DashboardClassroomSnapshot => ({
  latestDate: '',
  monitoredRooms: 0,
  referenceRooms: CLASSROOM_REFERENCE_TOTAL,
  coverageRatio: 0,
  issueRooms: 0,
  cleanRooms: 0,
  totalFindings: 0,
  issueBreakdown: { lampu: 0, tv: 0, ac: 0, kipas: 0, lainnya: 0, sampah: 0, kotoran: 0, rapih: 0 },
  topIssueRooms: [],
});

const emptyACSnapshot = (): DashboardACSnapshot => ({
  total: 40,
  terpasang: 0,
  belum: 40,
  baik: 0,
  perbaikan: 0,
  rusak: 0,
  troubleRooms: [],
});

const emptyCapexSnapshot = (): DashboardCapexSnapshot => ({
  totalProjects: 0,
  averageProgress: 0,
  completedProjects: 0,
  priorityProjects: 0,
  topLagging: [],
  topLeading: [],
});

const emptyWifiSnapshot = (): DashboardWifiSnapshot => ({
  latestDate: '',
  latestCount: 0,
  previousCount: null,
  delta: null,
  peakDate: '',
  peakCount: 0,
});

const emptyNetworkSnapshot = (): DashboardNetworkSnapshot => ({
  latestDate: '',
  totalRx: 0,
  totalTx: 0,
  topRx: [],
  topTx: [],
  snapshotAvailable: false,
});

const emptyUtilitySnapshot = (): DashboardUtilitySnapshot => ({
  latestLabel: '',
  latestPLN: 0,
  latestPDAM: 0,
  previousLabel: '',
  deltaPLN: null,
  deltaPDAM: null,
  history: [],
});

const emptyPiketSnapshot = (): DashboardPiketSnapshot => ({
  recentNotes: [],
});

const emptyFinanceCard = (): DashboardFinanceCardSnapshot => ({
  balance: 0,
  expense: 0,
  lastTransaction: null,
});

const emptyFinanceSnapshot = (): DashboardFinanceSnapshot => ({
  internal: emptyFinanceCard(),
  tu: emptyFinanceCard(),
  ac: emptyFinanceCard(),
});

const getSarmokBasicAuthHeader = () => {
  if (SARMOK_BASIC_AUTH_USERNAME && SARMOK_BASIC_AUTH_PASSWORD && typeof window !== 'undefined') {
    return `Basic ${window.btoa(`${SARMOK_BASIC_AUTH_USERNAME}:${SARMOK_BASIC_AUTH_PASSWORD}`)}`;
  }

  return SARMOK_DEFAULT_BASIC_AUTH_HEADER;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const normalizeErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return 'Gagal mengambil data live.';
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^\d,.-]/g, '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const compactText = (value: unknown) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const fetchSheetRows = async (sheetName: string) => {
  const response = await fetch(`${FINANCE_API_URL}?sheetName=${encodeURIComponent(sheetName)}`);
  if (!response.ok) {
    throw new Error(`Sheet ${sheetName} gagal dibaca. HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) return [];
  return data;
};

const readUnknownResponse = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json();

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const settleSection = async <T>(
  key: DashboardSectionKey,
  loader: () => Promise<T>,
  fallback: T,
  state: 'live' | 'local' = 'live'
) => {
  try {
    const data = await loader();
    return {
      data,
      section: {
        key,
        label: DASHBOARD_SECTION_LABELS[key],
        state,
        message: state === 'local' ? 'Data lokal siap dipakai.' : 'Sinkron data live berhasil.',
      } satisfies DashboardSectionState,
    };
  } catch (error) {
    return {
      data: fallback,
      section: {
        key,
        label: DASHBOARD_SECTION_LABELS[key],
        state: 'unavailable',
        message: normalizeErrorMessage(error),
      } satisfies DashboardSectionState,
    };
  }
};

const getCurrentMonthDateRange = () => {
  const now = new Date();

  // Sarpra secara default membatasi rentang tanggal 1 bulan terakhir (~32 hari agar aman menjangkau data aktif)
  const start = new Date();
  start.setDate(now.getDate() - 32);

  // Tanggal akhir ditambah 1 hari agar mencakup penuh hari ini inklusif
  const end = new Date();
  end.setDate(now.getDate() + 1);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return { startDate: formatDate(start), endDate: formatDate(end) };
};

const unwrapSarmokDetailPayload = (payload: unknown): unknown => {
  if (!isRecord(payload)) return payload;

  for (const key of ['data', 'result', 'results', 'payload', 'items', 'rows']) {
    if (payload[key] !== undefined) return unwrapSarmokDetailPayload(payload[key]);
  }

  return payload;
};

const normalizeSarmokDetailRows = (payload: unknown): Record<string, unknown>[] => {
  const unwrapped = unwrapSarmokDetailPayload(payload);
  if (Array.isArray(unwrapped)) {
    return unwrapped.filter(isRecord);
  }

  if (isRecord(unwrapped)) {
    const arrayKeys = [
      'complaints',
      'complaint',
      'borrows',
      'borrow',
      'reservations',
      'room_reservations',
      'roomReservation',
      'tools',
      'loans',
      'lends',
      'lend',
      'items',
      'rows',
    ];

    for (const key of arrayKeys) {
      const candidate = unwrapped[key];
      if (Array.isArray(candidate)) return candidate.filter(isRecord);
    }

    const firstArray = Object.values(unwrapped).find(Array.isArray);
    if (Array.isArray(firstArray)) return firstArray.filter(isRecord);

    return [unwrapped];
  }

  return [];
};

const toSarmokCount = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^\d.-]/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const normalizeStatusValue = (value: unknown) =>
  compactText(value)
    .toLowerCase()
    .replace(/\s+/g, '_');

const pickDetailValue = (source: unknown, paths: string[]): unknown => {
  if (!isRecord(source)) return undefined;

  for (const path of paths) {
    const value = path.split('.').reduce<unknown>((current, key) => {
      if (!isRecord(current)) return undefined;
      return current[key];
    }, source);

    if (value !== undefined && value !== null && value !== '') return value;
  }

  return undefined;
};

const getRowStatusValue = (row: unknown) => {
  return normalizeStatusValue(
    pickDetailValue(row, [
      'status',
      'status_name',
      'state',
      'approval_status',
      'borrow_status',
      'reservation_status',
      'complaint_status',
      'module_status',
    ])
  );
};

const hasAnyDetailValue = (row: unknown, paths: string[]) => {
  return paths.some((path) => {
    const value = pickDetailValue(row, [path]);
    return value !== undefined && value !== null && value !== '';
  });
};

const isTruthyDetailFlag = (row: unknown, paths: string[]) => {
  return paths.some((path) => {
    const value = pickDetailValue(row, [path]);
    const normalized = normalizeStatusValue(value);
    return value === true || value === 1 || value === '1' || normalized.includes('verified') || normalized.includes('approved');
  });
};

const parseSarmokDetailDate = (value: unknown) => {
  const raw = compactText(value);
  if (!raw) return null;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const pickSarmokCount = (source: unknown, aliases: string[]) => {
  const candidates = [source, unwrapSarmokDetailPayload(source)].filter(isRecord);
  for (const record of candidates) {
    for (const alias of aliases) {
      const parsed = toSarmokCount(record[alias]);
      if (parsed !== undefined) return parsed;
    }
  }

  const normalizedAliases = aliases.map((alias) => alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const record of candidates) {
    for (const [key, value] of Object.entries(record)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedAliases.includes(normalizedKey)) {
        const parsed = toSarmokCount(value);
        if (parsed !== undefined) return parsed;
      }
    }
  }

  return undefined;
};

const pickSarmokStatusCount = (source: unknown, statusAliases: string[]) => {
  const normalizedAliases = statusAliases.map((alias) => normalizeStatusValue(alias));
  const candidates: unknown[] = [];

  if (isRecord(source)) {
    candidates.push(source);
    for (const key of ['summary', 'summaries', 'stats', 'statistic', 'statistics', 'status', 'statuses', 'status_summary', 'statusSummary', 'data']) {
      if (source[key] !== undefined) candidates.push(source[key]);
    }
  }

  const unwrapped = unwrapSarmokDetailPayload(source);
  if (unwrapped !== source) candidates.push(unwrapped);

  const statusMatches = (value: unknown) => {
    const normalized = normalizeStatusValue(value);
    return normalizedAliases.some((alias) => normalized.includes(alias));
  };

  const pickCountFromRecord = (record: Record<string, unknown>) => {
    for (const alias of normalizedAliases) {
      for (const [key, value] of Object.entries(record)) {
        const normalizedKey = normalizeStatusValue(key);
        if (normalizedKey === alias || normalizedKey.includes(alias)) {
          const parsed = toSarmokCount(value);
          if (parsed !== undefined) return parsed;
        }
      }
    }

    const statusFields = ['status', 'state', 'label', 'name', 'type', 'category'];
    const countFields = ['count', 'total', 'value', 'jumlah', 'qty', 'data', 'amount'];
    for (const statusField of statusFields) {
      if (statusMatches(record[statusField])) {
        for (const countField of countFields) {
          const parsed = toSarmokCount(record[countField]);
          if (parsed !== undefined) return parsed;
        }
      }
    }

    return undefined;
  };

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        if (!isRecord(item)) continue;
        const parsed = pickCountFromRecord(item);
        if (parsed !== undefined) return parsed;
      }
    }

    if (isRecord(candidate)) {
      const direct = pickCountFromRecord(candidate);
      if (direct !== undefined) return direct;

      for (const value of Object.values(candidate)) {
        if (!Array.isArray(value)) continue;
        for (const item of value) {
          if (!isRecord(item)) continue;
          const parsed = pickCountFromRecord(item);
          if (parsed !== undefined) return parsed;
        }
      }
    }
  }

  return undefined;
};

const isSarmokRejectedRow = (row: unknown) => {
  const status = getRowStatusValue(row);
  const rejectedKeywords = ['3', 'rejected', 'reject', 'ditolak', 'declined', 'cancel'];
  if (rejectedKeywords.some((keyword) => status.includes(keyword))) return true;

  if (row && typeof row === 'object' && !Array.isArray(row)) {
    const vAdmin = (row as any).verified_admin ?? (row as any).verifiedAdmin;
    if (vAdmin === 2 || vAdmin === '2') return true;
  }

  return hasAnyDetailValue(row, ['rejected_at', 'declined_at', 'rejected_date', 'declined_date']);
};

const isSarmokPendingRow = (row: unknown) => {
  if (isSarmokRejectedRow(row)) return false;
  const status = getRowStatusValue(row);
  const pendingKeywords = ['0', 'pending', 'waiting', 'menunggu', 'waiting_confirmation'];
  if (pendingKeywords.some((keyword) => status.includes(keyword))) return true;

  if (row && typeof row === 'object' && !Array.isArray(row)) {
    const vAdmin = (row as any).verified_admin ?? (row as any).verifiedAdmin;
    if (vAdmin === 0 || vAdmin === '0') return true;
  }

  if (status && status !== '-') return false;
  return !hasAnyDetailValue(row, ['verified_at', 'approved_at', 'process_at', 'processed_at', 'returned_at']);
};

const isSarmokProcessRow = (row: unknown) => {
  if (isSarmokRejectedRow(row)) return false;
  const status = getRowStatusValue(row);
  const processKeywords = ['process', 'diproses', 'in_progress', 'progress'];
  if (processKeywords.some((keyword) => status.includes(keyword))) return true;

  return hasAnyDetailValue(row, ['process_at', 'processed_at', 'in_progress_at', 'inProgressAt']);
};

const isSarmokReturnedRow = (row: unknown) => {
  const status = getRowStatusValue(row);
  const returnedKeywords = ['2', 'returned', 'dikembalikan', 'kembali', 'complete', 'completed', 'done', 'finish', 'selesai'];
  if (returnedKeywords.some((keyword) => status.includes(keyword))) return true;

  return hasAnyDetailValue(row, [
    'return_at',
    'returned_at',
    'finish_at',
    'finished_at',
    'completed_at',
    'return_date',
    'returned_date',
    'finish_date',
    'finished_date',
    'completed_date',
  ]);
};

const isSarmokActiveRow = (row: unknown) => {
  if (isSarmokRejectedRow(row)) return false;
  if (isSarmokReturnedRow(row)) return false;

  const status = getRowStatusValue(row);
  const activeKeywords = ['1', 'active', 'approved', 'verified', 'terverifikasi', 'aktif', 'disetujui', 'berlangsung', 'ongoing'];
  if (activeKeywords.some((keyword) => status.includes(keyword))) return true;

  if (row && typeof row === 'object' && !Array.isArray(row)) {
    const vAdmin = (row as any).verified_admin ?? (row as any).verifiedAdmin;
    if (vAdmin === 1 || vAdmin === '1') return true;
  }

  if (hasAnyDetailValue(row, ['verified_admin'])) {
    return isTruthyDetailFlag(row, ['verified_admin']);
  }

  if (isTruthyDetailFlag(row, ['verified_responsibility']) && !hasAnyDetailValue(row, ['verified_admin'])) {
    return true;
  }

  if (status && status !== '-') return false;
  return hasAnyDetailValue(row, ['process_at', 'processed_at', 'approved_at', 'start_at', 'borrow_at']);
};

const isSarmokRoomInUseRow = (row: unknown) => {
  if (!isSarmokActiveRow(row)) return false;

  const start = parseSarmokDetailDate(pickDetailValue(row, ['start_date', 'start_at', 'date_start', 'from', 'tanggal']));
  const end = parseSarmokDetailDate(pickDetailValue(row, ['end_date', 'end_at', 'date_end', 'to']));
  const now = new Date();

  if (start && end) return start <= now && now <= end;
  if (start) return start <= now;
  if (end) return now <= end;
  return false;
};

const normalizeComplaintStats = (
  payload: unknown,
  fallback: { waitingConfirmation: number; onProcess: number; rejected: number }
): SarmokComplaintSummary => {
  const rows = normalizeSarmokDetailRows(payload);
  const hasPayload = payload !== null && payload !== undefined;
  const unwrapped = unwrapSarmokDetailPayload(payload) as Record<string, unknown> | undefined;

  const pending = (hasPayload ? rows.filter(isSarmokPendingRow).length : undefined)
    ?? (unwrapped ? toSarmokCount(unwrapped.countWaitingComplaints ?? unwrapped.count_waiting_complaints) : undefined)
    ?? pickSarmokCount(payload, ['count_pending', 'countPending', 'pending', 'pending_count', 'waitingConfirmation'])
    ?? pickSarmokStatusCount(payload, ['pending', 'waiting', 'menunggu', 'konfirmasi'])
    ?? fallback.waitingConfirmation
    ?? 0;

  const inProgress = (hasPayload ? rows.filter(isSarmokProcessRow).length : undefined)
    ?? (unwrapped ? toSarmokCount(unwrapped.countInProcessComplaints ?? unwrapped.count_in_process_complaints) : undefined)
    ?? pickSarmokCount(payload, ['count_in_progress', 'countInProgress', 'count_process', 'in_progress', 'inProgress', 'on_process'])
    ?? pickSarmokStatusCount(payload, ['in_progress', 'on_process', 'process', 'diproses', 'berjalan'])
    ?? fallback.onProcess
    ?? 0;

  const complete = (hasPayload ? rows.filter(isSarmokReturnedRow).length : undefined)
    ?? (unwrapped ? toSarmokCount(unwrapped.countCompleteComplaints ?? unwrapped.count_complete_complaints) : undefined)
    ?? pickSarmokCount(payload, ['count_completed', 'count_complete', 'countComplete', 'countCompleted', 'completed', 'complete'])
    ?? pickSarmokStatusCount(payload, ['completed', 'complete', 'selesai', 'done', 'returned'])
    ?? 0;

  const rejected = (hasPayload ? rows.filter(isSarmokRejectedRow).length : undefined)
    ?? (unwrapped ? toSarmokCount(unwrapped.countRejectedComplaints ?? unwrapped.count_rejected_complaints) : undefined)
    ?? pickSarmokCount(payload, ['count_rejected', 'countRejected', 'rejected', 'reject', 'ditolak'])
    ?? pickSarmokStatusCount(payload, ['rejected', 'reject', 'ditolak'])
    ?? fallback.rejected
    ?? 0;

  return { pending, inProgress, complete, rejected };
};

const normalizeRoomStats = (
  payload: unknown,
  fallback: { waitingConfirmation: number; activeReservation: number; rejectedReservation: number }
): SarmokRoomSummary => {
  const rows = normalizeSarmokDetailRows(payload);
  const hasPayload = payload !== null && payload !== undefined;
  const unwrapped = unwrapSarmokDetailPayload(payload) as Record<string, unknown> | undefined;

  const waitingConfirmation = (hasPayload ? rows.filter(isSarmokPendingRow).length : undefined)
    ?? (unwrapped ? toSarmokCount(unwrapped.countPendingReservation ?? unwrapped.count_pending_reservation) : undefined)
    ?? pickSarmokCount(payload, ['count_pending', 'countPending', 'pending', 'waitingConfirmation', 'waiting_confirmation'])
    ?? pickSarmokStatusCount(payload, ['pending', 'waiting', 'waiting_confirmation', 'menunggu', 'menunggu_konfirmasi'])
    ?? fallback.waitingConfirmation
    ?? 0;

  const activeReservation = (hasPayload ? rows.filter(isSarmokActiveRow).length : undefined)
    ?? (unwrapped ? toSarmokCount(unwrapped.countActiveReservation ?? unwrapped.count_active_reservation) : undefined)
    ?? pickSarmokCount(payload, ['count_verified', 'countVerified', 'count_approved', 'countApproved', 'count_active', 'countActive', 'verified', 'approved', 'active'])
    ?? pickSarmokStatusCount(payload, ['verified', 'approved', 'active', 'ongoing', 'disetujui'])
    ?? fallback.activeReservation
    ?? 0;

  const inUseReservation = (hasPayload ? rows.filter(isSarmokRoomInUseRow).length : undefined)
    ?? pickSarmokCount(payload, ['count_in_use', 'countInUse', 'count_using', 'countUsing', 'in_use', 'inUse'])
    ?? 0;

  const rejectedReservation = (hasPayload ? rows.filter(isSarmokRejectedRow).length : undefined)
    ?? (unwrapped ? toSarmokCount(unwrapped.countRejectedReservation ?? unwrapped.count_rejected_reservation) : undefined)
    ?? pickSarmokCount(payload, ['count_rejected', 'countRejected', 'count_rejected_reservation', 'rejected', 'reject', 'ditolak'])
    ?? pickSarmokStatusCount(payload, ['rejected', 'reject', 'ditolak'])
    ?? fallback.rejectedReservation
    ?? 0;

  return { waitingConfirmation, activeReservation, inUseReservation, rejectedReservation };
};

const normalizeToolsStats = (
  payload: unknown,
  fallback: { waitingConfirmation: number; haveNotReturn: number; returned: number; rejected: number }
): SarmokToolsSummary => {
  const rows = normalizeSarmokDetailRows(payload);
  const hasPayload = payload !== null && payload !== undefined;
  const unwrapped = unwrapSarmokDetailPayload(payload) as Record<string, unknown> | undefined;

  const waitingConfirmation = (hasPayload ? rows.filter(isSarmokPendingRow).length : undefined)
    ?? (unwrapped ? toSarmokCount(unwrapped.countPendingLoans ?? unwrapped.count_pending_loans) : undefined)
    ?? pickSarmokCount(payload, ['count_pending', 'countPending', 'pending', 'waitingConfirmation', 'waiting_confirmation'])
    ?? pickSarmokStatusCount(payload, ['pending', 'waiting', 'menunggu', 'konfirmasi'])
    ?? fallback.waitingConfirmation
    ?? 0;

  const haveNotReturn = (hasPayload ? rows.filter(isSarmokActiveRow).length : undefined)
    ?? (unwrapped ? toSarmokCount(unwrapped.countVerifiedLoans ?? unwrapped.count_verified_loans) : undefined)
    ?? pickSarmokCount(payload, ['count_verified', 'countVerified', 'count_approved', 'countApproved', 'count_active', 'countActive', 'count_not_returned', 'countNotReturned', 'verified', 'approved', 'active', 'haveNotReturn'])
    ?? pickSarmokStatusCount(payload, ['verified', 'approved', 'active', 'terverifikasi', 'disetujui', 'aktif'])
    ?? fallback.haveNotReturn
    ?? 0;

  const returned = (hasPayload ? rows.filter(isSarmokReturnedRow).length : undefined)
    ?? (unwrapped ? toSarmokCount(unwrapped.countReturnedLoans ?? unwrapped.count_returned_loans) : undefined)
    ?? pickSarmokCount(payload, ['count_returned', 'count_complete', 'countReturned', 'countComplete', 'returned', 'complete'])
    ?? pickSarmokStatusCount(payload, ['returned', 'complete', 'completed', 'selesai', 'dikembalikan'])
    ?? fallback.returned
    ?? 0;

  const rejected = (hasPayload ? rows.filter(isSarmokRejectedRow).length : undefined)
    ?? (unwrapped ? toSarmokCount(unwrapped.countRejectedLoans ?? unwrapped.count_rejected_loans) : undefined)
    ?? pickSarmokCount(payload, ['count_rejected', 'countRejected', 'rejected', 'reject'])
    ?? pickSarmokStatusCount(payload, ['rejected', 'reject', 'ditolak'])
    ?? fallback.rejected
    ?? 0;

  return { waitingConfirmation, haveNotReturn, returned, rejected };
};

const readSarmokDashboardResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return parseSarmokDashboardBody(await response.json());
  }

  return parseSarmokDashboardBody(await response.text());
};

const fetchSarmokDashboardData = async (authHeader: string) => {
  try {
    const directResponse = await fetch(SARMOK_DASHBOARD_API_URL, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
    });

    if (!directResponse.ok) throw new Error(`Sarmok API failed (${directResponse.status})`);
    return await readSarmokDashboardResponse(directResponse);
  } catch (directError) {
    const proxyUrl = `${FINANCE_API_URL}?proxyUrl=${encodeURIComponent(SARMOK_DASHBOARD_API_URL)}&authHeader=${encodeURIComponent(authHeader)}`;
    const proxyResponse = await fetch(proxyUrl, { headers: { Accept: 'application/json' } });
    if (!proxyResponse.ok) {
      throw directError instanceof Error ? directError : new Error(`Sarmok proxy failed (${proxyResponse.status})`);
    }

    return readSarmokDashboardResponse(proxyResponse);
  }
};

const buildSarmokDetailUrl = (endpoint: string, kind: SarmokDetailKind) => {
  const url = new URL(endpoint);
  url.searchParams.set('page', '1');
  url.searchParams.set('quantity', '100');

  if (kind !== 'complaints') {
    const { startDate, endDate } = getCurrentMonthDateRange();
    url.searchParams.set('startDate', startDate);
    url.searchParams.set('endDate', endDate);
  }

  return url.toString();
};

const fetchSarmokDetailPayload = async (endpoint: string, kind: SarmokDetailKind, authHeader: string) => {
  const targetUrl = buildSarmokDetailUrl(endpoint, kind);

  try {
    const directResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
    });

    if (!directResponse.ok) throw new Error(`Sarmok detail API failed (${directResponse.status})`);
    return readUnknownResponse(directResponse);
  } catch (directError) {
    const proxyUrl = `${FINANCE_API_URL}?proxyUrl=${encodeURIComponent(targetUrl)}&authHeader=${encodeURIComponent(authHeader)}`;
    const proxyResponse = await fetch(proxyUrl, { headers: { Accept: 'application/json' } });
    if (!proxyResponse.ok) {
      throw directError instanceof Error ? directError : new Error(`Sarmok detail proxy failed (${proxyResponse.status})`);
    }

    return readUnknownResponse(proxyResponse);
  }
};

const buildMokletServiceSnapshot = async (): Promise<DashboardMokletServiceSnapshot> => {
  const authHeader = getSarmokBasicAuthHeader();
  if (!authHeader) {
    throw new Error('Autentikasi Sarmok belum tersedia.');
  }

  const dashboardData = await fetchSarmokDashboardData(authHeader);

  const [complaintPayload, roomPayload, toolsPayload] = await Promise.all([
    fetchSarmokDetailPayload(SARMOK_COMPLAINT_DETAIL_API_URL, 'complaints', authHeader).catch(() => null),
    fetchSarmokDetailPayload(SARMOK_ROOM_DETAIL_API_URL, 'roomReservation', authHeader).catch(() => null),
    fetchSarmokDetailPayload(SARMOK_BORROW_DETAIL_API_URL, 'toolsLoan', authHeader).catch(() => null),
  ]);

  const complaints = normalizeComplaintStats(complaintPayload, dashboardData.complaints);
  const roomReservation = normalizeRoomStats(roomPayload, dashboardData.roomReservation);
  const toolsLoan = normalizeToolsStats(toolsPayload, dashboardData.toolsLoan);

  const alerts: string[] = [];
  if (complaints.pending > 0) alerts.push(`${complaints.pending} pengaduan menunggu verifikasi.`);
  if (complaints.inProgress > 0) alerts.push(`${complaints.inProgress} pengaduan masih diproses.`);
  if (roomReservation.waitingConfirmation > 0) alerts.push(`${roomReservation.waitingConfirmation} reservasi ruang belum dikonfirmasi.`);
  if (toolsLoan.haveNotReturn > 0) alerts.push(`${toolsLoan.haveNotReturn} peminjaman alat belum kembali.`);

  return {
    complaints,
    roomReservation,
    toolsLoan,
    totalOpen:
      complaints.pending +
      complaints.inProgress +
      roomReservation.waitingConfirmation +
      roomReservation.activeReservation +
      toolsLoan.waitingConfirmation +
      toolsLoan.haveNotReturn,
    alerts,
  };
};

const buildClassroomSnapshot = async (): Promise<DashboardClassroomSnapshot> => {
  const rows = normalizeClassroomMonitorRows(await fetchSheetRows(CLASSROOM_MONITOR_SHEET));
  if (rows.length === 0) return emptyClassroomSnapshot();

  const latestDate = rows[0]?.tanggal || '';
  const latestRows = rows.filter((row) => row.tanggal === latestDate);
  const issueRows = latestRows
    .filter((row) => row.total > 0)
    .sort((left, right) => right.total - left.total || left.ruang.localeCompare(right.ruang, 'id-ID', { numeric: true }));

  const breakdown = latestRows.reduce(
    (acc, row) => {
      acc.lampu += row.lampu;
      acc.tv += row.tv;
      acc.ac += row.ac;
      acc.kipas += row.kipas;
      acc.lainnya += row.lainnya;
      acc.sampah += row.sampah;
      acc.kotoran += row.kotoran;
      acc.rapih += row.rapih;
      return acc;
    },
    { lampu: 0, tv: 0, ac: 0, kipas: 0, lainnya: 0, sampah: 0, kotoran: 0, rapih: 0 }
  );

  const topIssueRooms = issueRows.slice(0, 5).map((row) => {
    const details = getEffectiveRoomDetails(row);
    return {
      room: row.ruang,
      label: formatClassroomIdentityLabel(row, { shortRoom: true, includeWali: false }),
      total: row.total,
      summary: compactText(row.keterangan),
      waliKelas: compactText(details.waliKelas),
    };
  });

  return {
    latestDate,
    monitoredRooms: latestRows.length,
    referenceRooms: CLASSROOM_REFERENCE_TOTAL,
    coverageRatio: latestRows.length > 0 ? latestRows.length / CLASSROOM_REFERENCE_TOTAL : 0,
    issueRooms: issueRows.length,
    cleanRooms: latestRows.filter((row) => row.total === 0).length,
    totalFindings: issueRows.reduce((sum, row) => sum + row.total, 0),
    issueBreakdown: breakdown,
    topIssueRooms,
  };
};

const buildDefaultACRoom = (ruang: number) => {
  // R.1-6:   1.5 PK, 2 unit, merk -
  // R.7-16:  1.5 PK, 1 unit, Gree (revisi Juli 2025)
  // R.17-24: 2 PK,   2 unit, merk -
  // R.25-32: 2 PK,   1 unit, merk -
  // R.33-40: 1.5 PK, 1 unit, LG Inverter
  let pk = '1.5 PK';

  if ((ruang >= 17 && ruang <= 32)) {
    pk = '2 PK';
  }
  // R33-40 kembali ke 1.5 PK (LG Inverter)

  return { ruang, status: 'Terpasang', kondisi: 'Baik', pk };
};

const buildACSnapshot = async (): Promise<DashboardACSnapshot> => {
  const rows = await fetchSheetRows('Monitor_AC');
  const rowByRoom = new Map<number, Record<string, unknown>>();

  rows.forEach((row) => {
    const ruang = parseInt(String(row.ruang || row.Ruang || ''), 10);
    if (!Number.isFinite(ruang)) return;
    rowByRoom.set(ruang, row);
  });

  let terpasang = 0;
  let belum = 0;
  let baik = 0;
  let perbaikan = 0;
  let rusak = 0;
  const troubleRooms: DashboardACTroubleRoom[] = [];

  for (let ruang = 1; ruang <= 40; ruang += 1) {
    const saved = rowByRoom.get(ruang);
    const fallback = buildDefaultACRoom(ruang);
    // Jika DB masih menyimpan 'Belum Terpasang' (data lama), gunakan default baru
    const dbStatus = compactText(saved?.status || saved?.Status || '');
    const status = dbStatus === 'Terpasang' ? dbStatus : fallback.status;
    const dbKondisi = compactText(saved?.kondisi || saved?.Kondisi || '');
    const kondisi = dbStatus === 'Terpasang' ? (dbKondisi || fallback.kondisi) : fallback.kondisi;
    const pk = compactText(saved?.pk || saved?.PK || fallback.pk) || fallback.pk;

    if (status === 'Terpasang') terpasang += 1;
    else belum += 1;

    if (kondisi === 'Baik') baik += 1;
    else if (kondisi === 'Perbaikan') perbaikan += 1;
    else if (kondisi === 'Rusak') rusak += 1;

    if (kondisi === 'Perbaikan' || kondisi === 'Rusak') {
      troubleRooms.push({
        ruang,
        label: `${getShortClassroomLabel(`Ruang ${ruang}`)}${getEffectiveRoomDetails({ ruang: `Ruang ${ruang}` }).className ? ` · ${getEffectiveRoomDetails({ ruang: `Ruang ${ruang}` }).className}` : ''}`,
        kondisi,
        status,
        pk,
      });
    }
  }

  return {
    total: 40,
    terpasang,
    belum,
    baik,
    perbaikan,
    rusak,
    troubleRooms,
  };
};

const buildCapexSnapshot = async (): Promise<DashboardCapexSnapshot> => {
  const projects = mergeCapexProjects((await fetchSheetRows('Progres_CAPEX')) as Record<string, unknown>[]);
  const byProgressAsc = projects
    .slice()
    .sort((left, right) => left.progress - right.progress || left.nama.localeCompare(right.nama, 'id-ID'));
  const byProgressDesc = projects
    .slice()
    .sort((left, right) => right.progress - left.progress || left.nama.localeCompare(right.nama, 'id-ID'));

  return {
    totalProjects: projects.length,
    averageProgress: projects.length > 0 ? projects.reduce((sum, project) => sum + project.progress, 0) / projects.length : 0,
    completedProjects: projects.filter((project) => project.progress >= 100).length,
    priorityProjects: projects.filter((project) => project.progress < 50).length,
    topLagging: byProgressAsc.slice(0, 5),
    topLeading: byProgressDesc.slice(0, 5),
  };
};

const parseWifiDateValue = (raw: unknown): Date | null => {
  const value = compactText(raw);
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const dmy = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/);
  if (dmy) {
    const day = parseInt(dmy[1], 10) || 1;
    const month = (parseInt(dmy[2], 10) || 1) - 1;
    const yearRaw = parseInt(dmy[3], 10) || 0;
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    return new Date(year, month, day);
  }

  const parts = value.split(' ');
  if (parts.length >= 3 && monthMap[parts[1]] !== undefined) {
    const day = parseInt(parts[0], 10) || 1;
    const month = monthMap[parts[1]];
    const yearRaw = parseInt(parts[2], 10) || 0;
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    return new Date(year, month, day);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatWifiDateDisplay = (raw: unknown) => {
  const parsed = parseWifiDateValue(raw);
  if (!parsed) return compactText(raw);
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = monthList[parsed.getMonth()] || 'Jan';
  const year = String(parsed.getFullYear()).slice(-2);
  return `${day} ${month} ${year}`;
};

const buildWifiSnapshot = async (): Promise<DashboardWifiSnapshot> => {
  const rows = await fetchSheetRows('Monitor_Wifi');
  const mapped = rows
    .filter((row) => compactText(row.id || row.ID) && compactText(row.tanggal || row.Tanggal))
    .map((row) => {
      const parsed = parseWifiDateValue(row.tanggal || row.Tanggal);
      return {
        date: formatWifiDateDisplay(row.tanggal || row.Tanggal),
        count: parseInt(String(row.count || row.Count || '0'), 10) || 0,
        sortTs: parsed?.getTime() || 0,
      };
    })
    .sort((left, right) => left.sortTs - right.sortTs);

  if (mapped.length === 0) return emptyWifiSnapshot();

  const latest = mapped[mapped.length - 1];
  const previous = mapped[mapped.length - 2] || null;
  const peak = mapped.slice().sort((left, right) => right.count - left.count)[0] || latest;

  return {
    latestDate: latest.date,
    latestCount: latest.count,
    previousCount: previous ? previous.count : null,
    delta: previous ? latest.count - previous.count : null,
    peakDate: peak.date,
    peakCount: peak.count,
  };
};

const toShortDate = (raw: unknown) => {
  const parsed = parseWifiDateValue(raw);
  if (!parsed) return '';
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = String(parsed.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
};

const parseShortDateTs = (shortDate: string) => {
  const parts = shortDate.split('-');
  if (parts.length !== 3) return 0;
  const day = parseInt(parts[0], 10) || 1;
  const month = (parseInt(parts[1], 10) || 1) - 1;
  const year = parseInt(parts[2], 10) || 0;
  return new Date(2000 + year, month, day).getTime();
};

const inferDateFromNetId = (id: unknown) => {
  const match = compactText(id).match(/NET-(\d{2})(\d{2})(\d{2})$/);
  if (!match) return '';
  return `${match[1]}-${match[2]}-${match[3]}`;
};

const inferLegacySeedDate = (row: Record<string, unknown>) => {
  const signature = [
    toNumber(row.i1_rx),
    toNumber(row.i1_tx),
    toNumber(row.i2_rx),
    toNumber(row.i2_tx),
    toNumber(row.i3_rx),
    toNumber(row.i3_tx),
    toNumber(row.i4_rx),
    toNumber(row.i4_tx),
    toNumber(row.i5_rx),
    toNumber(row.i5_tx),
    toNumber(row.ast_rx),
    toNumber(row.ast_tx),
  ].join('|');

  if (signature === '278|30.9|277|22.5|280|58.6|162|8.26|118|8.75|5.97|2.22') return '01-04-26';
  if (signature === '366|21.8|253|15.4|270|18.7|101|14.3|130|5.44|28.9|1.21') return '06-04-26';
  return '';
};

const buildNetworkSnapshot = async (): Promise<DashboardNetworkSnapshot> => {
  const rows = (await fetchSheetRows('Monitor_Net')).filter(isRecord);
  if (rows.length === 0) return emptyNetworkSnapshot();

  const normalized = rows
    .map((row, index) => {
      const inferredDate = inferDateFromNetId(row.id || row.ID) || toShortDate(row.tanggal || row.Tanggal) || inferLegacySeedDate(row);
      const fallbackTs = parseWifiDateValue(row.tanggal || row.Tanggal)?.getTime() || 0;
      const timestamp = parseShortDateTs(inferredDate) || fallbackTs || index + 1;

      const normalizedRow = {
        tanggal: inferredDate || compactText(row.tanggal || row.Tanggal),
        snapshot: compactText(row.snapshot || row.Snapshot || row.snapshot_url || row.Snapshot_URL),
        ast_rx: toNumber(row.ast_rx),
        ast_tx: toNumber(row.ast_tx),
        i1_rx: toNumber(row.i1_rx),
        i1_tx: toNumber(row.i1_tx),
        i2_rx: toNumber(row.i2_rx),
        i2_tx: toNumber(row.i2_tx),
        i3_rx: toNumber(row.i3_rx),
        i3_tx: toNumber(row.i3_tx),
        i4_rx: toNumber(row.i4_rx),
        i4_tx: toNumber(row.i4_tx),
        i5_rx: toNumber(row.i5_rx),
        i5_tx: toNumber(row.i5_tx),
        sortTs: timestamp,
      };

      const metrics = [
        normalizedRow.ast_rx,
        normalizedRow.ast_tx,
        normalizedRow.i1_rx,
        normalizedRow.i1_tx,
        normalizedRow.i2_rx,
        normalizedRow.i2_tx,
        normalizedRow.i3_rx,
        normalizedRow.i3_tx,
        normalizedRow.i4_rx,
        normalizedRow.i4_tx,
        normalizedRow.i5_rx,
        normalizedRow.i5_tx,
      ];

      return {
        ...normalizedRow,
        nonZeroCount: metrics.filter((value) => value > 0).length,
        score: metrics.reduce((sum, value) => sum + Math.max(0, value), 0),
      };
    })
    .sort((left, right) => left.sortTs - right.sortTs);

  const trafficRows = normalized.filter((row) => row.nonZeroCount > 0 && row.tanggal);
  const bestByDate = new Map<string, (typeof normalized)[number]>();

  trafficRows.forEach((row) => {
    const existing = bestByDate.get(row.tanggal);
    if (!existing) {
      bestByDate.set(row.tanggal, row);
      return;
    }

    const existingValue = existing.nonZeroCount * 100000 + existing.score;
    const currentValue = row.nonZeroCount * 100000 + row.score;
    if (currentValue > existingValue || (currentValue === existingValue && row.sortTs > existing.sortTs)) {
      bestByDate.set(row.tanggal, row);
    }
  });

  const bestRows = Array.from(bestByDate.values()).sort((left, right) => parseShortDateTs(left.tanggal) - parseShortDateTs(right.tanggal));
  const latest = bestRows[bestRows.length - 1] || normalized[normalized.length - 1];
  if (!latest) return emptyNetworkSnapshot();

  const topRx = ONT_SERIES.map((lane) => ({
    label: lane.label,
    value: latest[`${lane.key}_rx` as keyof typeof latest] as number,
  }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 3);

  const topTx = ONT_SERIES.map((lane) => ({
    label: lane.label,
    value: latest[`${lane.key}_tx` as keyof typeof latest] as number,
  }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 3);

  return {
    latestDate: latest.tanggal,
    totalRx: ONT_SERIES.reduce((sum, lane) => sum + Number(latest[`${lane.key}_rx` as keyof typeof latest] || 0), 0),
    totalTx: ONT_SERIES.reduce((sum, lane) => sum + Number(latest[`${lane.key}_tx` as keyof typeof latest] || 0), 0),
    topRx,
    topTx,
    snapshotAvailable: Boolean(latest.snapshot),
  };
};

const normalizeUtilityMonth = (value: unknown): string => {
  const raw = compactText(value).replace(/^'+/, '');
  if (!raw) return '';

  if (/^\d{4}-\d{2}$/.test(raw)) return raw;

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
    }
    return raw.slice(0, 7);
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
  }

  return '';
};

const parseLegacyUtilityId = (value: unknown) => {
  const id = compactText(value).toUpperCase();
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

const buildUtilityChartFromRows = (rows: Record<string, unknown>[]): DashboardUtilityPoint[] => {
  const monthTotals = new Map<string, { PLN: number; PDAM: number }>();

  rows.forEach((row) => {
    const legacy = parseLegacyUtilityId(row.ID || row.id);
    const month = normalizeUtilityMonth(row.Bulan || row.bulan || row.tanggal || row.Tanggal || legacy?.month);
    const rawType = compactText(row.Jenis || row.jenis || row.type || row.Type || legacy?.jenis).toUpperCase();
    const type = rawType === 'PDAM' ? 'PDAM' : 'PLN';
    const nominal = toNumber(row.Nominal || row.nominal || row.amount || row.Amount);

    if (!month || nominal <= 0) return;

    const current = monthTotals.get(month) || { PLN: 0, PDAM: 0 };
    current[type] += nominal;
    monthTotals.set(month, current);
  });

  const monthKeys = Array.from(monthTotals.keys()).sort((left, right) => left.localeCompare(right)).slice(-12);
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

const buildUtilitySnapshot = async (): Promise<DashboardUtilitySnapshot> => {
  const history = buildUtilityChartFromRows((await fetchSheetRows('Tagihan_Utilitas')) as Record<string, unknown>[]);
  if (history.length === 0) return emptyUtilitySnapshot();

  const latest = history[history.length - 1];
  const previous = history[history.length - 2] || null;

  return {
    latestLabel: latest.name,
    latestPLN: latest.PLN,
    latestPDAM: latest.PDAM,
    previousLabel: previous?.name || '',
    deltaPLN: previous ? latest.PLN - previous.PLN : null,
    deltaPDAM: previous ? latest.PDAM - previous.PDAM : null,
    history,
  };
};

const formatDutyNoteDate = (value: unknown) => {
  const raw = compactText(value);
  if (!raw) return '-';

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  const day = String(parsed.getDate()).padStart(2, '0');
  const month = monthList[parsed.getMonth()] || 'Jan';
  const year = parsed.getFullYear();
  const hour = String(parsed.getHours()).padStart(2, '0');
  const minute = String(parsed.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hour}:${minute}`;
};

const parseLikesCount = (value: unknown) => {
  if (Array.isArray(value)) return value.length;
  if (typeof value !== 'string') return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return trimmed.split(',').map((item) => item.trim()).filter(Boolean).length;
  }
};

const buildPiketSnapshot = async (): Promise<DashboardPiketSnapshot> => {
  const rows = await fetchSheetRows('Piket');
  const recentNotes = rows
    .filter((row) => compactText(row.id || row.ID) && compactText(row.amount || row.Amount))
    .map((row) => ({
      id: compactText(row.id || row.ID),
      tanggal: formatDutyNoteDate(row.tanggal || row.Tanggal),
      petugas: compactText(row.keterangan || row.Keterangan || 'Petugas') || 'Petugas',
      kategori: compactText(row.kategori || row.Kategori || 'Pesan') || 'Pesan',
      isi: compactText(row.amount || row.Amount),
      likes: parseLikesCount(row.likes || row.Likes),
    }))
    .reverse()
    .slice(0, 5);

  return { recentNotes };
};

const buildPersonnelSnapshot = async (): Promise<DashboardPersonnelSnapshot> => {
  const byUnitMap = new Map<string, string[]>();

  USERS.forEach((user) => {
    const key = compactText(user.unit) || 'Lainnya';
    const existing = byUnitMap.get(key) || [];
    existing.push(user.nama.split(',')[0]);
    byUnitMap.set(key, existing);
  });

  const byUnit = Array.from(byUnitMap.entries())
    .map(([unit, members]) => ({
      unit,
      count: members.length,
      members: members.sort((left, right) => left.localeCompare(right, 'id-ID')),
    }))
    .sort((left, right) => right.count - left.count || left.unit.localeCompare(right.unit, 'id-ID'));

  return {
    total: USERS.length,
    byUnit,
  };
};

const buildDutySnapshot = async (): Promise<DashboardDutySnapshot> => {
  const day = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date());
  const matched = DUTY_SCHEDULE.find((item) => item.day.toLowerCase() === day.toLowerCase());

  return {
    day,
    personnel: matched?.personnel || [],
  };
};

const pickDateField = (row: Record<string, unknown>) =>
  compactText(row.tanggal || row.Tanggal || row.date || row.Date || row.waktu || row.Waktu);

const parseRowDateMs = (raw: string) => {
  const value = compactText(raw);
  if (!value) return Number.NaN;

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
  }

  const dashMonth = value.match(/^(\d{1,2})[-\s/]+([A-Za-z]{3,})(?:[-\s/]+(\d{2,4}))?$/);
  if (dashMonth) {
    const day = parseInt(dashMonth[1], 10);
    const month = monthMap[dashMonth[2].slice(0, 3) as keyof typeof monthMap];
    if (month !== undefined && day >= 1 && day <= 31) {
      const yearRaw = dashMonth[3] ? parseInt(dashMonth[3], 10) : new Date().getFullYear();
      const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
      return new Date(year, month, day).getTime();
    }
  }

  const numeric = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (numeric) {
    const day = parseInt(numeric[1], 10);
    const month = parseInt(numeric[2], 10) - 1;
    const yearRaw = parseInt(numeric[3], 10);
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      return new Date(year, month, day).getTime();
    }
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.NaN : parsed;
};

const pickLatestRow = (rows: Record<string, unknown>[], isValid: (row: Record<string, unknown>) => boolean) => {
  const valid = rows.filter(isValid);
  if (valid.length === 0) return null;

  const scored = valid.map((row, index) => {
    const dateMs = parseRowDateMs(pickDateField(row));
    if (!Number.isNaN(dateMs)) return { row, score: dateMs };

    const idMatch = compactText(row.id || row.ID).match(/(\d{13,})/);
    if (idMatch) return { row, score: Number(idMatch[1]) };

    return { row, score: index };
  });

  scored.sort((left, right) => left.score - right.score);
  return scored[scored.length - 1]?.row || null;
};

const formatTxDate = (value: unknown) => {
  const raw = compactText(value);
  if (!raw) return '-';
  const parsed = parseRowDateMs(raw);
  if (!Number.isNaN(parsed)) {
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: '2-digit' }).format(new Date(parsed));
  }
  return raw;
};

const toCashNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeCashRows = (rows: Record<string, unknown>[]): CashRow[] => {
  return rows
    .map((row) => ({
      tanggal: compactText(row.tanggal || row.Tanggal),
      keterangan: compactText(row.keterangan || row.Keterangan),
      debit: toCashNumber(row.debit || row.Debit),
      kredit: toCashNumber(row.kredit || row.Kredit),
      saldo: toCashNumber(row.saldo || row.Saldo),
    }))
    .filter((row) => (row.tanggal && row.keterangan) || row.debit > 0 || row.kredit > 0);
};

const calculateTuBalance = (rows: CashRow[]) => {
  if (rows.length === 0) return 0;

  let currentBalance = 0;
  if (rows[0] && rows[0].saldo > 0 && rows[0].debit === 0 && rows[0].kredit === 0) {
    currentBalance = rows[0].saldo;
    for (let index = 1; index < rows.length; index += 1) {
      currentBalance = currentBalance + rows[index].debit - rows[index].kredit;
    }
    return currentBalance;
  }

  return rows.reduce((sum, row) => sum + row.debit - row.kredit, 0);
};

const calculateAcBalance = (rows: CashRow[]) => {
  return rows.reduce((sum, row) => sum + row.debit - row.kredit, 0);
};

const buildFinanceSnapshot = async (): Promise<DashboardFinanceSnapshot> => {
  const [internalRows, tuRows, acRows] = await Promise.all([
    fetchSheetRows('Finance'),
    fetchSheetRows('Kas_TU'),
    fetchSheetRows('Kas_AC'),
  ]);

  const mappedInternal = internalRows.map((row) => ({
    amount: toNumber(row.amount || row.Amount),
    type: compactText(row.type || row.Tipe).toLowerCase(),
    category: compactText(row.category || row.Kategori || 'Lainnya') || 'Lainnya',
    title: compactText(row.title || row.Keterangan || row.category || row.Kategori || 'Transaksi'),
    tanggal: compactText(row.tanggal || row.Tanggal || row.date || row.Date),
    raw: row,
  }));

  const income = mappedInternal.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const expense = mappedInternal.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);

  const categoryTotals = new Map<string, number>();
  mappedInternal
    .filter((item) => item.type === 'expense')
    .forEach((item) => {
      categoryTotals.set(item.category, (categoryTotals.get(item.category) || 0) + item.amount);
    });

  const topCategories = Array.from(categoryTotals.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 3);

  const latestInternal = pickLatestRow(internalRows.filter(isRecord), (row) => {
    return toNumber(row.amount || row.Amount) > 0 || compactText(row.title || row.Keterangan) !== '';
  });

  const normalizedTuRows = normalizeCashRows(tuRows.filter(isRecord));
  const normalizedAcRows = normalizeCashRows(acRows.filter(isRecord));

  const latestTU = pickLatestRow(tuRows.filter(isRecord), (row) => toNumber(row.debit || row.Debit) > 0 || toNumber(row.kredit || row.Kredit) > 0);
  const latestAC = pickLatestRow(acRows.filter(isRecord), (row) => toNumber(row.debit || row.Debit) > 0 || toNumber(row.kredit || row.Kredit) > 0);

  return {
    internal: {
      balance: income - expense,
      expense,
      lastTransaction: latestInternal
        ? {
            date: formatTxDate(pickDateField(latestInternal)),
            note: compactText(latestInternal.title || latestInternal.Keterangan || latestInternal.category || latestInternal.Kategori || 'Transaksi'),
            amount: toNumber(latestInternal.amount || latestInternal.Amount),
            type: compactText(latestInternal.type || latestInternal.Tipe).toLowerCase() === 'income'
              ? 'in'
              : compactText(latestInternal.type || latestInternal.Tipe).toLowerCase() === 'expense'
                ? 'out'
                : 'unknown',
          }
        : null,
      topCategories,
    },
    tu: {
      balance: calculateTuBalance(normalizedTuRows),
      expense: normalizedTuRows.reduce((sum, row) => sum + row.kredit, 0),
      lastTransaction: latestTU
        ? {
            date: formatTxDate(pickDateField(latestTU)),
            note: compactText(latestTU.keterangan || latestTU.Keterangan || 'Tanpa keterangan') || 'Tanpa keterangan',
            amount: toNumber(latestTU.debit || latestTU.Debit) > 0 ? toNumber(latestTU.debit || latestTU.Debit) : toNumber(latestTU.kredit || latestTU.Kredit),
            type: toNumber(latestTU.debit || latestTU.Debit) > 0 ? 'in' : 'out',
          }
        : null,
    },
    ac: {
      balance: calculateAcBalance(normalizedAcRows),
      expense: normalizedAcRows.reduce((sum, row) => sum + row.kredit, 0),
      lastTransaction: latestAC
        ? {
            date: formatTxDate(pickDateField(latestAC)),
            note: compactText(latestAC.keterangan || latestAC.Keterangan || 'Tanpa keterangan') || 'Tanpa keterangan',
            amount: toNumber(latestAC.debit || latestAC.Debit) > 0 ? toNumber(latestAC.debit || latestAC.Debit) : toNumber(latestAC.kredit || latestAC.Kredit),
            type: toNumber(latestAC.debit || latestAC.Debit) > 0 ? 'in' : 'out',
          }
        : null,
    },
  };
};

export const getDashboardSectionState = (snapshot: DashboardAssistantSnapshot, key: DashboardSectionKey) => {
  return snapshot.sectionStates.find((section) => section.key === key);
};

export const fetchDashboardSnapshot = async ({
  includeFinance = false,
}: {
  includeFinance?: boolean;
} = {}): Promise<DashboardAssistantSnapshot> => {
  const [
    mokletService,
    classroom,
    ac,
    capex,
    wifi,
    network,
    utilities,
    piket,
    personnel,
    duty,
    finance,
  ] = await Promise.all([
    settleSection('mokletService', buildMokletServiceSnapshot, emptyMokletSnapshot()),
    settleSection('classroom', buildClassroomSnapshot, emptyClassroomSnapshot()),
    settleSection('ac', buildACSnapshot, emptyACSnapshot()),
    settleSection('capex', buildCapexSnapshot, emptyCapexSnapshot()),
    settleSection('wifi', buildWifiSnapshot, emptyWifiSnapshot()),
    settleSection('network', buildNetworkSnapshot, emptyNetworkSnapshot()),
    settleSection('utilities', buildUtilitySnapshot, emptyUtilitySnapshot()),
    settleSection('piket', buildPiketSnapshot, emptyPiketSnapshot()),
    settleSection('personnel', buildPersonnelSnapshot, { total: 0, byUnit: [] }, 'local'),
    settleSection('duty', buildDutySnapshot, { day: '', personnel: [] }, 'local'),
    includeFinance
      ? settleSection('finance', buildFinanceSnapshot, emptyFinanceSnapshot())
      : Promise.resolve({
          data: null,
          section: null,
        }),
  ]);

  const sectionStates = [
    mokletService.section,
    classroom.section,
    ac.section,
    capex.section,
    wifi.section,
    network.section,
    utilities.section,
    piket.section,
    personnel.section,
    duty.section,
    finance.section,
  ].filter((section): section is DashboardSectionState => Boolean(section));

  return {
    generatedAt: new Date().toISOString(),
    sectionStates,
    errors: sectionStates
      .filter((section) => section.state === 'unavailable')
      .map((section) => `${section.label}: ${section.message}`),
    mokletService: mokletService.data,
    classroom: classroom.data,
    ac: ac.data,
    capex: capex.data,
    wifi: wifi.data,
    network: network.data,
    utilities: utilities.data,
    piket: piket.data,
    finance: finance.data,
    personnel: personnel.data,
    duty: duty.data,
  };
};
