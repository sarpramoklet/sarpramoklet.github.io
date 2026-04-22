import { useState, useEffect, useRef } from 'react';
import { Bell, MessageSquare, Heart, Clock, AlertCircle, Upload, Edit3, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { USERS } from '../data/organization';
import { useProfileThumbByEmail } from '../hooks/useProfileThumbByEmail';
import { normalizeClassroomMonitorRows, normalizeClassroomDate } from '../utils/classroomMonitor';
import {
  ACTION_NOTIFICATIONS_EVENT,
  type ActionNotificationIconKey,
  getActionNotifications,
} from '../utils/actionNotifications';
import UserAvatar from './UserAvatar';

const FINANCE_API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";
const CLASSROOM_MONITOR_SHEET = 'Pantauan_Kelas';

const startOfToday = () => {
  const next = new Date();
  next.setHours(0, 0, 0, 0);
  return next;
};

const iconByKey: Record<ActionNotificationIconKey, any> = {
  message: MessageSquare,
  alert: AlertCircle,
  heart: Heart,
  edit: Edit3,
  trash: Trash2,
  upload: Upload,
};

const hydrateActionNotifications = () =>
  getActionNotifications().map((item) => ({
    ...item,
    date: new Date(item.date || item.timestamp),
    icon: item.iconKey ? iconByKey[item.iconKey] || Bell : Bell,
  }));

const mergeNotifications = (remoteNotifications: any[], actionNotifications: any[]) => {
  const merged = new Map<string, any>();

  [...remoteNotifications, ...actionNotifications].forEach((item) => {
    const key = item.dedupeKey || item.id;
    const existing = merged.get(key);

    if (!existing || Number(item.timestamp || 0) >= Number(existing.timestamp || 0)) {
      merged.set(key, item);
    }
  });

  return Array.from(merged.values()).sort((left, right) => right.timestamp - left.timestamp);
};

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
  const remoteNotificationsRef = useRef<any[]>([]);
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

  const applyNotifications = (remoteNotifications: any[]) => {
    remoteNotificationsRef.current = remoteNotifications;
    const merged = mergeNotifications(remoteNotifications, hydrateActionNotifications());
    const todayStart = startOfToday().getTime();

    setNotifications(merged.slice(0, 15));
    setUnreadCount(merged.filter((item) => item.timestamp > todayStart).length);
  };

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const [notesResp, classroomResp] = await Promise.all([
        fetch(`${FINANCE_API_URL}?sheetName=Piket`),
        fetch(`${FINANCE_API_URL}?sheetName=${CLASSROOM_MONITOR_SHEET}`),
      ]);
      const data = await notesResp.json();
      const classroomData = await classroomResp.json();

      const notifs: any[] = [];
      let hasFilledToday = false;
      const now = new Date();
      const todayStart = startOfToday();

      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          if (!item.id || !item.amount) return;
          const date = new Date(item.tanggal || item.Tanggal);
          if (isNaN(date.getTime())) return;
          
          if ((item.keterangan || '').trim().toLowerCase() === (currentUser?.nama || '').trim().toLowerCase()) {
            if (date.getTime() >= todayStart.getTime()) {
              hasFilledToday = true;
            }
          }

          const isUrgent = item.type === 'Urgent' || item.Priority === 'Urgent';
          
          notifs.push({
            id: item.id || item.ID,
            dedupeKey: `new_note:${item.id || item.ID}`,
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
             
             if (isOwnNote && date.getTime() > todayStart.getTime()) {
               hasFilledToday = true;
             }
             
             // Analyze who liked
             const likedByPimpinan = likes.some(l => l.toLowerCase().includes('pimpinan') || l.toLowerCase().includes('waka') || l.toLowerCase().includes('hadi') || l.toLowerCase().includes('zainul'));
             
             notifs.push({
               id: `${item.id || item.ID}-likes`,
               dedupeKey: `likes:${item.id || item.ID}`,
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
      }

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
        const latestClassroomTimestamp = latestClassroomRows.reduce((maxTimestamp, row) => {
          const nextTimestamp = new Date(row.updatedAt || row.tanggal).getTime();
          return Number.isFinite(nextTimestamp) ? Math.max(maxTimestamp, nextTimestamp) : maxTimestamp;
        }, new Date(normalizeClassroomDate(latestClassroomDate)).getTime());

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
          const uploadTimestamp = new Date(leadUploader.updatedAt || latestClassroomDate).getTime();

          notifs.push({
            id: `classroom-upload-${latestClassroomDate}`,
            dedupeKey: `classroom-upload:${latestClassroomDate}`,
            type: 'classroom_upload',
            title: 'Monitor Kelas Sudah Diupload',
            message:
              extraUploaderCount > 0
                ? `${leadUploader.nama.split(',')[0]} dan ${extraUploaderCount} personil lain sudah upload monitor kelas ${formattedMonitorDate} untuk ${latestClassroomRows.length} ruang.`
                : `${leadUploader.nama.split(',')[0]} sudah upload monitor kelas ${formattedMonitorDate} untuk ${latestClassroomRows.length} ruang.`,
            date: new Date(uploadTimestamp),
            timestamp: uploadTimestamp + 30000,
            path: '/classroom-monitor',
            icon: Upload,
            color: 'var(--accent-emerald)',
            bg: 'rgba(16, 185, 129, 0.14)',
          });
        } else if (latestClassroomRows.length > 0) {
          const formattedMonitorDate = new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'short',
          }).format(new Date(normalizeClassroomDate(latestClassroomDate)));

          notifs.push({
            id: `classroom-upload-${latestClassroomDate}`,
            dedupeKey: `classroom-upload:${latestClassroomDate}`,
            type: 'classroom_upload',
            title: 'Update Monitor Kelas Terdeteksi',
            message: `Data monitor kelas terbaru untuk ${latestClassroomRows.length} ruang pada ${formattedMonitorDate} sudah masuk dan siap ditinjau.`,
            date: new Date(latestClassroomTimestamp),
            timestamp: latestClassroomTimestamp + 30000,
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
          dedupeKey: 'reminder:piket-15',
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

      applyNotifications(notifs);
    } catch (e) {
      console.error(e);
      setClassroomUploaders([]);
      setClassroomUploadMeta({ date: '', totalRooms: 0 });
      applyNotifications([]);
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

  useEffect(() => {
    if (!currentUser || typeof window === 'undefined') return;

    const handleActionNotificationsChanged = () => {
      applyNotifications(remoteNotificationsRef.current);
    };

    window.addEventListener(ACTION_NOTIFICATIONS_EVENT, handleActionNotificationsChanged);
    return () => window.removeEventListener(ACTION_NOTIFICATIONS_EVENT, handleActionNotificationsChanged);
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
                 Upload Monitor Kelas:
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
                   {classroomUploadMeta.date ? 'Update terdeteksi' : 'Menunggu upload'}
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
