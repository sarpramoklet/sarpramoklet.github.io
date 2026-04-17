export interface CapexProjectRecord {
  id: string;
  nama: string;
  deskripsi: string;
  progress: number;
  lastUpdated: string;
  updatedBy: string;
  owner: string;
}

export const DEFAULT_CAPEX_PROJECTS: CapexProjectRecord[] = [
  {
    id: 'PRJ-1',
    nama: 'Peremajaan keramik pada 3 ruang kelas (R.1 – R.3)',
    deskripsi: '',
    progress: 0,
    lastUpdated: '',
    updatedBy: '-',
    owner: 'Sarpras',
  },
  {
    id: 'PRJ-2',
    nama: 'Peremajaan talang air pada dak beton lantai 3',
    deskripsi: '',
    progress: 0,
    lastUpdated: '',
    updatedBy: '-',
    owner: 'Sarpras',
  },
  {
    id: 'PRJ-3',
    nama: 'Peremajaan dak beton masjid',
    deskripsi: '',
    progress: 0,
    lastUpdated: '',
    updatedBy: '-',
    owner: 'Sarpras',
  },
  {
    id: 'PRJ-4',
    nama: 'Peremajaan cat dinding pada 10 ruang kelas (R.7 – R.16)',
    deskripsi: '',
    progress: 0,
    lastUpdated: '',
    updatedBy: '-',
    owner: 'Sarpras',
  },
  {
    id: 'PRJ-5',
    nama: 'Peremajaan beton lapangan olahraga (basket)',
    deskripsi: '',
    progress: 0,
    lastUpdated: '',
    updatedBy: '-',
    owner: 'Sarpras',
  },
  {
    id: 'PRJ-6',
    nama: 'Pengadaan interior Laboratorium TEFA (Lab. 3)',
    deskripsi: '',
    progress: 0,
    lastUpdated: '',
    updatedBy: '-',
    owner: 'Lab',
  },
  {
    id: 'PRJ-7',
    nama: 'Pembangunan Malang Techno Park (Lanjutan)',
    deskripsi: '',
    progress: 0,
    lastUpdated: '',
    updatedBy: '-',
    owner: 'IT & Sarpras',
  },
];

const normalizeRow = (row: Record<string, unknown>) => {
  const normalized: Record<string, unknown> = {};
  Object.keys(row || {}).forEach((key) => {
    normalized[String(key).toLowerCase()] = row[key];
  });
  return normalized;
};

const toSafeNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
};

const normalizeProject = (row: Record<string, unknown>): CapexProjectRecord | null => {
  const normalized = normalizeRow(row);
  const id = String(normalized.id || '').trim();
  const nama = String(normalized.nama || '').trim();

  if (!id || !nama) return null;

  return {
    id,
    nama,
    deskripsi: String(normalized.deskripsi || normalized.description || '').trim(),
    progress: toSafeNumber(normalized.progress),
    lastUpdated: String(normalized.lastupdated || ''),
    updatedBy: String(normalized.updatedby || ''),
    owner: String(normalized.owner || normalized.unit || ''),
  };
};

export const mergeCapexProjects = (rows: Record<string, unknown>[] | null | undefined) => {
  const normalizedRows = Array.isArray(rows)
    ? rows
        .map((row) => normalizeProject(row))
        .filter((row): row is CapexProjectRecord => Boolean(row))
    : [];

  const rowById = new Map(normalizedRows.map((row) => [row.id, row]));

  const mergedDefaults = DEFAULT_CAPEX_PROJECTS.map((project) => {
    const saved = rowById.get(project.id);
    if (!saved) return project;

    return {
      ...project,
      ...saved,
      lastUpdated: saved.lastUpdated || project.lastUpdated,
      updatedBy: saved.updatedBy || project.updatedBy,
      owner: saved.owner || project.owner,
    };
  });

  const extras = normalizedRows
    .filter((row) => !DEFAULT_CAPEX_PROJECTS.some((project) => project.id === row.id))
    .map((row) => ({
      ...row,
      updatedBy: row.updatedBy || '-',
      owner: row.owner || 'Sarpras',
    }));

  return [...mergedDefaults, ...extras];
};

export const getNextCapexProjectId = (projects: Array<Pick<CapexProjectRecord, 'id'>>) => {
  const maxId = projects.reduce((max, project) => {
    const match = /^PRJ-(\d+)$/i.exec(String(project.id || '').trim());
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, 0);

  return `PRJ-${maxId + 1}`;
};
