// =====================================================================
//  templates.js — semua format laporan + contoh isian variabel
//  Cara edit: ubah teks di "tpl" (placeholder ditulis {Nama Variabel}),
//  lalu isi contoh default-nya di "vars".
//
//  Aturan khusus:
//  • "LAPORAN / UPDATE {Update Number}" → otomatis jadi "LAPORAN" kalau
//    Update Number kosong, atau "UPDATE 3" kalau diisi 3.
//  • options: [...] → muncul tombol pilihan cepat di bawah kotak isian.
// =====================================================================

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
  'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** Waktu sekarang (WIB) → "Rabu, 28 Oktober 2026, Pukul 13:34 WIB" */
export function nowWIB() {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${HARI[d.getUTCDay()]}, ${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}, Pukul ${hh}:${mm} WIB`;
}

const STATUS_OPTS = ['Dalam Konfirmasi ⌛', 'Aman ✅', 'Terdampak 🟠'];
const SIFAT = 'Sifat Laporan: Sebagai Informasi / Eskalasi';
const DIST = 'Nearest Facility Distance: angka + km/m';

// Variabel yang dipakai di banyak format (label, petunjuk, contoh default)
export const COMMON_VARS = {
  'Update Number': {
    label: 'Nomor Update', optional: true, def: '1',
    hint: 'Kosongkan → judul "LAPORAN". Isi angka → judul "UPDATE 1", "UPDATE 2", dst.',
  },
  'Alert': { label: 'Alert / Level', hint: 'Sertakan emoji, contoh: 🟢 Siaga 4', def: '🟢 Siaga 4' },
  'Current Date': { label: 'Tanggal & Waktu Laporan', hint: 'Contoh: Rabu, 1 Juli 2026, Pukul 00:05 WIB', def: nowWIB, now: true },
  'Nearest Facility Information[0]': { label: 'Aset Terdekat — Nama', hint: 'Nama kantor/fasilitas terdekat', def: 'KCP Gisting' },
  'Nearest Facility Information[1]': { label: 'Aset Terdekat — Area', hint: 'Huruf kapital, contoh: AREA BANDAR LAMPUNG', def: 'AREA BANDAR LAMPUNG' },
  'Nearest Facility Information[2]': { label: 'Aset Terdekat — Region', hint: 'Huruf kapital, contoh: REGION II / SUMATERA 2', def: 'REGION II / SUMATERA 2' },
  'Nearest Facility Distance': { label: 'Jarak ke Aset', hint: 'Angka + satuan, contoh: 6,43 km atau 800 m', def: '6,43 km' },
  'Employee Status': { label: 'Status Pegawai', def: STATUS_OPTS[0], options: STATUS_OPTS },
  'Asset Status': { label: 'Status Aset', def: STATUS_OPTS[0], options: STATUS_OPTS },
  'Operational Status': { label: 'Status Operasional', def: STATUS_OPTS[0], options: STATUS_OPTS },
  'Penanganan': { label: 'Penanganan', def: 'Proses Call Tree.' },
  'Next Step': { label: 'Next Step', def: 'Monitor perkembangan situasi.' },
  'Incident ID': { label: 'Incident ID', def: 'INC-202610281322-553163' },
  'Sifat Laporan': { label: 'Sifat Laporan', def: 'Sebagai Informasi', options: ['Sebagai Informasi', 'Eskalasi'] },
};

export const SLIDES = [
  // ------------------------------------------------------------------ GEMPA
  {
    id: 'gempa', title: 'Gempa Bumi', icon: '🌏', accent: '#f5a524',
    tpl: `*LAPORAN / UPDATE {Update Number} Situasi Gempa Bumi {Susulan} {EQK Magnitude} M | {Alert} | Kedalaman {EQK Depth} Km | MMI {EQK Felt: terbesar-terkecil}*
{EQK Event Time (Contoh: Rabu, 1 Juli 2026, Pukul 00:05 WIB)}

*Informasi:*
Episenter {EQK Area} dekat {Nearest Facility Information[1]} ({Nearest Facility Information[2]})
*Aset Terdekat:* {Nearest Facility Information[0]} (± {${DIST}})

👤 *Pegawai:* {Employee Status}
🏢 *Aset:* {Asset Status}
⚙️ *Operasional:* {Operational Status}
🌊 *Potensi Tsunami:* {EQK Potential}

*Penanganan:* {Penanganan}
*Next Step:* {Next Step}

Demikian kami laporkan, terima kasih.
*Operation Command Center*

> \`{Incident ID}\``,
    vars: {
      'Susulan': { label: 'Susulan (opsional)', hint: 'Isi "Susulan" kalau gempa susulan. Kosongkan kalau bukan.', def: '', ph: 'Susulan', optional: true, options: ['Susulan'] },
      'EQK Magnitude': { label: 'Magnitudo', hint: 'Pakai titik, contoh: 2.5', def: '2.5' },
      'EQK Depth': { label: 'Kedalaman (Km)', def: '3' },
      'EQK Felt': { label: 'MMI dirasakan', hint: 'Terbesar-terkecil, contoh: II atau IV-II', def: 'II' },
      'EQK Event Time': { label: 'Waktu Kejadian', def: 'Rabu, 21 Oktober 2026, Pukul 18:58 WIB' },
      'EQK Area': { label: 'Lokasi Episenter', hint: 'Lanjutan kalimat "Episenter …", contoh: berada di darat 9 km utara Tanggamus', def: 'berada di darat 9 km utara Tanggamus' },
      'EQK Potential': { label: 'Potensi Tsunami', def: 'Tidak Berpotensi Tsunami', options: ['Tidak Berpotensi Tsunami', 'Berpotensi Tsunami'] },
      'Penanganan': { def: 'Proses Call Tree dan Himbauan untuk siaga gempa susulan.' },
      'Next Step': { def: 'Monitor gempa susulan dan pengecekan jika terdapat aset yang terdampak.' },
      'Incident ID': { def: 'INC-202610220807-553163' },
    },
  },

  // -------------------------------------------------------------- KEBAKARAN
  {
    id: 'kebakaran', title: 'Kebakaran', icon: '🔥', accent: '#ff6b6b',
    tpl: `*LAPORAN / UPDATE {Update Number} Situasi Kebakaran | {Alert}*
{Current Date (Contoh: Rabu, 1 Juli 2026, Pukul 00:05 WIB)}

*Informasi:*
Terjadi kebakaran {FRE Category} - {FRE Location Name}, {FRE Address}, pada pukul {FRE Event Time} WIB dekat {Nearest Facility Information[1]} ({Nearest Facility Information[2]}).
*Penyebab:* {FRE Cause}

*Aset Terdekat:* {Nearest Facility Information[0]} (± {${DIST}})

👤 *Pegawai:* {Employee Status}
🏢 *Aset:* {Asset Status}
⚙️ *Operasional:* {Operational Status}
🔥 *Status Kebakaran:* {FRE Status}

*Penanganan:* {Penanganan}
*Next Step:* {Next Step}

Demikian kami laporkan, terima kasih.
*Operation Command Center*

> \`{Incident ID}\``,
    vars: {
      'FRE Category': { label: 'Kategori Kebakaran', hint: 'Contoh: Pemukiman, Gedung, Pasar, Kendaraan', def: 'Pemukiman' },
      'FRE Location Name': { label: 'Nama Lokasi', def: 'Permukiman Warga Tanah Tinggi' },
      'FRE Address': { label: 'Alamat', def: 'Jl. Tanah Tinggi II, Johar Baru, Jakarta Pusat' },
      'FRE Event Time': { label: 'Jam Kejadian', hint: 'Jam saja, "WIB" sudah ada di template', def: '10:42' },
      'Nearest Facility Information[1]': { def: 'AREA JAKARTA KRAMAT' },
      'Nearest Facility Information[2]': { def: 'REGION VI / JAKARTA 1' },
      'FRE Cause': { label: 'Penyebab', def: 'Dalam Konfirmasi ⌛' },
      'Nearest Facility Information[0]': { def: 'KCP Johar Baru' },
      'Nearest Facility Distance': { def: '450 m' },
      'FRE Status': { label: 'Status Kebakaran', hint: 'Contoh: Dalam Penanganan, Pendinginan, Padam', def: 'Dalam Penanganan 🔥' },
      'Penanganan': { def: 'Proses Call Tree dan koordinasi dengan pengelola gedung terdekat.' },
      'Next Step': { def: 'Monitor perkembangan kebakaran hingga dinyatakan padam.' },
      'Incident ID': { def: 'INC-202610281042-118204' },
    },
  },

  // ----------------------------------------------------------------- ERUPSI
  {
    id: 'erupsi', title: 'Erupsi', icon: '🌋', accent: '#ff8a4c',
    tpl: `*LAPORAN / UPDATE {Update Number} Situasi Erupsi {ERP Volcano Name} | {Alert}*
{Current Date}

*Informasi:*
Telah terjadi erupsi {ERP Volcano Name} pada pukul {ERP Eruption Time Start} - {ERP Eruption Time End} WIB. Intensitas erupsi dilaporkan {ERP Intensity} dengan awan panas dan abu vulkanik mengarah ke {ERP Ash Direction} dengan rata-rata getaran {ERP Seismic Amplitude} mm sejumlah {ERP Eruption Count} kali selama {ERP Duration: x jam y menit}.

*Aset Terdekat:* {Nearest Facility Information[0]} (± {${DIST}})

👤 *Pegawai:* {Employee Status}
🏢 *Aset:* {Asset Status}
⚙️ *Operasional:* {Operational Status}
⛰️ *Status Gunung:* {ERP Volcano Status}

*Penanganan:* {Penanganan}
*Next Step:* {Next Step}
*Rekomendasi:* {ERP Recommendations}

Demikian kami laporkan, terima kasih.
*Operation Command Center*

> \`{Incident ID}\``,
    vars: {
      'ERP Volcano Name': { label: 'Nama Gunung', def: 'Gunung Semeru' },
      'ERP Eruption Time Start': { label: 'Jam Mulai Erupsi', def: '05:12' },
      'ERP Eruption Time End': { label: 'Jam Selesai Erupsi', def: '07:40' },
      'ERP Intensity': { label: 'Intensitas', hint: 'Contoh: rendah, sedang, tinggi', def: 'sedang' },
      'ERP Ash Direction': { label: 'Arah Abu', def: 'tenggara dan selatan' },
      'ERP Seismic Amplitude': { label: 'Amplitudo Getaran (mm)', def: '22' },
      'ERP Eruption Count': { label: 'Jumlah Erupsi', def: '4' },
      'ERP Duration': { label: 'Durasi', hint: 'Format: x jam y menit', def: '2 jam 28 menit' },
      'Nearest Facility Information[0]': { def: 'KCP Lumajang' },
      'Nearest Facility Distance': { def: '32,10 km' },
      'ERP Volcano Status': { label: 'Status Gunung', def: 'Level III (Siaga)' },
      'Penanganan': { def: 'Proses Call Tree dan himbauan penggunaan masker di area terdampak abu.' },
      'Next Step': { def: 'Monitor aktivitas vulkanik melalui PVMBG / MAGMA Indonesia.' },
      'ERP Recommendations': { label: 'Rekomendasi', def: 'Tidak beraktivitas dalam radius 5 km dari kawah dan 13 km di sektor tenggara; gunakan masker saat hujan abu.' },
      'Incident ID': { def: 'INC-202610280512-204417' },
    },
  },

  // --------------------------------------------------- GANGGUAN KELISTRIKAN
  {
    id: 'gangguan-kelistrikan', title: 'Gangguan Kelistrikan', short: 'Gangguan Listrik', icon: '⚡', accent: '#facc15',
    tpl: `*LAPORAN / UPDATE {Update Number} Situasi Gangguan Kelistrikan | {Alert}*
{Current Date}

*Informasi:*
Terjadi gangguan kelistrikan di {ELC Location Name}. Berdasarkan konfirmasi {ELC Confirm By}, terdapat {ELC Event Details} yang disebabkan oleh {ELC Cause}.

*Aset Terdampak:* {Impacted Facilities Code → Facility Name Bank Area (Bank Region)}

👤 *Pegawai:* {Employee Status}
🏢 *Aset:* {Asset Status}
⚙️ *Operasional:* {Operational Status}
⚡ *Durasi Gangguan:* {ELC Event Time End - ELC Event Time Start}

*Penanganan:* {Penanganan}
*Next Step:* {Next Step}

Demikian kami laporkan, terima kasih.
*BCM Command Center*

> \`{Incident ID}\``,
    vars: {
      'ELC Location Name': { label: 'Lokasi Gangguan', def: 'Gedung Kanwil Surabaya' },
      'ELC Confirm By': { label: 'Dikonfirmasi oleh', def: 'PIC GA Kanwil Surabaya' },
      'ELC Event Details': { label: 'Detail Kejadian', def: 'gangguan pada panel LVMDP sehingga lantai 3–5 padam' },
      'ELC Cause': { label: 'Penyebab', def: 'trip pada trafo distribusi PLN' },
      'Impacted Facilities Code → Facility Name Bank Area (Bank Region)': {
        label: 'Aset Terdampak', hint: 'Format: Kode → Nama Fasilitas AREA (REGION). Boleh lebih dari 1 baris.',
        def: 'KC0123 → KC Surabaya Darmo AREA SURABAYA (REGION VIII / JAWA 3)',
      },
      'ELC Event Time End - ELC Event Time Start': { label: 'Durasi Gangguan', hint: 'Waktu selesai − waktu mulai', def: '1 jam 15 menit (09:05 – 10:20 WIB)' },
      'Penanganan': { def: 'Proses Call Tree dan aktivasi genset.' },
      'Next Step': { def: 'Monitor pemulihan suplai listrik PLN.' },
      'Incident ID': { def: 'INC-202610280905-337120' },
    },
  },

  // ---------------------------------------------------- MATI LISTRIK MASSAL
  {
    id: 'mati-listrik-massal', title: 'Mati Listrik Massal', short: 'Mati Listrik', icon: '🔌', accent: '#8b9cff',
    tpl: `*LAPORAN / UPDATE {Update Number} Situasi Mati Listrik Massal | {Alert}*
{Current Date}

*Informasi:*
Terjadi beberapa titik pemadaman listrik di sekitar {BLK Location Area} pada pukul {BLK Event Time Start} WIB. Penyebab pemadaman yaitu {BLK Cause}.

*Aset Terdampak:* {Impacted Facilities Code → Facility Name Bank Area (Bank Region)}

👤 *Pegawai:* {Employee Status}
🏢 *Aset:* {Asset Status}
⚙️ *Operasional:* {Operational Status}
⌛ *Estimasi Durasi Pemadaman:* sekitar {BLK Estimated Duration: x jam y menit}

*Penanganan:* {Penanganan}
*Next Step:* {Next Step}

Demikian kami laporkan, terima kasih.
*BCM Command Center*

> \`{Incident ID}\``,
    vars: {
      'BLK Location Area': { label: 'Area Pemadaman', def: 'Jakarta Barat, Tangerang, dan Tangerang Selatan' },
      'BLK Event Time Start': { label: 'Jam Mulai Padam', def: '19:40' },
      'BLK Cause': { label: 'Penyebab', def: 'gangguan pada jaringan transmisi SUTET 500 kV' },
      'Impacted Facilities Code → Facility Name Bank Area (Bank Region)': {
        label: 'Aset Terdampak', hint: 'Format: Kode → Nama Fasilitas AREA (REGION). Satu baris per aset.',
        def: 'KC0456 → KC Daan Mogot AREA JAKARTA DAAN MOGOT (REGION VI / JAKARTA 2)\nKC0789 → KC BSD AREA TANGERANG (REGION VI / JAKARTA 3)',
      },
      'BLK Estimated Duration': { label: 'Estimasi Durasi', hint: 'Format: x jam y menit', def: '2 jam 30 menit' },
      'Penanganan': { def: 'Proses Call Tree dan monitoring genset serta BBM di unit terdampak.' },
      'Next Step': { def: 'Monitor pemulihan listrik PLN dan update berkala.' },
      'Incident ID': { def: 'INC-202610281940-702251' },
    },
  },

  // ----------------------------------------------------------------- BANJIR
  {
    id: 'banjir', title: 'Banjir', icon: '🌊', accent: '#38bdf8',
    tpl: `*LAPORAN / UPDATE {Update Number} Situasi Banjir | {Alert}*
{Current Date}

*Informasi:*
Terjadi banjir di {FLD Location Area}, {FLD Address} pada pukul {FLD Event Time} WIB dengan kedalaman {FLD Water Depth} cm ({FLD Water Trend}). Penyebab banjir {FLD Cause}. Saat ini cuaca di sekitar terpantau {FLD Weather}.

*Aset Terdekat:* {Nearest Facility Information[0]} (± {${DIST}})

👤 *Pegawai:* {Employee Status}
🏢 *Aset:* {Asset Status}
⚙️ *Operasional:* {Operational Status}
🌊 *Status Banjir:* {FLD Status}

*Penanganan:* {Penanganan}
*Next Step:* {Next Step}

Demikian kami laporkan, terima kasih.
*BCM Command Center*

> \`{Incident ID}\``,
    vars: {
      'FLD Location Area': { label: 'Area Banjir', def: 'Kel. Kampung Melayu, Jatinegara' },
      'FLD Address': { label: 'Alamat', def: 'Jl. Jatinegara Barat, Jakarta Timur' },
      'FLD Event Time': { label: 'Jam Kejadian', def: '05:30' },
      'FLD Water Depth': { label: 'Kedalaman Air (cm)', def: '40-60' },
      'FLD Water Trend': { label: 'Tren Air', def: 'cenderung naik', options: ['cenderung naik', 'stagnan', 'mulai surut'] },
      'FLD Cause': { label: 'Penyebab', def: 'luapan Kali Ciliwung akibat hujan di hulu' },
      'FLD Weather': { label: 'Cuaca', def: 'hujan ringan' },
      'Nearest Facility Information[0]': { def: 'KCP Jatinegara' },
      'Nearest Facility Distance': { def: '700 m' },
      'FLD Status': { label: 'Status Banjir', def: 'Air masih menggenang, Bendung Katulampa Siaga 3' },
      'Penanganan': { def: 'Proses Call Tree dan persiapan pengamanan dokumen serta aset.' },
      'Next Step': { def: 'Monitor ketinggian air dan pengecekan jika terdapat aset yang terdampak.' },
      'Incident ID': { def: 'INC-202610280530-415590' },
    },
  },

  // ----------------------------------------------------------------- TAIFUN
  {
    id: 'taifun', title: 'Taifun', icon: '🌀', accent: '#2dd4bf',
    tpl: `*LAPORAN / UPDATE {Update Number} Taifun {TYP Typhoon Name} | {Alert} - {${SIFAT}}*
{Current Date}

Yth.
Pak Tim,
Pak Aris,

*Informasi:*
1. Telah terjadi penurunan status dari {TYP Last Status} menjadi {TYP Current Status}, masyarakat dihimbau {TYP Recommendations}.
2. Prakiraan saat ini menunjukkan {TYP Direction}.
3. Berdasarkan kondisi terkini, {TYP Intensity}.
4. Operational Remittance Office (RO) {TYP RO Follow Up}.
5. {TYP Employee Condition}

*Aset Terdekat:* {Nearest Facility Information[0]} (± {${DIST}})

👤 *Pegawai:* {Employee Status}
🏢 *Aset:* {Asset Status}
⚙️ *Operasional:* {Operational Status}

*Penanganan:* {Penanganan}
*Next Step:* {Next Step}

Demikian kami laporkan, terima kasih.
*BCM Command Center*

> \`{Incident ID}\``,
    vars: {
      'TYP Typhoon Name': { label: 'Nama Taifun', def: 'Kong-rey' },
      'TYP Last Status': { label: 'Status Sebelumnya', def: 'Typhoon Signal No. 8' },
      'TYP Current Status': { label: 'Status Saat Ini', def: 'Signal No. 3' },
      'TYP Recommendations': { label: 'Himbauan', def: 'tetap waspada dan menghindari area pantai' },
      'TYP Direction': { label: 'Arah Pergerakan', def: 'taifun bergerak ke barat laut menjauhi Hong Kong dengan kecepatan ±20 km/jam' },
      'TYP Intensity': { label: 'Intensitas', def: 'intensitas taifun melemah menjadi badai tropis dengan angin maksimum 85 km/jam' },
      'TYP RO Follow Up': { label: 'Tindak Lanjut RO', def: 'Hong Kong akan dibuka kembali pukul 14:00 waktu setempat' },
      'TYP Employee Condition': { label: 'Kondisi Pegawai', def: 'Seluruh pegawai RO Hong Kong dalam kondisi aman.' },
      'Nearest Facility Information[0]': { def: 'Remittance Office Hong Kong' },
      'Nearest Facility Distance': { def: '45 km' },
      'Penanganan': { def: 'Proses Call Tree dengan Kepala RO Hong Kong.' },
      'Next Step': { def: 'Monitor update dari Hong Kong Observatory.' },
      'Incident ID': { def: 'INC-202610280600-990134' },
    },
  },

  // ------------------------------------------- UNJUK RASA (gabungan, multi lokasi)
  {
    id: 'unjuk-rasa', type: 'group', title: 'Unjuk Rasa', icon: '📢', accent: '#c084fc',
    note: 'Gabungan dari iView dashboard',
    tpl: `*LAPORAN / UPDATE {Update Number terbesar} - Situasi Unjuk Rasa | {Alert semua incident, dedup " - "} - {${SIFAT}}*
{Current Date}

*Informasi:*
[[ITEMS]]

*Situasi:* _{Situasi}_
Mitigasi & Peningkatan pengamanan:
- _{Mitigasi}_

*Next Step:* {Next Step semua incident, dedup}

Demikian kami laporkan, terima kasih.
*Operation Command Center*

[[IDS]]`,
    itemTpl: `{No}. *Lokasi:* {DMO Location Name} - {DMO Status}, dekat {Nearest Facility Information[1]} ({Nearest Facility Information[2]}), {DMO Event Time}, ±{DMO Crowd Size} orang
- *Unsur:* {DMO Involved Groups}
- *Tuntutan:* _({DMO Type})_ - {DMO Issue Demands}
- *Kondisi:* {DMO Situation}
- *Aset Terdekat:* {Nearest Facility Information[0]} (± {${DIST}})`,
    // field per lokasi yang tidak tampil di blok lokasi, tapi dipakai header/footer
    itemExtra: ['Update Number', 'Alert', 'Next Step', 'Incident ID'],
    computed: {
      'Update Number terbesar': items => {
        const nums = items.map(i => parseFloat(String(i['Update Number'] ?? '').replace(',', '.'))).filter(n => !isNaN(n));
        if (nums.length) return String(Math.max(...nums));
        return [...items].reverse().map(i => (i['Update Number'] || '').trim()).find(Boolean) || '';
      },
      'Alert semua incident, dedup " - "': items => uniq(items.map(i => i['Alert'])).join(' - '),
      'Next Step semua incident, dedup': items => uniq(items.map(i => i['Next Step'])).join(' '),
    },
    computedLabels: {
      'Update Number terbesar': 'Update Number (terbesar · kosong semua → LAPORAN)',
      'Alert semua incident, dedup " - "': 'Alert (gabungan, tanpa duplikat)',
      'Next Step semua incident, dedup': 'Next Step (gabungan, tanpa duplikat)',
    },
    vars: {
      'Situasi': { label: 'Situasi Umum', def: 'Massa terkonsentrasi di 2 titik, situasi umum kondusif' },
      'Mitigasi': { label: 'Mitigasi & Pengamanan', hint: 'Satu baris = satu poin (otomatis jadi "- _poin_")', def: 'Penutupan sementara akses depan KC Thamrin\nPenambahan personel satpam di KCP Senayan', list: true },
    },
    itemVars: {
      'Update Number': { label: 'Update Number', hint: 'Header memakai angka terbesar dari semua lokasi' },
      'Alert': { label: 'Alert', hint: 'Header menggabungkan semua alert tanpa duplikat' },
      'Next Step': { label: 'Next Step', hint: 'Digabung tanpa duplikat di bagian Next Step' },
      'Incident ID': { label: 'Incident ID', hint: 'Ditampilkan berurutan di paling bawah' },
      'DMO Location Name': { label: 'Lokasi' },
      'DMO Status': { label: 'Status', hint: 'Contoh: Berlangsung, Massa bertambah, Selesai' },
      'DMO Event Time': { label: 'Waktu', hint: 'Contoh: 13:00 WIB' },
      'DMO Crowd Size': { label: 'Jumlah Massa', hint: 'Angka saja, "±" & "orang" sudah ada' },
      'DMO Involved Groups': { label: 'Unsur Massa' },
      'DMO Type': { label: 'Jenis Tuntutan' },
      'DMO Issue Demands': { label: 'Isi Tuntutan' },
      'DMO Situation': { label: 'Kondisi' },
    },
    defaultItems: [
      {
        'Update Number': '2', 'Alert': '🟢 Siaga 4', 'Next Step': 'Monitor pergerakan massa hingga aksi selesai.', 'Incident ID': 'INC-202610281300-551204',
        'DMO Location Name': 'Gedung DPR/MPR RI, Jl. Gatot Subroto', 'DMO Status': 'Berlangsung',
        'Nearest Facility Information[1]': 'AREA JAKARTA SENAYAN', 'Nearest Facility Information[2]': 'REGION VI / JAKARTA 1',
        'DMO Event Time': '13:00 WIB', 'DMO Crowd Size': '1.500', 'DMO Involved Groups': 'Aliansi buruh dan mahasiswa',
        'DMO Type': 'Ketenagakerjaan', 'DMO Issue Demands': 'Kenaikan upah minimum 2027', 'DMO Situation': 'Kondusif, dijaga aparat gabungan',
        'Nearest Facility Information[0]': 'KCP Senayan', [DIST]: '900 m',
      },
      {
        'Update Number': '3', 'Alert': '🟢 Siaga 4', 'Next Step': 'Monitor pergerakan massa hingga aksi selesai.', 'Incident ID': 'INC-202610281430-551219',
        'DMO Location Name': 'Patung Kuda, Jl. Medan Merdeka Barat', 'DMO Status': 'Massa bertambah',
        'Nearest Facility Information[1]': 'AREA JAKARTA THAMRIN', 'Nearest Facility Information[2]': 'REGION VI / JAKARTA 1',
        'DMO Event Time': '14:30 WIB', 'DMO Crowd Size': '800', 'DMO Involved Groups': 'Gabungan organisasi masyarakat',
        'DMO Type': 'Kebijakan Publik', 'DMO Issue Demands': 'Penolakan kenaikan tarif transportasi umum', 'DMO Situation': 'Lalu lintas dialihkan, situasi ramai lancar',
        'Nearest Facility Information[0]': 'KC Thamrin', [DIST]: '1,2 km',
      },
    ],
  },

  // ------------------------------------- TANAH LONGSOR (minta masukkan field)
  {
    id: 'tanah-longsor', type: 'request', title: 'Tanah Longsor', icon: '⛰️', accent: '#d9a66b',
    examples: ['waktu kejadian', 'area kejadian', 'penyebab longsor', 'volume material', 'akses jalan', 'korban jiwa', 'status longsor', 'cuaca terkini'],
  },
];

function uniq(arr) {
  const seen = new Set(); const out = [];
  for (const raw of arr) {
    const v = String(raw ?? '').trim();
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase()); out.push(v);
  }
  return out;
}
