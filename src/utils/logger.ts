import { type User, ROLES } from '../data/organization';

// API URL from DB_Sarpramoklet (Google Apps Script)
const LOG_API_URL = "https://script.google.com/macros/s/AKfycbyyXOLhUEs7IaRtlAgq-S6On6KuUuaAGSkw-sG6IPLmFH1-YHPRT2ZvsNRcRbcUypHljg/exec";

export const logAccess = async (user: User) => {
  // Logic to only log Kaur (Coordinators) and Bendahara (PIC Admin) as requested
  const isKaur = user.roleAplikasi === ROLES.KOORDINATOR_IT || 
                 user.roleAplikasi === ROLES.KOORDINATOR_LAB || 
                 user.roleAplikasi === ROLES.KOORDINATOR_SARPRAS;
  
  const isBendahara = user.roleAplikasi === ROLES.PIC_ADMIN;

  // Log only if it's one of the target roles
  if (!isKaur && !isBendahara) return;

  const logData = {
    action: 'LOG_ACCESS',
    timestamp: new Date().toLocaleString('id-ID'),
    userId: user.id,
    nama: user.nama,
    jabatan: user.jabatan,
    unit: user.unit,
    roleAplikasi: user.roleAplikasi,
    email: localStorage.getItem('userEmail') || 'unknown',
    browser: navigator.userAgent
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
