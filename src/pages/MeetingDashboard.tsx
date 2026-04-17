import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Handshake,
  Landmark,
  LayoutGrid,
  Loader2,
  Network,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { mergeCapexProjects } from '../data/capexProjects';
import { getUtilityChartData } from '../data/utilities';

const FINANCE_API_URL = 'https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec';
const TICKET_API_URL = 'https://script.google.com/macros/s/AKfycbyyXOLhUEs7IaRtlAgq-S6On6KuUuaAGSkw-sG6IPLmFH1-YHPRT2ZvsNRcRbcUypHljg/exec';

const monthMap: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  mei: 4,
  jun: 5,
  jul: 6,
  agt: 7,
  sep: 8,
  okt: 9,
  nov: 10,
  des: 11,
};

const monthLabel = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

const toNumber = (value: any) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const formatIDR = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
};

const formatShortDateTime = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = monthLabel[date.getMonth()] || 'Jan';
  const year = String(date.getFullYear()).slice(-2);
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} ${hour}:${minute}`;
};

const parseDate = (raw: any): Date | null => {
  const value = String(raw || '').trim();
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const dmy = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (dmy) {
    const dd = parseInt(dmy[1], 10) || 1;
    const mm = (parseInt(dmy[2], 10) || 1) - 1;
    const yyRaw = parseInt(dmy[3], 10) || 0;
    const yyyy = yyRaw < 100 ? 2000 + yyRaw : yyRaw;
    return new Date(yyyy, mm, dd);
  }

  const textParts = value.toLowerCase().split(' ');
  if (textParts.length >= 3) {
    const dd = parseInt(textParts[0], 10);
    const mm = monthMap[textParts[1]];
    const yyRaw = parseInt(textParts[2], 10);
    if (Number.isFinite(dd) && mm !== undefined && Number.isFinite(yyRaw)) {
      const yyyy = yyRaw < 100 ? 2000 + yyRaw : yyRaw;
      return new Date(yyyy, mm, dd);
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeText = (raw: any, fallback = '-') => {
  const text = String(raw || '').trim();
  return text || fallback;
};

type TicketSummary = {
  id: string;
  unit: string;
  category: string;
  priority: string;
  status: string;
  progress: number;
  description: string;
  date: Date | null;
  isDone: boolean;
  isOverdue: boolean;
  isHigh: boolean;
};

type UnitKpi = {
  unit: string;
  total: number;
  done: number;
  open: number;
  high: number;
  overdue: number;
};

const MeetingDashboard = () => {
  const [activeTab, setActiveTab] = useState<'internal' | 'eksternal'>('internal');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const [financeRows, setFinanceRows] = useState<any[]>([]);
  const [kasTuRows, setKasTuRows] = useState<any[]>([]);
  const [kasAcRows, setKasAcRows] = useState<any[]>([]);
  const [piketRows, setPiketRows] = useState<any[]>([]);
  const [ticketRows, setTicketRows] = useState<any[]>([]);
  const [capexRows, setCapexRows] = useState<any[]>([]);
  const [acRows, setAcRows] = useState<any[]>([]);
  const [wifiRows, setWifiRows] = useState<any[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const fetchJson = async (url: string) => {
      try {
        const resp = await fetch(url);
        const json = await resp.json();
        return Array.isArray(json) ? json : [];
      } catch {
        return [];
      }
    };

    const loadData = async () => {
      setLoading(true);
      setError('');

      const [finance, kasTu, kasAc, piket, tickets, capex, acMonitor, wifi] = await Promise.all([
        fetchJson(`${FINANCE_API_URL}?sheetName=Finance`),
        fetchJson(`${FINANCE_API_URL}?sheetName=Kas_TU`),
        fetchJson(`${FINANCE_API_URL}?sheetName=Kas_AC`),
        fetchJson(`${FINANCE_API_URL}?sheetName=Piket`),
        fetchJson(TICKET_API_URL),
        fetchJson(`${FINANCE_API_URL}?sheetName=Progres_CAPEX`),
        fetchJson(`${FINANCE_API_URL}?sheetName=Monitor_AC`),
        fetchJson(`${FINANCE_API_URL}?sheetName=Monitor_Wifi`),
      ]);

      setFinanceRows(finance);
      setKasTuRows(kasTu);
      setKasAcRows(kasAc);
      setPiketRows(piket);
      setTicketRows(tickets);
      setCapexRows(capex);
      setAcRows(acMonitor);
      setWifiRows(wifi);
      setLastSync(new Date());

      const totalLoaded =
        finance.length + kasTu.length + kasAc.length + piket.length + tickets.length + capex.length + acMonitor.length + wifi.length;
      if (totalLoaded === 0) {
        setError('Data belum tersedia dari server. Dashboard menunggu sinkronisasi.');
      }

      setLoading(false);
    };

    loadData();
  }, []);

  const internalFinance = useMemo(() => {
    const mapped = financeRows.map((item) => ({
      amount: toNumber(item.amount || item.Amount),
      type: String(item.type || item.Tipe || '').toLowerCase(),
    }));

    const income = mapped.filter((row) => row.type === 'income').reduce((sum, row) => sum + row.amount, 0);
    const expense = mapped.filter((row) => row.type === 'expense').reduce((sum, row) => sum + row.amount, 0);
    return {
      income,
      expense,
      balance: income - expense,
    };
  }, [financeRows]);

  const kasTu = useMemo(() => {
    const rows = kasTuRows
      .map((item) => ({
        debit: toNumber(item.debit || item.Debit),
        kredit: toNumber(item.kredit || item.Kredit),
        saldo: toNumber(item.saldo || item.Saldo),
      }))
      .filter((row) => row.debit > 0 || row.kredit > 0 || row.saldo > 0);

    if (rows.length === 0) return { balance: 0, expense: 0 };

    let running = 0;
    if (rows[0].saldo > 0 && rows[0].debit === 0 && rows[0].kredit === 0) {
      running = rows[0].saldo;
      for (let index = 1; index < rows.length; index += 1) {
        running += rows[index].debit - rows[index].kredit;
      }
    } else {
      running = rows.reduce((sum, row) => sum + row.debit - row.kredit, 0);
    }

    return {
      balance: running,
      expense: rows.reduce((sum, row) => sum + row.kredit, 0),
    };
  }, [kasTuRows]);

  const kasAc = useMemo(() => {
    const rows = kasAcRows
      .map((item) => ({
        debit: toNumber(item.debit || item.Debit),
        kredit: toNumber(item.kredit || item.Kredit),
      }))
      .filter((row) => row.debit > 0 || row.kredit > 0);

    return {
      balance: rows.reduce((sum, row) => sum + row.debit - row.kredit, 0),
      expense: rows.reduce((sum, row) => sum + row.kredit, 0),
    };
  }, [kasAcRows]);

  const tickets = useMemo<TicketSummary[]>(() => {
    const now = Date.now();

    return ticketRows.map((ticket, idx) => {
      const status = normalizeText(ticket.status, 'Diajukan');
      const priority = normalizeText(ticket.priority, 'Medium');
      const progress = toNumber(ticket.progress);
      const ticketDate = parseDate(ticket.date || ticket.tanggal || ticket.Tanggal);
      const ageDays = ticketDate ? Math.floor((now - ticketDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      const statusLower = status.toLowerCase();
      const isDone =
        progress >= 100 ||
        statusLower.includes('selesai') ||
        statusLower.includes('closed') ||
        statusLower.includes('done') ||
        statusLower.includes('resolved');
      const isHigh = priority.toLowerCase().includes('high') || priority.toLowerCase().includes('urgent');
      const isOverdue =
        statusLower.includes('overdue') ||
        statusLower.includes('sla') ||
        (!isDone && isHigh && ageDays >= 7) ||
        (!isDone && progress < 35 && ageDays >= 14);

      return {
        id: normalizeText(ticket.id || ticket.ID, `TKT-${idx + 1}`),
        unit: normalizeText(ticket.unit, 'Umum'),
        category: normalizeText(ticket.category || ticket.kategori, 'Operasional'),
        priority,
        status,
        progress,
        description: normalizeText(ticket.description || ticket.keterangan || ticket.title, 'Tanpa deskripsi'),
        date: ticketDate,
        isDone,
        isOverdue,
        isHigh,
      };
    });
  }, [ticketRows]);

  const monthlyTicketTrend = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, idx) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (5 - idx));
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: monthLabel[date.getMonth()],
        month: date.getMonth(),
        year: date.getFullYear(),
        Masuk: 0,
        Selesai: 0,
      };
    });

    const monthIndex = new Map(months.map((item, idx) => [item.key, idx]));

    tickets.forEach((ticket) => {
      if (!ticket.date) return;
      const key = `${ticket.date.getFullYear()}-${ticket.date.getMonth()}`;
      const idx = monthIndex.get(key);
      if (idx === undefined) return;

      months[idx].Masuk += 1;
      if (ticket.isDone) months[idx].Selesai += 1;
    });

    return months.map(({ label, Masuk, Selesai }) => ({ name: label, Masuk, Selesai }));
  }, [tickets]);

  const categoryChart = useMemo(() => {
    const bucket = new Map<string, { total: number; selesai: number; overdue: number }>();

    tickets.forEach((ticket) => {
      const key = ticket.category;
      if (!bucket.has(key)) {
        bucket.set(key, { total: 0, selesai: 0, overdue: 0 });
      }
      const current = bucket.get(key)!;
      current.total += 1;
      if (ticket.isDone) current.selesai += 1;
      if (ticket.isOverdue) current.overdue += 1;
    });

    return Array.from(bucket.entries())
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [tickets]);

  const unitKpi = useMemo<UnitKpi[]>(() => {
    const units = new Map<string, UnitKpi>();

    tickets.forEach((ticket) => {
      const unit = ticket.unit;
      if (!units.has(unit)) {
        units.set(unit, { unit, total: 0, done: 0, open: 0, high: 0, overdue: 0 });
      }
      const row = units.get(unit)!;
      row.total += 1;
      if (ticket.isDone) row.done += 1;
      else row.open += 1;
      if (ticket.isHigh) row.high += 1;
      if (ticket.isOverdue) row.overdue += 1;
    });

    return Array.from(units.values()).sort((a, b) => b.total - a.total);
  }, [tickets]);

  const piketInsights = useMemo(() => {
    const notes = piketRows
      .map((note) => ({
        type: String(note.type || note.Type || '').toLowerCase(),
        followup: normalizeText(note.kredit || note.Kredit || '-', '-'),
      }))
      .filter((note) => note.followup !== '-' || note.type);

    const urgent = notes.filter((note) => note.type.includes('urgent')).length;
    const pendingFollowup = notes.filter((note) => {
      const text = note.followup.toLowerCase();
      if (!text || text === '-') return false;
      return !text.includes('selesai') && !text.includes('done') && !text.includes('beres');
    }).length;

    return {
      total: notes.length,
      urgent,
      pendingFollowup,
    };
  }, [piketRows]);

  const acInsights = useMemo(() => {
    const normalized = acRows.map((item) => {
      const status = normalizeText(item.status || item.Status, 'Belum Terpasang').toLowerCase();
      const kondisi = normalizeText(item.kondisi || item.Kondisi, '-').toLowerCase();
      return { status, kondisi };
    });

    const installed = normalized.filter((item) => item.status.includes('terpasang')).length;
    const broken = normalized.filter((item) => item.kondisi.includes('rusak')).length;
    const repair = normalized.filter((item) => item.kondisi.includes('perbaikan')).length;

    return {
      installed,
      broken,
      repair,
      total: normalized.length,
    };
  }, [acRows]);

  const capexInsights = useMemo(() => {
    const normalized = mergeCapexProjects(capexRows).map((project) => ({
      ...project,
      progress: toNumber(project.progress),
    }));

    const avg = normalized.length > 0 ? normalized.reduce((sum, item) => sum + item.progress, 0) / normalized.length : 0;
    const delayed = normalized.filter((item) => item.progress < 60);

    return {
      projects: normalized,
      average: avg,
      delayed,
    };
  }, [capexRows]);

  const wifiInsights = useMemo(() => {
    const parsed = wifiRows
      .map((item) => ({
        count: toNumber(item.count || item.Count),
        date: parseDate(item.tanggal || item.Tanggal || item.date || item.Date),
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));

    const latest = parsed[parsed.length - 1];
    const previous = parsed[parsed.length - 2];
    const delta = latest && previous ? latest.count - previous.count : 0;

    return {
      latestCount: latest?.count || 0,
      delta,
      records: parsed.length,
    };
  }, [wifiRows]);

  const utilityInsights = useMemo(() => {
    const utility = getUtilityChartData();
    const latest = utility[utility.length - 1];
    const previous = utility[utility.length - 2];

    const totalLatest = toNumber(latest?.PLN) + toNumber(latest?.PDAM);
    const totalPrevious = toNumber(previous?.PLN) + toNumber(previous?.PDAM);

    const growth = totalPrevious > 0 ? ((totalLatest - totalPrevious) / totalPrevious) * 100 : 0;

    return {
      totalLatest,
      growth,
    };
  }, []);

  const executiveKpi = useMemo(() => {
    const totalTickets = tickets.length;
    const doneTickets = tickets.filter((ticket) => ticket.isDone).length;
    const openTickets = totalTickets - doneTickets;
    const overdueTickets = tickets.filter((ticket) => ticket.isOverdue).length;
    const highPriority = tickets.filter((ticket) => ticket.isHigh && !ticket.isDone).length;
    const completionRate = totalTickets > 0 ? (doneTickets / totalTickets) * 100 : 0;

    const totalCash = internalFinance.balance + kasTu.balance + kasAc.balance;
    const monthlyBurn = internalFinance.expense + kasTu.expense + kasAc.expense;

    const healthScoreRaw =
      100 -
      overdueTickets * 2 -
      highPriority * 1.5 -
      piketInsights.urgent * 2 -
      acInsights.broken * 3 -
      (capexInsights.delayed.length > 0 ? capexInsights.delayed.length * 1.2 : 0);

    return {
      totalTickets,
      doneTickets,
      openTickets,
      overdueTickets,
      highPriority,
      completionRate,
      totalCash,
      monthlyBurn,
      healthScore: Math.max(0, Math.min(100, healthScoreRaw)),
    };
  }, [tickets, internalFinance, kasTu, kasAc, piketInsights, acInsights, capexInsights]);

  const policyFindingsInternal = useMemo(() => {
    const findings = [
      {
        key: 'sla',
        title: 'Backlog layanan operasional masih menekan SLA',
        severity: executiveKpi.overdueTickets >= 8 ? 'Tinggi' : executiveKpi.overdueTickets >= 3 ? 'Sedang' : 'Rendah',
        evidence: `${executiveKpi.overdueTickets} tiket overdue dari ${executiveKpi.totalTickets} total tiket.`,
        policy: 'Tetapkan rapat clearing backlog mingguan dan pembagian PIC lintas unit untuk tiket high-priority.',
      },
      {
        key: 'ac',
        title: 'Risiko kenyamanan belajar dari kondisi AC belum stabil',
        severity: acInsights.broken >= 2 || acInsights.repair >= 4 ? 'Tinggi' : 'Sedang',
        evidence: `${acInsights.broken} unit rusak, ${acInsights.repair} unit dalam perbaikan.`,
        policy: 'Buat kontrak SLA vendor AC per-zona kelas dan buffer unit pengganti untuk ruang kritis.',
      },
      {
        key: 'capex',
        title: 'Eksekusi proyek CAPEX belum merata',
        severity: capexInsights.average < 60 ? 'Tinggi' : capexInsights.average < 75 ? 'Sedang' : 'Rendah',
        evidence: `Rerata progres ${capexInsights.average.toFixed(1)}% dengan ${capexInsights.delayed.length} proyek di bawah 60%.`,
        policy: 'Pisahkan proyek konstruksi vs pengadaan dalam milestone dua-mingguan dengan indikator serapan anggaran.',
      },
      {
        key: 'cashflow',
        title: 'Arus kas operasional perlu guardrail kebijakan belanja',
        severity: executiveKpi.monthlyBurn > executiveKpi.totalCash * 0.45 ? 'Tinggi' : 'Sedang',
        evidence: `Kas konsolidasi ${formatIDR(executiveKpi.totalCash)} dengan beban keluar ${formatIDR(executiveKpi.monthlyBurn)}.`,
        policy: 'Aktifkan plafon belanja kategori non-prioritas dan review kas mingguan di level pimpinan.',
      },
      {
        key: 'piket',
        title: 'Temuan piket urgent butuh closure tracking yang disiplin',
        severity: piketInsights.urgent >= 3 ? 'Tinggi' : 'Sedang',
        evidence: `${piketInsights.urgent} catatan urgent dengan ${piketInsights.pendingFollowup} follow-up yang belum berstatus selesai.`,
        policy: 'Wajibkan SLA tindak lanjut 48 jam untuk temuan urgent plus eskalasi otomatis ke koordinator.',
      },
    ];

    const level = { Tinggi: 3, Sedang: 2, Rendah: 1 };
    return findings.sort((a, b) => level[b.severity as keyof typeof level] - level[a.severity as keyof typeof level]);
  }, [executiveKpi, acInsights, capexInsights, piketInsights]);

  const policyFindingsExternal = useMemo(() => {
    const topUnit = unitKpi[0];
    const imbalanced =
      unitKpi.length > 1 &&
      topUnit &&
      topUnit.open > Math.max(1, Math.round(unitKpi.reduce((sum, item) => sum + item.open, 0) / unitKpi.length) + 2);

    const findings = [
      {
        key: 'load-balance',
        title: 'Distribusi beban lintas unit belum seimbang',
        severity: imbalanced ? 'Tinggi' : 'Sedang',
        evidence: topUnit
          ? `Unit ${topUnit.unit} memiliki ${topUnit.open} tiket terbuka (${topUnit.high} high priority).`
          : 'Belum ada data unit yang cukup.',
        policy: 'Berlakukan skema rotasi dukungan antar-unit saat antrean unit melampaui ambang kerja.',
      },
      {
        key: 'cross-program',
        title: 'Program lintas unit butuh ritme eksekusi bersama',
        severity: capexInsights.delayed.length >= 3 ? 'Tinggi' : 'Sedang',
        evidence: `${capexInsights.delayed.length} proyek strategis memerlukan akselerasi kolaborasi antar unit teknis dan sarpras.`,
        policy: 'Tetapkan PMO mini bulanan: satu daftar risiko lintas unit, satu pemilik keputusan, satu deadline final.',
      },
      {
        key: 'infrastructure',
        title: 'Tekanan utilisasi infrastruktur perlu mitigasi preventif',
        severity: wifiInsights.delta > 100 ? 'Tinggi' : wifiInsights.delta > 0 ? 'Sedang' : 'Rendah',
        evidence: `Perubahan klien wifi terakhir ${wifiInsights.delta >= 0 ? '+' : ''}${wifiInsights.delta} dari pembacaan sebelumnya.`,
        policy: 'Sinkronkan kalender akademik dengan kapasitas jaringan dan jadwalkan tuning QoS sebelum periode padat.',
      },
      {
        key: 'cost-governance',
        title: 'Biaya utilitas dan operasional perlu satu kontrol kebijakan',
        severity: utilityInsights.growth > 15 ? 'Tinggi' : utilityInsights.growth > 5 ? 'Sedang' : 'Rendah',
        evidence: `Total utilitas bulan terbaru ${formatIDR(utilityInsights.totalLatest)} (${utilityInsights.growth.toFixed(1)}% vs bulan sebelumnya).`,
        policy: 'Gabungkan forum evaluasi energi, sarpras, dan IT agar kebijakan penghematan menjadi lintas-unit.',
      },
    ];

    const level = { Tinggi: 3, Sedang: 2, Rendah: 1 };
    return findings.sort((a, b) => level[b.severity as keyof typeof level] - level[a.severity as keyof typeof level]);
  }, [unitKpi, capexInsights, wifiInsights, utilityInsights]);

  const shortTermActions = useMemo(() => {
    return [
      `Clearing ${executiveKpi.overdueTickets} tiket overdue per minggu dengan target penurunan minimal 40% dalam 30 hari.`,
      `Tutup ${piketInsights.pendingFollowup} temuan piket tertunda menggunakan review harian koordinator.`,
      `Akselerasi ${capexInsights.delayed.length} proyek CAPEX prioritas rendah-progress dengan milestone mingguan.`,
      `Lakukan review kas tiap pekan: batas belanja operasional maksimal 35% dari saldo kas konsolidasi.`,
    ];
  }, [executiveKpi.overdueTickets, piketInsights.pendingFollowup, capexInsights.delayed.length]);

  const structuralActions = useMemo(() => {
    return [
      'Bangun dashboard SLA lintas unit dengan trigger eskalasi otomatis untuk tiket high-priority > 7 hari.',
      'Tetapkan standar RACI antar unit IT, Lab, Sarpras, dan TU untuk seluruh program bulanan strategis.',
      'Kunci kebijakan preventive maintenance AC dan jaringan dalam kalender operasional semesteran.',
      'Integrasikan indikator biaya utilitas, kas, dan capaian layanan menjadi scorecard kebijakan pimpinan.',
    ];
  }, []);

  const renderSeverityBadge = (severity: string) => {
    const className =
      severity === 'Tinggi' ? 'badge badge-danger' : severity === 'Sedang' ? 'badge badge-warning' : 'badge badge-success';
    return <span className={className}>{severity}</span>;
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div className="flex-row-responsive" style={{ marginBottom: '1.5rem', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title gradient-text">Rapat Bulanan - Pusat Evaluasi Kebijakan</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Sinkronisasi data operasional lintas menu menjadi bahan keputusan internal dan antar unit.
          </p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Sinkron terakhir: {lastSync ? formatShortDateTime(lastSync) : '-'}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            background: 'var(--bg-card)',
            padding: '0.25rem',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            flexWrap: 'wrap',
            gap: '0.25rem',
          }}
        >
          <button
            onClick={() => setActiveTab('internal')}
            style={{
              flex: '1 1 auto',
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'internal' ? 'var(--accent-blue-ghost)' : 'transparent',
              color: activeTab === 'internal' ? 'var(--accent-blue)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'internal' ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap',
              fontSize: '0.85rem',
            }}
          >
            1. Evaluasi Internal
          </button>
          <button
            onClick={() => setActiveTab('eksternal')}
            style={{
              flex: '1 1 auto',
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'eksternal' ? 'var(--accent-violet-ghost)' : 'transparent',
              color: activeTab === 'eksternal' ? 'var(--accent-violet)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'eksternal' ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap',
              fontSize: '0.85rem',
            }}
          >
            2. Evaluasi Antar Unit
          </button>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Loader2 size={18} className="animate-spin" color="var(--accent-blue)" />
          <span style={{ color: 'var(--text-secondary)' }}>Mengolah data lintas menu untuk bahan rapat bulanan...</span>
        </div>
      ) : (
        <>
          {error && (
            <div
              className="glass-panel"
              style={{
                padding: '0.85rem 1rem',
                marginBottom: '1rem',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                background: 'rgba(245, 158, 11, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--accent-amber)' }}>
                <AlertTriangle size={16} />
                {error}
              </div>
            </div>
          )}

          <div
            className="stats-grid"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}
          >
            <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
              <div className="stat-header">
                <span className="stat-title" style={{ fontSize: '0.65rem' }}>
                  Skor Kesehatan Operasional
                </span>
                <Activity size={14} color="var(--accent-blue)" />
              </div>
              <div className="stat-value" style={{ fontSize: '1.45rem' }}>
                {executiveKpi.healthScore.toFixed(1)}
              </div>
            </div>

            <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
              <div className="stat-header">
                <span className="stat-title" style={{ fontSize: '0.65rem' }}>
                  Rasio Penyelesaian
                </span>
                <CheckCircle2 size={14} color="var(--accent-emerald)" />
              </div>
              <div className="stat-value" style={{ fontSize: '1.45rem' }}>
                {executiveKpi.completionRate.toFixed(1)}%
              </div>
            </div>

            <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
              <div className="stat-header">
                <span className="stat-title" style={{ fontSize: '0.65rem' }}>
                  Tiket Overdue
                </span>
                <ShieldAlert size={14} color="var(--accent-rose)" />
              </div>
              <div className="stat-value" style={{ fontSize: '1.45rem', color: 'var(--accent-rose)' }}>
                {executiveKpi.overdueTickets}
              </div>
            </div>

            <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
              <div className="stat-header">
                <span className="stat-title" style={{ fontSize: '0.65rem' }}>
                  High Priority Open
                </span>
                <Clock3 size={14} color="var(--accent-amber)" />
              </div>
              <div className="stat-value" style={{ fontSize: '1.45rem' }}>
                {executiveKpi.highPriority}
              </div>
            </div>

            <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
              <div className="stat-header">
                <span className="stat-title" style={{ fontSize: '0.65rem' }}>
                  Kas Konsolidasi
                </span>
                <Wallet size={14} color="var(--accent-cyan)" />
              </div>
              <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                {formatIDR(executiveKpi.totalCash)}
              </div>
            </div>

            <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
              <div className="stat-header">
                <span className="stat-title" style={{ fontSize: '0.65rem' }}>
                  Burn Rate Bulan Ini
                </span>
                <Landmark size={14} color="var(--accent-violet)" />
              </div>
              <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                {formatIDR(executiveKpi.monthlyBurn)}
              </div>
            </div>
          </div>

          {activeTab === 'internal' && (
            <div className="animate-fade-in">
              <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="glass-panel chart-container" style={{ minHeight: '315px' }}>
                  <div className="chart-header">
                    <h3 style={{ fontSize: '0.95rem' }}>A. Tren Beban vs Penyelesaian (6 Bulan)</h3>
                  </div>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyTicketTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="internalMasuk" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="internalSelesai" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                        <YAxis stroke="var(--text-muted)" fontSize={10} />
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--bg-card)',
                            borderColor: 'var(--border-focus)',
                            borderRadius: '8px',
                          }}
                        />
                        <Area type="monotone" dataKey="Masuk" stroke="#3b82f6" fillOpacity={1} fill="url(#internalMasuk)" />
                        <Area type="monotone" dataKey="Selesai" stroke="#10b981" fillOpacity={1} fill="url(#internalSelesai)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-panel chart-container" style={{ minHeight: '315px' }}>
                  <div className="chart-header">
                    <h3 style={{ fontSize: '0.95rem' }}>B. Evaluasi Kategori Pekerjaan</h3>
                  </div>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                        <XAxis type="number" stroke="var(--text-muted)" fontSize={10} />
                        <YAxis dataKey="name" type="category" width={95} stroke="var(--text-muted)" fontSize={10} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--bg-card)',
                            borderColor: 'var(--border-focus)',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="total" name="Total" fill="var(--accent-blue-ghost)" stroke="var(--accent-blue)" />
                        <Bar dataKey="selesai" name="Selesai" fill="var(--accent-emerald)" />
                        <Bar dataKey="overdue" name="Overdue" fill="var(--accent-rose)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={18} color="var(--accent-rose)" /> C. Analisa Evaluasi Internal (Dasar Kebijakan)
                </h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Area Risiko</th>
                        <th className="mobile-hide">Evidensi Data</th>
                        <th>Status Risiko</th>
                        <th>Rekomendasi Kebijakan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {policyFindingsInternal.map((item) => (
                        <tr key={item.key}>
                          <td style={{ fontWeight: 600 }}>{item.title}</td>
                          <td className="mobile-hide" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {item.evidence}
                          </td>
                          <td>{renderSeverityBadge(item.severity)}</td>
                          <td style={{ fontSize: '0.84rem', color: 'var(--accent-amber)' }}>{item.policy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="dashboard-grid">
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.98rem', marginBottom: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Target size={17} color="var(--accent-blue)" /> D. Kebijakan 30 Hari (Quick Win)
                  </h3>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {shortTermActions.map((action, index) => (
                      <li
                        key={action}
                        style={{
                          fontSize: '0.86rem',
                          color: 'var(--text-secondary)',
                          borderBottom: '1px solid var(--border-subtle)',
                          paddingBottom: '0.65rem',
                        }}
                      >
                        <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{index + 1}. </span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-emerald)' }}>
                  <h3 style={{ fontSize: '0.98rem', marginBottom: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={17} color="var(--accent-emerald)" /> E. Kebijakan Struktural (Quarterly)
                  </h3>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {structuralActions.map((action, index) => (
                      <li
                        key={action}
                        style={{
                          fontSize: '0.86rem',
                          color: 'var(--text-secondary)',
                          borderBottom: '1px solid var(--border-subtle)',
                          paddingBottom: '0.65rem',
                        }}
                      >
                        <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>{index + 1}. </span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'eksternal' && (
            <div className="animate-fade-in">
              <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="glass-panel chart-container" style={{ minHeight: '320px' }}>
                  <div className="chart-header">
                    <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <LayoutGrid size={16} color="var(--accent-blue)" /> A. Peta Kinerja Lintas Unit
                    </h3>
                  </div>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={unitKpi.slice(0, 8)} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                        <XAxis dataKey="unit" stroke="var(--text-muted)" fontSize={10} />
                        <YAxis stroke="var(--text-muted)" fontSize={10} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--bg-card)',
                            borderColor: 'var(--border-focus)',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="done" name="Selesai" fill="var(--accent-emerald)" />
                        <Bar dataKey="open" name="Terbuka" fill="var(--accent-blue)" />
                        <Bar dataKey="overdue" name="Overdue" fill="var(--accent-rose)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '0.95rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Handshake size={16} color="var(--accent-violet)" /> B. Prioritas Kolaborasi Antar Unit
                  </h3>
                  <div className="table-container" style={{ marginBottom: '0.65rem' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Unit</th>
                          <th>Total</th>
                          <th className="mobile-hide">High</th>
                          <th>Overdue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unitKpi.slice(0, 6).map((item) => (
                          <tr key={item.unit}>
                            <td style={{ fontWeight: 600 }}>{item.unit}</td>
                            <td>{item.total}</td>
                            <td className="mobile-hide">{item.high}</td>
                            <td>
                              <span className={`badge ${item.overdue > 0 ? 'badge-danger' : 'badge-success'}`}>{item.overdue}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <Network size={14} style={{ marginRight: '0.4rem', verticalAlign: 'text-bottom' }} color="var(--accent-cyan)" />
                      Beban wifi terakhir: <strong style={{ color: 'var(--text-primary)' }}>{wifiInsights.latestCount}</strong> klien aktif
                      ({wifiInsights.delta >= 0 ? '+' : ''}
                      {wifiInsights.delta} vs pembacaan sebelumnya).
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <TrendingDown size={14} style={{ marginRight: '0.4rem', verticalAlign: 'text-bottom' }} color="var(--accent-amber)" />
                      Utilitas terbaru: <strong style={{ color: 'var(--text-primary)' }}>{formatIDR(utilityInsights.totalLatest)}</strong> (
                      {utilityInsights.growth.toFixed(1)}% terhadap bulan sebelumnya).
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={18} color="var(--accent-cyan)" /> C. Analisa Kebijakan Antar Unit
                </h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Temuan Strategis</th>
                        <th className="mobile-hide">Evidensi</th>
                        <th>Status</th>
                        <th>Arah Kebijakan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {policyFindingsExternal.map((item) => (
                        <tr key={item.key}>
                          <td style={{ fontWeight: 600 }}>{item.title}</td>
                          <td className="mobile-hide" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {item.evidence}
                          </td>
                          <td>{renderSeverityBadge(item.severity)}</td>
                          <td style={{ fontSize: '0.84rem', color: 'var(--accent-amber)' }}>{item.policy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>D. Program Strategis Lintas Unit (CAPEX Watchlist)</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Program</th>
                        <th className="mobile-hide">Penanggung Jawab</th>
                        <th>Progres</th>
                        <th>Status Kebijakan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {capexInsights.projects.map((project) => (
                        <tr key={project.id}>
                          <td style={{ fontWeight: 600 }}>{project.nama}</td>
                          <td className="mobile-hide">{project.owner}</td>
                          <td style={{ minWidth: '150px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.8rem', minWidth: '38px' }}>{project.progress}%</span>
                              <div className="progress-bar-bg" style={{ height: '5px', flex: 1 }}>
                                <div
                                  className="progress-bar-fill"
                                  style={{
                                    width: `${Math.max(0, Math.min(100, project.progress))}%`,
                                    background:
                                      project.progress >= 80
                                        ? 'var(--accent-emerald)'
                                        : project.progress >= 60
                                          ? 'var(--accent-amber)'
                                          : 'var(--accent-rose)',
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td>
                            {project.progress >= 80 ? (
                              <span className="badge badge-success">On Track</span>
                            ) : project.progress >= 60 ? (
                              <span className="badge badge-warning">Perlu Akselerasi</span>
                            ) : (
                              <span className="badge badge-danger">Perlu Intervensi</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MeetingDashboard;
