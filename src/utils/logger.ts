import { type User } from '../data/organization';

// API URL from DB_Sarpramoklet (Google Apps Script)
const LOG_API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";

// Helper to detect device type from userAgent
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return 'Mobile';
  if (/iPad|Tablet/i.test(ua)) return 'Tablet';
  return 'Desktop';
};

// Build the log payload matching the exact sheet headers:
// Timestamp | ID | Nama | Jabatan | Unit | Role | Email | Device
const buildLogPayload = (
  userId: string,
  nama: string,
  jabatan: string,
  unit: string,
  role: string,
  email: string,
  page: string
) => ({
  // Action that reliably appends a new row via Apps Script
  action: 'FINANCE_RECORD',
  sheetName: 'Log_Akses',
  sheet: 'Log_Akses',

  // Match exact column header names (case-sensitive)
  Timestamp: new Date().toLocaleString('id-ID'),
  ID: userId,
  Nama: nama,
  Jabatan: jabatan,
  Unit: unit,
  Role: role,
  Email: email,
  Device: getDeviceInfo(),

  // Lowercase fallback keys for compatibility
  id: userId,
  timestamp: new Date().toLocaleString('id-ID'),
  nama: nama,
  jabatan: jabatan,
  unit: unit,
  roleAplikasi: role,
  email: email,
  device: getDeviceInfo(),
  page: page,
});

// For use in page components — reads from getCurrentUser() after login
export const logAccess = async (user: User, pageName: string = 'Dashboard') => {
  const logData = buildLogPayload(
    user.id,
    user.nama,
    user.jabatan,
    user.unit,
    user.roleAplikasi,
    localStorage.getItem('userEmail') || 'unknown',
    pageName
  );

  try {
    await fetch(LOG_API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(logData)
    });
    console.log(`[Logger] Access recorded for: ${user.nama} @ ${pageName}`);
  } catch (error) {
    console.error("[Logger] Failed to record access log:", error);
  }
};

// For use in Login.tsx — fires at exact moment of Google auth, BEFORE localStorage is set.
// Accepts raw data directly, so it does NOT depend on getCurrentUser() or localStorage.
export const logLoginEvent = async (
  email: string,
  nama: string,
  jabatan: string = '-',
  unit: string = '-',
  role: string = '-',
  userId: string = '-'
) => {
  const logData = buildLogPayload(userId, nama, jabatan, unit, role, email, 'Login');

  try {
    await fetch(LOG_API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(logData)
    });
    console.log(`[Logger] Login recorded for: ${nama} (${email})`);
  } catch (error) {
    console.error("[Logger] Failed to record login:", error);
  }
};
