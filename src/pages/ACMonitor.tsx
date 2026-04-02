import React, { useState, useEffect } from 'react';
import { Wind, Search, Edit3, Save, Loader2, X, RefreshCw, AlertTriangle, CheckCircle, CloudUpload, History as HistoryIcon, Plus } from 'lucide-react';
import { getCurrentUser, ROLES } from '../data/organization';
import { logAccess } from '../utils/logger';

const API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";
const SHEET_NAME = "Monitor_AC";
const SHEET_HISTORY = "Riwayat_AC";

export interface ACData {
  id: string;
  ruang: number;
  status: string; // Terpasang, Belum Terpasang
  kondisi: string; // Baik, Perbaikan, Rusak
  merk: string;
  pk: string;
  jumlah: number;
  updatedAt: string;
  updatedBy: string;
}

export interface ACHistory {
  id: string;
  ruang: number;
  tanggal: string;
  jenis: string; // Cleaning, Perbaikan, Pemasangan Baru
  teknisi: string;
  keterangan: string;
  dibuatOleh: string;
  waktuBuat: string;
}

const ACMonitor = () => {
  const [acList, setAcList] = useState<ACData[]>([]);
  const [historyList, setHistoryList] = useState<ACHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [historyRoom, setHistoryRoom] = useState<number | null>(null);
  const [isAddingHistory, setIsAddingHistory] = useState(false);
  const [formHistory, setFormHistory] = useState<Partial<ACHistory>>({});
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ACData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  const currentUser = getCurrentUser();
  const canUpdate = [ROLES.PIMPINAN, ROLES.KOORDINATOR_SARPRAS, ROLES.PIC_IT_SUPPORT].includes(currentUser.roleAplikasi) || 
                    currentUser.unit === 'Sarpras';

  useEffect(() => {
    fetchData();
    logAccess(currentUser, 'Monitor AC');
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resAc, resHist] = await Promise.all([
        fetch(`${API_URL}?sheetName=${SHEET_NAME}`).then(r => r.json()),
        fetch(`${API_URL}?sheetName=${SHEET_HISTORY}`).then(r => r.json()).catch(() => [])
      ]);
      
      let fetchedMap = new Map<number, ACData>();
      if (resAc && Array.isArray(resAc)) {
        resAc.forEach(item => {
          const ruang = parseInt(item.ruang || item.Ruang);
          if (!isNaN(ruang)) {
            fetchedMap.set(ruang, {
              id: item.id || item.ID || `AC-${ruang}`,
              ruang: ruang,
              status: item.status || item.Status || 'Belum Terpasang',
              kondisi: item.kondisi || item.Kondisi || '-',
              merk: item.merk || item.Merk || '-',
              pk: item.pk || item.PK || '-',
              jumlah: parseInt(item.jumlah || item.Jumlah) || 0,
              updatedAt: item.updatedAt || item.UpdatedAt || '',
              updatedBy: item.updatedBy || item.UpdatedBy || ''
            });
          }
        });
      }

      const getDefaultAC = (i: number): ACData => {
        let status = 'Belum Terpasang';
        let kondisi = '-';
        let pk = '-';
        let jumlah = 0;
        
        if (i >= 1 && i <= 6) {
          status = 'Terpasang';
          kondisi = 'Baik';
          pk = '1.5 PK';
          jumlah = 2;
        } else if ((i >= 17 && i <= 20) || (i >= 25 && i <= 40)) {
          status = 'Terpasang';
          kondisi = 'Baik';
          pk = '2 PK';
          jumlah = 2;
        }
        
        return {
          id: `AC-${i}`,
          ruang: i,
          status,
          kondisi,
          merk: '-',
          pk,
          jumlah,
          updatedAt: '',
          updatedBy: '-'
        };
      };

      // Generate 1 to 40
      const list: ACData[] = [];
      for (let i = 1; i <= 40; i++) {
        if (fetchedMap.has(i)) {
          list.push(fetchedMap.get(i)!);
        } else {
          list.push(getDefaultAC(i));
        }
      }
      setAcList(list);

      const histList: ACHistory[] = [];
      if (resHist && Array.isArray(resHist)) {
        resHist.forEach(h => {
          histList.push({
            id: h.id || h.ID || '',
            ruang: parseInt(h.ruang || h.Ruang) || 0,
            tanggal: h.tanggal || h.Tanggal || '',
            jenis: h.jenis || h.Jenis || '',
            teknisi: h.teknisi || h.Teknisi || '',
            keterangan: h.keterangan || h.Keterangan || '',
            dibuatOleh: h.dibuatOleh || h.DibuatOleh || '',
            waktuBuat: h.waktuBuat || h.WaktuBuat || ''
          });
        });
      }
      setHistoryList(histList);
    } catch (error) {
      console.error("Error fetching AC data:", error);
      // Fallback local list
      const getDefaultAC = (i: number): ACData => {
        let status = 'Belum Terpasang';
        let kondisi = '-';
        let pk = '-';
        let jumlah = 0;
        if (i >= 1 && i <= 6) { status = 'Terpasang'; kondisi = 'Baik'; pk = '1.5 PK'; jumlah = 2; }
        else if ((i >= 17 && i <= 20) || (i >= 25 && i <= 40)) { status = 'Terpasang'; kondisi = 'Baik'; pk = '2 PK'; jumlah = 2; }
        return { id: `AC-${i}`, ruang: i, status, kondisi, merk: '-', pk, jumlah, updatedAt: '', updatedBy: '-' };
      };

      const list: ACData[] = [];
      for (let i = 1; i <= 40; i++) {
        list.push(getDefaultAC(i));
      }
      setAcList(list);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: ACData) => {
    setEditingId(item.id);
    setFormData({ ...item });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !formData.ruang) return;
    
    setIsSubmitting(true);
    const updatedBy = currentUser.nama;
    const updatedAt = new Date().toISOString();

    const payload = {
      action: 'FINANCE_RECORD',
      sheetName: SHEET_NAME,
      sheet: SHEET_NAME,
      id: editingId,
      ID: editingId,
      ruang: formData.ruang,
      Ruang: formData.ruang,
      status: formData.status,
      Status: formData.status,
      kondisi: formData.kondisi,
      Kondisi: formData.kondisi,
      merk: formData.merk,
      Merk: formData.merk,
      pk: formData.pk,
      PK: formData.pk,
      jumlah: formData.jumlah,
      Jumlah: formData.jumlah,
      updatedAt: updatedAt,
      UpdatedAt: updatedAt,
      updatedBy: updatedBy,
      UpdatedBy: updatedBy
    };

    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });

      // Update local state
      setAcList(prev => prev.map(item => {
        if (item.id === editingId) {
          return {
            ...item,
            ...formData,
            updatedAt,
            updatedBy
          } as ACData;
        }
        return item;
      }));
      setEditingId(null);
      setTimeout(fetchData, 3000);
    } catch (error) {
      console.error("Save failed:", error);
      alert("Gagal menyimpan. Periksa koneksi internet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyRoom || !formHistory.tanggal || !formHistory.jenis) return;

    setIsSubmitting(true);
    const savedEntry: ACHistory = {
      id: `HIST-${Date.now()}`,
      ruang: historyRoom,
      tanggal: formHistory.tanggal || '',
      jenis: formHistory.jenis || '',
      teknisi: formHistory.teknisi || '',
      keterangan: formHistory.keterangan || '',
      dibuatOleh: currentUser.nama,
      waktuBuat: new Date().toISOString()
    };

    const payload = {
      action: 'FINANCE_RECORD',
      sheetName: SHEET_HISTORY,
      sheet: SHEET_HISTORY,
      id: savedEntry.id, ID: savedEntry.id,
      ruang: savedEntry.ruang, Ruang: savedEntry.ruang,
      tanggal: savedEntry.tanggal, Tanggal: savedEntry.tanggal,
      jenis: savedEntry.jenis, Jenis: savedEntry.jenis,
      teknisi: savedEntry.teknisi, Teknisi: savedEntry.teknisi,
      keterangan: savedEntry.keterangan, Keterangan: savedEntry.keterangan,
      dibuatOleh: savedEntry.dibuatOleh, DibuatOleh: savedEntry.dibuatOleh,
      waktuBuat: savedEntry.waktuBuat, WaktuBuat: savedEntry.waktuBuat
    };

    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      setHistoryList(prev => [savedEntry, ...prev]);
      setIsAddingHistory(false);
      setFormHistory({});
      setTimeout(fetchData, 3000);
    } catch (err) {
      alert("Gagal menyimpan riwayat.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncAll = async () => {
    if (!confirm('Peringatan: Proses ini akan menyinkronkan (override) seluruh 40 data ke Database. Proses ini membutuhkan waktu beberapa saat. Lanjutkan?')) return;
    setIsSyncingAll(true);
    
    const updatedAt = new Date().toISOString();
    const updatedBy = currentUser.nama;
    let successCount = 0;

    // We process sequentially to avoid triggering too many simultaneous requests to GAS
    for (const ac of acList) {
      const payload = {
        action: 'FINANCE_RECORD',
        sheetName: SHEET_NAME,
        sheet: SHEET_NAME,
        id: ac.id,
        ID: ac.id,
        ruang: ac.ruang,
        Ruang: ac.ruang,
        status: ac.status,
        Status: ac.status,
        kondisi: ac.kondisi,
        Kondisi: ac.kondisi,
        merk: ac.merk,
        Merk: ac.merk,
        pk: ac.pk,
        PK: ac.pk,
        jumlah: ac.jumlah,
        Jumlah: ac.jumlah,
        updatedAt: updatedAt,
        UpdatedAt: updatedAt,
        updatedBy: updatedBy,
        UpdatedBy: updatedBy
      };

      try {
        await fetch(API_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload)
        });
        successCount++;
        // minimal delay to prevent overwhelming standard GAS deployment limits
        await new Promise(r => setTimeout(r, 150));
      } catch (error) {
        console.error("Save failed for room:", ac.ruang);
      }
    }

    setIsSyncingAll(false);
    alert(`Berhasil sinkronisasi ${successCount} data ruangan ke database!`);
    fetchData();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === '-') return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      
      const dd = String(d.getDate()).padStart(2, '0');
      const textMonth = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
      const mm = textMonth[d.getMonth()];
      const yyyy = d.getFullYear();
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${dd} ${mm} ${yyyy}, ${h}:${m}`;
    } catch (e) {
      return dateStr;
    }
  };

  const filteredList = acList.filter(ac => 
    `Ruang ${ac.ruang}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ac.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ac.kondisi.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ac.merk.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const totalTerpasang = acList.filter(a => a.status === 'Terpasang').length;
  const totalRusak = acList.filter(a => a.kondisi === 'Perbaikan' || a.kondisi === 'Rusak').length;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div className="flex-row-responsive" style={{ marginBottom: '2rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ padding: '0.6rem', background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)', borderRadius: '10px' }}>
              <Wind size={22} />
            </div>
            <h1 className="page-title gradient-text" style={{ margin: 0 }}>Monitor AC Ruang Kelas</h1>
          </div>
          <p className="page-subtitle" style={{ margin: 0 }}>Pemantauan ketersediaan dan kondisi pendingin ruangan (Ruang 1 - 40)</p>
        </div>
      </div>

      {loading && acList.length === 0 ? (
        <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={32} className="animate-spin" />
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Kelas Ber-AC</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-blue)' }}>{totalTerpasang} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/ 40</span></div>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Dalam Perbaikan / Rusak</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: totalRusak > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>{totalRusak}</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Cari ruang, status, merk..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.6rem 0.6rem 0.6rem 2.5rem', color: 'white', outline: 'none' }}
              />
            </div>
            {canUpdate && (
              <button 
                onClick={handleSyncAll} 
                className="btn btn-primary" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} 
                disabled={loading || isSyncingAll}
              >
                {isSyncingAll ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
                {isSyncingAll ? 'Proses...' : 'Sinkron ke DB'}
              </button>
            )}
            <button onClick={fetchData} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} disabled={loading || isSyncingAll}>
              <RefreshCw size={16} className={loading || isSyncingAll ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {filteredList.map((ac) => {
              const isTerpasang = ac.status === 'Terpasang';
              const isTrouble = ac.kondisi === 'Perbaikan' || ac.kondisi === 'Rusak';
              let borderColor = 'var(--border-subtle)';
              
              if (isTerpasang) {
                borderColor = isTrouble ? 'var(--accent-rose-ghost)' : 'var(--accent-emerald-ghost)';
              }

              return (
                <div key={ac.id} className="glass-panel hover-grow" style={{ padding: '1.25rem', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ 
                        width: '36px', height: '36px', borderRadius: '8px', 
                        background: isTerpasang ? (isTrouble ? 'var(--accent-rose-ghost)' : 'var(--accent-emerald-ghost)') : 'var(--bg-card)',
                        color: isTerpasang ? (isTrouble ? 'var(--accent-rose)' : 'var(--accent-emerald)') : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem'
                      }}>
                        {ac.ruang}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Ruang Kelas {ac.ruang}</div>
                        <div style={{ fontSize: '0.7rem', color: isTerpasang ? 'var(--accent-blue)' : 'var(--text-muted)' }}>{ac.status}</div>
                      </div>
                    </div>
                    {canUpdate && (
                      <button onClick={() => handleEdit(ac)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                        <Edit3 size={16} />
                      </button>
                    )}
                  </div>

                  {isTerpasang ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.8rem', flex: 1 }}>
                      <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '2px' }}>Kondisi</div>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', color: isTrouble ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                          {isTrouble ? <AlertTriangle size={12} /> : <CheckCircle size={12} />} {ac.kondisi}
                        </div>
                      </div>
                      <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '2px' }}>Merk & PK</div>
                        <div style={{ fontWeight: 600 }}>{ac.merk} - {ac.pk}</div>
                      </div>
                      <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', gridColumn: 'span 2' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '2px' }}>Jumlah Unit</div>
                        <div style={{ fontWeight: 600 }}>{ac.jumlah} Unit AC</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', marginBottom: '1rem' }}>
                      Belum terpasang AC
                    </div>
                  )}

                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.75rem', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div>Update: {formatDate(ac.updatedAt)}</div>
                      <div>Oleh: {ac.updatedBy.split(',')[0]}</div>
                    </div>
                    <button onClick={() => setHistoryRoom(ac.ruang)} style={{ background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)', border: 'none', padding: '0.4rem 0.6rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                      <HistoryIcon size={12} />
                      Riwayat AC
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* EDIT MODAL */}
      {editingId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Update AC Ruang {formData.ruang}</h2>
              <button onClick={handleCancelEdit} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Status Pasang</label>
                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                  style={{ width: '100%', padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '8px', outline: 'none' }}>
                  <option value="Terpasang">Terpasang</option>
                  <option value="Belum Terpasang">Belum Terpasang</option>
                </select>
              </div>

              {formData.status === 'Terpasang' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Kondisi Saat Ini</label>
                    <select value={formData.kondisi} onChange={e => setFormData({ ...formData, kondisi: e.target.value })}
                      style={{ width: '100%', padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '8px', outline: 'none' }}>
                      <option value="Baik">Baik</option>
                      <option value="Perbaikan">Perbaikan (Kurang Dingin / Bocor dll)</option>
                      <option value="Rusak">Rusak Total / Mati</option>
                    </select>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Merk AC</label>
                      <input type="text" value={formData.merk} onChange={e => setFormData({ ...formData, merk: e.target.value })} placeholder="Misal: Daikin, Sharp"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '8px', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Spesifikasi PK</label>
                      <input type="text" value={formData.pk} onChange={e => setFormData({ ...formData, pk: e.target.value })} placeholder="Misal: 1 PK, 1.5 PK"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '8px', outline: 'none' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Jumlah Unit Terpasang</label>
                    <input type="number" min="1" value={formData.jumlah} onChange={e => setFormData({ ...formData, jumlah: parseInt(e.target.value) || 0 })}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '8px', outline: 'none' }} />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={handleCancelEdit} className="btn btn-outline" style={{ flex: 1 }}>Batal</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Simpan Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {historyRoom !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '550px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HistoryIcon size={20} color="var(--accent-blue)" /> Riwayat Ruang {historyRoom}
              </h2>
              <button onClick={() => { setHistoryRoom(null); setIsAddingHistory(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20}/></button>
            </div>

            {!isAddingHistory ? (
              <>
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                  {historyList.filter(h => h.ruang === historyRoom).length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>Belum ada riwayat tercatat.</div>
                  ) : (
                    historyList.filter(h => h.ruang === historyRoom)
                    .sort((a,b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
                    .map(hist => (
                      <div key={hist.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', borderLeft: `3px solid var(--accent-blue)` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{hist.jenis}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDate(hist.tanggal)}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          Teknisi: <strong style={{ color: 'var(--text-primary)' }}>{hist.teknisi}</strong>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '6px' }}>
                          "{hist.keterangan}"
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {canUpdate && (
                  <button onClick={() => {
                    setIsAddingHistory(true);
                    setFormHistory({ tanggal: new Date().toISOString().split('T')[0], jenis: 'Cleaning' });
                  }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%' }}>
                    <Plus size={18} /> Tambah Aktivitas Riwayat
                  </button>
                )}
              </>
            ) : (
              <form onSubmit={handleSaveHistory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px' }}>
                <h3 style={{ fontSize: '0.95rem', margin: 0, color: 'var(--accent-blue)' }}>Tambah Riwayat Baru</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Tanggal</label>
                    <input type="date" required value={formHistory.tanggal} onChange={e => setFormHistory({...formHistory, tanggal: e.target.value})}
                      style={{ width: '100%', padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '8px', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Jenis Aktivitas</label>
                    <select value={formHistory.jenis} onChange={e => setFormHistory({...formHistory, jenis: e.target.value})}
                      style={{ width: '100%', padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '8px', outline: 'none' }}>
                      <option value="Cleaning">Cleaning</option>
                      <option value="Perbaikan">Perbaikan</option>
                      <option value="Pemasangan Baru">Pemasangan Baru</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Nama Teknisi / Pelaksana</label>
                  <input type="text" required value={formHistory.teknisi || ''} onChange={e => setFormHistory({...formHistory, teknisi: e.target.value})} placeholder="Contoh: Bagus / Vendor AC"
                    style={{ width: '100%', padding: '0.7rem', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '8px', outline: 'none' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Keterangan / Detail Tindakan</label>
                  <textarea required value={formHistory.keterangan || ''} onChange={e => setFormHistory({...formHistory, keterangan: e.target.value})} placeholder="Misal: Tambah freon, cuci 2 unit, ganti kapasitor, dsb." rows={3}
                    style={{ width: '100%', padding: '0.7rem', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '8px', outline: 'none', resize: 'vertical' }} />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setIsAddingHistory(false)} className="btn btn-outline" style={{ flex: 1 }}>Batal</button>
                  <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan Riwayat
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ACMonitor;
