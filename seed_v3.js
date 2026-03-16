const API_URL = 'https://script.google.com/macros/s/AKfycbwzimTeSIIEpjUMVfI4EEc90ZDEixIeMBM9WFBQKPulYHYGF2CqhwjHgQe0ZMB7SfNSGw/exec';

const SEED_DATA = [
  { id: '1', tanggal: '9-Jan', keterangan: 'Sisa Operasional dari Bu Rosel', debit: 9050000, kredit: 0 },
  { id: '2', tanggal: '23/12/2025', keterangan: 'Pembayaran biaya service printer EPSON dan CANON', debit: 0, kredit: 185000 },
  { id: '3', tanggal: '9-Jan', keterangan: 'Pembayaran upah perbaikan kaca jendela ruang 23', debit: 0, kredit: 900000 },
  { id: '4', tanggal: '9-Jan', keterangan: 'Pembayaran upah perbaikan pipa di kantin', debit: 0, kredit: 600000 },
  { id: '5', tanggal: '10-Jan', keterangan: 'Biaya Cloud Dedicated Server (Jan 26)', debit: 0, kredit: 6315901 },
  { id: '6', tanggal: '10-Jan', keterangan: 'Pembayaran biaya cuci mobil sekolah Innova', debit: 0, kredit: 50000 },
  { id: '7', tanggal: '13-Jan', keterangan: 'Pembelian paku beton untuk pemasangan artefak', debit: 0, kredit: 29000 },
  { id: '8', tanggal: '14-Jan', keterangan: 'Pembelian pengharum mobil sekolah', debit: 0, kredit: 105300 },
  { id: '9', tanggal: '15-Jan', keterangan: 'Pembelian standing brosur Lab 2 & buku besar', debit: 0, kredit: 87000 },
  { id: '10', tanggal: '15-Jan', keterangan: 'Pengiriman dokumen PKWT Satpam', debit: 0, kredit: 20000 },
  { id: '11', tanggal: '19-Jan', keterangan: 'Operasional Desember dari Bu Anum', debit: 7788200, kredit: 0 },
  { id: '12', tanggal: '21-Jan', keterangan: 'Sisa Operasional dari Bu Rosel', debit: 1083800, kredit: 0 },
  { id: '13', tanggal: '22-Jan', keterangan: 'Pembelian tisu dan rak kamar mandi kepsek', debit: 0, kredit: 205800 },
  { id: '14', tanggal: '22-Jan', keterangan: 'Pembelian stop kontak dan lampu LED', debit: 0, kredit: 558000 },
  { id: '15', tanggal: '22-Jan', keterangan: 'Pembelian pengharum ruangan untuk Lab', debit: 0, kredit: 58000 },
  { id: '16', tanggal: '26-Jan', keterangan: 'Pembayaran upah perbaikan paving', debit: 0, kredit: 180000 },
  { id: '17', tanggal: '26-Jan', keterangan: 'Pembayaran upah perbaikan kantin', debit: 0, kredit: 205000 },
  { id: '18', tanggal: '27-Jan', keterangan: 'Pembelian tempat sampah kamar mandi kepsek', debit: 0, kredit: 20000 },
  { id: '19', tanggal: '28-Jan', keterangan: 'Upah perawatan gorong gorong (Pak Yudi)', debit: 0, kredit: 500000 },
  { id: '20', tanggal: '27-Jan', keterangan: 'Pembelian senar gitar dan senar bass', debit: 0, kredit: 510000 },
  { id: '21', tanggal: '28-Jan', keterangan: 'Pembelian bahan perbaikan kran dan kunci', debit: 0, kredit: 294000 },
  { id: '22', tanggal: '4-Feb', keterangan: 'Pembelian pengharum ruangan untuk Lab', debit: 0, kredit: 63600 },
  { id: '23', tanggal: '6-Feb', keterangan: 'Filament 3D Printer Praktikum', debit: 0, kredit: 137000 },
  { id: '24', tanggal: '11-Feb', keterangan: 'Biaya cetak tata tertib laboratorium', debit: 0, kredit: 35000 },
  { id: '25', tanggal: '12-Feb', keterangan: 'Operasional Januari dari Bu Anum', debit: 10864000, kredit: 0 },
  { id: '26', tanggal: '13-Feb', keterangan: 'Biaya Cloud Dedicated Server untuk Web Sekolah', debit: 0, kredit: 6316226 },
  { id: '27', tanggal: '18-Feb', keterangan: 'Bahan & upah perbaikan kabel aula', debit: 0, kredit: 537325 },
  { id: '28', tanggal: '23-Feb', keterangan: 'Upah dan perbaikan panel listrik pos satpam', debit: 0, kredit: 710000 },
  { id: '29', tanggal: '23-Feb', keterangan: 'Paket data orbit untuk Expo Expose', debit: 0, kredit: 47000 },
  { id: '30', tanggal: '26-Feb', keterangan: 'Pembelian bahan dan upah perbaikan kunci', debit: 0, kredit: 120000 },
  { id: '31', tanggal: '27-Feb', keterangan: 'Bahan & upah perbaikan bocoran lab', debit: 0, kredit: 1350326 },
  { id: '32', tanggal: '27-Feb', keterangan: 'Upah perawatan gorong gorong (Pak Yudi)', debit: 0, kredit: 500000 },
  { id: '33', tanggal: '27-Feb', keterangan: 'Pembelian pakan ikan dan bensin', debit: 0, kredit: 125000 },
  { id: '34', tanggal: '2-Mar', keterangan: 'Filament 3D Printer Praktikum', debit: 0, kredit: 216400 },
  { id: '35', tanggal: '4-Mar', keterangan: 'Pembelian pengharum mobil sekolah', debit: 0, kredit: 150094 },
  { id: '36', tanggal: '5-Mar', keterangan: 'Operasional Februari dari Bu Anum', debit: 7845500, kredit: 0 },
  { id: '37', tanggal: '6-Mar', keterangan: 'Cloud Dedicated Server (Maret 2026)', debit: 0, kredit: 6318401 },
  { id: '38', tanggal: '9-Mar', keterangan: 'Pengembalian uang daftar WA business', debit: 123210, kredit: 0 },
  { id: '39', tanggal: '10-Mar', keterangan: 'Kabel ties ukuran besar 4,8 * 300 mm', debit: 0, kredit: 47515 },
  { id: '40', tanggal: '11-Mar', keterangan: 'Pembayaran biaya pengiriman dokumen', debit: 0, kredit: 21000 },
  { id: '41', tanggal: '12-Mar', keterangan: 'Pengiriman dokumen ke Direktorat SMK', debit: 0, kredit: 17000 },
  { id: '42', tanggal: '13-Mar', keterangan: 'Bahan & upah pekerjaan perbaikan pintu sarpra', debit: 0, kredit: 1347000 },
  { id: '43', tanggal: '13-Mar', keterangan: 'Upah perbaikan lantai depan TU', debit: 0, kredit: 50000 },
];

(async () => {
  console.log('Sending 43 records to Kas_TU sheet...');
  for (let i = 0; i < SEED_DATA.length; i++) {
    const item = SEED_DATA[i];
    const payload = {
      sheetName: 'Kas_TU',
      ID: item.id,
      Tanggal: item.tanggal,
      Keterangan: item.keterangan,
      Debit: item.debit ? Number(item.debit) : 0,
      Kredit: item.kredit ? Number(item.kredit) : 0
    };
    
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });
      console.log(`[${i + 1}/${SEED_DATA.length}] ✅ Inserted: ${item.keterangan.substring(0, 30)}...`);
      
      // Delay to avoid hitting Apps Script rate limits
      await new Promise(resolve => setTimeout(resolve, 600));
    } catch (err) {
      console.error(`[${i + 1}/${SEED_DATA.length}] ❌ Error:`, err.message);
    }
  }
  console.log("Seeding complete!");
})();
