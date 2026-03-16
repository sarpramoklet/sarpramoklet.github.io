export const ORGANIZATION_UNITS = {
  IT: {
    name: 'IT',
    subProcess: [
      'Development Software',
      'Infrastruktur',
      'IT Policy'
    ]
  },
  Laboratorium: {
    name: 'Laboratorium',
    subProcess: [
      'Praktikum dan Perangkat',
      'Digitalisasi Pembelajaran',
      'Riset dan Inovasi'
    ]
  },
  Sarpras: {
    name: 'Sarpras',
    subProcess: [
      'Manajemen Gedung dan Bangunan',
      'Fix Aset Manajemen'
    ]
  },
  TataKelola: {
    name: 'Tata Kelola',
    subProcess: [
      'Administrasi',
      'Dokumen',
      'Approval',
      'Rekap dan Pelaporan'
    ]
  }
};

export const ROLES = {
  PIMPINAN: 'Pimpinan / Approver / Executive Viewer',
  KOORDINATOR_IT: 'Koordinator IT',
  KOORDINATOR_LAB: 'Koordinator Laboratorium',
  KOORDINATOR_SARPRAS: 'Koordinator Sarpras',
  PIC_ADMIN: 'Admin Operasional / Tata Kelola / Keuangan Support',
  PIC_IT_MOBILE: 'PIC IT Mobile Developer & Technical Support',
  PIC_IT_BACKEND: 'PIC IT Backend & DevOps',
  PIC_IT_UIUX: 'PIC IT UI/UX & Frontend Developer',
  PIC_IT_SUPPORT: 'PIC IT Technical Support',
  PIC_IT_NETWORK: 'PIC IT Infrastructure & Network',
  PIC_LAB_RISET: 'PIC Laboratorium Riset',
  PIC_DAPODIK: 'PIC Dapodik & Inventaris Aset Sekolah',
  PIC_SARPRAS_UMUM: 'PIC Sarpras, Kebersihan, Keamanan, dan Perlengkapan'
};

export interface User {
  id: string;
  nama: string;
  nip: string;
  jabatan: string;
  roleAplikasi: string;
  unit: string;
  subBidang: string[];
  akses: string[];
  scopePekerjaan: string[];
  atasanLangsung: string | null;
}

export const USERS: User[] = [
  {
    id: 'U001',
    nama: 'Mokhamad Hadi Wijaya, M.T.',
    nip: '07860075',
    jabatan: 'Waka. Bidang IT, Lab., dan Sarpra',
    roleAplikasi: ROLES.PIMPINAN,
    unit: 'Semua Unit',
    subBidang: [],
    akses: ['view_all', 'approve_strategic', 'executive_dashboard'],
    scopePekerjaan: ['Melihat dashboard IT, Lab, Sarpras', 'Melihat capaian unit', 'Melihat pekerjaan kritis', 'Approval pekerjaan/proyek strategis', 'Memantau KPI dan SLA'],
    atasanLangsung: null,
  },
  {
    id: 'U002',
    nama: 'Whyna Agustin, S.Pd.',
    nip: '25950025',
    jabatan: 'Kaur IT (Information of Technology)',
    roleAplikasi: ROLES.KOORDINATOR_IT,
    unit: 'IT',
    subBidang: ['Semua Sub-bidang IT'],
    akses: ['view_unit_it', 'assign_task_it', 'validate_task_it', 'coordinator_dashboard'],
    scopePekerjaan: ['Verifikasi tiket IT', 'Assign pekerjaan ke PIC IT', 'Validasi pekerjaan selesai', 'Memantau SLA IT'],
    atasanLangsung: 'U001',
  },
  {
    id: 'U003',
    nama: 'Muhammad Chusni Agus, M.Pd.',
    nip: '22880006',
    jabatan: 'Kaur. Laboratorium',
    roleAplikasi: ROLES.KOORDINATOR_LAB,
    unit: 'Laboratorium',
    subBidang: ['Semua Sub-bidang Lab'],
    akses: ['view_unit_lab', 'assign_task_lab', 'validate_task_lab', 'coordinator_dashboard'],
    scopePekerjaan: ['Verifikasi tiket Lab', 'Assign pekerjaan ke PIC Lab', 'Validasi pekerjaan selesai', 'Memantau SLA Lab'],
    atasanLangsung: 'U001',
  },
  {
    id: 'U004',
    nama: 'Ekon Anjar Poernomo, S.Kom.',
    nip: '11820014',
    jabatan: 'Kaur Sarana dan Prasarana',
    roleAplikasi: ROLES.KOORDINATOR_SARPRAS,
    unit: 'Sarpras',
    subBidang: ['Semua Sub-bidang Sarpras'],
    akses: ['view_unit_sarpras', 'assign_task_sarpras', 'validate_task_sarpras', 'coordinator_dashboard'],
    scopePekerjaan: ['Verifikasi tiket Sarpras', 'Assign pekerjaan ke PIC Sarpras', 'Validasi pekerjaan selesai', 'Memantau SLA Sarpras'],
    atasanLangsung: 'U001',
  },
  {
    id: 'U005',
    nama: 'Amalia Ramadhanty, S.Kom.',
    nip: '25940004',
    jabatan: 'PIC. Administrasi, Tata Kelola, dan Keuangan',
    roleAplikasi: ROLES.PIC_ADMIN,
    unit: 'Tata Kelola',
    subBidang: ['Administrasi', 'Dokumen', 'Approval', 'Rekap dan Pelaporan'],
    akses: ['view_admin', 'process_admin', 'pic_dashboard'],
    scopePekerjaan: ['Administrasi layanan', 'Pencatatan usulan', 'Pengarsipan dokumen', 'Dukungan tata kelola dan keuangan'],
    atasanLangsung: 'U001',
  },
  {
    id: 'U006',
    nama: 'Zainul Abidin, S.Kom.',
    nip: '20820006',
    jabatan: 'PIC. IT. Mobile Developer & Technical Support',
    roleAplikasi: ROLES.PIC_IT_MOBILE,
    unit: 'IT',
    subBidang: ['Development Software', 'Infrastruktur'],
    akses: ['view_assigned', 'update_task', 'pic_dashboard'],
    scopePekerjaan: ['Pengembangan fitur mobile', 'Bug fixing', 'Instalasi aplikasi', 'Support user'],
    atasanLangsung: 'U002',
  },
  {
    id: 'U007',
    nama: 'Zakaria, S.Pd.',
    nip: '25960026',
    jabatan: 'PIC. IT. Backend & DevOps',
    roleAplikasi: ROLES.PIC_IT_BACKEND,
    unit: 'IT',
    subBidang: ['Development Software', 'Infrastruktur'],
    akses: ['view_assigned', 'update_task', 'pic_dashboard'],
    scopePekerjaan: ['API/backend', 'Deployment aplikasi', 'Database service', 'CI/CD', 'Maintenance server aplikasi'],
    atasanLangsung: 'U002',
  },
  {
    id: 'U008',
    nama: 'Chandra Wijaya Kristanto, S.Pd.',
    nip: '25980017',
    jabatan: 'PIC. IT. UI/UX & Frontend Developer',
    roleAplikasi: ROLES.PIC_IT_UIUX,
    unit: 'IT',
    subBidang: ['Development Software'],
    akses: ['view_assigned', 'update_task', 'pic_dashboard'],
    scopePekerjaan: ['Desain UI', 'Frontend dashboard', 'Prototyping', 'Perbaikan tampilan', 'Optimalisasi user flow'],
    atasanLangsung: 'U002',
  },
  {
    id: 'U009',
    nama: 'Muhammad Bagus Arifin, S.Pd.',
    nip: '26960021',
    jabatan: 'PIC. IT. Technical Support',
    roleAplikasi: ROLES.PIC_IT_SUPPORT,
    unit: 'IT',
    subBidang: ['Infrastruktur'],
    akses: ['view_assigned', 'update_task', 'pic_dashboard'],
    scopePekerjaan: ['Tiket gangguan perangkat', 'Kendala software', 'Printer/projector/smart TV', 'Akun pengguna', 'Support kelas/kegiatan'],
    atasanLangsung: 'U002',
  },
  {
    id: 'U010',
    nama: 'Nico Rachmacandrana, S.ST.',
    nip: '26910009',
    jabatan: 'PIC. IT. Infrastructure & Network',
    roleAplikasi: ROLES.PIC_IT_NETWORK,
    unit: 'IT',
    subBidang: ['Infrastruktur'],
    akses: ['view_assigned', 'update_task', 'pic_dashboard'],
    scopePekerjaan: ['Gangguan jaringan', 'Pemasangan titik jaringan', 'Monitoring internet', 'Perbaikan infrastruktur', 'Network maintenance'],
    atasanLangsung: 'U002',
  },
  {
    id: 'U011',
    nama: 'Firmansyah Ayatullah, S.Kom.',
    nip: '25890012',
    jabatan: 'PIC. Laboratorium Riset',
    roleAplikasi: ROLES.PIC_LAB_RISET,
    unit: 'Laboratorium',
    subBidang: ['Riset dan Inovasi'],
    akses: ['view_assigned', 'update_task', 'pic_dashboard'],
    scopePekerjaan: ['Pengembangan ide', 'Riset prototipe', 'Pendampingan inovasi siswa', 'Dokumen HKI', 'Evaluasi hasil riset'],
    atasanLangsung: 'U003',
  },
  {
    id: 'U012',
    nama: 'Rudi Mistriono, S.Kom.',
    nip: '25900022',
    jabatan: 'PIC. Pengelola Dapodik & Inventaris Aset Sekolah',
    roleAplikasi: ROLES.PIC_DAPODIK,
    unit: 'Sarpras',
    subBidang: ['Fix Aset Manajemen'],
    akses: ['view_assigned', 'update_task', 'pic_dashboard'],
    scopePekerjaan: ['Update dapodik', 'Input inventaris', 'Mutasi aset', 'Audit aset', 'Rekap aset rusak/baik'],
    atasanLangsung: 'U004',
  },
  {
    id: 'U013',
    nama: 'Setdiyoko, S.E.',
    nip: '95710035',
    jabatan: 'PIC. Sapra, Kebersihan, Keamanan dan Perlengkapan',
    roleAplikasi: ROLES.PIC_SARPRAS_UMUM,
    unit: 'Sarpras',
    subBidang: ['Manajemen Gedung dan Bangunan'],
    akses: ['view_assigned', 'update_task', 'pic_dashboard'],
    scopePekerjaan: ['Kebersihan area', 'Kebutuhan perlengkapan', 'Keamanan lingkungan', 'Utilitas ringan', 'Kesiapan fasilitas kegiatan'],
    atasanLangsung: 'U004',
  }
];

export const getCurrentUser = (): User => {
  const email = localStorage.getItem('userEmail');
  if (email === 'chusni@smktelkom-mlg.sch.id') return USERS.find(u => u.id === 'U003') || USERS[0];
  if (email === 'whyna@smktelkom-mlg.sch.id') return USERS.find(u => u.id === 'U002') || USERS[0];
  if (email === 'ekon@smktelkom-mlg.sch.id') return USERS.find(u => u.id === 'U004') || USERS[0];
  return USERS[0]; // Default / Hadi
};
