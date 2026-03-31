import { type User } from '../data/organization';

// API URL from DB_Sarpramoklet (Google Apps Script)
const LOG_API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";

export const logAccess = async (user: User, pageName: string = 'Dashboard') => {
  const logData = {
    action: 'LOG_ACCESS', // Keep this as common action for logging scripts
    page: pageName,
    
    // Exact matches for spreadsheet headers
    Timestamp: new Date().toLocaleString('id-ID'),
    ID: user.id,
    Nama: user.nama,
    Jabatan: user.jabatan,
    Unit: user.unit,
    Role: user.roleAplikasi,
    Email: localStorage.getItem('userEmail') || 'unknown',
    
    // Also keep lowercase versions for broader compatibility
    timestamp: new Date().toLocaleString('id-ID'),
    userId: user.id,
    nama: user.nama,
    jabatan: user.jabatan,
    unit: user.unit,
    roleAplikasi: user.roleAplikasi,
    email: localStorage.getItem('userEmail') || 'unknown',
    browser: navigator.userAgent,
    sheetName: 'Log_Akses'
  };

  try {
    // Using no-cors mode as per the existing pattern in Tickets.tsx
    await fetch(LOG_API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify(logData)
    });
    console.log(`[Logger] Access recorded for: ${user.nama} (${user.roleAplikasi})`);
  } catch (error) {
    console.error("[Logger] Failed to record access log:", error);
  }
};

// Dedicated login event logger — accepts raw data directly from Google JWT decode.
// Does NOT depend on localStorage or getCurrentUser(), so it works at the exact moment of login.
export const logLoginEvent = async (email: string, nama: string, jabatan: string = '-', unit: string = '-', role: string = '-', userId: string = '-') => {
  const logData = {
    action: 'LOG_ACCESS',
    page: 'Login',

    // Exact matches for spreadsheet headers
    Timestamp: new Date().toLocaleString('id-ID'),
    ID: userId,
    Nama: nama,
    Jabatan: jabatan,
    Unit: unit,
    Role: role,
    Email: email,

    // Also keep lowercase versions for broader compatibility
    timestamp: new Date().toLocaleString('id-ID'),
    userId: userId,
    nama: nama,
    jabatan: jabatan,
    unit: unit,
    roleAplikasi: role,
    email: email,
    browser: navigator.userAgent,
    sheetName: 'Log_Akses'
  };

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
