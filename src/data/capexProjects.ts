export interface CapexProjectRecord {
  id: string;
  nama: string;
  deskripsi: string;
  progress: number;
  lastUpdated: string;
  updatedBy: string;
  owner: string;
}

const META_DESC_PREFIX = '[DESKRIPSI] ';
const META_OWNER_PREFIX = '[OWNER] ';

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

const normalizeSingleLine = (value: string) =>
  value
    .split(/\r?\n/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');

const toSafeNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
};

const parseNamaWithMeta = (value: unknown) => {
  const raw = String(value || '').trim();
  if (!raw) return { nama: '', deskripsi: '', owner: '' };

  const lines = raw
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const title = lines[0] || '';
  let deskripsi = '';
  let owner = '';

  for (const line of lines.slice(1)) {
    if (line.startsWith(META_DESC_PREFIX)) {
      deskripsi = line.slice(META_DESC_PREFIX.length).trim();
      continue;
    }
    if (line.startsWith(META_OWNER_PREFIX)) {
      owner = line.slice(META_OWNER_PREFIX.length).trim();
    }
  }

  return {
    nama: title,
    deskripsi,
    owner,
  };
};

export const encodeCapexProjectNama = (project: Pick<CapexProjectRecord, 'nama' | 'deskripsi' | 'owner'>) => {
  const lines = [normalizeSingleLine(project.nama)];
  const deskripsi = normalizeSingleLine(project.deskripsi);
  const owner = normalizeSingleLine(project.owner);

  if (deskripsi) lines.push(`${META_DESC_PREFIX}${deskripsi}`);
  if (owner) lines.push(`${META_OWNER_PREFIX}${owner}`);

  return lines.join('\n');
};

const normalizeProject = (row: Record<string, unknown>): CapexProjectRecord | null => {
  const normalized = normalizeRow(row);
  const id = String(normalized.id || '').trim();
  const parsedNama = parseNamaWithMeta(normalized.nama);
  const nama = parsedNama.nama;

  if (!id || !nama) return null;

  return {
    id,
    nama,
    deskripsi: normalizeSingleLine(String(normalized.deskripsi || normalized.description || parsedNama.deskripsi || '').trim()),
    progress: toSafeNumber(normalized.progress),
    lastUpdated: String(normalized.lastupdated || ''),
    updatedBy: String(normalized.updatedby || ''),
    owner: normalizeSingleLine(String(normalized.owner || normalized.unit || parsedNama.owner || '').trim()),
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
