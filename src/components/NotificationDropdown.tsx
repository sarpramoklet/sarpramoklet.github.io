import { useState, useEffect, useRef } from 'react';
import { Bell, MessageSquare, Heart, Clock, AlertCircle, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { USERS } from '../data/organization';
import { useProfileThumbByEmail } from '../hooks/useProfileThumbByEmail';
import { normalizeClassroomMonitorRows, normalizeClassroomDate } from '../utils/classroomMonitor';
import UserAvatar from './UserAvatar';

const FINANCE_API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";
const CLASSROOM_MONITOR_SHEET = 'Pantauan_Kelas';

const resolveUserFromClassroomUploader = (identifier: string, currentUser: any) => {
  const normalizedIdentifier = String(identifier || '').trim().toLowerCase();
  if (!normalizedIdentifier) return null;

  if (
    currentUser &&
    [currentUser.nama, currentUser.email]
      .filter(Boolean)
      .some((value: string) => value.trim().toLowerCase() === normalizedIdentifier)
  ) {
    return currentUser;
  }

  return (
    USERS.find((user) => {
      const fullName = user.nama.trim().toLowerCase();
      const email = user.email.trim().toLowerCase();
      return (
        fullName === normalizedIdentifier ||
        email === normalizedIdentifier ||
        fullName.includes(normalizedIdentifier) ||
        normalizedIdentifier.includes(fullName)
      );
    }) || null
  );
};

export default function NotificationDropdown({ currentUser }: { currentUser: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [classroomUploaders, setClassroomUploaders] = useState<any[]>([]);
  const [classroomUploadMeta, setClassroomUploadMeta] = useState<{ date: string; totalRooms: number }>({
    date: '',
    totalRooms: 0,
  });
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileThumbByEmail = useProfileThumbByEmail();

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
      const [notesResp, classroomResp] = await Promise.all([
        fetch(`${FINANCE_API_URL}?sheetName=Piket`),
        fetch(`${FINANCE_API_URL}?sheetName=${CLASSROOM_MONITOR_SHEET}`),
      ]);
      const data = await notesResp.json();
      const classroomData = await classroomResp.json();

      if (data && Array.isArray(data)) {
        let notifs: any[] = [];
        let hasFilledToday = false;
        const now = new Date();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        data.forEach((item: any) => {
          if (!item.id || !item.amount) return;
          const date = new Date(item.tanggal || item.Tanggal);
          if (isNaN(date.getTime())) return;
          
          if ((item.keterangan || '').trim().toLowerCase() === (currentUser?.nama || '').trim().toLowerCase()) {
            if (date.getTime() >= startOfToday.getTime()) {
              hasFilledToday = true;
            }
          }

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
             
             if (isOwnNote && date.getTime() > startOfToday.getTime()) {
               hasFilledToday = true;
             }
             
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

        const normalizedClassroomRows = Array.isArray(classroomData)
          ? normalizeClassroomMonitorRows(classroomData)
          : [];
        const latestClassroomDate = normalizedClassroomRows.length > 0
          ? normalizedClassroomRows
              .map((item) => item.tanggal)
              .filter(Boolean)
              .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0]
          : '';

        if (latestClassroomDate) {
          const latestClassroomRows = normalizedClassroomRows.filter((row) => row.tanggal === latestClassroomDate);
          const uploaderMap = new Map<string, any>();

          latestClassroomRows.forEach((row) => {
            const label = String(row.updatedBy || '').trim();
            if (!label) return;

            const user = resolveUserFromClassroomUploader(label, currentUser);
            const key = (user?.email || label).toLowerCase();
            const nextUpdatedAt = new Date(row.updatedAt || row.tanggal).getTime();
            const existing = uploaderMap.get(key);
            const existingUpdatedAt = existing ? new Date(existing.updatedAt || existing.tanggal).getTime() : 0;

            if (!existing || nextUpdatedAt >= existingUpdatedAt) {
              uploaderMap.set(key, {
                id: user?.id || key,
                nama: user?.nama || label,
                email: user?.email || '',
                jabatan: user?.jabatan || 'Pengunggah monitor kelas',
                fotoProfil: user?.fotoProfil,
                updatedAt: row.updatedAt || row.tanggal,
              });
            }
          });

          const uploaders = Array.from(uploaderMap.values()).sort(
            (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
          );
          setClassroomUploaders(uploaders);
          setClassroomUploadMeta({ date: latestClassroomDate, totalRooms: latestClassroomRows.length });

          if (uploaders.length > 0) {
            const leadUploader = uploaders[0];
            const extraUploaderCount = uploaders.length - 1;
            const formattedMonitorDate = new Intl.DateTimeFormat('id-ID', {
              day: 'numeric',
              month: 'short',
            }).format(new Date(normalizeClassroomDate(latestClassroomDate)));

            notifs.push({
              id: `classroom-upload-${latestClassroomDate}`,
              type: 'classroom_upload',
              title: 'Monitor Kelas Sudah Diupload',
              message:
                extraUploaderCount > 0
                  ? `${leadUploader.nama.split(',')[0]} dan ${extraUploaderCount} personil lain sudah upload monitor kelas ${formattedMonitorDate} untuk ${latestClassroomRows.length} ruang.`
                  : `${leadUploader.nama.split(',')[0]} sudah upload monitor kelas ${formattedMonitorDate} untuk ${latestClassroomRows.length} ruang.`,
              date: new Date(leadUploader.updatedAt || latestClassroomDate),
              timestamp: new Date(leadUploader.updatedAt || latestClassroomDate).getTime() + 30000,
              path: '/classroom-monitor',
              icon: Upload,
              color: 'var(--accent-emerald)',
              bg: 'rgba(16, 185, 129, 0.14)',
            });
          }
        } else {
          setClassroomUploaders([]);
          setClassroomUploadMeta({ date: '', totalRooms: 0 });
        }

        // Cek pengingat piket jam 15:00
        const PiketSchedule = [
          { day: 'Senin', personnel: ['Chusni', 'Whyna', 'Rudi'] },
          { day: 'Selasa', personnel: ['Bidin', 'Bagus', 'Rudi'] },
          { day: 'Rabu', personnel: ['Zakaria', 'Yoko', 'Rudi'] },
          { day: 'Kamis', personnel: ['Chandra', 'Nico', 'Rudi'] },
          { day: 'Jumat', personnel: ['Ayat', 'Amalia', 'Rudi'] },
        ];
        const todayDayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(now);
        const todaySchedule = PiketSchedule.find(s => s.day.toLowerCase() === todayDayName.toLowerCase());
        const isCurrentUserOnDuty = todaySchedule?.personnel.some(p => currentUser.nama.toLowerCase().includes(p.toLowerCase()));
        
        if (isCurrentUserOnDuty && !hasFilledToday && now.getHours() >= 15) {
          notifs.push({
            id: 'reminder-piket-15',
            type: 'reminder',
            title: '❗ Reminder Piket',
            message: 'Saat ini sudah lebih dari jam 15.00. Anda bertugas piket hari ini, dimohon segera mengisi catatan piket ya!',
            date: now,
            timestamp: now.getTime() + 100000, // force to top
            path: '/duty-notes',
            icon: AlertCircle,
            color: 'var(--accent-amber)',
            bg: 'rgba(245, 158, 11, 0.1)'
          });
        }

        notifs.sort((a, b) => b.timestamp - a.timestamp);
        
        let unread = 0;
        
        notifs.forEach(n => {
           if (n.timestamp > startOfToday.getTime()) unread++;
        });
        
        setNotifications(notifs.slice(0, 10)); // Take top 10
        setUnreadCount(unread);
      }
    } catch (e) {
      console.error(e);
      setClassroomUploaders([]);
      setClassroomUploadMeta({ date: '', totalRooms: 0 });
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
  };

  const handleNav = (path: string) => {
     setIsOpen(false);
     navigate(path);
  };

  if (!currentUser) return null;

  const classroomUploadDateLabel = classroomUploadMeta.date
    ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(classroomUploadMeta.date))
    : '';

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="theme-toggle-btn"
        style={{ padding: '6px', border: 'none', background: 'transparent', position: 'relative', cursor: 'pointer' }}
        title="Notifikasi"
      >
        <Bell size={18} color="var(--text-primary)" />
        {unreadCount > 0 && (
          <span style={{ 
            position: 'absolute', top: '-4px', right: '-4px', 
            background: 'var(--accent-rose)', 
            color: 'white',
            borderRadius: '10px',
            padding: '2px 5px',
            fontSize: '0.65rem',
            fontWeight: 800,
            border: '2px solid var(--bg-card)',
            animation: 'pulse 2s infinite',
            minWidth: '8px',
            lineHeight: 1,
            textAlign: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="glass-panel animate-fade-in" style={{
          position: 'absolute', top: 'calc(100% + 12px)', left: '-10px', 
          width: '320px', maxHeight: '420px', 
          padding: '1rem 0',
          display: 'flex', flexDirection: 'column',
          zIndex: 9999,
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px'
        }}>
          {/** Arrow pointer **/}
          <div style={{
             content: '""', position: 'absolute', top: '-6px', left: '15px', 
             width: '12px', height: '12px', background: 'var(--bg-card)', 
             borderTop: '1px solid var(--border-subtle)', borderLeft: '1px solid var(--border-subtle)',
             transform: 'rotate(45deg)', zIndex: -1
          }}></div>
          <div style={{ padding: '0 1rem 1rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
             <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <Bell size={16} color="var(--accent-blue)" /> Pusat Notifikasi
             </h3>
             <button onClick={() => fetchNotifs()} disabled={loading} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }} title="Segarkan">
               <Clock size={14} className={loading ? 'animate-spin' : ''} color="var(--text-muted)" />
             </button>
          </div>

          <div style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.015)' }}>
             <div>
               <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                 Upload Monitor Kelas ({classroomUploaders.length}):
               </p>
               <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                 {classroomUploadMeta.date
                   ? `${classroomUploadMeta.totalRooms} ruang ter-update pada ${classroomUploadDateLabel}`
                   : 'Belum ada upload monitor kelas terbaru.'}
               </p>
             </div>
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap-reverse' }}>
               {classroomUploaders.length === 0 ? (
                 <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                   Menunggu upload
                 </div>
               ) : classroomUploaders.map((u, idx) => (
                 <div key={u.id} style={{
                   marginLeft: idx === 0 ? 0 : '-12px',
                   border: '2px solid var(--bg-card)',
                   borderRadius: '50%',
                   position: 'relative',
                   zIndex: classroomUploaders.length - idx,
                   transition: 'transform 0.2s ease',
                   cursor: 'pointer'
                   }}
                   title={`${u.nama}\n${u.jabatan}\nUpload monitor: ${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(u.updatedAt))}`}
                   onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                   onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                 >
                   <UserAvatar 
                      name={u.nama} email={u.email} photoUrl={u.fotoProfil} 
                      profileThumbByEmail={profileThumbByEmail} size={30} background="var(--bg-card)" 
                   />
                   <div style={{ position: 'absolute', bottom: '1px', right: '-1px', width: '10px', height: '10px', background: 'var(--accent-emerald)', borderRadius: '50%', border: '2px solid var(--bg-card)' }} />
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
