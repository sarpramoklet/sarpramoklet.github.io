import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Edit3,
  Image as ImageIcon,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { getCurrentUser, ROLES } from '../data/organization';
import {
  clearRuntimeGeminiApiKey,
  getGeminiApiKeySource,
  getRuntimeGeminiApiKey,
  requireGeminiApiKey,
  setRuntimeGeminiApiKey,
} from '../utils/env';
import { generateGeminiJsonFromImage } from '../utils/gemini';
import {
  buildClassroomEntryId,
  buildFullDayEntries,
  buildMonitorIssueSummary,
  CLASSROOM_LOCATION_OPTIONS,
  CLASSROOM_MONITOR_SHEET,
  compareClassroomRooms,
  getClassroomDayLabel,
  getShortClassroomLabel,
  normalizeClassroomDate,
  normalizeClassroomMonitorRows,
  normalizeClassroomRoom,
  toMonitorFlag,
} from '../utils/classroomMonitor';
import type { ClassroomMonitorEntry, ClassroomMonitorSeedPartial } from '../utils/classroomMonitor';

const API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";

type ClassroomMonitorForm = {
  tanggal: string;
  ruang: string;
  lampu: boolean;
  tv: boolean;
  ac: boolean;
  kipas: boolean;
  lainnya: boolean;
  sampah: boolean;
  kotoran: boolean;
  rapih: boolean;
  keterangan: string;
};

type ImageImportDraft = {
  tanggal: string;
  rows: ClassroomMonitorEntry[];
  issueRows: ClassroomMonitorEntry[];
};

const createEmptyForm = (): ClassroomMonitorForm => ({
  tanggal: new Date().toISOString().slice(0, 10),
  ruang: CLASSROOM_LOCATION_OPTIONS[0],
  lampu: false,
  tv: false,
  ac: false,
  kipas: false,
  lainnya: false,
  sampah: false,
  kotoran: false,
  rapih: false,
  keterangan: '',
});

const formatMonitorDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value || '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
};

const formatMonitorDateTime = (value?: string) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const getLatestDate = (items: ClassroomMonitorEntry[]) => {
  return items
    .map((item) => item.tanggal)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || '';
};

const normalizeImportDate = (value: unknown) => {
  const raw = String(value || '').trim();
  if (!raw) return new Date().toISOString().slice(0, 10);

  const dmy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/);
  if (dmy) {
    const dd = String(parseInt(dmy[1], 10) || 1).padStart(2, '0');
    const mm = String(parseInt(dmy[2], 10) || 1).padStart(2, '0');
    const yyyyRaw = parseInt(dmy[3], 10) || 0;
    const yyyy = yyyyRaw < 100 ? 2000 + yyyyRaw : yyyyRaw;
    return `${yyyy}-${mm}-${dd}`;
  }

  const sanitized = raw.replace(/^[A-Za-z]+,\s*/g, '');
  const monthMap: Record<string, number> = {
    jan: 1, januari: 1,
    feb: 2, februari: 2,
    mar: 3, maret: 3,
    apr: 4, april: 4,
    mei: 5,
    jun: 6, juni: 6,
    jul: 7, juli: 7,
    agt: 8, agu: 8, agustus: 8, august: 8,
    sep: 9, september: 9,
    okt: 10, oktober: 10,
    nov: 11, november: 11,
    des: 12, desember: 12,
  };
  const parts = sanitized.split(/\s+/);
  if (parts.length >= 3) {
    const dd = String(parseInt(parts[0], 10) || 1).padStart(2, '0');
    const mm = monthMap[parts[1].toLowerCase()];
    const yyyyRaw = parseInt(parts[2], 10) || 0;
    if (mm) {
      const yyyy = yyyyRaw < 100 ? 2000 + yyyyRaw : yyyyRaw;
      return `${yyyy}-${String(mm).padStart(2, '0')}-${dd}`;
    }
  }

  return normalizeClassroomDate(raw);
};

const compressImage = (dataUrl: string): Promise<string> =>
  new Promise((resolve) => {
    const img = document.createElement('img');
    img.onload = () => {
      const MAX = 1200;
      let width = img.width;
      let height = img.height;
      if (width > MAX) {
        height = Math.round((height * MAX) / width);
        width = MAX;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.src = dataUrl;
  });

const normalizeImageImportResponse = (raw: any): { tanggal: string; partials: ClassroomMonitorSeedPartial[] } => {
  const tanggal = normalizeImportDate(raw?.tanggal || raw?.date);
  const items = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw?.temuan) ? raw.temuan : [];

  const partials = items
    .map((item: any) => {
      const ruang = normalizeClassroomRoom(item?.ruang || item?.kelas || item?.room || '');
      if (!ruang) return null;

      const normalized: ClassroomMonitorSeedPartial = {
        ruang,
        lampu: toMonitorFlag(item?.lampu || item?.Lampu),
        tv: toMonitorFlag(item?.tv || item?.TV),
        ac: toMonitorFlag(item?.ac || item?.AC),
        kipas: toMonitorFlag(item?.kipas || item?.Kipas),
        lainnya: toMonitorFlag(item?.lainnya || item?.Lainnya),
        sampah: toMonitorFlag(item?.sampah || item?.Sampah),
        kotoran: toMonitorFlag(item?.kotoran || item?.Kotoran),
        rapih: toMonitorFlag(item?.rapih || item?.Rapih),
        keterangan: String(item?.keterangan || item?.Keterangan || '').trim(),
      };

      const hasIssue = Boolean(
        normalized.lampu ||
        normalized.tv ||
        normalized.ac ||
        normalized.kipas ||
        normalized.lainnya ||
        normalized.sampah ||
        normalized.kotoran ||
        normalized.rapih ||
        normalized.keterangan
      );

      return hasIssue ? normalized : null;
    })
    .filter((item: ClassroomMonitorSeedPartial | null): item is ClassroomMonitorSeedPartial => Boolean(item))
    .sort((left: ClassroomMonitorSeedPartial, right: ClassroomMonitorSeedPartial) => compareClassroomRooms(left.ruang, right.ruang));

  return { tanggal, partials };
};

const analyzeClassroomFormImage = async (base64: string, mimeType: string) => {
  const prompt = `You are reading an Indonesian classroom-monitoring form image titled:
"LAPORAN PANTAUAN KEBERSIHAN DAN KERAPIHAN RUANG KELAS".

The sheet layout contains:
- Header with date such as "Selasa, 07 April 2026" or "Rabu, 08 April 2026"
- Rows for locations: Ruang 1 to Ruang 40, Lab 1 to Lab 7, R. Studio, Aula, UKS
- Columns for findings:
  lampu, tv, ac, kipas, lainnya, sampah, kotoran, rapih
- Red cells with "1" indicate the finding is present
- Keterangan column may contain notes even when total is 0

Your task:
1. Extract the form date.
2. Extract ONLY rows that have at least one marked finding OR non-empty keterangan.
3. Return strict JSON only, with no markdown and no extra explanation.

Output schema:
{
  "tanggal": "YYYY-MM-DD",
  "items": [
    {
      "ruang": "Ruang 4",
      "lampu": 0,
      "tv": 0,
      "ac": 0,
      "kipas": 0,
      "lainnya": 0,
      "sampah": 1,
      "kotoran": 0,
      "rapih": 0,
      "keterangan": ""
    }
  ]
}

Rules:
- Keep room names exactly in the normalized style: "Ruang 1", "Lab 4", "R. Studio", "Aula", "UKS"
- Use 0 or 1 for finding columns
- If a note exists, copy it as plain text
- If you are unsure, prefer leaving a column as 0 rather than inventing a mark
- Return only JSON`;

  const json = await generateGeminiJsonFromImage({
    apiKey: requireGeminiApiKey(),
    prompt,
    base64,
    mimeType,
  });
  return normalizeImageImportResponse(json);
};

const getReadableClassroomAiError = (message: string) => {
  if (/reported as leaked|api key was reported as leaked/i.test(message)) {
    return 'API key Gemini ditolak karena terdeteksi bocor. Tempel key lain di popup, key hanya disimpan untuk sesi browser ini.';
  }

  if (/api key not valid|permission denied|forbidden|403/i.test(message)) {
    return 'API key Gemini tidak valid atau tidak diizinkan. Tempel key yang aktif di popup lalu coba baca form lagi.';
  }

  if (/belum diatur/i.test(message)) {
    return 'Masukkan Gemini API key di popup terlebih dulu. Key hanya dipakai saat proses baca gambar dan disimpan untuk sesi browser ini.';
  }

  return `Gagal membaca gambar form. ${message}`;
};

const ClassroomMonitor = () => {
  const currentUser = getCurrentUser();
  const canManage = [
    ROLES.PIMPINAN,
    ROLES.KOORDINATOR_SARPRAS,
    ROLES.PIC_ADMIN,
  ].includes(currentUser.roleAplikasi) || currentUser.unit === 'Sarpras' || currentUser.unit === 'Semua Unit';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ClassroomMonitorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ClassroomMonitorEntry | null>(null);
  const [form, setForm] = useState<ClassroomMonitorForm>(createEmptyForm());
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importImage, setImportImage] = useState<string | null>(null);
  const [importMime, setImportMime] = useState('image/jpeg');
  const [importLoading, setImportLoading] = useState(false);
  const [savingImport, setSavingImport] = useState(false);
  const [importError, setImportError] = useState('');
  const [importDraft, setImportDraft] = useState<ImageImportDraft | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isGeminiKeyModalOpen, setIsGeminiKeyModalOpen] = useState(false);
  const [geminiKeyDraft, setGeminiKeyDraft] = useState('');
  const [geminiKeySaved, setGeminiKeySaved] = useState(getGeminiApiKeySource() === 'browser');

  useEffect(() => {
    fetchRows();
  }, []);

  useEffect(() => {
    if (!isImportModalOpen) return;
    setGeminiKeyDraft(getRuntimeGeminiApiKey());
    setGeminiKeySaved(getGeminiApiKeySource() === 'browser');
  }, [isImportModalOpen]);

  const buildPayloadForEntry = (entry: ClassroomMonitorEntry) => ({
    action: 'FINANCE_RECORD',
    sheetName: CLASSROOM_MONITOR_SHEET,
    sheet: CLASSROOM_MONITOR_SHEET,
    id: entry.id,
    ID: entry.id,
    tanggal: entry.tanggal,
    Tanggal: entry.tanggal,
    hari: entry.hari,
    Hari: entry.hari,
    ruang: entry.ruang,
    Ruang: entry.ruang,
    kelas: entry.ruang,
    Kelas: entry.ruang,
    lampu: entry.lampu,
    Lampu: entry.lampu,
    tv: entry.tv,
    TV: entry.tv,
    ac: entry.ac,
    AC: entry.ac,
    kipas: entry.kipas,
    Kipas: entry.kipas,
    lainnya: entry.lainnya,
    Lainnya: entry.lainnya,
    sampah: entry.sampah,
    Sampah: entry.sampah,
    kotoran: entry.kotoran,
    Kotoran: entry.kotoran,
    rapih: entry.rapih,
    Rapih: entry.rapih,
    total: entry.total,
    Total: entry.total,
    jumlah_hasil_pantauan: entry.total,
    'Jumlah Hasil Pantauan': entry.total,
    keterangan: entry.keterangan,
    Keterangan: entry.keterangan,
    updatedBy: entry.updatedBy || '',
    UpdatedBy: entry.updatedBy || '',
    updatedAt: entry.updatedAt || '',
    UpdatedAt: entry.updatedAt || '',
  });

  const fetchRows = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?sheetName=${CLASSROOM_MONITOR_SHEET}`);
      const data = await response.json();
      const normalized = Array.isArray(data) ? normalizeClassroomMonitorRows(data) : [];
      setRows(normalized);
      setSelectedDate(getLatestDate(normalized));
    } catch (error) {
      console.error('Error fetching classroom monitor data:', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const upsertRowsLocally = (incoming: ClassroomMonitorEntry[]) => {
    setRows((prev) => {
      const map = new Map(prev.map((item) => [item.id, item]));
      incoming.forEach((item) => map.set(item.id, item));
      return Array.from(map.values()).sort((left, right) => {
        const dateDiff = new Date(right.tanggal).getTime() - new Date(left.tanggal).getTime();
        if (dateDiff !== 0) return dateDiff;
        return compareClassroomRooms(left.ruang, right.ruang);
      });
    });
  };

  const persistEntries = async (entries: ClassroomMonitorEntry[]) => {
    for (const entry of entries) {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(buildPayloadForEntry(entry)),
      });
    }
  };

  const handleOpenCreate = () => {
    setEditingRow(null);
    setForm(createEmptyForm());
    setIsModalOpen(true);
  };

  const handleOpenEdit = (row: ClassroomMonitorEntry) => {
    setEditingRow(row);
    setForm({
      tanggal: row.tanggal || new Date().toISOString().slice(0, 10),
      ruang: row.ruang,
      lampu: row.lampu === 1,
      tv: row.tv === 1,
      ac: row.ac === 1,
      kipas: row.kipas === 1,
      lainnya: row.lainnya === 1,
      sampah: row.sampah === 1,
      kotoran: row.kotoran === 1,
      rapih: row.rapih === 1,
      keterangan: row.keterangan || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingRow(null);
    setForm(createEmptyForm());
    setIsModalOpen(false);
  };

  const resetImportState = () => {
    setImportImage(null);
    setImportMime('image/jpeg');
    setImportLoading(false);
    setSavingImport(false);
    setImportError('');
    setImportDraft(null);
    setDragOver(false);
  };

  const closeImportModal = () => {
    setIsImportModalOpen(false);
    setIsGeminiKeyModalOpen(false);
    resetImportState();
  };

  const handleToggle = (field: keyof ClassroomMonitorForm) => {
    if (typeof form[field] !== 'boolean') return;
    setForm((prev) => ({ ...prev, [field]: !(prev[field] as boolean) }));
  };

  const handleDelete = async (row: ClassroomMonitorEntry) => {
    if (!confirm(`Hapus data pantauan ${row.ruang} tanggal ${formatMonitorDate(row.tanggal)}?`)) return;

    setLoading(true);
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'DELETE_RECORD',
          sheetName: CLASSROOM_MONITOR_SHEET,
          sheet: CLASSROOM_MONITOR_SHEET,
          id: row.id,
          ID: row.id,
        }),
      });

      setRows((prev) => prev.filter((item) => item.id !== row.id));
      setTimeout(fetchRows, 2500);
    } catch (error) {
      console.error('Delete classroom monitor failed:', error);
      alert('Gagal menghapus data pantauan kelas.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payloadEntry: ClassroomMonitorEntry = {
      id: editingRow?.id || buildClassroomEntryId(form.tanggal, form.ruang),
      tanggal: form.tanggal,
      hari: getClassroomDayLabel(form.tanggal),
      ruang: normalizeClassroomRoom(form.ruang),
      lampu: form.lampu ? 1 : 0,
      tv: form.tv ? 1 : 0,
      ac: form.ac ? 1 : 0,
      kipas: form.kipas ? 1 : 0,
      lainnya: form.lainnya ? 1 : 0,
      sampah: form.sampah ? 1 : 0,
      kotoran: form.kotoran ? 1 : 0,
      rapih: form.rapih ? 1 : 0,
      total: 0,
      keterangan: form.keterangan.trim(),
      updatedBy: currentUser.nama,
      updatedAt: new Date().toISOString(),
    };

    payloadEntry.total =
      payloadEntry.lampu +
      payloadEntry.tv +
      payloadEntry.ac +
      payloadEntry.kipas +
      payloadEntry.lainnya +
      payloadEntry.sampah +
      payloadEntry.kotoran +
      payloadEntry.rapih;

    if (!payloadEntry.keterangan) {
      payloadEntry.keterangan =
        payloadEntry.total > 0 ? buildMonitorIssueSummary(payloadEntry) : 'Aman, tidak ada temuan.';
    }

    setIsSubmitting(true);
    try {
      await persistEntries([payloadEntry]);
      upsertRowsLocally([payloadEntry]);
      setSelectedDate(payloadEntry.tanggal);
      closeModal();
      setTimeout(fetchRows, 2500);
    } catch (error) {
      console.error('Submit classroom monitor failed:', error);
      alert('Gagal menyimpan monitor pantauan kelas ke database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setImportError('File harus berupa gambar.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const original = String(event.target?.result || '');
      const compressed = await compressImage(original);
      setImportImage(compressed);
      setImportMime(file.type || 'image/jpeg');
      setImportError('');
      setImportDraft(null);
    };
    reader.readAsDataURL(file);
  };

  const runAnalyzeImage = async () => {
    if (!importImage) return;
    setImportLoading(true);
    setImportError('');

    try {
      const base64 = importImage.split(',')[1] || '';
      const parsed = await analyzeClassroomFormImage(base64, importMime);
      const rowsForDate = buildFullDayEntries(parsed.tanggal, parsed.partials, `${currentUser.nama} (AI Import)`, new Date().toISOString())
        .map((entry) => ({ ...entry, id: buildClassroomEntryId(entry.tanggal, entry.ruang) }));
      setImportDraft({
        tanggal: parsed.tanggal,
        rows: rowsForDate,
        issueRows: rowsForDate.filter((entry) => entry.total > 0 || entry.keterangan !== 'Aman, tidak ada temuan.'),
      });
    } catch (error: any) {
      console.error('Analyze classroom form failed:', error);
      setImportError(getReadableClassroomAiError(error?.message || 'Unknown error.'));
    } finally {
      setImportLoading(false);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!importImage) return;
    if (!getRuntimeGeminiApiKey()) {
      setGeminiKeyDraft(getRuntimeGeminiApiKey());
      setGeminiKeySaved(getGeminiApiKeySource() === 'browser');
      setIsGeminiKeyModalOpen(true);
      setImportError('Masukkan Gemini API key di popup terlebih dulu. Key hanya disimpan untuk sesi browser aktif.');
      return;
    }

    await runAnalyzeImage();
  };

  const handleSaveGeminiKeyAndAnalyze = async () => {
    const trimmed = geminiKeyDraft.trim();
    if (!trimmed) {
      setImportError('Gemini API key belum diisi.');
      return;
    }

    setRuntimeGeminiApiKey(trimmed);
    setGeminiKeySaved(true);
    setIsGeminiKeyModalOpen(false);
    setImportError('');
    await runAnalyzeImage();
  };

  const handleSaveImportDraft = async () => {
    if (!importDraft) return;
    setSavingImport(true);
    try {
      await persistEntries(importDraft.rows);
      upsertRowsLocally(importDraft.rows);
      setSelectedDate(importDraft.tanggal);
      closeImportModal();
      alert(`Hasil baca form tanggal ${formatMonitorDate(importDraft.tanggal)} berhasil disimpan ke database.`);
      setTimeout(fetchRows, 2500);
    } catch (error) {
      console.error('Save import draft failed:', error);
      alert('Gagal menyimpan hasil baca gambar ke database.');
    } finally {
      setSavingImport(false);
    }
  };

  const availableDates = Array.from(new Set(rows.map((row) => row.tanggal).filter(Boolean))).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const matchesSearchFilter = (row: ClassroomMonitorEntry) => {
    return !normalizedSearch
      || row.ruang.toLowerCase().includes(normalizedSearch)
      || row.keterangan.toLowerCase().includes(normalizedSearch)
      || (row.updatedBy || '').toLowerCase().includes(normalizedSearch);
  };

  const filteredRows = rows.filter((row) => {
    const matchesDate = selectedDate ? row.tanggal === selectedDate : true;
    return matchesDate && matchesSearchFilter(row);
  });

  const recapDate = selectedDate || availableDates[0] || '';
  const dailyRecapRows = rows
    .filter((row) => row.tanggal === recapDate && matchesSearchFilter(row))
    .sort((left, right) => compareClassroomRooms(left.ruang, right.ruang));
  const dailyRecapWithIssues = dailyRecapRows.filter((row) => row.total > 0);
  const dailyRecapSafe = dailyRecapRows.filter((row) => row.total === 0);
  const EVALUATION_CUTOFF_DAYS = 6;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoffDate = new Date(today);
  cutoffDate.setDate(cutoffDate.getDate() - (EVALUATION_CUTOFF_DAYS - 1)); // hari ini - 5 = 6 hari inklusif
  const cutoffDates = availableDates.filter((d) => new Date(d) >= cutoffDate);
  const evaluationRows = rows.filter(
    (row) => matchesSearchFilter(row) && cutoffDates.includes(row.tanggal)
  );
  const evaluationRoomSummaries = CLASSROOM_LOCATION_OPTIONS
    .map((ruang) => {
      const roomRows = evaluationRows
        .filter((row) => row.ruang === ruang)
        .sort((left, right) => new Date(right.tanggal).getTime() - new Date(left.tanggal).getTime());

      if (roomRows.length === 0) return null;

      const issueRows = roomRows.filter((row) => row.total > 0);
      const totalFindings = roomRows.reduce((sum, row) => sum + row.total, 0);
      const energyTotal = roomRows.reduce((sum, row) => sum + row.lampu + row.tv + row.ac + row.kipas + row.lainnya, 0);
      const cleanTotal = roomRows.reduce((sum, row) => sum + row.sampah + row.kotoran, 0);
      const tidinessTotal = roomRows.reduce((sum, row) => sum + row.rapih, 0);
      const latestIssue = issueRows[0];
      const dominantConcern = [
        { label: 'Energi', value: energyTotal, color: 'var(--accent-amber)' },
        { label: 'Kebersihan', value: cleanTotal, color: 'var(--accent-rose)' },
        { label: 'Kerapihan', value: tidinessTotal, color: 'var(--accent-blue)' },
      ].sort((left, right) => right.value - left.value)[0];

      let attentionLabel = 'Aman';
      if (totalFindings >= 5 || issueRows.length >= 3) attentionLabel = 'Perhatian penuh';
      else if (totalFindings >= 3 || issueRows.length >= 2) attentionLabel = 'Prioritas';
      else if (issueRows.length >= 1) attentionLabel = 'Pantau';

      return {
        ruang,
        label: getShortClassroomLabel(ruang),
        observations: roomRows.length,
        issueDays: issueRows.length,
        totalFindings,
        energyTotal,
        cleanTotal,
        tidinessTotal,
        latestIssueDate: latestIssue?.tanggal || '',
        latestIssueNote: latestIssue?.keterangan || 'Belum ada catatan temuan.',
        dominantConcern,
        attentionLabel,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => {
      return (
        right.totalFindings - left.totalFindings ||
        right.issueDays - left.issueDays ||
        new Date(right.latestIssueDate || 0).getTime() - new Date(left.latestIssueDate || 0).getTime() ||
        compareClassroomRooms(left.ruang, right.ruang)
      );
    });
  const priorityRoomSummaries = evaluationRoomSummaries.filter((room) => room.totalFindings > 0);
  const topPriorityRoom = priorityRoomSummaries[0] || null;
  const fullAttentionCount = priorityRoomSummaries.filter((room) => room.attentionLabel === 'Perhatian penuh').length;

  const totalRows = filteredRows.length;
  const totalWithIssues = filteredRows.filter((row) => row.total > 0).length;
  const totalEnergy = filteredRows.reduce((sum, row) => sum + row.lampu + row.tv + row.ac + row.kipas + row.lainnya, 0);
  const totalClean = filteredRows.reduce((sum, row) => sum + row.sampah + row.kotoran + row.rapih, 0);

  if (loading && rows.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 size={32} className="animate-spin" color="var(--accent-cyan)" />
        <p style={{ color: 'var(--text-secondary)' }}>Membaca monitor pantauan kelas dari cloud DB...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex-row-responsive" style={{ marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <h1 className="page-title gradient-text">Monitor Pantauan Kelas</h1>
          <p className="page-subtitle" style={{ margin: 0, maxWidth: '920px' }}>
            Rekap harian kondisi ruang belajar, laboratorium, dan area pendukung untuk kebersihan, kerapihan, dan penghematan energi di sheet `{CLASSROOM_MONITOR_SHEET}`.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={fetchRows} className="btn btn-outline">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Sync Live
          </button>
          {canManage && (
            <>
              <button onClick={() => setIsImportModalOpen(true)} className="btn btn-outline">
                <Upload size={16} /> Import Gambar Form
              </button>
              <button onClick={handleOpenCreate} className="btn btn-primary">
                <Plus size={16} /> Tambah Pantauan
              </button>
            </>
          )}
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="glass-panel stat-card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-blue)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Snapshot tanggal</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '0.3rem' }}>
            {selectedDate ? formatMonitorDate(selectedDate) : 'Semua data'}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {selectedDate ? getClassroomDayLabel(selectedDate) : 'Filter semua tanggal aktif'}
          </div>
        </div>

        <div className="glass-panel stat-card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-emerald)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lokasi aman</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.3rem' }}>
            {totalRows - totalWithIssues}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Dari {totalRows} lokasi yang tampil pada filter aktif.
          </div>
        </div>

        <div className="glass-panel stat-card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-amber)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Temuan energi</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.3rem' }}>
            {totalEnergy}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Lampu, TV, AC, kipas, atau perangkat lain yang belum dimatikan.
          </div>
        </div>

        <div className="glass-panel stat-card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-rose)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Temuan kebersihan</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-rose)', marginTop: '0.3rem' }}>
            {totalClean}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Termasuk sampah, lantai kotor, dan kerapihan ruang kelas.
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div className="flex-row-responsive" style={{ gap: '1rem' }}>
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari ruang, catatan, atau petugas..."
              className="input-responsive"
              style={{ width: '100%', paddingLeft: '2.75rem' }}
            />
          </div>

          <div style={{ minWidth: '220px' }}>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-responsive"
              style={{ width: '100%' }}
            >
              {availableDates.length === 0 && <option value="">Belum ada data</option>}
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {formatMonitorDate(date)} - {getClassroomDayLabel(date)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Rekap Harian per Kelas / Ruang</h3>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Snapshot cepat kondisi tiap lokasi pada {recapDate ? `${formatMonitorDate(recapDate)} (${getClassroomDayLabel(recapDate)})` : 'tanggal aktif'}.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span className="badge badge-success">{dailyRecapSafe.length} aman</span>
            <span className="badge badge-danger">{dailyRecapWithIssues.length} perlu tindak lanjut</span>
          </div>
        </div>

        {dailyRecapRows.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', padding: '0.4rem 0 0.2rem 0' }}>
            Belum ada rekap harian untuk tanggal atau kata kunci yang dipilih.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
            {dailyRecapRows.map((row) => {
              const energyCount = row.lampu + row.tv + row.ac + row.kipas + row.lainnya;
              const cleanCount = row.sampah + row.kotoran;
              const tidinessCount = row.rapih;
              const isSafe = row.total === 0;

              return (
                <div
                  key={`recap-${row.id}`}
                  className="glass-panel"
                  style={{
                    padding: '0.9rem',
                    background: isSafe ? 'rgba(16,185,129,0.05)' : 'rgba(244,63,94,0.05)',
                    border: `1px solid ${isSafe ? 'rgba(16,185,129,0.18)' : 'rgba(244,63,94,0.18)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>{getShortClassroomLabel(row.ruang)}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{row.ruang}</div>
                    </div>
                    <span className={`badge ${isSafe ? 'badge-success' : 'badge-danger'}`}>{isSafe ? 'Aman' : `${row.total} temuan`}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.45rem', marginTop: '0.8rem' }}>
                    <div style={{ padding: '0.5rem 0.45rem', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Energi</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.1rem' }}>{energyCount}</div>
                    </div>
                    <div style={{ padding: '0.5rem 0.45rem', borderRadius: '10px', background: 'rgba(244,63,94,0.08)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bersih</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-rose)', marginTop: '0.1rem' }}>{cleanCount}</div>
                    </div>
                    <div style={{ padding: '0.5rem 0.45rem', borderRadius: '10px', background: 'rgba(59,130,246,0.08)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rapih</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '0.1rem' }}>{tidinessCount}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: '0.75rem', fontSize: '0.74rem', color: isSafe ? 'var(--text-secondary)' : 'var(--text-primary)', lineHeight: 1.5 }}>
                    {row.keterangan}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Monitor Evaluasi Lokasi Prioritas</h3>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Akumulasi <strong>{EVALUATION_CUTOFF_DAYS} hari terakhir</strong> per ruang untuk menandai kelas/lokasi yang paling perlu perhatian penuh.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span className="badge badge-info">{cutoffDates.length}/{availableDates.length} hari (cutoff {EVALUATION_CUTOFF_DAYS})</span>
            <span className="badge badge-danger">{priorityRoomSummaries.length} lokasi bertemuan</span>
            <span className="badge badge-warning">{fullAttentionCount} perhatian penuh</span>
          </div>
        </div>

        <div className="stats-grid" style={{ marginBottom: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div className="glass-panel stat-card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-blue)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rentang evaluasi</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '0.3rem' }}>
              {cutoffDates.length} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>/ {availableDates.length} hari</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Cutoff {EVALUATION_CUTOFF_DAYS} hari terakhir · {evaluationRows.length} baris data
            </div>
          </div>

          <div className="glass-panel stat-card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-rose)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ruang teratas</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-rose)', marginTop: '0.3rem' }}>
              {topPriorityRoom ? topPriorityRoom.label : '-'}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {topPriorityRoom ? `${topPriorityRoom.totalFindings} temuan dalam ${topPriorityRoom.issueDays} hari pantauan.` : 'Belum ada ruang prioritas.'}
            </div>
          </div>

          <div className="glass-panel stat-card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-amber)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fokus tindak lanjut</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.3rem' }}>
              {topPriorityRoom?.dominantConcern?.label || '-'}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {topPriorityRoom ? `Dominan di ${topPriorityRoom.label}.` : 'Belum ada kategori dominan.'}
            </div>
          </div>
        </div>

        {priorityRoomSummaries.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', padding: '0.4rem 0 0.2rem 0' }}>
            Belum ada temuan lintas tanggal untuk kata kunci yang dipilih.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
            {priorityRoomSummaries.slice(0, 12).map((room, index) => (
              <div
                key={`priority-${room.ruang}`}
                className="glass-panel"
                style={{
                  padding: '0.95rem',
                  background: room.attentionLabel === 'Perhatian penuh' ? 'rgba(244,63,94,0.07)' : 'rgba(245,158,11,0.06)',
                  border: `1px solid ${room.attentionLabel === 'Perhatian penuh' ? 'rgba(244,63,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Peringkat #{index + 1}</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{room.label}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{room.ruang}</div>
                  </div>
                  <span className={`badge ${room.attentionLabel === 'Perhatian penuh' ? 'badge-danger' : room.attentionLabel === 'Prioritas' ? 'badge-warning' : 'badge-info'}`}>
                    {room.attentionLabel}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.45rem', marginTop: '0.8rem' }}>
                  <div style={{ padding: '0.55rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Hari temuan</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.1rem' }}>{room.issueDays}/{room.observations}</div>
                  </div>
                  <div style={{ padding: '0.55rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total temuan</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-rose)', marginTop: '0.1rem' }}>{room.totalFindings}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                  <span className="badge badge-warning">Energi {room.energyTotal}</span>
                  <span className="badge badge-danger">Bersih {room.cleanTotal}</span>
                  <span className="badge badge-info">Rapih {room.tidinessTotal}</span>
                </div>

                <div style={{ marginTop: '0.7rem', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Fokus utama:
                  <span style={{ color: room.dominantConcern.color, fontWeight: 700 }}> {room.dominantConcern.label}</span>
                  {room.latestIssueDate ? ` | Temuan terakhir ${formatMonitorDate(room.latestIssueDate)}` : ''}
                </div>
                <div style={{ marginTop: '0.35rem', fontSize: '0.74rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {room.latestIssueNote}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Detail Temuan per Lokasi</h3>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Data ini dipakai dashboard untuk rekap informasi ke wali kelas, guru, dan tim sarpras.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            <Info size={14} />
            {filteredRows.length} baris tampil
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Lokasi</th>
                <th>Energi</th>
                <th>Kebersihan</th>
                <th>Kerapihan</th>
                <th>Total</th>
                <th>Keterangan</th>
                <th>Petugas</th>
                {canManage && <th>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 9 : 8} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                    Belum ada data pantauan kelas pada filter ini.
                  </td>
                </tr>
              ) : filteredRows.map((row) => {
                const energyCount = row.lampu + row.tv + row.ac + row.kipas + row.lainnya;
                const cleanCount = row.sampah + row.kotoran;
                const tidinessCount = row.rapih;

                return (
                  <tr key={row.id} className="ticket-row">
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{formatMonitorDate(row.tanggal)}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{row.hari || getClassroomDayLabel(row.tanggal)}</div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.ruang}</td>
                    <td>
                      <span className={`badge ${energyCount > 0 ? 'badge-warning' : 'badge-success'}`}>{energyCount}</span>
                    </td>
                    <td>
                      <span className={`badge ${cleanCount > 0 ? 'badge-danger' : 'badge-success'}`}>{cleanCount}</span>
                    </td>
                    <td>
                      <span className={`badge ${tidinessCount > 0 ? 'badge-warning' : 'badge-success'}`}>{tidinessCount}</span>
                    </td>
                    <td>
                      <span className={`badge ${row.total > 0 ? 'badge-danger' : 'badge-success'}`}>{row.total}</span>
                    </td>
                    <td style={{ maxWidth: '340px' }}>
                      <div style={{ fontSize: '0.83rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>{row.keterangan}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{row.updatedBy || '-'}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{formatMonitorDateTime(row.updatedAt)}</div>
                    </td>
                    {canManage && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            onClick={() => handleOpenEdit(row)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', padding: '2px' }}
                            title="Edit data"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', padding: '2px' }}
                            title="Hapus data"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginTop: '1.5rem', borderLeft: '4px solid var(--accent-cyan)', background: 'linear-gradient(90deg, rgba(6,182,212,0.08), transparent)' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <AlertTriangle size={18} color="var(--accent-cyan)" style={{ marginTop: '0.1rem' }} />
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>Format sheet yang dipakai</div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.55 }}>
              Halaman ini membaca dan menulis ke sheet `{CLASSROOM_MONITOR_SHEET}` dengan field utama: `tanggal`, `hari`, `ruang`, `lampu`, `tv`, `ac`, `kipas`, `lainnya`, `sampah`, `kotoran`, `rapih`, `total`, `keterangan`, `updatedBy`, `updatedAt`.
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '760px', maxHeight: '90vh', overflowY: 'auto', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--text-primary)' }}>
                  {editingRow ? 'Edit Pantauan Kelas' : 'Tambah Pantauan Kelas'}
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  Simpan satu lokasi ke DB. Untuk satu form penuh, gunakan fitur import gambar.
                </p>
              </div>
              <button onClick={closeModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tanggal pantauan</span>
                  <input
                    type="date"
                    value={form.tanggal}
                    onChange={(e) => setForm((prev) => ({ ...prev, tanggal: e.target.value }))}
                    className="input-responsive"
                    required
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Lokasi</span>
                  <select
                    value={form.ruang}
                    onChange={(e) => setForm((prev) => ({ ...prev, ruang: e.target.value }))}
                    className="input-responsive"
                  >
                    {CLASSROOM_LOCATION_OPTIONS.map((room) => (
                      <option key={room} value={room}>{room}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(245,158,11,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Zap size={16} color="var(--accent-amber)" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Awareness Hemat Energi</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                    {[
                      { key: 'lampu', label: 'Lampu menyala' },
                      { key: 'tv', label: 'TV aktif' },
                      { key: 'ac', label: 'AC menyala' },
                      { key: 'kipas', label: 'Kipas menyala' },
                      { key: 'lainnya', label: 'Perangkat lain / jendela' },
                    ].map((item) => (
                      <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <input
                          type="checkbox"
                          checked={form[item.key as keyof ClassroomMonitorForm] as boolean}
                          onChange={() => handleToggle(item.key as keyof ClassroomMonitorForm)}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(244,63,94,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Calendar size={16} color="var(--accent-rose)" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Kebersihan & Kerapihan</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                    {[
                      { key: 'sampah', label: 'Ada sampah' },
                      { key: 'kotoran', label: 'Lantai/area kotor' },
                      { key: 'rapih', label: 'Kerapihan perlu dibenahi' },
                    ].map((item) => (
                      <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <input
                          type="checkbox"
                          checked={form[item.key as keyof ClassroomMonitorForm] as boolean}
                          onChange={() => handleToggle(item.key as keyof ClassroomMonitorForm)}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Keterangan / catatan tindak lanjut</span>
                <textarea
                  value={form.keterangan}
                  onChange={(e) => setForm((prev) => ({ ...prev, keterangan: e.target.value }))}
                  className="input-responsive"
                  rows={4}
                  placeholder="Contoh: Jendela terbuka, koordinasi wali kelas, atau ekskul sedang memakai ruang."
                  style={{ resize: 'vertical' }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {editingRow ? 'Simpan Perubahan' : 'Simpan ke DB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isImportModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1250, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem 1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '980px', maxHeight: '90vh', overflowY: 'auto', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--text-primary)' }}>Import Gambar Form Pantauan</h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  Upload scan/foto form, biarkan AI membaca tabelnya, lalu simpan hasil review ke database.
                </p>
              </div>
              <button onClick={closeImportModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: 0 }}>
              <div>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleImportFile(file);
                  }}
                  style={{
                    border: `2px dashed ${dragOver ? 'var(--accent-cyan)' : importImage ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`,
                    borderRadius: '16px',
                    padding: importImage ? '1rem' : '2rem 1rem',
                    textAlign: 'center',
                    background: importImage ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImportFile(file);
                    }}
                  />

                  {importImage ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', alignItems: 'center' }}>
                      <img src={importImage} alt="Preview form pantauan kelas" style={{ maxWidth: '100%', maxHeight: '420px', borderRadius: '10px', objectFit: 'contain' }} />
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button onClick={() => fileInputRef.current?.click()} className="btn btn-outline" type="button">
                          <ImageIcon size={16} /> Ganti Gambar
                        </button>
                        <button onClick={handleAnalyzeImage} className="btn btn-primary" type="button" disabled={importLoading}>
                          {importLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                          Baca Form dengan AI
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.9rem' }}>
                      <Upload size={34} color="var(--accent-cyan)" />
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                        Tarik gambar form ke sini atau pilih file
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: 1.55 }}>
                        Cocok untuk scan/screenshot form seperti contoh tanggal 07, 08, dan 09 April 2026.
                      </div>
                      <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary" type="button">
                        <Upload size={16} /> Pilih Gambar
                      </button>
                    </div>
                  )}
                </div>

                {importError && (
                  <div style={{ marginTop: '0.9rem', padding: '0.8rem 0.9rem', borderRadius: '12px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: 'var(--accent-rose)', fontSize: '0.76rem', lineHeight: 1.5 }}>
                    {importError}
                  </div>
                )}

                <div style={{ marginTop: '0.9rem', padding: '0.85rem 0.95rem', borderRadius: '12px', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-blue)' }}>API Key Gemini per sesi browser</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.55 }}>
                    Demi keamanan, key tidak ditaruh di kode. Saat mau baca form, tempel key di popup lalu sistem hanya menyimpannya untuk sesi browser aktif.
                  </div>
                  <div style={{ marginTop: '0.45rem', fontSize: '0.72rem', color: geminiKeySaved ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                    {geminiKeySaved ? 'Key sesi aktif. Anda bisa langsung baca form atau ganti key lewat tombol Kelola Key.' : 'Belum ada key sesi aktif. Tombol baca form akan membuka popup input key.'}
                  </div>
                  <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                    <button onClick={() => setIsGeminiKeyModalOpen(true)} className="btn btn-outline" type="button">
                      <Zap size={16} /> Kelola Key Gemini
                    </button>
                    {geminiKeySaved && (
                      <button
                        onClick={() => {
                          clearRuntimeGeminiApiKey();
                          setGeminiKeyDraft('');
                          setGeminiKeySaved(false);
                        }}
                        className="btn btn-outline"
                        type="button"
                      >
                        <X size={16} /> Hapus Key Sesi
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>Draft hasil baca</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.5 }}>
                  Setelah AI membaca gambar, Anda bisa review tanggal dan temuan yang terdeteksi sebelum semua baris disimpan ke DB.
                </div>

                {!importDraft ? (
                  <div style={{ padding: '1.6rem 0', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                    Belum ada draft. Upload gambar lalu klik <strong style={{ color: 'var(--text-primary)' }}>Baca Form dengan AI</strong>.
                  </div>
                ) : (
                  <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ padding: '0.8rem', borderRadius: '12px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tanggal terbaca</div>
                      <div style={{ marginTop: '0.25rem', fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-blue)' }}>
                        {formatMonitorDate(importDraft.tanggal)}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {importDraft.rows.length} baris akan dikirim, {importDraft.issueRows.length} lokasi berisi temuan atau catatan.
                      </div>
                    </div>

                    <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {importDraft.issueRows.length === 0 ? (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                          AI tidak menemukan temuan/catatan pada gambar ini.
                        </div>
                      ) : importDraft.issueRows.map((row) => (
                        <div key={row.id} style={{ padding: '0.75rem 0.8rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{row.ruang}</div>
                            <span className={`badge ${row.total > 0 ? 'badge-danger' : 'badge-info'}`}>{row.total}</span>
                          </div>
                          <div style={{ marginTop: '0.3rem', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {row.keterangan}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button onClick={closeImportModal} className="btn btn-outline" type="button">Tutup</button>
                      <button onClick={handleSaveImportDraft} className="btn btn-primary" type="button" disabled={savingImport}>
                        {savingImport ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        Simpan Hasil Baca ke DB
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isImportModalOpen && isGeminiKeyModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 1300,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '3.5rem 1rem 1rem',
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Masukkan Gemini API Key</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Tempel key hanya saat akan baca form. Key disimpan di session browser, tidak ditaruh di source code.
                </p>
              </div>
              <button
                onClick={() => setIsGeminiKeyModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Gemini API Key</span>
                <input
                  type="password"
                  value={geminiKeyDraft}
                  onChange={(e) => setGeminiKeyDraft(e.target.value)}
                  placeholder="Tempel Gemini API key di sini"
                  className="input-responsive"
                />
              </label>

              <div style={{ fontSize: '0.72rem', color: geminiKeySaved ? 'var(--accent-emerald)' : 'var(--text-muted)', lineHeight: 1.5 }}>
                {geminiKeySaved ? 'Saat ini ada key sesi aktif. Anda bisa menggantinya kapan saja dari popup ini.' : 'Belum ada key sesi aktif untuk proses baca form.'}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <button
                  onClick={() => {
                    clearRuntimeGeminiApiKey();
                    setGeminiKeyDraft('');
                    setGeminiKeySaved(false);
                    setImportError('');
                  }}
                  className="btn btn-outline"
                  type="button"
                >
                  Reset Key
                </button>
                <button onClick={() => setIsGeminiKeyModalOpen(false)} className="btn btn-outline" type="button">
                  Batal
                </button>
                <button onClick={handleSaveGeminiKeyAndAnalyze} className="btn btn-primary" type="button" disabled={importLoading}>
                  {importLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Simpan Key & Baca Form
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomMonitor;
