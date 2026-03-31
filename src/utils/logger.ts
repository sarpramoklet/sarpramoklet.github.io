import { type User, ROLES } from '../data/organization';

// API URL from DB_Sarpramoklet (Google Apps Script)
const LOG_API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";

export const logAccess = async (user: User, pageName: string = 'Dashboard') => {
  // Logic to only log Kaur (Coordinators) and Bendahara (PIC Admin) as requested
  const isKaur = user.roleAplikasi === ROLES.KOORDINATOR_IT || 
                 user.roleAplikasi === ROLES.KOORDINATOR_LAB || 
                 user.roleAplikasi === ROLES.KOORDINATOR_SARPRAS;
  
  const isBendahara = user.roleAplikasi === ROLES.PIC_ADMIN;
  const isWaka = user.roleAplikasi === ROLES.PIMPINAN;

  // New: Check if user is a designated Petugas Piket by email
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
  const isPiket = piketEmails.includes(userEmail);

  // Log only if it's one of the target roles
  if (!isKaur && !isBendahara && !isWaka && !isPiket) return;

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
