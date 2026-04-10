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
  updatedBy?: string;
  updatedAt?: string;
};

export const CLASSROOM_REFERENCE_TOTAL = 40;
export const CLASSROOM_MONITOR_SHEET = 'Pantauan_Kelas';

export const createSampleClassroomMonitorRows = (): ClassroomMonitorEntry[] => {
  return Array.from({ length: CLASSROOM_REFERENCE_TOTAL }, (_, index) => {
    const roomNumber = index + 1;
    const baseRow: ClassroomMonitorEntry = {
      id: `KLS-090426-R${String(roomNumber).padStart(2, '0')}`,
      tanggal: '2026-04-09',
      hari: 'Kamis',
      ruang: `Ruang ${roomNumber}`,
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
      updatedBy: 'System',
      updatedAt: '2026-04-09T00:00:00.000Z',
    };

    if (roomNumber === 6) {
      return {
        ...baseRow,
        kotoran: 1,
        total: 1,
        keterangan: 'Lantai kotor',
      };
    }

    if (roomNumber === 17) {
      return {
        ...baseRow,
        sampah: 1,
        total: 1,
        keterangan: 'Banyak sisa MBG',
      };
    }

    if (roomNumber === 30) {
      return {
        ...baseRow,
        kipas: 1,
        total: 1,
        keterangan: 'Kipas menyala',
      };
    }

    return baseRow;
  });
};

export const CLASSROOM_MONITOR_SAMPLE = createSampleClassroomMonitorRows();

export const toMonitorFlag = (value: unknown): number => {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return 0;
  if (['1', 'true', 'ya', 'y', 'x', 'check', 'checked', 'v'].includes(raw)) return 1;
  const numeric = Number(raw.replace(',', '.'));
  return Number.isFinite(numeric) && numeric > 0 ? 1 : 0;
};

export const normalizeClassroomRoom = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  const match = raw.match(/(\d{1,2})/);
  if (!match) return raw;
  const number = parseInt(match[1], 10);
  if (!Number.isFinite(number) || number <= 0) return raw;
  return `Ruang ${number}`;
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
  if (entry.lainnya) issues.push('perangkat lain belum dimatikan');
  if (entry.sampah) issues.push('sampah belum terangkat');
  if (entry.kotoran) issues.push('lantai/area kelas kotor');
  if (entry.rapih) issues.push('kerapihan meja kursi perlu dibenahi');
  return issues.length > 0 ? issues.join(', ') : 'Tidak ada temuan';
};

export const normalizeClassroomMonitorRows = (rows: any[]): ClassroomMonitorEntry[] => {
  return rows
    .map((row: any, index: number) => {
      const ruang = normalizeClassroomRoom(
        row.ruang || row.Ruang || row.kelas || row.Kelas || row.ruang_kelas || row.Ruang_Kelas || ''
      );

      if (!ruang) return null;

      const normalized: ClassroomMonitorEntry = {
        id: String(row.id || row.ID || `KLS-${index + 1}`),
        tanggal: String(row.tanggal || row.Tanggal || row.date || row.Date || '').trim() || '2026-04-09',
        hari: String(row.hari || row.Hari || '').trim() || 'Pantauan',
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
        keterangan: String(
          row.keterangan || row.Keterangan || row.catatan || row.Catatan || ''
        ).trim(),
        updatedBy: String(
          row.updatedBy || row.UpdatedBy || row.petugas || row.Petugas || row.dibuatOleh || row.DibuatOleh || ''
        ).trim(),
        updatedAt: String(row.updatedAt || row.UpdatedAt || row.waktuBuat || row.WaktuBuat || '').trim(),
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
    .filter((item): item is ClassroomMonitorEntry => Boolean(item));
};

export const getClassroomDayLabel = (dateValue: string) => {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(parsed);
};
