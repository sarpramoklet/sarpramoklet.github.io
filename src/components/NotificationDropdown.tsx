import { useState, useEffect, useRef, useMemo } from 'react';
import { Bell, MessageSquare, Heart, Info, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { USERS } from '../data/organization';
import { useProfileThumbByEmail } from '../hooks/useProfileThumbByEmail';
import UserAvatar from './UserAvatar';

const FINANCE_API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";

export default function NotificationDropdown({ currentUser }: { currentUser: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileThumbByEmail = useProfileThumbByEmail();

  const onlineUsers = useMemo(() => {
    if (!currentUser) return [];
    // Menampilkan hanya diri sendiri dulu untuk cek fungsi sesuai request
    return [currentUser];
  }, [currentUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${FINANCE_API_URL}?sheetName=Piket`);
      const data = await resp.json();
      if (data && Array.isArray(data)) {
        let notifs: any[] = [];
        data.forEach((item: any) => {
          if (!item.id || !item.amount) return;
          const date = new Date(item.tanggal || item.Tanggal);
          if (isNaN(date.getTime())) return;

          const isUrgent = item.type === 'Urgent' || item.Priority === 'Urgent';
          
          notifs.push({
            id: item.id || item.ID,
            type: 'new_note',
            title: isUrgent ? `🚨 Temuan Penting / Urgent!` : `Pesan ${item.kategori || 'Piket'} Baru`,
            message: `${item.keterangan || 'Petugas'} menambahkan catatan: "${String(item.amount).substring(0, 35)}..."`,
            date: date,
            timestamp: date.getTime(),
            path: '/duty-notes',
            icon: isUrgent ? AlertCircle : MessageSquare,
            color: isUrgent ? 'var(--accent-rose)' : 'var(--accent-blue)',
            bg: isUrgent ? 'rgba(244, 63, 94, 0.1)' : 'var(--accent-blue-ghost)'
          });

          let likes: string[] = [];
          try {
            if (typeof item.likes === 'string') likes = JSON.parse(item.likes);
            else if (item.Likes) likes = JSON.parse(item.Likes);
          } catch(e) {
            if (typeof item.likes === 'string' && item.likes.trim() !== '') likes = item.likes.split(',');
          }
          
          if (likes.length > 0) {
             const isOwnNote = (item.keterangan || '').trim().toLowerCase() === (currentUser?.nama || '').trim().toLowerCase();
             
             // Analyze who liked
             const likedByPimpinan = likes.some(l => l.toLowerCase().includes('pimpinan') || l.toLowerCase().includes('waka') || l.toLowerCase().includes('hadi') || l.toLowerCase().includes('zainul'));
             
             notifs.push({
               id: `${item.id || item.ID}-likes`,
               type: 'likes',
               title: likedByPimpinan ? '✨ Menarik Perhatian Pimpinan' : '❤️ Reaksi Baru',
               message: isOwnNote 
                 ? `Catatan Anda disukai oleh ${likes.length} personil.` 
                 : `Catatan milik ${item.keterangan?.split(' ')[0]} disukai ${likes.length} personil.`,
               date: new Date(date.getTime() + 60000), // add slightly to avoid collision
               timestamp: date.getTime() + 60000,
               path: '/duty-notes',
               icon: Heart,
               color: 'var(--accent-rose)',
               bg: 'rgba(244, 63, 94, 0.1)'
             });
          }
        });

        notifs.sort((a, b) => b.timestamp - a.timestamp);
        
        let shouldBadge = false;
        if (notifs.length > 0 && notifications.length > 0) {
           if (notifs[0].id !== notifications[0].id) shouldBadge = true;
        } else if (notifs.length > 0 && notifications.length === 0) {
           shouldBadge = true;
        }
        
        setNotifications(notifs.slice(0, 10)); // Take top 10
        if (shouldBadge && !isOpen) setHasUnread(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 120000); // 2 mins refresh
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const handleOpen = () => {
     setIsOpen(!isOpen);
     if (!isOpen) setHasUnread(false);
  };

  const handleNav = (path: string) => {
     setIsOpen(false);
     navigate(path);
  };

  if (!currentUser) return null;

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="theme-toggle-btn"
        style={{ padding: '6px', border: 'none', background: 'transparent', position: 'relative', cursor: 'pointer' }}
        title="Notifikasi"
      >
        <Bell size={18} color="var(--text-primary)" />
        {hasUnread && (
          <span style={{ 
            position: 'absolute', top: '4px', right: '4px', 
            width: '8px', height: '8px', 
            background: 'var(--accent-rose)', 
            borderRadius: '50%',
            border: '2px solid var(--bg-card)',
            animation: 'pulse 2s infinite'
          }} />
        )}
      </button>

      {isOpen && (
        <div className="glass-panel animate-fade-in" style={{
          position: 'absolute', top: 'calc(100% + 5px)', right: '0', 
          width: '300px', maxHeight: '400px', 
          padding: '1rem 0',
          display: 'flex', flexDirection: 'column',
          zIndex: 9999,
          boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ padding: '0 1rem 1rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
             <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <Bell size={16} color="var(--accent-blue)" /> Pusat Notifikasi
             </h3>
             <button onClick={() => fetchNotifs()} disabled={loading} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }} title="Segarkan">
               <Clock size={14} className={loading ? 'animate-spin' : ''} color="var(--text-muted)" />
             </button>
          </div>

          <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.01)' }}>
             <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Personil Online ({onlineUsers.length}):</p>
             <div style={{ display: 'flex', alignItems: 'center' }}>
               {onlineUsers.map((u, idx) => (
                 <div key={u.id} style={{
                   marginLeft: idx === 0 ? 0 : '-10px',
                   border: '2px solid var(--bg-card)',
                   borderRadius: '50%',
                   position: 'relative',
                   zIndex: onlineUsers.length - idx
                   }}
                   title={`${u.nama}\n${u.jabatan} (Aktif)`}
                 >
                   <UserAvatar 
                      name={u.nama} email={u.email} photoUrl={u.fotoProfil} 
                      profileThumbByEmail={profileThumbByEmail} size={28} background="var(--bg-card)" 
                   />
                   <div style={{ position: 'absolute', bottom: 0, right: 0, width: '8px', height: '8px', background: 'var(--accent-emerald)', borderRadius: '50%', border: '1.5px solid var(--bg-card)' }} />
                 </div>
               ))}
             </div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '0' }} className="custom-scrollbar">
            {notifications.length === 0 && !loading ? (
               <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                 Tarik napas panjang... tidak ada notifikasi saat ini.
               </div>
            ) : notifications.map((notif, idx) => {
               const Icon = notif.icon;
               return (
                 <div key={`${notif.id}-${idx}`} onClick={() => handleNav(notif.path)} style={{
                    padding: '0.85rem 1rem', display: 'flex', gap: '0.85rem', cursor: 'pointer',
                    borderBottom: '1px solid rgba(150,150,150,0.05)',
                    transition: 'background 0.2s'
                 }}
                 onMouseOver={(e) => e.currentTarget.style.background = 'rgba(150,150,150,0.08)'}
                 onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                 >
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                      background: notif.bg || 'rgba(150,150,150,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Icon size={14} color={notif.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {notif.title}
                      </p>
                      <p style={{ margin: '0.2rem 0 0.3rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {notif.message}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                         {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(notif.date)}
                      </p>
                    </div>
                 </div>
               )
            })}
          </div>

          <div style={{ padding: '0.75rem 1rem 0 1rem', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <button onClick={() => handleNav('/duty-notes')} style={{ border: 'none', background: 'transparent', fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 600, cursor: 'pointer' }}>
               Kelola Seluruh Catatan &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
