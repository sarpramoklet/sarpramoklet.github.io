import React, { useState, useEffect } from 'react';
import { Server, Activity, Database, Loader2, DatabaseBackup, X, Plus, Camera } from 'lucide-react';

const API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";


// ─── Helper Components ────────────────────────────────────────────────────────

const ISPNode = ({ name, rx, tx, active, type }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
    <div style={{
      padding: '0.5rem 1rem',
      borderRadius: '8px',
      background: active ? '#22c55e' : (type === 'astinet' ? 'white' : '#6366f1'),
      color: type === 'astinet' ? 'black' : 'white',
      fontWeight: 700,
      fontSize: '0.75rem',
      boxShadow: active ? '0 4px 12px rgba(34,197,94,0.3)' : (type === 'astinet' ? '0 4px 12px rgba(255,255,255,0.2)' : '0 4px 12px rgba(99,102,241,0.3)'),
      whiteSpace: 'nowrap'
    }}>
      {name}
    </div>
    <div className="glass-panel" style={{ padding: '0.4rem 0.75rem', fontSize: '0.65rem', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
      <div style={{ color: 'var(--accent-emerald)' }}>↓ {rx} Mbps</div>
      <div style={{ color: 'var(--accent-blue)' }}>↑ {tx} Mbps</div>
    </div>
  </div>
);

const ServerCard = ({ name, cpu, mem, disk, virt, urgent }: any) => {
  const cpuNum = parseInt(cpu) || 0;
  const memNum = parseInt(mem) || 0;
  const diskNum = parseInt(disk) || 0;
  return (
    <div className="glass-panel" style={{
      padding: '1.25rem',
      width: '220px',
      border: urgent ? '2px solid var(--accent-rose)' : '1px solid var(--border-subtle)',
      background: urgent ? 'rgba(239,68,68,0.05)' : 'rgba(16,185,129,0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Server size={16} color={urgent ? 'var(--accent-rose)' : 'var(--accent-emerald)'} />
        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{name}</span>
        {urgent && <span style={{ marginLeft: 'auto', fontSize: '0.65rem', background: 'var(--accent-rose)', color: 'white', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>HIGH</span>}
      </div>
      {[
        { label: 'CPU', value: cpuNum, urgent: cpuNum > 70 },
        { label: 'MEM', value: memNum },
        ...(virt ? [{ label: 'VIRT', value: parseInt(virt) || 0 }] : []),
        { label: 'DISK', value: diskNum }
      ].map(({ label, value, urgent: u }) => (
        <div key={label} style={{ marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.2rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
            <span style={{ color: u ? 'var(--accent-rose)' : 'var(--text-primary)', fontWeight: 600 }}>{value}%</span>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(value, 100)}%`,
              background: u ? 'var(--accent-rose)' : value > 50 ? 'var(--accent-amber)' : 'var(--accent-emerald)',
              borderRadius: '2px',
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const GroupLabel = ({ title }: any) => (
  <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.35rem', marginTop: '1rem' }}>
    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
  </div>
);

const FieldInput = ({ label, name, value, onChange }: any) => (
  <div>
    <label style={{ fontSize: '0.7rem', display: 'block', marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>{label}</label>
    <input
      type="text"
      placeholder="0.0"
      value={value}
      style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white', fontSize: '0.85rem', boxSizing: 'border-box' }}
      onChange={e => onChange((prev: any) => ({ ...prev, [name]: e.target.value }))}
    />
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const NetMonitorPage = () => {
  const [netData, setNetData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Lightbox foto
  const [lightbox, setLightbox] = useState<{ src: string; tanggal: string } | null>(null);

  const [formData, setFormData] = useState({
    date: '',
    i1_rx: '', i1_tx: '',
    i2_rx: '', i2_tx: '',
    i3_rx: '', i3_tx: '',
    i4_rx: '', i4_tx: '',
    i5_rx: '', i5_tx: '',
    ast_rx: '', ast_tx: '',
    dhcp_cpu: '', dhcp_mem: '', dhcp_disk: '',
    sang_cpu: '', sang_mem: '', sang_virt: '', sang_disk: ''
  });

  // Kompres gambar via Canvas → JPEG 40% quality agar muat di GSheets cell
  const compressImage = (dataUrl: string): Promise<string> =>
    new Promise((resolve) => {
      const img = document.createElement('img');
      img.onload = () => {
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > MAX) { h = Math.round((h * MAX) / w); w = MAX; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.4));
      };
      img.src = dataUrl;
    });

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}?sheetName=Monitor_Net`);
      const data = await resp.json();
      if (data && Array.isArray(data) && data.length > 0) {
        setNetData(data[data.length - 1]);
        setHistoryData([...data].reverse().slice(0, 7));
      } else {
        // Fallback sample agar tabel tetap tampil
        const sample = [{
          id: 'NET-SAMPLE', tanggal: 'Senin, 06 Apr 2026',
          i1_rx: '366', i1_tx: '21.8', i2_rx: '253', i2_tx: '15.4',
          i3_rx: '270', i3_tx: '18.7', i4_rx: '101', i4_tx: '14.3',
          i5_rx: '130', i5_tx: '5.44', ast_rx: '28.9', ast_tx: '1.21',
          dhcp_cpu: '12', dhcp_mem: '2', dhcp_disk: '18',
          sang_cpu: '80', sang_mem: '48', sang_virt: '48', sang_disk: '45',
          snapshot: ''
        }];
        setHistoryData(sample);
      }
    } catch (e) {
      console.error('Fetch net error', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedSample = async () => {
    if (!window.confirm('Isi data contoh dari gambar ke DB?')) return;
    setSubmitting(true);
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          action: 'FINANCE_RECORD',
          sheetName: 'Monitor_Net',
          id: 'NET-SAMPLE',
          tanggal: 'Senin, 06 Apr 2026',
          i1_rx: '366', i1_tx: '21.8',
          i2_rx: '253', i2_tx: '15.4',
          i3_rx: '270', i3_tx: '18.7',
          i4_rx: '101', i4_tx: '14.3',
          i5_rx: '130', i5_tx: '5.44',
          ast_rx: '28.9', ast_tx: '1.21',
          dhcp_cpu: '12', dhcp_mem: '2', dhcp_disk: '18',
          sang_cpu: '80', sang_mem: '48', sang_virt: '48', sang_disk: '45'
        })
      });
      alert('Data sample berhasil diisi!');
      setTimeout(fetchData, 1500);
    } catch { alert('Gagal'); }
    finally { setSubmitting(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          action: 'FINANCE_RECORD',
          sheetName: 'Monitor_Net',
          id: `NET-${Date.now()}`,
          tanggal: formData.date || new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }),
          ...formData
        })
      });
      alert('Update berhasil disimpan!');
      setIsFormOpen(false);
      setFormData({ date: '', i1_rx: '', i1_tx: '', i2_rx: '', i2_tx: '', i3_rx: '', i3_tx: '', i4_rx: '', i4_tx: '', i5_rx: '', i5_tx: '', ast_rx: '', ast_tx: '', dhcp_cpu: '', dhcp_mem: '', dhcp_disk: '', sang_cpu: '', sang_mem: '', sang_virt: '', sang_disk: '' });
      setTimeout(fetchData, 1500);
    } catch { alert('Gagal menyimpan'); }
    finally { setSubmitting(false); }
  };


  // Upload foto ke Google Drive via Apps Script → dapat URL → simpan ke sheet
  const handlePhotoUpload = async (row: any, file: File) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const compressed = await compressImage(ev.target?.result as string);

        // Hapus prefix "data:image/jpeg;base64,"
        const base64Data = compressed.split(',')[1];
        const fileName = `net_${(row.tanggal || Date.now().toString()).replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;

        // ── Step 1: Upload ke Google Drive via Apps Script ──────────────
        // Content-Type: text/plain → "simple request" → tidak perlu mode:no-cors
        const driveRes = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify({
            action   : 'UPLOAD_TO_DRIVE',
            base64   : base64Data,
            mimeType : 'image/jpeg',
            fileName : fileName,
            folder   : 'Sarpramoklet_NetSnapshots'
          })
        });

        const driveJson = await driveRes.json();

        if (!driveJson.success) {
          throw new Error(driveJson.error || 'Upload ke Drive gagal. Pastikan Apps Script sudah di-update.');
        }

        const imageUrl = driveJson.url;       // https://drive.google.com/uc?export=view&id=...
        const driveUrl = driveJson.driveUrl;  // https://drive.google.com/file/d/.../view

        // ── Step 2: Simpan URL ke Google Sheets ─────────────────────────
        await fetch(API_URL, {
          method: 'POST',
          mode  : 'no-cors',
          body  : JSON.stringify({
            action       : 'FINANCE_RECORD',
            sheetName    : 'Monitor_Net',
            id           : row.id || row.ID,
            tanggal      : row.tanggal,
            snapshot     : imageUrl,   // URL embed/display
            snapshot_url : driveUrl    // URL link langsung ke Drive
          })
        });

        // ── Step 3: Update UI langsung (optimistic) ──────────────────────
        setHistoryData(prev => prev.map(r =>
          (r.id === row.id || r.tanggal === row.tanggal)
            ? { ...r, snapshot: imageUrl, snapshot_url: driveUrl }
            : r
        ));

        alert(`✅ Foto berhasil disimpan ke Google Drive!\n🔗 ${driveUrl}`);

      } catch (err: any) {
        console.error('Upload error:', err);
        alert('❌ Gagal upload: ' + (err.message || 'Unknown error'));
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => { fetchData(); }, []);

  const d = netData;
  const v = (key: string, fallback: string) => d?.[key] || fallback;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title gradient-text">Monitor Infrastruktur Jaringan</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Status bandwidth ISP & kesehatan server secara real-time</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {!netData && !loading && (
            <button onClick={handleSeedSample} className="btn" style={{ background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)', fontSize: '0.8rem' }}>
              <DatabaseBackup size={14} /> Isi Data Gambar
            </button>
          )}
          <button onClick={() => setIsFormOpen(true)} className="btn" style={{ background: 'var(--accent-emerald)', color: 'white', fontSize: '0.8rem' }}>
            <Plus size={14} /> Update Status Harian
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="glass-panel" style={{ padding: '0.75rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={16} color="var(--accent-emerald)" />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Update Terakhir:</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            {loading ? '...' : (d?.tanggal || 'Senin, 06 Apr 2026 (sample)')}
          </span>
        </div>
        {loading && <Loader2 size={16} className="animate-spin" style={{ marginLeft: 'auto' }} />}
        {!loading && (
          <button onClick={fetchData} style={{ marginLeft: 'auto', fontSize: '0.75rem', background: 'transparent', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer' }}>
            ↺ Refresh
          </button>
        )}
      </div>

      {/* ISP Status Grid */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={18} color="var(--accent-blue)" /> Status ISP & Bandwidth
        </h2>

        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gateway 2</span>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <ISPNode name="Indibizz 5" rx={v('i5_rx', '130')} tx={v('i5_tx', '5.44')} active />
              <ISPNode name="Indibizz 4" rx={v('i4_rx', '101')} tx={v('i4_tx', '14.3')} active />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gateway 1 (Main)</span>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <ISPNode name="Indibizz 1" rx={v('i1_rx', '366')} tx={v('i1_tx', '21.8')} />
              <ISPNode name="Indibizz 2" rx={v('i2_rx', '253')} tx={v('i2_tx', '15.4')} />
              <ISPNode name="Indibizz 3" rx={v('i3_rx', '270')} tx={v('i3_tx', '18.7')} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Backup ISP</span>
            <ISPNode name="Astinet" rx={v('ast_rx', '28.9')} tx={v('ast_tx', '1.21')} type="astinet" />
          </div>
        </div>
      </div>

      {/* Server Status */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Server size={18} color="var(--accent-emerald)" /> Kesehatan Server
        </h2>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <ServerCard
            name="DHCP Server"
            cpu={v('dhcp_cpu', '12')}
            mem={v('dhcp_mem', '2')}
            disk={v('dhcp_disk', '18')}
          />
          <ServerCard
            name="SANGFOR"
            cpu={v('sang_cpu', '80')}
            mem={v('sang_mem', '48')}
            disk={v('sang_disk', '45')}
            virt={v('sang_virt', '48')}
            urgent={parseInt(v('sang_cpu', '0')) > 75}
          />
        </div>
      </div>

      {/* History Table */}
      {historyData.length > 0 && (
        <div className="glass-panel" style={{ overflow: 'hidden', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Riwayat Update (7 Terakhir)</h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              📸 Klik <Camera size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> untuk lihat / upload foto kondisi jaringan
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Tanggal', 'I1 Rx', 'I1 Tx', 'I2 Rx', 'I3 Rx', 'I4 Rx', 'I5 Rx', 'Astinet', 'DHCP CPU', 'SANG CPU', 'Foto'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap', textAlign: h === 'Foto' ? 'center' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyData.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500, whiteSpace: 'nowrap' }}>{row.tanggal || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--accent-emerald)' }}>{row.i1_rx || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--accent-blue)' }}>{row.i1_tx || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{row.i2_rx || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{row.i3_rx || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{row.i4_rx || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{row.i5_rx || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{row.ast_rx || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem', color: parseInt(row.dhcp_cpu) > 70 ? 'var(--accent-rose)' : 'inherit' }}>{row.dhcp_cpu ? `${row.dhcp_cpu}%` : '-'}</td>
                    <td style={{ padding: '0.75rem 1rem', color: parseInt(row.sang_cpu) > 70 ? 'var(--accent-rose)' : 'inherit' }}>{row.sang_cpu ? `${row.sang_cpu}%` : '-'}</td>

                    {/* Kolom Foto */}
                    <td style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>
                      {row.snapshot ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          {/* Tombol lihat preview */}
                          <button
                            onClick={() => setLightbox({ src: row.snapshot, tanggal: row.tanggal || '-' })}
                            title="Lihat foto kondisi jaringan"
                            style={{
                              background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)',
                              borderRadius: '8px', cursor: 'pointer', padding: '4px 10px',
                              display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--accent-blue)'
                            }}
                          >
                            <Camera size={13} />
                            <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>Lihat</span>
                          </button>
                          {/* Link URL langsung */}
                          {(row.snapshot_url || row.snapshot?.startsWith('http')) && (
                            <a
                              href={row.snapshot_url || row.snapshot}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Buka link gambar di tab baru"
                              style={{ fontSize: '0.6rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none', opacity: 0.8 }}
                            >
                              🔗 Link
                            </a>
                          )}
                        </div>
                      ) : (
                        <label title="Upload foto kondisi jaringan" style={{ cursor: 'pointer', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: 'var(--text-muted)', opacity: 0.55 }}>
                          <input
                            type="file" accept="image/*"
                            style={{ display: 'none' }}
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handlePhotoUpload(row, file);
                            }}
                          />
                          <Camera size={14} />
                          <span style={{ fontSize: '0.6rem' }}>Upload</span>
                        </label>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Lightbox Foto Jaringan ── */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 2000,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem', cursor: 'zoom-out'
          }}
        >
          <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
            <button onClick={() => setLightbox(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', color: 'white', cursor: 'pointer', padding: '8px', display: 'flex' }}>
              <X size={20} />
            </button>
          </div>
          <div style={{ marginBottom: '0.75rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Camera size={14} />
            <span>Kondisi Jaringan — {lightbox.tanggal}</span>
          </div>
          <img
            src={lightbox.src}
            alt={`Kondisi Jaringan ${lightbox.tanggal}`}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '12px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', objectFit: 'contain', cursor: 'default' }}
          />
          <p style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>Klik di luar gambar untuk menutup</p>
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '780px', maxHeight: '90vh', overflow: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Update Status Jaringan Harian</h3>
              <button onClick={() => setIsFormOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Tanggal</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Senin, 07 Apr 2026"
                    value={formData.date}
                    onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>

                <GroupLabel title="Indibizz 1" />
                <FieldInput label="Rx (Mbps)" name="i1_rx" value={formData.i1_rx} onChange={setFormData} />
                <FieldInput label="Tx (Mbps)" name="i1_tx" value={formData.i1_tx} onChange={setFormData} />

                <GroupLabel title="Indibizz 2" />
                <FieldInput label="Rx (Mbps)" name="i2_rx" value={formData.i2_rx} onChange={setFormData} />
                <FieldInput label="Tx (Mbps)" name="i2_tx" value={formData.i2_tx} onChange={setFormData} />

                <GroupLabel title="Indibizz 3" />
                <FieldInput label="Rx (Mbps)" name="i3_rx" value={formData.i3_rx} onChange={setFormData} />
                <FieldInput label="Tx (Mbps)" name="i3_tx" value={formData.i3_tx} onChange={setFormData} />

                <GroupLabel title="Indibizz 4" />
                <FieldInput label="Rx (Mbps)" name="i4_rx" value={formData.i4_rx} onChange={setFormData} />
                <FieldInput label="Tx (Mbps)" name="i4_tx" value={formData.i4_tx} onChange={setFormData} />

                <GroupLabel title="Indibizz 5" />
                <FieldInput label="Rx (Mbps)" name="i5_rx" value={formData.i5_rx} onChange={setFormData} />
                <FieldInput label="Tx (Mbps)" name="i5_tx" value={formData.i5_tx} onChange={setFormData} />

                <GroupLabel title="Astinet" />
                <FieldInput label="Rx (Mbps)" name="ast_rx" value={formData.ast_rx} onChange={setFormData} />
                <FieldInput label="Tx (Mbps)" name="ast_tx" value={formData.ast_tx} onChange={setFormData} />

                <GroupLabel title="DHCP Server" />
                <FieldInput label="CPU (%)" name="dhcp_cpu" value={formData.dhcp_cpu} onChange={setFormData} />
                <FieldInput label="MEM (%)" name="dhcp_mem" value={formData.dhcp_mem} onChange={setFormData} />
                <FieldInput label="DISK (%)" name="dhcp_disk" value={formData.dhcp_disk} onChange={setFormData} />

                <GroupLabel title="SANGFOR" />
                <FieldInput label="CPU (%)" name="sang_cpu" value={formData.sang_cpu} onChange={setFormData} />
                <FieldInput label="MEM (%)" name="sang_mem" value={formData.sang_mem} onChange={setFormData} />
                <FieldInput label="VIRT (%)" name="sang_virt" value={formData.sang_virt} onChange={setFormData} />
                <FieldInput label="DISK (%)" name="sang_disk" value={formData.sang_disk} onChange={setFormData} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn"
                  style={{ background: 'var(--accent-emerald)', color: 'white', flex: 1 }}
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : '💾 Simpan ke DB'}
                </button>
                <button type="button" onClick={() => setIsFormOpen(false)} className="btn btn-outline">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetMonitorPage;
