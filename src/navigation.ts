import { LayoutDashboard, Server, Component, Building, Package, BookOpen, Presentation, Users, Briefcase, TrendingUp, Zap, Wallet, History as HistoryIcon, Coins, Wind, Target, MessageSquare, Camera } from 'lucide-react';

export type NavGroup = 'layanan' | 'it-jaringan' | 'lab-sarpras' | 'keuangan' | 'monitoring' | 'administrasi';

export interface NavItem {
  path: string;
  name: string;
  icon: any;
  authRequired?: boolean;
  financeOnly?: boolean;
  pimpinanOnly?: boolean;
  leaderOnly?: boolean;
  capexEvidenceOnly?: boolean;
  isStatic?: boolean;
  group: NavGroup;
}

export const NAVIGATION: NavItem[] = [
  // ── Layanan ──
  { path: '/',           name: 'Dashboard',                  icon: LayoutDashboard, authRequired: false, group: 'layanan' },
  { path: '/meeting',    name: 'Rapat Bulanan',              icon: Presentation,    authRequired: false, group: 'layanan' },
  { path: '/assistant',  name: 'Asisten Sarmok',             icon: MessageSquare,   authRequired: false, group: 'layanan' },

  // ── IT & Jaringan ──
  { path: '/it',         name: 'IT Service & Monitor Jaringan', icon: Server,       authRequired: false, group: 'it-jaringan' },

  // ── Lab & Sarpras ──
  { path: '/lab',           name: 'Laboratorium',   icon: Component,    authRequired: false, group: 'lab-sarpras' },
  { path: '/sarpras',       name: 'Sarpras',        icon: Building,     authRequired: false, group: 'lab-sarpras' },
  { path: '/classroom-monitor', name: 'Monitor Kelas', icon: Building,  authRequired: true,  group: 'lab-sarpras' },
  { path: '/ac-monitor',    name: 'Monitor AC',     icon: Wind,         authRequired: true,  group: 'lab-sarpras' },
  { path: '/ac-history',    name: 'Riwayat AC',     icon: HistoryIcon,  authRequired: true,  group: 'lab-sarpras' },

  // ── Keuangan ──
  { path: '/finance',           name: 'KAS SARPRA',          icon: Wallet,  authRequired: true, financeOnly: true,       group: 'keuangan' },
  { path: '/operational-cash',  name: 'Kas Operasional TU',  icon: Coins,   authRequired: true, financeOnly: true,       group: 'keuangan' },
  { path: '/ac-cash',           name: 'Kas Perawatan AC',    icon: Wind,    authRequired: true, financeOnly: true,       group: 'keuangan' },
  { path: '/utilities',         name: 'Tagihan Utilitas',    icon: Zap,     authRequired: true,                          group: 'keuangan' },
  { path: '/capex',             name: 'Monitor CAPEX',       icon: Target,  authRequired: true, leaderOnly: true,        group: 'keuangan' },
  { path: '/capex-evidence',    name: 'Laporan Foto CAPEX',  icon: Camera,  authRequired: true, capexEvidenceOnly: true, group: 'keuangan' },

  // ── Monitoring ──
  { path: '/performance',       name: 'Kinerja Personel',   icon: TrendingUp, authRequired: true, group: 'monitoring' },
  { path: '/kpi-personil.html', name: 'KPI Personil',       icon: Target,     authRequired: true, isStatic: true, group: 'monitoring' },
  { path: '/assignment',        name: 'Penugasan',           icon: Briefcase,  authRequired: true, group: 'monitoring' },

  // ── Administrasi ──
  { path: '/personnel',         name: 'Personel',          icon: Users,       authRequired: true, group: 'administrasi' },
  { path: '/duty-notes',        name: 'Catatan Piket',     icon: BookOpen,    authRequired: true, group: 'administrasi' },
  { path: '/sop',               name: 'SOP & Dokumen',     icon: BookOpen,    authRequired: true, group: 'administrasi' },
  { path: '/logs',              name: 'Log Akses',         icon: HistoryIcon, authRequired: true, pimpinanOnly: true, group: 'administrasi' },
  { path: '/assets',            name: 'Aset & Inventaris', icon: Package,     authRequired: true, group: 'administrasi' },
];

export const NAV_GROUPS: { key: NavGroup; label: string }[] = [
  { key: 'layanan',      label: 'Layanan' },
  { key: 'it-jaringan',  label: 'IT & Jaringan' },
  { key: 'lab-sarpras',  label: 'Lab & Sarpras' },
  { key: 'keuangan',     label: 'Keuangan' },
  { key: 'monitoring',   label: 'Monitoring' },
  { key: 'administrasi', label: 'Administrasi' },
];
