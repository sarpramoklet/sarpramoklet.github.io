import { useState, useEffect } from 'react';
import { History, Search, RefreshCw, User, ShieldCheck, Clock, Shield } from 'lucide-react';
import { getCurrentUser, ROLES } from '../data/organization';

const LOG_API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";

const AccessLogs = () => {
  const currentUser = getCurrentUser();
  const isPimpinan = currentUser.roleAplikasi === ROLES.PIMPINAN;

  const [logs, setLogs] = useState<any[]>([]);
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

  // Pagination Logic
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    // Scroll table to top when paginating
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
            placeholder="Cari berdasarkan nama, unit, atau jabatan..." 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to page 1 on search
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
                <td colSpan={5} style={{ textAlign: 'center', padding: '5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
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
            ) : currentLogs.map((log, idx) => (
              <tr 
                key={idx} 
                className="ticket-row" 
                style={{ 
                  background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  transition: 'background 0.2s',
                  borderBottom: '1px solid var(--border-subtle)'
                }}
              >
                <td style={{ padding: '1.25rem 1.5rem', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-blue-ghost), transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                      <User size={18} color="var(--accent-blue)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', marginBottom: '1px' }}>{log.nama || log.Nama}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.8 }}>{log.unit || log.Unit} • {log.jabatan || log.Jabatan}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '1.25rem 1.5rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                     <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '0.9rem' }}>
                       {log.Timestamp || log.timestamp || log.Tanggal}
                     </span>
                     <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Security Checkpoint</span>
                   </div>
                </td>
                <td style={{ padding: '1.25rem 1.5rem', verticalAlign: 'middle' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)', boxShadow: '0 0 8px var(--accent-emerald)' }}></div>
                     <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-emerald)' }}>Akses Berhasil</span>
                     <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: '4px', marginLeft: 'auto' }}>ID#{logs.length - (indexOfFirstItem + idx)}</span>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination Controls */}
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
