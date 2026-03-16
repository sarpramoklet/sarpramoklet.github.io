import { useState, useEffect } from 'react';
import { History, Search, Loader2, Monitor, RefreshCw, Calendar, User, ShieldCheck } from 'lucide-react';
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
      // Fetching from Log_Akses sheet
      const resp = await fetch(`${LOG_API_URL}?sheetName=Log_Akses&sheet=Log_Akses`);
      const data = await resp.json();
      if (data && Array.isArray(data)) {
        // Filter and reverse for latest first
        const filtered = data.filter((item: any) => 
          (item.action === 'LOG_ACCESS') || 
          (item.type === 'LOG_ACCESS') || 
          (item.Nama || item.nama)
        );
        setLogs(filtered.reverse());
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
    (log.unit || log.Unit || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isPimpinan) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center animate-fade-in">
        <ShieldCheck size={48} color="var(--accent-rose)" style={{ marginBottom: '1rem' }} />
        <h2 className="page-title">Akses Terbatas</h2>
        <p className="page-subtitle">Halaman ini hanya dapat diakses oleh Pimpinan.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div className="flex-row-responsive" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Monitoring Log Akses</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Pusat rekam aktifitas dan login Kaur & Bendahara</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={fetchLogs} className={`btn btn-outline ${loading ? 'opacity-50' : ''}`} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> 
            <span className="mobile-hide">Refresh Data</span>
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="glass-panel stat-card delay-100">
          <div className="stat-header">
            <span className="stat-title">Total Rekaman</span>
            <div className="stat-icon-wrapper">
              <History size={20} />
            </div>
          </div>
          <div className="stat-value">{logs.length}</div>
          <div className="stat-trend trend-up">Aktifitas Terdeteksi</div>
        </div>

        <div className="glass-panel stat-card delay-200">
          <div className="stat-header">
            <span className="stat-title">Terakhir Diperbarui</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-emerald-ghost)', color: 'var(--accent-emerald)' }}>
              <Calendar size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>
            {lastRefresh.toLocaleTimeString('id-ID')}
          </div>
          <div className="stat-trend trend-up">Hari Ini</div>
        </div>
        
        <div className="glass-panel stat-card delay-300">
          <div className="stat-header">
            <span className="stat-title">Status Sinkronisasi</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)' }}>
              <RefreshCw size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>TERKONEKSI</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Google Apps Script API</p>
        </div>
      </div>

      <div className="glass-panel delay-300 flex-row-responsive" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', gap: '1.5rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Cari Nama, Unit, atau Jabatan..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-responsive"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div className="glass-panel delay-400 table-container">
        <table>
          <thead>
            <tr>
              <th>Nomor</th>
              <th>Waktu Akses</th>
              <th>Informasi Personel</th>
              <th>Unit / Bidang</th>
              <th>Jabatan & Role</th>
              <th className="mobile-hide">Browser & Device Info</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                  <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem', color: 'var(--accent-blue)' }} />
                  <p style={{ color: 'var(--text-secondary)' }}>Menarik data log dari database...</p>
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Data tidak ditemukan atau belum ada log terekam.
                </td>
              </tr>
            ) : filteredLogs.map((log, idx) => (
              <tr key={idx} className="ticket-row">
                <td style={{ color: 'var(--text-muted)' }}>{filteredLogs.length - idx}</td>
                <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                   {log.timestamp || log.Tanggal}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-subtle)' }}>
                      <User size={16} color="var(--accent-blue)" />
                    </div>
                    <span style={{ fontWeight: 600 }}>{log.nama || log.Nama}</span>
                  </div>
                </td>
                <td>
                   <span className="badge" style={{ background: 'var(--bg-primary)', textTransform: 'none' }}>{log.unit || log.Unit}</span>
                </td>
                <td>
                  <div style={{ fontSize: '0.85rem' }}>{log.jabatan || log.Jabatan}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-violet)' }}>{log.roleAplikasi || log.Role}</div>
                </td>
                <td className="mobile-hide">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                     <Monitor size={14} />
                     <span style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                       {log.browser || log.Browser}
                     </span>
                  </div>
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
