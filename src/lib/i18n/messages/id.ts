// Bahasa Indonesia (인도네시아어).
//
// 검수 전이다. 현장 투입 전 원어민 확인이 필요하다 (docs/i18n.md 참고).

import type { Messages } from './ko';

export const id: Messages = {
  'common.back': 'Kembali',
  'common.home': 'Beranda',
  'common.retake': 'Foto ulang',
  'common.grinder': 'Gerinda',
  'common.wheel': 'Batu gerinda',
  'common.language': 'Bahasa',

  'home.title': 'WheelMatch AI',
  'home.subtitle': 'Pencocokan spesifikasi gerinda dan batu gerinda',
  'home.question': 'Pekerjaan hari ini?',
  'home.cutting': 'Memotong',
  'home.cuttingHint': 'Pekerjaan potong',
  'home.grinding': 'Menggerinda',
  'home.grindingHint': 'Menggerinda dan mengamplas',
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

  'checks.title': 'Hasil tiap pemeriksaan',
  'rule.requiredValues': 'Nilai wajib',
  'rule.rpmSafety': 'Batas kecepatan',
  'rule.diameterFit': 'Kesesuaian diameter',
  'rule.purpose': 'Kegunaan batu gerinda',
  'rule.workPurpose': 'Sesuai pekerjaan Anda',
  'rule.wheelType': 'Jenis batu gerinda',
  'rule.visibleDamage': 'Kerusakan yang terlihat',
  'rule.peripheralSpeed': 'Pemeriksaan silang kecepatan tepi',
  'rule.confidence': 'Keyakinan pembacaan',

  'action.title': 'JANGAN DIGUNAKAN',
  'action.rpmSafety':
    'Jangan pasang batu gerinda ini. Ganti dengan yang tahan kecepatan sama atau lebih tinggi dari kecepatan gerinda.',
  'action.diameterFit':
    'Jangan pasang batu gerinda ini. Ganti dengan yang diameternya tidak melebihi batas gerinda.',
  'action.workPurpose':
    'Ganti dengan batu gerinda yang sesuai pekerjaan hari ini. Batu gerinda dengan kegunaan lain mudah pecah.',
  'action.generic':
    'Jangan pasang batu gerinda ini. Ganti dengan yang memenuhi syarat.',

  'checklist.title': 'Daftar periksa keselamatan',
  'checklist.note':
    'Periksa sendiri hal-hal ini. Pencocokan spesifikasi tidak mencakupnya.',
  'checklist.guardCover': 'Pelindung terpasang',
  'checklist.guardCoverHint':
    'Pastikan batu gerinda tertutup pada sudut yang diwajibkan',
  'checklist.auxiliaryHandle': 'Gagang samping terpasang',
  'checklist.auxiliaryHandleHint':
    'Pastikan Anda bisa memegang dengan dua tangan untuk menahan hentakan balik',
  'checklist.wheelDamage': 'Batu gerinda tidak rusak',
  'checklist.wheelDamageHint':
    'Periksa retak, gompal, atau bengkok (jika ada, segera ganti)',
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
