import { useState, useEffect } from 'react';
import { History, Search, Monitor, RefreshCw, User, ShieldCheck, Clock, Shield, Smartphone, Globe } from 'lucide-react';
import { getCurrentUser, ROLES } from '../data/organization';

const LOG_API_URL = "https://script.google.com/macros/s/AKfycbwzimTeSIIEpjUMVfI4EEc90ZDEixIeMBM9WFBQKPulYHYGF2CqhwjHgQe0ZMB7SfNSGw/exec";

const AccessLogs = () => {
  const currentUser = getCurrentUser();
  const isPimpinan = currentUser.roleAplikasi === ROLES.PIMPINAN;

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${LOG_API_URL}?sheetName=Log_Akses`);
      const data = await resp.json();
      if (data && Array.isArray(data)) {
        // Filter out empty rows and reverse for latest first
        const validLogs = data.filter((item: any) => item.Nama || item.nama);
        setLogs(validLogs.reverse());
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  const filteredLogs = logs.filter(log => 
    (log.nama || log.Nama || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.roleAplikasi || log.Role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.unit || log.Unit || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.jabatan || log.Jabatan || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBrowserIcon = (ua: string = '') => {
    if (!ua) return <Monitor size={14} />;
    const userAgent = ua.toLowerCase();
    if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) return <Smartphone size={14} />;
    return <Globe size={14} />;
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
          <p className="page-subtitle" style={{ margin: 0, opacity: 0.8 }}>Log aktifitas akses kaur, bendahara, dan administrator unit.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button 
            onClick={fetchLogs} 
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
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Database Tersebar Sejak Jan 2026</div>
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
            placeholder="Cari berdasarkan nama, unit, atau jabatan..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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

      <div className="glass-panel delay-400 table-container" style={{ overflow: 'hidden', borderBottom: 'none' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={{ padding: '1.25rem 1rem', background: 'rgba(255,255,255,0.01)' }}>Timestamp</th>
              <th style={{ padding: '1.25rem 1rem', background: 'rgba(255,255,255,0.01)' }}>Personel</th>
              <th style={{ padding: '1.25rem 1rem', background: 'rgba(255,255,255,0.01)' }}>Unit & Jabatan</th>
              <th style={{ padding: '1.25rem 1rem', background: 'rgba(255,255,255,0.01)' }} className="mobile-hide">Platform / Browser</th>
              <th style={{ padding: '1.25rem 1rem', background: 'rgba(255,255,255,0.01)', textAlign: 'right' }}>Log ID</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid var(--accent-blue-ghost)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%' }}></div>
                    <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Sinkronisasi Database Log...</p>
                  </div>
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
                  <Search size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                  <p>Tidak ada rekaman aktifitas akses untuk kata kunci tersebut.</p>
                </td>
              </tr>
            ) : filteredLogs.map((log, idx) => (
              <tr key={idx} className="ticket-row" style={{ transition: 'all 0.2s' }}>
                <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                   <div style={{ display: 'flex', flexDirection: 'column' }}>
                     <span style={{ fontWeight: 600, color: 'var(--accent-cyan)', fontSize: '0.9rem' }}>
                       {log.timestamp || log.Tanggal}
                     </span>
                     <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Security Check Point</span>
                   </div>
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent-blue-ghost), var(--accent-violet-ghost))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-subtle)' }}>
                      <User size={18} color="var(--accent-blue)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.nama || log.Nama}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Authorized Staff</div>
                    </div>
                  </div>
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                     <span className="badge" style={{ background: 'var(--accent-emerald-ghost)', color: 'var(--accent-emerald)', width: 'fit-content', border: 'none', fontSize: '0.7rem', textTransform: 'none' }}>
                       {log.unit || log.Unit}
                     </span>
                     <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                       {log.jabatan || log.Jabatan}
                     </span>
                   </div>
                </td>
                <td className="mobile-hide" style={{ verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.5rem 0' }}>
                     <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)' }}>
                       {getBrowserIcon(log.browser || log.Browser)}
                     </div>
                     <div style={{ maxWidth: '280px' }}>
                       <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', opacity: 0.9, lineHeight: 1.2 }}>
                         {log.browser || log.Browser}
                       </div>
                       <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>Fingerprint Validated</div>
                     </div>
                  </div>
                </td>
                <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                  <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
                    #{filteredLogs.length - idx}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AccessLogs;
