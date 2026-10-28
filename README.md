# ◆ Format Lab — Laporan Situasi WhatsApp

Web untuk menguji format laporan WA (Gempa, Kebakaran, Erupsi, Gangguan Kelistrikan, Mati Listrik Massal, Banjir, Taifun, Unjuk Rasa) + slide **Tanah Longsor** untuk mengumpulkan usulan field.

- **Default variabel** → disimpan bersama di **Firebase** (`defaults/`). Semua orang melihat default yang sama.
- **Ubah variabel** → hanya **sementara** di layar orang itu (ditandai ⓘ **!** di ujung kanan kotak). Tekan **💾 Set to Default** untuk menyimpannya jadi default bersama. Kalau halaman di-refresh tanpa Set to Default, perubahan hilang.
- **Masukkan** → tersimpan di **Firebase** (`masukan/`), muncul *realtime* untuk semua orang (ada tombol ⟳ Refresh sebagai cadangan).
- Tanpa backend. Di-hosting gratis di **GitHub Pages**.

---

## 📁 Isi folder

| File | Fungsi |
|---|---|
| `index.html` | Halaman utama |
| `style.css` | Tampilan (dark mode) |
| `app.js` | Logika aplikasi |
| `templates.js` | **Semua format & contoh isian** — edit di sini kalau format berubah |
| `firebase-config.js` | **Config Firebase kamu** (wajib diisi) |
| `database.rules.json` | Aturan keamanan Firebase (ditempel di Firebase Console — tidak wajib di-upload ke GitHub) |
| `README.md` | Panduan ini |

> Tidak perlu token GitHub. Tidak perlu install apa pun. Semua bisa lewat browser.

---

## BAGIAN 1 — Siapkan Firebase (bisa di laptop)

1. Buka **https://console.firebase.google.com** → **Create a project** (contoh nama: `format-lab`). Google Analytics boleh dimatikan.
2. Menu kiri **Build → Realtime Database → Create Database**
   - Lokasi: **Singapore (asia-southeast1)** (paling dekat dengan Indonesia)
   - Mode: **Start in locked mode** → **Enable**
3. Buka tab **Rules** → hapus semua isinya → tempel seluruh isi file **`database.rules.json`** → **Publish**.
   - Aturan ini:
     - **Masukkan**: semua orang boleh membaca & menambah, tapi **tidak bisa mengedit/menghapus** masukkan orang lain (maks 1000 karakter).
     - **Default variabel**: semua orang boleh membaca & menimpa lewat tombol Set to Default, tapi **tidak bisa menghapus**. Isinya wajib teks (maks 2000 karakter per variabel).
   - ⚠️ Kalau sebelumnya sudah pernah menempel rules versi lama, **tempel ulang** versi ini lalu **Publish** — tanpa itu tombol Set to Default akan ditolak.
   - File ini **tidak wajib** di-upload ke GitHub; yang dipakai hanya yang di-Publish di Firebase.
4. Kembali ke ⚙️ **Project settings** (ikon gerigi di kiri atas) → tab **General** → bagian **Your apps** → klik ikon **`</>`** (Web).
   - Nickname bebas, **jangan** centang Firebase Hosting → **Register app**.
5. Akan muncul kode seperti ini — **yang diambil hanya bagian di dalam `{ ... }`**:
   ```js
   const firebaseConfig = {
     apiKey: "AIza....",
     authDomain: "format-lab-xxxx.firebaseapp.com",
     databaseURL: "https://format-lab-xxxx-default-rtdb.asia-southeast1.firebasedatabase.app",
     projectId: "format-lab-xxxx",
     storageBucket: "format-lab-xxxx.firebasestorage.app",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef"
   };
   ```
   ⚠️ Pastikan **`databaseURL`** ada. Kalau tidak muncul, berarti Realtime Database (langkah 2) belum dibuat — buat dulu, lalu buka lagi Project settings.
6. Buka file **`firebase-config.js`**, ganti nilai `ISI_...` dengan nilai dari langkah 5. Baris `export const firebaseConfig =` **jangan dihapus**.

**Cara memindahkan ke HP** (karena GitHub diblokir di laptop):
- Edit `firebase-config.js` di laptop dulu, lalu kirim semua file ke HP (WhatsApp ke diri sendiri / Google Drive / email), **atau**
- Kirim saja teks config ke HP, nanti tempel langsung di GitHub (Bagian 3).

> 🔒 `apiKey` Firebase memang boleh terlihat publik — keamanan datanya dijaga oleh **Rules** di langkah 3, bukan oleh kerahasiaan apiKey.

---

## BAGIAN 2 — Publish ke GitHub Pages dari HP

> Pakai **browser** (Chrome/Safari), bukan aplikasi GitHub — aplikasi GitHub tidak bisa upload file.

1. Simpan semua file ke HP. Kalau dapat file `.zip`, ekstrak dulu:
   - **Android**: buka aplikasi *Files by Google* → ketuk zip → **Extract**.
   - **iPhone**: aplikasi *Files* → ketuk zip → otomatis jadi folder.
2. Buka **https://github.com** → login / daftar.
3. Ketuk **＋** (kanan atas) → **New repository**
   - Repository name: `format-lab` (bebas)
   - Pilih **Public**
   - **Centang "Add a README file"** (supaya repo tidak kosong & tombol upload muncul)
   - **Create repository**
4. Di halaman repo: **Add file → Upload files** → **choose your files** → pilih **semua file** (index.html, style.css, app.js, templates.js, firebase-config.js, database.rules.json, README.md). README lama akan tertimpa, tidak apa-apa.
   - Kalau tombol *Add file* tidak terlihat: menu browser ⋮ → centang **Desktop site**, lalu muat ulang.
5. Gulir ke bawah → **Commit changes**.
6. Buka **Settings** (tab repo, mungkin perlu geser ke kanan) → menu **Pages**
   - Source: **Deploy from a branch**
   - Branch: **main** — folder **/ (root)** → **Save**
7. Tunggu 1–3 menit, refresh halaman Settings → Pages. Akan muncul:
   **`https://USERNAME.github.io/format-lab/`** ← ini link yang dibagikan ke semua orang.

---

## BAGIAN 3 — Edit file langsung dari HP (kapan saja)

1. Buka repo → ketuk file (misal `firebase-config.js` atau `templates.js`).
2. Ketuk ikon **✏️ pensil** (Edit this file).
3. Ubah isinya → **Commit changes…** → **Commit changes**.
4. Tunggu ±1 menit, lalu refresh website (kadang perlu tarik-refresh 2×, GitHub Pages menyimpan cache beberapa menit).

---

## 🔗 URL per slide

Setiap slide punya alamat sendiri, jadi kalau halaman ter-refresh tetap di slide yang sama:

```
.../format-lab/#/desktop/gempa          .../format-lab/#/mobile/gempa
.../format-lab/#/desktop/kebakaran      .../format-lab/#/mobile/kebakaran
.../format-lab/#/desktop/erupsi
.../format-lab/#/desktop/gangguan-kelistrikan
.../format-lab/#/desktop/mati-listrik-massal
.../format-lab/#/desktop/banjir
.../format-lab/#/desktop/taifun
.../format-lab/#/desktop/unjuk-rasa
.../format-lab/#/desktop/tanah-longsor
```
(Pakai `#/` supaya aman di GitHub Pages — tanpa `#` GitHub akan menampilkan 404 saat refresh.)

---

## ✏️ Mengubah format / contoh isian

Semua ada di **`templates.js`**:
- `tpl` = teks format. Variabel ditulis `{Nama Variabel}`. Variabel baru otomatis muncul di panel input.
- `vars` = label, petunjuk (`hint`), dan contoh default (`def`) tiap variabel.
- Format WA yang didukung di pratinjau: `*tebal*`, `_miring_`, `~coret~`, `` `kode` ``, ` ```mono``` `, `> kutipan`.

## 💾 Set to Default — cara kerja

| Tombol | Fungsi |
|---|---|
| ⓘ **!** di kotak variabel | Muncul kalau isinya beda dari default. Ketuk → info *"Perubahan sementara, Set to Default jika ingin menyimpan"* + nilai default saat ini. |
| ↺ (per variabel) | Kembalikan variabel itu ke default bersama |
| **↺ Batalkan** (atas) | Buang semua perubahan sementara di slide itu |
| **Contoh bawaan** (bawah) | Isi semua dengan contoh asli dari `templates.js` (sementara). Berguna kalau default bersama berantakan → muat contoh bawaan → Set to Default. |
| **💾 Set to Default** (bawah) | Simpan isian sekarang jadi default untuk **semua orang** (ada konfirmasi). Nama di kolom masukkan ikut dicatat sebagai "disimpan oleh". |

- Kalau orang lain menekan Set to Default, kotak yang **tidak** sedang kamu ubah ikut ter-update otomatis. Yang sedang kamu ubah tetap milikmu (tanda **!** tetap ada).
- **Tanggal & Waktu Laporan** (`{Current Date}`) otomatis memakai waktu sekarang, dan tidak ikut dibekukan saat Set to Default kecuali memang kamu ubah.
- Untuk Unjuk Rasa, tambah/hapus lokasi juga dihitung sebagai perubahan sementara.
- **Alert** (🔴 Siaga 1 · 🟠 Siaga 2 · 🟡 Siaga 3 · 🟢 Siaga 4 · ⚪ Normal) dan **Status Pegawai/Aset/Operasional** hanya bisa dipilih lewat tombol, tidak bisa diketik bebas. Daftar pilihannya ada di bagian atas `templates.js` (`ALERT_OPTS`, `STATUS_OPTS`).
- **Nomor Update**: `0` atau kosong → judul **LAPORAN**; `1`, `2`, … → **UPDATE 1**, **UPDATE 2**.

### Kenapa default saya tidak berubah setelah update file?
Default yang pernah di-*Set to Default* tersimpan di Firebase dan menimpa contoh di `templates.js`. Setiap kali `templates.js` diubah, **naikkan angka `TEMPLATE_VERSION`** di bagian atas file itu → semua default lama di Firebase otomatis diabaikan dan contoh baru yang dipakai. (Atau hapus node `defaults` di Firebase Console → Realtime Database → Data.)

## 🧹 Menghapus masukkan

Firebase Console → **Realtime Database → Data** → buka `masukan` → `nama-slide` → arahkan ke item → ikon 🗑️.
(Dari website memang sengaja tidak bisa dihapus.)

---

## ❓ Masalah umum

| Tampil di web | Solusi |
|---|---|
| **Firebase belum disetel** | `firebase-config.js` masih berisi `ISI_...` → isi sesuai Bagian 1 langkah 5–6. |
| **File firebase-config.js tidak valid** | Biasanya ikut tertempel baris `import ...` atau baris `export const firebaseConfig =` terhapus. Samakan dengan contoh di file aslinya. |
| **"databaseURL" belum ada** | Buat Realtime Database dulu, lalu salin ulang config. |
| **Gagal mengirim / menyimpan: ditolak oleh Rules** / "Tidak bisa membaca default" | Rules belum di-*Publish* atau masih versi lama — tempel ulang `database.rules.json` (Bagian 1 langkah 3). |
| Status **Offline** terus | Cek koneksi internet / jaringan kantor memblokir `firebasedatabase.app`. |
| Perubahan file belum muncul | Tunggu 1–5 menit (cache GitHub Pages), lalu refresh. |
| Laptop kantor juga memblokir `github.io` | Buka lewat HP, atau minta IT membuka `*.github.io`. |

## 🔐 Opsional: kunci apiKey hanya untuk domain kamu

Google Cloud Console → **APIs & Services → Credentials** → pilih *Browser key* milik project → **Application restrictions: Websites** → tambahkan `https://USERNAME.github.io/*` → Save.
