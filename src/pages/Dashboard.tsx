import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LabelList, LineChart, Line, Legend, ReferenceLine } from 'recharts';
import { UserCircle2, Wallet, Loader2, Zap, Droplets, Calendar, Info, UserCheck, MessageSquare, AlertCircle, Edit3, Trash2, Wind, Briefcase, Smartphone, Activity, Coins, Camera, X, Heart, Home, Sparkles, ShieldCheck } from 'lucide-react';
import { canAccessFinanceData, getCurrentUser, ROLES, USERS } from '../data/organization';
import { mergeCapexProjects } from '../data/capexProjects';
import { getUtilityChartData } from '../data/utilities';
import { useProfileThumbByEmail } from '../hooks/useProfileThumbByEmail';
import UserAvatar from '../components/UserAvatar';
import { getMotivationForLogin, getPublicEducationalMotivation, getPiketDutyQuote, getPiketDailyReminder } from '../utils/motivation';
import { pushActionNotification } from '../utils/actionNotifications';
import { SARMOK_DASHBOARD_API_URL, parseSarmokDashboardBody } from '../utils/sarmokDashboard';
import type { SarmokDashboardData } from '../utils/sarmokDashboard';
import {
  buildMonitorIssueSummary,
  CLASSROOM_LOCATION_OPTIONS,
  CLASSROOM_MONITOR_SHEET,
  CLASSROOM_REFERENCE_TOTAL,
  compareClassroomRooms,
  formatClassroomIdentityLabel,
  getShortClassroomLabel,
  normalizeClassroomMonitorRows,
  getEffectiveRoomDetails,
} from '../utils/classroomMonitor';
import type { ClassroomMonitorEntry } from '../utils/classroomMonitor';

const FINANCE_API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";
const SARMOK_BASIC_AUTH_USERNAME = import.meta.env.VITE_SARMOK_BASIC_AUTH_USERNAME?.trim() || '';
const SARMOK_BASIC_AUTH_PASSWORD = import.meta.env.VITE_SARMOK_BASIC_AUTH_PASSWORD || '';
const SARMOK_DEFAULT_BASIC_AUTH_HEADER = 'Basic bW9rbGV0TWFsYW5nOnRlbGtvbUhlYmF0MjAyMw==';
const SARMOK_BASIC_AUTH_READY = Boolean((SARMOK_BASIC_AUTH_USERNAME && SARMOK_BASIC_AUTH_PASSWORD) || SARMOK_DEFAULT_BASIC_AUTH_HEADER);
const SARMOK_COMPLAINT_DETAIL_API_URL = 'https://api.smktelkom-mlg.sch.id/sarpra-complaint/sarmok/complaint';
const SARMOK_ROOM_DETAIL_API_URL = 'https://api.smktelkom-mlg.sch.id/sarpra-room-reservation/sarmok/room';
const SARMOK_BORROW_DETAIL_API_URL = 'https://api.smktelkom-mlg.sch.id/sarpra-borrow/sarmok/borrow';

const getSarmokBasicAuthHeader = () => {
  if (SARMOK_BASIC_AUTH_USERNAME && SARMOK_BASIC_AUTH_PASSWORD) {
    return `Basic ${window.btoa(`${SARMOK_BASIC_AUTH_USERNAME}:${SARMOK_BASIC_AUTH_PASSWORD}`)}`;
  }

  return SARMOK_DEFAULT_BASIC_AUTH_HEADER;
};

type SarmokDetailKind = 'complaints' | 'roomReservation' | 'toolsLoan';

type SarmokComplaintStats = {
  pending: number;
  inProgress: number;
  rejected: number;
  complete: number;
};

type SarmokRoomStats = {
  rejectedReservation: number;
  waitingConfirmation: number;
  activeReservation: number;
  inUseReservation: number;
};

type SarmokToolsStats = {
  waitingConfirmation: number;
  haveNotReturn: number;
  returned: number;
  rejected: number;
};

type SarmokDetailModal = {
  kind: SarmokDetailKind;
  title: string;
  metricLabel: string;
  endpoint: string;
  accent: string;
  rows: any[];
  raw: unknown;
  loading: boolean;
  error: string;
};

const unwrapSarmokDetailPayload = (payload: unknown): unknown => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;

  const record = payload as Record<string, unknown>;
  for (const key of ['data', 'result', 'results', 'payload', 'items', 'rows']) {
    if (record[key] !== undefined) return unwrapSarmokDetailPayload(record[key]);
  }

  return payload;
};

const normalizeSarmokDetailRows = (payload: unknown): any[] => {
  const unwrapped = unwrapSarmokDetailPayload(payload);
  if (Array.isArray(unwrapped)) return unwrapped;

  if (unwrapped && typeof unwrapped === 'object') {
    const record = unwrapped as Record<string, unknown>;
    const preferredArrayKeys = [
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

    for (const key of preferredArrayKeys) {
      if (Array.isArray(record[key])) return record[key];
    }

    const firstArray = Object.values(record).find(Array.isArray);
    if (firstArray) return firstArray;

    return [unwrapped];
  }

  if (unwrapped === undefined || unwrapped === null || unwrapped === '') return [];
  return [{ value: unwrapped }];
};

const getSarmokDetailSummaryEntries = (payload: unknown) => {
  const unwrapped = unwrapSarmokDetailPayload(payload);
  if (!unwrapped || typeof unwrapped !== 'object' || Array.isArray(unwrapped)) return [] as [string, unknown][];

  return Object.entries(unwrapped as Record<string, unknown>).filter(([, value]) => {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
  });
};

const toSarmokCount = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^\d.-]/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const pickSarmokCount = (source: unknown, aliases: string[]) => {
  const unwrapped = unwrapSarmokDetailPayload(source);
  const records = [source, unwrapped].filter(isDetailRecord);

  for (const record of records) {
    for (const alias of aliases) {
      const direct = toSarmokCount(record[alias]);
      if (direct !== undefined) return direct;
    }
  }

  const normalizedAliases = aliases.map((alias) => alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const record of records) {
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

  if (isDetailRecord(source)) {
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
        if (!isDetailRecord(item)) continue;
        const parsed = pickCountFromRecord(item);
        if (parsed !== undefined) return parsed;
      }
    }

    if (isDetailRecord(candidate)) {
      const direct = pickCountFromRecord(candidate);
      if (direct !== undefined) return direct;

      for (const value of Object.values(candidate)) {
        if (!Array.isArray(value)) continue;
        for (const item of value) {
          if (!isDetailRecord(item)) continue;
          const parsed = pickCountFromRecord(item);
          if (parsed !== undefined) return parsed;
        }
      }
    }
  }

  return undefined;
};

const normalizeSarmokComplaintStats = (
  payload: unknown,
  fallback: { waitingConfirmation: number; onProcess: number; rejected: number },
): SarmokComplaintStats => {
  const rows = normalizeSarmokDetailRows(payload);
  const unwrapped = unwrapSarmokDetailPayload(payload) as any;
  const hasPayload = payload !== null && payload !== undefined;
  const pendingRowsCount = hasPayload ? rows.filter(isSarmokPendingRow).length : undefined;
  const processRowsCount = hasPayload ? rows.filter(isSarmokProcessRow).length : undefined;
  const completeRowsCount = hasPayload ? rows.filter(isSarmokReturnedRow).length : undefined;
  const rejectedRowsCount = hasPayload ? rows.filter(isSarmokRejectedRow).length : undefined;

  const pending = pendingRowsCount
    ?? unwrapped?.countWaitingComplaints ?? unwrapped?.count_waiting_complaints
    ?? pickSarmokCount(payload, ['count_pending', 'countPending', 'pending', 'pending_count', 'waitingConfirmation'])
    ?? pickSarmokStatusCount(payload, ['pending', 'waiting', 'menunggu', 'konfirmasi'])
    ?? fallback.waitingConfirmation
    ?? 0;
  const inProgress = processRowsCount
    ?? unwrapped?.countInProcessComplaints ?? unwrapped?.count_in_process_complaints
    ?? pickSarmokCount(payload, ['count_in_progress', 'countInProgress', 'count_process', 'in_progress', 'inProgress', 'on_process'])
    ?? pickSarmokStatusCount(payload, ['in_progress', 'on_process', 'process', 'diproses', 'berjalan'])
    ?? fallback.onProcess
    ?? 0;
  const complete = completeRowsCount
    ?? unwrapped?.countCompleteComplaints ?? unwrapped?.count_complete_complaints
    ?? pickSarmokCount(payload, ['count_completed', 'count_complete', 'countComplete', 'countCompleted', 'completed', 'complete'])
    ?? pickSarmokStatusCount(payload, ['completed', 'complete', 'selesai', 'done', 'returned'])
    ?? 0;
  const rejected = rejectedRowsCount
    ?? unwrapped?.countRejectedComplaints ?? unwrapped?.count_rejected_complaints
    ?? pickSarmokCount(payload, ['count_rejected', 'countRejected', 'rejected', 'reject', 'ditolak'])
    ?? pickSarmokStatusCount(payload, ['rejected', 'reject', 'ditolak'])
    ?? fallback.rejected
    ?? 0;

  return {
    pending,
    inProgress,
    complete,
    rejected,
  };
};

const normalizeSarmokRoomStats = (
  payload: unknown,
  fallback: { waitingConfirmation?: number; rejectedReservation?: number; activeReservation: number; inUseReservation?: number },
): SarmokRoomStats => {
  const rows = filterSarmokRowsByKind(normalizeSarmokDetailRows(payload), 'roomReservation');
  const unwrapped = unwrapSarmokDetailPayload(payload) as any;
  const rejectedRowsCount = payload === null || payload === undefined ? undefined : rows.filter(isSarmokRejectedRow).length;
  const pendingRowsCount = payload === null || payload === undefined ? undefined : rows.filter(isSarmokPendingRow).length;
  const activeRowsCount = payload === null || payload === undefined ? undefined : rows.filter(isSarmokActiveRow).length;
  const inUseRowsCount = payload === null || payload === undefined ? undefined : rows.filter(isSarmokRoomInUseRow).length;

  const rejectedReservation = rejectedRowsCount
    ?? unwrapped?.countRejectedReservation ?? unwrapped?.count_rejected_reservation
    ?? pickSarmokCount(payload, ['count_rejected', 'countRejected', 'count_rejected_reservation', 'rejected', 'reject', 'ditolak'])
    ?? pickSarmokStatusCount(payload, ['rejected', 'reject', 'ditolak'])
    ?? fallback.rejectedReservation
    ?? 0;
  const waitingConfirmation = pendingRowsCount
    ?? unwrapped?.countPendingReservation ?? unwrapped?.count_pending_reservation
    ?? pickSarmokCount(payload, ['count_pending', 'countPending', 'pending', 'pending_count', 'waitingConfirmation', 'waiting_confirmation'])
    ?? pickSarmokStatusCount(payload, ['pending', 'waiting', 'waiting_confirmation', 'menunggu', 'menunggu_konfirmasi', 'konfirmasi'])
    ?? fallback.waitingConfirmation
    ?? 0;
  const activeReservation = activeRowsCount
    ?? unwrapped?.countActiveReservation ?? unwrapped?.count_active_reservation
    ?? pickSarmokCount(payload, ['count_verified', 'countVerified', 'count_approved', 'countApproved', 'count_active', 'countActive', 'count_ongoing', 'countOngoing', 'verified', 'approved', 'active', 'ongoing', 'sedang_berlangsung'])
    ?? pickSarmokStatusCount(payload, ['verified', 'approved', 'active', 'ongoing', 'sedang_berlangsung', 'disetujui'])
    ?? fallback.activeReservation
    ?? 0;
  const inUseReservation = inUseRowsCount
    ?? pickSarmokCount(payload, ['count_in_use', 'countInUse', 'count_using', 'countUsing', 'count_current', 'countCurrent', 'in_use', 'inUse', 'using', 'current', 'sedang_dipakai'])
    ?? fallback.inUseReservation
    ?? 0;

  return { rejectedReservation, waitingConfirmation, activeReservation, inUseReservation };
};

const normalizeSarmokToolsStats = (
  payload: unknown,
  fallback: SarmokToolsStats,
): SarmokToolsStats => {
  const rows = filterSarmokRowsByKind(normalizeSarmokDetailRows(payload), 'toolsLoan');
  const unwrapped = unwrapSarmokDetailPayload(payload) as any;
  const pendingRowsCount = payload === null || payload === undefined ? undefined : rows.filter(isSarmokPendingRow).length;
  const activeRowsCount = payload === null || payload === undefined ? undefined : rows.filter(isSarmokActiveRow).length;
  const returnedRowsCount = payload === null || payload === undefined ? undefined : rows.filter(isSarmokReturnedRow).length;
  const rejectedRowsCount = payload === null || payload === undefined ? undefined : rows.filter(isSarmokRejectedRow).length;

  const waitingConfirmation = pendingRowsCount
    ?? unwrapped?.countPendingLoans ?? unwrapped?.count_pending_loans
    ?? pickSarmokCount(payload, ['count_pending', 'countPending', 'pending', 'pending_count', 'waitingConfirmation', 'waiting_confirmation'])
    ?? pickSarmokStatusCount(payload, ['pending', 'waiting', 'waiting_confirmation', 'menunggu', 'menunggu_konfirmasi', 'konfirmasi'])
    ?? fallback.waitingConfirmation
    ?? 0;
  const haveNotReturn = activeRowsCount
    ?? unwrapped?.countVerifiedLoans ?? unwrapped?.count_verified_loans
    ?? pickSarmokCount(payload, ['count_verified', 'countVerified', 'count_approved', 'countApproved', 'count_active', 'countActive', 'count_not_returned', 'countNotReturned', 'verified', 'approved', 'active', 'haveNotReturn', 'have_not_return'])
    ?? pickSarmokStatusCount(payload, ['verified', 'approved', 'active', 'terverifikasi', 'disetujui', 'aktif', 'ongoing', 'berlangsung'])
    ?? fallback.haveNotReturn
    ?? 0;
  const returned = returnedRowsCount
    ?? unwrapped?.countReturnedLoans ?? unwrapped?.count_returned_loans
    ?? pickSarmokCount(payload, ['count_returned', 'count_complete', 'countReturned', 'countComplete', 'returned', 'complete', 'dikembalikan'])
    ?? pickSarmokStatusCount(payload, ['returned', 'complete', 'completed', 'selesai', 'dikembalikan', 'kembali'])
    ?? fallback.returned
    ?? 0;
  const rejected = rejectedRowsCount
    ?? unwrapped?.countRejectedLoans ?? unwrapped?.count_rejected_loans
    ?? pickSarmokCount(payload, ['count_rejected', 'countRejected', 'rejected', 'reject'])
    ?? pickSarmokStatusCount(payload, ['rejected', 'reject', 'ditolak'])
    ?? fallback.rejected
    ?? 0;

  return { waitingConfirmation, haveNotReturn, returned, rejected };
};

const formatDetailKey = (key: string) => {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDetailValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

const isDetailRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const parseMaybeJsonValue = (value: unknown): unknown => {
  if (isDetailRecord(value) || Array.isArray(value)) return value;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']')))) return null;

  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === 'string' ? parseMaybeJsonValue(parsed) ?? parsed : parsed;
  } catch {
    return null;
  }
};

const expandDetailRecord = (detail: unknown, visited = new WeakSet<object>()): any => {
  const normalized = parseMaybeJsonValue(detail) ?? detail;
  if (!isDetailRecord(normalized)) return normalized;
  if (visited.has(normalized)) return normalized;
  visited.add(normalized);

  const expanded: any = { ...normalized };
  for (const [key, value] of Object.entries(expanded)) {
    if (typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
      const parsed = parseMaybeJsonValue(value);
      if (parsed !== null) {
        expanded[key] = expandDetailRecord(parsed, visited);
      }
    } else if (isDetailRecord(value) || Array.isArray(value)) {
      expanded[key] = expandDetailRecord(value, visited);
    }
  }
  return expanded;
};

const pickHumanValue = (row: unknown, paths: string[]) => {
  const expanded = expandDetailRecord(row);
  return formatHumanValue(pickDetailValue(expanded, paths));
};

const pickDetailValue = (source: unknown, paths: string[]): unknown => {
  if (!isDetailRecord(source)) return undefined;

  for (const path of paths) {
    const value = path.split('.').reduce<unknown>((current, key) => {
      if (!isDetailRecord(current)) return undefined;
      return current[key];
    }, source);

    if (value !== undefined && value !== null && value !== '') return value;
  }

  return undefined;
};

const formatHumanValue = (value: unknown): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return '-';
  }

  if (isDetailRecord(value)) {
    const readable = pickDetailValue(value, ['name', 'nama', 'full_name', 'fullname', 'title', 'label', 'description', 'code', 'kode', 'email']);
    if (readable !== undefined) return formatHumanValue(readable);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '-';
    return value.map(formatHumanValue).filter((item) => item !== '-').join(', ') || '-';
  }

  return formatDetailValue(value);
};

const getDetailCollection = (row: unknown, paths: string[]) => {
  const raw = pickDetailValue(row, paths);
  const parsed = parseMaybeJsonValue(raw) ?? raw;

  if (Array.isArray(parsed)) return parsed;
  if (isDetailRecord(parsed)) return [parsed];

  const aliases = new Set(paths.map((path) => {
    const parts = path.split('.');
    return parts[parts.length - 1].toLowerCase().replace(/\s+/g, '_');
  }));
  const visited = new WeakSet<object>();

  const isLikelyItem = (obj: unknown) => {
    const parsedObj = parseMaybeJsonValue(obj) ?? obj;
    if (!isDetailRecord(parsedObj)) return false;
    const hasId = parsedObj.asset_id !== undefined || parsedObj.item_id !== undefined || parsedObj.tool_id !== undefined || parsedObj.goods_id !== undefined || parsedObj.id !== undefined;
    const hasName = parsedObj.name !== undefined || parsedObj.nama !== undefined || parsedObj.title !== undefined;
    const hasQty = parsedObj.quantity !== undefined || parsedObj.qty !== undefined || parsedObj.jumlah !== undefined;
    return hasId || (hasName && hasQty);
  };

  const findNestedCollection = (value: unknown, allowDirectCollection = false): unknown[] => {
    const normalized = parseMaybeJsonValue(value) ?? value;
    
    if (Array.isArray(normalized)) {
      if (allowDirectCollection || normalized.some(isLikelyItem)) {
        return normalized;
      }
      return [];
    }

    if (!isDetailRecord(normalized) || visited.has(normalized)) return [];
    if (allowDirectCollection) return [normalized];

    visited.add(normalized);

    // 1. Check known aliases
    for (const [key, child] of Object.entries(normalized)) {
      const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
      if (aliases.has(normalizedKey)) {
        const found = findNestedCollection(child, true);
        if (found.length > 0) return found;
      }
    }

    // 2. Aggressive search for arrays containing item-like objects
    for (const child of Object.values(normalized)) {
      const parsedChild = parseMaybeJsonValue(child) ?? child;
      if (Array.isArray(parsedChild) && parsedChild.some(isLikelyItem)) {
        return parsedChild;
      }
    }

    // 3. Aggressive search for item-like objects
    for (const child of Object.values(normalized)) {
      const parsedChild = parseMaybeJsonValue(child) ?? child;
      if (isLikelyItem(parsedChild)) {
        return [parsedChild];
      }
    }

    // 4. Recurse
    for (const child of Object.values(normalized)) {
      const found = findNestedCollection(child, false);
      if (found.length > 0) return found;
    }

    return [];
  };

  return findNestedCollection(row);
};



const pickCreatorName = (row: unknown) => {
  return pickHumanValue(row, [
    'creator.name',
    'creator.nama',
    'creator.full_name',
    'created_by.name',
    'created_by.nama',
    'created_by.full_name',
    'createdBy.name',
    'createdBy.nama',
    'createdBy.full_name',
    'created_user.name',
    'created_user.nama',
    'created_user.full_name',
    'user_creator.name',
    'user_creator.nama',
    'user_creator.full_name',
    'user.name',
    'user.nama',
    'user.full_name',
    'student.name',
    'student.nama',
    'teacher.name',
    'teacher.nama',
    'employee.name',
    'employee.nama',
    'complainant.name',
    'reporter.name',
    'requester.name',
  ]);
};

const pickBorrowerName = (row: unknown) => {
  return pickHumanValue(row, [
    'borrower.name',
    'borrower.nama',
    'peminjam.name',
    'peminjam.nama',
    'student.name',
    'student.nama',
    'user.name',
    'user.nama',
  ]);
};

const pickRoomReservationBorrower = (row: unknown) => {
  return pickHumanValue(row, [
    'reservation_by.name',
    'reservation_by.nama',
    'reservation_by.full_name',
    'creator.name',
    'creator.nama',
    'user.name',
    'user.nama',
    'created_by.name',
    'createdBy.name',
    'requester.name',
    'borrower.name',
  ]);
};

const pickRoomReservationName = (row: unknown) => {
  return pickHumanValue(row, [
    'room_reservation.name',
    'room_reservation.nama',
    'room_reservation.code',
    'room.name',
    'room.nama',
    'room.number',
    'room.code',
    'room_name',
    'room_number',
    'room_code',
    'classroom.name',
    'classroom',
    'space.name',
    'space',
    'location.name',
    'location',
    'lokasi',
  ]);
};

const isSarmokUuid = (val: unknown): boolean => {
  if (typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

const findBetterSarmokName = (obj: any, depth = 0): string | null => {
  if (depth > 12 || !obj || typeof obj !== 'object') return null;
  
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findBetterSarmokName(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const isValid = (n: any): n is string => {
    if (typeof n !== 'string') return false;
    const t = n.trim();
    if (t.length < 2 || t.length > 250) return false;
    if (/^\d+$/.test(t)) return false;
    if (t === '-' || isSarmokUuid(t)) return false;
    if (t.includes('{') || t.includes('}') || t.includes('[') || t.includes(']')) return false;
    if (t.includes('T00:00:00')) return false;
    return true;
  };

  // 0. TOP PRIORITY: Known structure from user screenshot
  if (obj.procurements && typeof obj.procurements === 'object') {
    if (isValid(obj.procurements.name)) return obj.procurements.name;
    if (isValid(obj.procurements.nama)) return obj.procurements.nama;
  }
  if (obj.procurement && typeof obj.procurement === 'object') {
    if (isValid(obj.procurement.name)) return obj.procurement.name;
  }
  if (obj.asset && typeof obj.asset === 'object') {
    if (isValid(obj.asset.name)) return obj.asset.name;
  }

  // 1. Direct hit
  const priority = ['name', 'nama', 'asset_name', 'item_name', 'tool_name', 'title', 'label'];
  for (const k of priority) {
    if (isValid(obj[k])) return obj[k];
  }

  // 2. High priority sub-objects
  for (const k of ['procurements', 'procurement', 'asset', 'item', 'label', 'tool']) {
    if (obj[k] && typeof obj[k] === 'object') {
      const found = findBetterSarmokName(obj[k], depth + 1);
      if (found) return found;
    }
  }

  // 3. Scan all
  for (const [k, v] of Object.entries(obj)) {
    if (k.toLowerCase().includes('name') || k.toLowerCase().includes('nama')) {
      if (isValid(v)) return v;
    }
    if (typeof v === 'object' && v !== null && k !== 'procurements' && k !== 'asset' && k !== 'item') {
      const found = findBetterSarmokName(v, depth + 1);
      if (found) return found;
    }
  }

  return null;
};

const findBetterSarmokQty = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findBetterSarmokQty(item);
      if (found !== null) return found;
    }
    return null;
  }

  const q = obj.quantity ?? obj.qty ?? obj.jumlah ?? obj.amount ?? obj.total;
  if (q !== undefined && q !== null && q !== '' && q !== '-') return q;

  for (const v of Object.values(obj)) {
    if (typeof v === 'object' && v !== null) {
      const found = findBetterSarmokQty(v);
      if (found !== null) return found;
    }
  }
  return null;
};

const formatBorrowItems = (row: unknown) => {
  const expandedRow = expandDetailRecord(row);
  const details = getDetailCollection(expandedRow, [
    'procurements', 'SARPRA DETAIL BORROW', 'sarpra_detail_borrow', 'sarpra_detail_borrows', 
    'detail_borrow', 'detail_borrows', 'borrow_details', 'details', 'items', 'tools', 'assets'
  ]);

  if (details.length === 0) {
    const direct = pickHumanValue(expandedRow, [
      'tool.name', 'tool.nama', 'tool_id.name', 'tool_id.nama',
      'item.name', 'item.nama', 'item_id.name', 'item_id.nama',
      'asset.name', 'asset.nama', 'asset_id.name', 'asset_id.nama',
      'goods.name', 'barang.name', 'procurement.name', 'procurement.asset.name', 'procurements.name', 'procurements.asset.name', 'tool_name', 'item_name', 'asset_name', 'name', 'nama'
    ]);
    if (direct !== '-') return direct;
    return findBetterSarmokName(expandedRow) || '-';
  }

  const itemStrings = details.map((detail) => {
    const normalizedDetail = expandDetailRecord(detail);
    let name = pickHumanValue(normalizedDetail, [
      'asset.name', 'asset.nama', 'asset.title', 'asset.label',
      'item.asset.name', 'item.asset.nama', 'label.asset.name', 'label.asset.nama',
      'label.procurement.asset.name', 'label.procurement.asset.nama',
      'procurement.name', 'procurement.nama', 'procurements.name', 'procurements.nama',
      'procurements.asset.name', 'procurements.asset.nama',
      'procurement.asset.name', 'procurement.asset.nama',
      'item.name', 'item.nama', 'name', 'nama', 'title', 'label'
    ]);

    if (name === '-' || /^\d+$/.test(name) || isSarmokUuid(name) || name.includes('{')) {
      name = findBetterSarmokName(normalizedDetail) || '-';
    }
    
    if (name.includes('{') || name === '-') name = 'Aset Sarpra';

    let qty = pickHumanValue(normalizedDetail, [
      'quantity', 'qty', 'jumlah', 'amount', 'total', 
      'item.quantity', 'item.qty', 'item.jumlah',
      'item.asset.quantity', 'item.asset.qty',
      'label.quantity', 'label.qty', 'label.jumlah'
    ]);

    if (qty === '-') {
      const bQty = findBetterSarmokQty(normalizedDetail);
      if (bQty !== null) qty = String(bQty);
    }

    return qty !== '-' ? `${name} (${qty})` : name;
  }).filter((s) => s !== '-');

  if (itemStrings.length === 0) return '-';
  if (itemStrings.length === 1) return itemStrings[0];
  
  // Format multiple items with bullet points for the table
  return itemStrings.join('\n• ').replace(/^/, '• ');
};

const formatBorrowQuantity = (row: unknown) => {
  const expandedRow = expandDetailRecord(row);
  const details = getDetailCollection(expandedRow, [
    'procurements', 'SARPRA DETAIL BORROW', 'sarpra_detail_borrow', 'sarpra_detail_borrows', 
    'detail_borrow', 'detail_borrows', 'borrow_details', 'details', 'items', 'tools', 'assets'
  ]);

  if (details.length === 0) {
    const direct = pickHumanValue(expandedRow, ['quantity', 'qty', 'jumlah', 'amount', 'total']);
    if (direct !== '-') return direct;
    const bQty = findBetterSarmokQty(expandedRow);
    return bQty !== null ? String(bQty) : '-';
  }

  const quantities = details
    .map((detail) => {
      const normalized = expandDetailRecord(detail);
      const q = pickHumanValue(normalized, ['quantity', 'qty', 'jumlah', 'amount', 'total']);
      if (q !== '-') return q;
      const bQty = findBetterSarmokQty(normalized);
      return bQty !== null ? String(bQty) : '-';
    })
    .filter((quantity) => quantity !== '-');

  return quantities.join(', ') || '-';
};

const formatSarmokDate = (value: unknown) => {
  const raw = formatDetailValue(value);
  if (raw === '-') return raw;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  return parsed.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatSarmokDateLong = (value: unknown) => {
  const raw = formatDetailValue(value);
  if (raw === '-') return raw;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  return parsed.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatSarmokDateRange = (row: unknown, startPaths: string[], endPaths: string[]) => {
  const start = formatSarmokDate(pickDetailValue(row, startPaths));
  const end = formatSarmokDate(pickDetailValue(row, endPaths));

  if (start !== '-' && end !== '-' && start !== end) return `${start} - ${end}`;
  if (start !== '-') return start;
  if (end !== '-') return end;
  return '-';
};

const formatRoomReservationRange = (row: unknown) => {
  const start = formatSarmokDateLong(pickDetailValue(row, ['start_date', 'start_at', 'date_start', 'from', 'tanggal']));
  const end = formatSarmokDateLong(pickDetailValue(row, ['end_date', 'end_at', 'date_end', 'to']));

  if (start !== '-' && end !== '-' && start !== end) return `${start} - ${end}`;
  if (start !== '-') return start;
  if (end !== '-') return end;
  return '-';
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
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return { startDate: formatDate(start), endDate: formatDate(end) };
};

const getSarmokApiStatusFilter = (metricLabel: string) => {
  const normalizedLabel = metricLabel.toLowerCase();
  if (normalizedLabel.includes('rejected') || normalizedLabel.includes('ditolak')) return 'REJECTED';
  if (normalizedLabel.includes('menunggu') || normalizedLabel.includes('pending')) return 'PENDING';
  if (normalizedLabel.includes('aktif') || normalizedLabel.includes('terverifikasi') || normalizedLabel.includes('disetujui') || normalizedLabel.includes('berlangsung') || normalizedLabel.includes('dipakai') || normalizedLabel.includes('reservasi')) return 'VERIFIED';
  if (normalizedLabel.includes('diproses') || normalizedLabel.includes('proses') || normalizedLabel.includes('progress')) return 'PROCESS';
  if (normalizedLabel.includes('complete') || normalizedLabel.includes('selesai')) return 'COMPLETED';
  return '';
};

const buildSarmokDetailUrl = (endpoint: string, kind: SarmokDetailKind, metricLabel: string) => {
  const url = new URL(endpoint);
  url.searchParams.set('page', '1');
  url.searchParams.set('quantity', '100');

  if (kind === 'complaints') return url.toString();

  const apiStatus = getSarmokApiStatusFilter(metricLabel);

  // Always append date boundaries to stay in sync with the 32-day dashboard range
  const { startDate, endDate } = getCurrentMonthDateRange();
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);

  if (apiStatus) {
    if (kind === 'roomReservation') {
      url.searchParams.set('filter', apiStatus);
    } else if (kind === 'toolsLoan') {
      // Endpoint peminjaman alat menggunakan parameter status (DECLINE untuk rejected/ditolak)
      const queryStatus = apiStatus === 'REJECTED' ? 'DECLINE' : apiStatus;
      url.searchParams.set('status', queryStatus);
    }
  }

  return url.toString();
};

const getSarmokStatusLabel = (value: unknown) => {
  const raw = formatDetailValue(value).toLowerCase();
  
  const statusMap: Record<string, { label: string; color: string; bg: string; border: string }> = {
    '0': { label: 'PENDING', color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.5)' },
    'pending': { label: 'PENDING', color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.5)' },
    'waiting': { label: 'PENDING', color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.5)' },
    'waiting_confirmation': { label: 'PENDING', color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.5)' },
    
    '1': { label: 'VERIFIED', color: 'var(--accent-blue)', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.5)' },
    'verified': { label: 'VERIFIED', color: 'var(--accent-blue)', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.5)' },
    'approved': { label: 'VERIFIED', color: 'var(--accent-blue)', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.5)' },
    'active': { label: 'VERIFIED', color: 'var(--accent-blue)', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.5)' },
    
    '2': { label: 'RETURNED', color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.5)' },
    'returned': { label: 'RETURNED', color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.5)' },
    'complete': { label: 'RETURNED', color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.5)' },
    'completed': { label: 'RETURNED', color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.5)' },
    'done': { label: 'RETURNED', color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.5)' },
    'finish': { label: 'RETURNED', color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.5)' },
    
    '3': { label: 'REJECTED', color: 'var(--accent-rose)', bg: 'rgba(244,63,94,0.08)', border: 'rgba(244,63,94,0.5)' },
    'rejected': { label: 'REJECTED', color: 'var(--accent-rose)', bg: 'rgba(244,63,94,0.08)', border: 'rgba(244,63,94,0.5)' },
    'reject': { label: 'REJECTED', color: 'var(--accent-rose)', bg: 'rgba(244,63,94,0.08)', border: 'rgba(244,63,94,0.5)' },
  };

  const style = statusMap[raw] || { label: raw.toUpperCase(), color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.05)', border: 'var(--border-subtle)' };

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '0.68rem',
      fontWeight: 800,
      letterSpacing: '0.04em',
      color: style.color,
      background: style.bg,
      border: `1px solid ${style.border}`,
      textTransform: 'uppercase'
    }}>
      {style.label}
    </div>
  );
};

const normalizeStatusValue = (value: unknown) => {
  return formatDetailValue(value).trim().toLowerCase().replace(/\s+/g, '_');
};

const getRowStatusValue = (row: unknown) => {
  return normalizeStatusValue(pickDetailValue(row, [
    'status', 
    'status_name', 
    'state', 
    'approval_status', 
    'borrow_status', 
    'reservation_status', 
    'complaint_status',
    'module_status'
  ]));
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
  const raw = formatDetailValue(value);
  if (raw === '-') return null;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const SARMOK_CREATED_FIELDS = [
  'created_at', 'createdAt', 'created_date', 'createdDate',
  'tanggal_pengajuan', 'tanggal_pengaduan', 'tanggal_pinjam', 'tanggal_complaint',
  'tanggal', 'date', 'submission_at', 'submitted_at', 'request_at', 'requested_at'
];
const SARMOK_FIRST_ACTION_FIELDS = [
  'verified_at', 'approved_at', 'process_at', 'processed_at',
  'rejected_at', 'declined_at',
  'start_at', 'borrow_at', 'in_progress_at', 'inProgressAt',
  'updated_at', 'updatedAt'
];

export type SarmokResponseAnalysis = {
  total: number;
  handledCount: number;
  pendingCount: number;
  overduePending: number;
  avgHours: number | null;
  medianHours: number | null;
  fastestHours: number | null;
  slowestHours: number | null;
  withinDayPct: number | null;
};

const pickFirstSarmokTimestamp = (row: any, paths: string[]): number | null => {
  for (const path of paths) {
    const value = pickDetailValue(row, [path]);
    if (value === undefined || value === null || value === '') continue;
    const parsed = parseSarmokDetailDate(value);
    if (parsed) return parsed.getTime();
  }
  return null;
};

const analyzeSarmokResponse = (rows: any[]): SarmokResponseAnalysis => {
  const responseHours: number[] = [];
  let pending = 0;
  let overduePending = 0;
  const now = Date.now();
  const HOUR = 1000 * 60 * 60;

  rows.forEach((row) => {
    const created = pickFirstSarmokTimestamp(row, SARMOK_CREATED_FIELDS);
    if (!created) return;

    const action = pickFirstSarmokTimestamp(row, SARMOK_FIRST_ACTION_FIELDS);
    if (action && action >= created) {
      const hours = (action - created) / HOUR;
      if (hours >= 0 && hours < 24 * 60) responseHours.push(hours);
    } else {
      pending++;
      const waitingHours = (now - created) / HOUR;
      if (waitingHours > 24) overduePending++;
    }
  });

  responseHours.sort((a, b) => a - b);
  const total = responseHours.length + pending;
  if (responseHours.length === 0) {
    return {
      total,
      handledCount: 0,
      pendingCount: pending,
      overduePending,
      avgHours: null,
      medianHours: null,
      fastestHours: null,
      slowestHours: null,
      withinDayPct: null,
    };
  }
  const avg = responseHours.reduce((s, v) => s + v, 0) / responseHours.length;
  const median = responseHours[Math.floor(responseHours.length / 2)];
  const withinDay = responseHours.filter((h) => h <= 24).length;

  return {
    total,
    handledCount: responseHours.length,
    pendingCount: pending,
    overduePending,
    avgHours: avg,
    medianHours: median,
    fastestHours: responseHours[0],
    slowestHours: responseHours[responseHours.length - 1],
    withinDayPct: (withinDay / responseHours.length) * 100,
  };
};

const formatResponseHours = (hours: number | null): string => {
  if (hours === null || !Number.isFinite(hours)) return '-';
  if (hours < 1) return `${Math.round(hours * 60)} mnt`;
  if (hours < 24) return `${hours.toFixed(1)} jam`;
  return `${(hours / 24).toFixed(1)} hari`;
};

const ROOM_BORROW_FIELDS = ['room.name', 'room.nama', 'room.number', 'room.code', 'room_id', 'room_name', 'room_number', 'room_code', 'classroom.name', 'classroom', 'space.name', 'space'];
const TOOL_BORROW_FIELDS = ['tool.name', 'tool_id', 'tool_name', 'item.name', 'item_id', 'item_name', 'asset.name', 'asset_id', 'asset_name', 'goods.name', 'barang.name', 'sarpra_detail_borrow', 'detail_borrow', 'borrow_details', 'tools', 'items', 'assets', 'lends', 'lend'];

const filterSarmokRowsByKind = (rows: any[], kind: SarmokDetailKind) => {
  if (kind === 'complaints') return rows;

  const filtered = rows.filter((row) => {
    const hasRoom = hasAnyDetailValue(row, ROOM_BORROW_FIELDS);
    const hasTool = hasAnyDetailValue(row, TOOL_BORROW_FIELDS);
    const type = normalizeStatusValue(pickDetailValue(row, ['type', 'borrow_type', 'category', 'category.name', 'module']));

    if (kind === 'roomReservation') {
      return type.includes('room') || type.includes('ruang') || (hasRoom && !hasTool);
    }

    return type.includes('tool') || type.includes('alat') || type.includes('barang') || hasTool;
  });

  return filtered.length > 0 ? filtered : rows;
};

const isSarmokRejectedRow = (row: unknown) => {
  const status = getRowStatusValue(row);
  const rejectedKeywords = ['3', 'rejected', 'reject', 'ditolak', 'tolak', 'decline', 'declined'];
  if (rejectedKeywords.some(kw => status.includes(kw))) return true;

  if (row && typeof row === 'object' && !Array.isArray(row)) {
    const vAdmin = (row as any).verified_admin ?? (row as any).verifiedAdmin;
    if (vAdmin === 2 || vAdmin === '2') return true;
  }

  return hasAnyDetailValue(row, ['rejected_at', 'reason_rejected', 'rejected_reason']);
};

const isSarmokPendingRow = (row: unknown) => {
  if (isSarmokRejectedRow(row)) return false;
  const status = getRowStatusValue(row);
  const pendingKeywords = ['0', 'pending', 'waiting', 'waiting_confirmation', 'menunggu', 'menunggu_konfirmasi', 'konfirmasi'];
  if (pendingKeywords.some(kw => status.includes(kw))) return true;
  
  if (row && typeof row === 'object' && !Array.isArray(row)) {
    const vAdmin = (row as any).verified_admin ?? (row as any).verifiedAdmin;
    if (vAdmin === 0 || vAdmin === '0') return true;
  }
  
  if (hasAnyDetailValue(row, ['verified_admin'])) {
    return !isTruthyDetailFlag(row, ['verified_admin']);
  }
  
  if (status !== '-') return false;
  return !hasAnyDetailValue(row, ['process_at', 'processed_at', 'approved_at', 'start_at', 'borrow_at']);
};

const isSarmokProcessRow = (row: unknown) => {
  const status = getRowStatusValue(row);
  const processKeywords = ['1', 'process', 'processing', 'in_progress', 'on_process', 'proses', 'diproses', 'berjalan'];
  if (processKeywords.some(kw => status.includes(kw))) return true;
  if (status !== '-') return false;
  return hasAnyDetailValue(row, ['process_at', 'processed_at', 'start_at']) && !hasAnyDetailValue(row, ['finish_at', 'finished_at', 'completed_at']);
};


const isSarmokReturnedRow = (row: unknown) => {
  const status = getRowStatusValue(row);
  const returnedKeywords = ['2', 'returned', 'dikembalikan', 'kembali', 'complete', 'completed', 'done', 'finish', 'finished', 'selesai', 'terkembali'];
  if (returnedKeywords.some(kw => status.includes(kw))) return true;
  
  return hasAnyDetailValue(row, [
    'return_at', 'returned_at', 'finish_at', 'finished_at', 'completed_at', 
    'return_date', 'returned_date', 'finish_date', 'finished_date', 'completed_date',
    'actual_return_date', 'actual_return_at'
  ]);
};

const isSarmokActiveRow = (row: unknown) => {
  if (isSarmokRejectedRow(row)) return false;
  if (isSarmokReturnedRow(row)) return false;
  
  const status = getRowStatusValue(row);
  const activeKeywords = ['1', 'active', 'approved', 'verified', 'terverifikasi', 'aktif', 'disetujui', 'berlangsung', 'ongoing'];
  if (activeKeywords.some(kw => status.includes(kw))) return true;
  
  if (row && typeof row === 'object' && !Array.isArray(row)) {
    const vAdmin = (row as any).verified_admin ?? (row as any).verifiedAdmin;
    if (vAdmin === 1 || vAdmin === '1') return true;
  }
  
  if (hasAnyDetailValue(row, ['verified_admin'])) {
    return isTruthyDetailFlag(row, ['verified_admin']);
  }
  
  if (isTruthyDetailFlag(row, ['verified_responsibility']) && !hasAnyDetailValue(row, ['verified_admin'])) return true;
  if (status !== '-') return false;
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

const filterSarmokDetailRows = (rows: any[], metricLabel: string) => {
  const normalizedLabel = metricLabel.toLowerCase();

  if (normalizedLabel.includes('rejected') || normalizedLabel.includes('ditolak')) return rows.filter(isSarmokRejectedRow);
  if (normalizedLabel.includes('menunggu') || normalizedLabel.includes('pending')) return rows.filter(isSarmokPendingRow);
  if (normalizedLabel.includes('dipakai')) return rows.filter(isSarmokRoomInUseRow);
  if (normalizedLabel.includes('diproses') || normalizedLabel.includes('proses') || normalizedLabel.includes('progress')) return rows.filter(isSarmokProcessRow);
  if (normalizedLabel.includes('complete') || normalizedLabel.includes('selesai') || normalizedLabel.includes('kembali') || normalizedLabel.includes('returned') || normalizedLabel.includes('dikembalikan')) return rows.filter(isSarmokReturnedRow);
  if (normalizedLabel.includes('aktif') || normalizedLabel.includes('terverifikasi') || normalizedLabel.includes('disetujui') || normalizedLabel.includes('berlangsung') || normalizedLabel.includes('reservasi')) return rows.filter(isSarmokActiveRow);

  return rows;
};

const summarizeDetailRow = (row: any) => {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return String(row ?? '-');

  const readable = pickDetailValue(row, [
    'complaint_description',
    'borrow_description',
    'purpose',
    'keperluan',
    'description',
    'deskripsi',
    'room.name',
    'item.name',
    'tool.name',
    'asset.name',
    'title',
    'judul',
    'name',
    'nama',
  ]);
  if (readable !== undefined) return formatHumanValue(readable);

  const firstValue = Object.values(row).find((value) => typeof value === 'string' || typeof value === 'number');
  return firstValue ? String(firstValue) : 'Detail Sarmok';
};

const getDetailEntries = (row: any) => {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return [['Nilai', row]] as [string, unknown][];
  return Object.entries(row).filter(([, value]) => value !== undefined && value !== null && value !== '');
};

const getReminderColumns = (kind: SarmokDetailKind) => {
  if (kind === 'complaints') {
    return [
      {
        label: 'Tanggal',
        minWidth: 150,
        render: (row: any) => formatSarmokDate(pickDetailValue(row, ['created_at', 'updated_at', 'process_at', 'date', 'tanggal'])),
      },
      {
        label: 'Dari/Pelapor',
        minWidth: 170,
        render: (row: any) => pickCreatorName(row),
      },
      {
        label: 'Ruang/Lokasi',
        minWidth: 160,
        render: (row: any) => pickHumanValue(row, ['room.name', 'room.nama', 'room_name', 'room', 'location.name', 'location', 'lokasi']),
      },
      {
        label: 'Keluhan',
        minWidth: 330,
        render: (row: any) => pickHumanValue(row, ['complaint_description', 'complaint', 'keluhan', 'description', 'deskripsi', 'problem', 'issue', 'reason', 'note', 'notes']),
      },
      {
        label: 'Kategori',
        minWidth: 120,
        render: (row: any) => pickHumanValue(row, ['category.name', 'category', 'type.name', 'type']),
      },
      {
        label: 'PIC/Tindak Lanjut',
        minWidth: 170,
        render: (row: any) => pickHumanValue(row, ['pic.name', 'user_pic.name', 'assignee.name', 'handler.name', 'technician.name', 'user_pic']),
      },
      {
        label: 'Status',
        minWidth: 110,
        render: (row: any) => getSarmokStatusLabel(pickDetailValue(row, ['status', 'status_name', 'state'])),
      },
      {
        label: 'Masuk/Update',
        minWidth: 150,
        render: (row: any) => formatSarmokDate(pickDetailValue(row, ['updated_at', 'created_at', 'date', 'tanggal'])),
      },
    ];
  }

  if (kind === 'roomReservation') {
    return [
      {
        label: 'Peminjam',
        minWidth: 220,
        render: (row: any) => pickRoomReservationBorrower(row),
      },
      {
        label: 'Keperluan',
        minWidth: 340,
        render: (row: any) => pickHumanValue(row, ['need_description', 'purpose', 'keperluan', 'borrow_description', 'description', 'deskripsi', 'event_name', 'activity', 'reason', 'note', 'notes']),
      },
      {
        label: 'Ruang',
        minWidth: 190,
        render: (row: any) => pickRoomReservationName(row),
      },
      {
        label: 'Waktu Reservasi',
        minWidth: 280,
        render: (row: any) => formatRoomReservationRange(row),
      },
      {
        label: 'Penanggung Jawab',
        minWidth: 170,
        render: (row: any) => pickHumanValue(row, ['person_responsibility.name', 'person_responsibility.nama', 'verifier_reservation.name', 'verifier_reservation.nama', 'pic.name', 'user_pic.name', 'approver.name', 'approved_by.name', 'handler.name']),
      },
      {
        label: 'Status',
        minWidth: 120,
        render: (row: any) => getSarmokStatusLabel(pickDetailValue(row, ['status', 'status_name', 'state', 'approval_status'])),
      },
    ];
  }

  return [
    {
      label: 'Tanggal',
      minWidth: 150,
      render: (row: any) => formatSarmokDate(pickDetailValue(row, ['start_date', 'start_at', 'borrow_date', 'borrow_at', 'created_at', 'updated_at', 'tanggal'])),
    },
    {
      label: 'Pembuat',
      minWidth: 170,
      render: (row: any) => pickCreatorName(row),
    },
    {
      label: 'Peminjam',
      minWidth: 170,
      render: (row: any) => pickBorrowerName(row),
    },
    {
      label: 'Guru PJ',
      minWidth: 170,
      render: (row: any) => pickHumanValue(row, ['person_responsibility.name', 'person_responsibility.nama', 'verifier.name', 'verifier.nama', 'pic.name', 'user_pic.name', 'approver.name', 'approved_by.name', 'handler.name']),
    },
    {
      label: 'Alat/Barang',
      minWidth: 320,
      render: (row: any) => (
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {formatBorrowItems(row)}
          {(() => {
            const returned = isSarmokReturnedRow(row);
            const items = getDetailCollection(row, TOOL_BORROW_FIELDS);
            const count = items.length || 1;
            
            return (
              <div style={{ 
                marginTop: '0.5rem', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.4rem',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.65rem',
                fontWeight: 700,
                border: returned ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(244,63,94,0.3)',
                background: returned ? 'rgba(16,185,129,0.06)' : 'rgba(244,63,94,0.06)',
                color: returned ? 'var(--accent-emerald)' : 'var(--accent-rose)'
              }}>
                {count} items {returned ? 'returned' : 'still borrow'}
              </div>
            );
          })()}
        </div>
      ),
    },
    {
      label: 'Jumlah',
      minWidth: 100,
      render: (row: any) => formatBorrowQuantity(row),
    },
    {
      label: 'Keperluan',
      minWidth: 300,
      render: (row: any) => pickHumanValue(row, ['need_description', 'purpose', 'keperluan', 'borrow_description', 'description', 'deskripsi', 'activity', 'event_name', 'reason', 'note', 'notes']),
    },
    {
      label: 'Jadwal Pinjam',
      minWidth: 180,
      render: (row: any) => formatSarmokDateRange(row, ['start_at', 'start_date', 'borrow_at', 'borrow_date', 'date_start', 'from', 'tanggal'], ['return_at', 'returned_at', 'end_at', 'end_date', 'date_end', 'to']),
    },
    {
      label: 'Status',
      minWidth: 120,
      render: (row: any) => getSarmokStatusLabel(pickDetailValue(row, ['status', 'status_name', 'state', 'borrow_status', 'approval_status'])),
    },
  ];
};

const getDecisionNote = (kind: SarmokDetailKind, row: unknown) => {
  if (kind === 'complaints') {
    return [
      `Lokasi: ${pickHumanValue(row, ['room.name', 'room_name', 'location', 'lokasi'])}`,
      `Keluhan: ${pickHumanValue(row, ['complaint_description', 'complaint', 'description', 'reason'])}`,
      `PIC: ${pickHumanValue(row, ['pic.name', 'user_pic.name', 'assignee.name', 'handler.name'])}`,
    ].join(' | ');
  }

  if (kind === 'roomReservation') {
    return [
      `Peminjam: ${pickRoomReservationBorrower(row)}`,
      `Ruang: ${pickRoomReservationName(row)}`,
      `Keperluan: ${pickHumanValue(row, ['need_description', 'purpose', 'keperluan', 'borrow_description', 'description', 'event_name'])}`,
      `Waktu: ${formatRoomReservationRange(row)}`,
    ].join(' | ');
  }

  return [
    `Peminjam: ${pickCreatorName(row)}`,
    `Alat: ${formatBorrowItems(row)}`,
    `Keperluan: ${pickHumanValue(row, ['need_description', 'purpose', 'keperluan', 'borrow_description', 'description', 'event_name'])}`,
  ].join(' | ');
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

  // Seed fallback untuk bulan yang belum tersinkron ke DB
  const DASHBOARD_SEED: Record<string, { PLN: number; PDAM: number }> = {
    '2026-07': { PLN: 13214260, PDAM: 995500 },
  };
  Object.entries(DASHBOARD_SEED).forEach(([month, seed]) => {
    const existing = monthTotals.get(month);
    if (!existing || (existing.PLN === 0 && existing.PDAM === 0)) {
      monthTotals.set(month, seed);
    }
  });

  const monthKeys = Array.from(monthTotals.keys()).sort((a, b) => a.localeCompare(b)).slice(-12);
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

const getCapexProgressColor = (progress: number) => {
  if (progress >= 100) return '#10b981';
  if (progress >= 75) return '#22c55e';
  if (progress >= 50) return '#3b82f6';
  return '#f59e0b';
};

const Dashboard = ({ isLoggedIn = false, userPicture = '' }: DashboardProps) => {
  const currentUser = getCurrentUser();
  const isPimpinan = currentUser.roleAplikasi === ROLES.PIMPINAN;
  const isAuthorizedFinance = canAccessFinanceData(currentUser);

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

  // Sarmok Dashboard data
  const [mokletService, setMokletService] = useState<{
    complaints: SarmokComplaintStats | null;
    roomReservation: SarmokRoomStats | null;
    toolsLoan: SarmokToolsStats | null;
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
  const [sarmokDetailModal, setSarmokDetailModal] = useState<SarmokDetailModal | null>(null);
  const [sarmokRowDetailModal, setSarmokRowDetailModal] = useState<any | null>(null);
  const [sarmokAnalysis, setSarmokAnalysis] = useState<{
    complaints: SarmokResponseAnalysis | null;
    roomReservation: SarmokResponseAnalysis | null;
    toolsLoan: SarmokResponseAnalysis | null;
  }>({ complaints: null, roomReservation: null, toolsLoan: null });

  const [wifiData, setWifiData] = useState<any[]>([]);
  const [wifiLoading, setWifiLoading] = useState(false);
  const [netTrafficHistory, setNetTrafficHistory] = useState<any[]>([]);
  const [utilityChartData, setUtilityChartData] = useState<UtilityChartPoint[]>(getUtilityChartData());
  const [trafficView, setTrafficView] = useState<'rx' | 'tx'>('rx');
  const [netSnapshot, setNetSnapshot] = useState<any>(null);
  const [netSnapshotThumb, setNetSnapshotThumb] = useState<any>(null);
  const [netSnapshotLightbox, setNetSnapshotLightbox] = useState<{ src: string; tanggal: string } | null>(null);
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

      return {
        ...p,
        numberedNama,
      };
    });
  const profileThumbByEmail = useProfileThumbByEmail();
  const capexAverageProgress = sortedCapexProjects.length > 0
    ? sortedCapexProjects.reduce((sum, project) => sum + (Number(project.progress) || 0), 0) / sortedCapexProjects.length
    : 0;
  const capexCompletedProjects = sortedCapexProjects.filter((project) => (Number(project.progress) || 0) >= 100).length;
  const capexPriorityProjects = sortedCapexProjects.filter((project) => (Number(project.progress) || 0) < 50).length;

  const [motivationIndex, setMotivationIndex] = useState(0);
  useEffect(() => {
    const intv = setInterval(() => {
      setMotivationIndex(prev => prev + 1);
    }, 10000); // Berganti setiap 10 detik
    return () => clearInterval(intv);
  }, []);

  const PIKET_SCHEDULE = [
    { day: 'Senin', personnel: ['Chusni', 'Whyna', 'Rudi'], color: 'var(--accent-blue)' },
    { day: 'Selasa', personnel: ['Bidin', 'Bagus', 'Rudi'], color: 'var(--accent-emerald)' },
    { day: 'Rabu', personnel: ['Zakaria', 'Yoko', 'Rudi'], color: 'var(--accent-violet)' },
    { day: 'Kamis', personnel: ['Chandra', 'Nico', 'Rudi'], color: 'var(--accent-amber)' },
    { day: 'Jumat', personnel: ['Ayat', 'Amalia', 'Rudi'], color: 'var(--accent-rose)' },
  ];
  const todayDayLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date());
  const todayPiket = PIKET_SCHEDULE.find(s => s.day.toLowerCase() === todayDayLabel.toLowerCase()) || null;
  const isCurrentUserOnDuty = Boolean(
    isLoggedIn && todayPiket && todayPiket.personnel.some(p =>
      currentUser.nama.toLowerCase().includes(p.toLowerCase())
    )
  );
  const todayDateKey = new Date().toISOString().slice(0, 10);
  const piketDutyQuote = getPiketDutyQuote(currentUser.id, todayDateKey);
  const piketDailyReminder = getPiketDailyReminder(todayDateKey);

  const [showPiketGreeting, setShowPiketGreeting] = useState(false);
  useEffect(() => {
    if (!isCurrentUserOnDuty) return;
    const flagKey = `piketGreetingShown:${currentUser.id}:${todayDateKey}`;
    if (localStorage.getItem(flagKey)) return;
    const timer = setTimeout(() => {
      setShowPiketGreeting(true);
      localStorage.setItem(flagKey, '1');
    }, 1200);
    return () => clearTimeout(timer);
  }, [isCurrentUserOnDuty, currentUser.id, todayDateKey]);

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
    const ms = parseRowDateMs(s);
    if (!isNaN(ms)) {
      return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: '2-digit' }).format(new Date(ms));
    }
    return s;
  };

  const ID_MONTH_TO_NUM: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7,
    agt: 8, agu: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12,
  };

  // Mengubah string tanggal apapun (ISO, "19-Jan", "28 Apr 26", "18 Mei",
  // "5/3/2026") jadi epoch ms. Return NaN kalau tidak bisa.
  const parseRowDateMs = (raw: string): number => {
    const s = String(raw || '').trim();
    if (!s) return NaN;

    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.getTime();
    }

    const dashMonth = s.match(/^(\d{1,2})[-\s/]+([A-Za-z]{3,})(?:[-\s/]+(\d{2,4}))?$/);
    if (dashMonth) {
      const day = parseInt(dashMonth[1], 10);
      const month = ID_MONTH_TO_NUM[dashMonth[2].slice(0, 3).toLowerCase()];
      if (month && day >= 1 && day <= 31) {
        const yearRaw = dashMonth[3] ? parseInt(dashMonth[3], 10) : new Date().getFullYear();
        const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
        return new Date(year, month - 1, day).getTime();
      }
    }

    const numeric = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (numeric) {
      const day = parseInt(numeric[1], 10);
      const month = parseInt(numeric[2], 10);
      const yearRaw = parseInt(numeric[3], 10);
      const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        return new Date(year, month - 1, day).getTime();
      }
    }

    const fallback = new Date(s).getTime();
    return isNaN(fallback) ? NaN : fallback;
  };

  // Cari row terbaru berdasarkan tanggal. Kalau tanggal tidak parse-able,
  // pakai timestamp dari ID (mis. AC-1747234567890), lalu insertion order
  // sebagai tiebreaker terakhir.
  const pickLatestRow = (rows: any[], isValid: (row: any) => boolean) => {
    const valid = rows.filter(isValid);
    if (valid.length === 0) return null;

    const scored = valid.map((row, idx) => {
      const dateMs = parseRowDateMs(pickDateField(row));
      if (!isNaN(dateMs)) return { row, score: dateMs };

      const idStr = String(row.id || row.ID || '');
      const idMatch = idStr.match(/(\d{13,})/);
      if (idMatch) return { row, score: Number(idMatch[1]) };

      return { row, score: idx };
    });

    scored.sort((a, b) => a.score - b.score);
    return scored[scored.length - 1].row;
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
            // Semua 40 ruang sudah terpasang per Juli 2025
            // Jika DB masih menyimpan 'Belum Terpasang' (data lama), abaikan dan gunakan default baru
            let status = 'Terpasang';
            let kondisi = 'Baik';
            if (fetchedMap.has(i)) {
              const dbStatus = fetchedMap.get(i).status || fetchedMap.get(i).Status || '';
              const dbKondisi = fetchedMap.get(i).kondisi || fetchedMap.get(i).Kondisi || '';
              if (dbStatus === 'Terpasang') {
                status = dbStatus;
                kondisi = dbKondisi || 'Baik';
              }
              // else: DB masih bilang 'Belum Terpasang' → pakai default 'Terpasang'
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

    const readSarmokDashboardResponse = async (resp: Response) => {
      const contentType = resp.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return parseSarmokDashboardBody(await resp.json());
      }

      return parseSarmokDashboardBody(await resp.text());
    };

    const readSarmokRawResponse = async (resp: Response) => {
      const contentType = resp.headers.get('content-type') || '';
      if (contentType.includes('application/json')) return resp.json();

      const text = await resp.text();
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    };

    // Fetch Sarmok Dashboard data langsung; proxy hanya fallback jika browser/network menolak.
    const fetchMokletService = async () => {
      const authHeader = getSarmokBasicAuthHeader();
      if (!authHeader) {
        setMokletService(prev => ({ ...prev, loading: false, error: false }));
        return;
      }

      setMokletService(prev => ({ ...prev, loading: true, error: false }));
      try {
        const targetUrl = SARMOK_DASHBOARD_API_URL;
        let data: SarmokDashboardData;

        try {
          const directResp = await fetch(targetUrl, {
            method: 'GET',
            headers: {
              Authorization: authHeader,
              Accept: 'application/json',
            },
          });

          if (!directResp.ok) {
            throw new Error(`Sarmok API failed (${directResp.status})`);
          }

          data = await readSarmokDashboardResponse(directResp);
        } catch (directError) {
          console.warn('Sarmok direct fetch failed, trying proxy fallback:', directError);
          const proxyUrl = `${FINANCE_API_URL}?proxyUrl=${encodeURIComponent(targetUrl)}&authHeader=${encodeURIComponent(authHeader)}`;
          const proxyResp = await fetch(proxyUrl, { headers: { Accept: 'application/json' } });

          if (!proxyResp.ok) {
            throw new Error(`Sarmok proxy failed (${proxyResp.status})`);
          }

          data = await readSarmokDashboardResponse(proxyResp);
        }

        let complaintStats = normalizeSarmokComplaintStats(null, data.complaints);
        let complaintPayload: unknown = null;
        const complaintSummaryUrl = buildSarmokDetailUrl(SARMOK_COMPLAINT_DETAIL_API_URL, 'complaints', 'All Status');
        try {
          const directComplaintResp = await fetch(complaintSummaryUrl, {
            method: 'GET',
            headers: {
              Authorization: authHeader,
              Accept: 'application/json',
            },
          });

          if (!directComplaintResp.ok) throw new Error(`Sarmok complaint API failed (${directComplaintResp.status})`);
          complaintPayload = await readSarmokRawResponse(directComplaintResp);
          complaintStats = normalizeSarmokComplaintStats(complaintPayload, data.complaints);
        } catch (complaintDirectError) {
          try {
            console.warn('Sarmok complaint direct fetch failed, trying proxy fallback:', complaintDirectError);
            const proxyUrl = `${FINANCE_API_URL}?proxyUrl=${encodeURIComponent(complaintSummaryUrl)}&authHeader=${encodeURIComponent(authHeader)}`;
            const proxyResp = await fetch(proxyUrl, { headers: { Accept: 'application/json' } });
            if (!proxyResp.ok) throw new Error(`Sarmok complaint proxy failed (${proxyResp.status})`);
            complaintPayload = await readSarmokRawResponse(proxyResp);
            complaintStats = normalizeSarmokComplaintStats(complaintPayload, data.complaints);
          } catch (complaintProxyError) {
            console.warn('Sarmok complaint summary failed, using dashboard fallback:', complaintProxyError);
          }
        }

        let roomStats = normalizeSarmokRoomStats(null, data.roomReservation);
        let roomPayload: unknown = null;
        const roomSummaryUrl = buildSarmokDetailUrl(SARMOK_ROOM_DETAIL_API_URL, 'roomReservation', 'All Status');
        try {
          const directRoomResp = await fetch(roomSummaryUrl, {
            method: 'GET',
            headers: {
              Authorization: authHeader,
              Accept: 'application/json',
            },
          });

          if (!directRoomResp.ok) throw new Error(`Sarmok room API failed (${directRoomResp.status})`);
          roomPayload = await readSarmokRawResponse(directRoomResp);
          roomStats = normalizeSarmokRoomStats(roomPayload, data.roomReservation);
        } catch (roomDirectError) {
          try {
            console.warn('Sarmok room direct fetch failed, trying proxy fallback:', roomDirectError);
            const proxyUrl = `${FINANCE_API_URL}?proxyUrl=${encodeURIComponent(roomSummaryUrl)}&authHeader=${encodeURIComponent(authHeader)}`;
            const proxyResp = await fetch(proxyUrl, { headers: { Accept: 'application/json' } });
            if (!proxyResp.ok) throw new Error(`Sarmok room proxy failed (${proxyResp.status})`);
            roomPayload = await readSarmokRawResponse(proxyResp);
            roomStats = normalizeSarmokRoomStats(roomPayload, data.roomReservation);
          } catch (roomProxyError) {
            console.warn('Sarmok room summary failed, using dashboard fallback:', roomProxyError);
          }
        }

        let toolsStats = normalizeSarmokToolsStats(null, data.toolsLoan);
        let toolsPayload: unknown = null;
        const toolsSummaryUrl = buildSarmokDetailUrl(SARMOK_BORROW_DETAIL_API_URL, 'toolsLoan', 'All Status');
        try {
          const directToolsResp = await fetch(toolsSummaryUrl, {
            method: 'GET',
            headers: {
              Authorization: authHeader,
              Accept: 'application/json',
            },
          });

          if (!directToolsResp.ok) throw new Error(`Sarmok tools API failed (${directToolsResp.status})`);
          toolsPayload = await readSarmokRawResponse(directToolsResp);
          toolsStats = normalizeSarmokToolsStats(toolsPayload, data.toolsLoan);
        } catch (toolsDirectError) {
          try {
            console.warn('Sarmok tools direct fetch failed, trying proxy fallback:', toolsDirectError);
            const proxyUrl = `${FINANCE_API_URL}?proxyUrl=${encodeURIComponent(toolsSummaryUrl)}&authHeader=${encodeURIComponent(authHeader)}`;
            const proxyResp = await fetch(proxyUrl, { headers: { Accept: 'application/json' } });
            if (!proxyResp.ok) throw new Error(`Sarmok tools proxy failed (${proxyResp.status})`);
            toolsPayload = await readSarmokRawResponse(proxyResp);
            toolsStats = normalizeSarmokToolsStats(toolsPayload, data.toolsLoan);
          } catch (toolsProxyError) {
            console.warn('Sarmok tools summary failed, using dashboard fallback:', toolsProxyError);
          }
        }

        const complaintRows = complaintPayload ? normalizeSarmokDetailRows(complaintPayload) : [];
        const roomRows = roomPayload ? filterSarmokRowsByKind(normalizeSarmokDetailRows(roomPayload), 'roomReservation') : [];
        const toolRows = toolsPayload ? filterSarmokRowsByKind(normalizeSarmokDetailRows(toolsPayload), 'toolsLoan') : [];

        setSarmokAnalysis({
          complaints: complaintRows.length ? analyzeSarmokResponse(complaintRows) : null,
          roomReservation: roomRows.length ? analyzeSarmokResponse(roomRows) : null,
          toolsLoan: toolRows.length ? analyzeSarmokResponse(toolRows) : null,
        });

        setMokletService({
          complaints: complaintStats,
          roomReservation: roomStats,
          toolsLoan: toolsStats,
          loading: false,
          lastUpdated: new Date(),
          error: false,
        });
      } catch (e) {
        console.warn('Sarmok dashboard monitoring failed:', e);
        setMokletService(prev => ({ ...prev, loading: false, error: true }));
      }
    };

    fetchMokletService();
    const mokletInterval = setInterval(fetchMokletService, 5 * 60 * 1000); // refresh every 5 mins
    return () => clearInterval(mokletInterval);

  }, [isAuthorizedFinance, isLoggedIn]);

  const readSarmokDetailResponse = async (resp: Response) => {
    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return resp.json();

    const text = await resp.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  const openSarmokDetail = async (
    kind: SarmokDetailKind,
    title: string,
    metricLabel: string,
    endpoint: string,
    accent: string,
  ) => {
    const initialModal: SarmokDetailModal = {
      kind,
      title,
      metricLabel,
      endpoint,
      accent,
      rows: [],
      raw: null,
      loading: true,
      error: '',
    };

    setSarmokDetailModal(initialModal);
    const targetEndpoint = buildSarmokDetailUrl(endpoint, kind, metricLabel);

    const authHeader = getSarmokBasicAuthHeader();
    if (!authHeader) {
      setSarmokDetailModal({ ...initialModal, loading: false, error: 'Basic Auth Sarmok belum tersedia.' });
      return;
    }

    try {
      let payload: unknown;

      try {
        const directResp = await fetch(targetEndpoint, {
          method: 'GET',
          headers: {
            Authorization: authHeader,
            Accept: 'application/json',
          },
        });

        if (!directResp.ok) throw new Error(`Sarmok detail API failed (${directResp.status})`);
        payload = await readSarmokDetailResponse(directResp);
      } catch (directError) {
        console.warn('Sarmok detail direct fetch failed, trying proxy fallback:', directError);
        const proxyUrl = `${FINANCE_API_URL}?proxyUrl=${encodeURIComponent(targetEndpoint)}&authHeader=${encodeURIComponent(authHeader)}`;
        const proxyResp = await fetch(proxyUrl, { headers: { Accept: 'application/json' } });

        if (!proxyResp.ok) throw new Error(`Sarmok detail proxy failed (${proxyResp.status})`);
        payload = await readSarmokDetailResponse(proxyResp);
      }

      const detailRows = normalizeSarmokDetailRows(payload);
      const kindRows = filterSarmokRowsByKind(detailRows, kind);
      const filteredRows = filterSarmokDetailRows(kindRows, metricLabel);

      setSarmokDetailModal({
        ...initialModal,
        rows: filteredRows,
        raw: payload,
        loading: false,
      });
    } catch (error) {
      console.warn('Sarmok detail monitoring failed:', error);
      setSarmokDetailModal({
        ...initialModal,
        loading: false,
        error: error instanceof Error ? error.message : 'Gagal mengambil detail Sarmok.',
      });
    }
  };

  const renderSarmokMetricCell = (
    value: number | string,
    color: string,
    label: string,
    kind: SarmokDetailKind,
    title: string,
    metricLabel: string,
    endpoint: string,
  ) => (
    <button
      type="button"
      onClick={() => openSarmokDetail(kind, title, metricLabel, endpoint, color)}
      disabled={mokletService.loading}
      aria-label={`Lihat detail ${title} ${metricLabel}`}
      title={`Lihat detail ${metricLabel}`}
      style={{
        appearance: 'none',
        width: '100%',
        border: `1px solid ${color}33`,
        background: `${color}0d`,
        padding: '0.4rem 0.55rem',
        borderRadius: '8px',
        cursor: mokletService.loading ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.4rem',
        transition: 'background 0.18s, border-color 0.18s, transform 0.18s',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = `${color}1c`;
        event.currentTarget.style.borderColor = `${color}66`;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = `${color}0d`;
        event.currentTarget.style.borderColor = `${color}33`;
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{
          fontSize: '0.62rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {label}
        </span>
      </span>
      <span style={{ fontWeight: 800, fontSize: '0.95rem', color, lineHeight: 1, flexShrink: 0 }}>
        {value}
      </span>
    </button>
  );

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

  const classroomSnapshotDate = classroomMonitorRows
    .slice()
    .sort((a, b) => (parseWifiDateValue(b.tanggal)?.getTime() || 0) - (parseWifiDateValue(a.tanggal)?.getTime() || 0))[0]?.tanggal || '';
  const classroomDailyRows = classroomSnapshotDate
    ? classroomMonitorRows.filter((row) => row.tanggal === classroomSnapshotDate)
    : [];
  const classroomDailyRowMap = new Map(classroomDailyRows.map((row) => [row.ruang, row]));

  const classroomRoomSummaries = CLASSROOM_LOCATION_OPTIONS.map((ruang) => {
    const dayRow = classroomDailyRowMap.get(ruang) || null;
    const energyFindings = dayRow ? dayRow.lampu + dayRow.tv + dayRow.ac + dayRow.kipas + dayRow.lainnya : 0;
    const cleanlinessFindings = dayRow ? dayRow.sampah + dayRow.kotoran : 0;
    const tidinessFindings = dayRow ? dayRow.rapih : 0;
    const totalFindings = dayRow?.total || 0;
    const observationCount = dayRow ? 1 : 0;
    const score = Math.max(
      0,
      100 - (energyFindings * 12) - (cleanlinessFindings * 15) - (tidinessFindings * 10)
    );
    const status = getClassroomStatusMeta(score);

    return {
      ruang,
      namaKelas: dayRow?.namaKelas || '',
      waliKelas: dayRow?.waliKelas || '',
      observationCount,
      energyFindings,
      cleanlinessFindings,
      tidinessFindings,
      totalFindings,
      score,
      status,
      latestDate: dayRow?.tanggal || '',
      latestDateLabel: dayRow ? formatWifiDateDisplay(dayRow.tanggal) : '-',
      latestNote: dayRow?.keterangan || (dayRow ? buildMonitorIssueSummary(dayRow) : 'Belum ada data'),
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
  const hasClassroomMonitorData = classroomDailyRows.length > 0;
  const classroomIssueComposition = [
    { name: 'Kebersihan', value: classroomTotalCleanlinessFindings, color: '#06b6d4' },
    { name: 'Kerapihan', value: classroomTotalTidinessFindings, color: '#8b5cf6' },
    { name: 'Hemat energi', value: classroomTotalEnergyFindings, color: '#f59e0b' },
  ].filter((item) => item.value > 0);
  const classroomPriorityChartData = classroomRoomsNeedAttention.slice(0, 8).map((room) => ({
    ruang: getShortClassroomLabel(room.ruang),
    ruangLabel: formatClassroomIdentityLabel(room, { shortRoom: true }),
    score: room.score,
    temuan: room.totalFindings,
    fill: room.status.color,
  }));
  const classroomFollowUpItems = classroomRoomsNeedAttention.slice(0, 5).map((room) => {
    const details = getEffectiveRoomDetails(room);
    const walasName = details.waliKelas ? ` (${details.waliKelas})` : '';
    const recipients = room.energyFindings > 0 
      ? `Guru mapel & Wali Kelas${walasName}` 
      : `Wali Kelas${walasName} & petugas piket`;
    
    let action = 'Perlu penguatan budaya kelas agar kondisi ruang tetap siap dipakai berikutnya.';

    if (room.cleanlinessFindings > 0 && room.energyFindings > 0) {
      action = `Arahkan piket kelas membereskan sampah/area lantai, lalu pastikan seluruh perangkat dimatikan sebelum ruang ditinggal (Koordinasi dengan ${details.waliKelas || 'Wali Kelas'}).`;
    } else if (room.cleanlinessFindings > 0) {
      action = `Minta piket kelas menutup hari dengan sweep sampah dan cek lantai sebelum jam terakhir selesai (Koordinasi dengan ${details.waliKelas || 'Wali Kelas'}).`;
    } else if (room.energyFindings > 0) {
      action = `Ingatkan guru terakhir dan ketua kelas untuk cek kipas, lampu, TV, atau AC sebelum meninggalkan ruangan (Informasikan ke ${details.waliKelas || 'Wali Kelas'}).`;
    } else if (room.tidinessFindings > 0) {
      action = `Rapikan formasi meja kursi dan area depan kelas agar siap untuk pembelajaran berikutnya (Koordinasi dengan ${details.waliKelas || 'Wali Kelas'}).`;
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
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
        <div>
          <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} color="var(--accent-cyan)" /> Monitor Rekap Pantauan Kelas
          </h3>
          <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.7rem', color: 'var(--text-secondary)', maxWidth: '760px' }}>
            Ringkasan harian kebersihan, kerapihan & hemat energi untuk wali kelas dan guru.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <a href="#/classroom-monitor" className="btn btn-outline" style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}>
            Detail & Input
          </a>
          <span className="badge badge-info" style={{ background: 'rgba(6,182,212,0.12)', color: 'var(--accent-cyan)', borderColor: 'rgba(6,182,212,0.28)', fontSize: '0.65rem' }}>
            Snapshot {classroomSnapshotDate ? formatWifiDateDisplay(classroomSnapshotDate) : '-'}
          </span>
          <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
            Cakupan {classroomCoverage}/{CLASSROOM_REFERENCE_TOTAL} lokasi
          </span>
        </div>
      </div>

      <div style={{ padding: '0.85rem 1rem' }}>
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
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '0.6rem',
              marginBottom: '0.85rem'
            }}>
              <div style={{ padding: '0.6rem 0.75rem', borderRadius: '10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Ruang Aman</div>
                <div style={{ marginTop: '0.15rem', fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-emerald)', lineHeight: 1.1 }}>
                  {classroomSafeRooms.length}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>tanpa temuan</div>
              </div>

              <div style={{ padding: '0.6rem 0.75rem', borderRadius: '10px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Tindak Lanjut</div>
                <div style={{ marginTop: '0.15rem', fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-rose)', lineHeight: 1.1 }}>
                  {classroomRoomsNeedAttention.length}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>perlu koordinasi</div>
              </div>

              <div style={{ padding: '0.6rem 0.75rem', borderRadius: '10px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Fokus Temuan</div>
                <div style={{ marginTop: '0.15rem', fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-cyan)', lineHeight: 1.1 }}>
                  {classroomTotalCleanlinessFindings >= classroomTotalEnergyFindings && classroomTotalCleanlinessFindings >= classroomTotalTidinessFindings
                    ? 'Kebersihan'
                    : classroomTotalEnergyFindings >= classroomTotalTidinessFindings
                      ? 'Hemat energi'
                      : 'Kerapihan'}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                  {classroomTotalCleanlinessFindings + classroomTotalEnergyFindings + classroomTotalTidinessFindings} temuan
                </div>
              </div>

              <div style={{ padding: '0.6rem 0.75rem', borderRadius: '10px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Coverage</div>
                <div style={{ marginTop: '0.15rem', fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-blue)', lineHeight: 1.1 }}>
                  {classroomCoverageRate}%
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>cakupan terisi</div>
              </div>
            </div>

            <div className="dashboard-grid" style={{ marginBottom: '0.85rem' }}>
              <div className="glass-panel" style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>Prioritas ruang</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                      Skor rendah = butuh perhatian lebih cepat.
                    </div>
                  </div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                    Snapshot harian
                  </span>
                </div>

                {classroomPriorityChartData.length > 0 ? (
                  <div style={{ width: '100%', height: '200px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={classroomPriorityChartData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} stroke="var(--text-muted)" fontSize={10} tickFormatter={(value) => `${value}%`} />
                        <YAxis dataKey="ruang" type="category" width={40} stroke="var(--text-muted)" fontSize={10} />
                        <RechartsTooltip
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-focus)', borderRadius: '10px', fontSize: '11px' }}
                          formatter={(value: any, name: any) => {
                            if (name === 'score') return [`${value}%`, 'Skor kondisi'];
                            return [`${value}`, 'Jumlah temuan'];
                          }}
                          labelFormatter={(_label, payload) => {
                            const tooltipItem = Array.isArray(payload) ? payload[0]?.payload : null;
                            return tooltipItem?.ruangLabel || '';
                          }}
                        />
                        <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={18}>
                          {classroomPriorityChartData.map((item, idx) => (
                            <Cell key={`priority-${idx}`} fill={item.fill} fillOpacity={0.9} />
                          ))}
                          <LabelList dataKey="score" position="right" formatter={(value: any) => `${value}%`} style={{ fill: 'var(--text-primary)', fontSize: 10, fontWeight: 700 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    Belum ada ruang yang membutuhkan tindak lanjut.
                  </div>
                )}
              </div>

              <div className="glass-panel" style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>Sebaran jenis temuan</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                  Fokus pembinaan: kebersihan, kerapihan, atau hemat energi.
                </div>

                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', marginTop: '0.5rem' }}>
                  <div style={{ width: '140px', height: '140px', position: 'relative', flexShrink: 0 }}>
                    {classroomIssueComposition.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={classroomIssueComposition}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={42}
                              outerRadius={68}
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
                            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                              {classroomIssueComposition.reduce((sum, item) => sum + item.value, 0)}
                            </div>
                            <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              total
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ paddingTop: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                        Belum ada data.
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, minWidth: 0 }}>
                    {classroomIssueComposition.map((item) => (
                      <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.4rem 0.55rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.7rem', color: 'var(--text-secondary)', minWidth: 0 }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: item.color, display: 'inline-block', flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-grid" style={{ marginBottom: 0 }}>
              <div className="glass-panel" style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.55rem' }}>
                  Arahan cepat wali kelas & guru
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '380px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {classroomFollowUpItems.length > 0 ? classroomFollowUpItems.map((item) => {
                    const details = getEffectiveRoomDetails(item);
                    return (
                      <div key={item.ruang} style={{ padding: '0.6rem 0.7rem', borderRadius: '10px', background: item.status.bg, border: `1px solid ${item.status.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.55rem', alignItems: 'flex-start' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {item.ruang}
                                {details.className && (
                                  <span style={{ opacity: 0.6, fontWeight: 400, marginLeft: '0.25rem' }}>/ {details.className}</span>
                                )}
                              </span>
                              <span style={{ fontSize: '0.56rem', fontWeight: 700, padding: '1px 6px', borderRadius: '999px', color: item.status.color, background: item.status.bg, border: `1px solid ${item.status.border}` }}>
                                {item.status.label}
                              </span>
                            </div>
                            {details.waliKelas && (
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                                <strong style={{ color: 'var(--text-primary)' }}>Wali:</strong> {details.waliKelas}
                              </div>
                            )}
                            <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                              <strong style={{ color: 'var(--text-primary)' }}>Temuan:</strong> {item.latestNote}
                            </div>
                            <div style={{ marginTop: '0.25rem', fontSize: '0.66rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                              <strong style={{ color: 'var(--text-primary)' }}>Aksi:</strong> {item.action}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: item.status.color, lineHeight: 1.1 }}>{item.score}%</div>
                            <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>skor</div>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div style={{ padding: '0.85rem', borderRadius: '10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      Semua ruang dalam kondisi aman.
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.55rem' }}>
                  Ringkasan komunikasi harian
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ padding: '0.6rem 0.7rem', borderRadius: '10px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Ruang bersih & siap pakai</div>
                    <div style={{ marginTop: '0.15rem', fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-blue)', lineHeight: 1.1 }}>
                      {classroomSafeRooms.length} lokasi
                    </div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.45 }}>
                      {classroomSafeRooms.slice(0, 6).map((room) => formatClassroomIdentityLabel(room, { shortRoom: true })).join(', ') || '-'}
                    </div>
                  </div>

                  <div style={{ padding: '0.6rem 0.7rem', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Briefing guru</div>
                    <div style={{ marginTop: '0.2rem', fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Tekankan cek akhir kelas: sampah terangkat, lantai bersih, kipas/lampu/TV/AC dipastikan mati.
                    </div>
                  </div>

                  <div style={{ padding: '0.6rem 0.7rem', borderRadius: '10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Sumber data</div>
                    <div style={{ marginTop: '0.2rem', fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Snapshot terbaru dari sheet <code style={{ fontSize: '0.66rem' }}>{CLASSROOM_MONITOR_SHEET}</code>.
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
      {sarmokDetailModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Detail ${sarmokDetailModal.title}`}
          onClick={() => setSarmokDetailModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2200,
            background: 'rgba(2,6,23,0.72)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '1.25rem 1rem',
            overflowY: 'auto',
          }}
        >
          <div
            className="glass-panel"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(1180px, 100%)',
              maxHeight: 'calc(100vh - 2.5rem)',
              overflow: 'hidden',
              border: `1px solid ${sarmokDetailModal.accent}55`,
              background: 'var(--bg-secondary)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
            }}
          >
            <div style={{ padding: '1rem 1.1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: sarmokDetailModal.accent, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {sarmokDetailModal.metricLabel}
                </div>
                <h3 style={{ margin: '0.25rem 0 0', color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                  Detail {sarmokDetailModal.title}
                </h3>
                <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                  Data sudah difilter sesuai kategori dan status yang diklik.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSarmokDetailModal(null)}
                aria-label="Tutup detail Sarmok"
                className="btn btn-outline"
                style={{ width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '1rem 1.1rem', overflowY: 'auto', maxHeight: 'calc(100vh - 9rem)' }}>
              {sarmokDetailModal.loading ? (
                <div style={{ minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: sarmokDetailModal.accent }}>
                  <Loader2 size={24} className="animate-spin" />
                </div>
              ) : sarmokDetailModal.error ? (
                <div style={{ padding: '1rem', border: '1px solid rgba(248,113,113,0.24)', background: 'rgba(248,113,113,0.08)', borderRadius: 8 }}>
                  <div style={{ fontWeight: 800, color: 'var(--accent-rose)', fontSize: '0.86rem' }}>Gagal mengambil detail</div>
                  <div style={{ marginTop: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.76rem', lineHeight: 1.5 }}>{sarmokDetailModal.error}</div>
                </div>
              ) : sarmokDetailModal.rows.length === 0 ? (
                <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-subtle)', borderRadius: 8 }}>
                  Tidak ada data detail dari API untuk status ini.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.85rem' }}>
                  {(() => {
                    let summaryCards: { label: string; value: number | string }[] = [];
                    if (sarmokDetailModal.kind === 'toolsLoan' && mokletService.toolsLoan) {
                      summaryCards = [
                        { label: 'Count Pending', value: mokletService.toolsLoan.waitingConfirmation },
                        { label: 'Count Verified', value: mokletService.toolsLoan.haveNotReturn },
                        { label: 'Count Rejected', value: mokletService.toolsLoan.rejected },
                        { label: 'Count Returned', value: mokletService.toolsLoan.returned },
                      ];
                    } else if (sarmokDetailModal.kind === 'roomReservation' && mokletService.roomReservation) {
                      summaryCards = [
                        { label: 'Count Pending', value: mokletService.roomReservation.waitingConfirmation },
                        { label: 'Count Verified', value: mokletService.roomReservation.activeReservation },
                        { label: 'Count Rejected', value: mokletService.roomReservation.rejectedReservation },
                        { label: 'Count In Use', value: mokletService.roomReservation.inUseReservation },
                      ];
                    } else if (sarmokDetailModal.kind === 'complaints' && mokletService.complaints) {
                      summaryCards = [
                        { label: 'Count Pending', value: mokletService.complaints.pending },
                        { label: 'Count In Progress', value: mokletService.complaints.inProgress },
                        { label: 'Count Complete', value: mokletService.complaints.complete },
                        { label: 'Count Rejected', value: mokletService.complaints.rejected },
                      ];
                    } else {
                      const entries = getSarmokDetailSummaryEntries(sarmokDetailModal.raw);
                      summaryCards = entries.map(([key, val]) => ({
                        label: formatDetailKey(key),
                        value: formatDetailValue(val),
                      }));
                    }

                    if (summaryCards.length === 0) return null;

                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.65rem' }}>
                        {summaryCards.map((card, idx) => (
                          <div key={idx} style={{ padding: '0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ fontSize: '0.63rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</div>
                            <div style={{ marginTop: '0.25rem', fontSize: '1.1rem', lineHeight: 1, fontWeight: 800, color: sarmokDetailModal.accent }}>{card.value}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
                    <table style={{ width: '100%', minWidth: sarmokDetailModal.kind === 'complaints' ? '1120px' : '1280px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <th style={{ width: 52, padding: '0.75rem 0.7rem', textAlign: 'left', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-subtle)' }}>No</th>
                          {getReminderColumns(sarmokDetailModal.kind).map((column) => (
                            <th key={column.label} style={{ width: column.minWidth, padding: '0.75rem 0.7rem', textAlign: 'left', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-subtle)' }}>
                              {column.label}
                            </th>
                          ))}
                          {sarmokDetailModal.kind !== 'complaints' && (
                            <th style={{ width: 290, padding: '0.75rem 0.7rem', textAlign: 'left', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-subtle)' }}>Pertimbangan</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {sarmokDetailModal.rows.map((row, index) => (
                          <tr 
                            key={index} 
                            onClick={() => setSarmokRowDetailModal(row)}
                            style={{ 
                              borderBottom: index === sarmokDetailModal.rows.length - 1 ? 'none' : '1px solid var(--border-subtle)',
                              cursor: 'pointer',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '0.75rem 0.7rem', verticalAlign: 'top', color: sarmokDetailModal.accent, fontSize: '0.76rem', fontWeight: 800 }}>#{index + 1}</td>
                            {getReminderColumns(sarmokDetailModal.kind).map((column) => (
                              <td key={column.label} style={{ padding: '0.75rem 0.7rem', verticalAlign: 'top', color: 'var(--text-secondary)', fontSize: '0.76rem', lineHeight: 1.45, wordBreak: 'break-word' }}>
                                {column.render(row)}
                              </td>
                            ))}
                            {sarmokDetailModal.kind !== 'complaints' && (
                              <td style={{ padding: '0.75rem 0.7rem', verticalAlign: 'top', color: 'var(--text-primary)', fontSize: '0.76rem', lineHeight: 1.45, fontWeight: 700, wordBreak: 'break-word' }}>
                                {getDecisionNote(sarmokDetailModal.kind, row)}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <details style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '0.75rem 0.85rem', background: 'rgba(255,255,255,0.015)' }}>
                    <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700 }}>Field lengkap per data</summary>
                    <div style={{ display: 'grid', gap: '0.8rem', marginTop: '0.8rem' }}>
                      {sarmokDetailModal.rows.map((row, index) => {
                        const entries = getDetailEntries(row);
                        return (
                          <div key={index} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--border-subtle)', paddingTop: index === 0 ? 0 : '0.8rem' }}>
                            <div style={{ color: sarmokDetailModal.accent, fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.55rem' }}>#{index + 1} {summarizeDetailRow(row)}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
                              {entries.slice(0, 18).map(([key, value]) => (
                                <div key={key} style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{formatDetailKey(key)}</div>
                                  <div style={{ marginTop: '0.2rem', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.45, wordBreak: 'break-word' }}>{formatDetailValue(value)}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
          <div style={{ marginTop: '0.95rem' }}>
            <Link
              to="/assistant"
              className="btn btn-outline"
              style={{ padding: '0.7rem 0.95rem', fontSize: '0.8rem', borderColor: 'rgba(6,182,212,0.32)', color: 'var(--accent-cyan)', background: 'rgba(6,182,212,0.06)' }}
            >
              <MessageSquare size={16} />
              Chat Dengan Asisten Sarmok
            </Link>
          </div>
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

      {/* ── Sarmok API Integration Boxes ── */}
      <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: mokletService.error ? '#f87171' : mokletService.loading ? '#fbbf24' : '#34d399', boxShadow: `0 0 6px ${mokletService.error ? '#f8717160' : mokletService.loading ? '#fbbf2460' : '#34d39960'}` }} />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Sarmok Dashboard — Status Layanan</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.45rem', border: '1px solid var(--border-subtle)', borderRadius: 999, color: 'var(--text-muted)', fontSize: '0.62rem', fontWeight: 700, background: 'rgba(255,255,255,0.03)' }}>
                <Info size={11} /> Klik angka
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {mokletService.lastUpdated && (
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  Update: {mokletService.lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          {isPimpinan && !SARMOK_BASIC_AUTH_READY && (
            <div className="glass-panel" style={{ padding: '0.9rem 1rem', marginBottom: '1rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.18)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-amber)', marginBottom: '0.2rem' }}>
                Basic Auth terpusat belum tersedia di build
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Isi `VITE_SARMOK_BASIC_AUTH_USERNAME` dan `VITE_SARMOK_BASIC_AUTH_PASSWORD` saat build/deploy agar dashboard mengambil data Sarmok tanpa setting ulang di browser.
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>

            {/* Box 1: Complaints */}
            <div className="glass-panel" style={{ padding: '0.75rem', border: '1px solid rgba(251,146,60,0.22)', background: 'rgba(251,146,60,0.025)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.55rem' }}>
                <AlertCircle size={14} color="#f97316" />
                <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#f97316' }}>Pengaduan</span>
              </div>
              {mokletService.loading && !mokletService.complaints ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '0.75rem' }}><Loader2 size={16} className="animate-spin" color="#f97316" /></div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.4rem', opacity: mokletService.loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                  {renderSarmokMetricCell(mokletService.complaints?.pending ?? '-', '#f97316', 'Menunggu', 'complaints', 'Pengaduan', 'Menunggu Konfirmasi', SARMOK_COMPLAINT_DETAIL_API_URL)}
                  {renderSarmokMetricCell(mokletService.complaints?.inProgress ?? '-', '#3b82f6', 'Diproses', 'complaints', 'Pengaduan', 'Sedang Diproses', SARMOK_COMPLAINT_DETAIL_API_URL)}
                  {renderSarmokMetricCell(mokletService.complaints?.complete ?? '-', '#22c55e', 'Selesai', 'complaints', 'Pengaduan', 'Selesai', SARMOK_COMPLAINT_DETAIL_API_URL)}
                </div>
              )}
            </div>

            {/* Box 2: Room Reservation — focus on Sedang Dipakai only */}
            <div className="glass-panel" style={{ padding: '0.75rem', border: '1px solid rgba(52,211,153,0.22)', background: 'rgba(52,211,153,0.025)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.55rem' }}>
                <Calendar size={14} color="#10b981" />
                <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#10b981' }}>Peminjaman Ruang</span>
              </div>
              {mokletService.loading && !mokletService.roomReservation ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '0.75rem' }}><Loader2 size={16} className="animate-spin" color="#10b981" /></div>
              ) : (
                <div style={{ opacity: mokletService.loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                  <button
                    type="button"
                    onClick={() => openSarmokDetail('roomReservation', 'Peminjaman Ruang', 'Sedang Dipakai', SARMOK_ROOM_DETAIL_API_URL, '#14b8a6')}
                    disabled={mokletService.loading}
                    aria-label="Lihat detail Peminjaman Ruang Sedang Dipakai"
                    title="Lihat detail Sedang Dipakai"
                    style={{
                      appearance: 'none',
                      width: '100%',
                      border: '1px solid rgba(20,184,166,0.35)',
                      background: 'rgba(20,184,166,0.08)',
                      padding: '0.65rem 0.8rem',
                      borderRadius: '10px',
                      cursor: mokletService.loading ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.6rem',
                      transition: 'background 0.18s, border-color 0.18s',
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = 'rgba(20,184,166,0.15)';
                      event.currentTarget.style.borderColor = 'rgba(20,184,166,0.6)';
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = 'rgba(20,184,166,0.08)';
                      event.currentTarget.style.borderColor = 'rgba(20,184,166,0.35)';
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#14b8a6', flexShrink: 0 }} />
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.1rem', minWidth: 0 }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                          Sedang Dipakai
                        </span>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                          ruang aktif sekarang
                        </span>
                      </span>
                    </span>
                    <span style={{ fontWeight: 800, fontSize: '1.55rem', color: '#14b8a6', lineHeight: 1, flexShrink: 0 }}>
                      {mokletService.roomReservation?.inUseReservation ?? '-'}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Box 3: Tools Loan */}
            <div className="glass-panel" style={{ padding: '0.75rem', border: '1px solid rgba(59,130,246,0.22)', background: 'rgba(59,130,246,0.025)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.55rem' }}>
                <Briefcase size={14} color="#3b82f6" />
                <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#3b82f6' }}>Peminjaman Alat</span>
              </div>
              {mokletService.loading && !mokletService.toolsLoan ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '0.75rem' }}><Loader2 size={16} className="animate-spin" color="#3b82f6" /></div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.4rem', opacity: mokletService.loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                  {renderSarmokMetricCell(mokletService.toolsLoan?.rejected ?? '-', '#fb7185', 'Ditolak', 'toolsLoan', 'Peminjaman Alat', 'Ditolak', SARMOK_BORROW_DETAIL_API_URL)}
                  {renderSarmokMetricCell(mokletService.toolsLoan?.waitingConfirmation ?? '-', '#f59e0b', 'Menunggu', 'toolsLoan', 'Peminjaman Alat', 'Menunggu Konfirmasi', SARMOK_BORROW_DETAIL_API_URL)}
                  {renderSarmokMetricCell(mokletService.toolsLoan?.haveNotReturn ?? '-', '#3b82f6', 'Verifikasi', 'toolsLoan', 'Peminjaman Alat', 'Terverifikasi/Aktif', SARMOK_BORROW_DETAIL_API_URL)}
                  {renderSarmokMetricCell(mokletService.toolsLoan?.returned ?? '-', '#22c55e', 'Selesai', 'toolsLoan', 'Peminjaman Alat', 'Dikembalikan/Selesai', SARMOK_BORROW_DETAIL_API_URL)}
                </div>
              )}
            </div>

          </div>

          {(sarmokAnalysis.complaints || sarmokAnalysis.roomReservation || sarmokAnalysis.toolsLoan) && (
            <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={14} color="var(--accent-cyan)" />
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    Analisa Kecepatan Respon
                  </span>
                </div>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Dihitung dari selisih waktu pengajuan vs aksi pertama (verifikasi/proses/tolak).
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem' }}>
                {([
                  { key: 'complaints' as const, label: 'Pengaduan', color: '#f97316', data: sarmokAnalysis.complaints },
                  { key: 'roomReservation' as const, label: 'Peminjaman Ruang', color: '#10b981', data: sarmokAnalysis.roomReservation },
                  { key: 'toolsLoan' as const, label: 'Peminjaman Alat', color: '#3b82f6', data: sarmokAnalysis.toolsLoan },
                ]).map((module) => {
                  const a = module.data;
                  if (!a) {
                    return (
                      <div key={module.key} style={{ padding: '0.7rem 0.8rem', borderRadius: '10px', background: `${module.color}08`, border: `1px solid ${module.color}25` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: module.color }} />
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: module.color }}>{module.label}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Data analisa belum tersedia.
                        </div>
                      </div>
                    );
                  }

                  const slaTone = a.withinDayPct === null
                    ? 'var(--text-muted)'
                    : a.withinDayPct >= 80
                      ? 'var(--accent-emerald)'
                      : a.withinDayPct >= 50
                        ? 'var(--accent-amber)'
                        : 'var(--accent-rose)';

                  return (
                    <div key={module.key} style={{ padding: '0.7rem 0.8rem', borderRadius: '10px', background: `${module.color}0a`, border: `1px solid ${module.color}28` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', marginBottom: '0.45rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: module.color }} />
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: module.color }}>{module.label}</span>
                        </div>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                          {a.handledCount}/{a.total} ditangani
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.35rem 0.6rem' }}>
                        <div>
                          <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Rata-rata</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{formatResponseHours(a.avgHours)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Median</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{formatResponseHours(a.medianHours)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Tercepat</div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-emerald)', lineHeight: 1.1 }}>{formatResponseHours(a.fastestHours)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Terlambat</div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-rose)', lineHeight: 1.1 }}>{formatResponseHours(a.slowestHours)}</div>
                        </div>
                      </div>

                      <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', gap: '0.4rem', alignItems: 'center', fontSize: '0.62rem' }}>
                        <span style={{ color: slaTone, fontWeight: 700 }}>
                          {a.withinDayPct !== null ? `${a.withinDayPct.toFixed(0)}% direspon ≤ 24 jam` : 'Belum cukup data SLA'}
                        </span>
                        <span style={{ color: a.overduePending > 0 ? 'var(--accent-rose)' : 'var(--text-muted)', fontWeight: 700 }}>
                          {a.overduePending > 0 ? `${a.overduePending} pending >24j` : `${a.pendingCount} pending`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

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
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Briefcase size={16} color="var(--accent-amber)" /> 5. Progres Pekerjaan & Pengadaan CAPEX
            </h3>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Pemantauan target peremajaan dan pembangunan 2026</p>
          </div>
          {isLoggedIn ? (
            <a href="#/capex" className="btn btn-outline" style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}>Monitor CAPEX &rarr;</a>
          ) : (
            <span className="badge badge-warning" style={{ textTransform: 'none', letterSpacing: 0, fontSize: '0.68rem' }}>
              Ringkasan publik aktif
            </span>
          )}
        </div>

        <div style={{ padding: '0.85rem 1rem' }}>
          {capexLoading ? (
            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" color="var(--accent-amber)" /></div>
          ) : sortedCapexProjects.length > 0 ? (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '0.6rem',
                marginBottom: '0.85rem'
              }}>
                <div style={{ padding: '0.6rem 0.75rem', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Rerata Progres</div>
                  <div style={{ marginTop: '0.15rem', fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-amber)', lineHeight: 1.1 }}>
                    {capexAverageProgress.toFixed(1)}%
                  </div>
                </div>
                <div style={{ padding: '0.6rem 0.75rem', borderRadius: '10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Selesai</div>
                  <div style={{ marginTop: '0.15rem', fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-emerald)', lineHeight: 1.1 }}>
                    {capexCompletedProjects}<span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '0.25rem' }}>/ {sortedCapexProjects.length}</span>
                  </div>
                </div>
                <div style={{ padding: '0.6rem 0.75rem', borderRadius: '10px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Prioritas</div>
                  <div style={{ marginTop: '0.15rem', fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-rose)', lineHeight: 1.1 }}>
                    {capexPriorityProjects}<span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '0.25rem' }}>&lt;50%</span>
                  </div>
                </div>
                <div style={{ padding: '0.6rem 0.75rem', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Proyek</div>
                  <div style={{ marginTop: '0.15rem', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                    {sortedCapexProjects.length}
                  </div>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '0.5rem',
                maxHeight: '360px',
                overflowY: 'auto',
                paddingRight: '0.25rem'
              }}>
                {sortedCapexProjects.map((project) => {
                  const progress = Math.max(0, Math.min(100, Number(project.progress) || 0));
                  const progressColor = getCapexProgressColor(progress);

                  return (
                    <div
                      key={project.id || project.numberedNama}
                      style={{
                        padding: '0.55rem 0.7rem',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.025)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', alignItems: 'flex-start' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35, overflowWrap: 'anywhere' }}>
                            {project.numberedNama}
                          </div>
                          <div style={{ marginTop: '0.1rem', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                            {project.unit || project.Unit || 'Sarpras'}
                          </div>
                        </div>
                        <span style={{ flex: '0 0 auto', fontSize: '0.72rem', fontWeight: 800, color: progressColor }}>
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <div style={{ marginTop: '0.4rem', height: '5px', borderRadius: 999, background: 'rgba(148,163,184,0.14)', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${progress}%`,
                            height: '100%',
                            borderRadius: 999,
                            background: progressColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
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
            {PIKET_SCHEDULE.map((item, idx) => {
              const isToday = todayDayLabel.toLowerCase() === item.day.toLowerCase();
              const isCurrentUserDay = isLoggedIn && item.personnel.some(p =>
                currentUser.nama.toLowerCase().includes(p.toLowerCase())
              );

              return (
                <div key={idx} className={isToday ? 'piket-today-card' : ''} style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  background: isToday ? `${item.color}15` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isToday ? item.color : isCurrentUserDay ? `${item.color}55` : 'var(--border-subtle)'}`,
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  boxShadow: isToday ? `0 0 18px ${item.color}33, 0 0 0 1px ${item.color}55 inset` : 'none',
                  transform: isToday ? 'scale(1.02)' : 'none',
                  zIndex: isToday ? 2 : 1
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isToday ? item.color : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {item.day}
                    </div>
                    {isToday && (
                      <div className="piket-today-badge" style={{
                        background: item.color,
                        color: 'white',
                        fontSize: '0.6rem',
                        fontWeight: 800,
                        padding: '3px 9px',
                        borderRadius: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        boxShadow: `0 2px 8px ${item.color}60`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        flexShrink: 0
                      }}>
                        <Sparkles size={10} /> Hari Ini
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {item.personnel.map((p, pIdx) => {
                      const user = USERS.find(u => u.nama.includes(p));
                      const isMe = isLoggedIn && currentUser.nama.toLowerCase().includes(p.toLowerCase());
                      return (
                        <div key={pIdx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          fontSize: '0.8rem',
                          color: isMe ? item.color : p === 'Rudi' ? 'var(--text-primary)' : 'var(--text-secondary)',
                          padding: isMe ? '4px 8px' : '0',
                          margin: isMe ? '-4px -8px' : '0',
                          borderRadius: isMe ? '8px' : '0',
                          background: isMe ? `${item.color}1a` : 'transparent',
                          border: isMe ? `1px solid ${item.color}55` : '1px solid transparent',
                          transition: 'background 0.2s'
                        }}>
                          <UserAvatar
                            name={user?.nama || p}
                            email={user?.email}
                            photoUrl={user?.fotoProfil}
                            profileThumbByEmail={profileThumbByEmail}
                            size={22}
                          />
                          <span style={{ fontWeight: isMe ? 700 : p === 'Rudi' ? 600 : 400 }}>
                            {p}{isMe ? ' (kamu)' : ''}
                          </span>
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
              {isCurrentUserOnDuty ? (
                <div style={{
                  marginTop: '1.25rem',
                  padding: '0.9rem 1rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(59,130,246,0.10))',
                  border: '1px solid rgba(16,185,129,0.4)',
                  fontSize: '0.78rem',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  gap: '0.65rem',
                  alignItems: 'flex-start'
                }}>
                  <ShieldCheck size={18} color="var(--accent-emerald)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--accent-emerald)', marginBottom: '0.25rem', letterSpacing: '0.02em' }}>
                      Hari ini giliran kamu, {currentUser.nama.split(' ')[0]}!
                    </div>
                    <div style={{ lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                      {piketDutyQuote}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  marginTop: '1.25rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.14), rgba(244,63,94,0.06))',
                  border: '1px solid rgba(245, 158, 11, 0.28)',
                  fontSize: '0.75rem',
                  color: 'var(--accent-amber)',
                  display: 'flex',
                  gap: '0.55rem',
                  alignItems: 'flex-start',
                  fontStyle: 'italic'
                }}>
                  <Sparkles size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ lineHeight: 1.5 }}>{piketDailyReminder}</span>
                </div>
              )}
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
              <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Fasilitas &amp; Gedung Sekolah</p>
            </div>
            {/* Stats rata-rata PLN */}
            {utilityChartData.length > 0 && (() => {
              const vals = utilityChartData.map(d => d.PLN).filter(v => v > 0);
              const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
              const max = vals.length ? Math.max(...vals) : 0;
              const min = vals.length ? Math.min(...vals) : 0;
              return (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rata-rata</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-amber)' }}>{(avg / 1000000).toFixed(1)}jt</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tertinggi</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-rose)' }}>{(max / 1000000).toFixed(1)}jt</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Terendah</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>{(min / 1000000).toFixed(1)}jt</div>
                  </div>
                </div>
              );
            })()}
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
                {utilityChartData.length > 0 && (() => {
                  const vals = utilityChartData.map(d => d.PLN).filter(v => v > 0);
                  const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
                  return avg > 0 ? (
                    <ReferenceLine y={avg} stroke="rgba(245,158,11,0.5)" strokeDasharray="4 3" label={{ value: `Avg ${(avg/1000000).toFixed(1)}jt`, position: 'insideTopRight', fontSize: 9, fill: 'var(--accent-amber)', fontWeight: 600 }} />
                  ) : null;
                })()}
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
            {/* Stats rata-rata PDAM */}
            {utilityChartData.length > 0 && (() => {
              const vals = utilityChartData.map(d => d.PDAM).filter(v => v > 0);
              const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
              const max = vals.length ? Math.max(...vals) : 0;
              const min = vals.length ? Math.min(...vals) : 0;
              return (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rata-rata</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{(avg / 1000).toFixed(0)}rb</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tertinggi</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-rose)' }}>{(max / 1000).toFixed(0)}rb</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Terendah</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>{(min / 1000).toFixed(0)}rb</div>
                  </div>
                </div>
              );
            })()}
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
                {utilityChartData.length > 0 && (() => {
                  const vals = utilityChartData.map(d => d.PDAM).filter(v => v > 0);
                  const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
                  return avg > 0 ? (
                    <ReferenceLine y={avg} stroke="rgba(6,182,212,0.5)" strokeDasharray="4 3" label={{ value: `Avg ${(avg/1000).toFixed(0)}rb`, position: 'insideTopRight', fontSize: 9, fill: 'var(--accent-cyan)', fontWeight: 600 }} />
                  ) : null;
                })()}
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

      {sarmokRowDetailModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSarmokRowDetailModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(2,6,23,0.85)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '2rem 1rem',
            overflowY: 'auto'
          }}
        >
          <div
            className="glass-panel"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: sarmokDetailModal?.kind === 'complaints' ? 'min(760px, 100%)' : 'min(500px, 100%)',
              marginTop: '5vh',
              maxHeight: 'none',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-focus)',
              boxShadow: '0 32px 100px rgba(0,0,0,0.6)',
              borderRadius: '24px'
            }}
          >
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {sarmokDetailModal?.kind === 'complaints' ? (
                    <>
                      <MessageSquare size={18} color={sarmokDetailModal?.accent || 'var(--accent-rose)'} /> Detail Pengaduan
                    </>
                  ) : sarmokDetailModal?.kind === 'roomReservation' ? (
                    <>
                      <Home size={18} color={sarmokDetailModal?.accent || 'var(--accent-green)'} /> Detail Peminjaman Ruang
                    </>
                  ) : (
                    <>
                      <Briefcase size={18} color={sarmokDetailModal?.accent || 'var(--accent-blue)'} /> Daftar Item Dipinjam
                    </>
                  )}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSarmokRowDetailModal(null)}
                className="btn btn-outline"
                style={{ width: 32, height: 32, padding: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}
              >
                <X size={14} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {sarmokDetailModal?.kind === 'complaints' ? (() => {
                const complaintDetails = [
                  ['Tanggal', formatSarmokDate(pickDetailValue(sarmokRowDetailModal, ['created_at', 'updated_at', 'process_at', 'date', 'tanggal']))],
                  ['Pelapor', pickCreatorName(sarmokRowDetailModal)],
                  ['Ruang/Lokasi', pickHumanValue(sarmokRowDetailModal, ['room.name', 'room.nama', 'room_name', 'room', 'location.name', 'location', 'lokasi'])],
                  ['Keluhan', pickHumanValue(sarmokRowDetailModal, ['complaint_description', 'complaint', 'keluhan', 'description', 'deskripsi', 'problem', 'issue', 'reason', 'note', 'notes'])],
                  ['Kategori', pickHumanValue(sarmokRowDetailModal, ['category.name', 'category', 'type.name', 'type'])],
                  ['PIC/Tindak Lanjut', pickHumanValue(sarmokRowDetailModal, ['pic.name', 'user_pic.name', 'assignee.name', 'handler.name', 'technician.name', 'user_pic'])],
                ].filter(([, value]) => value !== '-');

                return (
                  <div style={{ display: 'grid', gap: '0.85rem' }}>
                    {complaintDetails.map(([label, value]) => (
                      <div key={label} style={{ padding: '0.9rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{label}</div>
                        <div style={{ fontSize: label === 'Keluhan' ? '0.86rem' : '0.82rem', fontWeight: label === 'Keluhan' ? 600 : 700, color: 'var(--text-primary)', lineHeight: 1.55 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                );
              })() : sarmokDetailModal?.kind === 'roomReservation' ? (() => {
                const roomDetails = [
                  ['Peminjam', pickRoomReservationBorrower(sarmokRowDetailModal)],
                  ['Keperluan', pickHumanValue(sarmokRowDetailModal, ['need_description', 'purpose', 'keperluan', 'borrow_description', 'description', 'deskripsi', 'event_name', 'activity', 'reason', 'note', 'notes'])],
                  ['Ruang', pickRoomReservationName(sarmokRowDetailModal)],
                  ['Waktu Reservasi', formatRoomReservationRange(sarmokRowDetailModal)],
                  ['Penanggung Jawab', pickHumanValue(sarmokRowDetailModal, ['person_responsibility.name', 'person_responsibility.nama', 'verifier_reservation.name', 'verifier_reservation.nama', 'pic.name', 'user_pic.name', 'approver.name', 'approved_by.name', 'handler.name'])],
                  ['Proses Pada', formatSarmokDate(pickDetailValue(sarmokRowDetailModal, ['process_at', 'processed_at', 'approved_at']))],
                ].filter(([, value]) => value !== '-');

                return (
                  <div style={{ display: 'grid', gap: '0.85rem' }}>
                    {roomDetails.map(([label, value]) => (
                      <div key={label} style={{ padding: '0.9rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{label}</div>
                        <div style={{ fontSize: label === 'Keperluan' ? '0.86rem' : '0.82rem', fontWeight: label === 'Keperluan' ? 600 : 700, color: 'var(--text-primary)', lineHeight: 1.55 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                );
              })() : (() => {
                const items = getDetailCollection(sarmokRowDetailModal, ['SARPRA DETAIL BORROW', 'sarpra_detail_borrow', 'items', 'tools', 'assets', 'procurements']);
                
                if (items.length === 0) {
                  return (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed var(--border-subtle)' }}>
                      Tidak ada detail item (SARPRA DETAIL BORROW) ditemukan untuk data ini.
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'grid', gap: '0.85rem' }}>
                    {items.map((item: any, idx) => {
                      const expanded = expandDetailRecord(item);

                      let name = pickHumanValue(expanded, [
                        'asset.name', 'asset.nama', 'asset.title', 'asset.label',
                        'item.asset.name', 'item.asset.nama', 'label.asset.name', 'label.asset.nama',
                        'label.procurement.asset.name', 'label.procurement.asset.nama',
                        'procurement.name', 'procurement.nama', 'procurements.name', 'procurements.nama',
                        'procurements.asset.name', 'procurements.asset.nama',
                        'procurement.asset.name', 'procurement.asset.nama',
                        'item.name', 'item.nama', 'name', 'nama', 'title', 'label'
                      ]);

                      if (name === '-' || /^\d+$/.test(name) || isSarmokUuid(name) || name.includes('{')) {
                        name = findBetterSarmokName(expanded) || name;
                      }
                      if (name.includes('{')) name = '-';

                      let qty = '-';
                      const bQty = findBetterSarmokQty(expanded);
                      if (bQty !== null) qty = String(bQty);

                      const displayName = (name !== '-' && !name.includes('{')) ? name : 'Item Tanpa Nama';
                      const displayQty = qty !== '-' ? qty : '-';
                      
                      return (
                        <div key={idx} style={{ 
                          padding: '1rem 1.2rem', 
                          borderRadius: '16px', 
                          background: 'rgba(255,255,255,0.03)', 
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '1rem',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Nama Alat/Barang</div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{displayName}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Jumlah</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: sarmokDetailModal?.accent || 'var(--accent-blue)' }}>{displayQty}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <details style={{ marginTop: '1.5rem', border: '1px solid var(--border-subtle)', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
                <summary style={{ padding: '0.75rem 1rem', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', userSelect: 'none' }}>
                  Field Mentah Lainnya
                </summary>
                <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                   {getDetailEntries(sarmokRowDetailModal).map(([key, value]) => (
                    <div key={key} style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{formatDetailKey(key)}</div>
                      <div style={{ 
                        marginTop: '0.15rem', 
                        fontSize: '0.72rem', 
                        color: 'var(--text-secondary)', 
                        background: 'rgba(0,0,0,0.1)',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '4px',
                        wordBreak: 'break-word'
                      }}>{formatDetailValue(value)}</div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
            
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)', textAlign: 'right' }}>
              <button className="btn btn-primary" onClick={() => setSarmokRowDetailModal(null)} style={{ padding: '0.6rem 1.5rem', borderRadius: '12px' }}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {showPiketGreeting && todayPiket && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowPiketGreeting(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(2,6,23,0.78)',
            backdropFilter: 'blur(14px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
        >
          <div
            className="glass-panel piket-greeting-modal"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(460px, 100%)',
              padding: '0',
              overflow: 'hidden',
              border: `1px solid ${todayPiket.color}55`,
              boxShadow: `0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px ${todayPiket.color}33 inset`,
            }}
          >
            <div style={{
              padding: '1.5rem 1.5rem 1rem',
              background: `linear-gradient(135deg, ${todayPiket.color}33, transparent)`,
              borderBottom: `1px solid ${todayPiket.color}33`,
              display: 'flex',
              gap: '1rem',
              alignItems: 'center'
            }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: `${todayPiket.color}26`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${todayPiket.color}`,
                flexShrink: 0
              }}>
                <ShieldCheck size={26} color={todayPiket.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: todayPiket.color, marginBottom: '0.2rem' }}>
                  PIKET HARI INI &middot; {todayPiket.day.toUpperCase()}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  Selamat bertugas, {currentUser.nama.split(' ')[0]}!
                </div>
              </div>
              <button
                onClick={() => setShowPiketGreeting(false)}
                aria-label="Tutup"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                {piketDutyQuote}
              </p>

              <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                  Tim piket {todayPiket.day}
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {todayPiket.personnel.map((p) => {
                    const u = USERS.find(x => x.nama.includes(p));
                    const isMe = currentUser.nama.toLowerCase().includes(p.toLowerCase());
                    return (
                      <div key={p} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '4px 10px 4px 4px',
                        borderRadius: '999px',
                        background: isMe ? `${todayPiket.color}26` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isMe ? todayPiket.color : 'var(--border-subtle)'}`,
                        fontSize: '0.78rem',
                        fontWeight: isMe ? 700 : 500,
                        color: isMe ? todayPiket.color : 'var(--text-secondary)'
                      }}>
                        <UserAvatar
                          name={u?.nama || p}
                          email={u?.email}
                          photoUrl={u?.fotoProfil}
                          profileThumbByEmail={profileThumbByEmail}
                          size={22}
                        />
                        {p}{isMe ? ' (kamu)' : ''}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ padding: '0 1.5rem 1.25rem', display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowPiketGreeting(false)}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Nanti saja
              </button>
              <Link
                to="/duty-notes"
                onClick={() => setShowPiketGreeting(false)}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '10px',
                  background: todayPiket.color,
                  color: 'white',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: `0 6px 18px ${todayPiket.color}55`
                }}
              >
                <Edit3 size={14} /> Buka Catatan Piket
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
