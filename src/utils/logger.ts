import { type User } from '../data/organization';

// API URL from DB_Sarpramoklet (Google Apps Script)
const LOG_API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";

type ActivityEventType = 'login' | 'page_view' | 'menu_click' | 'button_click' | 'logout';

interface ActivityLogOptions {
  eventType: ActivityEventType;
  pageName?: string;
  pagePath?: string;
  menuName?: string;
  detail?: string;
  source?: string;
  profilePicture?: string;
}

// Helper to detect device type from userAgent
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return 'Mobile';
  if (/iPad|Tablet/i.test(ua)) return 'Tablet';
  return 'Desktop';
};

const getSessionSeed = () => localStorage.getItem('loginSessionSeed') || '';

const getTimestamp = () => new Date().toLocaleString('id-ID');

const buildActivityLabel = ({ eventType, pageName, menuName, detail }: ActivityLogOptions) => {
  switch (eventType) {
    case 'login':
      return 'Login berhasil';
    case 'logout':
      return 'Keluar dari aplikasi';
    case 'menu_click':
      return `Klik menu ${menuName || pageName || 'Navigasi'}`;
    case 'button_click':
      return `Klik tombol ${menuName || detail || pageName || 'Aksi'}`;
    case 'page_view':
    default:
      return `Buka halaman ${pageName || 'Dashboard'}`;
  }
};

const postLog = async (payload: Record<string, string | number>) => {
  try {
    await fetch(LOG_API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('[Logger] Failed to record access log:', error);
  }
};

const buildLogPayload = (
  userId: string,
  nama: string,
  jabatan: string,
  unit: string,
  role: string,
  email: string,
  options: ActivityLogOptions
) => {
  const timestamp = getTimestamp();
  const logId = `LOG-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
  const device = getDeviceInfo();
  const activity = buildActivityLabel(options);
  const profilePicture = options.profilePicture || '';

  return {
    action: 'FINANCE_RECORD',
    sheetName: 'Log_Akses',
    sheet: 'Log_Akses',

    id: logId,
    ID: logId,

    Timestamp: timestamp,
    ID_User: userId,
    Nama: nama,
    Jabatan: jabatan,
    Unit: unit,
    Role: role,
    Email: email,
    ProfilePicture: profilePicture,
    Device: device,
    Page: options.pageName || '',
    Path: options.pagePath || '',
    Menu: options.menuName || '',
    Aktivitas: activity,
    Activity: activity,
    Detail: options.detail || '',
    Source: options.source || '',
    EventType: options.eventType,
    SessionId: getSessionSeed(),

    timestamp: timestamp,
    nama,
    jabatan,
    unit,
    roleAplikasi: role,
    email,
    profilePicture,
    device,
    page: options.pageName || '',
    path: options.pagePath || '',
    menu: options.menuName || '',
    aktivitas: activity,
    activity,
    detail: options.detail || '',
    source: options.source || '',
    eventType: options.eventType,
    sessionId: getSessionSeed(),
  };
};

export const logUserActivity = async (user: User, options: ActivityLogOptions) => {
  const logData = buildLogPayload(
    user.id,
    user.nama,
    user.jabatan,
    user.unit,
    user.roleAplikasi,
    localStorage.getItem('userEmail') || user.email || 'unknown',
    options
  );

  await postLog(logData);
  console.log(`[Logger] ${options.eventType} recorded for: ${user.nama} @ ${options.pageName || options.menuName || options.detail || '-'}`);
};

export const logAccess = async (user: User, pageName: string = 'Dashboard', pagePath: string = '') => {
  await logUserActivity(user, {
    eventType: 'page_view',
    pageName,
    pagePath,
    source: 'router',
    profilePicture: localStorage.getItem('userPicture') || ''
  });
};

export const logMenuClick = async (user: User, menuName: string, pagePath: string = '') => {
  await logUserActivity(user, {
    eventType: 'menu_click',
    pageName: menuName,
    pagePath,
    menuName,
    source: 'sidebar',
    profilePicture: localStorage.getItem('userPicture') || ''
  });
};

export const logButtonClick = async (
  user: User,
  buttonName: string,
  pageName: string = '',
  detail: string = '',
  pagePath: string = ''
) => {
  await logUserActivity(user, {
    eventType: 'button_click',
    pageName,
    pagePath,
    menuName: buttonName,
    detail: detail || buttonName,
    source: 'ui',
    profilePicture: localStorage.getItem('userPicture') || ''
  });
};

export const logLogoutEvent = async (user: User) => {
  await logUserActivity(user, {
    eventType: 'logout',
    pageName: 'Logout',
    source: 'auth',
    profilePicture: localStorage.getItem('userPicture') || ''
  });
};

export const logLoginEvent = async (
  email: string,
  nama: string,
  jabatan: string = '-',
  unit: string = '-',
  role: string = '-',
  userId: string = '-',
  profilePicture: string = ''
) => {
  const logData = buildLogPayload(userId, nama, jabatan, unit, role, email, {
    eventType: 'login',
    pageName: 'Login',
    pagePath: '/login',
    detail: 'Google Sign-In',
    source: 'auth',
    profilePicture
  });

  await postLog(logData);
  console.log(`[Logger] Login recorded for: ${nama} (${email})`);

  if (profilePicture) {
    await persistProfilePicture({ userId, nama, jabatan, unit, role, email, profilePicture });
  }
};

export const persistProfilePicture = async (params: {
  userId: string;
  nama: string;
  jabatan: string;
  unit: string;
  role: string;
  email: string;
  profilePicture: string;
}) => {
  const timestamp = new Date().toISOString();
  const emailKey = String(params.email || '').trim().toLowerCase();
  if (!emailKey || !params.profilePicture) return;

  // The Profile_Pictures sheet uses the default Apps Script schema
  // (id, tanggal, keterangan, kategori, amount, type, debit, kredit).
  // Map our fields to that schema so writes are not dropped:
  //   id        -> stable PIC-<email> so re-saves overwrite the same row
  //   tanggal   -> ISO timestamp of the latest update
  //   keterangan -> the photo URL
  //   kategori  -> email (lowercased) — used as the lookup key
  //   type      -> 'profile_picture' marker so we can filter on read
  const recordId = `PIC-${emailKey}`;
  const payload = {
    action: 'FINANCE_RECORD',
    sheetName: 'Profile_Pictures',
    sheet: 'Profile_Pictures',

    id: recordId,
    ID: recordId,
    tanggal: timestamp,
    Tanggal: timestamp,
    keterangan: params.profilePicture,
    Keterangan: params.profilePicture,
    kategori: emailKey,
    Kategori: emailKey,
    type: 'profile_picture',
    Type: 'profile_picture',
    amount: 1,
    Amount: 1,

    // Extra fields the Apps Script will ignore but useful if the schema
    // ever grows: keep the rich metadata around.
    Nama: params.nama,
    nama: params.nama,
    Email: params.email,
    email: params.email,
    ID_User: params.userId,
    Jabatan: params.jabatan,
    Unit: params.unit,
    Role: params.role,
    ProfilePicture: params.profilePicture,
    profilePicture: params.profilePicture,
  };

  await postLog(payload);
  console.log(`[Logger] Profile picture persisted for: ${params.nama} (${params.email})`);
};
