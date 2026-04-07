import { Link, useLocation, useNavigate } from 'react-router-dom';
import { NAVIGATION } from '../navigation';
import { UserCircle2, X, Sun, Moon, LogOut, LogIn } from 'lucide-react';
import { getCurrentUser, ROLES } from '../data/organization';

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
        <div style={{ padding: '2rem 1.5rem 1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0' }}>
              <img src="./logo.png" alt="Sarpramoklet" className="theme-aware-logo" style={{ height: '42px', width: 'auto', objectFit: 'contain' }} />
            </div>
            
            <div>
              <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', margin: 0, fontWeight: 800 }} className="gradient-text">Sarpramoklet</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, margin: '0.25rem 0 0 0' }}>Command Center</p>
            </div>
            
            <button className="mobile-close-btn" onClick={handleClose} style={{ position: 'absolute', top: '-1rem', right: '-0.5rem' }}>
               <X size={24} />
            </button>
          </div>
          
        </div>

        <div style={{ padding: '0 1rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* User Profile Info */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
              <div style={{ padding: isLoggedIn && userPicture ? '0' : '6px', background: 'var(--bg-card)', borderRadius: '50%', border: '1px solid var(--border-subtle)', flexShrink: 0, width: '36px', height: '36px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isLoggedIn && userPicture ? (
                  <img src={userPicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <UserCircle2 size={20} color={isLoggedIn ? "var(--accent-blue)" : "var(--text-secondary)"} />
                )}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isLoggedIn ? getCurrentUser().nama.split(',')[0] : 'Akses Publik'}
                </p>
                <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isLoggedIn ? getCurrentUser().jabatan : 'Tamu'}
                </p>
              </div>
            </div>
            {setIsLightMode && (
              <button 
                className="theme-toggle-btn"
                onClick={() => setIsLightMode(!isLightMode)}
                style={{ padding: '6px', border: 'none', background: 'transparent' }}
                title={isLightMode ? "Ganti ke Tema Gelap" : "Ganti ke Tema Terang"}
              >
                {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
              </button>
            )}
          </div>

          {/* Auth Buttons */}
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
              style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem', justifyContent: 'center', borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)', borderRadius: '10px' }}
            >
              <LogOut size={14} /> Keluar (Sign Out)
            </button>
          ) : (
            <button 
              className="btn btn-primary" 
              onClick={() => {
                navigate('/login');
                handleClose();
              }}
              style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem', justifyContent: 'center', borderRadius: '10px' }}
            >
              <LogIn size={14} /> Sign In
            </button>
          )}

          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.25rem 0' }}></div>
          
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', padding: '0 0.5rem', fontWeight: 600 }}>
            Menu Utama
          </div>
        </div>

        <nav 
          style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.25rem', 
            overflowY: 'auto', 
            paddingBottom: '2.5rem',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin'
          }}
        >
          {(() => {
            const user = getCurrentUser();
            const userEmail = localStorage.getItem('userEmail') || '';
            const piketEmails = [
              'rudimistriono@smktelkom-mlg.sch.id',
              'zainul@smktelkom-mlg.sch.id',
              'yoko@smktelkom-mlg.sch.id',
              'nico@smktelkom-mlg.sch.id',
              'zakaria@smktelkom-mlg.sch.id',
              'bagus@smktelkom-mlg.sch.id',
              'chandra@smktelkom-mlg.sch.id',
              'ayat@smktelkom-mlg.sch.id'
            ];
            const isPetugasPiket = piketEmails.includes(userEmail);

            // Filter logic
            const filteredItems = NAVIGATION.filter((item: any) => {
              // Sembunyikan menu IT & Jaringan jika belum login
              if (!isLoggedIn && item.path === '/it') return false;

              // Hide Performance for Petugas Piket as requested
              if (isPetugasPiket && item.name === 'Kinerja Personel') return false;
              
              // For Amalia (Tata Kelola), exclude unit-specific public landing pages
              if (user.unit === 'Tata Kelola') {
                const excludedPublic = ['IT Service & Monitor Jaringan', 'Laboratorium', 'Sarpras'];
                if (excludedPublic.includes(item.name)) return false;
              }

              // leaderOnly items: hanya Waka (Pimpinan) + 3 Kaur
              if (item.leaderOnly) {
                if (!isLoggedIn) return false;
                const seniorRoles = [
                  ROLES.PIMPINAN,
                  ROLES.KOORDINATOR_IT,
                  ROLES.KOORDINATOR_LAB,
                  ROLES.KOORDINATOR_SARPRAS,
                ];
                return seniorRoles.includes(user.roleAplikasi as any);
              }

              if (!item.authRequired) return true;
              if (!isLoggedIn) return false;
              
              // Hadi (Semua Unit) has full access
              if (user.unit === 'Semua Unit') return true;
              
              // Common menus for all authenticated staff
              const alwaysVisible = ['Dashboard', 'Rapat Bulanan', 'Catatan Piket'];

              // Unit based access
              if (user.unit === 'Laboratorium') {
                const allowed = [...alwaysVisible, 'Laboratorium', 'Permintaan Layanan', 'Penugasan', 'Kinerja Personel'];
                return allowed.includes(item.name);
              }
              if (user.unit === 'IT') {
                const allowed = [...alwaysVisible, 'IT Service & Monitor Jaringan', 'Permintaan Layanan', 'Monitor AC', 'Penugasan', 'Kinerja Personel'];
                return allowed.includes(item.name);
              }
              if (user.unit === 'Sarpras') {
                const allowed = [...alwaysVisible, 'Sarpras', 'Permintaan Layanan', 'Tagihan Utilitas', 'Aset & Inventaris', 'Monitor AC', 'Penugasan', 'Kinerja Personel'];
                return allowed.includes(item.name);
              }
              if (user.unit === 'Tata Kelola') {
                const allowed = [...alwaysVisible, 'Personel', 'SOP & Dokumen'];
                return allowed.includes(item.name);
              }
              
              return alwaysVisible.includes(item.name);
            });

            // Sorting logic for Petugas Piket: Move Catatan Piket to top
            if (isPetugasPiket) {
              const piketNoteIndex = filteredItems.findIndex(i => i.name === 'Catatan Piket');
              if (piketNoteIndex > -1) {
                const [piketNote] = filteredItems.splice(piketNoteIndex, 1);
                filteredItems.unshift(piketNote);
              }
            }

            return filteredItems.map((item) => {
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
            });
          })()}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>ATTITUDE IS EVERYTHING</p>
          <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', opacity: 0.7 }}>Sarpramoklet v2.0 &copy; 2026</span>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
