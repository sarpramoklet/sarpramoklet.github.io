import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LabelList } from 'recharts';
import { Plus, ReceiptText, FileText, BarChart3, RefreshCw, Loader2, Edit3, Trash2, X, Upload } from 'lucide-react';

const API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";
const UTILITIES_SHEET = 'Tagihan_Utilitas';
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

type UtilityType = 'PLN' | 'PDAM';
type BillStatus = 'Lunas' | 'Mengajukan Pembayaran';

type UtilityBillRow = {
  id: string;
  bulan: string; // YYYY-MM
  jenis: UtilityType;
  pelanggan: string;
  nominal: number;
  status: BillStatus;
  catatan: string;
  buktiNama: string;
  updatedAt?: string;
};

type UtilityFormState = {
  bulan: string;
  status: BillStatus;
  customerPreset: string;
  jenis: UtilityType;
  pelanggan: string;
  nominal: string;
  catatan: string;
  buktiNama: string;
};

const CUSTOMER_PRESETS = [
  { id: 'pln_yayasan', jenis: 'PLN' as const, pelanggan: 'Yayasan Sandykara', label: 'PLN - Yayasan Sandykara' },
  { id: 'pln_smk', jenis: 'PLN' as const, pelanggan: 'SMK Telkom', label: 'PLN - SMK Telkom' },
  { id: 'pln_kantin', jenis: 'PLN' as const, pelanggan: 'Kantin', label: 'PLN - Kantin' },
  { id: 'pdam_yys', jenis: 'PDAM' as const, pelanggan: 'Yys Sandhikara', label: 'PDAM - Yys Sandhikara' },
] as const;

const toNumber = (value: unknown) => {
  const raw = String(value ?? '').replace(/[^\d.-]/g, '');
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatRupiah = (number: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
};

const slugify = (value: string) => {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 32);
};

const normalizeMonth = (value: unknown): string => {
  const raw = String(value ?? '').trim().replace(/^'+/, '');
  if (!raw) return '';

  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
      });
      const parts = formatter.formatToParts(parsed);
      const year = parts.find((part) => part.type === 'year')?.value || '1970';
      const month = parts.find((part) => part.type === 'month')?.value || '01';
      return `${year}-${month}`;
    }
    return raw.slice(0, 7);
  }

  const dmy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/);
  if (dmy) {
    const mm = String(parseInt(dmy[2], 10) || 1).padStart(2, '0');
    const yy = parseInt(dmy[3], 10) || 0;
    const yyyy = yy < 100 ? 2000 + yy : yy;
    return `${yyyy}-${mm}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
  }

  return '';
};

const toCustomerDisplay = (jenis: UtilityType, pelanggan: string) => `${jenis} - ${pelanggan}`;
const customerKey = (jenis: UtilityType, pelanggan: string) => `${jenis}::${pelanggan.trim().toLowerCase()}`;

const buildUtilityId = (bulan: string, jenis: UtilityType, pelanggan: string) => {
  return `UTL-${bulan.replace('-', '')}-${slugify(`${jenis}-${pelanggan}`)}`.toUpperCase();
};

const parseLegacyMonthToken = (token: string) => {
  const upper = token.toUpperCase();
  if (/^\d{6}$/.test(upper)) return `${upper.slice(0, 4)}-${upper.slice(4, 6)}`;

  const monthMap: Record<string, string> = {
    JAN: '01',
    FEB: '02',
    MAR: '03',
    APR: '04',
    MEI: '05',
    MAY: '05',
    JUN: '06',
    JUL: '07',
    AGT: '08',
    AUG: '08',
    SEP: '09',
    OKT: '10',
    OCT: '10',
    NOV: '11',
    DES: '12',
    DEC: '12',
  };

  const alphaNumeric = upper.match(/^([A-Z]{3})(\d{2})$/);
  if (!alphaNumeric) return '';

  const mm = monthMap[alphaNumeric[1]];
  if (!mm) return '';
  return `20${alphaNumeric[2]}-${mm}`;
};

const titleCaseCustomer = (value: string) => {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => {
      if (part.length <= 3) return part.toUpperCase();
      return `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`;
    })
    .join(' ');
};

const parseLegacyUtilityId = (rawId: string) => {
  const id = String(rawId || '').trim();
  if (!id.toUpperCase().startsWith('UTL-')) return null;

  const upper = id.toUpperCase();
  const parts = upper.split('-').filter(Boolean);
  if (parts.length < 3) return null;

  const month = parseLegacyMonthToken(parts[1]);
  let jenis = '';
  let customerParts: string[] = [];

  if (parts[2] === 'PLN' || parts[2] === 'PDAM') {
    jenis = parts[2];
    customerParts = parts.slice(3);
  } else {
    const tail = parts[parts.length - 1];
    if (tail === 'PLN' || tail === 'PDAM') {
      jenis = tail;
      customerParts = parts.slice(2, -1);
    }
  }

  if (!month || !jenis || customerParts.length === 0) return null;

  let pelanggan = titleCaseCustomer(customerParts.join('-'));
  pelanggan = pelanggan.replace(/^Yys\b/i, 'Yys');
  pelanggan = pelanggan.replace(/^Smk\b/i, 'SMK');
  pelanggan = pelanggan.replace(/^Pln\b/i, 'PLN');
  pelanggan = pelanggan.replace(/^Pdam\b/i, 'PDAM');

  return {
    bulan: month,
    jenis: jenis as UtilityType,
    pelanggan,
  };
};

const currentMonthValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const nextMonthValue = (month: string) => {
  if (!/^\d{4}-\d{2}$/.test(month)) return currentMonthValue();
  const [year, mm] = month.split('-');
  const parsedYear = parseInt(year, 10) || new Date().getFullYear();
  const parsedMonth = (parseInt(mm, 10) || 1) - 1;
  const next = new Date(parsedYear, parsedMonth + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
};

const monthLongLabel = (month: string) => {
  if (!/^\d{4}-\d{2}$/.test(month)) return month;
  const [yyyy, mm] = month.split('-');
  const date = new Date(parseInt(yyyy, 10), (parseInt(mm, 10) || 1) - 1, 1);
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(date);
};

const monthHeaderLabel = (month: string, referenceYear: string) => {
  if (!/^\d{4}-\d{2}$/.test(month)) return month.toUpperCase();
  const [yyyy, mm] = month.split('-');
  const monthIndex = Math.max(0, Math.min(11, (parseInt(mm, 10) || 1) - 1));
  const base = MONTH_SHORT[monthIndex].toUpperCase();
  if (yyyy !== referenceYear) return `${base} ${yyyy.slice(-2)}`;
  return base;
};

const normalizeRows = (rows: any[]): UtilityBillRow[] => {
  const mapped = rows.map<UtilityBillRow | null>((row: any) => {
    const id = String(row.id || row.ID || '').trim();
    const legacy = parseLegacyUtilityId(id);
    const bulan = normalizeMonth(row.bulan || row.Bulan || row.month || row.Month || row.tanggal || row.Tanggal || legacy?.bulan);
    let jenisRaw = String(row.jenis || row.Jenis || row.type || row.Type || '').trim().toUpperCase();
    let pelanggan = String(row.pelanggan || row.Pelanggan || row.customer || row.Customer || legacy?.pelanggan || '').trim();
    const pelangganDisplay = String(row.pelangganDisplay || row.PelangganDisplay || '').trim();
    if (!pelanggan && pelangganDisplay) pelanggan = pelangganDisplay;

    const prefixed = pelanggan.match(/^(PLN|PDAM)\s*[-–]\s*(.+)$/i);
    if (prefixed) {
      if (!jenisRaw) jenisRaw = prefixed[1].toUpperCase();
      pelanggan = prefixed[2].trim();
    }

    if (!jenisRaw && legacy?.jenis) jenisRaw = legacy.jenis;

    const jenis: UtilityType = jenisRaw === 'PDAM' ? 'PDAM' : 'PLN';
    const nominal = toNumber(row.nominal || row.Nominal || row.amount || row.Amount);
    const statusRaw = String(row.status || row.Status || '').trim().toLowerCase();
    const status: BillStatus = statusRaw.includes('ajukan') ? 'Mengajukan Pembayaran' : 'Lunas';
    const catatan = String(row.catatan || row.Catatan || row.keterangan || row.Keterangan || '').trim();
    const buktiNama = String(row.buktiNama || row.BuktiNama || row.fileName || row.FileName || '').trim();
    const updatedAt = String(row.updatedAt || row.UpdatedAt || '').trim();

    if (!bulan || !pelanggan) return null;

    return {
      id: id || buildUtilityId(bulan, jenis, pelanggan),
      bulan,
      jenis,
      pelanggan,
      nominal,
      status,
      catatan,
      buktiNama,
      updatedAt,
    };
  });

  const normalized = mapped.filter((item): item is UtilityBillRow => item !== null);
  return normalized.sort((a, b) => b.bulan.localeCompare(a.bulan) || a.jenis.localeCompare(b.jenis) || a.pelanggan.localeCompare(b.pelanggan));
};

const createEmptyForm = (bulan: string): UtilityFormState => ({
  bulan,
  status: 'Lunas',
  customerPreset: CUSTOMER_PRESETS[0].id,
  jenis: CUSTOMER_PRESETS[0].jenis,
  pelanggan: CUSTOMER_PRESETS[0].pelanggan,
  nominal: '',
  catatan: '',
  buktiNama: '',
});

const Utilities = () => {
  const [activeTab, setActiveTab] = useState<'rekap' | 'grafik'>('rekap');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<UtilityBillRow | null>(null);
  const [rows, setRows] = useState<UtilityBillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterMonth, setFilterMonth] = useState('');
  const [form, setForm] = useState<UtilityFormState>(createEmptyForm('2026-04'));

  const fetchRows = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?sheetName=${UTILITIES_SHEET}`);
      const data = await response.json();
      const normalized = Array.isArray(data) ? normalizeRows(data) : [];
      setRows(normalized);
    } catch (error) {
      console.error('Error fetching utilities:', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const monthOptions = useMemo(() => {
    const uniq = Array.from(new Set(rows.map((row) => row.bulan).filter(Boolean)));
    return uniq.sort((a, b) => b.localeCompare(a));
  }, [rows]);

  useEffect(() => {
    if (monthOptions.length === 0) return;
    if (!filterMonth || !monthOptions.includes(filterMonth)) {
      setFilterMonth(monthOptions[0]);
    }
  }, [filterMonth, monthOptions]);

  const comparisonMonths = useMemo(() => {
    const asc = [...monthOptions].sort((a, b) => a.localeCompare(b));
    return asc.slice(-5);
  }, [monthOptions]);

  const comparisonReferenceYear = comparisonMonths[comparisonMonths.length - 1]?.slice(0, 4) || '';

  const customerRows = useMemo(() => {
    const presetOrder = CUSTOMER_PRESETS.map((item) => customerKey(item.jenis, item.pelanggan));
    const matrix = new Map<string, { label: string; values: Record<string, number> }>();

    rows.forEach((item) => {
      const key = customerKey(item.jenis, item.pelanggan);
      if (!matrix.has(key)) {
        matrix.set(key, { label: toCustomerDisplay(item.jenis, item.pelanggan), values: {} });
      }
      const current = matrix.get(key);
      if (!current) return;
      current.values[item.bulan] = (current.values[item.bulan] || 0) + item.nominal;
    });

    const ordered = Array.from(matrix.entries()).sort((left, right) => {
      const leftIndex = presetOrder.indexOf(left[0]);
      const rightIndex = presetOrder.indexOf(right[0]);
      if (leftIndex >= 0 && rightIndex >= 0) return leftIndex - rightIndex;
      if (leftIndex >= 0) return -1;
      if (rightIndex >= 0) return 1;
      return left[1].label.localeCompare(right[1].label, 'id-ID');
    });

    return ordered.map(([key, value]) => ({ key, ...value }));
  }, [rows]);

  const monthTotal = (month: string) => {
    return customerRows.reduce((acc, row) => acc + (row.values[month] || 0), 0);
  };

  const chartData = useMemo(() => {
    return [...monthOptions]
      .sort((a, b) => a.localeCompare(b))
      .map((month) => {
        const records = rows.filter((row) => row.bulan === month);
        return {
          name: monthHeaderLabel(month, comparisonReferenceYear || month.slice(0, 4)),
          PLN: records.filter((row) => row.jenis === 'PLN').reduce((acc, row) => acc + row.nominal, 0),
          PDAM: records.filter((row) => row.jenis === 'PDAM').reduce((acc, row) => acc + row.nominal, 0),
        };
      });
  }, [rows, monthOptions, comparisonReferenceYear]);

  const detailRows = useMemo(() => {
    if (!filterMonth) return [];
    return rows
      .filter((row) => row.bulan === filterMonth)
      .sort((a, b) => a.jenis.localeCompare(b.jenis) || a.pelanggan.localeCompare(b.pelanggan));
  }, [rows, filterMonth]);

  const nextInputMonth = useMemo(() => {
    return monthOptions[0] ? nextMonthValue(monthOptions[0]) : currentMonthValue();
  }, [monthOptions]);

  const openCreateModal = () => {
    const defaultMonth = nextInputMonth;
    setEditingRow(null);
    setForm(createEmptyForm(defaultMonth));
    setIsModalOpen(true);
  };

  const openEditModal = (row: UtilityBillRow) => {
    const preset = CUSTOMER_PRESETS.find((item) => item.jenis === row.jenis && item.pelanggan.toLowerCase() === row.pelanggan.toLowerCase());
    setEditingRow(row);
    setForm({
      bulan: row.bulan,
      status: row.status,
      customerPreset: preset?.id || 'custom',
      jenis: row.jenis,
      pelanggan: row.pelanggan,
      nominal: String(row.nominal || ''),
      catatan: row.catatan,
      buktiNama: row.buktiNama || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingRow(null);
    setForm(createEmptyForm(filterMonth || currentMonthValue()));
    setIsModalOpen(false);
  };

  const persistUtility = async (row: UtilityBillRow) => {
    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'FINANCE_RECORD',
        sheetName: UTILITIES_SHEET,
        sheet: UTILITIES_SHEET,
        ID: row.id,
        Bulan: `'${row.bulan}`,
        Jenis: row.jenis,
        Pelanggan: row.pelanggan,
        Nominal: row.nominal,
        Status: row.status,
        Catatan: row.catatan,
        BuktiNama: row.buktiNama,
        UpdatedAt: row.updatedAt || new Date().toISOString(),
        id: row.id,
        bulan: row.bulan,
        jenis: row.jenis,
        pelanggan: row.pelanggan,
        pelangganDisplay: toCustomerDisplay(row.jenis, row.pelanggan),
        PelangganDisplay: toCustomerDisplay(row.jenis, row.pelanggan),
        nominal: row.nominal,
        amount: row.nominal,
        Amount: row.nominal,
        status: row.status,
        catatan: row.catatan,
        buktiNama: row.buktiNama,
        updatedAt: row.updatedAt || new Date().toISOString(),
      }),
    });
  };

  const handleSave = async () => {
    const pelanggan = form.pelanggan.trim();
    const nominal = toNumber(form.nominal);
    if (!form.bulan || !pelanggan || nominal <= 0) {
      alert('Lengkapi bulan, pelanggan, dan nominal tagihan.');
      return;
    }

    const payload: UtilityBillRow = {
      id: editingRow?.id || buildUtilityId(form.bulan, form.jenis, pelanggan),
      bulan: form.bulan,
      jenis: form.jenis,
      pelanggan,
      nominal,
      status: form.status,
      catatan: form.catatan.trim(),
      buktiNama: form.buktiNama.trim(),
      updatedAt: new Date().toISOString(),
    };

    setSaving(true);
    try {
      await persistUtility(payload);
      closeModal();
      setTimeout(fetchRows, 1200);
    } catch (error) {
      console.error('Save utility failed:', error);
      alert('Gagal menyimpan tagihan utilitas.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: UtilityBillRow) => {
    if (!confirm(`Hapus tagihan ${toCustomerDisplay(row.jenis, row.pelanggan)} (${monthLongLabel(row.bulan)})?`)) return;

    setSaving(true);
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'DELETE_RECORD',
          sheetName: UTILITIES_SHEET,
          sheet: UTILITIES_SHEET,
          id: row.id,
          ID: row.id,
        }),
      });
      setTimeout(fetchRows, 1200);
    } catch (error) {
      console.error('Delete utility failed:', error);
      alert('Gagal menghapus tagihan utilitas.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div className="flex-row-responsive" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Manajemen Utilitas</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Data utilitas sudah sinkron ke database dan siap lanjut input bulan berikutnya.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={fetchRows} disabled={loading || saving}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Sync
          </button>
          <button className="btn btn-primary" onClick={openCreateModal} disabled={saving}>
            <Plus size={18} /> Input Nota Baru
          </button>
        </div>
      </div>

      <div className="flex-row-responsive" style={{ gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <button
          className={`btn ${activeTab === 'rekap' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('rekap')}
          style={{ flex: 1, border: activeTab === 'rekap' ? 'none' : '1px solid var(--border-subtle)' }}
        >
          <ReceiptText size={18} /> Rekap Perbandingan
        </button>
        <button
          className={`btn ${activeTab === 'grafik' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('grafik')}
          style={{ flex: 1, border: activeTab === 'grafik' ? 'none' : '1px solid var(--border-subtle)' }}
        >
          <BarChart3 size={18} /> Tren Pengeluaran
        </button>
      </div>

      {activeTab === 'rekap' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-panel">
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <BarChart3 size={24} color="var(--accent-blue)" />
              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Perbandingan Tagihan PLN & PDAM</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>Rekap biaya utilitas terbaru langsung dari database</p>
              </div>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr style={{ background: 'rgba(244, 63, 94, 0.1)' }}>
                    <th style={{ color: 'var(--accent-rose)', fontSize: '0.75rem' }}>PELANGGAN</th>
                    {comparisonMonths.map((month) => (
                      <th key={month} style={{ textAlign: 'center', color: 'var(--accent-rose)', fontSize: '0.75rem' }}>
                        {monthHeaderLabel(month, comparisonReferenceYear)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customerRows.map((row) => (
                    <tr className="ticket-row" key={row.key}>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{row.label}</td>
                      {comparisonMonths.map((month) => (
                        <td key={`${row.key}-${month}`} style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          {formatRupiah(row.values[month] || 0)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {comparisonMonths.length > 0 && (
                    <tr style={{ background: 'rgba(255,255,255,0.05)', borderTop: '2px solid var(--border-focus)' }}>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>Total</td>
                      {comparisonMonths.map((month) => (
                        <td key={`total-${month}`} style={{ textAlign: 'center', fontWeight: 800, color: 'var(--accent-rose)', fontSize: '0.92rem' }}>
                          {formatRupiah(monthTotal(month))}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-panel">
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Data Tagihan Bulanan (CRUD)</h3>
              <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="input-responsive" style={{ minWidth: '180px' }}>
                {monthOptions.map((month) => (
                  <option key={month} value={month}>
                    {monthLongLabel(month)}
                  </option>
                ))}
              </select>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Pelanggan</th>
                    <th>Status</th>
                    <th>Nominal</th>
                    <th>Bukti</th>
                    <th>Catatan</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '1.4rem', color: 'var(--text-secondary)' }}>
                        Belum ada data pada bulan ini.
                      </td>
                    </tr>
                  ) : (
                    detailRows.map((row) => (
                      <tr key={row.id} className="ticket-row">
                        <td style={{ fontWeight: 700 }}>{toCustomerDisplay(row.jenis, row.pelanggan)}</td>
                        <td>
                          <span className={`badge ${row.status === 'Lunas' ? 'badge-success' : 'badge-warning'}`}>{row.status}</span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{formatRupiah(row.nominal)}</td>
                        <td>{row.buktiNama || '-'}</td>
                        <td>{row.catatan || '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.45rem' }}>
                            <button onClick={() => openEditModal(row)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer' }} title="Edit">
                              <Edit3 size={16} />
                            </button>
                            <button onClick={() => handleDelete(row)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer' }} title="Hapus">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'grafik' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--accent-amber)', margin: 0 }}>Tren Pengeluaran PLN (Listrik)</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>Fluktuasi biaya listrik bulanan</p>
            </div>
            <div style={{ height: '250px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(value) => `Rp${(Number(value) / 1000000).toFixed(0)}jt`} />
                  <RechartsTooltip formatter={(value: any) => formatRupiah(Number(value || 0))} />
                  <Bar dataKey="PLN" fill="var(--accent-amber)" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="PLN" position="top" formatter={(v: any) => (v ? `${(Number(v) / 1000000).toFixed(1)}jt` : '')} style={{ fontSize: '10px', fill: 'var(--accent-amber)' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--accent-cyan)', margin: 0 }}>Tren Pengeluaran PDAM (Air)</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>Fluktuasi biaya pemakaian air bulanan</p>
            </div>
            <div style={{ height: '250px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(value) => `Rp${(Number(value) / 1000000).toFixed(1)}jt`} />
                  <RechartsTooltip formatter={(value: any) => formatRupiah(Number(value || 0))} />
                  <Bar dataKey="PDAM" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="PDAM" position="top" formatter={(v: any) => (v ? `${(Number(v) / 1000000).toFixed(2)}jt` : '')} style={{ fontSize: '10px', fill: 'var(--accent-cyan)' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 1200, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <div style={{ padding: '8px', background: 'var(--accent-blue-ghost)', borderRadius: '8px', color: 'var(--accent-blue)' }}>
                  <FileText size={20} />
                </div>
                <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{editingRow ? 'Edit Nota Pembayaran' : 'Input Nota Pembayaran'}</h2>
              </div>
              <button onClick={closeModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <label style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Status Berkas</span>
                <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as BillStatus }))} className="input-responsive">
                  <option value="Lunas">Telah Dibayar (Lunas)</option>
                  <option value="Mengajukan Pembayaran">Mengajukan Pembayaran</option>
                </select>
              </label>

              <label style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Titik Pelanggan</span>
                <select
                  value={form.customerPreset}
                  onChange={(e) => {
                    const selected = e.target.value;
                    if (selected === 'custom') {
                      setForm((prev) => ({ ...prev, customerPreset: 'custom' }));
                      return;
                    }
                    const preset = CUSTOMER_PRESETS.find((item) => item.id === selected);
                    if (!preset) return;
                    setForm((prev) => ({
                      ...prev,
                      customerPreset: selected,
                      jenis: preset.jenis,
                      pelanggan: preset.pelanggan,
                    }));
                  }}
                  className="input-responsive"
                >
                  {CUSTOMER_PRESETS.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                  <option value="custom">Lainnya (custom)</option>
                </select>
              </label>

              {form.customerPreset === 'custom' && (
                <>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Jenis Utilitas</span>
                    <select value={form.jenis} onChange={(e) => setForm((prev) => ({ ...prev, jenis: e.target.value as UtilityType }))} className="input-responsive">
                      <option value="PLN">PLN (Listrik)</option>
                      <option value="PDAM">PDAM (Air)</option>
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Nama Pelanggan</span>
                    <input value={form.pelanggan} onChange={(e) => setForm((prev) => ({ ...prev, pelanggan: e.target.value }))} className="input-responsive" placeholder="Contoh: Asrama Putri" />
                  </label>
                </>
              )}

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Bulan Pemakaian</span>
                <input type="month" value={form.bulan} onChange={(e) => setForm((prev) => ({ ...prev, bulan: e.target.value }))} className="input-responsive" />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Total Nominal (Rp)</span>
                <input type="number" min={0} value={form.nominal} onChange={(e) => setForm((prev) => ({ ...prev, nominal: e.target.value }))} className="input-responsive" placeholder="Contoh: 1500000" />
              </label>

              <label style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Upload Bukti Transaksi / PDF Tagihan (nama file)</span>
                <label htmlFor="utility-proof-file" style={{ border: '1px dashed var(--border-focus)', padding: '1rem', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.18)', color: 'var(--text-secondary)' }}>
                  <Upload size={16} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
                  {form.buktiNama ? `File dipilih: ${form.buktiNama}` : 'Klik untuk pilih file bukti (belum upload ke cloud, hanya simpan nama file)'}
                </label>
                <input
                  id="utility-proof-file"
                  type="file"
                  accept=".pdf,image/*"
                  style={{ display: 'none' }}
                  onChange={(event) => {
                    const selected = event.target.files?.[0];
                    setForm((prev) => ({ ...prev, buktiNama: selected?.name || '' }));
                  }}
                />
              </label>

              <label style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Catatan</span>
                <textarea value={form.catatan} onChange={(e) => setForm((prev) => ({ ...prev, catatan: e.target.value }))} className="input-responsive" rows={3} placeholder="Catatan tambahan (opsional)" />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={closeModal}>Batal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Simpan Data
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginTop: '1.5rem', borderLeft: '4px solid var(--accent-cyan)', background: 'linear-gradient(90deg, rgba(6,182,212,0.08), transparent)' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Struktur Kolom Sheet (wajib)</div>
        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.6 }}>
          Sheet: <code>{UTILITIES_SHEET}</code>. Header minimal yang perlu ada agar CRUD aman:
          <br />
          <code>id | bulan | jenis | pelanggan | nominal | status | catatan | buktiNama | updatedAt</code>
          <br />
          Contoh baris: <code>UTL-202604-PLN-SMK-TELKOM | 2026-04 | PLN | SMK Telkom | 7815700 | Lunas | Input awal April 2026 | nota-april.pdf | 2026-04-10T08:00:00.000Z</code>
          <br />
          Catatan: field alias (<code>ID</code>, <code>Bulan</code>, <code>Nominal</code>, dll) tetap dikirim untuk kompatibilitas Apps Script lama.
        </div>
      </div>
    </div>
  );
};

export default Utilities;
