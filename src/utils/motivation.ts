import { type User } from '../data/organization';

const PERSONAL_OPENERS: Record<string, string[]> = {
  U001: [
    'Visi besar dimulai dari langkah kecil hari ini.',
    'Arah tim ada di tangan pemimpin yang tenang dan tegas.',
    'Keputusan jernih hari ini akan jadi fondasi hasil besar besok.'
  ],
  U002: [
    'Satu perbaikan kecil di sistem IT bisa menghemat banyak waktu tim.',
    'Terus jaga ritme, konsistensi IT selalu membawa dampak nyata.',
    'Fokus pada stabilitas, karena layanan terbaik dimulai dari sistem yang rapi.'
  ],
  U003: [
    'Ketelitian di lab hari ini adalah kualitas pembelajaran besok.',
    'Eksperimen yang rapi melahirkan hasil yang bisa diandalkan.',
    'Semangat riset dan pembelajaran adalah investasi jangka panjang.'
  ],
  U004: [
    'Fasilitas yang terjaga membuat seluruh proses belajar lebih nyaman.',
    'Perawatan yang disiplin hari ini mencegah masalah besar esok hari.',
    'Konsisten merawat sarpras adalah bentuk pelayanan terbaik.'
  ],
  U005: [
    'Administrasi yang rapi adalah tulang punggung operasional yang sehat.',
    'Detail yang kamu jaga hari ini menjaga alur kerja tim tetap lancar.',
    'Ketertiban dokumen adalah kekuatan di balik keputusan yang tepat.'
  ]
};

const DEFAULT_OPENERS = [
  'Langkah kecil yang konsisten selalu mengalahkan rencana besar tanpa aksi.',
  'Kerja rapi hari ini adalah kemajuan nyata untuk tim.',
  'Terus bertumbuh, karena dampak besar dibangun dari kebiasaan kecil.'
];

const ROLE_FOCUS = {
  pimpinan: [
    'Tetap jadi teladan dalam ketegasan, empati, dan arah yang jelas.',
    'Pimpin dengan visi yang kuat dan komunikasi yang menenangkan tim.',
    'Jaga energi tim dengan keputusan yang tepat sasaran.'
  ],
  koordinator: [
    'Jaga alur koordinasi, karena sinkronisasi tim adalah kunci hasil cepat.',
    'Terus bantu tim prioritas, eksekusi, dan tindak lanjut yang konsisten.',
    'Pastikan tiap tugas bergerak jelas dari rencana ke penyelesaian.'
  ],
  pic: [
    'Eksekusi terbaikmu hari ini jadi standar kualitas layanan tim.',
    'Selesaikan satu tugas dengan tuntas, lalu lanjutkan dengan ritme yang sama.',
    'Presisi dalam eksekusi membuat hasil kerja makin dipercaya.'
  ]
};

const CLOSINGS = [
  'Satu progres hari ini tetap lebih baik daripada menunda kesempurnaan.',
  'Terus melangkah, tim bertumbuh saat setiap orang bergerak maju.',
  'Jaga kualitas, jaga integritas, hasil akan mengikuti.',
  'Fokus pada yang berdampak, sisanya akan menyesuaikan.'
];

const PUBLIC_EDUCATIONAL_QUOTES = [
  'Belajar itu investasi yang nilainya terus bertambah saat ilmu dipraktikkan.',
  'Disiplin kecil setiap hari lebih kuat daripada semangat besar yang sesekali.',
  'Pendidikan terbaik terjadi saat rasa ingin tahu dijaga tetap hidup.',
  'Kemajuan tim dimulai dari kebiasaan untuk mau belajar dan berbagi.',
  'Kesalahan bukan akhir, itu bagian penting dari proses memahami.',
  'Ilmu yang dipakai untuk melayani akan selalu punya dampak jangka panjang.',
  'Ketekunan mengubah kemampuan biasa menjadi hasil yang luar biasa.',
  'Terus bertanya, terus mencoba, terus bertumbuh.',
  'Satu ide baik hari ini bisa jadi solusi besar untuk esok hari.',
  'Kualitas belajar ditentukan oleh konsistensi, bukan kecepatan.',
  'Belajar dengan niat baik akan melahirkan karya yang bermanfaat.',
  'Setiap hari adalah kesempatan memperbarui cara berpikir dan cara bekerja.'
];

const hashString = (text: string) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const pickByHash = (list: string[], seed: number) => {
  if (!list.length) return '';
  return list[seed % list.length];
};

const detectRoleGroup = (roleAplikasi: string) => {
  const role = (roleAplikasi || '').toLowerCase();
  if (role.includes('pimpinan') || role.includes('executive')) return 'pimpinan';
  if (role.includes('koordinator')) return 'koordinator';
  return 'pic';
};

export const getMotivationForLogin = (user: User, loginSessionSeed: string) => {
  const sessionSeed = loginSessionSeed || 'session-default';
  const roleGroup = detectRoleGroup(user.roleAplikasi);
  const personalPool = PERSONAL_OPENERS[user.id] || DEFAULT_OPENERS;
  const rolePool = ROLE_FOCUS[roleGroup];

  const baseSeed = hashString(`${user.id}|${user.email}|${sessionSeed}`);
  const opener = pickByHash(personalPool, baseSeed);
  const focus = pickByHash(rolePool, baseSeed >> 3);
  const closing = pickByHash(CLOSINGS, baseSeed >> 6);

  return `${opener} ${focus} ${closing}`;
};

export const getPublicEducationalMotivation = (visitorSeed: string) => {
  const baseSeed = visitorSeed || 'public-default';
  const dayKey = new Date().toISOString().slice(0, 10);
  const mixedSeed = hashString(`${baseSeed}|${dayKey}`);
  return pickByHash(PUBLIC_EDUCATIONAL_QUOTES, mixedSeed);
};

const PIKET_DUTY_QUOTES = [
  'Hari ini kamu jaga ritme Sarpras — tim akan terbantu kalau respon kamu cepat dan rapi.',
  'Saat kamu standby, satu peminjaman berjalan lancar bisa menyelamatkan kelas seharian.',
  'Pelayanan terbaik bukan soal sibuk, tapi soal hadir saat dibutuhkan. Hari ini gilirannmu hadir.',
  'Setiap barang yang dipinjam adalah kepercayaan kecil yang harus kamu kawal sampai kembali.',
  'Catatan piket yang rapi hari ini menyelamatkan tim dari kebingungan besok.',
  'Standby di Sarpras = standby untuk kelancaran sekolah. Tugas kecilmu hari ini berdampak besar.',
  'Selamat bertugas! Layanan cepat dan ramah hari ini akan dikenang lebih lama dari yang kamu kira.',
  'Konsistensi adalah pelayanan terbaik — sehari saja absen, ritme tim bisa pincang.',
  'Hari ini kamu wajah Sarpras buat seluruh sekolah. Pastikan wajah itu siap dan ramah.',
  'Handover yang bersih malam ini = tidur nyenyak buat petugas piket besok.'
];

const PIKET_PUBLIC_REMINDERS = [
  'Mari bekerja sama untuk kelancaran layanan excellent dari Sarana.',
  'Setiap detail piket hari ini memengaruhi pengalaman seluruh warga sekolah esok hari.',
  'Standby tepat waktu adalah bentuk profesionalisme paling sederhana namun paling dirasakan.',
  'Pelayanan Sarpras yang baik dimulai dari satu petugas yang hadir tepat waktu.',
  'Layanan excellent bukan slogan — itu kebiasaan yang dibangun setiap shift piket.'
];

export const getPiketDutyQuote = (userId: string, dateKey: string) => {
  const seed = hashString(`${userId || 'piket'}|${dateKey}`);
  return pickByHash(PIKET_DUTY_QUOTES, seed);
};

export const getPiketDailyReminder = (dateKey: string) => {
  const seed = hashString(`piket-public|${dateKey}`);
  return pickByHash(PIKET_PUBLIC_REMINDERS, seed);
};
