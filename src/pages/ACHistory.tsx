import { useEffect, useMemo, useState } from 'react';
import { History as HistoryIcon, Loader2, Search, Filter, Wind, Wrench, Calendar } from 'lucide-react';

const API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";
const SHEET_HISTORY = "Riwayat_AC";

type ACHistoryEntry = {
  id: string;
  ruang: number;
  tanggal: string;
  jenis: string;
  teknisi: string;
  keterangan: string;
  dibuatOleh: string;
  waktuBuat: string;
};

const normalizeText = (value: unknown, fallback = '-') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const parseHistoryDate = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw) return 0;

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const parsed = new Date(raw).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const dmy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/);
  if (dmy) {
    const day = parseInt(dmy[1], 10) || 1;
    const month = (parseInt(dmy[2], 10) || 1) - 1;
    const yearRaw = parseInt(dmy[3], 10) || 0;
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    return new Date(year, month, day).getTime();
  }

  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDisplayDate = (value: string) => {
  const timestamp = parseHistoryDate(value);
  if (!timestamp) return normalizeText(value);

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp));
};

const activityColors: Record<string, { bg: string; text: string; border: string }> = {
  cleaning: { bg: 'rgba(16,185,129,0.12)', text: 'var(--accent-emerald)', border: 'rgba(16,185,129,0.28)' },
  perbaikan: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', border: 'rgba(245,158,11,0.28)' },
  'pemasangan baru': { bg: 'rgba(59,130,246,0.12)', text: 'var(--accent-blue)', border: 'rgba(59,130,246,0.28)' },
  'perubahan status': { bg: 'rgba(236,72,153,0.12)', text: '#ec4899', border: 'rgba(236,72,153,0.28)' },
};

const getActivityStyle = (jenis: string) => {
  const key = String(jenis || '').trim().toLowerCase();
  return activityColors[key] || { bg: 'rgba(148,163,184,0.12)', text: 'var(--text-secondary)', border: 'rgba(148,163,184,0.24)' };
};

const ACHistory = () => {
  const [loading, setLoading] = useState(true);
  const [historyEntries, setHistoryEntries] = useState<ACHistoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJenis, setSelectedJenis] = useState('Semua');
  const [selectedRuang, setSelectedRuang] = useState('Semua');

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}?sheetName=${SHEET_HISTORY}`);
        const data = await response.json();

        if (!Array.isArray(data)) {
          setHistoryEntries([]);
          return;
        }

        const mappedEntries = data
          .map((item: any) => ({
            id: normalizeText(item.id || item.ID, `HIST-${Math.random().toString(36).slice(2, 10)}`),
            ruang: parseInt(item.ruang || item.Ruang, 10) || 0,
            tanggal: normalizeText(item.tanggal || item.Tanggal, ''),
            jenis: normalizeText(item.jenis || item.Jenis),
            teknisi: normalizeText(item.teknisi || item.Teknisi),
            keterangan: normalizeText(item.keterangan || item.Keterangan),
            dibuatOleh: normalizeText(item.dibuatOleh || item.DibuatOleh),
            waktuBuat: normalizeText(item.waktuBuat || item.WaktuBuat, ''),
          }))
          .filter((entry: ACHistoryEntry) => entry.ruang > 0 && (entry.tanggal || entry.keterangan !== '-'))
          .sort((a: ACHistoryEntry, b: ACHistoryEntry) => {
            const dateDiff = parseHistoryDate(b.tanggal) - parseHistoryDate(a.tanggal);
            if (dateDiff !== 0) return dateDiff;
            return parseHistoryDate(b.waktuBuat) - parseHistoryDate(a.waktuBuat);
          });

        setHistoryEntries(mappedEntries);
      } catch (error) {
        console.error('Error fetching AC history:', error);
        setHistoryEntries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const jenisOptions = useMemo(() => (
    ['Semua', ...Array.from(new Set(historyEntries.map((entry) => entry.jenis))).sort((a, b) => a.localeCompare(b))]
  ), [historyEntries]);

  const ruangOptions = useMemo(() => (
    ['Semua', ...Array.from(new Set(historyEntries.map((entry) => entry.ruang))).sort((a, b) => a - b).map(String)]
  ), [historyEntries]);

  const filteredEntries = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();

    return historyEntries.filter((entry) => {
      const matchesSearch =
        `ruang ${entry.ruang}`.toLowerCase().includes(lowerSearch) ||
        entry.jenis.toLowerCase().includes(lowerSearch) ||
        entry.teknisi.toLowerCase().includes(lowerSearch) ||
        entry.keterangan.toLowerCase().includes(lowerSearch) ||
        entry.dibuatOleh.toLowerCase().includes(lowerSearch);

      const matchesJenis = selectedJenis === 'Semua' || entry.jenis === selectedJenis;
      const matchesRuang = selectedRuang === 'Semua' || String(entry.ruang) === selectedRuang;

      return matchesSearch && matchesJenis && matchesRuang;
    });
  }, [historyEntries, searchTerm, selectedJenis, selectedRuang]);

  const stats = useMemo(() => {
    const perbaikan = historyEntries.filter((entry) => entry.jenis.toLowerCase().includes('perbaikan')).length;
    const cleaning = historyEntries.filter((entry) => entry.jenis.toLowerCase().includes('clean')).length;
    const pemasangan = historyEntries.filter((entry) => entry.jenis.toLowerCase().includes('pasang')).length;
    const ruangDitangani = new Set(historyEntries.map((entry) => entry.ruang)).size;
    const latestEntry = historyEntries[0];

    return {
      total: historyEntries.length,
      perbaikan,
      cleaning,
      pemasangan,
      ruangDitangani,
      latestDate: latestEntry ? formatDisplayDate(latestEntry.tanggal) : '-',
    };
  }, [historyEntries]);

  const roomRecap = useMemo(() => {
    const map = new Map<number, { ruang: number; total: number; terakhir: string; jenisTerakhir: string }>();

    historyEntries.forEach((entry) => {
      const current = map.get(entry.ruang);
      if (!current) {
        map.set(entry.ruang, {
          ruang: entry.ruang,
          total: 1,
          terakhir: entry.tanggal,
          jenisTerakhir: entry.jenis,
        });
        return;
      }

      current.total += 1;
      if (parseHistoryDate(entry.tanggal) >= parseHistoryDate(current.terakhir)) {
        current.terakhir = entry.tanggal;
        current.jenisTerakhir = entry.jenis;
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.ruang - b.ruang;
    });
  }, [historyEntries]);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div className="flex-row-responsive" style={{ marginBottom: '2rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ padding: '0.6rem', background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)', borderRadius: '10px' }}>
              <HistoryIcon size={22} />
            </div>
            <h1 className="page-title gradient-text" style={{ margin: 0 }}>Riwayat Penanganan AC</h1>
          </div>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Rekap semua aktivitas cleaning, perbaikan, pemasangan, dan perubahan status AC kelas dari sheet `{SHEET_HISTORY}`.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Total Aktivitas</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <HistoryIcon size={18} color="var(--accent-blue)" />
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.total}</div>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1.1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Ruang Pernah Ditangani</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Wind size={18} color="var(--accent-blue)" />
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.ruangDitangani}</div>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1.1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Perbaikan Tercatat</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Wrench size={18} color="#f59e0b" />
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.perbaikan}</div>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1.1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Update Terakhir</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Calendar size={18} color="var(--accent-emerald)" />
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.latestDate}</div>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Cari ruang, teknisi, aktivitas, atau catatan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.6rem 0.75rem 0.6rem 2.5rem', color: 'white', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '180px' }}>
          <Filter size={16} color="var(--text-muted)" />
          <select
            value={selectedJenis}
            onChange={(e) => setSelectedJenis(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '10px', outline: 'none' }}
          >
            {jenisOptions.map((jenis) => (
              <option key={jenis} value={jenis}>{jenis}</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: '140px' }}>
          <select
            value={selectedRuang}
            onChange={(e) => setSelectedRuang(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '10px', outline: 'none' }}
          >
            {ruangOptions.map((ruang) => (
              <option key={ruang} value={ruang}>{ruang === 'Semua' ? 'Semua Ruang' : `Ruang ${ruang}`}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(300px, 0.95fr)', gap: '1rem', alignItems: 'start' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Timeline Riwayat AC</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {filteredEntries.length} aktivitas ditampilkan
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '3.5rem', display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={30} className="animate-spin" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Belum ada riwayat AC yang cocok dengan filter ini.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {filteredEntries.map((entry) => {
                const activityStyle = getActivityStyle(entry.jenis);
                return (
                  <div
                    key={entry.id}
                    style={{
                      padding: '1rem',
                      borderRadius: '14px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Ruang {entry.ruang}</div>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.22rem 0.55rem',
                              borderRadius: '999px',
                              background: activityStyle.bg,
                              color: activityStyle.text,
                              border: `1px solid ${activityStyle.border}`,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                          >
                            {entry.jenis}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                          Teknisi: <strong style={{ color: 'var(--text-primary)' }}>{entry.teknisi}</strong>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                        <div>{formatDisplayDate(entry.tanggal)}</div>
                        <div style={{ marginTop: '0.2rem' }}>Input: {entry.dibuatOleh}</div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {entry.keterangan}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>Ruang Dengan Riwayat Terbanyak</div>
          {loading ? (
            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : roomRecap.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Belum ada ruang yang memiliki riwayat penanganan.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {roomRecap.slice(0, 12).map((room) => (
                <div
                  key={room.ruang}
                  style={{
                    padding: '0.9rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(255,255,255,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Ruang {room.ruang}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Aktivitas terakhir: {room.jenisTerakhir}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-blue)' }}>{room.total}x</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDisplayDate(room.terakhir)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ACHistory;
