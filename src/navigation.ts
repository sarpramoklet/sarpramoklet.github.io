import { LayoutDashboard, Ticket, Server, Component, Building, Package, BookOpen, Bell, Presentation, Users, Briefcase, TrendingUp, BarChart3, Zap, Wallet, History as HistoryIcon, Coins, Wind } from 'lucide-react';

export const NAVIGATION = [
  { path: '/', name: 'Dashboard', icon: LayoutDashboard, authRequired: false },
  { path: '/meeting', name: 'Rapat Bulanan', icon: Presentation, authRequired: false },
  { path: '/it', name: 'IT Services', icon: Server, authRequired: false },
  { path: '/lab', name: 'Laboratorium', icon: Component, authRequired: false },
  { path: '/sarpras', name: 'Sarpras', icon: Building, authRequired: false },
  { path: '/performance', name: 'Kinerja Personel', icon: TrendingUp, authRequired: false },
  { path: '/tickets', name: 'Permintaan Layanan', icon: Ticket, authRequired: true },
  { path: '/utilities', name: 'Tagihan Utilitas', icon: Zap, authRequired: true },
  { path: '/assets', name: 'Aset & Inventaris', icon: Package, authRequired: true },
  { path: '/personnel', name: 'Personel', icon: Users, authRequired: true },
  { path: '/finance', name: 'Tata Kelola Keuangan', icon: Wallet, authRequired: true },
  { path: '/operational-cash', name: 'Kas Operasional TU', icon: Coins, authRequired: true },
  { path: '/ac-cash', name: 'Kas Perawatan AC', icon: Wind, authRequired: true },
  { path: '/logs', name: 'Log Akses', icon: HistoryIcon, authRequired: true },
  { path: '/assignment', name: 'Penugasan', icon: Briefcase, authRequired: true },
  { path: '/projects', name: 'Proyek & Pengembangan', icon: BarChart3, authRequired: true },
  { path: '/sop', name: 'SOP & Dokumen', icon: BookOpen, authRequired: true },
  { path: '/notifications', name: 'Notifikasi', icon: Bell, authRequired: true },
];
