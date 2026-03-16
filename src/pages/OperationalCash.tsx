import { useState, useEffect } from 'react';
import { Coins, Plus, Search, Filter, Loader2, Download, Trash2, Edit3, Save, X, ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react';
import { getCurrentUser, ROLES } from '../data/organization';

const API_URL = "https://script.google.com/macros/s/AKfycbzjzoObkhyXuVA3czMoMutwqW3MjuD4oJ9xYsMotlOC30z0c2dPaE525DhxKM2J9vsCIw/exec";

interface Transaction {
  id: string;
  tanggal: string;
  keterangan: string;
  debit: number;
  kredit: number;
  saldo: number;
}

const SEED_DATA: Transaction[] = [
  { id: '1', tanggal: '9-Jan', keterangan: 'Sisa Operasional dari Bu Rosel', debit: 9050000, kredit: 0, saldo: 9050000 },
  { id: '2', tanggal: '23/12/2025', keterangan: 'Pembayaran biaya service printer EPSON dan CANON', debit: 0, kredit: 185000, saldo: 8865000 },
  { id: '3', tanggal: '9-Jan', keterangan: 'Pembayaran upah perbaikan kaca jendela ruang 23', debit: 0, kredit: 900000, saldo: 7965000 },
  { id: '4', tanggal: '9-Jan', keterangan: 'Pembayaran upah perbaikan pipa di kantin', debit: 0, kredit: 600000, saldo: 7365000 },
  { id: '5', tanggal: '10-Jan', keterangan: 'Biaya Cloud Dedicated Server untuk Web Sekolah, LMS, SIAKAD, PPDB dan Bank Soal Bulan Januari 2026', debit: 0, kredit: 6315901, saldo: 1049099 },
  { id: '6', tanggal: '10-Jan', keterangan: 'Pembayaran biaya cuci mobil sekolah Innova', debit: 0, kredit: 50000, saldo: 999099 },
  { id: '7', tanggal: '13-Jan', keterangan: 'Pembelian paku beton untuk pemasangan artefak', debit: 0, kredit: 29000, saldo: 970099 },
  { id: '8', tanggal: '14-Jan', keterangan: 'Pembelian pengharum mobil sekolah', debit: 0, kredit: 105300, saldo: 864799 },
  { id: '9', tanggal: '15-Jan', keterangan: 'Pembelian standing brosur untuk Lab 2 dan buku besar untuk catatan di pos satpam', debit: 0, kredit: 87000, saldo: 777799 },
  { id: '10', tanggal: '15-Jan', keterangan: 'Pembayaran biaya pengiriman dokumen PKWT Satpam ke PT. Trengginas Jaya', debit: 0, kredit: 20000, saldo: 757799 },
  { id: '11', tanggal: '19-Jan', keterangan: 'Operasional Desember dari Bu Anum', debit: 7788200, kredit: 0, saldo: 8545999 },
  { id: '12', tanggal: '21-Jan', keterangan: 'Sisa Operasional dari Bu Rosel', debit: 1083800, kredit: 0, saldo: 9629799 },
  { id: '13', tanggal: '22-Jan', keterangan: 'Pembelian tisu dan rak kamar mandi kepala sekolah', debit: 0, kredit: 205800, saldo: 9423999 },
  { id: '14', tanggal: '22-Jan', keterangan: 'Pembelian stop kontak dan lampu LED', debit: 0, kredit: 558000, saldo: 8865999 },
  { id: '15', tanggal: '22-Jan', keterangan: 'Pembelian pengharum ruangan untuk Lab', debit: 0, kredit: 58000, saldo: 8807999 },
  { id: '16', tanggal: '26-Jan', keterangan: 'Pembayaran upah perbaikan paving', debit: 0, kredit: 180000, saldo: 8627999 },
  { id: '17', tanggal: '26-Jan', keterangan: 'Pembayaran upah perbaikan kantin', debit: 0, kredit: 205000, saldo: 8422999 },
  { id: '18', tanggal: '27-Jan', keterangan: 'Pembelian tempat sampah untuk kamar mandi kepala sekolah', debit: 0, kredit: 20000, saldo: 8402999 },
  { id: '19', tanggal: '28-Jan', keterangan: 'Pembayaran upah perawatan gorong gorong (Pak Yudi)', debit: 0, kredit: 500000, saldo: 7902999 },
  { id: '20', tanggal: '27-Jan', keterangan: 'Pembelian senar gitar dan senar bass', debit: 0, kredit: 510000, saldo: 7392999 },
  { id: '21', tanggal: '28-Jan', keterangan: 'Pembelian bahan perbaikan kran dan kunci', debit: 0, kredit: 294000, saldo: 7098999 },
  { id: '22', tanggal: '4-Feb', keterangan: 'Pembelian pengharum ruangan untuk Lab', debit: 0, kredit: 63600, saldo: 7035399 },
  { id: '23', tanggal: '6-Feb', keterangan: 'Pembelian 3D Printer Filament untuk keperluan praktikum', debit: 0, kredit: 137000, saldo: 6898399 },
  { id: '24', tanggal: '11-Feb', keterangan: 'Biaya cetak tata tertib laboratorium', debit: 0, kredit: 35000, saldo: 6863399 },
  { id: '25', tanggal: '12-Feb', keterangan: 'Operasional Januari dari Bu Anum', debit: 10864000, kredit: 0, saldo: 17727399 },
  { id: '26', tanggal: '13-Feb', keterangan: 'Biaya Cloud Dedicated Server untuk Web Sekolah', debit: 0, kredit: 6316226, saldo: 11411173 },
  { id: '27', tanggal: '18-Feb', keterangan: 'Pembayaran bahan dan upah perbaikan kabel aula', debit: 0, kredit: 537325, saldo: 10873848 },
  { id: '28', tanggal: '23-Feb', keterangan: 'Upah dan perbaikan panel listrik pos satpam', debit: 0, kredit: 710000, saldo: 10163848 },
  { id: '29', tanggal: '23-Feb', keterangan: 'Pembelian paket data 2 orbit untuk kebutuhan Expo Expose', debit: 0, kredit: 47000, saldo: 10116848 },
  { id: '30', tanggal: '26-Feb', keterangan: 'Pembelian bahan dan upah perbaikan kunci', debit: 0, kredit: 120000, saldo: 9996848 },
  { id: '31', tanggal: '27-Feb', keterangan: 'Pembayaran bahan dan upah perbaikan bocoran lab', debit: 0, kredit: 1350326, saldo: 8646522 },
  { id: '32', tanggal: '27-Feb', keterangan: 'Pembayaran upah perawatan gorong gorong (Pak Yudi)', debit: 0, kredit: 500000, saldo: 8146522 },
  { id: '33', tanggal: '27-Feb', keterangan: 'Pembelian pakan ikan dan bensin', debit: 0, kredit: 125000, saldo: 8021522 },
  { id: '34', tanggal: '2-Mar', keterangan: 'Pembelian 3D Printer Filament untuk keperluan praktikum', debit: 0, kredit: 216400, saldo: 7805122 },
  { id: '35', tanggal: '4-Mar', keterangan: 'Pembelian pengharum mobil sekolah', debit: 0, kredit: 150094, saldo: 7655028 },
  { id: '36', tanggal: '5-Mar', keterangan: 'Operasional Februari dari Bu Anum', debit: 7845500, kredit: 0, saldo: 15500528 },
  { id: '37', tanggal: '6-Mar', keterangan: 'Biaya Cloud Dedicated Server untuk Web Sekolah Bulan Maret 2026', debit: 0, kredit: 6318401, saldo: 9182127 },
  { id: '38', tanggal: '9-Mar', keterangan: 'Pengembalian uang daftar wa business', debit: 123210, kredit: 0, saldo: 9305337 },
  { id: '39', tanggal: '10-Mar', keterangan: 'Pembelian kabel ties ukuran besar 4,8 * 300 mm', debit: 0, kredit: 47515, saldo: 9257822 },
  { id: '40', tanggal: '11-Mar', keterangan: 'Pembayaran biaya pengiriman dokumen', debit: 0, kredit: 21000, saldo: 9236822 },
  { id: '41', tanggal: '12-Mar', keterangan: 'Pembayaran biaya pengiriman dokumen ke Direktorat SMK', debit: 0, kredit: 17000, saldo: 9219822 },
  { id: '42', tanggal: '13-Mar', keterangan: 'Pembelian bahan dan upah pekerjaan perbaikan pintu sarpra', debit: 0, kredit: 1347000, saldo: 7872822 },
  { id: '43', tanggal: '13-Mar', keterangan: 'Pembayaran upah perbaikan lantai depan TU', debit: 0, kredit: 50000, saldo: 7822822 },
];

const OperationalCash = () => {
  const currentUser = getCurrentUser();
  const isAuthorized = currentUser.roleAplikasi === ROLES.PIMPINAN || currentUser.roleAplikasi === ROLES.PIC_ADMIN;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    tanggal: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
    keterangan: '',
    type: 'kredit', // 'debit' or 'kredit'
    nominal: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}?sheetName=Kas_TU&sheet=Kas_TU`);
      const data = await resp.json();
      if (data && Array.isArray(data) && data.length > 0) {
        setTransactions(data);
      } else {
        setTransactions(SEED_DATA);
      }
    } catch (error) {
      console.error("Error fetching operational cash:", error);
      setTransactions(SEED_DATA);
    } finally {
      setLoading(false);
    }
  };

  const calculateBalances = (data: any[]) => {
    let currentBalance = 0;
    return data.map(item => {
      currentBalance = currentBalance + (Number(item.debit) || 0) - (Number(item.kredit) || 0);
      return { ...item, saldo: currentBalance };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const nominalValue = Number(formData.nominal);
    const newEntry = {
      id: Date.now().toString(),
      tanggal: formData.tanggal,
      keterangan: formData.keterangan,
      debit: formData.type === 'debit' ? nominalValue : 0,
      kredit: formData.type === 'kredit' ? nominalValue : 0,
      sheetName: 'Kas_TU'
    };

    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(newEntry)
      });
      
      // Update local state for immediate feedback
      const updated = [...transactions, newEntry as any];
      setTransactions(calculateBalances(updated));
      setIsModalOpen(false);
      setFormData({ 
        tanggal: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }), 
        keterangan: '', 
        type: 'kredit', 
        nominal: '' 
      });
    } catch (error) {
      console.error("Error submitting cash entry:", error);
      alert("Gagal menyimpan data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Hapus data ini?")) return;
    
    // In a real scenario, we'd send a DELETE request. 
    // For now, we update local state
    const filtered = transactions.filter(t => t.id !== id);
    setTransactions(calculateBalances(filtered));
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const filteredTransactions = transactions.filter(t => 
    t.keterangan.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.tanggal.toLowerCase().includes(searchTerm.toLowerCase())
  ).reverse();

  const totalDebit = transactions.reduce((acc, curr) => acc + (curr.debit || 0), 0);
  const totalKredit = transactions.reduce((acc, curr) => acc + (curr.kredit || 0), 0);
  const currentSaldo = totalDebit - totalKredit;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div className="flex-row-responsive" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '10px', background: 'var(--accent-amber-ghost)', borderRadius: '12px', color: 'var(--accent-amber)' }}>
            <Coins size={28} />
          </div>
          <div>
            <h1 className="page-title gradient-text" style={{ margin: 0 }}>Kas Operasional TU</h1>
            <p className="page-subtitle" style={{ margin: 0 }}>Pencatatan dana taktis dan operasional Tata Kelola</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
           <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> <span className="mobile-hide">Tambah Transaksi</span><span className="mobile-show" style={{ display: 'none' }}>Tambah</span>
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="glass-panel stat-card delay-100">
          <div className="stat-header">
            <span className="stat-title">Saldo Saat Ini</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-emerald-ghost)', color: 'var(--accent-emerald)' }}>
              <Wallet size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-emerald)' }}>{formatRupiah(currentSaldo)}</div>
          <div className="stat-trend trend-up">Ready to Use</div>
        </div>

        <div className="glass-panel stat-card delay-200">
          <div className="stat-header">
            <span className="stat-title">Total Pemasukan (Debit)</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)' }}>
              <ArrowUpCircle size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>{formatRupiah(totalDebit)}</div>
          <div className="stat-trend trend-up">Akumulasi</div>
        </div>
        
        <div className="glass-panel stat-card delay-300">
          <div className="stat-header">
            <span className="stat-title">Total Pengeluaran (Kredit)</span>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-rose-ghost)', color: 'var(--accent-rose)' }}>
              <ArrowDownCircle size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--accent-rose)' }}>{formatRupiah(totalKredit)}</div>
          <div className="stat-trend trend-down">Biaya Terpakai</div>
        </div>
      </div>

      <div className="glass-panel delay-300 flex-row-responsive" style={{ padding: '1.25rem', marginBottom: '1.5rem', gap: '1.5rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', top: '11px', left: '12px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Cari transaksi atau tanggal..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-responsive"
            style={{ width: '100%', paddingLeft: '2.5rem' }}
          />
        </div>
        <button className="btn btn-outline" style={{ minWidth: 'fit-content' }}>
          <Filter size={18} /> Filter Periode
        </button>
        <button className="btn btn-outline" style={{ minWidth: 'fit-content' }}>
          <Download size={18} /> Export PDF
        </button>
      </div>

      <div className="glass-panel delay-400 table-container">
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Keterangan Transaksi</th>
              <th style={{ textAlign: 'right' }}>Debit (Masuk)</th>
              <th style={{ textAlign: 'right' }}>Kredit (Keluar)</th>
              <th style={{ textAlign: 'right' }}>Saldo</th>
              {isAuthorized && <th style={{ textAlign: 'center' }}>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {loading && transactions.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                  <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem', color: 'var(--accent-blue)' }} />
                  <p>Memuat buku kas...</p>
                </td>
              </tr>
            ) : filteredTransactions.map((trx) => (
              <tr key={trx.id} className="ticket-row">
                <td style={{ whiteSpace: 'nowrap', fontWeight: 500, color: 'var(--text-secondary)' }}>{trx.tanggal}</td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{trx.keterangan}</div>
                </td>
                <td style={{ textAlign: 'right', color: trx.debit > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)', fontWeight: trx.debit > 0 ? 600 : 400 }}>
                  {trx.debit > 0 ? formatRupiah(trx.debit) : '-'}
                </td>
                <td style={{ textAlign: 'right', color: trx.kredit > 0 ? 'var(--accent-rose)' : 'var(--text-muted)', fontWeight: trx.kredit > 0 ? 600 : 400 }}>
                  {trx.kredit > 0 ? formatRupiah(trx.kredit) : '-'}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700, background: 'rgba(255,255,255,0.02)' }}>
                  {formatRupiah(trx.saldo)}
                </td>
                {isAuthorized && (
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button className="btn-icon" title="Edit"><Edit3 size={14} /></button>
                      <button className="btn-icon" style={{ color: 'var(--accent-rose)' }} onClick={() => handleDelete(trx.id)} title="Hapus"><Trash2 size={14} /></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Add Entry */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '450px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-primary)' }}>Catat Transaksi Baru</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Tanggal</label>
                  <input 
                    type="text" 
                    value={formData.tanggal}
                    onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                    className="input-responsive"
                    placeholder="Contoh: 14-Mar"
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Tipe</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="input-responsive"
                    style={{ background: 'var(--bg-secondary)', color: 'white' }}
                  >
                    <option value="debit">Pemasukan (Debit)</option>
                    <option value="kredit">Pengeluaran (Kredit)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Keterangan</label>
                <textarea 
                  value={formData.keterangan}
                  onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                  className="input-responsive"
                  rows={3}
                  placeholder="Deskripsi transaksi..."
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Nominal (Rp)</label>
                <input 
                  type="number" 
                  value={formData.nominal}
                  onChange={(e) => setFormData({...formData, nominal: e.target.value})}
                  className="input-responsive"
                  placeholder="0"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18}/> Simpan</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationalCash;
