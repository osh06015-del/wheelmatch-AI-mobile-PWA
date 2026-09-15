// Bahasa Indonesia (인도네시아어).
//
// 검수 전이다. 현장 투입 전 원어민 확인이 필요하다 (docs/i18n.md 참고).
//
// 용어는 인도네시아 K3(산업안전) 자료와 대조해 골랐다.
//   gerinda tangan · batu gerinda · kap pelindung · hentakan balik · APD
// 확인하지 못한 것은 docs/i18n.md의 검수 질문 목록에 남겼다.

import type { Messages } from './ko';

export const id: Messages = {
  'common.home': 'Beranda',
  'common.grinder': 'Gerinda',
  'common.wheel': 'Batu gerinda',
  'common.language': 'Bahasa',

  'home.title': 'WheelMatch AI',
  'home.subtitle': 'Pencocokan spesifikasi gerinda dan batu gerinda',
  'home.question': 'Pekerjaan hari ini?',
  'home.cutting': 'Memotong',
  'home.cuttingHint': 'Pekerjaan potong',
  'home.grinding': 'Menggerinda',
  'home.grindingHint': 'Pekerjaan gerinda',
  'home.afterChoice':
    'Setelah memilih, foto pelat nama gerinda lebih dulu, lalu label batu gerinda.',
  'home.history': 'Lihat riwayat pemeriksaan →',

  'verdict.compatible': 'SPESIFIKASI COCOK',
  'verdict.incompatible': 'SPESIFIKASI TIDAK COCOK',
  'verdict.undetermined': 'TIDAK DAPAT DINILAI',
  'verdict.note.compatible':
    'Spesifikasi yang tertera saling cocok. Selesaikan daftar periksa keselamatan di bawah ini.',
  'verdict.note.incompatible':
    'Jangan gunakan kombinasi ini. Periksa penyebabnya di bawah ini.',
  'verdict.note.undetermined':
    'Data tidak cukup untuk menilai. Foto ulang atau masukkan nilainya sendiri.',

  'result.title': 'Hasil pencocokan spesifikasi',
  'result.loading': 'Memuat hasil...',
  'result.undetermined.help':
    'Data kurang atau keyakinan pembacaan rendah. Foto ulang atau masukkan nilainya sendiri agar dapat dinilai.',
  'result.retakeGrinder': 'Ulangi dari gerinda',
  'result.retakeWheel': 'Ulangi batu gerinda saja',
  'result.save': 'Selesai dan simpan',
  'result.saving': 'Menyimpan...',
  'result.saveError':
    'Gagal menyimpan. Periksa ruang penyimpanan lalu coba lagi.',
  'result.saveStopped': 'Simpan hasil penghentian',

  'group.confirmed': 'Sudah dicocokkan',
  'group.conflicting': 'Tidak cocok',
  'group.unreadable': 'Tidak terbaca',
  'group.manual': 'Periksa sendiri',
  'notVerifiable.title': 'Yang tidak dapat diperiksa aplikasi ini',
  'notVerifiable.note':
    'Hal-hal berikut tidak termasuk dalam hasil. Foto dan label tidak dapat menunjukkannya.',

  'checks.title': 'Hasil tiap pemeriksaan',
  'rule.requiredValues': 'Nilai wajib',
  'rule.rpmSafety': 'Batas kecepatan',
  'rule.diameterFit': 'Kesesuaian diameter',
  'rule.purpose': 'Kegunaan batu gerinda',
  'rule.workPurpose': 'Sesuai pekerjaan Anda',
  'rule.wheelType': 'Jenis batu gerinda',
  'rule.visibleDamage': 'Kerusakan yang terlihat',
  'rule.unitConsistency': 'Konsistensi label',
  'rule.mountingSpec': 'Diameter lubang pemasangan',
  'rule.peripheralSpeed': 'Pemeriksaan silang kecepatan keliling',
  'rule.expiry': 'Tanggal kedaluwarsa',
  'rule.confidence': 'Keyakinan pembacaan',
  'expiry.source':
    'Dasar kedaluwarsa: hanya bulan/tahun yang tercetak pada label yang dipakai. Tidak pernah dihitung dari tanggal produksi. Format penandaan mengikuti oSa "Product marking requirements for bonded abrasives" (2020-04, berdasarkan EN 12413:2019). Naskah EN 12413 sendiri belum dibaca. Menganggap bulan yang tertera masih berlaku sampai hari terakhirnya adalah tafsiran aplikasi ini, bukan peraturan. Pasal 122 Peraturan Standar Keselamatan dan Kesehatan Kerja Korea tidak memuat ketentuan kedaluwarsa.',

  'ruleVersion.label': 'Versi set aturan',
  'ruleVersion.note':
    'Sumber dan cakupan aturan yang dipakai untuk hasil ini. Ini bukan sertifikasi hukum atau jaminan kepatuhan peraturan.',
  'ruleVersion.missing': 'Tidak tercatat (pemeriksaan sebelum fitur ini ada)',
  'trialRun.title': 'Uji putar',
  'trialRun.legalBasis':
    'Pasal 122 ayat (2) Peraturan Standar Keselamatan dan Kesehatan Kerja Korea mewajibkan uji putar minimal 1 menit sebelum mulai bekerja dan minimal 3 menit setelah mengganti batu gerinda, sambil memeriksa apakah ada yang tidak wajar. Aplikasi ini hanya menghitung waktu dan mencatat jawaban Anda, bukan menggantikan prosedur itu.',
  'trialRun.standClear':
    'Selama uji putar, berdirilah menjauh dari muka batu gerinda dan arah putarannya.',
  'trialRun.separateFromTarget':
    'Waktu uji putar dihitung terpisah dari target pemeriksaan awal 30 detik. Jangan mempersingkat waktu yang diwajibkan peraturan demi target itu.',
  'trialRun.replacedQuestion': 'Apakah Anda baru saja mengganti batu gerinda?',
  'trialRun.startReplaced': 'Ya — mulai uji putar {seconds} detik',
  'trialRun.startBeforeWork': 'Tidak — mulai uji putar {seconds} detik',
  'trialRun.modeReplaced': 'Uji putar setelah ganti batu gerinda',
  'trialRun.modeBeforeWork': 'Uji putar sebelum mulai bekerja',
  'trialRun.running': 'Berjalan minimal {seconds} detik. Sisa waktu',
  'trialRun.elapsed':
    'Waktu yang diwajibkan sudah terpenuhi. Laporkan hal tidak wajar di bawah.',
  'trialRun.waitNotice':
    'Anda baru dapat menjawab setelah waktu yang diwajibkan terpenuhi.',
  'trialRun.findingsTitle': 'Apakah ada yang tidak wajar saat uji putar?',
  'trialRun.findingsHint':
    'Centang semua yang sesuai. Jika ada yang dicentang, Anda hanya bisa lanjut sebagai Ada masalah.',
  'trialRun.finding.vibration': 'Getaran tidak wajar',
  'trialRun.finding.noise': 'Suara tidak wajar',
  'trialRun.finding.wobble': 'Batu gerinda goyang',
  'trialRun.finding.wheelDamage': 'Tanda batu gerinda rusak atau longgar',
  'trialRun.finding.equipment': 'Ada yang tidak beres pada mesin',
  'trialRun.confirmNormal': 'Tidak ada yang tidak wajar — dikonfirmasi',
  'trialRun.reportAbnormal': 'Ada masalah',
  'trialRun.stopTitle': 'Jangan mulai bekerja',
  'trialRun.stopBody':
    'Ditemukan hal tidak wajar saat uji putar. Hentikan mesin, putuskan sumber listrik, lalu periksa pemasangan batu gerinda dan kondisi mesin.',
  'trialRun.required':
    'Pencocokan spesifikasi selesai. Anda dapat menyimpan setelah uji putar.',

  'grinderCondition.title': 'Periksa kondisi gerinda sendiri',
  'grinderCondition.note':
    'Sebelum memasang batu gerinda, lihat seluruh mesin dan jawab lima hal berikut.',
  'grinderCondition.aiBoundary':
    'AI hanya membaca data spesifikasi pada pelat nama. Kondisi mesin gerinda dan keselamatan kerja harus diperiksa sendiri oleh pekerja.',
  'grinderCondition.cordAndPlug': 'Apakah kabel dan steker tidak rusak?',
  'grinderCondition.cordAndPlugHint':
    'Raba sepanjang kabel — isolasi terkelupas, bagian terjepit, steker retak',
  'grinderCondition.body': 'Apakah bodi bebas dari retak dan kerusakan berat?',
  'grinderCondition.bodyHint':
    'Bekas terjatuh, rumahan mesin retak, bagian yang longgar',
  'grinderCondition.guard': 'Apakah kap pelindung terpasang dan terkunci kuat?',
  'grinderCondition.guardHint':
    'Tidak boleh bergeser saat diputar dengan tangan, dan harus menutup batu gerinda sesuai sudut yang ditentukan',
  'grinderCondition.auxiliaryHandle':
    'Apakah gagang samping terpasang dan dikencangkan?',
  'grinderCondition.auxiliaryHandleHint':
    'Harus bisa dipegang dua tangan untuk menahan hentakan balik. Jika goyang, pilih Ada masalah',
  'grinderCondition.spindle':
    'Apakah spindel, flensa, dan mur pengunci bebas kerusakan?',
  'grinderCondition.spindleHint':
    'Ulir aus, flensa bengkok atau kotor, mur yang sudah termakan',
  'grinderCondition.confirmed': 'Sudah diperiksa',
  'grinderCondition.issue': 'Ada masalah',
  'grinderCondition.incomplete':
    'Anda harus memeriksa sendiri {count} butir yang tersisa sebelum lanjut memotret batu gerinda.',
  'grinderCondition.stopTitle': 'Jangan gunakan gerinda ini',
  'grinderCondition.stopBody':
    'Ditemukan masalah pada kondisi peralatan. Jangan digunakan. Periksakan dan perbaiki dahulu, lalu cek ulang.',

  'wheelCondition.title': 'Periksa kondisi batu gerinda sendiri',
  'wheelCondition.note':
    'Sebelum dipasang, periksa sendiri kedua sisi, tepi, dan area pemasangan batu gerinda.',
  'wheelCondition.aiBoundary':
    'AI hanya dapat memperingatkan kerusakan terlihat yang dicurigai. AI tidak memastikan batu gerinda bebas kerusakan atau pekerjaan aman.',
  'wheelCondition.aiDamageWarning':
    'AI mencurigai tanda kerusakan yang terlihat pada foto. Periksa sendiri batu gerinda dengan teliti.',
  'wheelCondition.labelWarning':
    'AI tidak dapat membaca cukup informasi label. Periksa label asli dan koreksi nilai di atas.',
  'wheelCondition.expiryWarning':
    'AI tidak dapat membaca tanggal kedaluwarsa. Periksa sendiri bulan/tahun pada label.',
  'wheelCondition.damageFree':
    'Tidak ada pecah, retak, retak rambut, atau gompal pada tepi?',
  'wheelCondition.damageFreeHint':
    'Jangan hanya mengandalkan foto; putar dan periksa seluruh batu gerinda di tempat terang',
  'wheelCondition.notDeformed':
    'Batu gerinda tidak melengkung atau berubah bentuk?',
  'wheelCondition.notDeformedHint':
    'Pilih Ada masalah jika tidak rata, terpuntir, atau menggembung',
  'wheelCondition.mountingAreaUndamaged':
    'Lubang tengah dan area pemasangan tidak tampak rusak?',
  'wheelCondition.mountingAreaUndamagedHint':
    'Periksa kedua sisi sekitar lubang tengah dari gompal, aus, atau perubahan bentuk',
  'wheelCondition.labelLegible': 'Label dan spesifikasi utama dapat dikenali?',
  'wheelCondition.labelLegibleHint':
    'Pastikan RPM, diameter, kegunaan, dan tanda lain yang perlu dibandingkan dapat dibaca',
  'wheelCondition.expiryValid': 'Tanggal kedaluwarsa pada label masih berlaku?',
  'wheelCondition.expiryValidHint':
    'Baca bulan/tahun pada label; jangan memperkirakan dari tanggal produksi',
  'wheelCondition.confirmed': 'Sudah diperiksa',
  'wheelCondition.issue': 'Ada masalah',
  'wheelCondition.incomplete':
    'Anda harus memeriksa sendiri {count} butir yang tersisa sebelum membandingkan spesifikasi.',
  'wheelCondition.stopTitle': 'JANGAN GUNAKAN BATU GERINDA INI',
  'wheelCondition.stopBody':
    'Ditemukan masalah pada batu gerinda. Jangan pasang. Ganti dengan batu gerinda lain yang layak dan periksa lagi.',

  'wheelType.bonded_abrasive': 'Batu gerinda bonded biasa',
  'wheelType.flap_disc': 'Flap disc (amplas susun)',
  'wheelType.cup_wheel': 'Batu gerinda mangkuk',
  'wheelType.diamond': 'Mata potong berlian',
  'wheelType.wire_brush': 'Sikat kawat',
  'wheelType.other': 'Lainnya',
  'wheelType.unknown': 'Tidak yakin',
  'wheelTypeConfirm.label': 'Jenis batu gerinda',
  'wheelTypeConfirm.hint':
    'Pilih berdasarkan bentuk batu, bukan tulisan pada label. Lihat batu yang sebenarnya.',
  'wheelTypeConfirm.aiSuggestion':
    'Saran AI: {type} — hanya perkiraan awal dari foto.',
  'wheelTypeConfirm.supported':
    'Spesifikasi hanya dibandingkan bila Anda sendiri memastikan ini batu gerinda bonded biasa.',
  'wheelTypeConfirm.unknown':
    'Jika jenisnya belum dipastikan, hasil pencocokan spesifikasi akan TIDAK DAPAT DINILAI. Lihat batu yang sebenarnya lalu pilih.',
  'wheelTypeConfirm.unsupported':
    'Aplikasi ini tidak menilai jenis ini. Hasil pencocokan spesifikasi akan TIDAK DAPAT DINILAI. Ikuti petunjuk produsen.',
  'wheelTypeConfirm.differs':
    'Saran AI ({ai}) berbeda dengan pilihan Anda ({selected}). Periksa lagi batu yang sebenarnya dan centang konfirmasi langsung di bawah untuk melanjutkan.',
  'wheelTypeConfirm.needsConfirm':
    'Jenis batu berbeda dari saran AI. Centang konfirmasi langsung untuk melanjutkan.',

  'action.title': 'JANGAN DIGUNAKAN',
  'action.rpmSafety':
    'Jangan pasang batu gerinda ini. Ganti dengan yang tahan kecepatan sama atau lebih tinggi dari kecepatan gerinda.',
  'action.diameterFit':
    'Jangan pasang batu gerinda ini. Ganti dengan yang diameternya tidak melebihi batas gerinda.',
  'action.workPurpose':
    'Ganti dengan batu gerinda yang sesuai pekerjaan hari ini. Batu gerinda dengan kegunaan lain mudah pecah.',
  'action.expiry':
    'Jangan pasang batu gerinda ini. Tanggal kedaluwarsa pada labelnya sudah lewat. Ganti dengan yang masih berlaku.',
  'action.generic':
    'Jangan pasang batu gerinda ini. Ganti dengan yang memenuhi syarat.',

  'checklist.title': 'Daftar periksa keselamatan',
  'checklist.note':
    'Periksa sendiri hal-hal ini. Pencocokan spesifikasi tidak mencakupnya.',
  'checklist.ppe': 'APD dipakai',
  'checklist.ppeHint':
    'Periksa kacamata pengaman, sarung tangan, dan pelindung wajah',
  'checklist.workpiece': 'Benda kerja sudah dijepit kuat',
  'checklist.workpieceHint':
    'Dijepit erat dengan ragum atau klem. Jangan ditahan dengan tangan atau kaki',
  'checklist.surroundings': 'Orang dan bahan mudah terbakar di sekitar',
  'checklist.surroundingsHint':
    'Pastikan tidak ada orang dan bahan mudah terbakar dalam jangkauan percikan api',
  'checklist.preWork':
    'Tepat sebelum mulai, pastikan percikan api tidak mengarah ke orang atau bahan mudah terbakar.',
  'checklist.incomplete':
    'Anda harus mengonfirmasi seluruh {count} butir keselamatan sebelum menyimpan.',

  'scan.retake': 'Foto ulang',
  'scan.retryAnalysis': 'Analisis ulang foto yang sama',
  'scan.confirmTitle': 'Periksa nilai yang terbaca',
  'scan.grinder.title': 'Foto pelat nama gerinda',
  'scan.grinder.guide': 'Posisikan pelat nama di dalam bingkai',
  'scan.grinder.analyzing': 'Menganalisis pelat nama...',
  'scan.grinder.failed': 'Gagal menganalisis pelat nama.',
  'scan.grinder.proceed': 'Konfirmasi lalu foto batu gerinda',
  'scan.wheel.title': 'Foto label batu gerinda',
  'scan.wheel.guide': 'Posisikan label di dalam bingkai',
  'scan.wheel.analyzing': 'Menganalisis label...',
  'scan.wheel.failed': 'Gagal menganalisis label.',
  'scan.wheel.proceed': 'Konfirmasi lalu cocokkan spesifikasi',
  'scan.wheel.grinderFirst': 'Periksa kondisi gerinda terlebih dahulu.',

  'camera.starting': 'Membuka kamera...',
  'camera.pickFromGallery': 'Pilih dari galeri',
  'camera.pickPhoto': 'Pilih foto dari galeri',
  'camera.retry': 'Coba buka kamera lagi',
  'camera.gallery': 'Galeri',
  'camera.shutter': 'Ambil foto',
  'camera.error.unsupported':
    'Browser ini tidak mendukung kamera. Pastikan halaman dibuka melalui HTTPS.',
  'camera.error.permission':
    'Izin kamera ditolak. Izinkan kamera di pengaturan browser, lalu coba lagi.',
  'camera.error.notFound': 'Tidak ditemukan kamera yang dapat dipakai.',
  'camera.error.inUse':
    'Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu, lalu coba lagi.',
  'camera.error.failed': 'Kamera tidak dapat dibuka.',
  'camera.error.failedNamed': 'Kamera tidak dapat dibuka. ({name})',

  'error.imageDecode':
    'Format foto ini tidak dapat dibaca. Pilih ulang foto JPG atau PNG. (Foto HEIC dari iPhone mungkin tidak didukung)',
  'error.network':
    'Tidak dapat terhubung ke server. Periksa jaringan, lalu analisis ulang foto yang sama.',
  'error.serverConfig':
    'Label tidak dapat dianalisis karena masalah pengaturan server. Beri tahu admin.',
  'error.badRequest': 'Permintaan analisis tidak valid. Foto ulang.',
  'error.imageTooLarge':
    'Gambar terlalu besar. Coba lagi dengan foto beresolusi lebih rendah.',
  'error.rateLimited':
    'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.',
  'error.upstream':
    'Layanan analisis tidak dapat memproses permintaan. Tunggu sebentar lalu coba lagi. (galat {status})',

  'field.model': 'Model',
  'field.noLoadRPM': 'Kecepatan tanpa beban',
  'field.maxWheelDiameter': 'Diameter batu gerinda maksimum yang diizinkan',
  'field.maxRPM': 'Kecepatan kerja maksimum',
  'field.diameter': 'Diameter',
  'field.thickness': 'Ketebalan',
  'field.purpose': 'Kegunaan',
  'field.expiry': 'Tanggal kedaluwarsa',
  'field.placeholder': 'Tidak terbaca — isi sendiri',
  'field.purposeUnknown': 'Tidak yakin',
  'field.confidence.high': 'Keyakinan pembacaan: tinggi',
  'field.confidence.medium': 'Keyakinan pembacaan: sedang — periksa nilainya',
  'field.confidence.low':
    'Keyakinan pembacaan: rendah — foto ulang atau isi nilainya sendiri',
  'field.rawShow': 'Tampilkan teks yang terbaca',
  'field.rawHide': 'Sembunyikan teks yang terbaca',
  'manualConfirm.label':
    'Saya sudah melihat label sendiri dan memastikan nilai di atas',
  'manualConfirm.hint':
    'Jika dicentang, hasil memakai nilai yang Anda pastikan sebagai ganti keyakinan pembacaan.',

  'guide.grinder.model.hint':
    'Nama produk gerinda. Hanya dicatat, tidak dipakai untuk hasil.',
  'guide.grinder.model.where':
    'Tercetak besar di bagian atas pelat nama. Contoh: GWS 750-125',
  'guide.grinder.noLoadRPM.hint':
    'Kecepatan putar gerinda ini. Batu gerinda harus tahan terhadap kecepatan ini.',
  'guide.grinder.noLoadRPM.where':
    'Angka di samping n₀ atau "no load speed" pada pelat nama. Contoh: 11000 r/min, 11000 min⁻¹',
  'guide.grinder.maxWheelDiameter.hint':
    'Batu gerinda terbesar yang bisa dipasang di mesin ini. Batu yang lebih besar tidak muat di dalam kap pelindung.',
  'guide.grinder.maxWheelDiameter.where':
    'Diameter di samping kata seperti wheel atau disc pada pelat nama. Contoh: max Ø125mm',
  'guide.wheel.maxRPM.hint':
    'Kecepatan tertinggi yang dapat ditahan batu gerinda ini. Jika lebih rendah dari kecepatan gerinda, batu bisa pecah dan terlempar.',
  'guide.wheel.maxRPM.where':
    'Kecepatan yang tercetak besar pada label. Jika hanya tertulis m/s, aplikasi mengonversinya. Contoh: 12200 r/min, 80 m/s',
  'guide.wheel.diameter.hint':
    'Diameter luar batu gerinda. Tidak boleh melebihi batas yang diizinkan gerinda.',
  'guide.wheel.diameter.where':
    'Angka pertama pada ukuran. Contoh: 125 pada 125 × 1.6 × 22.23',
  'guide.wheel.thickness.hint':
    'Ketebalan batu gerinda. Batu gerinda potong tipis (1–3mm), batu gerinda untuk menggerinda tebal (sekitar 6mm).',
  'guide.wheel.thickness.where':
    'Angka tengah pada ukuran. Contoh: 1.6 pada 125 × 1.6 × 22.23',
  'guide.wheel.purpose.hint':
    'Batu untuk memotong dipakai memotong, batu untuk menggerinda dipakai menggerinda. Jika tertukar, batu menerima beban samping dan bisa pecah.',
  'guide.wheel.purpose.where':
    'Tanda kegunaan potong/gerinda pada label, tertulis CUT-OFF, GRINDING, atau DEPRESSED CENTER.',
  'guide.wheel.expiry.hint':
    'Tanggal kedaluwarsa pada label. Produsen melarang memakai batu gerinda yang sudah lewat tanggal. Ada batu yang tidak mencantumkannya.',
  'guide.wheel.expiry.where':
    'Dicap sebagai bulan/tahun pada cincin logam di tengah. Contoh: 04/2023, kadang diawali V atau EXP. Jangan isi dengan tanggal produksi.',

  'requirement.compactTitle': 'Batu gerinda yang diperlukan',
  'requirement.compactUnknown':
    'Pelat nama tidak terbaca, jadi syarat tidak dapat ditentukan',
  'requirement.title': 'Syarat batu gerinda',
  'requirement.partial':
    'Tidak semua syarat dapat ditentukan. Periksa sendiri nilai yang kurang pada pelat nama.',
  'requirement.notRecommendation':
    'Ini bukan rekomendasi produk, melainkan syarat yang mengikuti nilai pada pelat nama.',
  'requirement.purposeUnknown':
    'Pekerjaan belum dipilih, jadi kegunaan tidak dapat ditentukan.',
  'requirement.diameterMax': 'Φ{diameter}mm atau lebih kecil',
  'requirement.diameterUnknown':
    'Diameter maksimum yang diizinkan tidak terbaca dari pelat nama.',
  'requirement.rpmMin': '{rpm}rpm atau lebih tinggi',
  'requirement.rpmUnknown':
    'Kecepatan tanpa beban tidak terbaca dari pelat nama.',
  'summary.sizeClass': 'Kelas {inch} inci (maks. Φ{diameter}mm)',
  'summary.maxDiameter': 'maks. Φ{diameter}mm',
  'summary.unreadable': 'Nilai pelat nama tidak terbaca',
  'margin.surplus': 'Margin +{percent}%',
  'margin.shortfall': 'Kurang {percent}%',
  'margin.none': 'Tanpa margin (0%)',

  'wheelPurpose.cutting': 'Untuk memotong',
  'wheelPurpose.grinding': 'Untuk menggerinda',
  'wheelPurpose.unknown': 'Belum dikenali',
  'wheelType.unconfirmed': 'Belum dipastikan',
  'confidence.high': 'Tinggi',
  'confidence.medium': 'Sedang',
  'confidence.low': 'Rendah',
  'value.bore': 'Lubang Φ{bore}mm',
  'value.unitConsistency': '{rpm}rpm = {computed}m/s / label {labeled}m/s',

  'reason.requiredValues.ok':
    'Nilai kecepatan yang diperlukan untuk perbandingan sudah terbaca semua.',
  'reason.requiredValues.missingGrinder':
    'Kecepatan tanpa beban gerinda tidak terbaca. Foto ulang atau isi nilainya sendiri.',
  'reason.requiredValues.missingWheel':
    'Kecepatan kerja maksimum batu gerinda tidak terbaca. Foto ulang atau isi nilainya sendiri.',
  'reason.requiredValues.missingBoth':
    'Kecepatan tanpa beban gerinda dan kecepatan kerja maksimum batu gerinda tidak terbaca. Foto ulang atau isi nilainya sendiri.',
  'reason.rpmSafety.missing':
    'Nilai kecepatan tidak lengkap, jadi tidak dapat dibandingkan.',
  'reason.rpmSafety.fail':
    'Kecepatan kerja maksimum batu gerinda ({wheel}rpm) lebih rendah dari kecepatan tanpa beban gerinda ({grinder}rpm). Batu bisa pecah dan terlempar.',
  'reason.rpmSafety.pass':
    'Kecepatan kerja maksimum batu gerinda ({wheel}rpm) sama dengan atau lebih tinggi dari kecepatan tanpa beban gerinda ({grinder}rpm).',
  'reason.diameterFit.missing':
    'Nilai diameter tidak lengkap, jadi tidak dapat dibandingkan. Periksa sendiri diameter pada pelat nama gerinda dan label batu gerinda.',
  'reason.diameterFit.fail':
    'Diameter batu gerinda ({wheel}mm) melebihi diameter maksimum yang diizinkan gerinda ({grinder}mm).',
  'reason.diameterFit.pass':
    'Diameter batu gerinda ({wheel}mm) masih dalam batas diameter maksimum yang diizinkan gerinda ({grinder}mm).',
  'reason.purpose.unknown':
    'Kegunaan batu gerinda (potong/gerinda) tidak dikenali. Periksa label sendiri.',
  'reason.purpose.recognized': 'Kegunaan batu gerinda dikenali: {purpose}.',
  'reason.workPurpose.unknown':
    'Pekerjaan hari ini: {work}. Kegunaan batu gerinda tidak terbaca. Periksa sendiri tanda kegunaan pada label.',
  'reason.workPurpose.mismatch':
    'Pekerjaan hari ini: {work}. Batu gerinda ini: {purpose}. Batu gerinda yang tidak sesuai kegunaannya bisa pecah karena beban samping.',
  'reason.workPurpose.match':
    'Pekerjaan hari ini ({work}) sesuai dengan kegunaan batu gerinda.',
  'reason.wheelType.unknown':
    'Jenis batu gerinda belum dipastikan. Spesifikasi hanya dicocokkan untuk batu gerinda bonded biasa yang sudah dipastikan. Lihat batu yang sebenarnya dan pilih jenisnya di layar pemeriksaan nilai.',
  'reason.wheelType.unsupported':
    '{type}: aplikasi ini tidak menangani jenis ini. Sistem spesifikasinya berbeda sehingga tidak dapat dinilai. Ikuti petunjuk produsen.',
  'reason.wheelType.supported':
    'Dipastikan sebagai batu gerinda bonded biasa, jenis yang spesifikasinya dicocokkan aplikasi ini.',
  'reason.visibleDamage.suspected':
    'Ada bagian di foto yang tampak pecah atau retak. Jangan gunakan batu gerinda ini; periksa sendiri.',
  'reason.visibleDamage.notVerifiable':
    'Retak rambut tidak terlihat pada foto. Sebelum dipasang, lakukan uji ketuk (ketuk pelan dan dengarkan suaranya).',
  'reason.confidence.low':
    'Keyakinan pembacaan label rendah. Foto ulang atau isi nilainya sendiri.',
  'reason.confidence.ok': 'Keyakinan pembacaan label cukup.',
  'reason.unitConsistency.mismatch':
    'Kecepatan dalam rpm dan kecepatan keliling dalam m/s pada label tidak cocok. Salah satunya mungkin salah baca. Periksa lagi angka pada label.',
  'reason.unitConsistency.match':
    'Dua tanda kecepatan pada label saling cocok.',
  'reason.mountingSpec.missing':
    'Diameter lubang pemasangan tidak terbaca dari label. Sebelum dipasang, periksa sendiri apakah batu pas dengan poros.',
  'reason.mountingSpec.shown':
    'Diameter lubang pada label adalah Φ{bore}mm. Pelat nama gerinda tidak mencantumkan ukuran poros, jadi aplikasi ini tidak dapat membandingkannya. Periksa sendiri kecocokannya dengan poros.',
  'reason.peripheralSpeed.oddGrinder':
    'Kecepatan keliling yang dihitung dari nilai gerinda berada di luar rentang wajar. Diameter atau kecepatan mungkin salah baca. Periksa lagi angka gerinda.',
  'reason.peripheralSpeed.oddWheel':
    'Kecepatan keliling yang dihitung dari nilai batu gerinda berada di luar rentang wajar. Diameter atau kecepatan mungkin salah baca. Periksa lagi angka pada label batu gerinda.',
  'reason.peripheralSpeed.oddBoth':
    'Kecepatan keliling yang dihitung dari nilai gerinda dan batu gerinda berada di luar rentang wajar. Diameter atau kecepatan mungkin salah baca. Periksa lagi angka gerinda dan batu gerinda.',
  'reason.peripheralSpeed.ok': 'Nilai diameter dan kecepatan saling sesuai.',
  'reason.expiry.noToday':
    'Tidak ada tanggal acuan, jadi tanggal kedaluwarsa tidak dapat diperiksa. Buka ulang aplikasi dan lakukan pemeriksaan lagi.',
  'reason.expiry.unreadable':
    'Tanggal kedaluwarsa tidak terbaca dari label. Tanggal acuan {today}. Periksa sendiri tanda bulan/tahun pada cincin logam (contoh: 04/2023). Ada batu yang tidak mencantumkannya.',
  'reason.expiry.expired':
    'Tanggal kedaluwarsa pada label sudah lewat. Tertera {expiry} (berlaku sampai {lastValid}), tanggal acuan {today}. Produsen melarang memakai batu gerinda yang sudah kedaluwarsa.',
  'reason.expiry.valid':
    'Tanggal kedaluwarsa pada label belum lewat. Tertera {expiry} (berlaku sampai {lastValid}), tanggal acuan {today}.',

  'ruleSource.krOsh.label':
    'Peraturan Standar Keselamatan dan Kesehatan Kerja Korea',
  'ruleSource.krOsh.reference':
    'Pasal 122 (Peraturan Menteri Ketenagakerjaan Korea No. 450, berlaku 2026-03-02)',
  'ruleSource.krOsh.scope':
    'Kecepatan kerja maksimum · pemakaian sisi · kap pelindung · uji putar',
  'ruleSource.kosha.label': 'KOSHA GUIDE',
  'ruleSource.kosha.reference':
    'M-189-2015 Pedoman teknis kerja aman dengan gerinda tangan',
  'ruleSource.kosha.scope':
    'Anjuran penyimpanan dan penanganan (tidak mengikat secara hukum)',
  'ruleSource.osa.label': 'oSa Product marking requirements',
  'ruleSource.osa.reference': 'Issue 2, 2020-04 (berdasarkan EN 12413:2019)',
  'ruleSource.osa.scope':
    'Acuan format penandaan kedaluwarsa. Naskah asli EN belum dibaca',

  'hazard.list.cutting': 'Bahaya pekerjaan potong',
  'hazard.list.grinding': 'Bahaya pekerjaan gerinda',
  'hazard.list.common': 'Bahaya umum',
  'hazard.summary': '{title} ({count})',
  'hazard.cuttingSide.title': 'Jangan menggerinda dengan sisi batu potong',
  'hazard.cuttingSide.detail':
    'Batu gerinda potong dibuat hanya untuk memotong dengan tepinya. Jika didorong ke samping, batu yang tipis tidak kuat menahan beban samping dan patah.',
  'hazard.cuttingPinch.title': 'Jangan memuntir atau menekuk batu potong',
  'hazard.cuttingPinch.detail':
    'Jika celah potongan menutup, batu terjepit dan terjadi hentakan balik. Topang bahan di kedua sisi agar celah potongan terbuka.',
  'hazard.cuttingForce.title': 'Jangan memotong dengan menekan kuat',
  'hazard.cuttingForce.detail':
    'Menekan kuat membuat batu terlalu panas dan berubah bentuk. Biarkan berat mesin membawa batu masuk perlahan.',
  'hazard.grindingAngle.title': 'Miringkan batu 15–30° saat menggerinda',
  'hazard.grindingAngle.detail':
    'Jika terlalu tegak, tepi batu menancap ke bahan dan mesin terpental. Dengan dimiringkan, bidang kontak lebih lebar dan lebih stabil.',
  'hazard.grindingSide.title':
    'Jangan beri beban samping pada batu gerinda untuk menggerinda',
  'hazard.grindingSide.detail':
    'Hanya batu gerinda mangkuk yang dibuat untuk dipakai dengan sisinya. Mendorong batu gerinda biasa ke samping bisa membuatnya pecah.',
  'hazard.grindingIdle.title': 'Putar dulu batu yang baru dipasang tanpa beban',
  'hazard.grindingIdle.detail':
    'Pemasangan yang salah atau retak akan terlihat sebelum ada beban. Arahkan ke tempat tanpa orang dan periksa getaran atau suara tidak wajar.',
  'hazard.commonStop.title': 'Letakkan mesin setelah batu benar-benar berhenti',
  'hazard.commonStop.detail':
    'Setelah listrik dimatikan, batu masih berputar karena kelembaman. Jika menyentuh lantai saat masih berputar, mesin terpental.',
  'hazard.commonGuard.title': 'Arahkan kap pelindung menjauhi pekerja',
  'hazard.commonGuard.detail':
    'Kap pelindung menahan arah datangnya pecahan. Jika sudutnya bergeser, tubuh tetap terbuka meski kap pelindung terpasang.',

  'notVerifiable.internalCrack.title': 'Retak di bagian dalam',
  'notVerifiable.internalCrack.detail':
    'Retak rambut tidak tampak pada foto permukaan. Sebelum dipasang, lakukan uji ketuk (ketuk pelan dan dengarkan suaranya).',
  'notVerifiable.physicalDamage.title': 'Kerusakan fisik',
  'notVerifiable.physicalDamage.detail':
    'Foto hanya menunjukkan kerusakan yang jelas. Penyok, perubahan bentuk, atau lembap tidak dapat dikenali. Periksa sendiri.',
  'notVerifiable.mounting.title': 'Pemasangan yang benar',
  'notVerifiable.mounting.detail':
    'Kekencangan flensa, arah putaran, dan duduknya batu pada poros tidak dapat diketahui dari foto. Periksa sendiri setelah dipasang.',
  'notVerifiable.guard.title': 'Kondisi kap pelindung',
  'notVerifiable.guard.detail':
    'Aplikasi ini tidak dapat melihat apakah kap pelindung terpasang, sudutnya benar, atau tidak rusak. Periksa dengan mata sendiri.',

  'history.title': 'Riwayat pemeriksaan',
  'history.loading': 'Memuat catatan...',
  'history.clearConfirm':
    'Semua {count} catatan pemeriksaan yang tersimpan akan dihapus. Tidak dapat dibatalkan.',
  'history.clearConfirmButton': 'Hapus semua',
  'history.cancel': 'Batal',
  'history.clearAll': 'Hapus semua catatan',
  'history.newInspection': 'Mulai pemeriksaan baru',
  'history.empty': 'Belum ada catatan pemeriksaan yang tersimpan.',
  'history.timeNote':
    '"30 detik" adalah target waktu pemeriksaan awal: dari memilih pekerjaan sampai tepat sebelum uji putar dimulai. Uji putar yang diwajibkan peraturan (minimal 1 atau 3 menit) terpisah dari target ini dan tidak dipersingkat.',
  'history.elapsed': 'Pemeriksaan memakan {time}',
  'history.elapsedWithTrial': 'Pemeriksaan memakan {time} (termasuk uji putar)',
  'history.preTrial': 'Pemeriksaan awal {time} (sampai sebelum uji putar)',
  'history.unknownModel': 'Model tidak diketahui',
  'history.unknownDiameter': 'Diameter tidak diketahui',
  'history.summary':
    '{model} {grinderRpm} · batu gerinda {wheelDiameter} {wheelRpm}',
  'history.grinderPhoto': 'Pelat nama gerinda',
  'history.wheelPhoto': 'Label batu gerinda',
  'history.noPhoto': 'Tidak ada foto yang tersimpan.',
  'elapsed.overHour': 'lebih dari 1 jam',
  'elapsed.seconds': '{seconds} detik',
  'elapsed.minutes': '{minutes} menit',
  'elapsed.minutesSeconds': '{minutes} menit {seconds} detik',

  'research.notice':
    'Fitur validasi/riset ini tidak mengubah hasil di lapangan.',
  'research.noticeDetail':
    'Hanya terlihat di build validasi. Fitur ini hanya mengekspor catatan dan menghitung metrik; tidak ikut menentukan hasil, pemeriksaan kondisi, uji putar, atau syarat penyimpanan.',
  'research.modeTitle': 'Mode riset',
  'research.modeHint':
    'Mengekspor hasil pengukuran sebagai CSV. Tidak diperlukan untuk pemakaian di lapangan.',
  'research.download': 'Unduh CSV ({count} catatan)',
  'research.deviceOnly':
    'Catatan hanya ada di perangkat ini. Pindahkan sendiri berkas yang diunduh.',
  'research.downloadFailed': 'Gagal mengunduh. Periksa ruang penyimpanan.',
  'research.truthTitle': 'Berkas nilai benar (Ground Truth)',
  'research.truthHint':
    'Nilai yang Anda baca dan catat sendiri sebelum memotret. Diperlukan untuk menghitung metrik. Aplikasi tidak membuat nilai benar.',
  'research.truthEmpty':
    'Tidak ada nilai benar yang terbaca. Pastikan berkas berupa array JSON.',
  'research.truthUnreadable': 'Berkas nilai benar tidak dapat dibaca.',
  'research.truthRejected':
    '{count} baris dikeluarkan karena formatnya salah. Periksa jumlah sampel.',
  'metrics.title': 'Metrik evaluasi',
  'metrics.note':
    'Dihitung dari {count} catatan yang memiliki nilai benar. Akurasi pembacaan diukur dengan nilai OCR asli sebelum dikoreksi pengguna.',
  'metrics.notAvailable': 'N/A — tidak ada data untuk dihitung',
  'metrics.records': '{numerator} / {denominator} catatan',
  'metrics.fields': '{numerator} / {denominator} kolom',
  'metrics.falseSafe.name': 'False-Safe Rate',
  'metrics.falseSafe.definition':
    'Dari catatan yang nilai benarnya SPESIFIKASI TIDAK COCOK, porsi yang dilaporkan aplikasi sebagai SPESIFIKASI COCOK. Jika bukan nol, jangan dirilis.',
  'metrics.undetermined.name': 'Tingkat tidak dapat dinilai',
  'metrics.undetermined.definition':
    'Porsi hasil yang tidak dapat dinilai. Ini perilaku yang dirancang, bukan kegagalan.',
  'metrics.fieldAccuracy.name': 'Akurasi ekstraksi kolom',
  'metrics.fieldAccuracy.definition':
    'Dari kolom yang memiliki nilai benar, porsi nilai OCR asli yang cocok.',
  'metrics.unitNormalization.name': 'Galat normalisasi satuan',
  'metrics.unitNormalization.definition':
    'Dari catatan yang dikonversi dari m/s, porsi yang hasilnya berbeda dari nilai benar.',
  'metrics.falseSafeIds':
    'id catatan False-Safe: {ids} — analisis dan laporkan satu per satu. Jangan disembunyikan.',

  // Spanduk build validasi. Ditampilkan dengan syarat yang sama dengan alat riset.
  // Hanya tampilan — tidak memengaruhi hasil atau catatan yang tersimpan.
  'validationBuild.label': 'Build validasi',
  'validationBuild.note':
    'Tidak untuk pemakaian lapangan. Catatan disimpan terpisah dari build lapangan.',
  'validationBuild.commit': 'commit {sha}',
  'validationBuild.commitUnknown': 'tidak ada info commit',

  // Info build. Ditampilkan di kedua build, di sebelah pernyataan penyangkalan.
  'build.commit': 'build {sha}',
  'build.commitUnknown': 'tidak ada info build',

  // Pemberitahuan pembaruan service worker. Muncul di atas layar saat terdeteksi.
  // Tombol terapkan dikunci selama pemeriksaan atau uji putar — layar tidak boleh
  // berubah tanpa peringatan saat mesin benar-benar sedang berjalan.
  'update.available': 'Ada versi baru.',
  'update.apply': 'Perbarui sekarang',
  'update.applying': 'Menerapkan pembaruan...',
  'update.blockedDuringInspection':
    'Anda dapat memperbarui setelah pemeriksaan selesai.',

  'meta.title':
    'WheelMatch AI — Pencocokan spesifikasi gerinda dan batu gerinda',

  disclaimer:
    'Aplikasi ini hanya membandingkan spesifikasi yang tercetak pada label. Aplikasi ini tidak menjamin keselamatan kerja dan tidak menggantikan buku panduan pabrikan maupun peraturan keselamatan di lokasi kerja.',

  'translation.notice':
    'Terjemahan ini belum diperiksa. Jika artinya kurang jelas, ikuti teks bahasa Korea dan tanyakan kepada pengawas Anda.',
};
