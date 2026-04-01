import { useState, useEffect } from 'react';
import {
  Building2, FlaskConical, BookOpen, Monitor, TrendingUp, Edit3, X,
  Save, Loader2, RefreshCw, AlertTriangle, CheckCircle, Clock, BarChart3,
  ChevronDown, ChevronRight, DollarSign, Target, Activity
} from 'lucide-react';
import { getCurrentUser, ROLES } from '../data/organization';

const API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";
const SHEET_NAME = 'Capex_Budget';

interface CapexItem {
  id: string;
  akun: string;
  deskripsi: string;
  anggaran: number;
  realisasi: number;
  keterangan: string;
  updatedAt: string;
  updatedBy: string;
}

// Static RKA data from the official document
const INITIAL_CAPEX_DATA: CapexItem[] = [
  {
    id: 'CAPEX-1232101',
    akun: '1232101',
    deskripsi: 'Gedung dan Bangunan',
    anggaran: 3128087702,
    realisasi: 0,
    keterangan: '',
    updatedAt: '',
    updatedBy: ''
  },
  {
    id: 'CAPEX-1233101',
    akun: '1233101',
    deskripsi: 'SarPen Laboratorium',
    anggaran: 700576820,
    realisasi: 0,
    keterangan: '',
    updatedAt: '',
    updatedBy: ''
  },
  {
    id: 'CAPEX-1233201',
    akun: '1233201',
    deskripsi: 'Sarana Pendidikan',
    anggaran: 731701609,
    realisasi: 0,
    keterangan: '',
    updatedAt: '',
    updatedBy: ''
  },
  {
    id: 'CAPEX-1234101',
    akun: '1234101',
    deskripsi: 'Inventaris Kantor',
    anggaran: 2885730,
    realisasi: 0,
    keterangan: '',
    updatedAt: '',
    updatedBy: ''
  }
];

const ACCOUNT_ICONS: Record<string, any> = {
  '1232101': Building2,
  '1233101': FlaskConical,
  '1233201': BookOpen,
  '1234101': Monitor
};

const ACCOUNT_COLORS: Record<string, string> = {
  '1232101': 'var(--accent-blue)',
  '1233101': 'var(--accent-violet)',
  '1233201': 'var(--accent-emerald)',
  '1234101': 'var(--accent-rose)'
};

const CapexBudget = () => {
  const [items, setItems] = useState<CapexItem[]>(INITIAL_CAPEX_DATA);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CapexItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    realisasi: '',
    keterangan: ''
  });

  const currentUser = getCurrentUser();
  const isPimpinan = currentUser.roleAplikasi === ROLES.PIMPINAN;
  const canUpdate = isPimpinan;

  const formatIDR = (val: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);

  const formatShortIDR = (val: number) => {
    if (val >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(2)}M`;
    if (val >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1)}jt`;
    return formatIDR(val);
  };

  const getAbsorptionPercent = (realisasi: number, anggaran: number) => {
    if (anggaran === 0) return 0;
    return Math.min((realisasi / anggaran) * 100, 100);
  };

  const getStatusColor = (pct: number) => {
    if (pct >= 80) return 'var(--accent-emerald)';
    if (pct >= 40) return 'var(--accent-blue)';
    if (pct >= 10) return 'var(--accent-amber, #f59e0b)';
    return 'var(--accent-rose)';
  };

  const getStatusLabel = (pct: number) => {
    if (pct >= 80) return { label: 'Sangat Baik', icon: CheckCircle };
    if (pct >= 40) return { label: 'Berjalan', icon: Activity };
    if (pct >= 10) return { label: 'Awal', icon: Clock };
    return { label: 'Belum Terserap', icon: AlertTriangle };
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}?sheetName=${SHEET_NAME}`);
      const data = await resp.json();

      if (data && Array.isArray(data) && data.length > 0) {
        // Normalize keys to lowercase for robust matching
        const normalize = (row: any): Record<string, any> => {
          const out: Record<string, any> = {};
          Object.keys(row).forEach(k => { out[k.toLowerCase()] = row[k]; });
          return out;
        };

        const merged = INITIAL_CAPEX_DATA.map(base => {
          const found = data
            .map(normalize)
            .find((d: any) =>
              d['id'] === base.id ||
              d['akun'] === base.akun
            );
          if (found) {
            return {
              ...base,
              realisasi: Number(found['realisasi'] ?? 0),
              keterangan: found['keterangan'] || '',
              updatedAt: found['updatedat'] || found['updated_at'] || '',
              updatedBy: found['updatedby'] || found['updated_by'] || ''
            };
          }
          return base;
        });
        setItems(merged);
      }
    } catch (err) {
      console.error('Error fetching CAPEX data:', err);
      // Keep static data on error
    } finally {
      setLoading(false);
    }
  };

  const handleEditRealisasi = (item: CapexItem) => {
    setEditingItem(item);
    setFormData({
      realisasi: String(item.realisasi),
      keterangan: item.keterangan
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingItem) return;
    setIsSubmitting(true);

    const updatedItem: CapexItem = {
      ...editingItem,
      realisasi: Number(formData.realisasi),
      keterangan: formData.keterangan,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.nama
    };

    const payload = {
      action: 'FINANCE_RECORD',
      sheetName: SHEET_NAME,
      sheet: SHEET_NAME,
      id: updatedItem.id,
      ID: updatedItem.id,
      akun: updatedItem.akun,
      Akun: updatedItem.akun,
      deskripsi: updatedItem.deskripsi,
      Deskripsi: updatedItem.deskripsi,
      anggaran: updatedItem.anggaran,
      Anggaran: updatedItem.anggaran,
      realisasi: updatedItem.realisasi,
      Realisasi: updatedItem.realisasi,
      keterangan: updatedItem.keterangan,
      Keterangan: updatedItem.keterangan,
      updatedAt: updatedItem.updatedAt,
      UpdatedAt: updatedItem.updatedAt,
      updatedBy: updatedItem.updatedBy,
      UpdatedBy: updatedItem.updatedBy
    };

    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });

      // Update local state immediately for UX
      setItems(prev =>
        prev.map(it => (it.id === updatedItem.id ? updatedItem : it))
      );
      setShowModal(false);
      setEditingItem(null);

      // Re-fetch after 3s to confirm DB sync
      setTimeout(fetchData, 3000);
    } catch (err) {
      console.error('Error saving CAPEX data:', err);
      alert('Gagal menyimpan data. Periksa koneksi internet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAnggaran = items.reduce((s, i) => s + i.anggaran, 0);
  const totalRealisasi = items.reduce((s, i) => s + i.realisasi, 0);
  const totalPct = getAbsorptionPercent(totalRealisasi, totalAnggaran);
  const sisaAnggaran = totalAnggaran - totalRealisasi;

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Header */}
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
            <span>Dokumen: Rekana Kerja dan Anggaran (RKA) Investasi</span>
            <span>•</span>
            <span>Disahkan: 5 Desember 2025</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button
            className="btn btn-outline"
            onClick={fetchData}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
            title="Refresh data"
          >
            <RefreshCw size={16} />
            <span className="mobile-hide">Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        {[
          {
            title: 'Total Anggaran CAPEX',
            value: formatIDR(totalAnggaran),
            sub: 'Tangible Asset 2026',
            icon: DollarSign,
            color: 'var(--accent-blue)'
          },
          {
            title: 'Realisasi / Terserap',
            value: formatIDR(totalRealisasi),
            sub: `${totalPct.toFixed(1)}% dari total anggaran`,
            icon: TrendingUp,
            color: 'var(--accent-emerald)'
          },
          {
            title: 'Sisa Anggaran',
            value: formatIDR(sisaAnggaran),
            sub: 'Belum terserap',
            icon: AlertTriangle,
            color: 'var(--accent-amber, #f59e0b)'
          },
          {
            title: 'Keterserapan',
            value: `${totalPct.toFixed(1)}%`,
            sub: totalPct === 0 ? '⚠ Belum ada realisasi' : totalPct >= 80 ? '✅ Sangat Baik' : '📊 Sedang Berjalan',
            icon: BarChart3,
            color: getStatusColor(totalPct)
          }
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`glass-panel stat-card delay-${(i + 1) * 100}`} style={{ padding: '1.25rem' }}>
              <div className="stat-header">
                <span className="stat-title" style={{ fontSize: '0.7rem' }}>{stat.title}</span>
                <div className="stat-icon-wrapper" style={{ background: `${stat.color}20`, color: stat.color, padding: '6px' }}>
                  <Icon size={16} />
                </div>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <div className="stat-value" style={{ fontSize: '1.3rem', color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{stat.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall Progress Bar */}
      <div className="glass-panel delay-100" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={18} color="var(--accent-blue)" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Progres Keterserapan Total</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: getStatusColor(totalPct) }}>
            {totalPct.toFixed(2)}%
          </span>
        </div>
        <div style={{ height: '12px', background: 'rgba(255,255,255,0.06)', borderRadius: '100px', overflow: 'hidden', position: 'relative' }}>
          <div style={{
            height: '100%',
            width: `${totalPct}%`,
            background: `linear-gradient(90deg, ${getStatusColor(totalPct)}, ${getStatusColor(totalPct)}99)`,
            borderRadius: '100px',
            transition: 'width 1s ease',
            boxShadow: `0 0 12px ${getStatusColor(totalPct)}60`
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          <span>0%</span>
          <span style={{ color: 'var(--accent-emerald)' }}>Target: 100%</span>
        </div>
      </div>

      {/* Account Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        {items.map((item, idx) => {
          const pct = getAbsorptionPercent(item.realisasi, item.anggaran);
          const statusColor = getStatusColor(pct);
          const { label: statusLabel, icon: StatusIcon } = getStatusLabel(pct);
          const IconComp = ACCOUNT_ICONS[item.akun] || Building2;
          const accentColor = ACCOUNT_COLORS[item.akun] || 'var(--accent-blue)';
          const sisa = item.anggaran - item.realisasi;
          const isExpanded = expandedRows.has(item.id);

          return (
            <div
              key={item.id}
              className={`glass-panel delay-${(idx + 1) * 100}`}
              style={{
                padding: 0,
                overflow: 'hidden',
                border: `1px solid ${accentColor}30`,
                transition: 'all 0.3s ease'
              }}
            >
              {/* Row header */}
              <div
                style={{
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  cursor: 'pointer',
                  background: isExpanded ? `${accentColor}08` : 'transparent'
                }}
                onClick={() => toggleRow(item.id)}
              >
                {/* Icon */}
                <div style={{
                  padding: '0.6rem',
                  background: `${accentColor}20`,
                  color: accentColor,
                  borderRadius: '10px',
                  display: 'flex',
                  flexShrink: 0
                }}>
                  <IconComp size={20} />
                </div>

                {/* Account info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', background: `${accentColor}20`, color: accentColor, padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      {item.akun}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{item.deskripsi}</span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ marginTop: '0.6rem' }}>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '100px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${statusColor}, ${statusColor}cc)`,
                        borderRadius: '100px',
                        transition: 'width 1s ease'
                      }} />
                    </div>
                  </div>
                </div>

                {/* Numbers */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: accentColor }}>
                    {formatShortIDR(item.anggaran)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Anggaran 2026
                  </div>
                </div>

                {/* Percent badge */}
                <div style={{
                  padding: '0.4rem 0.75rem',
                  background: `${statusColor}20`,
                  color: statusColor,
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  flexShrink: 0,
                  minWidth: '56px',
                  textAlign: 'center'
                }}>
                  {pct.toFixed(1)}%
                </div>

                {/* Chevron */}
                <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{
                  padding: '0 1.5rem 1.5rem',
                  borderTop: '1px solid var(--border-subtle)',
                  background: `${accentColor}05`
                }}>
                  <div style={{ paddingTop: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    {/* Anggaran */}
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Anggaran Ditetapkan</div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: accentColor }}>{formatIDR(item.anggaran)}</div>
                    </div>
                    {/* Realisasi */}
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Realisasi / Terserap</div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-emerald)' }}>{formatIDR(item.realisasi)}</div>
                    </div>
                    {/* Sisa */}
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sisa Anggaran</div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-rose)' }}>{formatIDR(sisa)}</div>
                    </div>
                    {/* Status */}
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: statusColor, fontWeight: 700, fontSize: '0.9rem' }}>
                        <StatusIcon size={16} />
                        {statusLabel}
                      </div>
                    </div>
                  </div>

                  {/* Keterangan */}
                  {item.keterangan && (
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Catatan: </span>
                      {item.keterangan}
                    </div>
                  )}

                  {/* Update info */}
                  {item.updatedAt && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      Terakhir diperbarui: {formatDisplayDate(item.updatedAt)} oleh {item.updatedBy}
                    </div>
                  )}

                  {/* Edit button - only for Pimpinan */}
                  {canUpdate && (
                    <button
                      className="btn btn-primary"
                      onClick={(e) => { e.stopPropagation(); handleEditRealisasi(item); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
                    >
                      <Edit3 size={16} />
                      Update Realisasi
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Table Summary (like the reference document) */}
      <div className="glass-panel delay-400" style={{ marginBottom: '2rem' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <BarChart3 size={18} color="var(--accent-blue)" />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Rekap RKA Investasi 2026</h3>
          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Yayasan Pendidikan Telkom — SMK Telkom Malang
          </span>
        </div>
        <div className="table-container">
          {loading ? (
            <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)' }}>
              <Loader2 className="animate-spin" size={20} />
              Memuat data anggaran...
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
                  <th style={{ textAlign: 'center', width: '110px' }}>KETERSERAPAN</th>
                </tr>
              </thead>
              <tbody>
                {/* Category header */}
                <tr style={{ background: 'rgba(30,144,255,0.08)' }}>
                  <td colSpan={2} style={{ fontWeight: 800, color: 'var(--accent-blue)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    TANGIBLE ASSET
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-blue)' }}>{formatIDR(totalAnggaran)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-emerald)' }}>{formatIDR(totalRealisasi)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-rose)' }}>{formatIDR(sisaAnggaran)}</td>
                  <td style={{ textAlign: 'center', fontWeight: 800 }}>
                    <span style={{ color: getStatusColor(totalPct) }}>{totalPct.toFixed(2)}%</span>
                  </td>
                </tr>
                {items.map(item => {
                  const pct = getAbsorptionPercent(item.realisasi, item.anggaran);
                  const sisa = item.anggaran - item.realisasi;
                  return (
                    <tr className="ticket-row" key={item.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: ACCOUNT_COLORS[item.akun], fontSize: '0.85rem' }}>
                        {item.akun}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{item.deskripsi}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatIDR(item.anggaran)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                        {item.realisasi > 0 ? formatIDR(item.realisasi) : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--accent-rose)', fontWeight: 600 }}>{formatIDR(sisa)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: getStatusColor(pct) }}>
                            {pct.toFixed(1)}%
                          </span>
                          <div style={{ height: '4px', width: '60px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: getStatusColor(pct), borderRadius: '4px' }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {/* Total Footer */}
                <tr style={{ background: 'rgba(30,144,255,0.08)', borderTop: '2px solid var(--accent-blue-ghost)' }}>
                  <td colSpan={2} style={{ fontWeight: 800, color: 'var(--accent-blue)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                    TOTAL INVESTASI
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-blue)', fontSize: '1rem' }}>{formatIDR(totalAnggaran)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-emerald)', fontSize: '1rem' }}>{formatIDR(totalRealisasi)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-rose)', fontSize: '1rem' }}>{formatIDR(sisaAnggaran)}</td>
                  <td style={{ textAlign: 'center', fontWeight: 800 }}>
                    <span style={{ color: getStatusColor(totalPct), fontSize: '1rem' }}>{totalPct.toFixed(2)}%</span>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Info note for non-pimpinan */}
      {!canUpdate && (
        <div style={{
          padding: '1rem 1.25rem',
          background: 'rgba(59,130,246,0.08)',
          border: '1px solid var(--accent-blue-ghost)',
          borderRadius: '12px',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)'
        }}>
          <AlertTriangle size={18} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Mode Baca Saja</strong>
            <br />
            Pembaruan realisasi anggaran CAPEX hanya dapat dilakukan oleh <strong>Pimpinan / Approver / Executive Viewer</strong>.
            Hubungi Waka. Bidang IT, Lab., dan Sarpras untuk melakukan input realisasi.
          </div>
        </div>
      )}

      {/* Update Modal */}
      {showModal && editingItem && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '500px',
            border: `1px solid ${ACCOUNT_COLORS[editingItem.akun] || 'var(--accent-blue-ghost)'}40`
          }}>
            {/* Modal header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Edit3 size={20} color={ACCOUNT_COLORS[editingItem.akun] || 'var(--accent-blue)'} />
                  Update Realisasi Anggaran
                </h2>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span style={{ fontFamily: 'monospace', color: ACCOUNT_COLORS[editingItem.akun] }}>{editingItem.akun}</span> — {editingItem.deskripsi}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Anggaran info */}
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pagu / Anggaran Ditetapkan</span>
                <span style={{ fontWeight: 700, color: ACCOUNT_COLORS[editingItem.akun] || 'var(--accent-blue)' }}>
                  {formatIDR(editingItem.anggaran)}
                </span>
              </div>

              {/* Realisasi input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Jumlah Realisasi / Terserap (Rp)
                </label>
                <input
                  type="number"
                  value={formData.realisasi}
                  onChange={(e) => setFormData({ ...formData, realisasi: e.target.value })}
                  placeholder="0"
                  min={0}
                  max={editingItem.anggaran}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px', padding: '0.85rem',
                    color: 'white', outline: 'none', fontSize: '1rem'
                  }}
                />
                {Number(formData.realisasi) > 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--accent-emerald)' }}>
                    = {getAbsorptionPercent(Number(formData.realisasi), editingItem.anggaran).toFixed(2)}% terserap
                    ({formatIDR(editingItem.anggaran - Number(formData.realisasi))} sisa)
                  </div>
                )}
              </div>

              {/* Keterangan */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Catatan / Keterangan
                </label>
                <textarea
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  placeholder="Contoh: Pembayaran tahap 1 kontrak pembangunan Gedung X"
                  rows={3}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px', padding: '0.85rem',
                    color: 'white', outline: 'none',
                    fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Recorded by */}
              <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Diperbarui oleh: <strong style={{ color: 'var(--text-secondary)' }}>{currentUser.nama}</strong>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting || formData.realisasi === ''}
                  className="btn btn-primary"
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Realisasi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CapexBudget;
