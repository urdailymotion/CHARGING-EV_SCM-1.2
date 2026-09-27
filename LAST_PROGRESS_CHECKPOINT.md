# 📌 CHECKPOINT PROGRES TERAKHIR (CHARGING EV APP)
**Tanggal Pencatatan:** 27 September 2026, Pukul 06:55 WITA  
**Status Sesi:** Penanganan Integrasi Database PWA Netlify (Input & Hapus Data via Cloud API) (Status: Sukses & Teruji 100%)

---

### 📋 Ringkasan Pekerjaan Hari Ini (27 September 2026):

#### 1. 🔍 Diagnosis Masalah Data Tidak Tersimpan/Terhapus di PWA Netlify:
- **Gejala:** Aplikasi PWA yang diakses via Netlify dapat memuat data awal, namun saat melakukan input transaksi baru atau menghapus transaksi, perubahan tidak masuk / tidak terhapus di database Google Sheets.
- **Penyebab Utama (Root Cause):**
  1. **Ketiadaan `google.script.run` di Luar Iframe GAS:** Objek `google.script.run` hanya ada jika web app diakses langsung dari domain `script.google.com`. Saat di-host di Netlify atau berjalan sebagai standalone PWA, variabel `IS_GAS_ENV` bernilai `false`.
  2. **Bypass Tanpa API Fallback:** Pada fungsi `pushTransaction` dan `deleteTransaction` di `index.html`, saat `!IS_GAS_ENV`, fungsi langsung melakukan `return` tanpa mengirim permintaan HTTP ke backend Google Apps Script.
  3. **Backend `doPost` Belum Mendukung Action CRUD Mandiri:** Pada `Code.gs`, fungsi `doPost(e)` sebelumnya hanya mendukung `get_all` dan aksi migrasi massal, belum menangani permintaan satuan seperti `save_swap`, `delete_swap`, `update_swap`, dll.

#### 2. 🛠️ Solusi & Perbaikan Arsitektur Dual-Sync (GAS + Netlify PWA):
- **Pengembangan Endpoint HTTP REST API pada `Code.gs` (`doPost`):**
  - Ditambahkan handler untuk aksi:
    - `save_swap` / `push_transaction` ➔ Memanggil `apiSaveSwapTransaction(rec)`
    - `update_swap` / `update_transaction` ➔ Memanggil `apiUpdateTransaction(rec)`
    - `delete_swap` / `delete_transaction` ➔ Memanggil `apiDeleteTransaction(id)`
    - `save_problem`, `update_problem`, `delete_problem`
    - `save_schedules`, `add_unit`, `delete_unit`, `validate_login`
- **Dispatcher Universal `_callGasApi` di `index.html`:**
  - `gasSync` kini mendeteksi lingkungan kerja secara otomatis.
  - Jika berjalan di Netlify atau PWA terinstal (`!IS_GAS_ENV`), `gasSync` otomatis mengirim request `POST` via `fetch()` ke Web App URL Google Apps Script menggunakan header `text/plain;charset=utf-8` (bebas CORS).
  - Jika berjalan di dalam Google Apps Script (`IS_GAS_ENV`), sistem tetap menggunakan native `google.script.run`.
- **Optimalisasi Kecepatan Muat:**
  - `loadAll()` langsung mengeksekusi `fetch()` pada Netlify tanpa menunggu jeda retry `google.script.run` (sebelumnya ada delay 4.5 detik).
- **Pembaruan Service Worker:**
  - Versi cache pada [sw.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/sw.js) dinaikkan ke **`charging-ev-v3`** agar browser ponsel langsung mengunduh update aplikasi terbaru.

#### 3. 🧪 Verifikasi Pengujian Langsung (Live Integration Test):
- Dijalankan pengujian live HTTP API request dari luar ekosistem Google:
  - **Uji Simpan Transaksi (`save_swap`):** Status `200 OK`, respon `{ status: 'success', message: 'Transaksi berhasil disimpan ke Google Sheets & Firebase', row: 8235, id: 'TEST_PWA_...' }`.
  - **Uji Hapus Transaksi (`delete_swap`):** Status `200 OK`, respon `{ status: 'success', message: 'Transaksi TEST_PWA_... berhasil dihapus dari Google Sheets & Firebase' }`.

#### 4. 🛠️ Perbaikan Data Tidak Terbaca Pada PWA Netlify (27 September 2026, 07:25 WITA):
- **Gejala:** Saat PWA dibuka di Netlify, data di database Google Sheets (8.200+ transaksi) tidak tampil / tidak terbaca di tabel dan kartu dashboard.
- **Penyebab Utama (Root Cause):**
  - Pada penyesuaian REST API sebelumnya, fungsi `gasSync._processResult` dan `gasSync._showSyncBadge` terpotong dari objek `gasSync` di `index.html`.
  - Akibatnya, saat `gasSync.loadAll()` berhasil menerima 8.233 data dari Google Sheets API via `fetch('.../exec')`, pemanggilan `gasSync._processResult(result)` menghasilkan error JavaScript runtime (`TypeError: gasSync._processResult is not a function`), sehingga data tidak sempat dimasukkan ke `swapsData` dan `syncAndRenderAllViews()` tidak terpanggil.
- **Tindakan Perbaikan:**
  - Mengembalikan dan menyempurnakan implementasi `_processResult` dan `_showSyncBadge` di `index.html`.
  - Memvalidasi seluruh inline script (7 script blocks) dengan parser Node VM tanpa error sintaks.
  - Memverifikasi live API fetch via `scratch/test_get_all.js`: status `200 OK`, `8233` swaps, `2` problems, `56` unit populasi, `7` jadwal, `17` user berhasil dibaca secara utuh.
  - Menaikkan versi cache Service Worker pada `sw.js` ke **`charging-ev-v4`** agar cache lama di browser HP/PWA otomatis dibersihkan dan langsung mengambil perbaikan baru.

#### 5. ⏱️ Penyesuaian Rentang Toleransi On Time Jadwal Menjadi 55 Menit (27 September 2026, 07:45 WITA):
- **Kebutuhan:** Pengguna meminta penyesuaian batas waktu On Time dari jadwal swap yang ditentukan menjadi **55 menit**.
- **Pembaruan Sistem:**
  - Menetapkan konstanta universal `SCHEDULE_ON_TIME_TOLERANCE_MINS = 55` di [index.html](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/index.html).
  - Mengubah evaluasi keterlambatan `isLate` pada Form Input Swap Modal dan Dedicated Swap menjadi `Math.abs(diffMins) > 55`.
  - Mengubah evaluasi kesesuaian pada Schedule Tracker (Table & Mobile Cards) menjadi batas toleransi 55 menit.
  - Memperbarui status antrean `isExpired`: antrean yang belum swap kini baru berubah menjadi `⛔ No Swap On time sch` jika waktu operasional telah melewati jadwal lebih dari 55 menit.
  - Menaikkan versi cache Service Worker pada [sw.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/sw.js) ke **`charging-ev-v5`**.

#### 6. 🚀 Fitur Pemisahan Mode Operasional (Scheduled / Room A1 vs On-Demand / Room A2) di Input & Visual KPI (27 September 2026, 08:25 WITA):
- **Kebutuhan:** Pemisahan alur dan visualisasi data:
  - **ROOM A1:** Beroperasi menggunakan **SCHEDULE** (jadwal terjadwal dengan target waktu & evaluasi toleransi 55 menit).
  - **ROOM A2:** Beroperasi **TANPA JADWAL (On-Demand / Non-Schedule)** untuk melayani unit insidentil, baterai drop, atau antrean limpahan tanpa penalti jadwal.
- **Pembaruan Sistem yang Diterapkan:**
  1. **Formulir Input (Modal & Dedicated Swap):**
     - Otomatis mendeteksi jika lokasi adalah `ROOM A2`: target jadwal dinonaktifkan (`⚡ ROOM A2: NON-SCHEDULED`), field `timeSch` diisi `-`, status otomatis `Non-Schedule`, dan `13.NO PROBLEM`.
     - Validasi `Out Off Time` tidak membebani operator Room A2.
     - Di `ROOM A1`, pencocokan jadwal dan toleransi 55 menit tetap aktif presisi.
  2. **Tampilan Riwayat Input & Tabel Transaksi:**
     - Menampilkan badge khusus `<span class="status-tag ondemand">⚡ Non-Schedule</span>` untuk unit Room A2 baik di tabel maupun tampilan mobile card.
  3. **Visual Analytics & KPI Dashboard:**
     - Ditambahkan **Segmented Operational Mode Switcher (Pill Tabs)** di atas filter dashboard:
       - `[ 🌐 Semua Operasional (Overview) ]`
       - `[ 🎯 Terjadwal / Scheduled (ROOM A1) ]`
       - `[ ⚡ On-Demand / Bebas Jadwal (ROOM A2) ]`
     - Saat mode dipilih, 5 KPI Card dan grafik Donut otomatis menyesuaikan konteksnya:
       - Mode **SCHEDULED**: Menampilkan Total Unit Terjadwal, Frekuensi Terjadwal, Total Energi A1, dan **On-Time Performance (OTP %)** murni dari Room A1.
       - Mode **ON_DEMAND**: Menampilkan Total Unit On-Demand, Frekuensi A2, Total Energi A2, **Rata-rata SoC Masuk (%)**, dan Donut Chart rasio Baterai Normal vs Baterai Kritis ($\le$ 20%).
       - Mode **ALL**: Menampilkan gambaran site keseluruhan dan proporsi 3 irisan (A1 On Schedule, A1 Out Off Time, A2 On-Demand).
  4. **Pembaruan Service Worker:**
     - Cache dinaikkan ke **`charging-ev-v6`** di [sw.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/sw.js).

#### 7. 🔌 Penambahan Dimensi Mesin Swap (SWAP 01, SWAP 02, SWAP 03) Terpisah dari Lokasi (27 September 2026, 08:55 WITA):
- **Kebutuhan Pengguna:** 
  - `ROOM A1` memiliki mesin: `SWAP 01`.
  - `ROOM A2` memiliki mesin: `SWAP 02` dan `SWAP 03`.
  - Operator saat login dapat memilih Lokasi (`ROOM A1` / `ROOM A2`), Mesin Swap (`SWAP 01` / `SWAP 02` / `SWAP 03`), dan Mode Operasional (`Mode Schedule` / `Mode Demand`).
  - Di database, identitas `Lokasi / Room` dan `Mesin Swap` dipisahkan menjadi **dua kolom terpisah** untuk mempermudah pivot table dan analisis utilisasi mesin.
- **Pembaruan Sistem yang Diterapkan:**
  1. **Layar Login (`splitLogin`):**
     - Ditambahkan dropdown **Mesin Swap** (`splitLoginMachine`) berisi `SWAP 01`, `SWAP 02`, dan `SWAP 03`.
     - Ditambahkan **Smart Auto-Default**:
       - Memilih `ROOM A1` ➔ Otomatis memilih `SWAP 01` dan `Mode Schedule`.
       - Memilih `ROOM A2` ➔ Otomatis memilih `SWAP 02` dan `Mode Demand`.
       - Operator tetap bebas mengubah pilihan jika ada kondisi khusus (misal mesin rusak/tukar jalur).
     - Parameter tersimpan ke user session: `location`, `swapStation`, `scheduleMode`.
  2. **Formulir Input (Modal & Dedicated Swap):**
     - Sesi operator menampilkan identitas lengkap: `📍 ROOM .. • 🔌 SWAP ..`.
     - Form mengirimkan data `location` dan `swapStation` secara terpisah ke backend API.
  3. **Struktur Database (Google Sheets & Firebase):**
     - **Kolom E (ke-5):** `Location` ➔ Menyimpan `ROOM A1` atau `ROOM A2`.
     - **Kolom T (ke-20 - BARU):** `SWAP STATION` ➔ Menyimpan `SWAP 01`, `SWAP 02`, atau `SWAP 03`.
     - Penempatan di Kolom T menjamin 8.233 data transaksi lama aman 100% tanpa pergeseran kolom (zero-risk).
     - Auto-fallback cerdas: jika data lama kolom T-nya kosong, otomatis diidentifikasi (`ROOM A1` ➔ `SWAP 01`, `ROOM A2` ➔ `SWAP 02`).
     - Di `Code.gs`: fungsi `apiReadTransactions_`, `apiSaveTransaction`, dan `apiUpdateTransaction` membaca & menulis 20 kolom penuh ke Google Sheets dan Firestore.
  4. **Tampilan Riwayat & Visual KPI:**
     - Di tabel riwayat transaksi, kolom lokasi menampilkan dua badge elegan: `ROOM ..` dan `SWAP ..`.
     - Di Visual KPI, ditambahkan filter dropdown **Mesin Swap** (`SWAP 01`, `SWAP 02`, `SWAP 03`) untuk melihat komparasi beban mesin.
  5. **Pembaruan Service Worker:**
     - Cache dinaikkan ke **`charging-ev-v7`** di [sw.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/sw.js).

#### 8. 📋 Pemisahan Kolom Loc & Swap Station dan Manpower Nama-Saja di Tabel Transaksi (27 September 2026, 09:55 WITA):
- **Kebutuhan Pengguna (Berdasarkan Screenshot):**
  1. Manpower hanya menampilkan **Nama Operator** saja (tidak perlu menampilkan NIK).
  2. Kolom `Loc` dipisahkan menjadi dua kolom mandiri:
     - Kolom **`Loc`** ➔ Khusus menampilkan `ROOM A1` atau `ROOM A2`.
     - Kolom **`Swap Station`** ➔ Kolom baru di samping Loc khusus menampilkan `SWAP 01`, `SWAP 02`, atau `SWAP 03`.
- **Pembaruan Sistem yang Diterapkan:**
  1. **Tabel Data Transaksi (`enterprise-data-table`):**
     - Di `<thead>`: Menambahkan header `Swap Station` (`sortIconTxStation`) dengan fitur pengurutan (sorting) tersendiri.
     - Di `<tbody>`:
       - Sel Manpower kini murni menampilkan nama: `<div style="font-weight: 700; color: #1e293b;">${row.operator || '-'}</div>` tanpa teks NIK.
       - Sel `Loc` murni menampilkan ruangan: `<td style="text-align: center; font-weight: 700;">${row.location || 'ROOM A1'}</td>`.
       - Sel `Swap Station` mandiri: `<td style="text-align: center;"><span class="badge-station">${row.swapStation || 'SWAP 01'}</span></td>`.
     - Colspan baris data kosong disesuaikan menjadi `18`.
  2. **Modal Edit Transaksi (`modalEditSwap`):**
     - Ditambahkan dropdown **Mesin Swap (Station)** di samping dropdown Lokasi sehingga operator/supervisor dapat mengubah data mesin secara spesifik.
  3. **Pembaruan Service Worker:**
     - Cache dinaikkan ke **`charging-ev-v8`** di [sw.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/sw.js).

#### 9. 🎨 Penyeragaman Gaya Teks Tabel Transaksi (Sesuai Kolom Date, Tanpa Warna-Warni) (27 September 2026, 10:05 WITA):
- **Kebutuhan Pengguna (Berdasarkan Screenshot):**
  - Mengubah tampilan teks pada seluruh sel baris tabel transaksi agar seragam seperti pada kolom **Date** (teks standar rapi, tidak warna-warni seperti biru, hijau, merah, atau badge background warna-warni).
- **Pembaruan Sistem yang Diterapkan:**
  1. **Tabel Data Transaksi (`enterprise-data-table`):**
     - Seluruh sel data (`Manpower`, `Transaction ID`, `Category`, `Unit`, `Date`, `Shift`, `Time In`, `Time Out`, `Dur (m)`, `Energy (kWh)`, `HM`, `Bat In`, `Bat Out`, `Loc`, `Swap Station`, `Status`, `Remark`) kini menggunakan format teks bersih standar: `<td style="text-align: center; vertical-align: middle;">...</td>`.
     - Menghilangkan warna biru terang pada Transaction ID, badge pill warna-warni pada Category & Swap Station, warna hijau pada Energy, warna merah pada Bat In, serta pill ungu/hijau pada Status.
     - Tampilan tabel menjadi seragam, bersih, elegan, dan rapi layaknya spreadsheet profesional.
  2. **Pembaruan Service Worker:**
     - Cache dinaikkan ke **`charging-ev-v9`** di [sw.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/sw.js).

#### 10. 📊 Penyeragaman Gaya Teks Bersih (Sesuai Kolom Date) pada Seluruh Menu Operation (27 September 2026, 10:20 WITA):
- **Kebutuhan Pengguna:**
  - Menerapkan format teks bersih dan seragam (seperti kolom `Date`, tanpa warna-warni/pill badges) pada tabel-tabel di menu **Operation**:
    1. **History Daily** (Rekap Harian Swap Unit)
    2. **Problem Log** (Log Gangguan / Downtime)
    3. **Swap Schedule** (Pelacak Jadwal Swap Unit)
- **Pembaruan Sistem yang Diterapkan:**
  1. **History Daily (`renderDailyTable`):**
     - Seluruh sel (No, Unit DT, Frekuensi, Total Energi, Total Durasi, Timeline Swap, dan Tombol Rincian) diubah ke gaya teks standar bersih `#333` terpusat (`text-align: center; vertical-align: middle;`).
     - Timeline swap disajikan dalam teks ringkas rapi: `09:40 (ROOM A1 - SWAP 01); 23:44 (ROOM A2 - SWAP 02)` tanpa pill warna-warni bertumpuk.
  2. **Problem Log (`renderProblemTable`):**
     - Seluruh sel (No, Date, Shift, Unit, Deskripsi Gangguan, Jam Open, Jam Close, Durasi) diseragamkan dengan teks netral gelap standar.
  3. **Swap Schedule (`renderScheduleTable`):**
     - Seluruh sel (No, Tanggal, Shift, Unit, Target Jam Jadwal, Status Kepatuhan, Keterangan) diseragamkan dengan teks netral gelap standar.
  4. **Pembaruan Service Worker:**
     - Cache dinaikkan ke **`charging-ev-v10`** di [sw.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/sw.js).

#### 11. ⏱️ Perbaikan Total Data Jadwal Kosong pada Menu Swap Schedule (27 September 2026, 11:05 WITA):
- **Akar Penyebab Masalah:**
  1. Firestore snapshot listener untuk koleksi `schedules` tidak memiliki pengecekan `!snapshot.empty`. Saat inisialisasi awal, koleksi Firestore yang masih kosong mengirimkan `[]` yang secara tidak sengaja mengosongkan array `schedulesData`.
  2. Fallback generator jadwal default untuk armada belum terpasang otomatis saat data dari Google Sheets kosong atau belum terisi lengkap.
- **Pembaruan Sistem yang Diterapkan:**
  1. **Proteksi Listener Firestore (`index.html`):**
     - Ditambahkan proteksi `if (snapshot && !snapshot.empty)` pada snapshot listener `db.collection('schedules')`.
     - Fungsi `handleFirestoreSchedulesUpdate` diproteksi agar tidak pernah menimpa data jadwal lokal dengan array kosong (`if (!Array.isArray(remoteSchedules) || remoteSchedules.length === 0) return;`).
  2. **Smart Default Schedule Generator (`buildDefaultSchedules`):**
     - Mengotomatiskan pembuatan rencana jadwal swap harian untuk seluruh armada aktif (56 unit DT EV) terbagi merata pada Shift 1 (07:00 - 17:30) dan Shift 2 (19:00 - 05:00) dengan interval teratur.
     - Dipasang otomatis sebagai fallback cerdas pada `initDataSync()`, `_processResult()`, dan `initScheduleModule()` jika data dari Google Sheets masih kosong.
     - Operator/Supervisor tetap bebas mengunggah jadwal kustom melalui fitur **`[ Upload File Jadwal ]`**.
  3. **Pembaruan Service Worker:**
     - Cache dinaikkan ke **`charging-ev-v11`** di [sw.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/sw.js).

#### 12. 🛠️ Perbaikan Tuntas Tampilan Swap Schedule (Perbaikan ReferenceError & Render Engine) (27 September 2026, 12:05 WITA):
- **Gejala:** Menu Operation ➔ Swap Schedule tetap kosong dan menampilkan teks "Memuat rencana jadwal..." meskipun data jadwal di database Google Sheets / Firestore sudah ada.
- **Penyebab Utama (Root Cause):**
  - Pada fungsi `renderScheduleTable()`, variabel `isExpired` dan `hasLaterSwap` dideklarasikan menggunakan `const` di dalam blok `else { ... }`.
  - Pada baris sesudahnya, terdapat baris `else if (isExpired)` di luar blok `else`.
  - Hal ini menyebabkan browser melempar runtime error `ReferenceError: isExpired is not defined` saat me-render baris data pertama.
  - Akibat ReferenceError tersebut, eksekusi terhenti, `tbody.innerHTML` tidak pernah terisi, dan teks penampung bawaan `<div id="scheduleRecordInfo">Memuat rencana jadwal...</div>` tidak pernah diganti.
- **Tindakan Perbaikan:**
  1. Merestrukturisasi logika evaluasi kepatuhan pada `renderScheduleTable()`: scoping variabel diperbaiki dengan bersih tanpa potensi ReferenceError.
  2. Mempertahankan format teks rapi netral gelap (#333) tanpa badge warna-warni sesuai permintaan pengguna.
  3. Membungkus fungsi `renderScheduleTable()` dan `updateScheduleSummaryMetrics()` dalam blok `try...catch` lengkap dengan error fallback visual agar tidak pernah membeku.
  4. Memperbarui `switchAppView('schedule')` agar otomatis memicu pembaruan metrik dan render tabel saat sub-menu Swap Schedule dipilih.
  5. Menaikkan versi Service Worker ke **`charging-ev-v12`** untuk mengosongkan cache lama di peramban pengguna.

#### 13. ⚡ Fitur Edit dan Hapus Jadwal Swap Secara Kolektif (Bulk Edit & Bulk Delete) (27 September 2026, 13:30 WITA):
- **Kebutuhan Pengguna:** Menambahkan fitur untuk mengedit dan menghapus jadwal swap unit secara bersamaan (kolektif/massal), tidak perlu satu per satu.
- **Implementasi Fitur:**
  1. **Seleksi Massal (Checkbox Header & Row):**
     - Kolom checkbox pada tabel jadwal dengan fitur *Select All* (pilih semua jadwal sekaligus).
     - Kotak centang individual pada setiap baris jadwal dengan penanda baris aktif (*green highlight*).
  2. **Active Bulk Action Ribbon:**
     - Bilah aksi kolektif otomatis muncul saat 1 atau lebih jadwal dicentang, menampilkan jumlah jadwal terpilih, pratinjau kode unit, tombol **`[ ✏️ Edit Kolektif ]`**, **`[ 🗑️ Hapus Kolektif ]`**, dan **`[ ✕ Batal Pilih ]`**.
  3. **Modal Edit Kolektif Cerdas (`#modalBulkEditSchedule`):**
     - **Mode 1 (Parameter Serentak):** Memungkinkan pengubahan Tanggal serentak, Shift serentak, serta Target Jam serentak (baik jam seragam sama, maupun jam bertahap/berinterval otomatis seperti setiap 15/20/30 menit).
     - **Mode 2 (Edit Tabel Langsung):** Spreadsheet-style inline editor di mana pengguna dapat mengedit tanggal, shift, kode unit, dan target jam masing-masing unit terpilih secara leluasa dalam satu tampilan tabel.
  4. **Konfirmasi Hapus Kolektif (`#modalBulkDeleteSchedule`):**
     - Dialog konfirmasi aman dengan daftar chip unit terpilih sebelum penghapusan dieksekusi.
  5. **Tombol Satuan Cepat di Baris Tabel:**
     - Kolom `Aksi Cepat` kini dilengkapi tombol `[ ➕ Input ]`, `[ ✏️ Edit ]`, dan `[ 🗑️ Hapus ]` untuk akses cepat individual.
  6. **Sinkronisasi Dua Arah Otomatis:**
     - Setiap perubahan massal langsung disinkronkan ke Google Sheets master (sheet `SCEDHULE`) melalui `gasSync.pushSchedules(schedulesData, 'overwrite')` dan Cloud Firestore.
  7. **Pembaruan Service Worker:**
     - Versi dinaikkan ke **`charging-ev-v13`** pada [sw.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/sw.js).

---

### 🌐 Status Deployment & Versi:
1. **Google Apps Script (GAS Production):**
   - **Deployment ID:** `AKfycbz1S0_VHO2QaVFEKFjRxhtFhlCHqxI9MyNffFSM6iTfQA02lio6VAM_bf41vIRCk8Bh5Q`
   - **Tautan Live GAS:** https://script.google.com/macros/s/AKfycbz1S0_VHO2QaVFEKFjRxhtFhlCHqxI9MyNffFSM6iTfQA02lio6VAM_bf41vIRCk8Bh5Q/exec

2. **GitHub Repository & Netlify:**
   - **Remote URL:** https://github.com/urdailymotion/CHARGING-EV_SCM-1.2.git
   - **Branch:** `main`
   - **Service Worker Cache:** `charging-ev-v13`








