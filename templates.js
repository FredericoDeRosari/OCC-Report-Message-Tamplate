// =====================================================================
//  templates.js — semua format laporan + contoh isian variabel
//  Cara edit: ubah teks di "tpl" (placeholder ditulis {Nama Variabel}),
//  lalu isi contoh default-nya di "vars".
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

// Variabel yang dipakai di banyak format (label, petunjuk, contoh default)
export const COMMON_VARS = {
  'Update Number': { label: 'Nomor Update', hint: 'Urutan laporan / update, contoh: 1', def: '1' },
  'Alert': { label: 'Alert / Level', hint: 'Contoh: Normal, Waspada, Siaga, Awas', def: 'Waspada' },
  'Current Date': { label: 'Tanggal & Waktu Laporan', hint: 'Contoh: Rabu, 1 Juli 2026, Pukul 00:05 WIB', def: nowWIB, now: true },
  'Nearest Facility Information[0]': { label: 'Aset Terdekat — Nama', hint: 'Nama kantor/fasilitas terdekat', def: 'KCP Kemang Raya' },
  'Nearest Facility Information[1]': { label: 'Aset Terdekat — Area', hint: 'Area bank dari fasilitas terdekat', def: 'Area Jakarta Selatan' },
  'Nearest Facility Information[2]': { label: 'Aset Terdekat — Region', hint: 'Region bank dari fasilitas terdekat', def: 'Region Jakarta 1' },
  'Nearest Facility Distance': { label: 'Jarak ke Aset', hint: 'Angka saja — di template sudah tertulis "km/m"', def: '3,2' },
  'Employee Status': { label: 'Status Pegawai', def: 'Seluruh pegawai dalam kondisi aman' },
  'Asset Status': { label: 'Status Aset', def: 'Tidak ada kerusakan pada aset' },
  'Operational Status': { label: 'Status Operasional', def: 'Operasional berjalan normal' },
  'Penanganan': { label: 'Penanganan', def: 'Konfirmasi kondisi pegawai dan aset ke PIC unit terdekat' },
  'Next Step': { label: 'Next Step', def: 'Monitoring perkembangan situasi dan update berkala' },
  'Incident ID': { label: 'Incident ID', def: 'INC-20261028-0001' },
};

export const SLIDES = [
  // ------------------------------------------------------------------ GEMPA
  {
    id: 'gempa', title: 'Gempa Bumi', icon: '🌏', accent: '#f5a524',
    tpl: `*LAPORAN / UPDATE {Update Number} Situasi Gempa Bumi {Susulan} {EQK Magnitude} M | {Alert} | Kedalaman {EQK Depth} Km | MMI {EQK Felt: terbesar-terkecil}*
{EQK Event Time (Contoh: Rabu, 1 Juli 2026, Pukul 00:05 WIB)}

*Informasi:*
Episenter {EQK Area} dekat {Nearest Facility Information[1]} ({Nearest Facility Information[2]})
*Aset Terdekat:* {Nearest Facility Information[0]} (± {Nearest Facility Distance} km/m)

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
      'Susulan': { label: 'Susulan (opsional)', hint: 'Isi "Susulan" kalau gempa susulan. Kosongkan kalau bukan.', def: '', ph: 'Susulan', optional: true },
      'EQK Magnitude': { label: 'Magnitudo', hint: 'Contoh: 5,6', def: '5,6' },
      'EQK Depth': { label: 'Kedalaman (Km)', def: '10' },
      'EQK Felt': { label: 'MMI dirasakan', hint: 'Skala MMI terbesar-terkecil, contoh: IV-II', def: 'IV-II' },
      'EQK Event Time': { label: 'Waktu Kejadian', def: 'Rabu, 28 Oktober 2026, Pukul 11:42 WIB' },
      'EQK Area': { label: 'Lokasi Episenter', def: '23 km Barat Daya Kab. Sukabumi, Jawa Barat' },
      'Nearest Facility Information[1]': { def: 'Area Sukabumi' },
      'Nearest Facility Information[2]': { def: 'Region Bandung' },
      'Nearest Facility Information[0]': { def: 'KCP Pelabuhan Ratu' },
      'Nearest Facility Distance': { def: '18' },
      'EQK Potential': { label: 'Potensi Tsunami', def: 'Tidak berpotensi tsunami (BMKG)' },
      'Employee Status': { def: 'Seluruh pegawai KCP Pelabuhan Ratu dalam kondisi aman' },
      'Asset Status': { def: 'Tidak ada kerusakan, hanya retak rambut di dinding pantry' },
      'Penanganan': { def: 'Konfirmasi kondisi pegawai dan gedung ke Pinca KCP Pelabuhan Ratu' },
      'Next Step': { def: 'Monitoring gempa susulan dan update berkala setiap 1 jam' },
      'Incident ID': { def: 'INC-EQK-20261028-001' },
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

*Aset Terdekat:* {Nearest Facility Information[0]} (± {Nearest Facility Distance} km/m)

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
      'Alert': { def: 'Siaga' },
      'FRE Category': { label: 'Kategori Kebakaran', hint: 'Contoh: Pemukiman, Gedung, Pasar, Kendaraan', def: 'Pemukiman' },
      'FRE Location Name': { label: 'Nama Lokasi', def: 'Permukiman Warga Tanah Tinggi' },
      'FRE Address': { label: 'Alamat', def: 'Jl. Tanah Tinggi II, Johar Baru, Jakarta Pusat' },
      'FRE Event Time': { label: 'Jam Kejadian', hint: 'Jam saja, "WIB" sudah ada di template', def: '10:42' },
      'Nearest Facility Information[1]': { def: 'Area Jakarta Pusat' },
      'Nearest Facility Information[2]': { def: 'Region Jakarta 1' },
      'FRE Cause': { label: 'Penyebab', def: 'Diduga korsleting listrik (masih diselidiki)' },
      'Nearest Facility Information[0]': { def: 'KCP Johar Baru' },
      'Nearest Facility Distance': { def: '0,4' },
      'Asset Status': { def: 'Aset tidak terdampak, asap terlihat dari lokasi' },
      'Operational Status': { def: 'Operasional normal, akses jalan depan kantor dialihkan' },
      'FRE Status': { label: 'Status Kebakaran', def: 'Dalam penanganan, 14 unit damkar di lokasi' },
      'Penanganan': { def: 'Koordinasi dengan pengelola gedung dan memastikan jalur evakuasi siap' },
      'Next Step': { def: 'Monitoring hingga api dinyatakan padam oleh Damkar' },
      'Incident ID': { def: 'INC-FRE-20261028-004' },
    },
  },

  // ----------------------------------------------------------------- ERUPSI
  {
    id: 'erupsi', title: 'Erupsi', icon: '🌋', accent: '#ff8a4c',
    tpl: `*LAPORAN / UPDATE {Update Number} Situasi Erupsi {ERP Volcano Name} | {Alert}*
{Current Date}

*Informasi:*
Telah terjadi erupsi {ERP Volcano Name} pada pukul {ERP Eruption Time Start} - {ERP Eruption Time End} WIB. Intensitas erupsi dilaporkan {ERP Intensity} dengan awan panas dan abu vulkanik mengarah ke {ERP Ash Direction} dengan rata-rata getaran {ERP Seismic Amplitude} mm sejumlah {ERP Eruption Count} kali selama {ERP Duration: x jam y menit}.

*Aset Terdekat:* {Nearest Facility Information[0]} (± {Nearest Facility Distance} km/m)

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
      'Alert': { def: 'Siaga' },
      'ERP Volcano Name': { label: 'Nama Gunung', def: 'Gunung Semeru' },
      'ERP Eruption Time Start': { label: 'Jam Mulai Erupsi', def: '05:12' },
      'ERP Eruption Time End': { label: 'Jam Selesai Erupsi', def: '07:40' },
      'ERP Intensity': { label: 'Intensitas', hint: 'Contoh: rendah, sedang, tinggi', def: 'sedang' },
      'ERP Ash Direction': { label: 'Arah Abu', def: 'tenggara dan selatan' },
      'ERP Seismic Amplitude': { label: 'Amplitudo Getaran (mm)', def: '22' },
      'ERP Eruption Count': { label: 'Jumlah Erupsi', def: '4' },
      'ERP Duration': { label: 'Durasi', hint: 'Format: x jam y menit', def: '2 jam 28 menit' },
      'Nearest Facility Information[0]': { def: 'KCP Lumajang' },
      'Nearest Facility Distance': { def: '32' },
      'Asset Status': { def: 'Abu tipis di area parkir, tidak ada kerusakan' },
      'ERP Volcano Status': { label: 'Status Gunung', def: 'Level III (Siaga)' },
      'Penanganan': { def: 'Membagikan masker ke pegawai dan membersihkan abu di area kantor' },
      'Next Step': { def: 'Monitoring aktivitas vulkanik melalui PVMBG / MAGMA' },
      'ERP Recommendations': { label: 'Rekomendasi', def: 'Tidak beraktivitas dalam radius 5 km dari kawah dan 13 km di sektor tenggara; gunakan masker saat hujan abu' },
      'Incident ID': { def: 'INC-ERP-20261028-002' },
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
        label: 'Aset Terdampak', hint: 'Format: Kode → Nama Fasilitas Area Bank (Region Bank). Boleh lebih dari 1 baris.',
        def: 'KC0123 → KC Surabaya Darmo Area Surabaya (Region Jawa Timur)',
      },
      'Employee Status': { def: 'Seluruh pegawai aman, sebagian pindah ke lantai 1–2' },
      'Asset Status': { def: 'Genset beroperasi, UPS ruang server normal' },
      'Operational Status': { def: 'Layanan nasabah tetap berjalan dengan genset' },
      'ELC Event Time End - ELC Event Time Start': { label: 'Durasi Gangguan', hint: 'Waktu selesai − waktu mulai', def: '1 jam 15 menit (09:05 – 10:20 WIB)' },
      'Penanganan': { def: 'Mengaktifkan genset dan koordinasi dengan PLN UP3 Surabaya' },
      'Next Step': { def: 'Memastikan suplai PLN stabil sebelum kembali dari genset' },
      'Incident ID': { def: 'INC-ELC-20261028-007' },
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
      'Alert': { def: 'Siaga' },
      'BLK Location Area': { label: 'Area Pemadaman', def: 'Jakarta Barat, Tangerang, dan Tangerang Selatan' },
      'BLK Event Time Start': { label: 'Jam Mulai Padam', def: '19:40' },
      'BLK Cause': { label: 'Penyebab', def: 'gangguan pada jaringan transmisi SUTET 500 kV' },
      'Impacted Facilities Code → Facility Name Bank Area (Bank Region)': {
        label: 'Aset Terdampak', hint: 'Format: Kode → Nama Fasilitas Area Bank (Region Bank). Satu baris per aset.',
        def: 'KC0456 → KC Daan Mogot Area Jakarta Barat (Region Jakarta 2)\nKC0789 → KC BSD Area Tangerang (Region Jakarta 3)',
      },
      'Asset Status': { def: 'Genset di 2 KC beroperasi normal' },
      'Operational Status': { def: 'ATM di 6 lokasi offline, layanan cabang memakai genset' },
      'BLK Estimated Duration': { label: 'Estimasi Durasi', hint: 'Format: x jam y menit', def: '2 jam 30 menit' },
      'Penanganan': { def: 'Monitoring genset dan stok BBM di cabang terdampak' },
      'Next Step': { def: 'Update berkala hingga listrik PLN pulih' },
      'Incident ID': { def: 'INC-BLK-20261028-003' },
    },
  },

  // ----------------------------------------------------------------- BANJIR
  {
    id: 'banjir', title: 'Banjir', icon: '🌊', accent: '#38bdf8',
    tpl: `*LAPORAN / UPDATE {Update Number} Situasi Banjir | {Alert}*
{Current Date}

*Informasi:*
Terjadi banjir di {FLD Location Area}, {FLD Address} pada pukul {FLD Event Time} WIB dengan kedalaman {FLD Water Depth} cm ({FLD Water Trend}). Penyebab banjir {FLD Cause}. Saat ini cuaca di sekitar terpantau {FLD Weather}.

*Aset Terdekat:* {Nearest Facility Information[0]} (± {Nearest Facility Distance} km/m)

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
      'FLD Water Trend': { label: 'Tren Air', hint: 'Contoh: cenderung naik, stagnan, mulai surut', def: 'cenderung naik' },
      'FLD Cause': { label: 'Penyebab', def: 'luapan Kali Ciliwung akibat hujan di hulu' },
      'FLD Weather': { label: 'Cuaca', def: 'hujan ringan' },
      'Nearest Facility Information[0]': { def: 'KCP Jatinegara' },
      'Nearest Facility Distance': { def: '0,7' },
      'Asset Status': { def: 'Air belum masuk ke dalam gedung' },
      'Operational Status': { def: 'Operasional normal, sebagian pegawai terlambat' },
      'FLD Status': { label: 'Status Banjir', def: 'Air masih menggenang, Bendung Katulampa Siaga 3' },
      'Penanganan': { def: 'Menyiapkan karung pasir dan memindahkan dokumen ke lantai 2' },
      'Next Step': { def: 'Monitoring ketinggian air setiap 2 jam' },
      'Incident ID': { def: 'INC-FLD-20261028-009' },
    },
  },

  // ----------------------------------------------------------------- TAIFUN
  {
    id: 'taifun', title: 'Taifun', icon: '🌀', accent: '#2dd4bf',
    tpl: `*LAPORAN / UPDATE {Update Number} Taifun {TYP Typhoon Name} | {Alert} - Sebagai Informasi / Eskalasi*
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

*Aset Terdekat:* {Nearest Facility Information[0]} (± {Nearest Facility Distance} km/m)

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
      'Nearest Facility Distance': { def: '45' },
      'Asset Status': { def: 'Tidak ada kerusakan pada kantor RO' },
      'Operational Status': { def: 'RO tutup sementara, buka kembali pukul 14:00' },
      'Penanganan': { def: 'Komunikasi intensif dengan Kepala RO Hong Kong' },
      'Next Step': { def: 'Monitoring update Hong Kong Observatory' },
      'Incident ID': { def: 'INC-TYP-20261028-001' },
    },
  },

  // ------------------------------------------- UNJUK RASA (gabungan, multi lokasi)
  {
    id: 'unjuk-rasa', type: 'group', title: 'Unjuk Rasa', icon: '📢', accent: '#c084fc',
    note: 'Gabungan dari iView dashboard',
    tpl: `*LAPORAN / UPDATE {Update Number terbesar} Situasi Unjuk Rasa | {Alert semua incident, dedup " - "}*
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
- *Aset Terdekat:* {Nearest Facility Information[0]} (± {Nearest Facility Distance} km/m)`,
    // field per lokasi yang tidak tampil di blok lokasi, tapi dipakai header/footer
    itemExtra: ['Update Number', 'Alert', 'Next Step', 'Incident ID'],
    computed: {
      'Update Number terbesar': items => {
        const nums = items.map(i => parseFloat(String(i['Update Number'] ?? '').replace(',', '.'))).filter(n => !isNaN(n));
        if (nums.length) return String(Math.max(...nums));
        return [...items].reverse().map(i => (i['Update Number'] || '').trim()).find(Boolean) || '';
      },
      'Alert semua incident, dedup " - "': items => uniq(items.map(i => i['Alert'])).join(' - '),
      'Next Step semua incident, dedup': items => uniq(items.map(i => i['Next Step'])).join('; '),
    },
    computedLabels: {
      'Update Number terbesar': 'Update Number (terbesar)',
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
        'Update Number': '2', 'Alert': 'Waspada', 'Next Step': 'Monitoring pergerakan massa hingga aksi selesai', 'Incident ID': 'INC-DMO-20261028-011',
        'DMO Location Name': 'Gedung DPR/MPR RI, Jl. Gatot Subroto', 'DMO Status': 'Berlangsung',
        'Nearest Facility Information[1]': 'Area Jakarta Senayan', 'Nearest Facility Information[2]': 'Region Jakarta 1',
        'DMO Event Time': '13:00 WIB', 'DMO Crowd Size': '1.500', 'DMO Involved Groups': 'Aliansi buruh dan mahasiswa',
        'DMO Type': 'Ketenagakerjaan', 'DMO Issue Demands': 'Kenaikan upah minimum 2027', 'DMO Situation': 'Kondusif, dijaga aparat gabungan',
        'Nearest Facility Information[0]': 'KCP Senayan', 'Nearest Facility Distance': '0,9',
      },
      {
        'Update Number': '3', 'Alert': 'Siaga', 'Next Step': 'Monitoring pergerakan massa hingga aksi selesai', 'Incident ID': 'INC-DMO-20261028-012',
        'DMO Location Name': 'Patung Kuda, Jl. Medan Merdeka Barat', 'DMO Status': 'Massa bertambah',
        'Nearest Facility Information[1]': 'Area Jakarta Pusat', 'Nearest Facility Information[2]': 'Region Jakarta 1',
        'DMO Event Time': '14:30 WIB', 'DMO Crowd Size': '800', 'DMO Involved Groups': 'Gabungan organisasi masyarakat',
        'DMO Type': 'Kebijakan Publik', 'DMO Issue Demands': 'Penolakan kenaikan tarif transportasi umum', 'DMO Situation': 'Lalu lintas dialihkan, situasi ramai lancar',
        'Nearest Facility Information[0]': 'KC Thamrin', 'Nearest Facility Distance': '1,2',
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
