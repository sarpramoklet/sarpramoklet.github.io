import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { NAVIGATION, NAV_GROUPS, type NavGroup, type NavItem } from '../navigation';
import { UserCircle2, X, Sun, Moon, LogOut, LogIn, ChevronRight } from 'lucide-react';
import { canAccessCapexEvidence, canAccessFinanceData, getCurrentUser, ROLES } from '../data/organization';
import { useProfileThumbByEmail } from '../hooks/useProfileThumbByEmail';
import UserAvatar from './UserAvatar';
import { logButtonClick, logLogoutEvent, logMenuClick } from '../utils/logger';
import NotificationDropdown from './NotificationDropdown';

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

const GROUP_LABELS: Record<NavGroup, string> = {
  'layanan':      'Layanan',
  'it-jaringan':  'IT & Jaringan',
  'lab-sarpras':  'Lab & Sarpras',
  'keuangan':     'Keuangan',
  'monitoring':   'Monitoring',
  'administrasi': 'Administrasi',
};

const LS_GROUPS_KEY = 'sidebar_open_groups';

const getDefaultOpenGroups = (): Set<NavGroup> => {
  try {
    const saved = localStorage.getItem(LS_GROUPS_KEY);
    if (saved) return new Set(JSON.parse(saved) as NavGroup[]);
  } catch { /* ignore */ }
  // Default: layanan dan grup aktif terbuka
  return new Set<NavGroup>(['layanan', 'it-jaringan', 'lab-sarpras', 'monitoring', 'administrasi']);
};

const Sidebar = ({ isOpen = false, setIsOpen, isLightMode = false, setIsLightMode, isLoggedIn = false, setIsLoggedIn, userPicture = '', setUserPicture }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const profileThumbByEmail = useProfileThumbByEmail();
  const currentUser = getCurrentUser();

  const [openGroups, setOpenGroups] = useState<Set<NavGroup>>(getDefaultOpenGroups);

  // Selalu buka grup yang berisi halaman aktif
  useEffect(() => {
    const activeItem = NAVIGATION.find(item => item.path === location.pathname);
    if (activeItem) {
      setOpenGroups(prev => {
        if (prev.has(activeItem.group)) return prev;
        const next = new Set(prev);
        next.add(activeItem.group);
        return next;
      });
    }
  }, [location.pathname]);

  // Simpan state ke localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_GROUPS_KEY, JSON.stringify(Array.from(openGroups)));
    } catch { /* ignore */ }
  }, [openGroups]);

  const toggleGroup = (group: NavGroup) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const handleClose = () => {
    if (setIsOpen) setIsOpen(false);
  };

  const filterItem = (item: NavItem): boolean => {
    if (!isLoggedIn) return item.path === '/' || item.path === '/assistant';

    const user = currentUser;
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

    if (isPetugasPiket && item.name === 'Kinerja Personel') return false;

    if (user.unit === 'Tata Kelola') {
      const excludedPublic = ['IT Service & Monitor Jaringan', 'Laboratorium', 'Sarpras'];
      if (excludedPublic.includes(item.name)) return false;
    }

    if (item.pimpinanOnly) return user.roleAplikasi === ROLES.PIMPINAN;
    if (item.financeOnly) return canAccessFinanceData(user);
    if (item.capexEvidenceOnly) return canAccessCapexEvidence(user);

    if (item.leaderOnly) {
      const seniorRoles = [
        ROLES.PIMPINAN,
        ROLES.KOORDINATOR_IT,
        ROLES.KOORDINATOR_LAB,
        ROLES.KOORDINATOR_SARPRAS,
        ROLES.PIC_ADMIN,
      ];
      return seniorRoles.includes(user.roleAplikasi as any);
    }

    if (!item.authRequired) return true;
    if (!isLoggedIn) return false;

    if (user.unit === 'Semua Unit') return true;

    const alwaysVisible = ['Dashboard', 'Rapat Bulanan', 'Catatan Piket', 'Asisten Sarmok', 'KPI Personil'];

    if (user.unit === 'Laboratorium') {
      return [...alwaysVisible, 'Laboratorium', 'Penugasan', 'Kinerja Personel'].includes(item.name);
    }
    if (user.unit === 'IT') {
      return [...alwaysVisible, 'IT Service & Monitor Jaringan', 'Monitor AC', 'Riwayat AC', 'Penugasan', 'Kinerja Personel'].includes(item.name);
    }
    if (user.unit === 'Sarpras') {
      return [...alwaysVisible, 'Sarpras', 'Tagihan Utilitas', 'Aset & Inventaris', 'Monitor AC', 'Riwayat AC', 'Monitor Kelas', 'Penugasan', 'Kinerja Personel'].includes(item.name);
    }
    if (user.unit === 'Tata Kelola') {
      return [
        ...alwaysVisible,
        'Personel', 'SOP & Dokumen', 'Kinerja Personel',
        'KAS SARPRA', 'Kas Operasional TU', 'Kas Perawatan AC',
        'Riwayat AC', 'Monitor Kelas', 'Monitor CAPEX',
      ].includes(item.name);
    }

    return alwaysVisible.includes(item.name);
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;

    if (item.isStatic) {
      return (
        <a
          key={item.path}
          href={item.path}
          className={`nav-item ${isActive ? 'active' : ''}`}
          onClick={() => {
            if (isLoggedIn) logMenuClick(currentUser, item.name, item.path);
            handleClose();
          }}
        >
          <Icon className="nav-icon" />
          <span>{item.name}</span>
        </a>
      );
    }

    return (
      <Link
        key={item.path}
        to={item.path}
        className={`nav-item ${isActive ? 'active' : ''}`}
        onClick={() => {
          if (isLoggedIn) logMenuClick(currentUser, item.name, item.path);
          handleClose();
        }}
      >
        <Icon className="nav-icon" />
        <span>{item.name}</span>
      </Link>
    );
  };

  // Build filtered + grouped nav
  const filteredByGroup = NAV_GROUPS.map(group => ({
    ...group,
    items: NAVIGATION.filter(item => item.group === group.key && filterItem(item)),
  })).filter(group => group.items.length > 0);

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

            <button className="mobile-close-btn" onClick={handleClose} style={{ position: 'absolute', top: '-1rem', right: '-0.5rem' }} title="Tutup menu">
               <X size={24} />
            </button>
          </div>
        </div>

        <div style={{ padding: '0 1rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* User Profile Info */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
              {isLoggedIn ? (
                <UserAvatar
                  name={currentUser.nama}
                  email={currentUser.email}
                  photoUrl={userPicture || currentUser.fotoProfil}
                  profileThumbByEmail={profileThumbByEmail}
                  size={36}
                  border="1px solid var(--border-subtle)"
                  background="var(--bg-card)"
                />
              ) : (
                <div style={{ padding: '6px', background: 'var(--bg-card)', borderRadius: '50%', border: '1px solid var(--border-subtle)', flexShrink: 0, width: '36px', height: '36px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserCircle2 size={20} color="var(--text-secondary)" />
                </div>
              )}
              <div style={{ overflow: 'hidden' }}>
                <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isLoggedIn ? currentUser.nama.split(',')[0] : 'Akses Publik'}
                </p>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isLoggedIn ? currentUser.jabatan : 'Tamu'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {isLoggedIn && <NotificationDropdown currentUser={currentUser} />}

              {setIsLightMode && (
                <button
                  className="theme-toggle-btn"
                  onClick={() => {
                    if (isLoggedIn) {
                      logButtonClick(currentUser, isLightMode ? 'Ganti ke tema gelap' : 'Ganti ke tema terang', 'Sidebar', 'Toggle tema aplikasi');
                    }
                    setIsLightMode(!isLightMode);
                  }}
                  style={{ padding: '6px', border: 'none', background: 'transparent' }}
                  title={isLightMode ? "Ganti ke Tema Gelap" : "Ganti ke Tema Terang"}
                >
                  {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
                </button>
              )}
            </div>
          </div>

          {/* Auth Buttons */}
          {isLoggedIn ? (
            <button
              className="btn btn-outline"
              onClick={() => {
                logLogoutEvent(currentUser);
                localStorage.removeItem('userEmail');
                localStorage.removeItem('userPicture');
                localStorage.removeItem('loginSessionSeed');
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
        </div>

        {/* Grouped Navigation */}
        <nav
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            paddingBottom: '2.5rem',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin',
          }}
        >
          {filteredByGroup.map(group => {
            const isGroupOpen = openGroups.has(group.key);
            const hasActiveItem = group.items.some(item => item.path === location.pathname);

            return (
              <div key={group.key}>
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 1.25rem 0.35rem 1.25rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: hasActiveItem ? 'var(--accent-blue)' : 'var(--text-muted)',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    transition: 'color 0.2s',
                  }}
                  title={isGroupOpen ? `Tutup ${group.label}` : `Buka ${group.label}`}
                >
                  <span>{GROUP_LABELS[group.key]}</span>
                  <ChevronRight
                    size={12}
                    style={{
                      transform: isGroupOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      flexShrink: 0,
                    }}
                  />
                </button>

                {/* Group Items */}
                {isGroupOpen && (
                  <div style={{ paddingBottom: '0.5rem' }}>
                    {group.items.map(renderNavItem)}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>ATTITUDE IS EVERYTHING</p>
          <span style={{ fontSize: '0.57rem', color: 'var(--text-muted)', opacity: 0.7 }}>Sarpramoklet v2.0 &copy; 2026</span>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
