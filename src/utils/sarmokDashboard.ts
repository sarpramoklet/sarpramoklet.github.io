export type SarmokDashboardData = {
  complaints: {
    waitingConfirmation: number;
    onProcess: number;
  };
  roomReservation: {
    waitingConfirmation: number;
    activeReservation: number;
  };
  toolsLoan: {
    waitingConfirmation: number;
    haveNotReturn: number;
  };
};

export const SARMOK_DASHBOARD_API_URL =
  import.meta.env.VITE_SARMOK_DASHBOARD_API_URL?.trim() ||
  'https://api.smktelkom-mlg.sch.id/auth/sarmok/dashboard';

const SECTION_ALIASES = {
  complaints: ['complaints', 'complaint', 'pengaduan', 'keluhan', 'aduan'],
  roomReservation: ['roomReservation', 'room_reservation', 'rooms', 'room', 'reservation', 'peminjamanRuang', 'peminjaman_ruang', 'ruang'],
  toolsLoan: ['toolsLoan', 'tools_loan', 'toolLoan', 'tools', 'tool', 'loan', 'loans', 'alat', 'peminjaman', 'peminjamanAlat', 'peminjaman_alat'],
};

const FIELD_ALIASES = {
  waitingConfirmation: ['waitingConfirmation', 'waiting_confirmation', 'waiting', 'pending', 'pendingConfirmation', 'menungguKonfirmasi', 'menunggu_konfirmasi'],
  onProcess: ['onProcess', 'on_process', 'inProcess', 'in_process', 'processing', 'inProgress', 'in_progress', 'diproses', 'sedangDiproses', 'sedang_diproses'],
  activeReservation: ['activeReservation', 'active_reservation', 'active', 'aktif', 'reservationActive', 'reservation_active'],
  haveNotReturn: ['haveNotReturn', 'have_not_return', 'notReturn', 'not_return', 'notReturned', 'not_returned', 'verified', 'verifiedLoan', 'verifiedLoans', 'approved', 'activeLoan', 'activeLoans', 'terverifikasi', 'belumKembali', 'belum_kembali', 'belumDikembalikan', 'belum_dikembalikan'],
};

const normalizeToken = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const aliasesMatch = (value: string, aliases: string[]) => {
  const normalized = normalizeToken(value);
  return aliases.some((alias) => {
    const normalizedAlias = normalizeToken(alias);
    return normalized === normalizedAlias || normalized.includes(normalizedAlias);
  });
};

const toDashboardNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    const compact = trimmed.replace(/[^\d,.-]/g, '').replace(',', '.');
    const parsed = Number(compact);
    if (Number.isFinite(parsed)) return parsed;
  }

  if (isRecord(value)) {
    for (const key of ['count', 'total', 'value', 'jumlah', 'qty', 'data']) {
      const parsed = toDashboardNumber(value[key]);
      if (parsed !== undefined) return parsed;
    }
  }

  return undefined;
};

const unwrapPayload = (payload: unknown): unknown => {
  if (!isRecord(payload)) return payload;

  const unwrapKeys = ['data', 'dashboard', 'result', 'results', 'payload'];
  for (const key of unwrapKeys) {
    if (payload[key] !== undefined) return unwrapPayload(payload[key]);
  }

  return payload;
};

const findSection = (source: unknown, aliases: string[]): unknown => {
  if (Array.isArray(source)) {
    for (const item of source) {
      const section = findSection(item, aliases);
      if (section !== undefined) return section;
    }
    return undefined;
  }

  if (!isRecord(source)) return undefined;

  const descriptor = String(source.name || source.title || source.label || source.type || source.category || '');
  if (descriptor && aliasesMatch(descriptor, aliases)) return source;

  for (const [key, value] of Object.entries(source)) {
    if (aliasesMatch(key, aliases)) return value;
  }

  for (const value of Object.values(source)) {
    const section = findSection(value, aliases);
    if (section !== undefined) return section;
  }

  return undefined;
};

const pickNumber = (source: unknown, aliases: string[]): number | undefined => {
  if (Array.isArray(source)) {
    for (const item of source) {
      const value = pickNumber(item, aliases);
      if (value !== undefined) return value;
    }
    return undefined;
  }

  if (!isRecord(source)) return undefined;

  for (const [key, value] of Object.entries(source)) {
    if (aliasesMatch(key, aliases)) {
      const parsed = toDashboardNumber(value);
      if (parsed !== undefined) return parsed;
    }
  }

  for (const value of Object.values(source)) {
    const parsed = pickNumber(value, aliases);
    if (parsed !== undefined) return parsed;
  }

  return undefined;
};

const pickCombinedNumber = (source: unknown, sectionAliases: string[], fieldAliases: string[]): number | undefined => {
  if (Array.isArray(source)) {
    for (const item of source) {
      const value = pickCombinedNumber(item, sectionAliases, fieldAliases);
      if (value !== undefined) return value;
    }
    return undefined;
  }

  if (!isRecord(source)) return undefined;

  for (const [key, value] of Object.entries(source)) {
    if (aliasesMatch(key, sectionAliases) && aliasesMatch(key, fieldAliases)) {
      const parsed = toDashboardNumber(value);
      if (parsed !== undefined) return parsed;
    }
  }

  for (const value of Object.values(source)) {
    const parsed = pickCombinedNumber(value, sectionAliases, fieldAliases);
    if (parsed !== undefined) return parsed;
  }

  return undefined;
};

const sectionNumber = (root: unknown, sectionAliases: string[], fieldAliases: string[]) => {
  const section = findSection(root, sectionAliases);
  return (
    pickNumber(section, fieldAliases) ??
    pickCombinedNumber(root, sectionAliases, fieldAliases) ??
    0
  );
};

export const normalizeSarmokDashboardPayload = (payload: unknown): SarmokDashboardData => {
  const root = unwrapPayload(payload);

  return {
    complaints: {
      waitingConfirmation: sectionNumber(root, SECTION_ALIASES.complaints, FIELD_ALIASES.waitingConfirmation),
      onProcess: sectionNumber(root, SECTION_ALIASES.complaints, FIELD_ALIASES.onProcess),
    },
    roomReservation: {
      waitingConfirmation: sectionNumber(root, SECTION_ALIASES.roomReservation, FIELD_ALIASES.waitingConfirmation),
      activeReservation: sectionNumber(root, SECTION_ALIASES.roomReservation, FIELD_ALIASES.activeReservation),
    },
    toolsLoan: {
      waitingConfirmation: sectionNumber(root, SECTION_ALIASES.toolsLoan, FIELD_ALIASES.waitingConfirmation),
      haveNotReturn: sectionNumber(root, SECTION_ALIASES.toolsLoan, FIELD_ALIASES.haveNotReturn),
    },
  };
};

const findTextValue = (section: string, label: string) => {
  const lowerSection = section.toLowerCase();
  const lowerLabel = label.toLowerCase();
  const labelIdx = lowerSection.indexOf(lowerLabel);

  if (labelIdx === -1) return 0;

  const lookBehind = section.substring(Math.max(0, labelIdx - 150), labelIdx);
  const matches = lookBehind.match(/(\d+)/g);
  if (matches && matches.length > 0) return Number(matches[matches.length - 1] || 0);

  const lookAhead = section.substring(labelIdx, labelIdx + 50);
  const aheadMatches = lookAhead.match(/(\d+)/);
  return Number(aheadMatches ? aheadMatches[1] : 0);
};

export const normalizeSarmokDashboardText = (text: string): SarmokDashboardData => {
  const complaintsSection = text.match(/Complaints|Pengaduan/i)
    ? text.match(/(?:Complaints|Pengaduan)(.*?)(?:Room\s*Reservation|Peminjaman\s*Ruang|Tools\s*Loan|Peminjaman\s*Alat)/is)?.[1] || text
    : text;
  const roomSection = text.match(/Room\s*Reservation|Peminjaman\s*Ruang/i)
    ? text.match(/(?:Room\s*Reservation|Peminjaman\s*Ruang)(.*?)(?:Tools\s*Loan|Peminjaman\s*Alat)/is)?.[1] || text
    : text;
  const toolsSection = text.match(/Tools\s*Loan|Peminjaman\s*Alat/i)
    ? text.match(/(?:Tools\s*Loan|Peminjaman\s*Alat)(.*?)$/is)?.[1] || text
    : text;

  return {
    complaints: {
      waitingConfirmation: findTextValue(complaintsSection, 'Waiting for Confirmation') || findTextValue(complaintsSection, 'Menunggu Konfirmasi'),
      onProcess: findTextValue(complaintsSection, 'On Process') || findTextValue(complaintsSection, 'Sedang Diproses'),
    },
    roomReservation: {
      waitingConfirmation: findTextValue(roomSection, 'Waiting for Confirmation') || findTextValue(roomSection, 'Menunggu Konfirmasi'),
      activeReservation: findTextValue(roomSection, 'Active Reservation') || findTextValue(roomSection, 'Reservasi Aktif'),
    },
    toolsLoan: {
      waitingConfirmation: findTextValue(toolsSection, 'Waiting for Confirmation') || findTextValue(toolsSection, 'Menunggu Konfirmasi'),
      haveNotReturn: findTextValue(toolsSection, 'Have not return') || findTextValue(toolsSection, 'Belum Dikembalikan') || findTextValue(toolsSection, 'Belum Kembali'),
    },
  };
};

export const parseSarmokDashboardBody = (body: unknown): SarmokDashboardData => {
  if (typeof body !== 'string') return normalizeSarmokDashboardPayload(body);

  try {
    return normalizeSarmokDashboardPayload(JSON.parse(body));
  } catch {
    return normalizeSarmokDashboardText(body);
  }
};
