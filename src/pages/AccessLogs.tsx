import { useEffect, useState } from 'react';
import { History, Search, RefreshCw, ShieldCheck, Clock, Shield } from 'lucide-react';
import { getCurrentUser, ROLES } from '../data/organization';
import { logButtonClick } from '../utils/logger';

const LOG_API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";

type AccessLogRecord = Record<string, string | number | null | undefined>;
type ActivityTone = 'emerald' | 'blue' | 'violet' | 'amber' | 'slate';

const pickValue = (log: AccessLogRecord, keys: string[]) => {
  for (const key of keys) {
    const value = log[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
};

const formatSourceLabel = (value: string) => {
  if (!value) return '';

  const normalized = value.toLowerCase();
  if (normalized === 'ui') return 'UI';
  if (normalized === 'auth') return 'Autentikasi';
  if (normalized === 'router') return 'Router';
  if (normalized === 'sidebar') return 'Sidebar';

  return value.charAt(0).toUpperCase() + value.slice(1);
};

const getActivityPresentation = (log: AccessLogRecord) => {
  const eventType = pickValue(log, ['EventType', 'eventType']).toLowerCase();
  const pageName = pickValue(log, ['Page', 'page']);
  const menuName = pickValue(log, ['Menu', 'menu']);
  const detail = pickValue(log, ['Detail', 'detail']);
  const activity = pickValue(log, ['Aktivitas', 'Activity', 'aktivitas', 'activity']);
  const path = pickValue(log, ['Path', 'path']);
  const source = formatSourceLabel(pickValue(log, ['Source', 'source']));
  const device = pickValue(log, ['Device', 'device']);

  const metaParts = [pageName, path, source, device].filter(Boolean);

  if (eventType === 'menu_click') {
    return {
      label: activity || `Klik menu ${menuName || pageName || 'Navigasi'}`,
      tone: 'blue' as ActivityTone,
      meta: metaParts.join(' • '),
    };
  }

  if (eventType === 'button_click') {
    return {
      label: activity || `Klik tombol ${detail || pageName || 'Aksi'}`,
      tone: 'violet' as ActivityTone,
      meta: [detail, ...metaParts].filter(Boolean).join(' • '),
    };
  }

  if (eventType === 'login') {
    return {
      label: activity || 'Login berhasil',
      tone: 'emerald' as ActivityTone,
      meta: [detail, ...metaParts].filter(Boolean).join(' • '),
    };
  }

  if (eventType === 'logout') {
    return {
      label: activity || 'Keluar dari aplikasi',
      tone: 'amber' as ActivityTone,
      meta: metaParts.join(' • '),
    };
  }

  if (eventType === 'page_view' || pageName) {
    return {
      label: activity || `Buka halaman ${pageName || 'Dashboard'}`,
      tone: 'emerald' as ActivityTone,
      meta: metaParts.join(' • '),
    };
  }

  return {
    label: activity || detail || 'Akses Berhasil',
    tone: 'slate' as ActivityTone,
    meta: [menuName, ...metaParts].filter(Boolean).join(' • '),
  };
};

const activityToneStyles: Record<ActivityTone, { color: string; glow: string }> = {
  emerald: { color: 'var(--accent-emerald)', glow: '0 0 8px var(--accent-emerald)' },
  blue: { color: 'var(--accent-blue)', glow: '0 0 8px var(--accent-blue)' },
  violet: { color: 'var(--accent-violet)', glow: '0 0 8px var(--accent-violet)' },
  amber: { color: '#f59e0b', glow: '0 0 8px rgba(245, 158, 11, 0.75)' },
  slate: { color: 'var(--text-secondary)', glow: '0 0 8px rgba(148, 163, 184, 0.55)' },
};

const AccessLogs = () => {
  const currentUser = getCurrentUser();
  const isPimpinan = currentUser.roleAplikasi === ROLES.PIMPINAN;

  const [logs, setLogs] = useState<AccessLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${LOG_API_URL}?sheetName=Log_Akses`);
      const data = await resp.json();
      if (data && Array.isArray(data)) {
        const validLogs = data.filter((item: AccessLogRecord) => item.Nama || item.nama);
        setLogs(validLogs.reverse());
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  const handleRefresh = () => {
    logButtonClick(currentUser, 'Sinkronisasi Data', 'Log Akses', 'Refresh data monitoring', '/logs');
    fetchLogs();
  };

  const filteredLogs = logs.filter((log) => {
    const searchableText = [
      pickValue(log, ['nama', 'Nama']),
      pickValue(log, ['roleAplikasi', 'Role']),
      pickValue(log, ['unit', 'Unit']),
      pickValue(log, ['jabatan', 'Jabatan']),
      pickValue(log, ['Aktivitas', 'Activity', 'aktivitas', 'activity']),
      pickValue(log, ['Page', 'page']),
      pickValue(log, ['Menu', 'menu']),
      pickValue(log, ['Detail', 'detail']),
      pickValue(log, ['Path', 'path']),
      pickValue(log, ['EventType', 'eventType']),
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(searchTerm.toLowerCase());
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) tableContainer.scrollTo(0, 0);
  };

  if (!isPimpinan) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center animate-fade-in" style={{ minHeight: '60vh' }}>
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <div style={{ position: 'absolute', inset: -10, background: 'var(--accent-rose)', opacity: 0.2, filter: 'blur(20px)', borderRadius: '50%' }}></div>
          <ShieldCheck size={64} className="gradient-text" style={{ position: 'relative' }} />
        </div>
        <h2 className="page-title gradient-text" style={{ fontSize: '1.75rem' }}>Akses Terbatas</h2>
        <p className="page-subtitle" style={{ maxWidth: '400px' }}>Halaman monitoring keamanan ini hanya dapat diakses oleh Level Pimpinan / Manajemen Strategis.</p>
        <button onClick={() => window.history.back()} className="btn btn-outline">Kembali</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div className="flex-row-responsive" style={{ marginBottom: '2.5rem', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title gradient-text" style={{ marginBottom: '0.25rem' }}>Monitoring Keamanan Sistem</h1>
          <p className="page-subtitle" style={{ margin: 0, opacity: 0.8 }}>Log aktifitas akses, perpindahan menu, dan aksi penting administrator unit.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            onClick={handleRefresh}
            className={`btn btn-outline ${loading ? 'opacity-50' : ''}`}
            disabled={loading}
            style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            <span className="mobile-hide">Sinkronisasi Data</span>
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="glass-panel stat-card delay-100" style={{ borderLeft: '4px solid var(--accent-blue)' }}>
          <div className="stat-header">
            <span className="stat-title">Total Rekaman Akses</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)' }}>
              <History size={20} />
            </div>
          </div>
          <div className="stat-value">{logs.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Database Terpusat Aktif</div>
        </div>

        <div className="glass-panel stat-card delay-200" style={{ borderLeft: '4px solid var(--accent-emerald)' }}>
          <div className="stat-header">
            <span className="stat-title">Terakhir Diperbarui</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-emerald-ghost)', color: 'var(--accent-emerald)' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.75rem' }}>
            {lastRefresh.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)', marginRight: '6px' }}></span>
            Koneksi Aktif
          </div>
        </div>

        <div className="glass-panel stat-card delay-300" style={{ borderLeft: '4px solid var(--accent-violet)' }}>
          <div className="stat-header">
            <span className="stat-title">Audit Status</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-violet-ghost)', color: 'var(--accent-violet)' }}>
              <Shield size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.75rem' }}>VERIFIED</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Enkripsi SSL & Apps Script Secure</p>
        </div>
      </div>

      <div className="glass-panel delay-300" style={{ padding: '1.25rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ position: 'relative', maxWidth: '500px' }}>
          <Search size={18} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '16px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, unit, menu, halaman, atau aktivitas..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="input-responsive"
            style={{
              width: '100%',
              paddingLeft: '3rem',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--border-subtle)',
              height: '46px',
              fontSize: '0.95rem'
            }}
          />
        </div>
      </div>

      <div className="glass-panel delay-400 table-container shadow-2xl" style={{ overflow: 'hidden', borderBottom: 'none', background: 'rgba(255,255,255,0.01)' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.4)' }}>
              <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', borderBottom: '2px solid var(--border-subtle)' }}>Identitas Personel</th>
              <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', borderBottom: '2px solid var(--border-subtle)' }}>Timestamp</th>
              <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', borderBottom: '2px solid var(--border-subtle)' }}>Aktifitas</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
                    <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Sinkronisasi Database Log...</p>
                  </div>
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
                  <Search size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                  <p>Tidak ada rekaman aktifitas akses untuk kata kunci tersebut.</p>
                </td>
              </tr>
            ) : currentLogs.map((log, idx) => {
              const activityInfo = getActivityPresentation(log);
              const activityStyle = activityToneStyles[activityInfo.tone];
              const logId = pickValue(log, ['ID', 'id']) || `#${logs.length - (indexOfFirstItem + idx)}`;
              const timestampMeta = [
                formatSourceLabel(pickValue(log, ['Source', 'source'])),
                pickValue(log, ['Device', 'device'])
              ].filter(Boolean).join(' • ') || 'Security Checkpoint';

              return (
                <tr
                  key={`${logId}-${idx}`}
                  className="ticket-row"
                  style={{
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                    transition: 'background 0.2s',
                    borderBottom: '1px solid var(--border-subtle)'
                  }}
                >
                  <td style={{ padding: '1.25rem 1.5rem', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', flexShrink: 0 }}>
                        <img
                          src={pickValue(log, ['ProfilePicture', 'profilePicture']) || `https://ui-avatars.com/api/?name=${encodeURIComponent(pickValue(log, ['nama', 'Nama']) || 'User')}&background=random&color=fff`}
                          alt={pickValue(log, ['nama', 'Nama']) || 'User'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(pickValue(log, ['nama', 'Nama']) || 'User')}&background=random&color=fff`;
                          }}
                        />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', marginBottom: '1px' }}>{pickValue(log, ['nama', 'Nama'])}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.8 }}>
                          {pickValue(log, ['unit', 'Unit'])} • {pickValue(log, ['jabatan', 'Jabatan'])}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '0.9rem' }}>
                        {pickValue(log, ['Timestamp', 'timestamp', 'Tanggal'])}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{timestampMeta}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: activityStyle.color, boxShadow: activityStyle.glow, marginTop: '0.45rem', flexShrink: 0 }}></div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: activityStyle.color }}>{activityInfo.label}</span>
                        {activityInfo.meta ? (
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{activityInfo.meta}</span>
                        ) : null}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: '4px', marginLeft: 'auto', alignSelf: 'center' }}>
                        {logId}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{
            padding: '1.5rem',
            background: 'rgba(255,255,255,0.02)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.5rem',
            borderTop: '1px solid var(--border-subtle)'
          }}>
            <button
              className="btn btn-outline"
              onClick={() => paginate(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              style={{ padding: '0.5rem 1rem', minWidth: 'auto', opacity: currentPage === 1 ? 0.4 : 1 }}
            >
              Prev
            </button>

            <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', padding: '0 0.5rem' }}>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => paginate(i + 1)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: 'none',
                    background: currentPage === i + 1 ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                    color: currentPage === i + 1 ? 'white' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {i + 1}
                </button>
              )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
            </div>

            <button
              className="btn btn-outline"
              onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              style={{ padding: '0.5rem 1rem', minWidth: 'auto', opacity: currentPage === totalPages ? 0.4 : 1 }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccessLogs;
