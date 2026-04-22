import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, Calendar, CheckCircle2, Loader2, Search, Sparkles, Zap } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CLASSROOM_MONITOR_SHEET,
  compareClassroomRooms,
  getClassroomDayLabel,
  getShortClassroomLabel,
  normalizeClassroomDate,
  normalizeClassroomMonitorRows,
  getClassroomRoomDetails,
  getEffectiveRoomDetails,
} from '../utils/classroomMonitor';
import type { ClassroomMonitorEntry } from '../utils/classroomMonitor';

const API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";

const formatMonitorDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value || '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
};

const getLatestDate = (items: ClassroomMonitorEntry[]) => {
  return items
    .map((item) => item.tanggal)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || '';
};

const ClassroomPriorityFocus = () => {
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<ClassroomMonitorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchRows = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}?sheetName=${CLASSROOM_MONITOR_SHEET}`);
        const data = await response.json();
        const normalized = Array.isArray(data) ? normalizeClassroomMonitorRows(data) : [];
        setRows(normalized);
      } catch (error) {
        console.error('Error fetching classroom focus data:', error);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRows();
  }, []);

  const latestDate = getLatestDate(rows);
  const requestedDate = normalizeClassroomDate(searchParams.get('date') || latestDate);
  const focusDate = rows.some((row) => row.tanggal === requestedDate) ? requestedDate : latestDate;
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const matchesSearch = (row: ClassroomMonitorEntry) => {
    return !normalizedSearch
      || row.ruang.toLowerCase().includes(normalizedSearch)
      || row.keterangan.toLowerCase().includes(normalizedSearch);
  };

  const focusRows = rows
    .filter((row) => row.tanggal === focusDate && row.total > 0 && matchesSearch(row))
    .sort((left, right) => right.total - left.total || compareClassroomRooms(left.ruang, right.ruang));

  const energyTotal = focusRows.reduce((sum, row) => sum + row.lampu + row.tv + row.ac + row.kipas + row.lainnya, 0);
  const cleanTotal = focusRows.reduce((sum, row) => sum + row.sampah + row.kotoran, 0);
  const tidinessTotal = focusRows.reduce((sum, row) => sum + row.rapih, 0);
  const topRoom = focusRows[0] || null;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '55vh', flexDirection: 'column', gap: '0.85rem' }}>
        <Loader2 size={30} className="animate-spin" color="var(--accent-cyan)" />
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Menyiapkan fokus tindak lanjut kelas...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex-row-responsive" style={{ marginBottom: '1.5rem', gap: '1rem', alignItems: 'flex-start' }}>
        <div>
          <Link
            to={`/classroom-monitor${focusDate ? `?date=${encodeURIComponent(focusDate)}` : ''}`}
            className="btn btn-outline"
            style={{ display: 'inline-flex', marginBottom: '0.9rem' }}
          >
            <ArrowLeft size={16} /> Kembali ke Monitor Kelas
          </Link>
          <h1 className="page-title gradient-text" style={{ marginBottom: '0.35rem' }}>Fokus Tindak Lanjut Kelas</h1>
          <p className="page-subtitle" style={{ margin: 0, maxWidth: '900px' }}>
            Ringkasan cepat untuk kelas yang memiliki temuan pada {focusDate ? `${formatMonitorDate(focusDate)} (${getClassroomDayLabel(focusDate)})` : 'tanggal aktif'}.
          </p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1rem 1.1rem', marginBottom: '1.5rem', background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={18} color="var(--accent-rose)" />
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {focusRows.length} kelas perlu tindak lanjut
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Halaman ini otomatis menyorot kelas yang punya temuan pada rekap harian aktif.
              </div>
            </div>
          </div>

          <div style={{ minWidth: '220px', position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Cari kelas atau catatan..."
              className="input-responsive"
              style={{ width: '100%', paddingLeft: '2.4rem' }}
            />
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="glass-panel stat-card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-blue)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tanggal fokus</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '0.3rem' }}>
            {focusDate ? formatMonitorDate(focusDate) : '-'}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={14} /> {focusDate ? getClassroomDayLabel(focusDate) : 'Belum ada data'}
          </div>
        </div>

        <div className="glass-panel stat-card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-rose)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total temuan</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-rose)', marginTop: '0.3rem' }}>
            {focusRows.reduce((sum, row) => sum + row.total, 0)}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Tersebar di {focusRows.length} kelas pada tanggal ini.
          </div>
        </div>

        <div className="glass-panel stat-card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-amber)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Temuan dominan</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.3rem' }}>
            {energyTotal >= cleanTotal && energyTotal >= tidinessTotal ? 'Energi' : cleanTotal >= tidinessTotal ? 'Kebersihan' : 'Kerapihan'}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Energi {energyTotal} · Bersih {cleanTotal} · Rapih {tidinessTotal}
          </div>
        </div>

        <div className="glass-panel stat-card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-emerald)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prioritas pertama</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.3rem' }}>
            {topRoom ? getShortClassroomLabel(topRoom.ruang) : '-'}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {topRoom ? `${topRoom.total} temuan pada ${topRoom.ruang}.` : 'Belum ada kelas prioritas.'}
          </div>
        </div>
      </div>

      {focusRows.length === 0 ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <CheckCircle2 size={38} color="var(--accent-emerald)" style={{ marginBottom: '0.8rem' }} />
          <h3 style={{ margin: '0 0 0.35rem 0', color: 'var(--text-primary)' }}>Tidak ada kelas yang perlu difokuskan</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            Untuk tanggal ini, semua kelas aman atau tidak ada data temuan yang sesuai pencarian.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.95rem' }}>
          {focusRows.map((row, index) => {
            const energyCount = row.lampu + row.tv + row.ac + row.kipas + row.lainnya;
            const cleanCount = row.sampah + row.kotoran;
            const tidinessCount = row.rapih;

            return (
              <div
                key={row.id}
                className="glass-panel"
                style={{
                  padding: '1rem',
                  background: 'rgba(244,63,94,0.05)',
                  border: '1px solid rgba(244,63,94,0.18)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Fokus #{index + 1}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                      {getShortClassroomLabel(row.ruang)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{row.ruang}</div>
                    {getEffectiveRoomDetails(row) && (
                      <div style={{ fontSize: '0.65rem', color: 'var(--accent-blue)', fontWeight: 600, marginTop: '0.25rem' }}>
                        {getEffectiveRoomDetails(row).className && <span>{getEffectiveRoomDetails(row).className}</span>}
                        {getEffectiveRoomDetails(row).className && getEffectiveRoomDetails(row).waliKelas && <span> · </span>}
                        {getEffectiveRoomDetails(row).waliKelas && <span>Wali: {getEffectiveRoomDetails(row).waliKelas}</span>}
                      </div>
                    )}
                  </div>
                  <span className="badge badge-danger">{row.total} temuan</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.5rem', marginTop: '0.85rem' }}>
                  <div style={{ padding: '0.55rem', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Energi</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.12rem' }}>{energyCount}</div>
                  </div>
                  <div style={{ padding: '0.55rem', borderRadius: '10px', background: 'rgba(244,63,94,0.08)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bersih</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-rose)', marginTop: '0.12rem' }}>{cleanCount}</div>
                  </div>
                  <div style={{ padding: '0.55rem', borderRadius: '10px', background: 'rgba(59,130,246,0.08)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rapih</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '0.12rem' }}>{tidinessCount}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginTop: '0.85rem' }}>
                  {energyCount > 0 && <span className="badge badge-warning"><Zap size={12} /> Energi {energyCount}</span>}
                  {cleanCount > 0 && <span className="badge badge-danger"><AlertTriangle size={12} /> Bersih {cleanCount}</span>}
                  {tidinessCount > 0 && <span className="badge badge-info"><Sparkles size={12} /> Rapih {tidinessCount}</span>}
                </div>

                <div style={{ marginTop: '0.85rem', fontSize: '0.78rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                  {row.keterangan}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClassroomPriorityFocus;
