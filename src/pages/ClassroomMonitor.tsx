import React, { useEffect, useState } from 'react';
import { AlertTriangle, Calendar, Edit3, Info, Loader2, Plus, RefreshCw, Search, Trash2, X, Zap } from 'lucide-react';
import { getCurrentUser, ROLES } from '../data/organization';
import { logAccess } from '../utils/logger';
import {
  buildMonitorIssueSummary,
  CLASSROOM_MONITOR_SHEET,
  CLASSROOM_REFERENCE_TOTAL,
  getClassroomDayLabel,
  normalizeClassroomMonitorRows,
} from '../utils/classroomMonitor';
import type { ClassroomMonitorEntry } from '../utils/classroomMonitor';

const API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";

type ClassroomMonitorForm = {
  tanggal: string;
  ruang: string;
  lampu: boolean;
  tv: boolean;
  ac: boolean;
  kipas: boolean;
  lainnya: boolean;
  sampah: boolean;
  kotoran: boolean;
  rapih: boolean;
  keterangan: string;
};

const createEmptyForm = (): ClassroomMonitorForm => ({
  tanggal: new Date().toISOString().slice(0, 10),
  ruang: 'Ruang 1',
  lampu: false,
  tv: false,
  ac: false,
  kipas: false,
  lainnya: false,
  sampah: false,
  kotoran: false,
  rapih: false,
  keterangan: '',
});

const roomOptions = Array.from({ length: CLASSROOM_REFERENCE_TOTAL }, (_, index) => `Ruang ${index + 1}`);

const formatMonitorDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value || '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
};

const formatMonitorDateTime = (value?: string) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const getLatestDate = (items: ClassroomMonitorEntry[]) => {
  return items
    .map((item) => item.tanggal)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || '';
};

const ClassroomMonitor = () => {
  const currentUser = getCurrentUser();
  const canManage = [
    ROLES.PIMPINAN,
    ROLES.KOORDINATOR_SARPRAS,
    ROLES.PIC_ADMIN,
  ].includes(currentUser.roleAplikasi) || currentUser.unit === 'Sarpras' || currentUser.unit === 'Semua Unit';

  const [rows, setRows] = useState<ClassroomMonitorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ClassroomMonitorEntry | null>(null);
  const [form, setForm] = useState<ClassroomMonitorForm>(createEmptyForm());

  useEffect(() => {
    fetchRows();
    logAccess(currentUser, 'Monitor Pantauan Kelas');
  }, []);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?sheetName=${CLASSROOM_MONITOR_SHEET}`);
      const data = await response.json();
      const normalized = Array.isArray(data) ? normalizeClassroomMonitorRows(data) : [];
      const sorted = normalized.sort((a, b) => {
        const dateDiff = new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
        if (dateDiff !== 0) return dateDiff;
        return a.ruang.localeCompare(b.ruang, 'id-ID', { numeric: true });
      });

      setRows(sorted);
      setSelectedDate(getLatestDate(sorted));
    } catch (error) {
      console.error('Error fetching classroom monitor data:', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingRow(null);
    setForm(createEmptyForm());
    setIsModalOpen(true);
  };

  const handleOpenEdit = (row: ClassroomMonitorEntry) => {
    setEditingRow(row);
    setForm({
      tanggal: row.tanggal || new Date().toISOString().slice(0, 10),
      ruang: row.ruang,
      lampu: row.lampu === 1,
      tv: row.tv === 1,
      ac: row.ac === 1,
      kipas: row.kipas === 1,
      lainnya: row.lainnya === 1,
      sampah: row.sampah === 1,
      kotoran: row.kotoran === 1,
      rapih: row.rapih === 1,
      keterangan: row.keterangan || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingRow(null);
    setForm(createEmptyForm());
    setIsModalOpen(false);
  };

  const handleToggle = (field: keyof ClassroomMonitorForm) => {
    if (typeof form[field] !== 'boolean') return;
    setForm((prev) => ({ ...prev, [field]: !(prev[field] as boolean) }));
  };

  const handleDelete = async (row: ClassroomMonitorEntry) => {
    if (!confirm(`Hapus data pantauan ${row.ruang} tanggal ${formatMonitorDate(row.tanggal)}?`)) return;

    setLoading(true);
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'DELETE_RECORD',
          sheetName: CLASSROOM_MONITOR_SHEET,
          sheet: CLASSROOM_MONITOR_SHEET,
          id: row.id,
          ID: row.id,
        }),
      });

      setRows((prev) => prev.filter((item) => item.id !== row.id));
      setTimeout(fetchRows, 2500);
    } catch (error) {
      console.error('Delete classroom monitor failed:', error);
      alert('Gagal menghapus data pantauan kelas.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payloadEntry: ClassroomMonitorEntry = {
      id: editingRow?.id || `KLS-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      tanggal: form.tanggal,
      hari: getClassroomDayLabel(form.tanggal),
      ruang: form.ruang,
      lampu: form.lampu ? 1 : 0,
      tv: form.tv ? 1 : 0,
      ac: form.ac ? 1 : 0,
      kipas: form.kipas ? 1 : 0,
      lainnya: form.lainnya ? 1 : 0,
      sampah: form.sampah ? 1 : 0,
      kotoran: form.kotoran ? 1 : 0,
      rapih: form.rapih ? 1 : 0,
      total: 0,
      keterangan: form.keterangan.trim(),
      updatedBy: currentUser.nama,
      updatedAt: new Date().toISOString(),
    };

    payloadEntry.total =
      payloadEntry.lampu +
      payloadEntry.tv +
      payloadEntry.ac +
      payloadEntry.kipas +
      payloadEntry.lainnya +
      payloadEntry.sampah +
      payloadEntry.kotoran +
      payloadEntry.rapih;

    if (!payloadEntry.keterangan) {
      payloadEntry.keterangan =
        payloadEntry.total > 0 ? buildMonitorIssueSummary(payloadEntry) : 'Aman, tidak ada temuan.';
    }

    setIsSubmitting(true);
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'FINANCE_RECORD',
          sheetName: CLASSROOM_MONITOR_SHEET,
          sheet: CLASSROOM_MONITOR_SHEET,
          id: payloadEntry.id,
          ID: payloadEntry.id,
          tanggal: payloadEntry.tanggal,
          Tanggal: payloadEntry.tanggal,
          hari: payloadEntry.hari,
          Hari: payloadEntry.hari,
          ruang: payloadEntry.ruang,
          Ruang: payloadEntry.ruang,
          kelas: payloadEntry.ruang,
          Kelas: payloadEntry.ruang,
          lampu: payloadEntry.lampu,
          Lampu: payloadEntry.lampu,
          tv: payloadEntry.tv,
          TV: payloadEntry.tv,
          ac: payloadEntry.ac,
          AC: payloadEntry.ac,
          kipas: payloadEntry.kipas,
          Kipas: payloadEntry.kipas,
          lainnya: payloadEntry.lainnya,
          Lainnya: payloadEntry.lainnya,
          sampah: payloadEntry.sampah,
          Sampah: payloadEntry.sampah,
          kotoran: payloadEntry.kotoran,
          Kotoran: payloadEntry.kotoran,
          rapih: payloadEntry.rapih,
          Rapih: payloadEntry.rapih,
          total: payloadEntry.total,
          Total: payloadEntry.total,
          jumlah_hasil_pantauan: payloadEntry.total,
          'Jumlah Hasil Pantauan': payloadEntry.total,
          keterangan: payloadEntry.keterangan,
          Keterangan: payloadEntry.keterangan,
          updatedBy: payloadEntry.updatedBy,
          UpdatedBy: payloadEntry.updatedBy,
          updatedAt: payloadEntry.updatedAt,
          UpdatedAt: payloadEntry.updatedAt,
        }),
      });

      setRows((prev) => {
        const next = prev.filter((item) => item.id !== payloadEntry.id);
        next.unshift(payloadEntry);
        return next.sort((a, b) => {
          const dateDiff = new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
          if (dateDiff !== 0) return dateDiff;
          return a.ruang.localeCompare(b.ruang, 'id-ID', { numeric: true });
        });
      });
      setSelectedDate(payloadEntry.tanggal);
      closeModal();
      setTimeout(fetchRows, 2500);
    } catch (error) {
      console.error('Submit classroom monitor failed:', error);
      alert('Gagal menyimpan monitor pantauan kelas ke database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableDates = Array.from(new Set(rows.map((row) => row.tanggal).filter(Boolean))).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const filteredRows = rows.filter((row) => {
    const matchesDate = selectedDate ? row.tanggal === selectedDate : true;
    const search = searchTerm.trim().toLowerCase();
    const matchesSearch = !search
      || row.ruang.toLowerCase().includes(search)
      || row.keterangan.toLowerCase().includes(search)
      || (row.updatedBy || '').toLowerCase().includes(search);
    return matchesDate && matchesSearch;
  });

  const totalRows = filteredRows.length;
  const totalWithIssues = filteredRows.filter((row) => row.total > 0).length;
  const totalEnergy = filteredRows.reduce((sum, row) => sum + row.lampu + row.tv + row.ac + row.kipas + row.lainnya, 0);
  const totalClean = filteredRows.reduce((sum, row) => sum + row.sampah + row.kotoran + row.rapih, 0);

  if (loading && rows.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 size={32} className="animate-spin" color="var(--accent-cyan)" />
        <p style={{ color: 'var(--text-secondary)' }}>Membaca monitor pantauan kelas dari cloud DB...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex-row-responsive" style={{ marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <h1 className="page-title gradient-text">Monitor Pantauan Kelas</h1>
          <p className="page-subtitle" style={{ margin: 0, maxWidth: '880px' }}>
            Rekap harian kondisi ruang kelas untuk kebersihan, kerapihan, dan penghematan energi yang tersimpan di sheet `{CLASSROOM_MONITOR_SHEET}`.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={fetchRows} className="btn btn-outline">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Sync Live
          </button>
          {canManage && (
            <button onClick={handleOpenCreate} className="btn btn-primary">
              <Plus size={16} /> Tambah Pantauan
            </button>
          )}
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="glass-panel stat-card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-blue)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Snapshot tanggal</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '0.3rem' }}>
            {selectedDate ? formatMonitorDate(selectedDate) : 'Semua data'}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {selectedDate ? getClassroomDayLabel(selectedDate) : 'Filter semua tanggal aktif'}
          </div>
        </div>

        <div className="glass-panel stat-card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-emerald)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ruang aman</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.3rem' }}>
            {totalRows - totalWithIssues}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Dari {totalRows} ruang yang tampil pada filter aktif.
          </div>
        </div>

        <div className="glass-panel stat-card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-amber)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Temuan energi</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.3rem' }}>
            {totalEnergy}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Lampu, TV, AC, kipas, atau perangkat lain yang belum dimatikan.
          </div>
        </div>

        <div className="glass-panel stat-card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-rose)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Temuan kebersihan</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-rose)', marginTop: '0.3rem' }}>
            {totalClean}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Termasuk sampah, lantai kotor, dan kerapihan ruang kelas.
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div className="flex-row-responsive" style={{ gap: '1rem' }}>
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari ruang, catatan, atau petugas..."
              className="input-responsive"
              style={{ width: '100%', paddingLeft: '2.75rem' }}
            />
          </div>

          <div style={{ minWidth: '220px' }}>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-responsive"
              style={{ width: '100%' }}
            >
              {availableDates.length === 0 && <option value="">Belum ada data</option>}
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {formatMonitorDate(date)} - {getClassroomDayLabel(date)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Detail Temuan per Ruang</h3>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Data ini yang dipakai dashboard untuk rekap informasi ke wali kelas dan guru.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            <Info size={14} />
            {filteredRows.length} baris tampil
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Ruang</th>
                <th>Energi</th>
                <th>Kebersihan</th>
                <th>Kerapihan</th>
                <th>Total</th>
                <th>Keterangan</th>
                <th>Petugas</th>
                {canManage && <th>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 9 : 8} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                    Belum ada data pantauan kelas pada filter ini.
                  </td>
                </tr>
              ) : filteredRows.map((row) => {
                const energyCount = row.lampu + row.tv + row.ac + row.kipas + row.lainnya;
                const cleanCount = row.sampah + row.kotoran;
                const tidinessCount = row.rapih;

                return (
                  <tr key={row.id} className="ticket-row">
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{formatMonitorDate(row.tanggal)}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{row.hari || getClassroomDayLabel(row.tanggal)}</div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.ruang}</td>
                    <td>
                      <span className={`badge ${energyCount > 0 ? 'badge-warning' : 'badge-success'}`}>{energyCount}</span>
                    </td>
                    <td>
                      <span className={`badge ${cleanCount > 0 ? 'badge-danger' : 'badge-success'}`}>{cleanCount}</span>
                    </td>
                    <td>
                      <span className={`badge ${tidinessCount > 0 ? 'badge-warning' : 'badge-success'}`}>{tidinessCount}</span>
                    </td>
                    <td>
                      <span className={`badge ${row.total > 0 ? 'badge-danger' : 'badge-success'}`}>{row.total}</span>
                    </td>
                    <td style={{ maxWidth: '320px' }}>
                      <div style={{ fontSize: '0.83rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>{row.keterangan}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{row.updatedBy || '-'}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{formatMonitorDateTime(row.updatedAt)}</div>
                    </td>
                    {canManage && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            onClick={() => handleOpenEdit(row)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', padding: '2px' }}
                            title="Edit data"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', padding: '2px' }}
                            title="Hapus data"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginTop: '1.5rem', borderLeft: '4px solid var(--accent-cyan)', background: 'linear-gradient(90deg, rgba(6,182,212,0.08), transparent)' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <AlertTriangle size={18} color="var(--accent-cyan)" style={{ marginTop: '0.1rem' }} />
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>Format sheet yang dipakai</div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.55 }}>
              Halaman ini membaca dan menulis ke sheet `{CLASSROOM_MONITOR_SHEET}` dengan field utama: `tanggal`, `hari`, `ruang`, `lampu`, `tv`, `ac`, `kipas`, `lainnya`, `sampah`, `kotoran`, `rapih`, `total`, `keterangan`, `updatedBy`, `updatedAt`.
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '760px', maxHeight: '90vh', overflowY: 'auto', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--text-primary)' }}>
                  {editingRow ? 'Edit Pantauan Kelas' : 'Tambah Pantauan Kelas'}
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  Simpan data ke DB agar dashboard rekap otomatis ikut ter-update.
                </p>
              </div>
              <button onClick={closeModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tanggal pantauan</span>
                  <input
                    type="date"
                    value={form.tanggal}
                    onChange={(e) => setForm((prev) => ({ ...prev, tanggal: e.target.value }))}
                    className="input-responsive"
                    required
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ruang kelas</span>
                  <select
                    value={form.ruang}
                    onChange={(e) => setForm((prev) => ({ ...prev, ruang: e.target.value }))}
                    className="input-responsive"
                  >
                    {roomOptions.map((room) => (
                      <option key={room} value={room}>{room}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(245,158,11,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Zap size={16} color="var(--accent-amber)" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Awareness Hemat Energi</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                    {[
                      { key: 'lampu', label: 'Lampu menyala' },
                      { key: 'tv', label: 'TV aktif' },
                      { key: 'ac', label: 'AC menyala' },
                      { key: 'kipas', label: 'Kipas menyala' },
                      { key: 'lainnya', label: 'Perangkat lain menyala' },
                    ].map((item) => (
                      <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <input
                          type="checkbox"
                          checked={form[item.key as keyof ClassroomMonitorForm] as boolean}
                          onChange={() => handleToggle(item.key as keyof ClassroomMonitorForm)}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(244,63,94,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Calendar size={16} color="var(--accent-rose)" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Kebersihan & Kerapihan</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                    {[
                      { key: 'sampah', label: 'Ada sampah' },
                      { key: 'kotoran', label: 'Lantai/area kotor' },
                      { key: 'rapih', label: 'Kerapihan perlu dibenahi' },
                    ].map((item) => (
                      <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <input
                          type="checkbox"
                          checked={form[item.key as keyof ClassroomMonitorForm] as boolean}
                          onChange={() => handleToggle(item.key as keyof ClassroomMonitorForm)}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Keterangan / catatan tindak lanjut</span>
                <textarea
                  value={form.keterangan}
                  onChange={(e) => setForm((prev) => ({ ...prev, keterangan: e.target.value }))}
                  className="input-responsive"
                  rows={4}
                  placeholder="Contoh: Lantai kotor, perlu koordinasi dengan wali kelas."
                  style={{ resize: 'vertical' }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {editingRow ? 'Simpan Perubahan' : 'Simpan ke DB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomMonitor;
