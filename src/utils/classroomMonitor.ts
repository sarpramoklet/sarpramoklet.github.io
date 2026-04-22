export type ClassroomMonitorEntry = {
  id: string;
  tanggal: string;
  hari: string;
  ruang: string;
  lampu: number;
  tv: number;
  ac: number;
  kipas: number;
  lainnya: number;
  sampah: number;
  kotoran: number;
  rapih: number;
  total: number;
  keterangan: string;
  namaKelas?: string;
  waliKelas?: string;
  updatedBy?: string;
  updatedAt?: string;
};

export type ClassroomMonitorSeedPartial = Partial<
  Pick<
    ClassroomMonitorEntry,
    'lampu' | 'tv' | 'ac' | 'kipas' | 'lainnya' | 'sampah' | 'kotoran' | 'rapih' | 'keterangan' | 'namaKelas' | 'waliKelas'
  >
> & {
  ruang: string;
};

export const CLASSROOM_MONITOR_SHEET = 'Pantauan_Kelas';

export const CLASSROOM_LOCATION_OPTIONS = [
  ...Array.from({ length: 40 }, (_, index) => `Ruang ${index + 1}`),
  ...Array.from({ length: 7 }, (_, index) => `Lab ${index + 1}`),
  'R. Studio',
  'Aula',
  'UKS',
];

export const CLASSROOM_ROOM_DETAILS: Record<string, { className?: string; waliKelas?: string }> = {
  'Ruang 1': { className: 'X-RPL1', waliKelas: 'Rahardiyan Andrizdi' },
  'Ruang 2': { className: 'X-RPL2', waliKelas: 'Muhammad Fajri Falah, M.Pd.' },
  'Ruang 3': { className: 'X-RPL3', waliKelas: 'Agung Bagus Wicaksono, S.Sn., M.Pd.' },
  'Ruang 4': { className: 'X-RPL4', waliKelas: 'Ina Indra Rustika, S.Pd.' },
  'Ruang 5': { className: 'X-RPL5', waliKelas: 'Aulia Mas\'Adah, S.Kom.' },
  'Ruang 6': { className: 'X-RPL6', waliKelas: 'Pasthania Fitri Indah L., S.Kom.' },
  'Ruang 7': { className: 'X-RPL7', waliKelas: 'Diaur Rahman, S.Pd.' },
  'Ruang 8': { className: 'X-RPL8', waliKelas: 'Nurwidiarsi Firstyana W., S.Psi.' },
  'Ruang 9': { className: 'X-TKJ1', waliKelas: 'Dimas Agung Prasetiyawan, M.Pd' },
  'Ruang 10': { className: 'X-TKJ2', waliKelas: 'Achmad Abidin, M.Pd.' },
  'Ruang 11': { className: 'X-TKJ3', waliKelas: 'Yaniko Dimas Yogo P., S.Kom.' },
  'Ruang 12': { className: 'X-TKJ4', waliKelas: 'Muhammad Bagus Arifin, S.Pd.' },
  'Ruang 13': { className: 'X-PG1', waliKelas: 'Ana Wahyuning Sholikhatin S.Pd.' },
  'Ruang 14': { className: 'X-PG2', waliKelas: 'Andree Rivan Kurniawan, M.Pd' },
  'Ruang 15': { className: 'XI-RPL1', waliKelas: 'Ermawati Dwi Restuningsih, S.Pd.' },
  'Ruang 16': { className: 'XI-RPL2', waliKelas: 'Lyra Hertin, S.Pd.' },
  'Ruang 17': { className: 'XI-RPL3', waliKelas: 'Ardian Suseno, M.Pd.' },
  'Ruang 18': { className: 'XI-RPL4', waliKelas: 'M. Masyis Dzub Hilmi, M.Pd.' },
  'Ruang 19': { className: 'XI-RPL5', waliKelas: 'Zainal Abidin, S.Kom., Gr.' },
  'Ruang 20': { className: 'XI-RPL6', waliKelas: 'Kheren Carollina Pamintarso, S.Pd.' },
  'Ruang 21': { className: 'XI-RPL7', waliKelas: 'Feniliya Mayrini' },
  'Ruang 22': { className: 'XI-RPL8', waliKelas: 'Firmansyah Ayatullah, S.Kom' },
  'Ruang 23': { className: 'XI-TKJ1', waliKelas: 'Nico Rachmacandrana, S.St.' },
  'Ruang 24': { className: 'XI-TKJ2', waliKelas: 'Siana Norma Heny, S.Pd.' },
  'Ruang 25': { className: 'XI-TKJ3', waliKelas: 'Firman Hadi Amrullah Zainani, S.Kom.' },
  'Ruang 26': { className: 'XI-TKJ4', waliKelas: 'Hirga Ertama Putra, S.Kom.' },
  'Ruang 27': { className: 'XI-PG1', waliKelas: 'Chandra Wijaya Kristanto, S.Pd.' },
  'Ruang 28': { className: 'XI-PG2', waliKelas: 'Syafirah Aisyah, S.Pd.' },
  'Ruang 32': { className: 'Ujian', waliKelas: '(Khusus Ujian)' },
  'Ruang 33': { className: 'X-Inter', waliKelas: 'Larasati Chairun Nisa, S.Pd.' },
  'Ruang 35': { className: 'XII-MG', waliKelas: 'Tulus Andrianto, S.Pd.' },
  'Ruang 36': { className: 'XII-MG', waliKelas: 'Tulus Andrianto, S.Pd.' },
  'Ruang 37': { className: 'Ujian', waliKelas: '(Khusus Ujian)' },
  'Ruang 38': { className: 'Ujian', waliKelas: '(Khusus Ujian)' },
  'Ruang 39': { className: 'Ujian', waliKelas: '(Khusus Ujian)' },
  'Ruang 40': { className: 'Ujian', waliKelas: '(Khusus Ujian)' },
};

export const getClassroomRoomDetails = (ruang: string) => {
  const normalized = normalizeClassroomRoom(ruang);
  return CLASSROOM_ROOM_DETAILS[normalized] || null;
};

const isRoomAliasValue = (value: string, ruang: string) => {
  const normalizedValue = normalizeClassroomRoom(value);
  const normalizedRoom = normalizeClassroomRoom(ruang);
  return normalizedValue !== '' && normalizedValue === normalizedRoom;
};

export const getEffectiveRoomDetails = (entry: { ruang: string; namaKelas?: string; waliKelas?: string }) => {
  const staticDetails = getClassroomRoomDetails(entry.ruang);
  const incomingClassName = String(entry.namaKelas || '').trim();
  const resolvedClassName = incomingClassName && !isRoomAliasValue(incomingClassName, entry.ruang)
    ? incomingClassName
    : staticDetails?.className;

  return {
    className: resolvedClassName,
    waliKelas: String(entry.waliKelas || '').trim() || staticDetails?.waliKelas,
  };
};

export const formatClassroomIdentityLabel = (
  entry: { ruang: string; namaKelas?: string; waliKelas?: string },
  options: { shortRoom?: boolean; includeWali?: boolean } = {}
) => {
  const roomLabel = options.shortRoom ? getShortClassroomLabel(entry.ruang) : normalizeClassroomRoom(entry.ruang);
  const details = getEffectiveRoomDetails(entry);
  const parts = [roomLabel];

  if (details.className) parts.push(details.className);
  if (options.includeWali !== false && details.waliKelas) parts.push(`Wali: ${details.waliKelas}`);

  return parts.join(' · ');
};

export const CLASSROOM_REFERENCE_TOTAL = CLASSROOM_LOCATION_OPTIONS.length;

const INITIAL_CLASSROOM_FORM_PARTIALS: Record<string, ClassroomMonitorSeedPartial[]> = {
  '2026-04-07': [
    { ruang: 'Ruang 4', sampah: 1 },
    { ruang: 'Ruang 5', keterangan: 'Kumpul Koordinasi' },
    { ruang: 'Ruang 12', sampah: 1 },
    { ruang: 'Ruang 16', keterangan: 'Ekskul P.Hirga' },
    { ruang: 'Ruang 17', sampah: 1 },
    { ruang: 'Ruang 19', kipas: 1, sampah: 1 },
    { ruang: 'Ruang 20', sampah: 1 },
    { ruang: 'Ruang 21', sampah: 1 },
    { ruang: 'Ruang 23', sampah: 1 },
    { ruang: 'Ruang 24', sampah: 1 },
    { ruang: 'Ruang 25', sampah: 1 },
    { ruang: 'Ruang 26', sampah: 1 },
    { ruang: 'Ruang 27', tv: 1 },
    { ruang: 'Ruang 28', kipas: 1, sampah: 1 },
    { ruang: 'Ruang 31', sampah: 1 },
    { ruang: 'Ruang 33', keterangan: 'Ekskul B.Seno' },
    { ruang: 'Ruang 38', sampah: 1 },
    { ruang: 'Ruang 40', sampah: 1 },
    { ruang: 'Lab 4', ac: 1 },
  ],
  '2026-04-08': [
    { ruang: 'Ruang 17', sampah: 1 },
    { ruang: 'Ruang 19', kipas: 1 },
    { ruang: 'Ruang 20', lainnya: 1, keterangan: 'Jendela terbuka' },
    { ruang: 'Ruang 21', lainnya: 1, keterangan: 'Jendela terbuka' },
    { ruang: 'Ruang 27', lainnya: 1, keterangan: 'Jendela terbuka' },
  ],
  '2026-04-09': [
    { ruang: 'Ruang 6', kotoran: 1, keterangan: 'lantai kotor' },
    { ruang: 'Ruang 17', sampah: 1, keterangan: 'banyak sisa MBG' },
    { ruang: 'Ruang 30', kipas: 1, keterangan: 'kipas menyala' },
  ],
};

export const getClassroomDayLabel = (dateValue: string) => {
  const parsed = new Date(normalizeClassroomDate(dateValue));
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(parsed);
};

export const normalizeClassroomDate = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return new Date().toISOString().slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const dmy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/);
  if (dmy) {
    const dd = String(parseInt(dmy[1], 10) || 1).padStart(2, '0');
    const mm = String(parseInt(dmy[2], 10) || 1).padStart(2, '0');
    const yyyyRaw = parseInt(dmy[3], 10) || 0;
    const yyyy = yyyyRaw < 100 ? 2000 + yyyyRaw : yyyyRaw;
    return `${yyyy}-${mm}-${dd}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(parsed);
  const year = parts.find((part) => part.type === 'year')?.value || '1970';
  const month = parts.find((part) => part.type === 'month')?.value || '01';
  const day = parts.find((part) => part.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
};

const toDateId = (dateValue: string) => {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return '000000';
  const dd = String(parsed.getDate()).padStart(2, '0');
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const yy = String(parsed.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
};

const toRoomSlug = (ruang: string) => {
  return ruang
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
};

export const buildClassroomEntryId = (tanggal: string, ruang: string) => {
  return `KLS-${toDateId(tanggal)}-${toRoomSlug(normalizeClassroomRoom(ruang))}`.toUpperCase();
};

export const toMonitorFlag = (value: unknown): number => {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return 0;
  if (['1', 'true', 'ya', 'y', 'x', 'check', 'checked', 'v'].includes(raw)) return 1;
  const numeric = Number(raw.replace(',', '.'));
  return Number.isFinite(numeric) && numeric > 0 ? 1 : 0;
};

export const normalizeClassroomRoom = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  const lower = raw.toLowerCase();

  const ruangMatch = lower.match(/ruang\s*(\d{1,2})|^r(?:uang)?\.?\s*(\d{1,2})$/);
  if (ruangMatch) {
    const number = parseInt(ruangMatch[1] || ruangMatch[2], 10);
    if (Number.isFinite(number) && number > 0) return `Ruang ${number}`;
  }

  const labMatch = lower.match(/lab\s*(\d{1,2})/);
  if (labMatch) {
    const number = parseInt(labMatch[1], 10);
    if (Number.isFinite(number) && number > 0) return `Lab ${number}`;
  }

  if (lower.includes('studio')) return 'R. Studio';
  if (lower.includes('aula')) return 'Aula';
  if (lower.includes('uks')) return 'UKS';

  const direct = CLASSROOM_LOCATION_OPTIONS.find((item) => item.toLowerCase() === lower);
  return direct || raw;
};

export const compareClassroomRooms = (left: string, right: string) => {
  const normalizedLeft = normalizeClassroomRoom(left);
  const normalizedRight = normalizeClassroomRoom(right);
  const leftIndex = CLASSROOM_LOCATION_OPTIONS.indexOf(normalizedLeft);
  const rightIndex = CLASSROOM_LOCATION_OPTIONS.indexOf(normalizedRight);

  if (leftIndex >= 0 && rightIndex >= 0) return leftIndex - rightIndex;
  if (leftIndex >= 0) return -1;
  if (rightIndex >= 0) return 1;
  return normalizedLeft.localeCompare(normalizedRight, 'id-ID', { numeric: true });
};

export const getShortClassroomLabel = (ruang: string) => {
  const normalized = normalizeClassroomRoom(ruang);
  if (normalized.startsWith('Ruang ')) return normalized.replace('Ruang ', 'R.');
  if (normalized.startsWith('Lab ')) return normalized.replace('Lab ', 'Lab ');
  return normalized;
};

export const sumMonitorFlags = (
  item: Pick<ClassroomMonitorEntry, 'lampu' | 'tv' | 'ac' | 'kipas' | 'lainnya' | 'sampah' | 'kotoran' | 'rapih'>
) => {
  return item.lampu + item.tv + item.ac + item.kipas + item.lainnya + item.sampah + item.kotoran + item.rapih;
};

export const buildMonitorIssueSummary = (entry: ClassroomMonitorEntry): string => {
  const issues: string[] = [];
  if (entry.lampu) issues.push('lampu menyala');
  if (entry.tv) issues.push('TV aktif');
  if (entry.ac) issues.push('AC masih menyala');
  if (entry.kipas) issues.push('kipas menyala');
  if (entry.lainnya) issues.push('perangkat lain/jendela perlu dicek');
  if (entry.sampah) issues.push('sampah belum terangkat');
  if (entry.kotoran) issues.push('lantai/area kelas kotor');
  if (entry.rapih) issues.push('kerapihan meja kursi perlu dibenahi');
  return issues.length > 0 ? issues.join(', ') : 'Tidak ada temuan';
};

export const createEmptyClassroomEntry = (
  tanggal: string,
  ruang: string,
  updatedBy = 'System',
  updatedAt = new Date().toISOString()
): ClassroomMonitorEntry => {
  const normalizedDate = normalizeClassroomDate(tanggal);
  const normalizedRoom = normalizeClassroomRoom(ruang);
  const roomDetails = getClassroomRoomDetails(normalizedRoom);
  return {
    id: buildClassroomEntryId(normalizedDate, normalizedRoom),
    tanggal: normalizedDate,
    hari: getClassroomDayLabel(normalizedDate),
    ruang: normalizedRoom,
    lampu: 0,
    tv: 0,
    ac: 0,
    kipas: 0,
    lainnya: 0,
    sampah: 0,
    kotoran: 0,
    rapih: 0,
    total: 0,
    keterangan: 'Aman, tidak ada temuan.',
    namaKelas: roomDetails?.className || '',
    waliKelas: roomDetails?.waliKelas || '',
    updatedBy,
    updatedAt,
  };
};

export const buildFullDayEntries = (
  tanggal: string,
  partials: ClassroomMonitorSeedPartial[],
  updatedBy = 'System',
  updatedAt = new Date().toISOString()
): ClassroomMonitorEntry[] => {
  const normalizedDate = normalizeClassroomDate(tanggal);
  const partialMap = new Map(
    partials.map((item) => [normalizeClassroomRoom(item.ruang), item])
  );

  return CLASSROOM_LOCATION_OPTIONS.map((ruang) => {
    const base = createEmptyClassroomEntry(normalizedDate, ruang, updatedBy, updatedAt);
    const found = partialMap.get(ruang);
    if (!found) return base;

    const merged: ClassroomMonitorEntry = {
      ...base,
      lampu: found.lampu ? 1 : 0,
      tv: found.tv ? 1 : 0,
      ac: found.ac ? 1 : 0,
      kipas: found.kipas ? 1 : 0,
      lainnya: found.lainnya ? 1 : 0,
      sampah: found.sampah ? 1 : 0,
      kotoran: found.kotoran ? 1 : 0,
      rapih: found.rapih ? 1 : 0,
      namaKelas: String(found.namaKelas || base.namaKelas || '').trim(),
      waliKelas: String(found.waliKelas || base.waliKelas || '').trim(),
      keterangan: String(found.keterangan || '').trim(),
    };

    merged.total = sumMonitorFlags(merged);
    if (!merged.keterangan) {
      merged.keterangan = merged.total > 0 ? buildMonitorIssueSummary(merged) : 'Aman, tidak ada temuan.';
    }

    return merged;
  });
};

export const getInitialClassroomFormSeedEntries = () => {
  const updatedAt = new Date('2026-04-10T00:00:00.000Z').toISOString();
  return Object.entries(INITIAL_CLASSROOM_FORM_PARTIALS)
    .flatMap(([tanggal, partials]) => buildFullDayEntries(tanggal, partials, 'Seed Form April 2026', updatedAt));
};

export const normalizeClassroomMonitorRows = (rows: any[]): ClassroomMonitorEntry[] => {
  const deduped = new Map<string, ClassroomMonitorEntry>();

  rows
    .map((row: any) => {
      const ruang = normalizeClassroomRoom(
        row.ruang || row.Ruang || row.kelas || row.Kelas || row.ruang_kelas || row.Ruang_Kelas || ''
      );

      if (!ruang) return null;

      const tanggal = normalizeClassroomDate(
        String(row.tanggal || row.Tanggal || row.date || row.Date || '').trim() || new Date().toISOString().slice(0, 10)
      );
      const normalized: ClassroomMonitorEntry = {
        id: String(row.id || row.ID || buildClassroomEntryId(tanggal, ruang)),
        tanggal,
        hari: String(row.hari || row.Hari || '').trim() || getClassroomDayLabel(tanggal),
        ruang,
        lampu: toMonitorFlag(row.lampu || row.Lampu),
        tv: toMonitorFlag(row.tv || row.TV),
        ac: toMonitorFlag(row.ac || row.AC),
        kipas: toMonitorFlag(row.kipas || row.Kipas),
        lainnya: toMonitorFlag(row.lainnya || row.Lainnya),
        sampah: toMonitorFlag(row.sampah || row.Sampah),
        kotoran: toMonitorFlag(row.kotoran || row.Kotoran),
        rapih: toMonitorFlag(row.rapih || row.Rapih),
        total: 0,
        keterangan: String(row.keterangan || row.Keterangan || row.catatan || row.Catatan || '').trim(),
        namaKelas: String(row.namaKelas || row.NamaKelas || row.kelas || row.Kelas || '').trim(),
        waliKelas: String(row.waliKelas || row.WaliKelas || row.walas || row.Walas || '').trim(),
        updatedBy: String(
          row.updatedBy ||
          row.UpdatedBy ||
          row['Updated By'] ||
          row['updated by'] ||
          row.petugas ||
          row.Petugas ||
          row.dibuatOleh ||
          row.DibuatOleh ||
          ''
        ).trim(),
        updatedAt: String(
          row.updatedAt ||
          row.UpdatedAt ||
          row['Updated At'] ||
          row['updated at'] ||
          row.waktuBuat ||
          row.WaktuBuat ||
          ''
        ).trim(),
      };

      const providedTotal = Number(
        row.total ||
        row.Total ||
        row.hasil ||
        row.Hasil ||
        row.jumlah ||
        row.Jumlah ||
        row.jumlah_hasil ||
        row.Jumlah_Hasil ||
        row.jumlah_hasil_pantauan ||
        row['Jumlah Hasil Pantauan'] ||
        0
      );

      normalized.total = providedTotal > 0 ? providedTotal : sumMonitorFlags(normalized);
      if (!normalized.keterangan) {
        normalized.keterangan = normalized.total > 0 ? buildMonitorIssueSummary(normalized) : 'Aman, tidak ada temuan.';
      }

      return normalized;
    })
    .filter((item): item is ClassroomMonitorEntry => Boolean(item))
    .forEach((item) => {
      const existing = deduped.get(item.id);
      if (!existing) {
        deduped.set(item.id, item);
        return;
      }

      const existingUpdatedAt = new Date(existing.updatedAt || existing.tanggal).getTime();
      const incomingUpdatedAt = new Date(item.updatedAt || item.tanggal).getTime();
      if (incomingUpdatedAt >= existingUpdatedAt) deduped.set(item.id, item);
    });

  return Array.from(deduped.values()).sort((left, right) => {
    const dateDiff = new Date(right.tanggal).getTime() - new Date(left.tanggal).getTime();
    if (dateDiff !== 0) return dateDiff;
    return compareClassroomRooms(left.ruang, right.ruang);
  });
};
