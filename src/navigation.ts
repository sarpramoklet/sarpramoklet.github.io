import { LayoutDashboard, Ticket, Server, Component, Building, Package, BookOpen, Bell, Presentation, Users, Briefcase, TrendingUp, BarChart3 } from 'lucide-react';

export const NAVIGATION = [
  { path: '/', name: 'Dashboard', icon: LayoutDashboard },
  { path: '/meeting', name: 'Rapat Bulanan', icon: Presentation },
  { path: '/tickets', name: 'Permintaan Layanan', icon: Ticket },
  { path: '/it', name: 'IT Services', icon: Server },
  { path: '/lab', name: 'Laboratorium', icon: Component },
  { path: '/sarpras', name: 'Sarpras', icon: Building },
  { path: '/assets', name: 'Aset & Inventaris', icon: Package },
  { path: '/personnel', name: 'Personel', icon: Users },
  { path: '/assignment', name: 'Penugasan', icon: Briefcase },
  { path: '/performance', name: 'Kinerja Personel', icon: TrendingUp },
  { path: '/projects', name: 'Proyek & Pengembangan', icon: BarChart3 },
  { path: '/sop', name: 'SOP & Dokumen', icon: BookOpen },
  { path: '/notifications', name: 'Notifikasi', icon: Bell },
];
