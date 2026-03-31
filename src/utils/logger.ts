import { type User } from '../data/organization';

// API URL from DB_Sarpramoklet (Google Apps Script)
const LOG_API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";

export const logAccess = async (user: User, pageName: string = 'Dashboard') => {
  const logData = {
    action: 'LOG_ACCESS',
    page: pageName,
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
