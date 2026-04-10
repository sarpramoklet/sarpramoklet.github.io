import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LabelList } from 'recharts';
import { Plus, ReceiptText, BarChart3, Edit3, Trash2, X, Loader2, RefreshCw, Search, Zap, Droplets } from 'lucide-react';

const API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";
const UTILITIES_SHEET = 'Tagihan_Utilitas';

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
  updatedAt?: string;
};

type UtilityFormState = {
  bulan: string;
  jenis: UtilityType;
  pelanggan: string;
  nominal: string;
  status: BillStatus;
  catatan: string;
};

const EMPTY_FORM: UtilityFormState = {
  bulan: '2026-04',
  jenis: 'PLN',
  pelanggan: '',
  nominal: '',
  status: 'Lunas',
  catatan: '',
};

const APRIL_2026_SEED: Omit<UtilityBillRow, 'id'>[] = [
  { bulan: '2026-04', jenis: 'PLN', pelanggan: 'Yayasan Sandykara Putra Telkom', nominal: 4155570, status: 'Lunas', catatan: 'Tagihan PLN April 2026' },
  { bulan: '2026-04', jenis: 'PLN', pelanggan: 'SMK Telkom', nominal: 7815700, status: 'Lunas', catatan: 'Tagihan PLN April 2026' },
  { bulan: '2026-04', jenis: 'PLN', pelanggan: 'Kantin SMK Telkom', nominal: 2626020, status: 'Lunas', catatan: 'Tagihan PLN April 2026' },
  { bulan: '2026-04', jenis: 'PDAM', pelanggan: 'Yayasan Sandykara Putra Telkom', nominal: 866000, status: 'Lunas', catatan: 'Tagihan PDAM April 2026' },
];

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

const monthToLabel = (month: string) => {
  if (!/^\d{4}-\d{2}$/.test(month)) return month;
  const [year, mm] = month.split('-');
  const monthIndex = Math.max(0, Math.min(11, (parseInt(mm, 10) || 1) - 1));
  const shortMonth = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'][monthIndex];
  return `${shortMonth} ${year.slice(-2)}`;
};

const normalizeMonth = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 7);

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

const slugify = (value: string) => {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 24);
};

const normalizeRows = (rows: any[]): UtilityBillRow[] => {
  const mapped = rows.map<UtilityBillRow | null>((row: any) => {
      const bulan = normalizeMonth(row.bulan || row.Bulan || row.month || row.Month || row.tanggal || row.Tanggal);
      const jenisRaw = String(row.jenis || row.Jenis || row.type || row.Type || '').trim().toUpperCase();
      const jenis: UtilityType = jenisRaw === 'PDAM' ? 'PDAM' : 'PLN';
      const pelanggan = String(row.pelanggan || row.Pelanggan || row.customer || row.Customer || '').trim();
      const nominal = toNumber(row.nominal || row.Nominal || row.amount || row.Amount);
      const statusRaw = String(row.status || row.Status || '').trim();
      const status: BillStatus = statusRaw.toLowerCase().includes('ajukan') ? 'Mengajukan Pembayaran' : 'Lunas';
      const catatan = String(row.catatan || row.Catatan || row.keterangan || row.Keterangan || '').trim();
      const id = String(row.id || row.ID || '').trim();
      const updatedAt = String(row.updatedAt || row.UpdatedAt || '').trim();

      if (!bulan || !pelanggan) return null;

      return {
        id: id || `UTL-${bulan.replace('-', '')}-${slugify(pelanggan)}-${jenis}`,
        bulan,
        jenis,
        pelanggan,
        nominal,
        status,
        catatan,
        updatedAt,
      };
    });

  const normalized = mapped.filter((item): item is UtilityBillRow => item !== null);

  return normalized.sort((a, b) => b.bulan.localeCompare(a.bulan) || a.jenis.localeCompare(b.jenis) || a.pelanggan.localeCompare(b.pelanggan));
};

const Utilities = () => {
  const [activeTab, setActiveTab] = useState<'rekap' | 'grafik' | 'riwayat'>('rekap');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<UtilityBillRow | null>(null);
  const [rows, setRows] = useState<UtilityBillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [form, setForm] = useState<UtilityFormState>(EMPTY_FORM);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?sheetName=${UTILITIES_SHEET}`);
      const data = await response.json();
      const normalized = Array.isArray(data) ? normalizeRows(data) : [];
      setRows(normalized);
      const newest = normalized[0]?.bulan || '2026-04';
      setFilterMonth(newest);
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

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return rows.filter((row) => {
      const matchMonth = filterMonth ? row.bulan === filterMonth : true;
      const matchSearch = !term
        || row.pelanggan.toLowerCase().includes(term)
        || row.jenis.toLowerCase().includes(term)
        || row.status.toLowerCase().includes(term)
        || row.catatan.toLowerCase().includes(term);
      return matchMonth && matchSearch;
    });
  }, [rows, filterMonth, searchTerm]);

  const monthRows = useMemo(() => {
    const target = filterMonth || monthOptions[0] || '';
    return rows.filter((row) => row.bulan === target);
  }, [rows, filterMonth, monthOptions]);

  const summary = useMemo(() => {
    const targetRows = monthRows;
    const total = targetRows.reduce((acc, item) => acc + item.nominal, 0);
    const pln = targetRows.filter((item) => item.jenis === 'PLN').reduce((acc, item) => acc + item.nominal, 0);
    const pdam = targetRows.filter((item) => item.jenis === 'PDAM').reduce((acc, item) => acc + item.nominal, 0);
    const biggest = [...targetRows].sort((a, b) => b.nominal - a.nominal)[0] || null;

    return {
      total,
      pln,
      pdam,
      biggest,
      plnPct: total > 0 ? (pln / total) * 100 : 0,
      pdamPct: total > 0 ? (pdam / total) * 100 : 0,
    };
  }, [monthRows]);

  const chartData = useMemo(() => {
    return monthOptions
      .slice()
      .sort((a, b) => a.localeCompare(b))
      .map((month) => {
        const data = rows.filter((row) => row.bulan === month);
        return {
          name: monthToLabel(month),
          PLN: data.filter((row) => row.jenis === 'PLN').reduce((acc, row) => acc + row.nominal, 0),
          PDAM: data.filter((row) => row.jenis === 'PDAM').reduce((acc, row) => acc + row.nominal, 0),
        };
      });
  }, [monthOptions, rows]);

  const openCreateModal = () => {
    setEditingRow(null);
    setForm({ ...EMPTY_FORM, bulan: filterMonth || monthOptions[0] || '2026-04' });
    setIsModalOpen(true);
  };

  const openEditModal = (row: UtilityBillRow) => {
    setEditingRow(row);
    setForm({
      bulan: row.bulan,
      jenis: row.jenis,
      pelanggan: row.pelanggan,
      nominal: String(row.nominal || ''),
      status: row.status,
      catatan: row.catatan,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingRow(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(false);
  };

  const upsertLocal = (incoming: UtilityBillRow) => {
    setRows((prev) => {
      const map = new Map(prev.map((item) => [item.id, item]));
      map.set(incoming.id, incoming);
      return Array.from(map.values()).sort((a, b) => b.bulan.localeCompare(a.bulan) || a.jenis.localeCompare(b.jenis) || a.pelanggan.localeCompare(b.pelanggan));
    });
    setFilterMonth(incoming.bulan);
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
        id: row.id,
        ID: row.id,
        bulan: row.bulan,
        Bulan: row.bulan,
        jenis: row.jenis,
        Jenis: row.jenis,
        pelanggan: row.pelanggan,
        Pelanggan: row.pelanggan,
        nominal: row.nominal,
        Nominal: row.nominal,
        amount: row.nominal,
        Amount: row.nominal,
        status: row.status,
        Status: row.status,
        catatan: row.catatan,
        Catatan: row.catatan,
        updatedAt: row.updatedAt || new Date().toISOString(),
        UpdatedAt: row.updatedAt || new Date().toISOString(),
      }),
    });
  };

  const handleSave = async () => {
    if (!form.bulan || !form.pelanggan.trim() || toNumber(form.nominal) <= 0) {
      alert('Lengkapi bulan, pelanggan, dan nominal tagihan.');
      return;
    }

    const payload: UtilityBillRow = {
      id: editingRow?.id || `UTL-${Date.now()}`,
      bulan: form.bulan,
      jenis: form.jenis,
      pelanggan: form.pelanggan.trim(),
      nominal: toNumber(form.nominal),
      status: form.status,
      catatan: form.catatan.trim(),
      updatedAt: new Date().toISOString(),
    };

    setSaving(true);
    try {
      await persistUtility(payload);
      upsertLocal(payload);
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
    if (!confirm(`Hapus tagihan ${row.pelanggan} (${monthToLabel(row.bulan)})?`)) return;

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
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      setTimeout(fetchRows, 1200);
    } catch (error) {
      console.error('Delete utility failed:', error);
      alert('Gagal menghapus tagihan utilitas.');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedApril2026 = async () => {
    if (!confirm('Isi data tagihan April 2026 sesuai rincian struk?')) return;

    setSaving(true);
    try {
      for (const item of APRIL_2026_SEED) {
        const row: UtilityBillRow = {
          ...item,
          id: `UTL-APR26-${slugify(item.pelanggan)}-${item.jenis}`,
          updatedAt: new Date().toISOString(),
        };
        await persistUtility(row);
        upsertLocal(row);
      }
      setFilterMonth('2026-04');
      setTimeout(fetchRows, 1200);
    } catch (error) {
      console.error('Seed utilities failed:', error);
      alert('Gagal mengisi data April 2026.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div className="flex-row-responsive" style={{ marginBottom: '2rem', gap: '0.8rem' }}>
        <div>
          <h1 className="page-title gradient-text">Tagihan Utilitas</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            CRUD tagihan listrik (PLN) dan air (PDAM) per bulan dengan insight biaya otomatis.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={fetchRows}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Sync
          </button>
          <button className="btn btn-outline" onClick={handleSeedApril2026} disabled={saving}>
            <Zap size={16} /> Isi April 2026
          </button>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Input Tagihan
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="glass-panel stat-card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-violet)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grand Total {monthToLabel(filterMonth || monthOptions[0] || '')}</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-violet)', marginTop: '0.35rem' }}>{formatRupiah(summary.total)}</div>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-amber)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Listrik (PLN)</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.35rem' }}>{formatRupiah(summary.pln)}</div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{summary.plnPct.toFixed(1)}% dari total bulan ini.</div>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-cyan)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Air (PDAM)</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '0.35rem' }}>{formatRupiah(summary.pdam)}</div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{summary.pdamPct.toFixed(1)}% dari total bulan ini.</div>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-rose)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tagihan Terbesar</div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-rose)', marginTop: '0.35rem' }}>
            {summary.biggest ? summary.biggest.pelanggan : '-'}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {summary.biggest ? formatRupiah(summary.biggest.nominal) : 'Belum ada data.'}
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div className="flex-row-responsive" style={{ gap: '0.8rem' }}>
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari pelanggan, jenis, status, atau catatan..."
              className="input-responsive"
              style={{ width: '100%', paddingLeft: '2.4rem' }}
            />
          </div>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="input-responsive"
            style={{ minWidth: '170px' }}
          >
            {monthOptions.length === 0 && <option value="">Belum ada data</option>}
            {monthOptions.map((month) => (
              <option key={month} value={month}>{monthToLabel(month)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-row-responsive" style={{ gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <button
          className={`btn ${activeTab === 'rekap' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('rekap')}
          style={{ flex: 1, border: activeTab === 'rekap' ? 'none' : '1px solid var(--border-subtle)' }}
        >
          <ReceiptText size={16} /> Rekap
        </button>
        <button
          className={`btn ${activeTab === 'grafik' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('grafik')}
          style={{ flex: 1, border: activeTab === 'grafik' ? 'none' : '1px solid var(--border-subtle)' }}
        >
          <BarChart3 size={16} /> Grafik
        </button>
        <button
          className={`btn ${activeTab === 'riwayat' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('riwayat')}
          style={{ flex: 1, border: activeTab === 'riwayat' ? 'none' : '1px solid var(--border-subtle)' }}
        >
          <ReceiptText size={16} /> Riwayat
        </button>
      </div>

      {activeTab === 'rekap' && (
        <div className="glass-panel">
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '1rem', margin: 0 }}>Rekap Bulan {monthToLabel(filterMonth || monthOptions[0] || '')}</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Pelanggan</th>
                  <th>Jenis</th>
                  <th>Status</th>
                  <th>Nominal</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                {monthRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.75rem' }}>
                      Belum ada data pada bulan ini.
                    </td>
                  </tr>
                ) : (
                  monthRows.map((row) => (
                    <tr key={row.id} className="ticket-row">
                      <td style={{ fontWeight: 600 }}>{row.pelanggan}</td>
                      <td>{row.jenis}</td>
                      <td><span className={`badge ${row.status === 'Lunas' ? 'badge-success' : 'badge-warning'}`}>{row.status}</span></td>
                      <td style={{ fontWeight: 700 }}>{formatRupiah(row.nominal)}</td>
                      <td>{row.catatan || '-'}</td>
                    </tr>
                  ))
                )}
                {monthRows.length > 0 && (
                  <tr style={{ background: 'rgba(255,255,255,0.05)', borderTop: '1px solid var(--border-focus)' }}>
                    <td colSpan={3} style={{ fontWeight: 700 }}>Grand Total</td>
                    <td style={{ fontWeight: 800, color: 'var(--accent-violet)' }}>{formatRupiah(summary.total)}</td>
                    <td>-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'grafik' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}><Zap size={16} style={{ display: 'inline', verticalAlign: 'middle' }} /> Tren PLN</h3>
            <div style={{ height: '240px', marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => `${(Number(v) / 1000000).toFixed(1)}jt`} />
                  <RechartsTooltip formatter={(value: any) => formatRupiah(Number(value || 0))} />
                  <Bar dataKey="PLN" fill="var(--accent-amber)" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="PLN" position="top" formatter={(v: any) => v ? `${(Number(v) / 1000000).toFixed(1)}jt` : ''} style={{ fontSize: '10px', fill: 'var(--accent-amber)' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}><Droplets size={16} style={{ display: 'inline', verticalAlign: 'middle' }} /> Tren PDAM</h3>
            <div style={{ height: '240px', marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => `${(Number(v) / 1000000).toFixed(2)}jt`} />
                  <RechartsTooltip formatter={(value: any) => formatRupiah(Number(value || 0))} />
                  <Bar dataKey="PDAM" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="PDAM" position="top" formatter={(v: any) => v ? `${(Number(v) / 1000000).toFixed(2)}jt` : ''} style={{ fontSize: '10px', fill: 'var(--accent-cyan)' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'riwayat' && (
        <div className="glass-panel">
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Riwayat Tagihan (CRUD)</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{filteredRows.length} baris</span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Bulan</th>
                  <th>Pelanggan</th>
                  <th>Jenis</th>
                  <th>Status</th>
                  <th>Nominal</th>
                  <th>Catatan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.75rem' }}>
                      Belum ada data sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id} className="ticket-row">
                      <td>{monthToLabel(row.bulan)}</td>
                      <td style={{ fontWeight: 600 }}>{row.pelanggan}</td>
                      <td>{row.jenis}</td>
                      <td><span className={`badge ${row.status === 'Lunas' ? 'badge-success' : 'badge-warning'}`}>{row.status}</span></td>
                      <td style={{ fontWeight: 700 }}>{formatRupiah(row.nominal)}</td>
                      <td>{row.catatan || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button onClick={() => openEditModal(row)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer' }}>
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => handleDelete(row)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer' }}>
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
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 1200, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '620px', padding: '1.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{editingRow ? 'Edit Tagihan Utilitas' : 'Input Tagihan Utilitas'}</h2>
              <button onClick={closeModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Bulan Tagihan</span>
                <input type="month" value={form.bulan} onChange={(e) => setForm((prev) => ({ ...prev, bulan: e.target.value }))} className="input-responsive" />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Jenis Utilitas</span>
                <select value={form.jenis} onChange={(e) => setForm((prev) => ({ ...prev, jenis: e.target.value as UtilityType }))} className="input-responsive">
                  <option value="PLN">PLN (Listrik)</option>
                  <option value="PDAM">PDAM (Air)</option>
                </select>
              </label>
              <label style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Pelanggan</span>
                <input value={form.pelanggan} onChange={(e) => setForm((prev) => ({ ...prev, pelanggan: e.target.value }))} className="input-responsive" placeholder="Contoh: SMK Telkom" />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Nominal (Rp)</span>
                <input type="number" min={0} value={form.nominal} onChange={(e) => setForm((prev) => ({ ...prev, nominal: e.target.value }))} className="input-responsive" />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Status</span>
                <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as BillStatus }))} className="input-responsive">
                  <option value="Lunas">Lunas</option>
                  <option value="Mengajukan Pembayaran">Mengajukan Pembayaran</option>
                </select>
              </label>
              <label style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Catatan</span>
                <textarea value={form.catatan} onChange={(e) => setForm((prev) => ({ ...prev, catatan: e.target.value }))} className="input-responsive" rows={3} placeholder="Opsional, misalnya nomor meter atau catatan khusus." />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={closeModal}>Batal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {editingRow ? 'Simpan Perubahan' : 'Simpan Tagihan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginTop: '1.5rem', borderLeft: '4px solid var(--accent-cyan)', background: 'linear-gradient(90deg, rgba(6,182,212,0.08), transparent)' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Koneksi DB (CRUD)</div>
        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.55 }}>
          Halaman ini membaca dan menulis ke sheet <code>{UTILITIES_SHEET}</code> dengan field utama: <code>id</code>, <code>bulan</code>, <code>jenis</code>, <code>pelanggan</code>, <code>nominal</code>, <code>status</code>, <code>catatan</code>, <code>updatedAt</code>.
        </div>
      </div>
    </div>
  );
};

export default Utilities;
