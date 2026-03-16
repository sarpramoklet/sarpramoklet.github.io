import { Link, useLocation, useNavigate } from 'react-router-dom';
import { NAVIGATION } from '../navigation';
import { Activity, UserCircle2, X, Sun, Moon, LogOut, LogIn } from 'lucide-react';
import { getCurrentUser } from '../data/organization';

interface SidebarProps {
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
  isLightMode?: boolean;
  setIsLightMode?: (isLightMode: boolean) => void;
  isLoggedIn?: boolean;
  setIsLoggedIn?: (isLoggedIn: boolean) => void;
  userPicture?: string;
  setUserPicture?: (picture: string) => void;
}

const Sidebar = ({ isOpen = false, setIsOpen, isLightMode = false, setIsLightMode, isLoggedIn = false, setIsLoggedIn, userPicture = '', setUserPicture }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleClose = () => {
    if (setIsOpen) setIsOpen(false);
  };

  return (
    <>
      <div 
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`} 
        onClick={handleClose}
      ></div>
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div style={{ padding: '2rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '8px', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', borderRadius: '12px', color: 'white' }}>
              <Activity size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', margin: 0 }} className="gradient-text">Sarpramoklet</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Command Center</span>
            </div>
          </div>
          
          <button className="mobile-close-btn" onClick={handleClose}>
             <X size={24} />
          </button>
        </div>

        <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', padding: '0 0.5rem', marginBottom: '0.5rem', fontWeight: 600 }}>
            Menu Utama
          </div>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto' }}>
          {NAVIGATION.filter(item => {
            const user = getCurrentUser();
            
            // For Amalia (Tata Kelola), exclude unit-specific public landing pages
            if (user.unit === 'Tata Kelola') {
               const excludedPublic = ['IT Services', 'Laboratorium', 'Sarpras'];
               if (excludedPublic.includes(item.name)) return false;
            }

            if (!item.authRequired) return true;
            if (!isLoggedIn) return false;
            
            // Hadi (Semua Unit) has full access
            if (user.unit === 'Semua Unit') return true;
            
            // Common menus for all authenticated staff
            const alwaysVisible = ['Dashboard', 'Rapat Bulanan', 'Notifikasi'];

            // Chusni (Koordinator Laboratorium)
            if (user.unit === 'Laboratorium') {
               const allowed = [...alwaysVisible, 'Laboratorium', 'Permintaan Layanan', 'Penugasan', 'Kinerja Personel', 'Proyek & Pengembangan'];
               return allowed.includes(item.name);
            }

            // Whyna (Koordinator IT)
            if (user.unit === 'IT') {
               const allowed = [...alwaysVisible, 'IT Services', 'Permintaan Layanan', 'Penugasan', 'Kinerja Personel', 'Proyek & Pengembangan'];
               return allowed.includes(item.name);
            }

            // Ekon (Koordinator Sarpras)
            if (user.unit === 'Sarpras') {
               const allowed = [...alwaysVisible, 'Sarpras', 'Permintaan Layanan', 'Tagihan Utilitas', 'Aset & Inventaris', 'Penugasan', 'Kinerja Personel', 'Proyek & Pengembangan'];
               return allowed.includes(item.name);
            }
            
            // Amalia (Tata Kelola / Keuangan)
            if (user.unit === 'Tata Kelola') {
               const allowed = [...alwaysVisible, 'Tata Kelola Keuangan', 'Personel', 'SOP & Dokumen'];
               return allowed.includes(item.name);
            }
            
            return alwaysVisible.includes(item.name);
          }).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={handleClose}
              >
                <Icon className="nav-icon" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
              <div style={{ padding: isLoggedIn && userPicture ? '0' : '6px', background: 'var(--bg-card)', borderRadius: '50%', border: '1px solid var(--border-subtle)', flexShrink: 0, width: '46px', height: '46px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isLoggedIn && userPicture ? (
                  <img src={userPicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <UserCircle2 size={32} color={isLoggedIn ? "var(--accent-blue)" : "var(--text-secondary)"} />
                )}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isLoggedIn ? getCurrentUser().nama : 'Akses Publik'}
                </p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isLoggedIn ? getCurrentUser().jabatan : 'Tamu'}
                </p>
              </div>
            </div>
            {setIsLightMode && (
              <button 
                className="theme-toggle-btn"
                onClick={() => setIsLightMode(!isLightMode)}
                title={isLightMode ? "Ganti ke Tema Gelap" : "Ganti ke Tema Terang"}
              >
                {isLightMode ? <Moon size={20} /> : <Sun size={20} />}
              </button>
            )}
          </div>
          
          {isLoggedIn ? (
            <button 
              className="btn btn-outline" 
              onClick={() => {
                localStorage.removeItem('userEmail');
                localStorage.removeItem('userPicture');
                if (setIsLoggedIn) setIsLoggedIn(false);
                if (setUserPicture) setUserPicture('');
                navigate('/');
              }}
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem', justifyContent: 'center', borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)' }}
            >
              <LogOut size={16} /> Keluar (Sign Out)
            </button>
          ) : (
            <button 
              className="btn btn-primary" 
              onClick={() => {
                navigate('/login');
                handleClose();
              }}
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem', justifyContent: 'center' }}
            >
              <LogIn size={16} /> Login Sistem
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
