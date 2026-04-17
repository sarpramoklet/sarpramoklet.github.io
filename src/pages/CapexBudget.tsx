import { useState, useEffect } from 'react';
import {
  Building2, FlaskConical, BookOpen, Monitor, TrendingUp, Edit3, X,
  Save, Loader2, RefreshCw, AlertTriangle, CheckCircle, Clock, BarChart3,
  ChevronDown, ChevronRight, DollarSign, Target, Activity, Plus, Trash2,
  Receipt, CalendarDays, FileText, Briefcase, Cpu, Zap
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { getCurrentUser, ROLES } from '../data/organization';
import { DEFAULT_CAPEX_PROJECTS, getNextCapexProjectId, mergeCapexProjects, type CapexProjectRecord } from '../data/capexProjects';

const API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";
const SHEET_REALISASI = 'Capex_Realisasi';
const SHEET_PROYEK    = 'Progres_CAPEX';

/* ─── Static budget master (RKA Investasi 2026) ─── */
interface BudgetItem {
  id: string;
  akun: string;
  deskripsi: string;
  anggaran: number;
}

const BUDGET_MASTER: BudgetItem[] = [
  { id: 'CAPEX-1232101', akun: '1232101', deskripsi: 'Gedung dan Bangunan',   anggaran: 3128087702 },
  { id: 'CAPEX-1233101', akun: '1233101', deskripsi: 'SarPen Laboratorium',    anggaran: 700576820  },
  { id: 'CAPEX-1233201', akun: '1233201', deskripsi: 'Sarana Pendidikan',      anggaran: 731701609  },
  { id: 'CAPEX-1234101', akun: '1234101', deskripsi: 'Inventaris Kantor',      anggaran: 2885730    },
  { id: 'CAPEX-1235101', akun: '1235101', deskripsi: 'Alat Pengolah Data',     anggaran: 0          },
  { id: 'CAPEX-1236101', akun: '1236101', deskripsi: 'Alat Catu Daya',         anggaran: 0          },
];

/* ─── Transaction (realisasi entry) ─── */
interface RealisasiEntry {
  id: string;
  akun: string;
  deskripsiKegiatan: string;
  tanggal: string;
  jumlah: number;
  keterangan: string;
  createdBy: string;
  createdAt: string;
}

const ACCOUNT_ICONS: Record<string, any> = {
  '1232101': Building2,
  '1233101': FlaskConical,
  '1233201': BookOpen,
  '1234101': Monitor,
  '1235101': Cpu,
  '1236101': Zap,
};
const ACCOUNT_COLORS: Record<string, string> = {
  '1232101': 'var(--accent-blue)',
  '1233101': 'var(--accent-violet)',
  '1233201': 'var(--accent-emerald)',
  '1234101': 'var(--accent-rose)',
  '1235101': '#f97316',
  '1236101': '#a78bfa',
};

/* ──────────────────── Component ──────────────────── */
const CapexBudget = () => {
  const [entries, setEntries]           = useState<RealisasiEntry[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab]       = useState<'cards' | 'table' | 'projek'>('cards');
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<RealisasiEntry | null>(null);

  /* Tab Proyek state */
  const [projects, setProjects] = useState<CapexProjectRecord[]>(DEFAULT_CAPEX_PROJECTS);
  const [editingProject, setEditingProject] = useState<CapexProjectRecord | null>(null);
  const [editingProjectDetails, setEditingProjectDetails] = useState<CapexProjectRecord | null>(null);
  const [showProjectFormModal, setShowProjectFormModal] = useState(false);
  const [projectProgress, setProjectProgress] = useState(0);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [projectForm, setProjectForm] = useState({
    nama: '',
    deskripsi: '',
    owner: 'Sarpras',
    progress: 0,
  });

  const [formData, setFormData] = useState({
    akun: '1232101',
    deskripsiKegiatan: '',
    tanggal: new Date().toISOString().split('T')[0],
    jumlah: '',
    keterangan: '',
  });

  const currentUser = getCurrentUser();
  const canUpdate   = currentUser.roleAplikasi === ROLES.PIMPINAN
                   || currentUser.roleAplikasi === ROLES.KOORDINATOR_SARPRAS;
  const canUpdateProject = canUpdate || currentUser.roleAplikasi.includes('Koordinator') || currentUser.roleAplikasi.includes('PIC');

  /* ── helpers ── */
  const fmtIDR = (v: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  const fmtShort = (v: number) => {
    if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(2)}M`;
    if (v >= 1_000_000)     return `Rp ${(v / 1_000_000).toFixed(1)}jt`;
    return fmtIDR(v);
  };

  const fmtDate = (s: string) => {
    if (!s) return '-';
    try {
      return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return s; }
  };

  const pct  = (real: number, anggar: number) => anggar ? Math.min((real / anggar) * 100, 100) : 0;
  const clr  = (p: number) => p >= 80 ? 'var(--accent-emerald)' : p >= 40 ? 'var(--accent-blue)' : p >= 10 ? '#f59e0b' : 'var(--accent-rose)';
  const stat = (p: number) => {
    if (p >= 80) return { label: 'Sangat Baik',   Icon: CheckCircle };
    if (p >= 40) return { label: 'Berjalan',       Icon: Activity };
    if (p >= 10) return { label: 'Awal',           Icon: Clock };
    return             { label: 'Belum Terserap',  Icon: AlertTriangle };
  };

  /* ── realisasi per akun ── */
  const realisasiByAkun = (akun: string) =>
    entries.filter(e => e.akun === akun).reduce((s, e) => s + e.jumlah, 0);

  const entriesByAkun = (akun: string) =>
    [...entries.filter(e => e.akun === akun)].sort(
      (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    );

  /* ── grand totals ── */
  const totalAnggaran   = BUDGET_MASTER.reduce((s, b) => s + b.anggaran, 0);
  const totalRealisasi  = entries.reduce((s, e) => s + e.jumlah, 0);
  const totalPct        = pct(totalRealisasi, totalAnggaran);
  const sisaTotal       = totalAnggaran - totalRealisasi;

  /* ── fetch ── */
  const fetchData = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}?sheetName=${SHEET_REALISASI}`);
      const data = await resp.json();

      if (Array.isArray(data) && data.length > 0) {
        const norm = (row: any): Record<string, any> => {
          const out: Record<string, any> = {};
          Object.keys(row).forEach(k => { out[k.toLowerCase()] = row[k]; });
          return out;
        };

        const parsed: RealisasiEntry[] = data
          .map(norm)
          .filter((r: any) => r['akun'] && r['jumlah'])
          .map((r: any) => ({
            id:                r['id']               || r['id_realisasi'] || '',
            akun:              String(r['akun']       || ''),
            deskripsiKegiatan: r['deskripsikegiatan'] || r['deskripsi_kegiatan'] || r['deskripsi'] || '',
            tanggal:           r['tanggal']           || '',
            jumlah:            Number(r['jumlah']     || 0),
            keterangan:        r['keterangan']        || '',
            createdBy:         r['createdby']         || r['created_by'] || '',
            createdAt:         r['createdat']         || r['created_at'] || '',
          }))
          .filter((e: RealisasiEntry) => e.jumlah > 0);

        setEntries(parsed);
      } else {
        setEntries([]);
      }
    } catch (err) {
      console.error('Error fetching realisasi:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const resp = await fetch(`${API_URL}?sheetName=${SHEET_PROYEK}`);
      const data = await resp.json();
      setProjects(mergeCapexProjects(data));
    } catch (err) {
      console.error('Error fetching projects:', err);
      setProjects(DEFAULT_CAPEX_PROJECTS);
    }
  };

  useEffect(() => { 
    fetchData(); 
    fetchProjects();
  }, []);

  /* ── add entry ── */
  const handleAdd = (akunDefault?: string) => {
    setEditingEntry(null);
    setFormData({
      akun: akunDefault || '1232101',
      deskripsiKegiatan: '',
      tanggal: new Date().toISOString().split('T')[0],
      jumlah: '',
      keterangan: '',
    });
    setShowModal(true);
  };

  /* ── edit entry ── */
  const handleEdit = (entry: RealisasiEntry) => {
    setEditingEntry(entry);
    setFormData({
      akun:              entry.akun,
      deskripsiKegiatan: entry.deskripsiKegiatan,
      tanggal:           entry.tanggal,
      jumlah:            String(entry.jumlah),
      keterangan:        entry.keterangan,
    });
    setShowModal(true);
  };

  const handleAddProject = () => {
    setEditingProjectDetails(null);
    setProjectForm({
      nama: '',
      deskripsi: '',
      owner: 'Sarpras',
      progress: 0,
    });
    setShowProjectFormModal(true);
  };

  const handleEditProjectDetails = (project: CapexProjectRecord) => {
    setEditingProjectDetails(project);
    setProjectForm({
      nama: project.nama,
      deskripsi: project.deskripsi || '',
      owner: project.owner,
      progress: project.progress,
    });
    setShowProjectFormModal(true);
  };

  const handleEditProjectProgress = (project: CapexProjectRecord) => {
    setEditingProject(project);
    setProjectProgress(project.progress);
  };

  const handleCloseProjectFormModal = () => {
    if (isSavingProject) return;
    setEditingProjectDetails(null);
    setProjectForm({
      nama: '',
      deskripsi: '',
      owner: 'Sarpras',
      progress: 0,
    });
    setShowProjectFormModal(false);
  };

  const handleCloseProjectProgressModal = () => {
    if (isSavingProject) return;
    setEditingProject(null);
    setProjectProgress(0);
  };

  const handleSaveProjectDetails = async () => {
    if (!projectForm.nama.trim()) return;

    setIsSavingProject(true);
    const now = new Date().toISOString();
    const baseProject = editingProjectDetails;
    const savedProject: CapexProjectRecord = {
      id: baseProject?.id || getNextCapexProjectId(projects),
      nama: projectForm.nama.trim(),
      deskripsi: projectForm.deskripsi.trim(),
      owner: projectForm.owner.trim() || 'Sarpras',
      progress: baseProject ? baseProject.progress : projectForm.progress,
      lastUpdated: now,
      updatedBy: currentUser.nama,
    };

    const payload = {
      action: 'FINANCE_RECORD',
      sheetName: SHEET_PROYEK,
      sheet: SHEET_PROYEK,
      id: savedProject.id,
      ID: savedProject.id,
      nama: savedProject.nama,
      Nama: savedProject.nama,
      deskripsi: savedProject.deskripsi,
      Deskripsi: savedProject.deskripsi,
      owner: savedProject.owner,
      Owner: savedProject.owner,
      progress: savedProject.progress,
      Progress: savedProject.progress,
      lastUpdated: savedProject.lastUpdated,
      LastUpdated: savedProject.lastUpdated,
      updatedBy: savedProject.updatedBy,
      UpdatedBy: savedProject.updatedBy,
    };

    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload),
      });
      if (baseProject) {
        setProjects((prev) => prev.map((project) => (
          project.id === baseProject.id ? savedProject : project
        )));
      } else {
        setProjects((prev) => [...prev, savedProject]);
      }
      handleCloseProjectFormModal();
      setTimeout(fetchProjects, 3000);
    } catch {
      alert(baseProject ? 'Gagal memperbarui data pekerjaan. Periksa koneksi.' : 'Gagal menambahkan pekerjaan baru. Periksa koneksi.');
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleSaveProjectProgress = async () => {
    if (!editingProject) return;

    setIsSavingProject(true);
    const updatedBy = currentUser.nama;
    const lastUpdated = new Date().toISOString();
    const payload = {
      action: 'FINANCE_RECORD',
      sheetName: SHEET_PROYEK,
      sheet: SHEET_PROYEK,
      id: editingProject.id,
      ID: editingProject.id,
      nama: editingProject.nama,
      Nama: editingProject.nama,
      deskripsi: editingProject.deskripsi,
      Deskripsi: editingProject.deskripsi,
      owner: editingProject.owner,
      Owner: editingProject.owner,
      progress: projectProgress,
      Progress: projectProgress,
      lastUpdated,
      LastUpdated: lastUpdated,
      updatedBy,
      UpdatedBy: updatedBy,
    };

    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });
      setProjects((prev) =>
        prev.map((project) =>
          project.id === editingProject.id
            ? { ...project, progress: projectProgress, updatedBy, lastUpdated }
            : project
        )
      );
      handleCloseProjectProgressModal();
      setTimeout(fetchProjects, 3000);
    } catch {
      alert('Gagal menyimpan progres. Periksa koneksi.');
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleSave = async () => {
    if (!formData.deskripsiKegiatan.trim() || !formData.jumlah) return;
    setIsSubmitting(true);

    const isEdit  = !!editingEntry;
    const budget  = BUDGET_MASTER.find(b => b.akun === formData.akun);
    const savedEntry: RealisasiEntry = {
      id:                isEdit ? editingEntry!.id : `REAL-${Date.now()}`,
      akun:              formData.akun,
      deskripsiKegiatan: formData.deskripsiKegiatan.trim(),
      tanggal:           formData.tanggal,
      jumlah:            Number(formData.jumlah),
      keterangan:        formData.keterangan.trim(),
      createdBy:         isEdit ? editingEntry!.createdBy : currentUser.nama,
      createdAt:         isEdit ? editingEntry!.createdAt : new Date().toISOString(),
    };

    const payload = {
      action:              'FINANCE_RECORD',
      sheetName:           SHEET_REALISASI,
      sheet:               SHEET_REALISASI,
      id:                  savedEntry.id,
      ID:                  savedEntry.id,
      akun:                savedEntry.akun,
      Akun:                savedEntry.akun,
      deskripsiKegiatan:   savedEntry.deskripsiKegiatan,
      DeskripsiKegiatan:   savedEntry.deskripsiKegiatan,
      namaAkun:            budget?.deskripsi || '',
      NamaAkun:            budget?.deskripsi || '',
      tanggal:             savedEntry.tanggal,
      Tanggal:             savedEntry.tanggal,
      jumlah:              savedEntry.jumlah,
      Jumlah:              savedEntry.jumlah,
      keterangan:          savedEntry.keterangan,
      Keterangan:          savedEntry.keterangan,
      createdBy:           savedEntry.createdBy,
      CreatedBy:           savedEntry.createdBy,
      createdAt:           savedEntry.createdAt,
      CreatedAt:           savedEntry.createdAt,
    };

    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });

      if (isEdit) {
        setEntries(prev => prev.map(e => e.id === savedEntry.id ? savedEntry : e));
      } else {
        setEntries(prev => [savedEntry, ...prev]);
      }
      setShowModal(false);
      setEditingEntry(null);
      setTimeout(fetchData, 3000);
    } catch {
      alert('Gagal menyimpan. Periksa koneksi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── delete entry ── */
  const handleDelete = async (entry: RealisasiEntry) => {
    if (!confirm(`Hapus realisasi "${entry.deskripsiKegiatan}" sebesar ${fmtIDR(entry.jumlah)}?`)) return;
    setDeletingId(entry.id);
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action:    'DELETE_RECORD',
          sheetName: SHEET_REALISASI,
          id:        entry.id,
          ID:        entry.id,
        }),
      });
      setEntries(prev => prev.filter(e => e.id !== entry.id));
      setTimeout(fetchData, 3000);
    } catch {
      alert('Gagal menghapus. Coba lagi.');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleRow = (id: string) =>
    setExpandedRows(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  /* ════════════════════════════════════════ RENDER ════════════════════════════════════════ */
  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>

      {/* ── Header ── */}
      <div className="flex-row-responsive" style={{ marginBottom: '2rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)', borderRadius: '10px', display: 'flex' }}>
              <Target size={22} />
            </div>
            <h1 className="page-title gradient-text" style={{ margin: 0 }}>Monitor Anggaran CAPEX</h1>
          </div>
          <p className="page-subtitle" style={{ margin: 0 }}>
            RKA Investasi Tahun 2026 — Yayasan Pendidikan Telkom / SMK Telkom Malang
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Disahkan: 5 Desember 2025</span>
            <span>•</span>
            <span style={{ color: 'var(--accent-emerald)' }}>{entries.length} entri realisasi tercatat</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button className="btn btn-outline" onClick={fetchData}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <RefreshCw size={16} /><span className="mobile-hide">Refresh</span>
          </button>
          {canUpdate && (
            <button className="btn btn-primary" onClick={() => handleAdd()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <Plus size={16} /><span className="mobile-hide">Tambah Realisasi</span><span className="mobile-show" style={{ display:'none' }}>+</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        {[
          { title: 'Total Anggaran CAPEX',  value: fmtIDR(totalAnggaran),  sub: 'Tangible Asset 2026',           icon: DollarSign, color: 'var(--accent-blue)' },
          { title: 'Total Terserap',         value: fmtIDR(totalRealisasi), sub: `${totalPct.toFixed(1)}% dari total anggaran`, icon: TrendingUp,  color: 'var(--accent-emerald)' },
          { title: 'Sisa Anggaran',          value: fmtIDR(sisaTotal),      sub: 'Belum terserap',                icon: AlertTriangle, color: '#f59e0b' },
          { title: 'Total Keterserapan',     value: `${totalPct.toFixed(1)}%`, sub: totalPct === 0 ? '⚠ Belum ada realisasi' : totalPct >= 80 ? '✅ Sangat Baik' : '📊 Sedang Berjalan', icon: BarChart3, color: clr(totalPct) },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className={`glass-panel stat-card delay-${(i+1)*100}`} style={{ padding: '1.25rem' }}>
              <div className="stat-header">
                <span className="stat-title" style={{ fontSize: '0.7rem' }}>{s.title}</span>
                <div className="stat-icon-wrapper" style={{ background: `${s.color}20`, color: s.color, padding: '6px' }}>
                  <Icon size={16} />
                </div>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <div className="stat-value" style={{ fontSize: '1.3rem', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{s.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Overall Progress ── */}
      <div className="glass-panel delay-100" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={18} color="var(--accent-blue)" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Progres Keterserapan Total</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: clr(totalPct) }}>{totalPct.toFixed(2)}%</span>
        </div>
        <div style={{ position: 'relative', height: '16px', background: 'rgba(120,120,120,0.18)', borderRadius: '100px', overflow: 'hidden', border: '1px solid rgba(120,120,120,0.12)' }}>
          <div style={{
            height: '100%', width: `${totalPct}%`,
            background: 'linear-gradient(90deg, #d97706, #f59e0b)',
            borderRadius: '100px', transition: 'width 1.2s ease',
            boxShadow: totalPct > 0 ? '0 0 12px #f59e0b60' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end'
          }}>
            {totalPct >= 12 && (
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'white', paddingRight: '8px', whiteSpace: 'nowrap', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                {totalPct.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          <span>0% — Belum terserap</span>
          <span style={{ color: 'var(--accent-emerald)' }}>Target: 100%</span>
        </div>
      </div>

      {/* ── Tab selector ── */}
      <div className="glass-panel" style={{ padding: '0.4rem', marginBottom: '1.5rem', display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.03)' }}>
        {([['cards','Per Akun (Detail)'], ['table','Tabel Rekap RKA'], ['projek', 'Progres Proyek']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            style={{
              flex: 1, padding: '0.65rem', borderRadius: '8px', border: 'none',
              background: activeTab === key ? 'var(--accent-blue)' : 'transparent',
              color: activeTab === key ? 'white' : 'var(--text-secondary)',
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.25s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
            }}>
            {key === 'cards' ? <Target size={15}/> : key === 'table' ? <BarChart3 size={15}/> : <Briefcase size={15}/>}
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════ TAB: PROJEK ══════════════ */}
      {activeTab === 'projek' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Pekerjaan CAPEX</div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-blue)', background: 'var(--accent-blue-ghost)', padding: '0.2rem 0.55rem', borderRadius: '999px' }}>
                  {projects.length} pekerjaan
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Koordinator Sarpras dan pimpinan bisa menambahkan pekerjaan baru, lalu progresnya tetap diupdate mingguan.
              </div>
            </div>
            {canUpdate && (
              <button
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}
                onClick={handleAddProject}
              >
                <Plus size={16} />
                Tambah Pekerjaan
              </button>
            )}
          </div>

          {/* Grafik Proyek */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
             <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
               <BarChart3 size={18} color="var(--accent-blue)" /> Grafik Penyelesaian Proyek CAPEX
             </h3>
             <div style={{ width: '100%', height: '320px' }}>
                <ResponsiveContainer>
                  <BarChart data={projects.slice().sort((a,b)=> b.progress - a.progress)} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} stroke="var(--text-muted)" fontSize={11} tickFormatter={v => `${v}%`} />
                    <YAxis dataKey="nama" type="category" width={180} stroke="var(--text-muted)" fontSize={10} tickFormatter={(val) => val.length > 25 ? val.substring(0, 25) + '...' : val} />
                    <RechartsTooltip formatter={(v: any) => [`${v}%`, 'Progres']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-focus)', borderRadius: '8px' }} />
                    <Bar dataKey="progress" radius={[0, 4, 4, 0]} barSize={20}>
                      {projects.map((ent, idx) => (
                        <Cell key={`cell-${idx}`} fill={ent.progress >= 100 ? '#10b981' : ent.progress >= 50 ? '#3b82f6' : '#f59e0b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* List Proyek */}
          <div className="table-container glass-panel">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', width: '72px' }}>No.</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Daftar Pekerjaan / Pengadaan</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', width: '280px' }}>Deskripsi</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', width: '250px' }}>Progres</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', width: '220px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((prj, idx) => (
                  <tr key={prj.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} className="hover-bg">
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '34px', height: '34px', borderRadius: '999px', background: 'rgba(59,130,246,0.14)', color: 'var(--accent-blue)', fontWeight: 800, fontSize: '0.82rem' }}>
                        {idx + 1}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{prj.nama}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        <span>{prj.owner}</span>
                        <span>•</span>
                        <span>Updated: {prj.lastUpdated ? fmtDate(prj.lastUpdated) : '-'} oleh {prj.updatedBy}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                      {prj.deskripsi ? prj.deskripsi : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum ada deskripsi</span>}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: prj.progress >= 100 ? 'var(--accent-emerald)' : 'var(--text-primary)' }}>
                        <span>{prj.progress}%</span>
                        {prj.progress >= 100 && <CheckCircle size={14} color="var(--accent-emerald)" />}
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${prj.progress}%`, background: prj.progress >= 100 ? 'var(--accent-emerald)' : 'var(--accent-blue)', transition: 'width 0.5s ease' }}></div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {canUpdate && (
                          <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={() => handleEditProjectDetails(prj)}>
                            <Edit3 size={13} />
                            <span style={{ marginLeft: '0.35rem' }}>Edit</span>
                          </button>
                        )}
                        {canUpdateProject && (
                          <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={() => handleEditProjectProgress(prj)}>
                            Update Progres
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════ TAB: CARDS ══════════════ */}
      {activeTab === 'cards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          {BUDGET_MASTER.map((budget, idx) => {
            const real       = realisasiByAkun(budget.akun);
            const sisa       = budget.anggaran - real;
            const p          = pct(real, budget.anggaran);
            const sc         = clr(p);
            const { label: stLabel, Icon: StIcon } = stat(p);
            const IconComp   = ACCOUNT_ICONS[budget.akun] || Building2;
            const ac         = ACCOUNT_COLORS[budget.akun] || 'var(--accent-blue)';
            const txList     = entriesByAkun(budget.akun);
            const isExpanded = expandedRows.has(budget.id);

            return (
              <div key={budget.id}
                className={`glass-panel delay-${(idx+1)*100}`}
                style={{ padding: 0, overflow: 'hidden', border: `1px solid ${ac}30`, transition: 'all 0.3s ease' }}>

                {/* Card Header */}
                <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', background: isExpanded ? `${ac}08` : 'transparent' }}
                  onClick={() => toggleRow(budget.id)}>

                  <div style={{ padding: '0.6rem', background: `${ac}20`, color: ac, borderRadius: '10px', display: 'flex', flexShrink: 0 }}>
                    <IconComp size={20} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', background: `${ac}20`, color: ac, padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                        {budget.akun}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{budget.deskripsi}</span>
                      {txList.length > 0 && (
                        <span style={{ fontSize: '0.7rem', background: `${ac}15`, color: ac, padding: '1px 8px', borderRadius: '20px' }}>
                          {txList.length} transaksi
                        </span>
                      )}
                    </div>
                    {/* Progress bar with label */}
                    <div style={{ marginTop: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          Terserap: <strong style={{ color: sc }}>{fmtShort(real)}</strong>
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          Sisa: {fmtShort(sisa)}
                        </span>
                      </div>
                      <div style={{ position: 'relative', height: '10px', background: 'rgba(120,120,120,0.18)', borderRadius: '100px', overflow: 'hidden', border: '1px solid rgba(120,120,120,0.1)' }}>
                        <div style={{
                          height: '100%',
                          width: `${p}%`,
                          background: p === 0 ? 'transparent' : 'linear-gradient(90deg, #d97706, #f59e0b)',
                          borderRadius: '100px',
                          transition: 'width 1.2s ease',
                          boxShadow: p > 0 ? '0 0 8px #f59e0b60' : 'none'
                        }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: ac }}>{fmtShort(budget.anggaran)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Anggaran 2026</div>
                  </div>

                  <div style={{ padding: '0.4rem 0.75rem', background: `${sc}20`, color: sc, borderRadius: '20px', fontSize: '0.85rem', fontWeight: 800, flexShrink: 0, minWidth: '56px', textAlign: 'center' }}>
                    {p.toFixed(1)}%
                  </div>
                  <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                    {isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px solid var(--border-subtle)', background: `${ac}05` }}>

                    {/* Mini stats */}
                    <div style={{ paddingTop: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                      {[
                        { label: 'Anggaran Ditetapkan', val: fmtIDR(budget.anggaran), color: ac },
                        { label: 'Total Terserap',       val: fmtIDR(real),             color: 'var(--accent-emerald)' },
                        { label: 'Sisa Anggaran',        val: fmtIDR(sisa),             color: 'var(--accent-rose)' },
                      ].map((s, i) => (
                        <div key={i} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: s.color }}>{s.val}</div>
                        </div>
                      ))}
                      <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: sc, fontWeight: 700, fontSize: '0.9rem' }}>
                          <StIcon size={15}/> {stLabel}
                        </div>
                      </div>
                    </div>

                    {/* Transaction list */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Receipt size={15} color={ac}/> Riwayat Realisasi
                        </span>
                        {canUpdate && (
                          <button className="btn btn-primary"
                            onClick={(e) => { e.stopPropagation(); handleAdd(budget.akun); }}
                            style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Plus size={13}/> Tambah
                          </button>
                        )}
                      </div>

                      {txList.length === 0 ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px dashed var(--border-subtle)' }}>
                          Belum ada realisasi dicatat untuk akun ini.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '320px', overflowY: 'auto' }}>
                          {txList.map((tx, ti) => (
                            <div key={tx.id}
                              style={{ padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', border: `1px solid ${ac}18` }}>
                              <div style={{ padding: '6px', background: `${ac}15`, borderRadius: '8px', flexShrink: 0, color: ac }}>
                                <FileText size={14}/>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                                  {tx.deskripsiKegiatan}
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                    <CalendarDays size={11}/> {fmtDate(tx.tanggal)}
                                  </span>
                                  {tx.keterangan && <span>• {tx.keterangan}</span>}
                                  <span>• {tx.createdBy.split(',')[0]}</span>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--accent-emerald)' }}>
                                  {fmtIDR(tx.jumlah)}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>#{ti + 1}</div>
                              </div>
                              {canUpdate && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEdit(tx); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', padding: '4px' }}
                                    title="Edit">
                                    <Edit3 size={13}/>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(tx); }}
                                    disabled={deletingId === tx.id}
                                    style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', padding: '4px', opacity: deletingId === tx.id ? 0.5 : 1 }}
                                    title="Hapus">
                                    {deletingId === tx.id ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={13}/>}
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════ TAB: TABLE ══════════════ */}
      {activeTab === 'table' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Summary table */}
          <div className="glass-panel delay-100">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <BarChart3 size={18} color="var(--accent-blue)"/>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Rekap RKA Investasi 2026</h3>
              <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Yayasan Pendidikan Telkom — SMK Telkom Malang</span>
            </div>
            <div className="table-container">
              {loading ? (
                <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)' }}>
                  <Loader2 className="animate-spin" size={20}/> Memuat data anggaran...
                </div>
              ) : (
                <table>
                  <thead>
                    <tr style={{ background: 'rgba(59,130,246,0.12)' }}>
                      <th style={{ width: '100px' }}>AKUN</th>
                      <th>DESKRIPSI</th>
                      <th style={{ textAlign: 'right' }}>ANGGARAN 2026</th>
                      <th style={{ textAlign: 'right' }}>REALISASI</th>
                      <th style={{ textAlign: 'right' }}>SISA</th>
                      <th style={{ textAlign: 'center', width: '110px' }}>SERAPAN</th>
                      <th style={{ textAlign: 'center', width: '70px' }}>TRX</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: 'rgba(30,144,255,0.08)' }}>
                      <td colSpan={2} style={{ fontWeight: 800, color: 'var(--accent-blue)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TANGIBLE ASSET</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-blue)' }}>{fmtIDR(totalAnggaran)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-emerald)' }}>{fmtIDR(totalRealisasi)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-rose)' }}>{fmtIDR(sisaTotal)}</td>
                      <td style={{ textAlign: 'center', fontWeight: 800 }}><span style={{ color: clr(totalPct) }}>{totalPct.toFixed(2)}%</span></td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>{entries.length}</td>
                    </tr>
                    {BUDGET_MASTER.map(b => {
                      const r  = realisasiByAkun(b.akun);
                      const si = b.anggaran - r;
                      const p  = pct(r, b.anggaran);
                      const tx = entriesByAkun(b.akun).length;
                      const ac = ACCOUNT_COLORS[b.akun];
                      return (
                        <tr className="ticket-row" key={b.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600, color: ac, fontSize: '0.85rem' }}>{b.akun}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{b.deskripsi}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtIDR(b.anggaran)}</td>
                          <td style={{ textAlign: 'right', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                            {r > 0 ? fmtIDR(r) : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--accent-rose)', fontWeight: 600 }}>{fmtIDR(si)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: clr(p) }}>{p.toFixed(1)}%</span>
                              <div style={{ height: '4px', width: '60px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${p}%`, background: clr(p), borderRadius: '4px' }} />
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: tx > 0 ? ac : 'var(--text-muted)' }}>{tx}</span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: 'rgba(30,144,255,0.08)', borderTop: '2px solid var(--accent-blue-ghost)' }}>
                      <td colSpan={2} style={{ fontWeight: 800, color: 'var(--accent-blue)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.05em' }}>TOTAL INVESTASI</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-blue)', fontSize: '1rem' }}>{fmtIDR(totalAnggaran)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-emerald)', fontSize: '1rem' }}>{fmtIDR(totalRealisasi)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-rose)', fontSize: '1rem' }}>{fmtIDR(sisaTotal)}</td>
                      <td style={{ textAlign: 'center', fontWeight: 800 }}><span style={{ color: clr(totalPct), fontSize: '1rem' }}>{totalPct.toFixed(2)}%</span></td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{entries.length}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* All transactions log */}
          <div className="glass-panel delay-200">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Receipt size={18} color="var(--accent-emerald)"/>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Semua Entri Realisasi</h3>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{entries.length} transaksi</span>
            </div>
            <div className="table-container">
              {entries.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Belum ada entri realisasi.{canUpdate && ' Klik "Tambah Realisasi" untuk mulai mencatat.'}
                </div>
              ) : (
                <table>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <th style={{ width: '95px' }}>TANGGAL</th>
                      <th style={{ width: '90px' }}>AKUN</th>
                      <th>DESKRIPSI KEGIATAN</th>
                      <th style={{ textAlign: 'right' }}>JUMLAH</th>
                      <th className="mobile-hide">DICATAT OLEH</th>
                      {canUpdate && <th style={{ width: '70px', textAlign: 'center' }}>AKSI</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {[...entries]
                      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
                      .map(tx => {
                        const ac = ACCOUNT_COLORS[tx.akun] || 'var(--accent-blue)';
                        const bName = BUDGET_MASTER.find(b => b.akun === tx.akun)?.deskripsi || tx.akun;
                        return (
                          <tr className="ticket-row" key={tx.id}>
                            <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmtDate(tx.tanggal)}</td>
                            <td>
                              <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: `${ac}18`, color: ac, padding: '2px 6px', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                {tx.akun}
                              </span>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>{bName}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 500 }}>{tx.deskripsiKegiatan}</div>
                              {tx.keterangan && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{tx.keterangan}</div>}
                            </td>
                            <td style={{ textAlign: 'right', color: 'var(--accent-emerald)', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtIDR(tx.jumlah)}</td>
                            <td className="mobile-hide" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{tx.createdBy.split(',')[0]}</td>
                            {canUpdate && (
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                                  <button onClick={() => handleEdit(tx)}
                                    style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', padding: '4px' }}
                                    title="Edit">
                                    <Edit3 size={14}/>
                                  </button>
                                  <button onClick={() => handleDelete(tx)} disabled={deletingId === tx.id}
                                    style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', padding: '4px', opacity: deletingId === tx.id ? 0.5 : 1 }}
                                    title="Hapus">
                                    {deletingId === tx.id ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Info note for non-pimpinan ── */}
      {!canUpdate && (
        <div style={{ padding: '1rem 1.25rem', background: 'rgba(59,130,246,0.08)', border: '1px solid var(--accent-blue-ghost)', borderRadius: '12px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
          <AlertTriangle size={18} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: '1px' }}/>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Mode Baca Saja</strong><br />
            Pencatatan realisasi anggaran CAPEX hanya dapat dilakukan oleh <strong>Pimpinan / Approver</strong> atau <strong>Koordinator Sarpras</strong>.
          </div>
        </div>
      )}

      {/* ══════════════ MODAL: Tambah Realisasi ══════════════ */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '1rem', paddingTop: '5rem', overflowY: 'auto' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', border: `1px solid ${ACCOUNT_COLORS[formData.akun] || 'var(--accent-blue-ghost)'}40` }}>

            {/* Modal Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  {editingEntry
                    ? <><Edit3 size={20} color="var(--accent-blue)"/> Edit Realisasi</>
                    : <><Plus  size={20} color="var(--accent-blue)"/> Tambah Entri Realisasi</>}
                </h2>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {editingEntry
                    ? `Mengubah entri: ${editingEntry.deskripsiKegiatan}`
                    : 'Setiap entri menambah serapan anggaran akun yang dipilih'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={22}/>
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

              {/* Akun selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Akun Anggaran</label>
                <select value={formData.akun} onChange={e => setFormData({ ...formData, akun: e.target.value })}
                  disabled={!!editingEntry}
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.75rem', color: 'white', outline: 'none', fontSize: '0.9rem', opacity: editingEntry ? 0.6 : 1 }}>
                  {BUDGET_MASTER.map(b => (
                    <option key={b.akun} value={b.akun}>{b.akun} — {b.deskripsi} (sisa: {fmtShort(b.anggaran - realisasiByAkun(b.akun))})</option>
                  ))}
                </select>
                {editingEntry && <div style={{ marginTop: '0.3rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>⚠ Akun tidak bisa diubah saat edit</div>}
                {/* Remaining budget info */}
                <div style={{ marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Terserap: <strong style={{ color: 'var(--accent-emerald)' }}>{fmtIDR(realisasiByAkun(formData.akun))}</strong></span>
                  <span>Sisa: <strong style={{ color: 'var(--accent-rose)' }}>{fmtIDR(BUDGET_MASTER.find(b => b.akun === formData.akun)!.anggaran - realisasiByAkun(formData.akun))}</strong></span>
                </div>
              </div>

              {/* Deskripsi Kegiatan */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Deskripsi Kegiatan / Pembayaran <span style={{ color: 'var(--accent-rose)' }}>*</span></label>
                <input type="text" value={formData.deskripsiKegiatan}
                  onChange={e => setFormData({ ...formData, deskripsiKegiatan: e.target.value })}
                  placeholder="Contoh: Pembayaran termin 1 Gedung Workshop"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.8rem', color: 'white', outline: 'none', fontSize: '0.9rem' }}/>
              </div>

              {/* Tanggal & Jumlah side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Tanggal <span style={{ color: 'var(--accent-rose)' }}>*</span></label>
                  <input type="date" value={formData.tanggal}
                    onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.8rem', color: 'white', outline: 'none', fontSize: '0.9rem' }}/>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Jumlah (Rp) <span style={{ color: 'var(--accent-rose)' }}>*</span></label>
                  <input type="number" value={formData.jumlah}
                    onChange={e => setFormData({ ...formData, jumlah: e.target.value })}
                    placeholder="0" min={1}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.8rem', color: 'white', outline: 'none', fontSize: '0.9rem' }}/>
                </div>
              </div>

              {/* Live preview */}
              {Number(formData.jumlah) > 0 && (() => {
                const budget    = BUDGET_MASTER.find(b => b.akun === formData.akun)!;
                // When editing, exclude the old value from the base total
                const baseReal  = editingEntry
                  ? realisasiByAkun(formData.akun) - editingEntry.jumlah
                  : realisasiByAkun(formData.akun);
                const newReal   = baseReal + Number(formData.jumlah);
                const newPct    = pct(newReal, budget.anggaran);
                const label     = editingEntry ? 'Preview setelah diubah:' : 'Preview setelah ditambahkan:';
                return (
                  <div style={{ padding: '0.75rem 1rem', background: `${ACCOUNT_COLORS[formData.akun]}12`, border: `1px solid ${ACCOUNT_COLORS[formData.akun]}30`, borderRadius: '10px', fontSize: '0.8rem' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>{label}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Realisasi baru:</span>
                      <strong style={{ color: 'var(--accent-emerald)' }}>{fmtIDR(newReal)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Keterserapan:</span>
                      <strong style={{ color: clr(newPct) }}>{newPct.toFixed(2)}%</strong>
                    </div>
                  </div>
                );
              })()}

              {/* Keterangan */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Keterangan Tambahan</label>
                <textarea value={formData.keterangan}
                  onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                  placeholder="Opsional — nomor SPJ, nomor kontrak, dsb."
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.8rem', color: 'white', outline: 'none', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit' }}/>
              </div>

              {/* Recorded by */}
              <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Dicatat oleh: <strong style={{ color: 'var(--text-secondary)' }}>{currentUser.nama}</strong>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => setShowModal(false)} className="btn btn-outline" style={{ flex: 1 }}>Batal</button>
                <button onClick={handleSave}
                  disabled={isSubmitting || !formData.deskripsiKegiatan.trim() || !formData.jumlah}
                  className="btn btn-primary"
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
                  {isSubmitting ? 'Menyimpan...' : editingEntry ? 'Simpan Perubahan' : 'Simpan Realisasi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ══════════════ MODAL: UPDATE PROJECT ══════════════ */}
      {showProjectFormModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '1rem', paddingTop: '5rem', overflowY: 'auto' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '1.5rem', border: '1px solid var(--accent-blue-ghost)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>
                  {editingProjectDetails ? 'Edit Pekerjaan CAPEX' : 'Tambah Pekerjaan CAPEX Baru'}
                </h2>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {editingProjectDetails
                    ? 'Perbarui judul, deskripsi, atau unit penanggung jawab pekerjaan CAPEX.'
                    : 'Data baru akan langsung masuk ke daftar pekerjaan CAPEX dan bisa diupdate progresnya setelah tersimpan.'}
                </p>
              </div>
              <button onClick={handleCloseProjectFormModal} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.45rem', fontWeight: 600 }}>
                  Nama Pekerjaan / Pengadaan <span style={{ color: 'var(--accent-rose)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={projectForm.nama}
                  onChange={(e) => setProjectForm((prev) => ({ ...prev, nama: e.target.value }))}
                  placeholder="Contoh: Perbaikan saluran air halaman timur"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.8rem', color: 'white', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.45rem', fontWeight: 600 }}>
                  Deskripsi Pekerjaan
                </label>
                <textarea
                  value={projectForm.deskripsi}
                  onChange={(e) => setProjectForm((prev) => ({ ...prev, deskripsi: e.target.value }))}
                  placeholder="Contoh: Meliputi pembongkaran area lama, pengadaan material, dan finishing tahap awal."
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.8rem', color: 'white', outline: 'none', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.45rem', fontWeight: 600 }}>
                  Unit Penanggung Jawab
                </label>
                <input
                  type="text"
                  value={projectForm.owner}
                  onChange={(e) => setProjectForm((prev) => ({ ...prev, owner: e.target.value }))}
                  placeholder="Contoh: Sarpras"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.8rem', color: 'white', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              {!editingProjectDetails && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Progres Awal (%)</label>
                    <span style={{ fontWeight: 800, color: 'var(--accent-blue)', fontSize: '1rem' }}>{projectForm.progress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={projectForm.progress}
                    onChange={(e) => setProjectForm((prev) => ({ ...prev, progress: Number(e.target.value) }))}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>0% (Baru dibuat)</span>
                    <span>100% (Selesai)</span>
                  </div>
                </div>
              )}

              <div style={{ padding: '0.75rem 0.9rem', background: 'rgba(59,130,246,0.08)', border: '1px solid var(--accent-blue-ghost)', borderRadius: '10px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {editingProjectDetails
                  ? <>Perubahan data proyek akan tersimpan dengan riwayat update terbaru oleh <strong style={{ color: 'var(--text-primary)' }}>{currentUser.nama}</strong>.</>
                  : <>ID proyek akan dibuat otomatis saat disimpan. Dicatat oleh <strong style={{ color: 'var(--text-primary)' }}>{currentUser.nama}</strong>.</>}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={handleCloseProjectFormModal}>
                  Batal
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1.4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
                  onClick={handleSaveProjectDetails}
                  disabled={isSavingProject || !projectForm.nama.trim()}
                >
                  {isSavingProject ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {isSavingProject ? 'Menyimpan...' : editingProjectDetails ? 'Simpan Perubahan' : 'Simpan Pekerjaan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {editingProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '1rem', paddingTop: '5rem', overflowY: 'auto' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', border: '1px solid var(--accent-blue-ghost)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>Update Progres Mingguan</h2>
              <button onClick={handleCloseProjectProgressModal} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Pekerjaan / Pengadaan:</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.4' }}>{editingProject.nama}</div>
              {editingProject.deskripsi && (
                <div style={{ marginTop: '0.55rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {editingProject.deskripsi}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                 <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Progres Selesai (%)</label>
                 <span style={{ fontWeight: 800, color: 'var(--accent-blue)', fontSize: '1.1rem' }}>{projectProgress}%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input 
                  type="range" 
                  min="0" max="100" step="5" 
                  value={projectProgress} 
                  onChange={(e) => setProjectProgress(Number(e.target.value))}
                  style={{ flex: 1, cursor: 'pointer' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <span>0% (Mulai)</span>
                <span>100% (Selesai)</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={handleCloseProjectProgressModal}>Batal</button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onClick={handleSaveProjectProgress}
                disabled={isSavingProject}
              >
                {isSavingProject ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Simpan Progres
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CapexBudget;
