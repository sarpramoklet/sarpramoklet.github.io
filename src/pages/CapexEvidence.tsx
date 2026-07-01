import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Presentation,
  RefreshCw,
  Save,
  Upload,
  X,
} from 'lucide-react';
import { getCurrentUser } from '../data/organization';
import { mergeCapexProjects, type CapexProjectRecord } from '../data/capexProjects';

const API_URL        = 'https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec';
const UPLOAD_API_URL = 'https://script.google.com/macros/s/AKfycbwM73jOWMyEXFwLAWCSx-P2-0NKfzdf6ynDcqXHQaM9fhng6uXufMU4aDN-Odxi2FucfQ/exec';
const SHEET_PROJECTS = 'Progres_CAPEX';
const SHEET_EVIDENCE = 'Capex_Evidence';
const DRIVE_FOLDER = 'Sarpramoklet_CAPEX_Evidence';
const LS_IMAGE_PREFIX   = 'capex_ev_img_';
const LS_CAPTION_PREFIX = 'capex_ev_cap_';
const LS_PROJECTS_CACHE = 'capex_ev_projects_v2';
const LS_EVIDENCE_CACHE = 'capex_ev_evidence_v2';

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

// ─── LocalStorage helpers ──────────────────────────────────────────────────
const lsSetImage = (key: string, dataUrl: string) => {
  try { localStorage.setItem(`${LS_IMAGE_PREFIX}${key}`, dataUrl); } catch { /* quota full */ }
};
const lsGetImage = (key: string): string => {
  try { return localStorage.getItem(`${LS_IMAGE_PREFIX}${key}`) || ''; } catch { return ''; }
};
const lsSetCaption = (key: string, caption: string) => {
  try { localStorage.setItem(`${LS_CAPTION_PREFIX}${key}`, caption); } catch { /* quota full */ }
};
const lsGetCaption = (key: string): string => {
  try { return localStorage.getItem(`${LS_CAPTION_PREFIX}${key}`) || ''; } catch { return ''; }
};

// ─── Parsers / helpers ─────────────────────────────────────────────────────
const normalizeKeys = (row: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  Object.keys(row || {}).forEach((key) => {
    out[key.toLowerCase()] = row[key];
  });
  return out;
};

const parseEvidence = (row: Record<string, unknown>): EvidenceRecord | null => {
  const r = normalizeKeys(row);
  const projectId = String(r.projectid || r.project_id || r.type || '').trim();
  const phaseRaw = String(r.phase || r.kategori || '').trim();
  const phase = PHASES.includes(phaseRaw as Phase) ? phaseRaw as Phase : null;
  const slot = Number(r.slot || r.amount || 0);
  if (!projectId || !phase || !slot) return null;

  const id = String(r.id || `CAPEXEV-${projectId}-${phase}-${slot}`);
  const key = `CAPEXEV-${projectId}-${phase}-${slot}`;
  
  // Merge sheet data with localStorage cache (localStorage wins for image, sheet wins for caption if newer)
  const cachedImage = lsGetImage(key);
  const sheetImage = String(r.imageurl || r.image_url || r.debit || '');
  // Prefer Drive URL (from sheet) if it exists, else fallback to localStorage
  const imageUrl = (sheetImage && !sheetImage.startsWith('data:')) ? sheetImage : (cachedImage || sheetImage);

  const sheetCaption = String(r.caption || r.keterangan || '');
  const cachedCaption = lsGetCaption(key);
  // Prefer sheet caption (persistent), fall back to localStorage cache
  const caption = sheetCaption || cachedCaption;

  return {
    id,
    projectId,
    nama: String(r.nama || ''),
    owner: String(r.owner || ''),
    progress: Number(r.progress || 0),
    phase,
    slot,
    caption,
    imageUrl,
    driveUrl: String(r.driveurl || r.drive_url || r.kredit || ''),
    fileName: String(r.filename || r.file_name || ''),
    updatedBy: String(r.updatedby || r.updated_by || ''),
    updatedByEmail: String(r.updatedbyemail || r.updated_by_email || ''),
    updatedAt: String(r.updatedat || r.updated_at || r.tanggal || ''),
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

// ─── Presentasi Modal ─────────────────────────────────────────────────────
interface PresentasiModalProps {
  projects: CapexProjectRecord[];
  evidenceByKey: Map<string, EvidenceRecord>;
  onClose: () => void;
}

const phaseColor = (phase: Phase) =>
  phase === 'Before' ? '#df3f3f' : phase === 'Process' ? '#f39c12' : '#11a36a';

const phaseLabel = (phase: Phase) =>
  phase === 'Before' ? 'Before' : phase === 'Process' ? 'Process' : 'After';

const phaseHint = (phase: Phase, projectNama: string) => {
  if (phase === 'Before') return `Kondisi awal / masalah yang mendorong pekerjaan ${projectNama}`;
  if (phase === 'Process') return 'Dokumentasi pelaksanaan, pengawasan, dan progres lapangan';
  return 'Hasil akhir, manfaat operasional, dan kesiapan serah-terima';
};

const PresentasiModal = ({ projects, evidenceByKey, onClose }: PresentasiModalProps) => {
  const slides = useMemo(() => {
    // Cover slide + one slide per project that has at least 1 photo
    return projects.filter(p =>
      PHASES.some(ph => SLOTS.some(sl => {
        const k = `CAPEXEV-${p.id}-${ph}-${sl}`;
        const item = evidenceByKey.get(k);
        return item?.imageUrl || lsGetImage(k);
      }))
    );
  }, [projects, evidenceByKey]);

  const [idx, setIdx] = useState(-1); // -1 = cover
  const total = slides.length;

  const prev = () => setIdx(i => Math.max(-1, i - 1));
  const next = () => setIdx(i => Math.min(total - 1, i + 1));

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [total]);

  const isCover = idx === -1;
  const project = isCover ? null : slides[idx];

  // Build per-phase data for active project slide
  const phaseData = project ? PHASES.map(ph => ({
    phase: ph,
    photos: SLOTS.map(sl => {
      const k = `CAPEXEV-${project.id}-${ph}-${sl}`;
      const item = evidenceByKey.get(k);
      return {
        url: item?.imageUrl || lsGetImage(k) || '',
        caption: item?.caption || lsGetCaption(k) || '',
        driveUrl: item?.driveUrl || '',
      };
    }),
  })) : [];

  const slideNum = idx + 2; // cover=1, first project=2

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(5,10,20,0.97)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.75rem 1.25rem',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Presentation size={18} color="#70d8ff" />
          <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.88rem' }}>Presentasi Evidence CAPEX 2026</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>
            {isCover ? 'Cover' : `Slide ${slideNum} / ${total + 1} · ${project?.id}`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={prev} disabled={isCover} style={navBtnStyle(isCover)}><ChevronLeft size={18}/></button>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', minWidth: 60, textAlign: 'center' }}>
            {isCover ? '1' : slideNum} / {total + 1}
          </span>
          <button onClick={next} disabled={idx === total - 1} style={navBtnStyle(idx === total - 1)}><ChevronRight size={18}/></button>
          <button onClick={onClose} style={{ ...navBtnStyle(false), marginLeft: '0.5rem', background: 'rgba(220,50,50,0.18)', borderColor: 'rgba(220,50,50,0.35)' }}><X size={18}/></button>
        </div>
      </div>

      {/* Slide area */}
      <div style={{
        width: '100%', maxWidth: 'min(96vw, calc(96vh * 16/9))',
        aspectRatio: '16/9',
        marginTop: 52,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {isCover ? (
          <CoverSlide projects={projects} totalPhotos={slides.length} />
        ) : project ? (
          <ProjectSlide
            project={project}
            num={idx + 1}
            phaseData={phaseData}
          />
        ) : null}
      </div>

      {/* Thumbnail strip */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', gap: '0.4rem',
        padding: '0.6rem 1rem',
        overflowX: 'auto',
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}>
        {/* Cover thumb */}
        <button
          onClick={() => setIdx(-1)}
          style={thumbStyle(isCover)}
        >
          <span style={{ fontSize: '0.6rem', fontWeight: 900, color: isCover ? '#70d8ff' : 'rgba(255,255,255,0.5)' }}>COVER</span>
        </button>
        {slides.map((p, i) => {
          const firstPhoto = PHASES.flatMap(ph => SLOTS.map(sl => {
            const k = `CAPEXEV-${p.id}-${ph}-${sl}`;
            const item = evidenceByKey.get(k);
            return item?.imageUrl || lsGetImage(k) || '';
          })).find(u => u);
          const active = idx === i;
          return (
            <button key={p.id} onClick={() => setIdx(i)} style={thumbStyle(active)}>
              {firstPhoto ? (
                <img src={firstPhoto} alt={p.id} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
              ) : (
                <span style={{ fontSize: '0.55rem', fontWeight: 900, color: active ? '#70d8ff' : 'rgba(255,255,255,0.4)' }}>{p.id}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const navBtnStyle = (disabled: boolean): React.CSSProperties => ({
  background: disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 8, color: disabled ? 'rgba(255,255,255,0.25)' : '#fff',
  padding: '0.4rem 0.6rem', cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex', alignItems: 'center',
});

const thumbStyle = (active: boolean): React.CSSProperties => ({
  flex: '0 0 80px', height: 46, borderRadius: 6,
  border: `2px solid ${active ? '#70d8ff' : 'rgba(255,255,255,0.12)'}`,
  background: active ? 'rgba(112,216,255,0.12)' : 'rgba(255,255,255,0.05)',
  cursor: 'pointer', overflow: 'hidden',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'border-color 0.2s',
});

// Cover slide component
const CoverSlide = ({ projects, totalPhotos }: { projects: CapexProjectRecord[]; totalPhotos: number }) => (
  <div style={{
    width: '100%', height: '100%',
    background: 'linear-gradient(130deg, #0f2742 0%, #183d6e 55%, #0a1e3a 100%)',
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    padding: '5% 6%', position: 'relative', overflow: 'hidden',
  }}>
    {/* Decorative circles */}
    <div style={{ position: 'absolute', top: '-8%', right: '-4%', width: '38%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,166,214,0.18), transparent 70%)', pointerEvents: 'none' }} />
    <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '32%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle, rgba(17,163,106,0.15), transparent 70%)', pointerEvents: 'none' }} />

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ color: '#70d8ff', fontWeight: 900, fontSize: 'clamp(10px,1.5vw,16px)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2%' }}>Evidence CAPEX 2026</div>
        <h1 style={{ margin: 0, color: '#fff', fontSize: 'clamp(20px,4.5vw,56px)', fontWeight: 900, lineHeight: 1.08, maxWidth: '72%' }}>Laporan Foto Pekerjaan CAPEX</h1>
        <p style={{ margin: '2% 0 0', color: 'rgba(255,255,255,0.72)', fontSize: 'clamp(10px,1.6vw,18px)', lineHeight: 1.5, maxWidth: '65%' }}>Dokumentasi visual Before, Process, dan After untuk seluruh pekerjaan CAPEX IT, Laboratorium, dan Sarana Prasarana.</p>
      </div>
      <div style={{ flex: '0 0 auto', background: 'rgba(255,255,255,0.95)', borderRadius: 10, padding: '2%', boxShadow: '0 18px 40px rgba(0,0,0,0.3)' }}>
        <img src="logo_telkom.png" alt="Telkom Schools" style={{ width: 'clamp(60px,8vw,120px)', height: 'auto', display: 'block' }} />
      </div>
    </div>
    <div style={{ display: 'flex', gap: '1.5%', flexWrap: 'wrap' }}>
      {[
        { label: 'PIC', value: 'Kaur IT LAB SARPRA' },
        { label: 'Tahun Anggaran', value: '2026' },
        { label: 'Total Pekerjaan', value: `${projects.length} proyek` },
        { label: 'Proyek Terdokumentasi', value: `${totalPhotos} proyek` },
      ].map(({ label, value }) => (
        <div key={label} style={{
          padding: '0.6% 1.5%', borderRadius: 999,
          background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
          color: 'rgba(255,255,255,0.85)', fontSize: 'clamp(9px,1.2vw,14px)', fontWeight: 700,
        }}>{label}: {value}</div>
      ))}
    </div>
  </div>
);

// Project slide component
interface PhaseSlot { url: string; caption: string; driveUrl: string; }
interface PhaseData { phase: Phase; photos: PhaseSlot[]; }

const ProjectSlide = ({ project, num, phaseData }: { project: CapexProjectRecord; num: number; phaseData: PhaseData[] }) => {
  const numStr = String(num).padStart(2, '0');
  const progressBg = project.progress >= 100 ? '#11a36a' : project.progress >= 70 ? '#1e5eff' : project.progress >= 40 ? '#f39c12' : '#df3f3f';
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#ffffff',
      display: 'flex', flexDirection: 'column',
      padding: '3% 4% 2%',
      gap: '2%',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Subtle background accent */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(30,94,255,0.04),transparent 35%),linear-gradient(180deg,rgba(17,163,106,0.04),transparent 40%)', pointerEvents: 'none' }} />

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2%', flex: '0 0 auto', position: 'relative' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#1e5eff', fontWeight: 900, fontSize: 'clamp(7px,1vw,12px)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5%' }}>
            No. {numStr} · {project.id} · {project.owner} · Progres {project.progress}%
          </div>
          <h2 style={{ margin: 0, fontSize: 'clamp(12px,2vw,26px)', fontWeight: 900, color: '#0f2742', lineHeight: 1.15, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {numStr}. {project.nama}
          </h2>
          {project.deskripsi && (
            <p style={{ margin: '0.5% 0 0', fontSize: 'clamp(7px,0.9vw,11px)', color: '#64748b', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {project.deskripsi}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem', flex: '0 0 auto' }}>
          <div style={{ padding: '0.4% 1.2%', borderRadius: 8, background: '#eef4ff', color: '#1e5eff', fontWeight: 900, fontSize: 'clamp(10px,1.5vw,18px)' }}>{numStr}</div>
          <div style={{ padding: '0.3% 1%', borderRadius: 999, background: progressBg, color: '#fff', fontWeight: 900, fontSize: 'clamp(8px,1vw,12px)' }}>{project.progress}%</div>
        </div>
      </div>

      {/* Photo columns: Before | Process | After */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5%', minHeight: 0, position: 'relative' }}>
        {phaseData.map(({ phase, photos }) => {
          const mainPhoto = photos[0];
          const sub1 = photos[1];
          const sub2 = photos[2];
          const hasMain = !!mainPhoto.url;
          const hasSub1 = !!sub1.url;
          const hasSub2 = !!sub2.url;
          const mainCaption = mainPhoto.caption || photos.find(p => p.caption)?.caption || '';

          return (
            <div key={phase} style={{
              border: '1px solid #d9e2ec', borderRadius: 8,
              background: 'rgba(255,255,255,0.9)',
              display: 'flex', flexDirection: 'column', gap: '1.5%', padding: '1.5%', minHeight: 0,
            }}>
              {/* Phase tag */}
              <div style={{
                display: 'inline-flex', width: 'max-content',
                padding: '0.3% 1%', borderRadius: 999,
                background: phaseColor(phase), color: '#fff',
                fontSize: 'clamp(7px,0.85vw,11px)', fontWeight: 900, textTransform: 'uppercase',
              }}>{phaseLabel(phase)}</div>

              {/* Photo grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto', gap: '1%', flex: 1, minHeight: 0 }}>
                {/* Main photo spans full width */}
                <div style={{
                  gridColumn: '1 / -1',
                  borderRadius: 6, overflow: 'hidden',
                  background: hasMain ? 'transparent' : 'linear-gradient(135deg,rgba(30,94,255,0.06),rgba(17,163,106,0.04)),#f9fbfe',
                  border: hasMain ? 'none' : '1px dashed rgba(100,116,139,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: 0, flex: 1,
                }}>
                  {hasMain ? (
                    <img src={mainPhoto.url} alt={`${phase} 1`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '4%' }}>
                      <Camera size={16} color="rgba(100,116,139,0.5)" />
                      <div style={{ fontSize: 'clamp(6px,0.7vw,9px)', color: '#64748b', fontWeight: 700, marginTop: '4%' }}>Foto Utama</div>
                    </div>
                  )}
                </div>

                {/* Sub photos */}
                {[{ data: sub1, label: 'Detail', has: hasSub1 }, { data: sub2, label: 'Pendukung', has: hasSub2 }].map(({ data, label, has }) => (
                  <div key={label} style={{
                    borderRadius: 5, overflow: 'hidden',
                    background: has ? 'transparent' : 'linear-gradient(135deg,rgba(255,255,255,0.86),rgba(255,255,255,0.68)),repeating-linear-gradient(45deg,rgba(100,116,139,0.1) 0 1px,transparent 1px 10px)',
                    border: has ? 'none' : '1px dashed rgba(100,116,139,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minHeight: 0,
                  }}>
                    {has ? (
                      <img src={data.url} alt={`${phase} ${label}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <span style={{ fontSize: 'clamp(5px,0.6vw,8px)', color: '#94a3b8', fontWeight: 700 }}>{label}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Caption */}
              {mainCaption ? (
                <div style={{
                  borderLeft: `3px solid ${phaseColor(phase)}`,
                  padding: '1.5% 2%',
                  background: phase === 'Before' ? '#fff5f5' : phase === 'Process' ? '#fffbf0' : '#f0faf6',
                  fontSize: 'clamp(6px,0.75vw,10px)', lineHeight: 1.4, color: '#1e293b',
                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>{mainCaption}</div>
              ) : (
                <div style={{
                  borderLeft: '3px solid #d9e2ec',
                  padding: '1.5% 2%',
                  background: '#f8fafc',
                  fontSize: 'clamp(6px,0.75vw,10px)', color: '#94a3b8', lineHeight: 1.4,
                }}>{phaseHint(phase, project.nama)}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: '0 0 auto', paddingTop: '0.5%', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5%', color: '#64748b', fontSize: 'clamp(6px,0.7vw,9px)', fontWeight: 700, textTransform: 'uppercase' }}>
          <img src="logo_telkom.png" alt="" style={{ height: 'clamp(10px,1.5vw,20px)', objectFit: 'contain' }} />
          SARPRA · IT LAB · Evidence CAPEX 2026
        </div>
        <div style={{ height: 5, width: 'clamp(60px,10vw,130px)', borderRadius: 999, background: 'linear-gradient(90deg,#1e5eff,#11a36a)' }} />
      </div>
    </div>
  );
};

// ─── Component ─────────────────────────────────────────────────────────────
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
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showPresentation, setShowPresentation] = useState(false);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  };

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
    const lsExtra = PHASES.flatMap(ph => SLOTS.map(sl => {
      const key = `CAPEXEV-${sortedProjects.find(p => p.id === activeProjectId)?.id || ''}-${ph}-${sl}`;
      return (!evidenceByKey.get(key)?.imageUrl && lsGetImage(key)) ? 1 : 0;
    })).reduce<number>((a, b) => a + b, 0);
    const filledSlots = evidence.filter((item) => item.imageUrl || item.driveUrl).length + lsExtra;
    const projectDone = sortedProjects.filter((project) => (
      PHASES.every((phase) => SLOTS.some((slot) => evidenceByKey.get(evidenceId(project.id, phase, slot))?.imageUrl))
    )).length;
    return { totalSlots, filledSlots, projectDone, pct: totalSlots ? Math.round((filledSlots / totalSlots) * 100) : 0 };
  }, [evidence, evidenceByKey, sortedProjects, activeProjectId]);

  const loadData = async (silent = false) => {
    // ── Step 1: Restore cache instantly (no spinner for repeat visits) ──────
    if (!silent) {
      try {
        const rawP = localStorage.getItem(LS_PROJECTS_CACHE);
        const rawE = localStorage.getItem(LS_EVIDENCE_CACHE);
        if (rawP) {
          const cached = JSON.parse(rawP) as CapexProjectRecord[];
          if (Array.isArray(cached) && cached.length > 0) {
            setProjects(cached);
            setActiveProjectId(prev => prev || [...cached].sort((a, b) => b.progress - a.progress)[0]?.id || '');
            setLoading(false); // show cached data immediately
          }
        }
        if (rawE) {
          const cached = JSON.parse(rawE) as EvidenceRecord[];
          if (Array.isArray(cached)) {
            setEvidence(cached);
            const caps: Record<string, string> = {};
            cached.forEach(item => { caps[evidenceId(item.projectId, item.phase, item.slot)] = item.caption; });
            setCaptions(prev => ({ ...prev, ...caps }));
          }
        }
      } catch { /* ignore stale cache errors */ }
    }

    // ── Step 2: Fetch fresh data (silently if cache was available) ───────────
    const hadCache = Boolean(localStorage.getItem(LS_PROJECTS_CACHE));
    if (silent) setSyncing(true);
    else if (!hadCache) setLoading(true);
    else setSyncing(true); // subtle spinner in header while refreshing in background

    try {
      const [projectResp, evidenceResp] = await Promise.all([
        fetch(`${API_URL}?sheetName=${encodeURIComponent(SHEET_PROJECTS)}`),
        fetch(`${API_URL}?sheetName=${encodeURIComponent(SHEET_EVIDENCE)}`).catch(() => null),
      ]);
      const projectRows = await projectResp.json();
      const merged = mergeCapexProjects(Array.isArray(projectRows) ? projectRows : []);
      setProjects(merged);
      setActiveProjectId((prev) => prev || [...merged].sort((a, b) => b.progress - a.progress)[0]?.id || '');
      // Save to cache
      try { localStorage.setItem(LS_PROJECTS_CACHE, JSON.stringify(merged)); } catch { /* quota */ }

      if (evidenceResp) {
        const evidenceRows = await evidenceResp.json().catch(() => []);
        const parsed = Array.isArray(evidenceRows)
          ? evidenceRows.map(parseEvidence).filter((item): item is EvidenceRecord => Boolean(item))
          : [];
        
        // Inject localStorage images into records that don't have them from sheet
        const enriched = parsed.map(item => {
          if (!item.imageUrl) {
            const cached = lsGetImage(item.id);
            if (cached) return { ...item, imageUrl: cached };
          }
          return item;
        });

        setEvidence(enriched);
        const nextCaptions: Record<string, string> = {};
        enriched.forEach((item) => {
          nextCaptions[evidenceId(item.projectId, item.phase, item.slot)] = item.caption;
        });
        // Also restore captions from localStorage for projects not yet in sheet
        setCaptions((prev) => {
          const fromLs: Record<string, string> = {};
          Object.keys(localStorage).forEach(k => {
            if (k.startsWith(LS_CAPTION_PREFIX)) {
              const evKey = k.slice(LS_CAPTION_PREFIX.length);
              fromLs[evKey] = localStorage.getItem(k) || '';
            }
          });
          return { ...fromLs, ...nextCaptions, ...prev };
        });
        // Save evidence to cache (without base64 blobs to keep cache small)
        try {
          const lite = enriched.map(e => ({ ...e, imageUrl: e.driveUrl ? e.imageUrl : '' }));
          localStorage.setItem(LS_EVIDENCE_CACHE, JSON.stringify(lite));
        } catch { /* quota */ }
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
    // Strip base64 from what we send to Sheet (Sheet cells cannot hold large base64)
    // Only send Drive URL if available, otherwise send empty string
    const imageUrlForSheet = record.imageUrl?.startsWith('data:') ? '' : (record.imageUrl || '');
    const payload = {
      action: 'FINANCE_RECORD',
      sheetName: SHEET_EVIDENCE,
      sheet: SHEET_EVIDENCE,
      id: record.id,
      ID: record.id,
      // Map to the existing sheet columns: id, tanggal, keterangan, kategori, amount, type, debit, kredit
      type: record.projectId,
      kategori: record.phase,
      amount: record.slot,
      keterangan: record.caption,
      debit: imageUrlForSheet,
      kredit: record.driveUrl,
      tanggal: record.updatedAt,
      // Also send readable field names for future schema upgrades
      ProjectId: record.projectId,
      projectId: record.projectId,
      Phase: record.phase,
      phase: record.phase,
      Slot: record.slot,
      slot: record.slot,
      Caption: record.caption,
      caption: record.caption,
      FileName: record.fileName,
      fileName: record.fileName,
      UpdatedBy: record.updatedBy,
      updatedBy: record.updatedBy,
      UpdatedByEmail: record.updatedByEmail,
      updatedByEmail: record.updatedByEmail,
      UpdatedAt: record.updatedAt,
      updatedAt: record.updatedAt,
    };

    // POST with no-cors: Apps Script redirects cross-origin, browser can't read response
    // but the request IS sent and processed. Same pattern as NetMonitorPage.
    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(payload),
    });
    // With no-cors, response is opaque — if fetch doesn't throw, data was sent successfully
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
      caption: captions[key] ?? existing?.caption ?? lsGetCaption(key) ?? '',
      imageUrl: existing?.imageUrl || lsGetImage(key) || '',
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
    const captionText = captions[key] || '';
    const record = buildRecord(activeProject, phase, slot, {
      caption: captionText,
      updatedBy: currentUser.nama,
      updatedByEmail: userEmail,
      updatedAt: new Date().toISOString(),
    });
    setSavingId(`${key}:caption`);
    try {
      // Save to localStorage immediately (survives refresh)
      lsSetCaption(key, captionText);
      // Then save to sheet
      await saveEvidenceRecord(record);
      setEvidence((prev) => [...prev.filter((item) => item.id !== record.id), record]);
      showToast('✓ Deskripsi tersimpan');
    } catch (err: any) {
      // localStorage already saved — data safe locally
      showToast(`⚠ Tersimpan lokal. Sheet: ${err?.message || 'coba lagi'}`, false);
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

      // Step 1: Save compressed image to localStorage FIRST (instant, always works)
      lsSetImage(key, compressed);

      // Step 2: Try uploading to Google Drive
      let imageUrl = compressed;
      let driveUrl = '';
      try {
        const uploadResp = await fetch(UPLOAD_API_URL, {
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
        try { uploadJson = uploadText ? JSON.parse(uploadText) : null; } catch { uploadJson = null; }
        if (uploadJson?.success && (uploadJson.url || uploadJson.imageUrl || uploadJson.driveUrl)) {
          imageUrl = uploadJson.url || uploadJson.imageUrl || compressed;
          driveUrl = uploadJson.driveUrl || uploadJson.url || '';
        }
      } catch {
        // Drive upload failed — we already have localStorage fallback
      }

      // Step 3: Build record and update UI immediately
      const record = buildRecord(activeProject, phase, slot, {
        imageUrl,
        driveUrl,
        fileName,
        caption: captions[key] || evidenceByKey.get(key)?.caption || lsGetCaption(key) || '',
        updatedBy: currentUser.nama,
        updatedByEmail: userEmail,
        updatedAt: new Date().toISOString(),
      });

      // Update UI state right away
      setEvidence((prev) => [...prev.filter((item) => item.id !== record.id), record]);
      setLastSync(new Date().toISOString());

      // Step 4: Save metadata to Sheet (image URL without base64 if no Drive URL)
      try {
        await saveEvidenceRecord(record);
        if (driveUrl) {
          showToast('✓ Foto tersimpan di Drive');
        } else {
          showToast('✓ Foto tersimpan lokal (Drive tidak tersedia)');
        }
      } catch {
        // Sheet save failed — localStorage cache is still intact
        showToast('✓ Foto tersimpan lokal. Sync ke Sheet gagal — coba Sinkronkan.', false);
      }
    } catch (error: any) {
      alert(`Gagal upload foto: ${error?.message || 'Periksa koneksi.'}`);
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
    <div style={{ paddingBottom: '2rem', position: 'relative' }}>
      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
          background: toast.ok ? 'rgba(17,163,106,0.95)' : 'rgba(245,158,11,0.95)',
          color: '#fff', padding: '0.75rem 1.2rem', borderRadius: 10,
          fontWeight: 700, fontSize: '0.88rem', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          transition: 'opacity 0.3s',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Presentasi Modal */}
      {showPresentation && (
        <PresentasiModal
          projects={sortedProjects}
          evidenceByKey={evidenceByKey}
          onClose={() => setShowPresentation(false)}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <Camera size={18} /> Laporan Foto CAPEX
          </div>
          <h1 className="page-title gradient-text" style={{ margin: '0.35rem 0 0' }}>Evidence Before - Process - After</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.4rem 0 0', maxWidth: 760 }}>
            Upload foto progres CAPEX. Foto tersimpan di browser (lokal) dan Google Sheet. Caption tersimpan otomatis di Sheet.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn"
            style={{ background: 'linear-gradient(135deg,#1e5eff,#11a36a)', color: '#fff', border: 'none', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: 8, cursor: 'pointer', boxShadow: '0 4px 16px rgba(30,94,255,0.3)', whiteSpace: 'nowrap' }}
            onClick={() => setShowPresentation(true)}
          >
            <Presentation size={16} /> Lihat Presentasi
          </button>
          <button className="btn btn-outline" onClick={() => loadData(true)} disabled={syncing}>
            {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Sinkronkan
          </button>
        </div>
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
                sum + SLOTS.filter((slot) => {
                  const k = evidenceId(project.id, phase, slot);
                  return evidenceByKey.get(k)?.imageUrl || lsGetImage(k);
                }).length
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
                      const displayImage = item?.imageUrl || lsGetImage(key);
                      const isUploading = savingId === `${key}:upload`;
                      const isSavingCaption = savingId === `${key}:caption`;
                      const captionVal = captions[key] ?? item?.caption ?? lsGetCaption(key) ?? '';
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
                              border: `1px dashed ${displayImage ? 'rgba(16,185,129,0.5)' : 'var(--border-subtle)'}`,
                              background: displayImage ? 'rgba(16,185,129,0.06)' : 'rgba(0,0,0,0.12)',
                              display: 'grid',
                              placeItems: 'center',
                              cursor: 'pointer',
                              overflow: 'hidden',
                            }}
                          >
                            {isUploading ? (
                              <Loader2 className="animate-spin" size={28} color="var(--accent-blue)" />
                            ) : displayImage ? (
                              <img src={displayImage} alt={`${phase} ${slot}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                            value={captionVal}
                            onChange={(event) => {
                              const val = event.target.value;
                              setCaptions((prev) => ({ ...prev, [key]: val }));
                              lsSetCaption(key, val); // auto-save to localStorage as user types
                            }}
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
                          {(item?.updatedAt || item?.updatedBy) && (
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
