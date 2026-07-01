import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle,
  Clock,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Save,
  Upload,
} from 'lucide-react';
import { getCurrentUser } from '../data/organization';
import { mergeCapexProjects, type CapexProjectRecord } from '../data/capexProjects';

const API_URL = 'https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec';
const SHEET_PROJECTS = 'Progres_CAPEX';
const SHEET_EVIDENCE = 'Capex_Evidence';
const DRIVE_FOLDER = 'Sarpramoklet_CAPEX_Evidence';

type Phase = 'Before' | 'Process' | 'After';

interface EvidenceRecord {
  id: string;
  projectId: string;
  nama: string;
  owner: string;
  progress: number;
  phase: Phase;
  slot: number;
  caption: string;
  imageUrl: string;
  driveUrl: string;
  fileName: string;
  updatedBy: string;
  updatedByEmail: string;
  updatedAt: string;
}

const PHASES: Phase[] = ['Before', 'Process', 'After'];
const SLOTS = [1, 2, 3];

const normalizeKeys = (row: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  Object.keys(row || {}).forEach((key) => {
    out[key.toLowerCase()] = row[key];
  });
  return out;
};

const parseEvidence = (row: Record<string, unknown>): EvidenceRecord | null => {
  const r = normalizeKeys(row);
  const projectId = String(r.projectid || r.project_id || '').trim();
  const phaseRaw = String(r.phase || '').trim();
  const phase = PHASES.includes(phaseRaw as Phase) ? phaseRaw as Phase : null;
  const slot = Number(r.slot || 0);
  if (!projectId || !phase || !slot) return null;

  return {
    id: String(r.id || `CAPEXEV-${projectId}-${phase}-${slot}`),
    projectId,
    nama: String(r.nama || ''),
    owner: String(r.owner || ''),
    progress: Number(r.progress || 0),
    phase,
    slot,
    caption: String(r.caption || ''),
    imageUrl: String(r.imageurl || r.image_url || ''),
    driveUrl: String(r.driveurl || r.drive_url || ''),
    fileName: String(r.filename || r.file_name || ''),
    updatedBy: String(r.updatedby || r.updated_by || ''),
    updatedByEmail: String(r.updatedbyemail || r.updated_by_email || ''),
    updatedAt: String(r.updatedat || r.updated_at || ''),
  };
};

const evidenceId = (projectId: string, phase: Phase, slot: number) => `CAPEXEV-${projectId}-${phase}-${slot}`;

const formatDateTime = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const compressImage = (dataUrl: string, maxSize = 1100, quality = 0.58): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas tidak tersedia.'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Gambar tidak dapat dibaca.'));
    img.src = dataUrl;
  });

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(String(event.target?.result || ''));
    reader.onerror = () => reject(new Error('File gagal dibaca.'));
    reader.readAsDataURL(file);
  });

const progressColor = (value: number) => {
  if (value >= 100) return 'var(--accent-emerald)';
  if (value >= 70) return 'var(--accent-blue)';
  if (value >= 40) return 'var(--accent-amber)';
  return 'var(--accent-rose)';
};

const CapexEvidence = () => {
  const currentUser = getCurrentUser();
  const userEmail = localStorage.getItem('userEmail') || currentUser.email || '';
  const [projects, setProjects] = useState<CapexProjectRecord[]>([]);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [activeProjectId, setActiveProjectId] = useState('');
  const [lastSync, setLastSync] = useState('');
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const sortedProjects = useMemo(() => (
    [...projects].sort((a, b) => b.progress - a.progress || Number(a.id.replace('PRJ-', '')) - Number(b.id.replace('PRJ-', '')))
  ), [projects]);

  const activeProject = sortedProjects.find((project) => project.id === activeProjectId) || sortedProjects[0];

  const evidenceByKey = useMemo(() => {
    const map = new Map<string, EvidenceRecord>();
    evidence.forEach((item) => map.set(evidenceId(item.projectId, item.phase, item.slot), item));
    return map;
  }, [evidence]);

  const completion = useMemo(() => {
    const totalSlots = sortedProjects.length * PHASES.length * SLOTS.length;
    const filledSlots = evidence.filter((item) => item.imageUrl || item.driveUrl).length;
    const projectDone = sortedProjects.filter((project) => (
      PHASES.every((phase) => SLOTS.some((slot) => evidenceByKey.get(evidenceId(project.id, phase, slot))?.imageUrl))
    )).length;
    return { totalSlots, filledSlots, projectDone, pct: totalSlots ? Math.round((filledSlots / totalSlots) * 100) : 0 };
  }, [evidence, evidenceByKey, sortedProjects]);

  const loadData = async (silent = false) => {
    if (silent) setSyncing(true);
    else setLoading(true);

    try {
      const [projectResp, evidenceResp] = await Promise.all([
        fetch(`${API_URL}?sheetName=${encodeURIComponent(SHEET_PROJECTS)}`),
        fetch(`${API_URL}?sheetName=${encodeURIComponent(SHEET_EVIDENCE)}`).catch(() => null),
      ]);
      const projectRows = await projectResp.json();
      const merged = mergeCapexProjects(Array.isArray(projectRows) ? projectRows : []);
      setProjects(merged);
      setActiveProjectId((prev) => prev || [...merged].sort((a, b) => b.progress - a.progress)[0]?.id || '');

      if (evidenceResp) {
        const evidenceRows = await evidenceResp.json().catch(() => []);
        const parsed = Array.isArray(evidenceRows)
          ? evidenceRows.map(parseEvidence).filter((item): item is EvidenceRecord => Boolean(item))
          : [];
        setEvidence(parsed);
        const nextCaptions: Record<string, string> = {};
        parsed.forEach((item) => {
          nextCaptions[evidenceId(item.projectId, item.phase, item.slot)] = item.caption;
        });
        setCaptions((prev) => ({ ...nextCaptions, ...prev }));
      }
      setLastSync(new Date().toISOString());
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = window.setInterval(() => loadData(true), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const saveEvidenceRecord = async (record: EvidenceRecord) => {
    const payload = {
      action: 'FINANCE_RECORD',
      sheetName: SHEET_EVIDENCE,
      sheet: SHEET_EVIDENCE,
      id: record.id,
      ID: record.id,
      ProjectId: record.projectId,
      projectId: record.projectId,
      Nama: record.nama,
      nama: record.nama,
      Owner: record.owner,
      owner: record.owner,
      Progress: record.progress,
      progress: record.progress,
      Phase: record.phase,
      phase: record.phase,
      Slot: record.slot,
      slot: record.slot,
      Caption: record.caption,
      caption: record.caption,
      ImageUrl: record.imageUrl,
      imageUrl: record.imageUrl,
      DriveUrl: record.driveUrl,
      driveUrl: record.driveUrl,
      FileName: record.fileName,
      fileName: record.fileName,
      UpdatedBy: record.updatedBy,
      updatedBy: record.updatedBy,
      UpdatedByEmail: record.updatedByEmail,
      updatedByEmail: record.updatedByEmail,
      UpdatedAt: record.updatedAt,
      updatedAt: record.updatedAt,
    };

    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    });
  };

  const buildRecord = (project: CapexProjectRecord, phase: Phase, slot: number, patch: Partial<EvidenceRecord>): EvidenceRecord => {
    const key = evidenceId(project.id, phase, slot);
    const existing = evidenceByKey.get(key);
    return {
      id: key,
      projectId: project.id,
      nama: project.nama,
      owner: project.owner,
      progress: project.progress,
      phase,
      slot,
      caption: captions[key] ?? existing?.caption ?? '',
      imageUrl: existing?.imageUrl || '',
      driveUrl: existing?.driveUrl || '',
      fileName: existing?.fileName || '',
      updatedBy: currentUser.nama,
      updatedByEmail: userEmail,
      updatedAt: new Date().toISOString(),
      ...existing,
      ...patch,
    };
  };

  const handleCaptionSave = async (phase: Phase, slot: number) => {
    if (!activeProject) return;
    const key = evidenceId(activeProject.id, phase, slot);
    const record = buildRecord(activeProject, phase, slot, {
      caption: captions[key] || '',
      updatedBy: currentUser.nama,
      updatedByEmail: userEmail,
      updatedAt: new Date().toISOString(),
    });
    setSavingId(`${key}:caption`);
    try {
      await saveEvidenceRecord(record);
      setEvidence((prev) => [...prev.filter((item) => item.id !== record.id), record]);
    } finally {
      setSavingId('');
    }
  };

  const handleUpload = async (phase: Phase, slot: number, file: File) => {
    if (!activeProject) return;
    const key = evidenceId(activeProject.id, phase, slot);
    setSavingId(`${key}:upload`);
    try {
      const raw = await readFileAsDataUrl(file);
      const compressed = await compressImage(raw);
      const base64 = compressed.split(',')[1] || '';
      const safeProject = activeProject.id.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `capex_${safeProject}_${phase}_${slot}_${Date.now()}.jpg`;
      const uploadResp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({
          action: 'UPLOAD_TO_DRIVE',
          base64,
          mimeType: 'image/jpeg',
          fileName,
          folder: DRIVE_FOLDER,
        }),
      });

      const uploadText = await uploadResp.text();
      let uploadJson: any = null;
      try {
        uploadJson = uploadText ? JSON.parse(uploadText) : null;
      } catch {
        uploadJson = null;
      }

      const hasDriveUpload = uploadJson?.success && (uploadJson.url || uploadJson.imageUrl || uploadJson.driveUrl);
      const imageUrl = hasDriveUpload ? (uploadJson.url || uploadJson.imageUrl || '') : compressed;
      const driveUrl = hasDriveUpload ? (uploadJson.driveUrl || uploadJson.url || '') : '';

      const record = buildRecord(activeProject, phase, slot, {
        imageUrl,
        driveUrl,
        fileName,
        caption: captions[key] || evidenceByKey.get(key)?.caption || '',
        updatedBy: currentUser.nama,
        updatedByEmail: userEmail,
        updatedAt: new Date().toISOString(),
      });
      await saveEvidenceRecord(record);
      setEvidence((prev) => [...prev.filter((item) => item.id !== record.id), record]);
      setLastSync(new Date().toISOString());
    } catch (error: any) {
      alert(`Gagal upload foto: ${error?.message || 'Periksa koneksi dan Apps Script.'}`);
    } finally {
      setSavingId('');
      if (fileInputs.current[key]) fileInputs.current[key]!.value = '';
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <Loader2 className="animate-spin" size={34} color="var(--accent-blue)" />
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <Camera size={18} /> Laporan Foto CAPEX
          </div>
          <h1 className="page-title gradient-text" style={{ margin: '0.35rem 0 0' }}>Evidence Before - Process - After</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.4rem 0 0', maxWidth: 760 }}>
            Upload foto progres CAPEX oleh Pimpinan dan Kaur. Data tersimpan di Drive + Google Sheet dan otomatis refresh setiap 30 detik.
          </p>
        </div>
        <button className="btn btn-outline" onClick={() => loadData(true)} disabled={syncing}>
          {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Sinkronkan
        </button>
      </div>

      <div className="capex-evidence-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Pekerjaan CAPEX', value: sortedProjects.length, Icon: ImageIcon, color: 'var(--accent-blue)' },
          { label: 'Slot foto terisi', value: `${completion.filledSlots}/${completion.totalSlots}`, Icon: Camera, color: 'var(--accent-emerald)' },
          { label: 'Coverage evidence', value: `${completion.pct}%`, Icon: CheckCircle, color: 'var(--accent-cyan)' },
          { label: 'Update terakhir', value: formatDateTime(lastSync), Icon: Clock, color: 'var(--accent-amber)' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="glass-panel" style={{ padding: '1rem', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>{label}</div>
                <div style={{ fontSize: label === 'Update terakhir' ? '1rem' : '1.6rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.35rem' }}>{value}</div>
              </div>
              <Icon size={24} color={color} />
            </div>
          </div>
        ))}
      </div>

      <div className="capex-evidence-layout" style={{ display: 'grid', gridTemplateColumns: '330px minmax(0, 1fr)', gap: '1.2rem', alignItems: 'start' }}>
        <div className="glass-panel" style={{ padding: '1rem', border: '1px solid var(--border-subtle)', position: 'sticky', top: '1rem' }}>
          <div style={{ fontWeight: 800, marginBottom: '0.8rem', color: 'var(--text-primary)' }}>Daftar Pekerjaan</div>
          <div style={{ display: 'grid', gap: '0.55rem', maxHeight: '70vh', overflow: 'auto', paddingRight: '0.25rem' }}>
            {sortedProjects.map((project, index) => {
              const filled = PHASES.reduce((sum, phase) => (
                sum + SLOTS.filter((slot) => evidenceByKey.get(evidenceId(project.id, phase, slot))?.imageUrl).length
              ), 0);
              const active = project.id === activeProject?.id;
              return (
                <button
                  key={project.id}
                  onClick={() => setActiveProjectId(project.id)}
                  style={{
                    textAlign: 'left',
                    border: `1px solid ${active ? 'rgba(59,130,246,0.55)' : 'var(--border-subtle)'}`,
                    background: active ? 'var(--accent-blue-ghost)' : 'rgba(255,255,255,0.03)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    padding: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
                    <strong>{String(index + 1).padStart(2, '0')} · {project.id}</strong>
                    <span style={{ color: progressColor(project.progress), fontWeight: 900 }}>{project.progress}%</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.35 }}>{project.nama}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.45rem' }}>{project.owner} · {filled}/9 foto</div>
                </button>
              );
            })}
          </div>
        </div>

        {activeProject && (
          <div className="glass-panel" style={{ padding: '1.1rem', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ color: 'var(--accent-blue)', fontWeight: 900, fontSize: '0.78rem', textTransform: 'uppercase' }}>{activeProject.id} · {activeProject.owner} · Progres {activeProject.progress}%</div>
                <h2 style={{ margin: '0.35rem 0 0', color: 'var(--text-primary)', fontSize: '1.45rem' }}>{activeProject.nama}</h2>
                {activeProject.deskripsi && <p style={{ color: 'var(--text-secondary)', margin: '0.4rem 0 0' }}>{activeProject.deskripsi}</p>}
              </div>
              <span style={{ color: progressColor(activeProject.progress), fontWeight: 900, fontSize: '1.4rem' }}>{activeProject.progress}%</span>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {PHASES.map((phase) => (
                <section key={phase}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.65rem' }}>
                    <span style={{
                      padding: '0.28rem 0.65rem',
                      borderRadius: 999,
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      color: '#fff',
                      background: phase === 'Before' ? 'var(--accent-rose)' : phase === 'Process' ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                    }}>{phase}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Isi 1 foto utama atau sampai 3 foto sesuai kebutuhan evidence.</span>
                  </div>

                  <div className="capex-evidence-slot-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.8rem' }}>
                    {SLOTS.map((slot) => {
                      const key = evidenceId(activeProject.id, phase, slot);
                      const item = evidenceByKey.get(key);
                      const isUploading = savingId === `${key}:upload`;
                      const isSavingCaption = savingId === `${key}:caption`;
                      return (
                        <div key={key} style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '0.75rem', background: 'rgba(255,255,255,0.025)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.55rem' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>{slot === 1 ? 'Foto Utama' : slot === 2 ? 'Foto Detail' : 'Foto Pendukung'}</strong>
                            {item?.driveUrl && (
                              <a href={item.driveUrl} target="_blank" rel="noreferrer" title="Buka di Drive" style={{ color: 'var(--accent-blue)' }}>
                                <ExternalLink size={15} />
                              </a>
                            )}
                          </div>

                          <div
                            onClick={() => fileInputs.current[key]?.click()}
                            style={{
                              height: 150,
                              borderRadius: 8,
                              border: `1px dashed ${item?.imageUrl ? 'rgba(16,185,129,0.5)' : 'var(--border-subtle)'}`,
                              background: item?.imageUrl ? 'rgba(16,185,129,0.06)' : 'rgba(0,0,0,0.12)',
                              display: 'grid',
                              placeItems: 'center',
                              cursor: 'pointer',
                              overflow: 'hidden',
                            }}
                          >
                            {isUploading ? (
                              <Loader2 className="animate-spin" size={28} color="var(--accent-blue)" />
                            ) : item?.imageUrl ? (
                              <img src={item.imageUrl} alt={`${phase} ${slot}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                <Upload size={28} style={{ marginBottom: 8 }} />
                                <div style={{ fontWeight: 800, fontSize: '0.8rem' }}>Upload Foto</div>
                              </div>
                            )}
                          </div>
                          <input
                            ref={(node) => { fileInputs.current[key] = node; }}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) handleUpload(phase, slot, file);
                            }}
                          />

                          <textarea
                            value={captions[key] ?? item?.caption ?? ''}
                            onChange={(event) => setCaptions((prev) => ({ ...prev, [key]: event.target.value }))}
                            rows={2}
                            placeholder="Caption singkat foto..."
                            style={{
                              width: '100%',
                              marginTop: '0.65rem',
                              background: 'rgba(0,0,0,0.18)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 8,
                              color: 'var(--text-primary)',
                              padding: '0.6rem',
                              resize: 'vertical',
                            }}
                          />
                          <button className="btn btn-outline" style={{ width: '100%', marginTop: '0.55rem', justifyContent: 'center' }} onClick={() => handleCaptionSave(phase, slot)} disabled={isSavingCaption}>
                            {isSavingCaption ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan Caption
                          </button>
                          {item?.updatedAt && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              Update: {formatDateTime(item.updatedAt)} oleh {item.updatedBy || '-'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CapexEvidence;
