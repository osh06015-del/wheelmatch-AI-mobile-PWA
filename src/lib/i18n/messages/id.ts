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
  'grinderCondition.guard': 'Apakah pelindung terpasang dan terkunci kuat?',
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
  'checklist.preWork':
    'Tepat sebelum mulai, pastikan percikan api tidak mengarah ke orang atau bahan mudah terbakar.',
  'checklist.incomplete':
    'Anda harus mengonfirmasi seluruh {count} butir keselamatan sebelum menyimpan.',

  disclaimer:
    'Aplikasi ini hanya membandingkan spesifikasi yang tercetak pada label. Aplikasi ini tidak menjamin keselamatan kerja dan tidak menggantikan buku panduan pabrikan maupun peraturan keselamatan di lokasi kerja.',

  'translation.notice':
    'Terjemahan ini belum diperiksa. Jika artinya kurang jelas, ikuti teks bahasa Korea dan tanyakan kepada pengawas Anda.',
};
