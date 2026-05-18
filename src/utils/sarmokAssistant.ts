import {
  DASHBOARD_SECTION_LABELS,
  getDashboardSectionState,
  type DashboardACTroubleRoom,
  type DashboardAssistantSnapshot,
  type DashboardDutyNoteSnapshot,
  type DashboardSectionKey,
} from './dashboardSnapshot';

export type DashboardAssistantReply = {
  text: string;
  sections: DashboardSectionKey[];
  suggestions: string[];
};

const DASHBOARD_SECTION_ORDER: DashboardSectionKey[] = [
  'mokletService',
  'classroom',
  'ac',
  'capex',
  'wifi',
  'network',
  'utilities',
  'piket',
  'finance',
  'personnel',
  'duty',
];

const normalizeQuery = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const includesAny = (value: string, tokens: string[]) => tokens.some((token) => value.includes(token));

const formatTimestamp = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const formatDateLabel = (value: string) => {
  if (!value) return '-';

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(parsed);
    }
  }

  const shortMatch = value.match(/^(\d{2})-(\d{2})-(\d{2})$/);
  if (shortMatch) {
    const parsed = new Date(2000 + Number(shortMatch[3]), Number(shortMatch[2]) - 1, Number(shortMatch[1]));
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(parsed);
    }
  }

  return value;
};

const formatIDR = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatPercent = (value: number) => `${Math.round((value || 0) * 100)}%`;

const formatSignedDelta = (value: number | null, suffix = '') => {
  if (value === null) return 'belum ada pembanding';
  if (value === 0) return `stabil${suffix ? ` ${suffix}` : ''}`.trim();
  const prefix = value > 0 ? 'naik' : 'turun';
  return `${prefix} ${Math.abs(value).toLocaleString('id-ID')}${suffix ? ` ${suffix}` : ''}`.trim();
};

const formatTraffic = (value: number) =>
  `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: value % 1 === 0 ? 0 : 1 }).format(value)} Mbps`;

const isSectionAvailable = (snapshot: DashboardAssistantSnapshot, key: DashboardSectionKey) => {
  return getDashboardSectionState(snapshot, key)?.state !== 'unavailable';
};

const sectionUnavailableMessage = (snapshot: DashboardAssistantSnapshot, key: DashboardSectionKey) => {
  const section = getDashboardSectionState(snapshot, key);
  if (!section || section.state !== 'unavailable') return '';
  return `${section.label} belum sinkron: ${section.message}`;
};

const buildQuickSuggestions = (canViewFinance: boolean) => {
  const suggestions = [
    'Ringkas dashboard hari ini',
    'Prioritas kelas dan AC',
    'Rekap layanan Sarmok',
    'Catatan piket terbaru',
  ];

  if (canViewFinance) {
    suggestions.splice(3, 0, 'Status kas dan utilitas');
  }

  return suggestions.slice(0, 4);
};

const buildSourceFooter = (snapshot: DashboardAssistantSnapshot, sections: DashboardSectionKey[]) => {
  const usedSections = sections
    .filter((section, index, array) => array.indexOf(section) === index)
    .filter((section) => section !== 'finance' || snapshot.finance !== null)
    .map((section) => DASHBOARD_SECTION_LABELS[section]);

  return [
    `Data sinkron: ${formatTimestamp(snapshot.generatedAt)}`,
    `Sumber: ${usedSections.join(', ')}`,
  ].join('\n');
};

const buildAvailabilityNotes = (snapshot: DashboardAssistantSnapshot, sections: DashboardSectionKey[]) => {
  return sections
    .map((section) => sectionUnavailableMessage(snapshot, section))
    .filter(Boolean)
    .map((message) => `- ${message}`);
};

const buildTroubleRoomList = (rooms: DashboardACTroubleRoom[]) => {
  if (rooms.length === 0) return 'tidak ada ruang trouble';
  return rooms
    .slice(0, 4)
    .map((room) => `${room.label} (${room.kondisi})`)
    .join(', ');
};

const buildPiketExcerpt = (notes: DashboardDutyNoteSnapshot[]) => {
  if (notes.length === 0) return 'belum ada catatan piket terbaru';
  return notes
    .slice(0, 3)
    .map((note) => `${note.petugas}: ${note.isi}`)
    .join(' | ');
};

const buildOverviewLines = (snapshot: DashboardAssistantSnapshot, canViewFinance: boolean) => {
  const lines = [`Snapshot dashboard aktif per ${formatTimestamp(snapshot.generatedAt)}.`];

  if (isSectionAvailable(snapshot, 'mokletService')) {
    const service = snapshot.mokletService;
    lines.push(
      `- Layanan Sarmok: ${service.complaints.pending} pengaduan menunggu, ${service.complaints.inProgress} diproses, ${service.roomReservation.waitingConfirmation} reservasi ruang menunggu, ${service.toolsLoan.haveNotReturn} alat belum kembali.`
    );
  }

  if (isSectionAvailable(snapshot, 'classroom')) {
    const classroom = snapshot.classroom;
    lines.push(
      `- Pantauan kelas ${formatDateLabel(classroom.latestDate)}: ${classroom.issueRooms} ruang bermasalah dari ${classroom.monitoredRooms} ruang terpantau, total ${classroom.totalFindings} temuan.`
    );
  }

  if (isSectionAvailable(snapshot, 'ac')) {
    const ac = snapshot.ac;
    lines.push(`- Monitor AC: ${ac.baik} unit baik, ${ac.perbaikan} perbaikan, ${ac.rusak} rusak, ${ac.terpasang}/${ac.total} ruang sudah terpasang.`);
  }

  if (isSectionAvailable(snapshot, 'capex')) {
    const capex = snapshot.capex;
    lines.push(
      `- CAPEX: rata-rata progres ${capex.averageProgress.toFixed(1)}%, ${capex.completedProjects}/${capex.totalProjects} proyek selesai, ${capex.priorityProjects} proyek masih di bawah 50%.`
    );
  }

  if (isSectionAvailable(snapshot, 'wifi')) {
    const wifi = snapshot.wifi;
    lines.push(`- Wi-Fi: ${wifi.latestCount.toLocaleString('id-ID')} klien pada ${wifi.latestDate}, ${formatSignedDelta(wifi.delta, 'dari pengamatan sebelumnya')}.`);
  }

  if (isSectionAvailable(snapshot, 'network')) {
    const network = snapshot.network;
    lines.push(`- Jaringan: RX ${formatTraffic(network.totalRx)} dan TX ${formatTraffic(network.totalTx)} pada snapshot ${formatDateLabel(network.latestDate)}.`);
  }

  if (isSectionAvailable(snapshot, 'utilities')) {
    const utilities = snapshot.utilities;
    lines.push(
      `- Utilitas ${utilities.latestLabel}: PLN ${formatIDR(utilities.latestPLN)} dan PDAM ${formatIDR(utilities.latestPDAM)}.`
    );
  }

  if (isSectionAvailable(snapshot, 'piket')) {
    lines.push(`- Catatan piket: ${buildPiketExcerpt(snapshot.piket.recentNotes)}.`);
  }

  if (canViewFinance && snapshot.finance) {
    lines.push(
      `- Keuangan: saldo Sarpras ${formatIDR(snapshot.finance.internal.balance)}, TU ${formatIDR(snapshot.finance.tu.balance)}, dan AC ${formatIDR(snapshot.finance.ac.balance)}.`
    );
  }

  if (isSectionAvailable(snapshot, 'personnel')) {
    lines.push(`- Personel: ${snapshot.personnel.total} orang aktif dalam dashboard lintas unit.`);
  }

  if (isSectionAvailable(snapshot, 'duty')) {
    lines.push(`- Jadwal piket ${snapshot.duty.day}: ${snapshot.duty.personnel.join(', ') || 'belum terjadwal'}.`);
  }

  return lines;
};

const buildMokletServiceDetail = (snapshot: DashboardAssistantSnapshot) => {
  if (!isSectionAvailable(snapshot, 'mokletService')) return [sectionUnavailableMessage(snapshot, 'mokletService')];

  const service = snapshot.mokletService;
  const lines = ['Layanan Sarmok'];
  lines.push(`- Pengaduan: ${service.complaints.pending} menunggu, ${service.complaints.inProgress} diproses, ${service.complaints.complete} selesai, ${service.complaints.rejected} ditolak.`);
  lines.push(
    `- Reservasi ruang: ${service.roomReservation.waitingConfirmation} menunggu, ${service.roomReservation.activeReservation} aktif, ${service.roomReservation.inUseReservation} sedang dipakai, ${service.roomReservation.rejectedReservation} ditolak.`
  );
  lines.push(
    `- Peminjaman alat: ${service.toolsLoan.waitingConfirmation} menunggu, ${service.toolsLoan.haveNotReturn} belum kembali, ${service.toolsLoan.returned} kembali, ${service.toolsLoan.rejected} ditolak.`
  );
  if (service.alerts.length > 0) {
    lines.push(`- Fokus cepat: ${service.alerts.join(' ')}`);
  }
  return lines;
};

const buildClassroomDetail = (snapshot: DashboardAssistantSnapshot) => {
  if (!isSectionAvailable(snapshot, 'classroom')) return [sectionUnavailableMessage(snapshot, 'classroom')];

  const classroom = snapshot.classroom;
  const lines = ['Pantauan Kelas'];
  lines.push(
    `- Tanggal pantauan terbaru: ${formatDateLabel(classroom.latestDate)} dengan cakupan ${classroom.monitoredRooms}/${classroom.referenceRooms} ruang (${formatPercent(classroom.coverageRatio)}).`
  );
  lines.push(`- Ruang bermasalah: ${classroom.issueRooms} ruang, ruang aman: ${classroom.cleanRooms}, total temuan: ${classroom.totalFindings}.`);
  if (classroom.topIssueRooms.length > 0) {
    lines.push(`- Prioritas ruang: ${classroom.topIssueRooms.map((room) => `${room.label} (${room.total} temuan)`).join(', ')}.`);
  }
  lines.push(
    `- Pola temuan: lampu ${classroom.issueBreakdown.lampu}, TV ${classroom.issueBreakdown.tv}, AC ${classroom.issueBreakdown.ac}, kipas ${classroom.issueBreakdown.kipas}, sampah ${classroom.issueBreakdown.sampah}, kotoran ${classroom.issueBreakdown.kotoran}.`
  );
  return lines;
};

const buildACDetail = (snapshot: DashboardAssistantSnapshot) => {
  if (!isSectionAvailable(snapshot, 'ac')) return [sectionUnavailableMessage(snapshot, 'ac')];

  const ac = snapshot.ac;
  const lines = ['Monitor AC'];
  lines.push(`- Instalasi: ${ac.terpasang}/${ac.total} ruang sudah terpasang, ${ac.belum} ruang belum terpasang.`);
  lines.push(`- Kondisi: ${ac.baik} baik, ${ac.perbaikan} perbaikan, ${ac.rusak} rusak.`);
  lines.push(`- Titik trouble: ${buildTroubleRoomList(ac.troubleRooms)}.`);
  return lines;
};

const buildCapexDetail = (snapshot: DashboardAssistantSnapshot) => {
  if (!isSectionAvailable(snapshot, 'capex')) return [sectionUnavailableMessage(snapshot, 'capex')];

  const capex = snapshot.capex;
  const lines = ['Progres CAPEX'];
  lines.push(`- Total proyek: ${capex.totalProjects}, selesai: ${capex.completedProjects}, prioritas merah: ${capex.priorityProjects}.`);
  lines.push(`- Rata-rata progres: ${capex.averageProgress.toFixed(1)}%.`);
  if (capex.topLagging.length > 0) {
    lines.push(`- Proyek paling tertinggal: ${capex.topLagging.slice(0, 3).map((project) => `${project.nama} (${project.progress}%)`).join(', ')}.`);
  }
  if (capex.topLeading.length > 0) {
    lines.push(`- Proyek terdepan: ${capex.topLeading.slice(0, 3).map((project) => `${project.nama} (${project.progress}%)`).join(', ')}.`);
  }
  return lines;
};

const buildWifiDetail = (snapshot: DashboardAssistantSnapshot) => {
  if (!isSectionAvailable(snapshot, 'wifi')) return [sectionUnavailableMessage(snapshot, 'wifi')];

  const wifi = snapshot.wifi;
  const lines = ['Monitor Wi-Fi'];
  lines.push(`- Klien terbaru: ${wifi.latestCount.toLocaleString('id-ID')} pada ${wifi.latestDate}.`);
  lines.push(`- Perubahan harian: ${formatSignedDelta(wifi.delta, 'klien')}.`);
  lines.push(`- Puncak monitoring: ${wifi.peakCount.toLocaleString('id-ID')} klien pada ${wifi.peakDate}.`);
  return lines;
};

const buildNetworkDetail = (snapshot: DashboardAssistantSnapshot) => {
  if (!isSectionAvailable(snapshot, 'network')) return [sectionUnavailableMessage(snapshot, 'network')];

  const network = snapshot.network;
  const lines = ['Monitor Jaringan'];
  lines.push(`- Snapshot terbaru: ${formatDateLabel(network.latestDate)} dengan total RX ${formatTraffic(network.totalRx)} dan TX ${formatTraffic(network.totalTx)}.`);
  if (network.topRx.length > 0) {
    lines.push(`- Jalur RX tertinggi: ${network.topRx.map((lane) => `${lane.label} ${formatTraffic(lane.value)}`).join(', ')}.`);
  }
  if (network.topTx.length > 0) {
    lines.push(`- Jalur TX tertinggi: ${network.topTx.map((lane) => `${lane.label} ${formatTraffic(lane.value)}`).join(', ')}.`);
  }
  lines.push(`- Snapshot gambar jaringan: ${network.snapshotAvailable ? 'tersedia' : 'tidak tersedia'}.`);
  return lines;
};

const buildUtilitiesDetail = (snapshot: DashboardAssistantSnapshot) => {
  if (!isSectionAvailable(snapshot, 'utilities')) return [sectionUnavailableMessage(snapshot, 'utilities')];

  const utilities = snapshot.utilities;
  const lines = ['Tagihan Utilitas'];
  lines.push(`- Bulan terbaru ${utilities.latestLabel}: PLN ${formatIDR(utilities.latestPLN)} dan PDAM ${formatIDR(utilities.latestPDAM)}.`);
  lines.push(`- Dibanding ${utilities.previousLabel || 'bulan sebelumnya'}: PLN ${formatSignedDelta(utilities.deltaPLN)}, PDAM ${formatSignedDelta(utilities.deltaPDAM)}.`);
  return lines;
};

const buildPiketDetail = (snapshot: DashboardAssistantSnapshot) => {
  if (!isSectionAvailable(snapshot, 'piket')) return [sectionUnavailableMessage(snapshot, 'piket')];

  const notes = snapshot.piket.recentNotes;
  const lines = ['Catatan Piket'];
  if (notes.length === 0) {
    lines.push('- Belum ada catatan piket terbaru.');
    return lines;
  }

  notes.slice(0, 3).forEach((note) => {
    lines.push(`- ${note.tanggal} · ${note.petugas} · ${note.kategori}: ${note.isi} (${note.likes} suka).`);
  });
  return lines;
};

const buildFinanceDetail = (snapshot: DashboardAssistantSnapshot, canViewFinance: boolean) => {
  if (!canViewFinance || !snapshot.finance) {
    return ['Ringkasan Keuangan', '- Data keuangan tidak dibuka pada role login saat ini.'];
  }

  const finance = snapshot.finance;
  const lines = ['Ringkasan Keuangan'];
  lines.push(`- Saldo Sarpras: ${formatIDR(finance.internal.balance)} dengan total belanja ${formatIDR(finance.internal.expense)}.`);
  lines.push(`- Saldo Kas TU: ${formatIDR(finance.tu.balance)}.`);
  lines.push(`- Saldo Kas AC: ${formatIDR(finance.ac.balance)}.`);
  if (finance.internal.topCategories && finance.internal.topCategories.length > 0) {
    lines.push(`- Beban kategori terbesar: ${finance.internal.topCategories.map((item) => `${item.name} ${formatIDR(item.value)}`).join(', ')}.`);
  }
  if (finance.internal.lastTransaction) {
    lines.push(`- Transaksi internal terakhir: ${finance.internal.lastTransaction.note} pada ${finance.internal.lastTransaction.date}.`);
  }
  return lines;
};

const buildPersonnelDetail = (snapshot: DashboardAssistantSnapshot) => {
  if (!isSectionAvailable(snapshot, 'personnel')) return [sectionUnavailableMessage(snapshot, 'personnel')];

  const lines = ['Personel'];
  lines.push(`- Total personel aktif di dashboard: ${snapshot.personnel.total} orang.`);
  snapshot.personnel.byUnit.slice(0, 4).forEach((unit) => {
    lines.push(`- ${unit.unit}: ${unit.count} orang (${unit.members.join(', ')}).`);
  });
  return lines;
};

const buildDutyDetail = (snapshot: DashboardAssistantSnapshot) => {
  if (!isSectionAvailable(snapshot, 'duty')) return [sectionUnavailableMessage(snapshot, 'duty')];

  return [
    'Jadwal Piket',
    `- Piket ${snapshot.duty.day}: ${snapshot.duty.personnel.join(', ') || 'belum terjadwal'}.`,
  ];
};

const buildPriorityLines = (snapshot: DashboardAssistantSnapshot, sections: DashboardSectionKey[], canViewFinance: boolean) => {
  const allowed = new Set(sections);
  const lines = ['Prioritas utama'];

  if (allowed.has('mokletService') && isSectionAvailable(snapshot, 'mokletService')) {
    const service = snapshot.mokletService;
    if (service.complaints.pending + service.complaints.inProgress > 0) {
      lines.push(`- Layanan Sarmok: ${service.complaints.pending + service.complaints.inProgress} pengaduan aktif perlu dijaga ritme tindak lanjutnya.`);
    }
    if (service.toolsLoan.haveNotReturn > 0) {
      lines.push(`- Aset pinjam: ${service.toolsLoan.haveNotReturn} alat masih belum kembali.`);
    }
  }

  if (allowed.has('classroom') && isSectionAvailable(snapshot, 'classroom')) {
    const classroom = snapshot.classroom;
    if (classroom.issueRooms > 0) {
      lines.push(
        `- Kelas: ${classroom.issueRooms} ruang bermasalah pada ${formatDateLabel(classroom.latestDate)}. Prioritas awal ${classroom.topIssueRooms.slice(0, 3).map((room) => room.label).join(', ')}.`
      );
    }
  }

  if (allowed.has('ac') && isSectionAvailable(snapshot, 'ac')) {
    const ac = snapshot.ac;
    if (ac.troubleRooms.length > 0) {
      lines.push(`- AC: ${ac.troubleRooms.length} ruang trouble, terutama ${buildTroubleRoomList(ac.troubleRooms)}.`);
    }
  }

  if (allowed.has('capex') && isSectionAvailable(snapshot, 'capex')) {
    const capex = snapshot.capex;
    if (capex.priorityProjects > 0) {
      lines.push(`- CAPEX: ${capex.priorityProjects} proyek masih di bawah 50%, dimulai dari ${capex.topLagging.slice(0, 2).map((project) => project.nama).join(', ')}.`);
    }
  }

  if (allowed.has('utilities') && isSectionAvailable(snapshot, 'utilities')) {
    const utilities = snapshot.utilities;
    if ((utilities.deltaPLN || 0) > 0 || (utilities.deltaPDAM || 0) > 0) {
      lines.push(
        `- Utilitas: ada kenaikan ${utilities.deltaPLN && utilities.deltaPLN > 0 ? `PLN ${formatIDR(utilities.deltaPLN)}` : ''}${utilities.deltaPLN && utilities.deltaPLN > 0 && utilities.deltaPDAM && utilities.deltaPDAM > 0 ? ' dan ' : ''}${utilities.deltaPDAM && utilities.deltaPDAM > 0 ? `PDAM ${formatIDR(utilities.deltaPDAM)}` : ''} dibanding periode sebelumnya.`
      );
    }
  }

  if (allowed.has('finance') && canViewFinance && snapshot.finance) {
    if (snapshot.finance.internal.topCategories && snapshot.finance.internal.topCategories[0]) {
      lines.push(`- Keuangan: kategori belanja terbesar saat ini ${snapshot.finance.internal.topCategories[0].name}.`);
    }
  }

  if (lines.length === 1) {
    lines.push('- Tidak ada prioritas kritis yang menonjol dari area yang diminta pada snapshot ini.');
  }

  return lines;
};

const buildActionLines = (snapshot: DashboardAssistantSnapshot, sections: DashboardSectionKey[], canViewFinance: boolean) => {
  const allowed = new Set(sections);
  const lines = ['Tindak lanjut yang disarankan'];

  if (allowed.has('mokletService') && isSectionAvailable(snapshot, 'mokletService')) {
    const service = snapshot.mokletService;
    if (service.complaints.pending > 0) {
      lines.push(`- Verifikasi ${service.complaints.pending} pengaduan yang masih menunggu agar backlog tidak menumpuk.`);
    }
    if (service.roomReservation.waitingConfirmation > 0) {
      lines.push(`- Putuskan ${service.roomReservation.waitingConfirmation} reservasi ruang yang masih pending sebelum kebutuhan ruang bentrok.`);
    }
    if (service.toolsLoan.haveNotReturn > 0) {
      lines.push(`- Ingatkan pengembalian ${service.toolsLoan.haveNotReturn} alat yang masih aktif dipinjam.`);
    }
  }

  if (allowed.has('classroom') && isSectionAvailable(snapshot, 'classroom')) {
    const classroom = snapshot.classroom;
    if (classroom.topIssueRooms.length > 0) {
      const firstRoom = classroom.topIssueRooms[0];
      lines.push(`- Koordinasikan wali kelas/piket untuk ${firstRoom.label} karena temuan tertinggi adalah ${firstRoom.summary}.`);
    }
  }

  if (allowed.has('ac') && isSectionAvailable(snapshot, 'ac') && snapshot.ac.troubleRooms.length > 0) {
    lines.push(`- Jadwalkan inspeksi teknis ke ${buildTroubleRoomList(snapshot.ac.troubleRooms)}.`);
  }

  if (allowed.has('capex') && isSectionAvailable(snapshot, 'capex') && snapshot.capex.topLagging.length > 0) {
    lines.push(`- Review progres proyek ${snapshot.capex.topLagging.slice(0, 2).map((project) => project.nama).join(' dan ')} bersama owner terkait.`);
  }

  if (allowed.has('utilities') && isSectionAvailable(snapshot, 'utilities')) {
    const utilities = snapshot.utilities;
    if ((utilities.deltaPLN || 0) > 0 || (utilities.deltaPDAM || 0) > 0) {
      lines.push('- Cocokkan lonjakan utilitas dengan aktivitas gedung, jadwal event, dan pola pemakaian kelas/lab.');
    }
  }

  if (allowed.has('finance') && canViewFinance && snapshot.finance?.internal.topCategories?.[0]) {
    lines.push(`- Pantau kategori belanja ${snapshot.finance.internal.topCategories[0].name} karena porsinya paling besar di kas internal.`);
  }

  if (lines.length === 1) {
    lines.push('- Belum ada aksi korektif khusus dari area yang diminta; kondisi snapshot cenderung aman.');
  }

  return lines;
};

const detectSections = (query: string, canViewFinance: boolean) => {
  const sections = new Set<DashboardSectionKey>();

  if (includesAny(query, ['sarmok', 'layanan', 'pengaduan', 'aduan', 'komplain', 'complaint', 'reservasi', 'booking ruang', 'peminjaman alat', 'pinjam alat', 'tools loan', 'borrow'])) {
    sections.add('mokletService');
  }
  if (includesAny(query, ['kelas', 'classroom', 'wali kelas', 'sampah', 'lampu', 'tv', 'kipas', 'kotoran', 'temuan', 'rapih', 'kebersihan', 'pantauan kelas', 'monitor kelas'])) {
    sections.add('classroom');
  }
  if (includesAny(query, [' ac ', ' ac.', ' ac,', ' ac?', ' ac!', 'air conditioner', 'pendinginan', 'pendingin', 'ruangan dingin', 'monitor ac'])) {
    sections.add('ac');
  } else if (/(^| )ac( |$)/.test(query)) {
    sections.add('ac');
  }
  if (includesAny(query, ['capex', 'proyek', 'anggaran proyek', 'pengerjaan', 'project'])) {
    sections.add('capex');
  }
  if (includesAny(query, ['wifi', 'wi fi', 'client', 'klien', 'device', 'perangkat terhubung', 'koneksi user'])) {
    sections.add('wifi');
  }
  if (includesAny(query, ['jaringan', 'network', 'rx', 'tx', 'astinet', 'indibizz', 'bandwidth', 'traffic', 'ont'])) {
    sections.add('network');
  }
  if (includesAny(query, ['utilitas', 'pln', 'pdam', 'listrik', 'air', 'tagihan', 'meteran'])) {
    sections.add('utilities');
  }
  if (includesAny(query, ['piket', 'catatan piket', 'note piket', 'temuan piket', 'logbook'])) {
    sections.add('piket');
  }
  if (canViewFinance && includesAny(query, ['keuangan', 'kas', 'saldo', 'belanja', 'pengeluaran', 'tu ', 'operasional', 'finansial', 'budget', 'anggaran kas', 'kategori belanja'])) {
    sections.add('finance');
  }
  if (includesAny(query, ['personel', 'pegawai', 'staff', 'staf', 'anggota tim', 'rekan', 'tim sarpras', 'unit'])) {
    sections.add('personnel');
  }
  if (includesAny(query, ['jadwal piket', 'petugas piket', 'siapa piket', 'siapa yang piket', 'rotasi piket', 'tugas hari ini'])) {
    sections.add('duty');
  }

  return DASHBOARD_SECTION_ORDER.filter((section) => sections.has(section));
};

const isGreeting = (query: string) => {
  return /^(halo|hai|hi|hello|selamat|pagi|siang|sore|malam|assalamualaikum)\b/.test(query)
    || includesAny(query, ['siapa kamu', 'siapa anda', 'kenalan', 'perkenalkan']);
};

const wantsHelp = (query: string) => {
  return includesAny(query, ['bantuan', 'help', 'fitur', 'bisa apa', 'kemampuan', 'apa saja yang bisa', 'apa yg bisa', 'cara pakai', 'panduan']);
};

const wantsPriority = (query: string) => {
  return includesAny(query, ['prioritas', 'urgent', 'fokus', 'kritis', 'masalah utama', 'paling penting', 'paling mendesak', 'mendesak']);
};

const wantsAction = (query: string) => {
  return includesAny(query, ['tindak lanjut', 'aksi', 'instruksi', 'apa yang harus', 'apa yg harus', 'langkah', 'follow up', 'rekomendasi', 'saran', 'solusi', 'next step']);
};

const wantsCount = (query: string) => {
  return includesAny(query, ['berapa', 'jumlah', 'total', 'ada berapa', 'banyak', 'kuantitas', 'count']);
};

const wantsTrend = (query: string) => {
  return includesAny(query, ['trend', 'tren', 'naik', 'turun', 'perubahan', 'perbandingan', 'banding', 'dibanding', 'kenaikan', 'penurunan', 'delta', 'selisih']);
};

const wantsLatest = (query: string) => {
  return includesAny(query, ['terbaru', 'terakhir', 'paling baru', 'recent', 'latest', 'last']);
};

const wantsWorst = (query: string) => {
  return includesAny(query, ['paling rusak', 'paling bermasalah', 'paling tertinggal', 'paling parah', 'terburuk', 'terendah', 'paling lambat']);
};

const wantsBest = (query: string) => {
  return includesAny(query, ['paling baik', 'terbaik', 'tertinggi', 'paling cepat', 'paling progres', 'leading', 'top']);
};

const detectRoomNumbers = (query: string): number[] => {
  const matches: number[] = [];
  const regex = /(?:ruang|kelas|r\.?|kls)\s*0*(\d{1,2})\b/g;
  let m;
  while ((m = regex.exec(query)) !== null) {
    const num = parseInt(m[1], 10);
    if (num >= 1 && num <= 40) matches.push(num);
  }
  return Array.from(new Set(matches));
};

const buildHelpReply = (snapshot: DashboardAssistantSnapshot, canViewFinance: boolean, defaultSections: DashboardSectionKey[]) => {
  const lines = [
    'Saya bisa membantu di area berikut:',
    '- Ringkasan keseluruhan dashboard (contoh: "ringkas dashboard hari ini")',
    '- Prioritas / fokus utama (contoh: "prioritas kelas dan AC")',
    '- Tindak lanjut yang disarankan (contoh: "apa yang harus dilakukan untuk piket")',
    '- Detail satu area (contoh: "rincian utilitas", "status AC", "catatan piket terbaru")',
    '- Jawaban angka spesifik (contoh: "berapa pengaduan menunggu", "ada berapa AC rusak")',
    '- Tren / perbandingan (contoh: "PLN naik atau turun", "trend wifi minggu ini")',
    '- Lookup per ruang (contoh: "kondisi AC ruang 12", "temuan kelas 7")',
    canViewFinance
      ? '- Kas Sarpras, Kas TU, Kas AC, kategori belanja terbesar'
      : '- Area keuangan hanya terbuka untuk role pimpinan/admin saat login.',
    buildSourceFooter(snapshot, defaultSections),
  ];
  return lines;
};

const buildRoomLookup = (snapshot: DashboardAssistantSnapshot, rooms: number[]) => {
  const lines = [`Lookup ${rooms.length > 1 ? 'ruang' : 'Ruang'} ${rooms.join(', ')}`];

  rooms.forEach((roomNumber) => {
    const block: string[] = [`- Ruang ${roomNumber}:`];

    if (isSectionAvailable(snapshot, 'classroom')) {
      const matchedTop = snapshot.classroom.topIssueRooms.find((row) => {
        const idMatch = (row.room || '').match(/(\d{1,2})/);
        if (!idMatch) return false;
        return parseInt(idMatch[1], 10) === roomNumber;
      });
      if (matchedTop) {
        block.push(`  · Pantauan kelas: ${matchedTop.total} temuan${matchedTop.summary ? ` (${matchedTop.summary})` : ''}${matchedTop.waliKelas ? `, wali ${matchedTop.waliKelas}` : ''}.`);
      } else {
        block.push('  · Pantauan kelas: tidak ada dalam daftar 5 ruang tertinggi pada snapshot ini.');
      }
    }

    if (isSectionAvailable(snapshot, 'ac')) {
      const acRow = snapshot.ac.troubleRooms.find((row) => row.ruang === roomNumber);
      if (acRow) {
        block.push(`  · AC: kondisi ${acRow.kondisi}, ${acRow.pk}, status ${acRow.status}.`);
      } else {
        block.push('  · AC: tidak masuk daftar trouble (kemungkinan baik atau belum terpasang).');
      }
    }

    lines.push(...block);
  });

  return lines;
};

const buildCountAnswer = (
  snapshot: DashboardAssistantSnapshot,
  sections: DashboardSectionKey[],
  query: string,
  canViewFinance: boolean
): string[] | null => {
  const allowed = new Set(sections);
  const lines: string[] = ['Hitungan cepat'];
  let added = 0;

  const push = (line: string) => {
    lines.push(`- ${line}`);
    added += 1;
  };

  if (allowed.has('mokletService') && isSectionAvailable(snapshot, 'mokletService')) {
    const m = snapshot.mokletService;
    if (includesAny(query, ['pengaduan', 'aduan', 'komplain'])) {
      push(`Pengaduan: ${m.complaints.pending} menunggu, ${m.complaints.inProgress} diproses, ${m.complaints.complete} selesai, ${m.complaints.rejected} ditolak.`);
    }
    if (includesAny(query, ['reservasi', 'ruang', 'booking'])) {
      push(`Reservasi ruang: ${m.roomReservation.waitingConfirmation} menunggu, ${m.roomReservation.activeReservation} aktif, ${m.roomReservation.inUseReservation} dipakai.`);
    }
    if (includesAny(query, ['alat', 'pinjam', 'borrow'])) {
      push(`Peminjaman alat: ${m.toolsLoan.waitingConfirmation} menunggu, ${m.toolsLoan.haveNotReturn} belum kembali, ${m.toolsLoan.returned} kembali.`);
    }
  }

  if (allowed.has('classroom') && isSectionAvailable(snapshot, 'classroom')) {
    const c = snapshot.classroom;
    push(`Kelas: ${c.issueRooms} ruang bermasalah, ${c.cleanRooms} aman, total ${c.totalFindings} temuan dari ${c.monitoredRooms}/${c.referenceRooms} ruang.`);
  }

  if (allowed.has('ac') && isSectionAvailable(snapshot, 'ac')) {
    const a = snapshot.ac;
    push(`AC: ${a.baik} baik, ${a.perbaikan} perbaikan, ${a.rusak} rusak, ${a.terpasang}/${a.total} terpasang.`);
  }

  if (allowed.has('capex') && isSectionAvailable(snapshot, 'capex')) {
    const cx = snapshot.capex;
    push(`CAPEX: ${cx.totalProjects} proyek (${cx.completedProjects} selesai, ${cx.priorityProjects} di bawah 50%), rata-rata progres ${cx.averageProgress.toFixed(1)}%.`);
  }

  if (allowed.has('wifi') && isSectionAvailable(snapshot, 'wifi')) {
    push(`Wi-Fi: ${snapshot.wifi.latestCount.toLocaleString('id-ID')} klien (${snapshot.wifi.latestDate}), puncak ${snapshot.wifi.peakCount.toLocaleString('id-ID')} (${snapshot.wifi.peakDate}).`);
  }

  if (allowed.has('piket') && isSectionAvailable(snapshot, 'piket')) {
    push(`Catatan piket terbaru: ${snapshot.piket.recentNotes.length} entri tersimpan dalam snapshot.`);
  }

  if (allowed.has('finance') && canViewFinance && snapshot.finance) {
    push(`Saldo: Sarpras ${formatIDR(snapshot.finance.internal.balance)}, TU ${formatIDR(snapshot.finance.tu.balance)}, AC ${formatIDR(snapshot.finance.ac.balance)}.`);
  }

  if (allowed.has('personnel') && isSectionAvailable(snapshot, 'personnel')) {
    push(`Personel aktif: ${snapshot.personnel.total} orang lintas unit.`);
  }

  if (allowed.has('duty') && isSectionAvailable(snapshot, 'duty')) {
    push(`Piket ${snapshot.duty.day}: ${snapshot.duty.personnel.length} petugas (${snapshot.duty.personnel.join(', ') || 'belum terjadwal'}).`);
  }

  return added > 0 ? lines : null;
};

const buildTrendAnswer = (
  snapshot: DashboardAssistantSnapshot,
  sections: DashboardSectionKey[]
): string[] | null => {
  const allowed = new Set(sections);
  const lines: string[] = ['Pergerakan / tren'];
  let added = 0;
  const push = (line: string) => {
    lines.push(`- ${line}`);
    added += 1;
  };

  if (allowed.has('utilities') && isSectionAvailable(snapshot, 'utilities')) {
    const u = snapshot.utilities;
    push(`PLN ${u.latestLabel}: ${formatIDR(u.latestPLN)} (${formatSignedDelta(u.deltaPLN)} dibanding ${u.previousLabel || 'periode sebelumnya'}).`);
    push(`PDAM ${u.latestLabel}: ${formatIDR(u.latestPDAM)} (${formatSignedDelta(u.deltaPDAM)} dibanding ${u.previousLabel || 'periode sebelumnya'}).`);
  }

  if (allowed.has('wifi') && isSectionAvailable(snapshot, 'wifi')) {
    push(`Wi-Fi ${snapshot.wifi.latestDate}: ${snapshot.wifi.latestCount.toLocaleString('id-ID')} klien — ${formatSignedDelta(snapshot.wifi.delta, 'klien')} dari pengamatan sebelumnya.`);
  }

  if (allowed.has('capex') && isSectionAvailable(snapshot, 'capex')) {
    const cx = snapshot.capex;
    push(`CAPEX: rata-rata progres ${cx.averageProgress.toFixed(1)}% (${cx.completedProjects} selesai, ${cx.priorityProjects} masih <50%).`);
  }

  return added > 0 ? lines : null;
};

const buildLatestAnswer = (
  snapshot: DashboardAssistantSnapshot,
  sections: DashboardSectionKey[]
): string[] | null => {
  const allowed = new Set(sections);
  const lines: string[] = ['Update terbaru'];
  let added = 0;
  const push = (line: string) => {
    lines.push(`- ${line}`);
    added += 1;
  };

  if (allowed.has('piket') && isSectionAvailable(snapshot, 'piket') && snapshot.piket.recentNotes.length > 0) {
    const note = snapshot.piket.recentNotes[0];
    push(`Catatan piket: ${note.tanggal} · ${note.petugas} · ${note.kategori}: ${note.isi}`);
  }

  if (allowed.has('classroom') && isSectionAvailable(snapshot, 'classroom')) {
    push(`Pantauan kelas: ${formatDateLabel(snapshot.classroom.latestDate)}, ${snapshot.classroom.issueRooms} ruang bermasalah dari ${snapshot.classroom.monitoredRooms} terpantau.`);
  }

  if (allowed.has('wifi') && isSectionAvailable(snapshot, 'wifi')) {
    push(`Wi-Fi: ${snapshot.wifi.latestCount.toLocaleString('id-ID')} klien pada ${snapshot.wifi.latestDate}.`);
  }

  if (allowed.has('network') && isSectionAvailable(snapshot, 'network')) {
    push(`Jaringan: snapshot ${formatDateLabel(snapshot.network.latestDate)}, RX ${formatTraffic(snapshot.network.totalRx)} TX ${formatTraffic(snapshot.network.totalTx)}.`);
  }

  if (allowed.has('utilities') && isSectionAvailable(snapshot, 'utilities')) {
    push(`Utilitas ${snapshot.utilities.latestLabel}: PLN ${formatIDR(snapshot.utilities.latestPLN)}, PDAM ${formatIDR(snapshot.utilities.latestPDAM)}.`);
  }

  return added > 0 ? lines : null;
};

const buildWorstAnswer = (
  snapshot: DashboardAssistantSnapshot,
  sections: DashboardSectionKey[]
): string[] | null => {
  const allowed = new Set(sections);
  const lines: string[] = ['Titik paling perlu perhatian'];
  let added = 0;
  const push = (line: string) => {
    lines.push(`- ${line}`);
    added += 1;
  };

  if (allowed.has('classroom') && isSectionAvailable(snapshot, 'classroom') && snapshot.classroom.topIssueRooms.length > 0) {
    const top = snapshot.classroom.topIssueRooms[0];
    push(`Kelas: ${top.label} dengan ${top.total} temuan${top.summary ? ` (${top.summary})` : ''}.`);
  }

  if (allowed.has('ac') && isSectionAvailable(snapshot, 'ac') && snapshot.ac.troubleRooms.length > 0) {
    push(`AC: ${buildTroubleRoomList(snapshot.ac.troubleRooms)}.`);
  }

  if (allowed.has('capex') && isSectionAvailable(snapshot, 'capex') && snapshot.capex.topLagging.length > 0) {
    push(`CAPEX paling tertinggal: ${snapshot.capex.topLagging.slice(0, 3).map((p) => `${p.nama} (${p.progress}%)`).join(', ')}.`);
  }

  if (allowed.has('utilities') && isSectionAvailable(snapshot, 'utilities')) {
    const u = snapshot.utilities;
    const upward = [
      u.deltaPLN && u.deltaPLN > 0 ? `PLN +${formatIDR(u.deltaPLN)}` : null,
      u.deltaPDAM && u.deltaPDAM > 0 ? `PDAM +${formatIDR(u.deltaPDAM)}` : null,
    ].filter(Boolean) as string[];
    if (upward.length > 0) push(`Utilitas naik: ${upward.join(', ')}.`);
  }

  return added > 0 ? lines : null;
};

const buildBestAnswer = (
  snapshot: DashboardAssistantSnapshot,
  sections: DashboardSectionKey[]
): string[] | null => {
  const allowed = new Set(sections);
  const lines: string[] = ['Yang sedang on-track'];
  let added = 0;
  const push = (line: string) => {
    lines.push(`- ${line}`);
    added += 1;
  };

  if (allowed.has('capex') && isSectionAvailable(snapshot, 'capex') && snapshot.capex.topLeading.length > 0) {
    push(`CAPEX terdepan: ${snapshot.capex.topLeading.slice(0, 3).map((p) => `${p.nama} (${p.progress}%)`).join(', ')}.`);
  }

  if (allowed.has('classroom') && isSectionAvailable(snapshot, 'classroom') && snapshot.classroom.cleanRooms > 0) {
    push(`Kelas aman tanpa temuan: ${snapshot.classroom.cleanRooms} ruang.`);
  }

  if (allowed.has('ac') && isSectionAvailable(snapshot, 'ac')) {
    push(`AC kondisi baik: ${snapshot.ac.baik} unit dari ${snapshot.ac.terpasang} terpasang.`);
  }

  if (allowed.has('wifi') && isSectionAvailable(snapshot, 'wifi')) {
    push(`Puncak Wi-Fi: ${snapshot.wifi.peakCount.toLocaleString('id-ID')} klien pada ${snapshot.wifi.peakDate}.`);
  }

  return added > 0 ? lines : null;
};

const buildContextualSuggestions = (sections: DashboardSectionKey[], canViewFinance: boolean) => {
  if (sections.length === 0) return buildQuickSuggestions(canViewFinance);

  const out: string[] = [];
  const has = (key: DashboardSectionKey) => sections.includes(key);

  if (has('classroom')) out.push('Ruang mana paling bermasalah?');
  if (has('ac')) out.push('Berapa AC rusak sekarang?');
  if (has('capex')) out.push('CAPEX paling lambat siapa?');
  if (has('utilities')) out.push('PLN naik atau turun?');
  if (has('wifi')) out.push('Trend klien Wi-Fi minggu ini?');
  if (has('mokletService')) out.push('Tindak lanjut layanan Sarmok');
  if (has('piket')) out.push('Catatan piket terbaru');
  if (canViewFinance && has('finance')) out.push('Kategori belanja terbesar bulan ini');

  if (out.length === 0) return buildQuickSuggestions(canViewFinance);
  return out.slice(0, 4);
};

export const shouldRefreshAssistantSnapshot = (message: string, snapshot: DashboardAssistantSnapshot | null) => {
  if (!snapshot) return true;

  const query = normalizeQuery(message);
  if (includesAny(query, ['refresh', 'sinkron', 'sync', 'update', 'terbaru', 'hari ini', 'sekarang', 'live'])) {
    return true;
  }

  const generatedAt = new Date(snapshot.generatedAt).getTime();
  if (Number.isNaN(generatedAt)) return true;
  return Date.now() - generatedAt > 2 * 60 * 1000;
};

export const buildSarmokAssistantReply = ({
  message,
  snapshot,
  canViewFinance,
}: {
  message: string;
  snapshot: DashboardAssistantSnapshot;
  canViewFinance: boolean;
}): DashboardAssistantReply => {
  const query = normalizeQuery(message);
  const defaultSections: DashboardSectionKey[] = canViewFinance
    ? ['mokletService', 'classroom', 'ac', 'capex', 'wifi', 'network', 'utilities', 'piket', 'finance', 'personnel', 'duty']
    : ['mokletService', 'classroom', 'ac', 'capex', 'wifi', 'network', 'utilities', 'piket', 'personnel', 'duty'];

  if (!query || isGreeting(query)) {
    const intro = [
      'Halo! Saya Asisten Sarmok. Saya membaca snapshot live dashboard dan merangkumnya tanpa mengarang angka.',
      'Saya bisa bantu ringkasan, prioritas, tindak lanjut, jawaban angka spesifik, tren, atau lookup per ruang. Cukup tanya, contoh: "berapa pengaduan menunggu", "kondisi AC ruang 12", atau "PLN naik atau turun bulan ini".',
      buildSourceFooter(snapshot, defaultSections),
    ].join('\n');

    return {
      text: intro,
      sections: defaultSections,
      suggestions: buildQuickSuggestions(canViewFinance),
    };
  }

  if (wantsHelp(query)) {
    const helpLines = buildHelpReply(snapshot, canViewFinance, defaultSections);
    return {
      text: helpLines.join('\n'),
      sections: defaultSections,
      suggestions: buildQuickSuggestions(canViewFinance),
    };
  }

  const sections = detectSections(query, canViewFinance);
  const rooms = detectRoomNumbers(query);
  const targetSections = sections.length > 0 ? sections : defaultSections;

  let lines: string[] = [];

  if (rooms.length > 0) {
    lines.push(...buildRoomLookup(snapshot, rooms));
  }

  const wantsPri = wantsPriority(query);
  const wantsAct = wantsAction(query);
  const wantsCnt = wantsCount(query);
  const wantsTrd = wantsTrend(query);
  const wantsLat = wantsLatest(query);
  const wantsWst = wantsWorst(query);
  const wantsBst = wantsBest(query);
  const hasSpecialIntent = wantsPri || wantsAct || wantsCnt || wantsTrd || wantsLat || wantsWst || wantsBst;

  if (wantsCnt) {
    const countLines = buildCountAnswer(snapshot, targetSections, query, canViewFinance);
    if (countLines) lines.push(...countLines);
  }

  if (wantsTrd) {
    const trendLines = buildTrendAnswer(snapshot, targetSections);
    if (trendLines) lines.push(...trendLines);
  }

  if (wantsLat) {
    const latestLines = buildLatestAnswer(snapshot, targetSections);
    if (latestLines) lines.push(...latestLines);
  }

  if (wantsWst) {
    const worstLines = buildWorstAnswer(snapshot, targetSections);
    if (worstLines) lines.push(...worstLines);
  }

  if (wantsBst) {
    const bestLines = buildBestAnswer(snapshot, targetSections);
    if (bestLines) lines.push(...bestLines);
  }

  if (wantsPri) {
    lines.push(...buildPriorityLines(snapshot, targetSections, canViewFinance));
  }

  if (wantsAct) {
    lines.push(...buildActionLines(snapshot, targetSections, canViewFinance));
  }

  if (!hasSpecialIntent && rooms.length === 0) {
    if (sections.length === 0) {
      lines.push(...buildOverviewLines(snapshot, canViewFinance));
    } else {
      targetSections.forEach((section) => {
        if (section === 'mokletService') lines.push(...buildMokletServiceDetail(snapshot));
        if (section === 'classroom') lines.push(...buildClassroomDetail(snapshot));
        if (section === 'ac') lines.push(...buildACDetail(snapshot));
        if (section === 'capex') lines.push(...buildCapexDetail(snapshot));
        if (section === 'wifi') lines.push(...buildWifiDetail(snapshot));
        if (section === 'network') lines.push(...buildNetworkDetail(snapshot));
        if (section === 'utilities') lines.push(...buildUtilitiesDetail(snapshot));
        if (section === 'piket') lines.push(...buildPiketDetail(snapshot));
        if (section === 'finance') lines.push(...buildFinanceDetail(snapshot, canViewFinance));
        if (section === 'personnel') lines.push(...buildPersonnelDetail(snapshot));
        if (section === 'duty') lines.push(...buildDutyDetail(snapshot));
      });
    }
  }

  if (lines.length === 0) {
    lines.push('Saya belum menemukan area dashboard yang cocok dengan pertanyaan ini. Coba sebut bagiannya, misal kelas, AC, layanan Sarmok, jaringan, utilitas, piket, kas, atau gunakan kata "berapa", "trend", "prioritas", "tindak lanjut".');
    lines.push(...buildOverviewLines(snapshot, canViewFinance));
  }

  const availabilityNotes = buildAvailabilityNotes(snapshot, targetSections);
  if (availabilityNotes.length > 0) {
    lines.push(...availabilityNotes);
  }

  lines.push(buildSourceFooter(snapshot, targetSections));

  return {
    text: lines.join('\n'),
    sections: targetSections,
    suggestions: buildContextualSuggestions(sections, canViewFinance),
  };
};
