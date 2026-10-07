# 📌 CHECKPOINT PROGRES TERAKHIR (CHARGING EV APP)
**Tanggal Pencatatan:** 07 Oktober 2026, Pukul 08:30 WITA  
**Status Sesi:** Perbaikan Tuntas Grafik EV Intelligence (Charging Station, Ketahanan Battery, Swab Cycle Time) yang Sempat Tidak Muncul Akibat Script Parsing Token Conflict & Penambahan Dependency Preload Chart.js (Status: Sukses & Terverifikasi 100% via CDP Headless, Zero Operational Disruption, Build v59, PWA Live di GitHub `main`)

---

### 📋 Ringkasan Pekerjaan Sesi Ini (07 Oktober 2026 - Pukul 08:30 WITA - Build v59):

#### 1. 🔍 Investigasi Akar Masalah (*Root Cause Analysis*):
- **Akar Masalah Utama (HTML Script Parsing Conflict):**
  - Pada saat sinkronisasi `window.INTELLIGENCE_HTML_SOURCE` di [index.html](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/index.html), string HTML diekspor menggunakan `JSON.stringify` tanpa *escaping* karakter tag `</script>`.
  - Akibatnya, saat browser mem-parsing inline `<script>` di `index.html`, parser HTML menganggap tag `</script>` di dalam string sebagai penutup tag `<script>` utama lebih awal.
  - Hal ini memicu `SyntaxError: Invalid or unexpected token` sehingga variabel `window.INTELLIGENCE_HTML_SOURCE` gagal terdefinisi.
  - Dampaknya, ketika pengguna mengklik sub-menu **Charging Station**, **Ketahanan Battery**, atau **Swab Cycle Time**, fungsi `window.initIntelligenceIframe()` langsung *abort/return* karena sumber HTML tidak tersedia, sehingga iframe tetap kosong dan grafik tidak muncul sama sekali.
- **Dependency Loading & Auth Inspection:**
  - Menambahkan tag CDN `<script src="...chart.umd.min.js">` dan `<script src="...chartjs-plugin-datalabels.min.js">` secara langsung pada `<head>` [intelligence.html](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/intelligence.html) guna memastikan pustaka Chart.js selalu siap sebelum inisialisasi dijalankan.
  - Menyempurnakan pengecekan autentikasi di `switchAppView` pada [index.html](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/index.html) agar mengenali `window.currentAuthUser` secara konsisten di semua lingkungan.

#### 2. 🛠️ Solusi & Perbaikan yang Diterapkan:
1. **Pencegahan Terminasi Tag Script:**
   - Memperbaiki skrip sinkronisasi [scratch/sync_intel_to_index.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/scratch/sync_intel_to_index.js) dengan menambahkan *safe escaping*: `.replace(/<\/script/gi, '<\\/script')`.
   - Menjamin bahwa `window.INTELLIGENCE_HTML_SOURCE` ter-parse 100% valid tanpa token conflict di [index.html](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/index.html).
2. **Chart.js CDN Injection di `<head>`:**
   - Menambahkan deklarasi pustaka Chart.js v4.4.7 dan plugin DataLabels di `<head>` [intelligence.html](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/intelligence.html) untuk *synchronous loading* yang andal baik saat diakses mandiri maupun di dalam iframe Blob.
3. **Penyempurnaan Autentikasi Pengguna:**
   - Menambahkan `window.currentAuthUser` ke dalam rantai pengecekan hak akses di `switchAppView('intel-*')` dan `switchAppView('database')`.

#### 3. 🧪 Verifikasi Headless Otomatis (Non-Live Preview):
- Dilakukan verifikasi headless CDP melalui skrip [scratch/verify_all_intel_charts.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/scratch/verify_all_intel_charts.js) (tanpa live preview sesuai batasan):
  - **Charging Station (7 Grafik):** `energyTrendChart`, `socTrendChart`, `romTrendChart`, `romDonutChart`, `durationChart`, `hourlyChart`, `portChart` (Status: **ALL RENDERED, PASS**).
  - **Ketahanan Battery (6 Grafik):** `batteryEnduranceTrendChart`, `batteryStatusChart`, `batteryUnitChart`, `batteryRomChart`, `batterySocRateChart`, `batteryDistributionChart` (Status: **ALL RENDERED, PASS**).
  - **Swab Cycle Time (6 Grafik):** `cycleTrendChart`, `cycleStatusChart`, `cycleUnitChart`, `cycleCompartmentChart`, `cycleHourlyChart`, `cycleDistributionChart` (Status: **ALL RENDERED, PASS**).
  - **Console Errors:** 0 (Bersih tanpa exception).
- Bump versi aplikasi ke `APP_BUILD_ID = '2026.10.07.v59'` dan Service Worker cache `charging-ev-v59` di [sw.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/sw.js).

---

### 📋 Ringkasan Pekerjaan Hari Ini (07 Oktober 2026 - Pukul 06:50 WITA - Build v58):

#### 1. 🎨 Perombakan Menyeluruh Tata Letak Filter EV Intelligence:
- **Konsep Compact Two-Tier Horizontal Toolbar:**
  - Mengubah layout lama dari grid kolom vertikal 4 kolom yang memakan ~250px ruang layar vertikal menjadi toolbar horizontal 2 tingkat yang ramping (~70px), menghemat hingga 70% ruang vertikal.
  - Kartu KPI, matriks performa, dan grafik analitik kini langsung terlihat di layar pertama (*above the fold*) tanpa perlu *scroll*.
- **Tingkat 1 (Top Bar - Segmented Switcher & Quick Date Presets):**
  - **Kiri:** Segmented pill button untuk penyaringan cepat kategori:
    - *Charging Station:* `[Semua Operasional]` | `[SCHEDULE]` | `[NON SCHEDULE]`
    - *Ketahanan Battery:* `[Semua Cycle]` | `[VALID (3–5 Jam)]` | `[TAKEOUT]`
    - *Swab Cycle Time:* `[Semua SLA]` | `[ON TARGET (≤ 6m)]` | `[OVER SLA (> 6m)]`
  - **Kanan:** Preset periode instan: `Periode:` `[Semua Data]` | `[Hari Ini]` | `[7 Hari Terakhir]` | `[Bulan Ini]` | `[Reset Filter]` yang langsung mengisi input tanggal dan memuat dashboard secara otomatis tanpa repot membuka popup kalender.
- **Tingkat 2 (Horizontal White Filter Bar - Inline Controls):**
  - Container berlatar putih halus (`#ffffff` / dark `#192433`), border halus (`#E4E7EC` / dark `#324154`), radius `8px`, dan shadow lembut.
  - Setiap filter mengadopsi label inline huruf kapital tebal di sebelah kiri kontrol (`DARI:`, `SAMPAI:`, `ROM:`, `ID UNIT:`, dll.) dengan teks slate (`#667085`), font 10.5px.
  - Input tanggal & dropdown berukuran proporsional (tinggi 32px, font 12px, border halus).
  - Tombol aksi `[Terapkan]`, `[Reset]`, dan `[📂 Upload Data]` terintegrasi rapi di sisi kanan baris.

#### 2. ⚡ Sinkronisasi Interaktif & Reset:
- Menambahkan fungsi `setIntelDatePreset(view, preset)` untuk auto-fill tanggal hari ini, 7 hari terakhir, atau bulan berjalan.
- Menambahkan listener `initIntelOpmodeButtons()` untuk interaktivitas tombol segmented.
- Memperbarui fungsi `resetFilters()`, `resetBatteryFilters()`, dan `resetCycleFilters()` agar mengembalikan chip preset ke `Semua Data` dan tombol segmented ke mode awal.

#### 3. 🔄 Sinkronisasi Ganda & Deployment:
- Sinkronisasi instan antara [intelligence.html](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/intelligence.html) dan string sumber tertanam `window.INTELLIGENCE_HTML_SOURCE` di [index.html](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/index.html) (100% identik).
- Bump versi aplikasi: `APP_BUILD_ID = '2026.10.07.v58'` dan Service Worker cache `charging-ev-v58` di [sw.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/sw.js).
- Teruji di Chrome headless untuk mode terang (*light*) dan mode gelap (*dark*).

---

### 📋 Ringkasan Pekerjaan Hari Ini (06 Oktober 2026 - Pukul 04:45 WITA - Build v55):

#### 1. 📥 Perbaikan & Peningkatan Format Template Excel Jadwal Swap (`downloadScheduleTemplateExcel`):
- **Struktur Kolom Baku:** Menyeragamkan header template menjadi `Tanggal`, `Shift`, `Kode Unit`, `Time Sch` yang selaras 100% dengan database Google Sheets `SCEDHULE`.
- **Penguncian Tipe Teks (`t: 's'`, `z: '@'`):** Seluruh sel template diatur bertipe string teks agar Microsoft Excel / Office tidak mengubah format jam (`07:00:00`) menjadi angka desimal (`0.2916...`) atau format tanggal menjadi serial number (`46301`).
- **Data Contoh Dinamis & Relevan:** Menggunakan tanggal operasional hari ini (`DD/MM/YYYY`) secara otomatis dengan contoh armada riil (`1601`, `1618`, `1615`, `1622`, `1605`, `1616`, `1617`, `1620`) pada Shift 1 (07:00, 10:00, 14:00) dan Shift 2 (19:00, 22:00, 02:00, 05:00).
- **Sheet Panduan Pengisian Tambahan:** Menambahkan worksheet kedua berlabel `"Panduan"` di dalam file `.xlsx` berisi petunjuk aturan pengisian database.
- **Pembaruan Fallback CSV:** Menggunakan tanggal hari ini dan format kolom yang identik.

#### 2. 🧠 Smart Auto-Normalizer di Parser Upload Frontend (`parseScheduleFile`):
- **Normalisasi Tanggal (`normalizeScheduleExcelDate`):** Otomatis mendeteksi angka serial Excel (`46301`), objek JavaScript `Date`, format ISO (`YYYY-MM-DD`), dan format pemisah minus (`DD-MM-YYYY`), lalu mengonversinya ke format baku database `DD/MM/YYYY`.
- **Normalisasi Jam (`normalizeScheduleExcelTime`):** Otomatis mendeteksi angka desimal pecahan hari Excel (`0.29166667` &rarr; `07:00:00`, `0.79166667` &rarr; `19:00:00`), normalisasi pemisah titik (`19.00.00` / `19.00` &rarr; `19:00:00`), dan pemformatan `H:M` (`7:15` &rarr; `07:15:00`).
- **Normalisasi Shift (`normalizeScheduleExcelShift`):** Mendukung kata `"Siang"`, `"Pagi"`, `"Shift 1"` &rarr; `'1'`, serta `"Malam"`, `"Night"`, `"Shift 2"` &rarr; `'2'`.
- **Normalisasi Kode Unit (`normalizeScheduleExcelUnit`):** Membersihkan prefix `DT-`, spasi, dan desimal float Excel (`1601.0` &rarr; `1601`).
- **Preview & Verifikasi:** Modal menampilkan preview baris yang telah dinormalisasi rapi sebelum diterapkan ke database.

#### 3. 🛡️ Double-Layer Defense di Backend (`Code.gs`):
- Menambahkan sanitasi otomatis pada `apiSaveUploadedSchedules` di sisi server sebelum menulis baris ke sheet `SCEDHULE` dan Firestore agar database selalu terlindungi dari data anomali.

#### 4. 🚀 Rilis Versi & Deployment:
- **Build ID:** `2026.10.06.v55` di [index.html](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/index.html).
- **Service Worker Cache:** `charging-ev-v55` di [sw.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/sw.js).
- **Keamanan Operasional:** Zero disruption & zero backend downtime.

---

### 📋 Ringkasan Pekerjaan Hari Ini (06 Oktober 2026 - Pukul 00:10 WITA - Build v54):

#### 1. 🔋 Poin 1: Efisiensi Konsumsi Baterai per Armada EV (Menggantikan Redundansi Workload Ruang Stasiun):
- **Dasar Kebutuhan:** Grafik Workload Beban Stasiun (A1 vs A2 vs A3) sebelumnya bersifat redundan karena proporsi beban stasiun sudah tersaji lengkap pada KPI Header Cards di bagian atas (`ppaWkBar01`, `ppaWkBar02`, `ppaWkBar03`).
- **Implementasi:**
  - Kartu dan kanvas `ppaChartRoomCompare` ditingkatkan menjadi **Efisiensi Konsumsi Armada EV**.
  - Menghitung rasio konsumsi riil per swap untuk setiap unit armada EV (`Total Energi kWh ÷ Jumlah Swap`).
  - Menambahkan garis patokan horizontal putus-putus merah (**Benchmark 290 kWh/Swap**).
  - Pewarnaan bar adaptif: Hijau Zamrud (`#10B981`) jika konsumsi optimal di bawah benchmark, dan Amber (`#F59E0B`) jika melebihi benchmark.
  - Tooltip interaktif menyajikan: Rata-rata kWh/Swap, Status efisiensi, dan Rata-rata persentase SOC baterai saat masuk (`SOC In %`).

#### 2. 🎯 Poin 2: Matriks Ketepatan 4 Kuadran (Schedule Compliance Detail):
- **Dasar Kebutuhan:** Grafik Ketepatan Jadwal sebelumnya hanya berupa donut 2 irisan (On Schedule vs Out Off Time) tanpa rincian penyebab keterlambatan atau kedatangan awal.
- **Implementasi:**
  - Meningkatkan `renderChartKetepatan()` menjadi **Matriks Ketepatan 4 Kuadran** yang memetakan seluruh transaksi ke 4 kondisi operasional:
    1. **`ON SCHEDULE`** (Hijau `#10B981`): Datang di rentang $[0, +55]$ menit.
    2. **`DATANG AWAL`** (Cyan `#06B6D4`): Datang di rentang $[-55, -1]$ menit sebelum jadwal.
    3. **`TERLAMBAT`** (Merah `#EF4444`): Datang $> +55$ menit setelah jadwal.
    4. **`TERSKIP`** (Amber `#F59E0B`): Jadwal terlewat tanpa swap.
  - Tampilan donut elegan dengan cutout 70%, metrik persentase pencapaian SLA di tengah, dan rincian proporsi tiap kuadran.

#### 3. 📊 Poin 3: Trend Penyaluran Energi & Frekuensi Sesi (Dual-Axis Combo Chart):
- **Dasar Kebutuhan:** Menyatukan grafik Frekuensi Harian (Chart 2) dan Penyaluran Energi Harian (Chart 7) yang sebelumnya terpisah dengan tren garis yang serupa.
- **Implementasi:**
  - Merancang grafik Combo Dual-Axis interaktif pada `ppaChartFreqDaily`:
    - **Sumbu Y Kiri:** Penyaluran Energi (MWh) dalam bentuk rounded gradient bar biru (`#2563EB`).
    - **Sumbu Y Kanan:** Frekuensi Sesi Swaps dalam bentuk kurva spline amber oranye (`#F59E0B`) dengan titik simpul berpendar.
  - Menambahkan **Segmented Controls Switcher** di sudut kanan atas: `[Daily]` `[Weekly]` `[Monthly]` sehingga visualisasi fleksibel berganti rentang waktu secara instan tanpa reload.
  - Menambahkan **Summary Metric Strip** di bagian bawah kartu:
    `Total: X Sesi • Y MWh • Efisiensi: Z kWh/Swap`.
  - Tooltip modern yang menyatukan data sesi, energi, dan rasio kWh per swap tanpa menimbulkan tumpukan (*overlapping*) badge.

#### 4. 📄 Penyelarasan Ekspor Laporan PDF:
- Judul dan tag kartu pada template ekspor PDF diselaraskan:
  - Chart 1: `1. Matriks Ketepatan 4 Kuadran` (Tag: `SLA KEPATUHAN`).
  - Chart 2: `2. Trend Energi & Frekuensi Sesi` (Tag: `DUAL-AXIS COMBO`).
  - Chart 5: `5. Efisiensi Konsumsi Baterai Armada` (Tag: `BENCHMARK 290 KWH`).
- Capture kanvas menggunakan fungsi `getChartImageWithWhiteBackground()` berjalan normal tanpa hambatan.

#### 5. 🛡️ Keamanan Operasional & Kestabilan Sistem:
- **Zero Backend Risk:** Tidak ada perubahan pada Google Apps Script (tetap `@100`), Firestore, maupun struktur Google Sheets.
- **Isolasi Penuh:** Seluruh logika hanya berjalan pada tab Visual KPI (`#viewPpaKpi`) sehingga aktivitas operator yang sedang menginput data di tab Quick Swap maupun Dedicated Swap tetap berjalan lancar tanpa gangguan.
- **Versi Rilis:**
  - `APP_BUILD_ID = '2026.10.06.v54'` di `index.html`.
  - `CACHE_NAME = 'charging-ev-v54'` di `sw.js`.

### 📋 Ringkasan Pekerjaan Hari Ini (05 Oktober 2026 - Pukul 23:15 WITA - Build v53):

#### 1. ⏱️ Penyelarasan Menyeluruh Form Quick Swap / Regular Add Swap (`formNewSwap`):
- **Masalah:** Form Tambah Swap Biasa / Quick Modal sebelumnya masih memakai formula toleransi lama simetris `Math.abs(diff) > 55`, sehingga unit yang datang 30 menit sebelum jadwal (seperti unit 1622 jam 20:30 jadwal 21:00) dievaluasi sebagai `On Time` dan `13.NO PROBLEM`.
- **Implementasi:**
  - Menyelaraskan logika waktu:
    - $\Delta t \in [0, +55]$ menit &rarr; `On Time`, problem `13.NO PROBLEM`.
    - $\Delta t \in [-55, -1]$ menit &rarr; `Out Off Time`, `isEarly = true`, otomatis mengisi Keterangan `Datang awal`.
    - $\Delta t > +55$ atau $\Delta t < -55$ menit &rarr; `Out Off Time`.

#### 2. 🛡️ Sanitasi Parameter & Event Listener Dedicated Swap:
- Menghindari bug `[object InputEvent]` yang terkirim saat operator mengetik `Jam In` dengan membungkus listener `addEventListener('input', () => updateDedSwapScheduleTarget())` dan sanitasi tipe data string pada `updateDedSwapScheduleTarget(selectedSpecificTime)`.

#### 3. 🏷️ Standardisasi Teks Keterangan Lapangan ("Datang awal"):
- Menyeragamkan format auto-keterangan menjadi `Datang awal` (2 kata, sesuai kebiasaan operator dan format data historis di Google Sheets).

#### 4. 🧠 Smart Fallback Evaluasi Ketepatan di Tabel Telemetry & PDF Export:
- Pada `renderPpaExecTable()` dan `buildVisualKpiPdfReportHtml()`, ditambahkan dynamic check `(diffCalc !== null && (diffCalc < 0 || diffCalc > 55))` sehingga jika ada anomali atau data lama yang statusnya tidak sinkron, tabel secara otomatis menampilkan pill merah `OUT OFF TIME` dan Keterangan `Datang awal`.

#### 5. ✏️ Koreksi Riil Transaksi Unit 1622 (ID `0664`) di Google Sheets & Firestore:
- Memperbarui baris transaksi `DA01/CHG/2026/SWAP/0664` pada sheet `DATA INPUT` dan Firestore:
  - `statusRemark`: dari `On Time` &rarr; `Out Off Time`
  - `keterangan`: dari `13.NO PROBLEM` &rarr; `Datang awal`

#### 6. 🚀 Rilis Versi & Deployment:
- **Build Version:** `2026.10.05.v53` di `index.html`.
- **Service Worker Cache:** `charging-ev-v53` di `sw.js`.
- **Backend Google Apps Script:** Versi tetap **`@100`** (tidak perlu redeploy backend karena backend sudah 100% stabil).

---

### 📋 Ringkasan Pekerjaan Hari Ini (05 Oktober 2026 - Bagian Malam):

#### 1. ⏱️ Penyelarasan Urutan Slot Jadwal Sesuai Database Google Sheets (Natural Order):
- **Masalah:** Tombol slot jadwal di aplikasi menampilkan jam yang terbalik (misal jam `02.00.00` muncul di Slot 1 terlebih dahulu, baru kemudian `05.00.00`, `19.00.00`, dan `22.00.00`) karena adanya fungsi `.sort()` alfabetik string yang memotong urutan kronologis Shift 2 (Shift Malam: 18:00 - 06:00).
- **Solusi & Implementasi:**
  - Menghilangkan `.sort()` alfabetik pada `matches` di `updateDedSwapScheduleTarget()` dan tabel kelola jadwal `renderScheduleTable()`.
  - Sistem sekarang 100% patuh pada urutan baris murni dari database Google Sheets `SCEDHULE`:
    `Slot 1: 19.00.00` ➔ `Slot 2: 22.00.00` ➔ `Slot 3: 02.00.00` ➔ `Slot 4: 05.00.00`.

#### 2. 🎯 Aturan Window Waktu Ketepatan & Status Toleransi 55 Menit:
- **Aturan Operasional Baru:**
  1. **`On Time`**: Hanya jika unit masuk di jam jadwal s/d $+55$ menit sesudahnya ($\Delta t \in [0, +55]$ menit).
  2. **`Out Off Time` (Datang Lebih Awal)**: Jika unit masuk dalam rentang 55 menit sebelum jadwal ($\Delta t \in [-55, -1]$ menit), status otomatis `Out Off Time` dan kolom `KETERANGAN` otomatis mencatat: `Datang lebih awal`.
  3. **`Out Off Time` (Terlambat)**: Jika unit masuk lebih dari $+55$ menit sesudah jadwal ($\Delta t > +55$ menit).
- **Penyempurnaan Kalkulasi Waktu:**
  - Normalisasi otomatis tanda pemisah titik (`.`) seperti format Google Sheets (`19.00.00`) ke format waktu kalkulasi tanpa error `NaN`.
  - Penanganan penyeberangan tengah malam (*circular 24-hour rollover*, misal 23:55 vs 00:10 terhitung selisih 15 menit).

#### 3. ⚠️ Deteksi Otomatis Jadwal Sebelumnya Terskip (Skipped Schedule):
- **Logika Cerdas:**
  - Jika unit masuk di slot ke-2 atau seterusnya (misal Slot 2 `22:00`), sistem secara otomatis memeriksa riwayat transaksi hari itu (`swapsData`) untuk unit dan shift yang bersangkutan.
  - Jika slot sebelumnya (`19:00`) belum pernah melakukan swap, sistem menandainya sebagai TERSKIP.
  - Kolom **`KETERANGAN`** otomatis terisi: `Jadwal 19:00 Terskip` (atau kombinasi `Jadwal 19:00 Terskip - Datang lebih awal` jika datang di rentang awal).
  - Form memunculkan badge peringatan oranye: `⚠️ Perhatian: Jadwal 19:00 Terskip (Belum ada transaksi di slot sebelumnya)`.
  - Catatan manual operator yang sudah diketik tetap aman dan tidak terhapus.
  - Jam Masuk (`Jam In`) tersinkronisasi live (*real-time reactive*) begitu operator mengetik atau memilih waktu.

#### 4. 🚀 Rilis Versi & Deployment:
- **Build Version:** `2026.10.05.v52` di `index.html`.
- **Service Worker Cache:** `charging-ev-v52` di `sw.js` (PWA otomatis update di HP operator tanpa install ulang).
- **GitHub Push:** Berhasil di-push ke branch `main` (`commit 5807b72`).
- **Google Apps Script Deployment:** **`@100`** (Deployment ID `AKfycbz1S0_VHO2QaVFEKFjRxhtFhlCHqxI9MyNffFSM6iTfQA02lio6VAM_bf41vIRCk8Bh5Q`).

---

### 📋 Ringkasan Pekerjaan Sebelumnya (05 Oktober 2026 - Bagian Dini Hari):

#### 1. 🔒 Pengamanan Server-Side LockService Mutex & Deteksi Duplikat di Backend (`Code.gs`):
- **Masalah:** Transaksi yang diinput bersamaan oleh beberapa operator di lapangan menghasilkan Transaction ID kembar (contoh: Abi Setiawan dan Virnanda Agus Setiawan sama-sama mendapatkan ID `0478`, `0479`, `0480`) karena ID di-generate secara independen oleh memori lokal HP masing-masing tanpa koordinasi server terpusat.
- **Implementasi:**
  - Menambahkan antrean atomic mutex `LockService.getScriptLock()` dengan timeout 25 detik pada `apiSaveSwapTransaction(rec)`.
  - Backend kini membaca seluruh ID yang sudah ada di kolom A sheet `DATA INPUT` dan mencari nomor sekuensial tertinggi (`maxNum`).
  - Jika ID dari HP operator sudah terpakai oleh transaksi lain (duplikat), backend secara otomatis menaikkan nomornya ke urutan berikutnya (`maxNum + 1`).
  - Mengembalikan ID resmi dari server ke client: `{ status: 'success', id: finalId, reconciled: (finalId !== reqId) }`.
  - Sinkronisasi Firestore juga dipastikan menggunakan `finalId` resmi yang sama persis.

#### 2. 🔄 Sinkronisasi & Rekonsiliasi ID Otomatis di Sisi Klien (`index.html`):
- **Implementasi:**
  - Mengintegrasikan callback penerimaan ID resmi server pada `gasSync.pushTransaction(newRec, callback)` di `formNewSwap` maupun `formDedicatedSwap`.
  - Jika ID yang disetujui server berbeda dengan estimasi awal di HP, memori lokal klien seketika memperbarui `newRec.id` dengan ID resmi server, menyelaraskan Firestore, me-render ulang tabel lokal, dan menampilkan notifikasi ramah: *"ID diselaraskan server: DA01/.../XXXX"*.
  - Pembaruan regex `generateNextSwapId()` hingga 5 digit (`\d{1,5}`) untuk mendukung pertumbuhan database jangka panjang.

#### 3. 🚫 Proteksi Anti Double-Click pada Tombol Simpan Transaksi:
- **Implementasi:**
  - Tombol simpan (`#btnSubmitNewSwap` dan `#btnSubmitDedSwap`) dinonaktifkan (*disabled*) seketika saat form di-submit dan menampilkan status animasi *"⏳ Mengamankan nomor transaksi..."*.
  - Tombol otomatis di-restore dan diaktifkan kembali saat modal ditutup atau saat modal dibuka kembali, mencegah operator mengklik dobel saat sinyal melambat.

#### 4. 🚀 Rilis Versi & Deployment:
- **Build Version:** `2026.10.05.v51` di `index.html`.
- **Service Worker Cache:** `charging-ev-v51` di `sw.js`.
- **Google Apps Script Deployment:** **`@99`** (Deployment ID `AKfycbz1S0_VHO2QaVFEKFjRxhtFhlCHqxI9MyNffFSM6iTfQA02lio6VAM_bf41vIRCk8Bh5Q`).

---

### 📋 Ringkasan Pekerjaan Hari Ini (04 Oktober 2026):

#### 1. 📊 Standardisasi Ekspor Excel Transaksi Charging Swap Sama Persis 100% Database Google Sheets:
- **Kebutuhan User:** Format file Excel (.xlsx) yang diunduh dari tombol Ekspor Transaksi harus memiliki struktur 20 kolom yang identik persis dengan sheet database `DATA INPUT` Google Sheets (dari urutan kolom, nama header, format nilai, freeze header baris 1, nama sheet `DATA INPUT`, hingga auto-filter).
- **Implementasi:**
  - Standardisasi urutan 20 kolom:
    1. `TRANSACTION ID`, 2. `DATE`, 3. `SHIFT`, 4. `CATEGORY`, 5. `LOCATION`, 6. `KODE UNIT`, 7. `HM`, 8. `BATTERY BEFORE`, 9. `JAM IN SWAP`, 10. `BATTERY AFTER`, 11. `JAM OUT SWAP`, 12. `CHARGING TIME (MENIT)`, 13. `ENERGY (KWH)`, 14. `STATUS REMARK`, 15. `PROBLEM REMARK`, 16. `MANPOWER`, 17. `NIK`, 18. `KETERANGAN`, 19. `TIME SCH`, 20. `SWAP STATION`.
  - Mengubah nama sheet default menjadi `DATA INPUT`.
  - Membekukan baris header (`freeze: { xSplit: 0, ySplit: 1 }`) dan mengaktifkan auto-filter pada seluruh 20 kolom.
  - Penyelarasan format pada seluruh fungsi ekspor: `executeExportDataInputExcel()`, `exportSwapsExcel()`, `exportAllToExcelMultiSheet()`, dan `exportSwapsCSV()`.

#### 2. ⚡ Alur Ekspor Cerdas (1-Klik Langsung Download saat Ada Filter, Modal Pengingat saat Tanpa Filter):
- **User Request:** Popup pilihan ekspor dihilangkan saat user sudah memasang filter agar ekspor langsung berjalan dalam 1 klik. Jika filter belum aktif, tampilkan popup pengingat ramah agar user teringat untuk memfilter data.
- **Implementasi:**
  - **Saat Filter Aktif:** Langsung unduh file Excel dalam 1 klik tanpa modal pengganggu.
  - **Saat Tanpa Filter:** Menampilkan modal pengingat `#modalExportNoFilterAlert` (Amber Theme) dengan 2 opsi jelas:
    1. `[ 🔍 Pasang Filter Dahulu (Disarankan) ]` &rarr; Menutup modal dan memfokuskan layar ke bar filter tanggal.
    2. `[ 🌐 Tetap Ekspor Seluruh Database (8.400+ Baris) ]` &rarr; Melanjutkan ekspor seluruh riwayat database tanpa hambatan.
    3. `[ Batal ]`.

#### 3. 🗓️ Sinkronisasi Bersih Tabel Jadwal Swap (Penghapusan Dummy Fallback & Empty State Interaktif):
- **Masalah:** Data jadwal swap yang tampil di tabel operasi tidak sesuai dengan data riil di Google Sheets, melainkan menampilkan jadwal tiruan otomatis (`buildDefaultSchedules()`).
- **Penyebab:** Kode frontend memiliki fallback otomatis ke dummy schedule jika database awal kosong, serta `Code.gs` sebelumnya hanya memeriksa sheet bernama `SCEDHULE` (typo lama) tanpa fallback ke `SCHEDULE`.
- **Solusi:**
  - Menghapus pembuatan dummy fallback di `gasSync._processResult`, `initDataState`, `initScheduleModule`, dan `renderScheduleTable`.
  - Menyelaraskan pembacaan sheet di `Code.gs` agar mendukung nama sheet `SCEDHULE`, `SCHEDULE`, maupun `Schedule`.
  - Menambahkan *Empty State* interaktif dengan ikon kalender, pesan status informatif, serta 2 tombol CTA langsung:
    - `[ Upload File Jadwal ]` (membuka modal import Excel jadwal swap).
    - `[ + Tambah Jadwal ]` (membuka form input jadwal baru).

#### 4. 🧹 Pembersihan Toolbar Header Visual KPI:
- **Kebutuhan User:** Menghilangkan tombol aksi ekspor cepat (Salin Gambar, Download Gambar, Kirim WA) dan tombol Print A4 dari toolbar Visual KPI, sehingga tampilan header lebih bersih dan fokus.
- **Implementasi:**
  - Menghapus elemen tombol `#btnCopyVisualKpiImg` (Salin Gambar), `#btnDownloadVisualKpiImg` (Download Gambar), `#btnShareVisualKpiWa` (Kirim WA), dan `#btnPrintVisualKpi` (Print A4) dari toolbar header di `index.html`.
  - Tetap mempertahankan badge `Live Synced` dan tombol utama `[ Download PDF ]` (`#btnDownloadVisualKpiPdf`).

#### 5. 📄 Perbaikan Ekspor PDF Visual KPI (2 Halaman Landscape Utuh & Rapi Bebas Tumpang Tindih):
- **Masalah Sebelumnya (Screenshot PDF dari User):**
  - Pada layar viewport sempit/split-screen (~625px), grafik Chart.js dirender tinggi secara vertikal (~380px) untuk mode mobile.
  - Saat diekspor ke PDF, kontainer dipaksa melebar ke 1400px namun Chart.js tidak dire-render ulang, sehingga canvas grafik melebihi container (.ppa-canvas-wrapper) hingga tembus/menusuk ke bawah dan menabrak tabel Ringkasan Log Insiden (Problem Log).
  - Elemen grafik dan label saling berhimpitan dan tumpang tindih.
- **Penyebab Akar:** `html2canvas` menduplikasi bitmap `<canvas>` dari DOM aktif apa adanya tanpa memicu reflow Chart.js.
- **Solusi:**
  - Menerapkan mekanisme **Live Desktop Reflow**: Sebelum capture dilakukan, kontainer `.ppa-dashboard-wrapper` diberi kelas `.ppa-export-active-mode` (1400px desktop grid murni).
  - Memanggil `Chart.instances.forEach(inst => { inst.resize(); inst.update('none'); })` secara langsung. Semua 10 grafik Chart.js seketika terhitung ulang proporsinya: tinggi dikunci 185px, batang grafik rapi, font label proporsional, dan tidak ada lagi canvas yang meluber ke bawah.
  - Menambahkan `overflow: hidden !important` pada `.ppa-canvas-wrapper` dan `.ppa-chart-card-box`, serta `clear: both; margin-bottom: 16px` pada kedua tabel sehingga jarak antar komponen terjamin bersih dan teratur.
  - Setelah capture selesai, kontainer dan grafik seketika dikembalikan ke ukuran normal pengguna tanpa merusak tampilan.
  - Hasil dokumen PDF kini menjadi **tepat 2 halaman landscape**, 100% presisi, rapi, dan tidak ada elemen yang tumpang tindih.

#### 6. 🚀 Rilis Versi & Deployment:
- **Build Version:** `2026.10.04.v50` di `index.html`.
- **Service Worker Cache:** `charging-ev-v50` di `sw.js`.
- **Google Apps Script Deployment:** **`@98`** (Deployment ID `AKfycbz1S0_VHO2QaVFEKFjRxhtFhlCHqxI9MyNffFSM6iTfQA02lio6VAM_bf41vIRCk8Bh5Q`).
- **Git Commit & Push:** `c78a526` pada branch `main` GitHub repo [urdailymotion/CHARGING-EV_SCM-1.2](https://github.com/urdailymotion/CHARGING-EV_SCM-1.2.git).
- **Google Apps Script Deployment:** **`@97`** (Deployment ID `AKfycbz1S0_VHO2QaVFEKFjRxhtFhlCHqxI9MyNffFSM6iTfQA02lio6VAM_bf41vIRCk8Bh5Q`).
- **Git Commit & Push:** `b79646e` pada branch `main` GitHub repo [urdailymotion/CHARGING-EV_SCM-1.2](https://github.com/urdailymotion/CHARGING-EV_SCM-1.2.git).

---

### 📋 Ringkasan Pekerjaan Hari Ini (03 Oktober 2026):

#### 1. 📱 Perbaikan Mobile Modal Scrolling pada Sub-menu Charging Swap (Operation):
- **Masalah:** Saat diakses menggunakan ponsel dan operator ingin merevisi transaksi (Edit Data Transaksi), modal dialog tidak bisa di-scroll naik-turun sehingga field bagian bawah dan tombol batal/simpan terpotong.
- **Penyebab:** `<form id="formEditRecord">` di dalam modal dialog flexbox tidak memiliki aturan `display: flex; flex-direction: column; min-height: 0;`, sehingga body modal mengembang melebihi viewport tanpa memicu scroll internal.
- **Solusi:** Menambahkan aturan flexbox eksplisit pada `.modal-dialog > form`, momentum touch scrolling pada `.modal-body-ent`, dan inline scroll lock guard.

#### 2. 📊 Integrasi Problem Log & Analisis Downtime ke Dashboard Visual KPI:
- **Kebutuhan:** Menampilkan hasil inputan dari Problem Log (sheet `DATA PROBLEM`) secara visual dan interaktif di menu **Visual KPI**.
- **Komponen yang Diimplementasikan:**
  1. **Executive Problem Stat Ribbon (4 Kartu Ringkasan):**
     - **Total Gangguan (`INCIDENTS`)**: Menghitung jumlah insiden dalam periode aktif.
     - **Akumulasi Downtime (`DURATION`)**: Total jam dan menit stasiun/unit mengalami hambatan.
     - **Status Penanganan (`RESOLUTION`)**: Rasio insiden Selesai vs Berlangsung (disertai indikator animasi merah berdenyut untuk insiden aktif).
     - **Top Bottleneck (`HIGHEST DOWNTIME`)**: Otomatis mendeteksi fasilitas/unit dengan total downtime terbesar dan persentasenya.
  2. **Dual Visual Problem Charts:**
     - **Chart A (Pareto Frekuensi Kendala per Fasilitas / Unit)**: Bar chart horizontal modern palet Cobalt Blue.
     - **Chart B (Distribusi Durasi Downtime)**: Bar chart vertikal palet Ruby Red mengukur total menit terbuang per unit.
  3. **Mini Incident Log Table (Tabel Rincian Insiden Terkini):**
     - Kolom: No, Tanggal, Shift, Fasilitas/Unit, Deskripsi Masalah, Jam Open, Jam Close, Downtime, Status.
     - Tersinkron otomatis dengan filter tanggal, shift, dan unit di Visual KPI.
     - Dilengkapi pagination internal (5 baris/halaman) dan tombol cepat "Buka Modul &rarr;" untuk menuju modul Problem Log lengkap.
  4. **Penyempurnaan Chart 8 (Pareto Kendala):**
     - Mengubah sumber data Chart 8 lama yang sebelumnya hanya membaca remark swap menjadi langsung membaca database `problemsData`.
  5. **Auto-Resize & Sinkronisasi Filter:**
     - Menghubungkan canvas problem log ke universal resize observer (`chartInstances`).
- **Versi Build & Deployment:**
  - Build Version: `2026.10.03.v37` di `index.html`.
  - Service Worker Cache: `charging-ev-v37` di `sw.js`.
  - Google Apps Script Deployment: **`@85`** (Deployment ID `AKfycbz1S0_VHO2QaVFEKFjRxhtFhlCHqxI9MyNffFSM6iTfQA02lio6VAM_bf41vIRCk8Bh5Q`).
  - Git Commit & Push: `3c44030` pada branch `main` GitHub repo [urdailymotion/CHARGING-EV_SCM-1.2](https://github.com/urdailymotion/CHARGING-EV_SCM-1.2.git).

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

#### 12. 📅 Penambahan Fitur Filter Rentang Tanggal (DARI - SAMPAI) pada Dashboard Visual KPI:
- **Latar Belakang & Kebutuhan:**
  - Sebelumnya filter tanggal pada dashboard pemantauan ketepatan swap (`viewAnalyticsDashboard`) hanya berupa dropdown tanggal tunggal (`DATE: [ Semua Tanggal v ]`), sehingga pengguna kesulitan melihat tren atau data rekap pada rentang tanggal tertentu (misalnya tanggal 1 sampai 15, atau per minggu tertentu).
- **Fitur Baru yang Diimplementasikan:**
  1. **Dual Date Inputs (DARI & SAMPAI):**
     - Menggantikan dropdown tanggal tunggal dengan dua input date picker native HTML5:
       - **`DARI:`** (`id="ppaFilterDateStart"`)
       - **`SAMPAI:`** (`id="ppaFilterDateEnd"`)
     - Mendukung pemilihan tanggal fleksibel (mulai dari tanggal tertentu saja, sampai tanggal tertentu saja, ataupun rentang lengkap dari - sampai).
     - Validasi interaktif: input tanggal awal secara otomatis menyelaraskan batas minimal (`min`) pada tanggal akhir, dan sebaliknya.
  2. **Dynamic ISO Week Filter:**
     - Penambahan kalkulasi nomor pekan standar ISO-8601 (`getIsoWeek()`) sehingga dropdown `WEEK:` terisi secara dinamis dari data aktual.
  3. **Sinkronisasi Reaktif:**
     - Mengubah rentang tanggal atau week secara instan memperbarui 5 kartu KPI crimson, 8 diagram interaktif, serta tabel operasional di bawahnya.
  4. **Reset Otomatis:**
     - Tombol **`[ 🔄 Reset ]`** secara bersih mengosongkan kedua input tanggal serta mengembalikan seluruh filter dropdown ke status default.
  5. **Pembaruan Service Worker:**
     - Versi dinaikkan ke **`charging-ev-v14`** pada [sw.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/sw.js).

#### 13. 🎨 Pembaruan Logo Resmi PPA di Seluruh Komponen Aplikasi (28 September 2026):
- **Latar Belakang & Kebutuhan:**
  - Pengguna menyediakan logo resmi PT Putra Perkasa Abadi (emblem pelari lingkaran merah dengan tipografi PPA tegas) untuk dipasang di seluruh titik identitas visual aplikasi.
- **Pembaruan Sistem yang Diterapkan:**
  1. **Pemrosesan Aset Gambar Beresolusi Tinggi:**
     - File gambar baru diproses ke format RGBA berlatar transparan bersih (`180 x 240`).
     - Dibuat varian aset di folder `assets/`:
       - `assets/logo_ppa.png` dan `assets/logo_ppa_hd.png` (Logo lengkap dengan teks PPA hitam).
       - `assets/logo_ppa_circle.png` (Emblem lingkaran pelari merah 180x180 berlatar transparan).
       - `assets/icon-192.png`, `assets/icon-512.png`, dan `assets/apple-touch-icon.png` (Ikon PWA & homescreen tajam dengan safe-zone padding).
  2. **Pembaruan Layar Login (`index.html`):**
     - Logo lingkaran pelari resmi dipasang pada `.ppa-circle-logo-badge` dengan efek drop-shadow elegan disandingkan dengan teks tebal "PPA" putih di atas banner *dark navy*.
  3. **Pembaruan Topbar Header Aplikasi (`index.html`):**
     - Komponen `.brand-circle-logo` di samping judul *SAFE & STRONG* kini menampilkan logo lingkaran resmi PPA berlatar putih bersih menggantikan ikon emoji statis `⚡`.
  4. **Pembaruan Modul EV Intelligence (`intelligence.html` & Embedded String):**
     - Komponen `.brand-mark img` dan kop cetak laporan PDF/Print (`#printLogo`) diperbarui menggunakan logo resmi PPA.
     - String `window.INTELLIGENCE_HTML_SOURCE` di [index.html](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/index.html) disinkronkan penuh dengan *safe script escaping*.
  5. **Pembaruan Cache PWA & Service Worker:**
     - Cache Service Worker pada [sw.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/sw.js) dinaikkan ke versi **`charging-ev-v15`** dengan seluruh aset logo baru terdaftar ke dalam *pre-cache* agar langsung terunduh di HP/laptop pengguna.
  6. **Deployment:**
     - Berhasil dideploy ke Google Apps Script Production Versi 62 (`@62`) dan disinkronkan ke GitHub repository `main`.
  7. **Konfigurasi Anti-Cache Netlify & PWA Instant Reload:**
     - Ditambahkan file `_headers` khusus Netlify dengan header `Cache-Control: no-cache, no-store, must-revalidate` untuk `/sw.js` dan `/index.html` agar browser HP tidak menahan cache HTTP basi.
     - Penambahan trigger `reg.update()`, event listener `updatefound`, dan `controllerchange` di [index.html](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/index.html) sehingga PWA yang dibuka di HP otomatis memeriksa pembaruan dan memuat ulang aset terbaru secara instan.
  8. **Suite Ikon PWA Lengkap & Pembersihan Duplikasi Tag Ikon:**
     - Ditemukan dan dibersihkan duplikasi tag `<link rel="icon" href="icon.svg">` dan `<link rel="apple-touch-icon" href="icon-192.png">` di baris 931-932 [index.html](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/index.html) yang menimpa ikon resmi.
     - Dibuat suite ikon lengkap: `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png` (dengan safe-zone padding untuk Android Adaptive Icon), `apple-touch-icon.png` (180x180), `favicon-32x32.png`, dan `favicon-16x16.png` baik di folder `assets/` maupun di root directory sebagai fallback.
     - Ditambahkan cache-busting query parameter `?v=17` pada `manifest.json`, icon link, dan Service Worker cache dinaikkan ke **`charging-ev-v18`**.

---

   9. **Pembaruan Desain Ikon PWA, Logo Kontras Tinggi, dan Sistem Anti-Cache v18:**
      - Dibuat ulang aset logo resmi runner lingkaran PPA dengan transparansi sudut sempurna (`alpha = 0` pada 4 sudut luar lingkaran) dan antialiasing tepi melingkar halus pada `assets/logo_ppa_circle.png` (6.829 bytes).
      - Pada Login Card Banner index.html, `.ppa-circle-logo-badge` kini menggunakan circular white badge (`background: #ffffff; border-radius: 50%; box-shadow: 0 4px 14px rgba(0,0,0,0.45);`) agar logo lingkaran merah PPA tampil kontras tinggi 100% dan sangat mencolok di atas latar belakang banner biru gelap.
      - Seluruh rangkaian ikon PWA (`assets/icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon.png`, `favicon.ico`) diregenerasi dengan backing putih kontras tinggi sesuai spesifikasi Google WebAPK & Android Adaptive Icons.
      - **Instant Hard-Cache Purge:** Ditambahkan skrip deteksi build `2026.09.28.v18` di `<head>` index.html yang secara otomatis menghapus seluruh isi `CacheStorage` dan memaksa reload jika terdeteksi build lama di browser HP.
      - File `netlify.toml` dan `_headers` dikonfigurasi dengan `Cache-Control: no-cache, no-store, must-revalidate, max-age=0` untuk `/sw.js`, `/manifest.json`, dan `/index.html`.
      - Cache Service Worker pada sw.js dinaikkan ke versi **`charging-ev-v18`** dan manifest query string dinaikkan ke `?v=18`.

#### 14. 💎 Redesain Visual KPI - Standar Desain EV Intelligence & Revisi Segmented Switcher (28 September 2026):
- **Latar Belakang & Kebutuhan:**
  - Tampilan Visual KPI sebelumnya dinilai kurang profesional (terlalu banyak kombinasi warna dan ikon kartun).
  - Pengguna meminta visual yang sejalan dengan standar desain **EV Intelligence** (`intelligence.html`), dengan palet warna enterprise dan tata letak yang bersih, elegan, dan informatif.
  - Pengguna meminta revisi tombol switcher mode operasional menjadi `SCHEDULE` dan `NON SCHEDULE`, serta menghapus teks notice deskripsi di bawah tombol agar layout lebih ringkas.
- **Pembaruan Sistem yang Diterapkan:**
  1. **Palet Warna & Tipografi EV Intelligence:**
     - Menggunakan warna resmi EV Intelligence: Cobalt Blue (`#2563EB`), Corporate Navy (`#0F2747` / `#173A63`), Emerald Green (`#168A5B`), Golden Amber (`#D99000`), Petrol Cyan (`#287C8E`), dan Ruby Red (`#D64545`).
     - Seluruh ikon emoji kartun dihapus dan digantikan micro-tag enterprise (`FLEET`, `TOTAL`, `CLEAN ENERGY`, `SLA < 8M`, `STATION`).
  2. **5 Floating Stat Cards:**
     - Kartu bernuansa putih bersih (`#ffffff`, border `#E4E7EC`, radius `10px`, hover elevation halus).
     - Segmented workload bar stasiun swap dengan proporsi real-time ($S1: 46\%, S2: 54\%$).
  3. **8 Diagram Telemetri BI:**
     - Speedometer Gauge SLA dengan indikator Emerald Green & Ruby Red.
     - Frekuensi Harian (Bar Cobalt Blue + Golden Amber moving average spline).
     - Target vs Aktual Mingguan (Bar Cobalt Blue vs Target Muted).
     - 24-Jam Pit Rush Hour (Kurva Petrol Cyan).
     - Distribusi Beban Stasiun (Deep Navy vs Petrol Cyan vs Steel Blue).
     - Top 10 EV Dump Truck Pareto (Cobalt Blue).
     - Penyaluran Energi Bersih Harian (Emerald Green MWh).
     - Analisis Kendala Root Cause Pareto (Multi-warna terstruktur).
  4. **Tabel Riwayat Telemetri Modern:**
     - Header abu-abu subtle (`#F8F9FA`), hover highlight halus, dan status pill (`ON SCHEDULE` hijau, `NON-SCHEDULE` cyan, `OUT OFF TIME` merah).
  5. **Revisi Tombol & Penghapusan Notice:**
     - Tombol switcher diperbarui menjadi: `[Semua Operasional]`, `[SCHEDULE]`, `[NON SCHEDULE]`.
     - Teks deskripsi notice di bawahnya dihapus untuk menghasilkan tampilan yang jauh lebih bersih dan compact.
  6. **Ikon Vektor SVG Monokrom (Tanpa Warna):**
     - Seluruh emoji pada Footer Ribbon Visual KPI (`🌐`, `📷`, `📘`, `🔗`, `⛏️`) diganti 100% dengan ikon vektor SVG outline monokrom murni (`stroke="currentColor"`).
     - Tombol-tombol aksi utama (`Simpan Transaksi`, `Export Data`, `Export IPCC`, `Input Swap`, `Edit Kolektif`, `Hapus Kolektif`, `Table Actions`) diperbarui menggunakan SVG outline netral.
     - Area Visual KPI kini **0% Emoji / 100% Bersih Monokrom**.
  7. **Pembaruan Service Worker:**
     - Versi dinaikkan ke **`charging-ev-v22`** pada [sw.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/sw.js).

---

#### 15. 🔄 Fleksibilitas Universal Mode Operasional (Schedule & On-Demand) di Semua Lokasi (29 September 2026):
- **Latar Belakang & Kebutuhan:**
  - Sebelumnya sistem mengunci `ROOM A1` wajib menggunakan Mode Schedule dan `ROOM A2` wajib menggunakan Mode On-Demand (Non-Schedule).
  - Pengguna meminta agar seluruh lokasi (`ROOM A1` maupun `ROOM A2`) bebas memilih ingin beroperasi dengan **Mode Schedule** ataupun **Mode Demand (On-Demand)** saat login.
- **Pembaruan Sistem yang Diterapkan:**
  1. **Layar Login (`loginPortalScreen`):**
     - Memilih Lokasi (`ROOM A1` / `ROOM A2`) maupun Mesin Swap (`SWAP 01`, `SWAP 02`, `SWAP 03`) tidak lagi memaksa/mengubah pilihan mode operasional.
     - Operator bebas memilih tombol **`On-Demand`** atau **`Mode Schedule`** untuk ruangan manapun.
     - Event listener interaktif: mengklik label maupun radio button langsung menyinkronkan status aktif, indikator badge, dan teks petunjuk.
  2. **Form Input Transaksi (Dedicated & Modal Pop-Up):**
     - Evaluasi schedule target kini berlaku untuk **SEMUA lokasi** (`ROOM A1` dan `ROOM A2`) jika Mode Schedule aktif.
     - Jika unit DT memiliki jadwal di shift & tanggal aktif, target jam otomatis dicocokkan dan dievaluasi toleransi keterlambatan **55 menit** (On Time vs Out Off Time) baik di Room A1 maupun Room A2.
     - Jika Mode On-Demand dipilih, seluruh lokasi beroperasi bebas jadwal (Target Jam: `-`, Status: `Non-Schedule`, Remark: `13.NO PROBLEM`).
     - Indikator banner sesi form input diperbarui menampilkan: `ROOM .. • SWAP .. • MODE SCHEDULE` atau `ON-DEMAND`.
  3. **Visual KPI & Telemetri BI:**
     - Pemfilteran Mode Operasional di Visual KPI (`[Semua Operasional]`, `[SCHEDULE]`, `[NON SCHEDULE]`) disesuaikan berbasis status transaksi aktual (`s.statusRemark` / `s.timeSch`), bukan lagi berdasarkan filter kaku nama ruangan.
  4. **Pembaruan Service Worker:**
     - Cache Service Worker pada `sw.js` dinaikkan ke versi **`charging-ev-v26`**.

---

#### 16. ⚡ Pembersihan Tampilan Form Input Sesuai Mode On-Demand (29 September 2026):
- **Masalah:** Saat operator login menggunakan Mode Demand (On-Demand), form input masih menampilkan bar *"WAKTU SCHEDULE SWAP TERJADWAL"* dengan *"Target Jam: -"* dan dropdown *"Status / Remark Ketepatan"*, sehingga format form masih berkesan mode jadwal.
- **Solusi & Perbaikan:**
  1. **Sembunyikan Total Bar Target Jadwal:** Bar jadwal (`groupDedSwapSchedule` dan `groupNewSwapSchedule`) disembunyikan 100% (`display: none`) saat Mode On-Demand aktif.
  2. **Penyederhanaan Kolom Status:** Dropdown Status Ketepatan (`wrapDedSwapStatus` dan `wrapNewSwapStatus`) disembunyikan di Mode On-Demand, dan field Problem Remark (`wrapDedSwapProblem`) otomatis melebar penuh (`form-full-width`). Nilai status tetap tersimpan otomatis sebagai `'Non-Schedule'` di database.
  3. **Indikator Mode pada Topbar & Sidebar:** Header aplikasi dan sidebar drawer kini dengan tegas menampilkan mode aktif operator: `ROOM .. (SWAP ..) • SHIFT .. • ON-DEMAND` atau `• SCHEDULE`.
  4. **Pembaruan Cache Service Worker:** Versi dinaikkan ke **`charging-ev-v27`** pada [sw.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/sw.js).

#### 17. 👥 Sinkronisasi Penuh Database Pengguna & Akun (CRUD USER) (29 September 2026):
- **Masalah:** Saat menambah, mengedit, atau menghapus pengguna di menu *Kelola Pengguna & Akun*, perubahan tidak tersimpan ke database Google Sheets (sheet `USER`). Pengguna yang dihapus muncul kembali saat halaman dimuat ulang (*refresh*), pengguna baru hilang, dan password yang diubah tidak tersinkron.
- **Akar Masalah:**
  1. Backend `Code.gs` belum memiliki endpoint API untuk `save_user`, `delete_user`, dan `sync_all_users`.
  2. Modul frontend `gasSync` belum memiliki fungsi untuk mengirim aksi perubahan user ke Google Apps Script (baik mode iframe maupun direct fetch API di Netlify).
  3. Logika `window.saveAppUsers` sebelumnya menggabungkan kembali daftar *hardcoded* `OPERATOR_USERS`, sehingga user yang dihapus otomatis ter-insert kembali.
  4. Penyimpanan lokal (*localStorage*) belum diaktifkan untuk daftar akun pengguna.
- **Solusi & Perbaikan:**
  1. **Backend Google Apps Script (`Code.gs`):**
     - Dibuat fungsi `apiSaveUser(user)` untuk insert & update baris di sheet `USER` (7 kolom: NO, NIK, NAMA LENGKAP, JABATAN, ROLE, PASSWORD, DEPARTEMEN) dan sinkronisasi ke Firestore.
     - Dibuat fungsi `apiDeleteUser(nik)` untuk menghapus baris user di sheet `USER` dan Firestore serta merapikan kembali penomoran kolom `NO`.
     - Dibuat fungsi `apiSyncAllUsers(usersList)` untuk sinkronisasi massal seluruh data pengguna.
     - Ditambahkan *routing action* pada `doPost(e)`: `save_user`, `delete_user`, dan `sync_all_users`.
  2. **Modul Sinkronisasi Frontend (`index.html`):**
     - Ditambahkan metode `gasSync.saveUser()`, `gasSync.deleteUser()`, dan `gasSync.syncAllUsers()` yang bekerja dual-engine (iframe GAS dan direct API Netlify).
     - `appUsersList` kini dipersistensikan langsung ke `localStorage` (`voltswap_users_data`) dan di-update saat `loadAll` mengambil data terbaru dari sheet `USER`.
     - Logika `saveAppUsers` diperbaiki: tidak lagi me-restore akun yang dihapus, dan langsung menyinkronkan aksi tambah/edit/hapus ke Google Sheets dan Firebase.
     - `findOperatorUser()` diselaraskan agar mengambil dari daftar aktif `window.getAppUsers()`, sehingga akun yang telah dihapus tidak dapat login kembali.
  3. **Pembaruan Service Worker:**
     - Cache dinaikkan ke versi **`charging-ev-v28`** pada [sw.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/sw.js).

#### 18. 🔒 Pembersihan Riwayat / Datalist Akun pada Input NIK Layar Login (29 September 2026):
- **Latar Belakang & Kebutuhan:**
  - Sebelumnya kolom NIK pada layar login (`loginPortalScreen`) terhubung ke `<datalist id="splitNikDatalist">` yang menampilkan seluruh daftar NIK dan nama lengkap karyawan saat disentuh/difokuskan.
  - Hal ini menimbulkan celah privasi/keamanan (*user enumeration*) di mana orang lain bisa melihat dan memilih NIK orang lain, serta memunculkan pop-up dropdown panjang yang menutupi layar smartphone.
- **Solusi & Perbaikan:**
  1. **Penghapusan Total Elemen `<datalist>`:**
     - Elemen `<datalist id="splitNikDatalist">` dihapus sepenuhnya dari DOM.
     - Atribut `list="splitNikDatalist"` pada input `#splitLoginNik` dihapus.
  2. **Penguatan Anti-Autofill Browser:**
     - Ditambahkan atribut `autocomplete="off"`, `autocorrect="off"`, `autocapitalize="off"`, dan `spellcheck="false"` dengan name unik `name="login_nik_field"` untuk mencegah browser memunculkan riwayat NIK yang pernah diketik di perangkat bersama/lapangan.
  3. **Preservasi Deteksi Cerdas Real-Time:**
     - Fitur deteksi otomatis nama operator (`#splitNikAutoResult`) tetap aktif dan bekerja responsif di latar belakang saat 8 digit NIK diketik oleh operator yang bersangkutan.
  4. **Pembaruan Service Worker:**
     - Cache Service Worker dinaikkan ke **`charging-ev-v29`** pada [sw.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/sw.js).

#### 19. 📱 Tampilan Login Full-Screen Edge-to-Edge pada Akses Mobile (HP):
- **Latar Belakang & Permintaan Pengguna:**
  - Saat aplikasi diakses dari perangkat ponsel (HP), pengguna meminta agar tampilan form login dibuat *full screen* tanpa ada warna sisa atau margin di tepian layar (sebelumnya kartu login melayang dengan margin dan sudut membulat di atas latar belakang `#dbe4f0`).
- **Pembaruan Desain & CSS Responsif:**
  1. **Reset Total Margin & Padding Overlay:**
     - Pada `@media (max-width: 860px)`, `.login-portal-overlay` diatur `padding: 0 !important`, `margin: 0 !important`, `border-radius: 0 !important`, dan `background: #ffffff !important` (serta `background-image: none !important`) sehingga tidak ada lagi warna latar belakang abu-abu kebiruan di tepian layar HP.
  2. **Kartu Login Penuh 100% Layar (`.split-login-card`):**
     - `max-width: 100% !important; width: 100% !important; margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; min-height: 100dvh !important;`.
  3. **Banner Atas & Form Bawah Seamless Edge-to-Edge:**
     - `.login-left-banner`: Melebar 100% dari tepi kiri ke kanan layar tanpa sudut melengkung, dengan penyesuaian `safe-area-inset-top` untuk notch kamera HP.
     - `.login-right-form`: Mengalir langsung ke bawah menyatu dengan layar tanpa border-radius bawah, dengan padding internal yang proporsional dan `safe-area-inset-bottom`.
  4. **Pembaruan Service Worker & Anti-Cache:**
     - Cache Service Worker dinaikkan ke **`charging-ev-v30`** pada [sw.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/sw.js) dan registrasi [index.html](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/index.html).

#### 20. 🛡️ Penambahan Kartu Informasi Hak Cipta & Pengembang di Tab Backup, Restore & Migrasi:
- **Latar Belakang & Kebutuhan:**
  - Pengguna meminta agar tanda kepemilikan/hak cipta dan pengembang resmi sistem dicantumkan secara rapi di dalam menu **Backup, Restore & Migrasi** (area administrasi & database yang diproteksi PIN).
- **Detail Informasi yang Dicantumkan (Sesuai Permintaan Pengguna):**
  - **Lead Developer / Pencipta:** `SRIYANTO / 81230177`
  - **Departemen / Unit:** `-`
  - **Versi Arsitektur:** `v1.0 Enterprise (Dual Sync: Sheets + Cloud Firestore)`
  - **Status Hak Cipta:** `-`
  - **Lisensi Penggunaan:** `Proprietary Internal Operational System`
  - **Keterangan Khusus:** *"Didesain dan dikembangkan secara khusus untuk standarisasi & pemantauan kinerja stasiun swap baterai kendaraan listrik PT Putra Perkasa Abadi."*
- **Implementasi Komponen UI (`index.html`):**
  - Komponen `.db-dev-attribution-card` dipasang di bagian bawah tab `#dbPaneBackup` melintasi 2 kolom (*full-width card*).
  - Dilengkapi *header dark navy* bergradasi dengan lencana status *VERIFIED OPERATIONAL BUILD*, kartu metadata modular dengan ikon penjelas, serta kutipan tujuan pengembangan bersudut lengkung khas enterprise.
- **Pembaruan Service Worker:**
  - Cache Service Worker dinaikkan ke **`charging-ev-v31`** pada [sw.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/sw.js) dan registrasi [index.html](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/index.html).

#### 21. ✨ Pop-up Animasi Keren Sertifikat Hak Cipta & Lisensi Pengembang Pasca Verifikasi PIN:
- **Latar Belakang & Permintaan Pengguna:**
  - Pengguna meminta agar informasi hak cipta & pengembang ditampilkan dalam bentuk **Pop-up Modal interaktif dengan animasi yang keren**, otomatis muncul setelah memasukkan PIN keamanan, serta dapat ditutup dengan mudah (*closeable*).
- **Fitur Baru & Implementasi Animasi:**
  1. **Animasi Pop-up Keren (`devPopElastic` & `devAvatarPulse`):**
     - Dialog muncul dengan animasi elastis membal halus (*elastic spring bounce*) dari bawah (`transform: scale(0.75) translateY(40px)` -> `scale(1.03)` -> `scale(1)`).
     - Avatar Developer (`👨‍💻`) dilengkapi *glowing cyber pulse* (`@keyframes devAvatarPulse`) yang berpendar dinamis secara terus menerus.
     - Lencana status `VERIFIED` berdenyut lembut (`@keyframes devBadgePulse`).
  2. **Triger Otomatis Pasca Input PIN:**
     - Pada fungsi `handleVerifyBackupPin()`, begitu PIN diverifikasi benar dan tab terbuka, modal `#modalDevAttribution` otomatis terpicu muncul setelah jeda halus 280ms.
  3. **Multi-Method Dismiss (Mudah Ditutup):**
     - Tombol silang `[ ✕ ]` di pojok kanan atas dengan animasi putar halus (*rotate 90deg* saat di-hover).
     - Tombol utama di bagian bawah: `[ ✕ Lanjut ke Pengaturan Database ]` dengan efek gradasi cerah.
     - Klik di luar area modal (*backdrop dismiss*) maupun penekanan tombol keyboard `Escape (ESC)`.
  4. **Tombol Buka Kembali di Tab Backup:**
     - Ditambahkan tombol `[ ✨ Buka Pop-up ]` pada header kartu di tab `#dbPaneBackup` sehingga pengguna dapat membuka kembali pop-up sertifikat kapan saja.
- **Pembaruan Service Worker:**
  - Cache Service Worker dinaikkan ke **`charging-ev-v32`** pada [sw.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/sw.js) dan registrasi [index.html](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/index.html).

#### 22. 📄 Penambahan Fitur Download PDF & Print A4 pada Tampilan Visual KPI (01 Oktober 2026):
- **Latar Belakang & Permintaan Pengguna:**
  - Pengguna meminta agar pada tampilan **Visual KPI** ditambahkan fitur untuk mengunduh laporan dalam format **PDF** dari data dan grafik visual yang sedang ditampilkan.
- **Fitur Baru & Implementasi yang Diterapkan:**
  1. **Tombol Aksi pada Header Visual KPI:**
     - Ditambahkan tombol **`[ 📄 Download PDF ]`** dengan ikon dokumen unduh modern di barisan header atas Visual KPI (`.header-bar`).
     - Ditambahkan tombol pendamping **`[ 🖨️ Print A4 ]`** untuk opsi cetak langsung ke printer fisik maupun dialog Save as PDF bawaan browser.
     - Dilengkapi indikator loading interaktif (`.ppa-spin`) saat dokumen sedang diproses.
  2. **Mesin Kompilasi PDF Berstandar Eksekutif (`#kpiPdfReportWrapper`):**
     - Dibuat template laporan A4 Landscape profesional (2 halaman) yang mengagregasikan seluruh telemetri aktif secara instan:
       - **Header Resmi:** Logo PPA (Circle runner badge), identitas PT Putra Perkasa Abadi Site BIB, judul dokumen, serta metadata filter aktif (Mode Operasional, Rentang Tanggal, Shift, Lokasi, Mesin, Unit, Status, waktu unduh WITA, dan nama operator).
       - **5 Kartu KPI Utama:** Armada EV Aktif, Throughput Swap, Green Mining & ESG (MWh, Solar, CO₂), SLA Durasi Swap, dan Beban Stasiun.
       - **8 Diagram Telemetri Resolusi Tinggi:** Mengambil snapshot grafik langsung dari Chart.js (`ppaChartKetepatan`, `ppaChartFreqDaily`, `ppaChartFreqWeekly`, `ppaChartFreqMonthly`, `ppaChartRoomCompare`, `ppaChartEnergyUnit`, `ppaChartEnergyDaily`, `ppaChartProblemBreakdown`) berlatar belakang putih tajam (anti-blur & bebas transparansi).
       - **Tabel Ringkasan Telemetri Operasional:** Rekapitulasi transaksi terkini yang sesuai dengan filter pengguna.
       - **Blok Otentikasi & Tanda Tangan Digital:** Catatan resmi sistem Dual-Sync serta kolom tanda tangan "Disiapkan Oleh" dan "Mengetahui GL / Supervisor".
  3. **Dual Export Pipeline:**
     - **Direct Download:** Menggunakan pustaka `html2pdf.js` (`html2pdf.bundle.min.js`) yang di-bundling secara lokal di `assets/` (mendukung offline PWA 100%) dan dilengkapi fallback CDN.
     - **Print Media Fallback:** Dilengkapi rule `@media print` sehingga saat dicetak langsung via dialog browser, seluruh elemen antarmuka web (sidebar, header, dsb.) otomatis disembunyikan dan hanya laporan eksekutif 2-halaman A4 yang dicetak.
  4. **Pembaruan Service Worker & Deployment:**
     - Cache Service Worker pada [sw.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/sw.js) dinaikkan ke versi **`charging-ev-v33`**.
     - Build ID dinaikkan ke **`2026.10.01.v33`**.
     - Berhasil dideploy ke Google Apps Script Production Versi 80 (`@80`).

#### 23. 🛠️ Perbaikan Sinkronisasi Database Google Sheets (Resolusi ReferenceError GAS & Deployment @81) (01 Oktober 2026):
- **Latar Belakang & Gejala:**
  - Pengguna melaporkan kegagalan koneksi antara aplikasi dan database Google Sheets ("MASIH GAGAL DALAM KONEK KE DATABASE NYA").
- **Akar Penyebab (Root Cause):**
  - Saat penambahan fitur unduh PDF, file pustaka client-side `assets/html2pdf.bundle.min.js` tersimpan di direktori lokal.
  - Perintah `clasp push` secara default menganggap semua file `.js` sebagai skrip server-side Google Apps Script, sehingga file tersebut terdorong menjadi file skrip server GAS `assets/html2pdf.bundle.min`.
  - Ketika runtime V8 Google Apps Script dijalankan untuk menangani `doGet` dan `doPost`, V8 langsung mengalami crash fatal: `ReferenceError: self is not defined (baris 2, file "assets/html2pdf.bundle.min")`.
  - Akibatnya, seluruh panggilan API Web App (`gasSync.loadAll()`, `get_all`, CRUD) gagal dengan pesan error dari Google sebelum kode `Code.gs` sempat dieksekusi.
- **Tindakan Perbaikan:**
  1. **Konfigurasi Proteksi `.claspignore`:**
     - Menambahkan aturan ketat `**/*.js`, `assets/**`, dan whitelist spesifik hanya untuk skrip server GAS (`!appsscript.json`, `!Code.gs`, `!EvIntelligenceBackend.gs`, `!index.html`, `!intelligence.html`).
  2. **Pembersihan Skrip Server & Push Ulang:**
     - Mengeksekusi `clasp push -f` untuk menghapus bersih skrip `assets/html2pdf.bundle.min` dari server Google Apps Script.
  3. **Pembuatan Versi Rilis Baru Production (`@81`):**
     - Dibuat rilis baru versi **`@81`** pada Deployment ID aktif: `AKfycbz1S0_VHO2QaVFEKFjRxhtFhlCHqxI9MyNffFSM6iTfQA02lio6VAM_bf41vIRCk8Bh5Q`.
- **Hasil Verifikasi Live API Test:**
  - Pengujian live HTTP POST `action=get_all` langsung ke endpoint GAS Web App berhasil 100%:
    - **HTTP Status:** `200 OK`
    - **Status Respon JSON:** `success`
    - **Data Swaps:** Terbaca `61` record data riil Google Sheets (sheet `SWAP`).
    - **Data Schedules:** Terbaca `7` jadwal (sheet `SCEDHULE`).
    - **Data Users:** Terbaca `18` pengguna aktif (sheet `USER`).
    - **Sampel Data Transaksi:** `DA01/CHG/2026/SWAP/0001` (Unit 1651, Battery Before 0.19 -> After 1, Operator SRIYANTO, Swap Station SWAP 02).
- **Status Akhir:** Sinkronisasi antara aplikasi PWA (Netlify) dan database Google Sheets telah pulih sepenuhnya dan beroperasi normal.

#### 24. 🔄 Pengurutan Riwayat Transaksi Charging Swap (Inputan Terakhir Tampil Paling Atas) (02 Oktober 2026):
- **Latar Belakang & Kebutuhan:**
  - Pengguna meminta agar pada menu **Operation** ➔ sub-menu **Charging Swap**, daftar histori transaksi diurutkan sehingga data yang terakhir di-input selalu tampil di baris paling atas (*newest input at the top*).
- **Akar Penyebab Masalah Sebelumnya:**
  - Fungsi pembanding `sortTransactionsLatestFirst` sebelumnya mendahulukan pembandingan tanggal kalender (`date`) dan jam transaksi (`jamIn`).
  - Hal ini menyebabkan transaksi yang diinput dengan tanggal terdahulu (misal data susulan `28/09/2026` pada ID `SWAP/0061`) atau jam lebih pagi terlempar ke urutan paling bawah tabel, meskipun transaksi tersebut adalah inputan paling akhir di database.
- **Pembaruan Sistem yang Diterapkan:**
  1. **Helper Ekstraksi ID Presisi (`extractSwapIdNumber`):**
     - Mengekstrak angka urut sekuensial ID (`DA01/CHG/2026/SWAP/XXXX` ➔ integer numerik) secara akurat.
  2. **Restrukturisasi Total `sortTransactionsLatestFirst(a, b)`:**
     - **Prioritas 1:** Timestamp input lokal (`_inputTimestamp`) saat input baru disimpan pada sesi browser aktif.
     - **Prioritas 2:** Nomor urut sekuensial ID (`numB - numA`, descending) sehingga nomor transaksi terbesar/terakhir selalu di posisi #1.
     - **Prioritas 3:** Urutan baris asli Google Sheets (`_sheetRow`, descending) sehingga baris terbawah sheet selalu tampil di puncak tabel.
     - **Fallback:** Tanggal kalender descending dan jam transaksi descending.
  3. **Penanda Input Baru pada Form Input:**
     - Menetapkan `_inputTimestamp: Date.now()` dan `_sheetRow` tertinggi pada `modalAddSwap` dan `dedicatedSwap` saat tombol simpan ditekan.
  4. **Penyelarasan Sinkronisasi:**
     - Menyelaraskan pengurutan pada `initDataSync` dan `handleFirestoreSwapsUpdate`.
  5. **Pengujian Nyata Data Riil Database (61 Records):**
     - Posisi 1 (Paling Atas): `DA01/CHG/2026/SWAP/0061` (Row 62, DT 1602, 28/09/2026).
     - Posisi 2: `DA01/CHG/2026/SWAP/0060` (Row 61, DT 1606, 01/10/2026).
     - Posisi 3: `DA01/CHG/2026/SWAP/0059` (Row 60, DT 1660).
     - ...
     - Posisi 61 (Paling Bawah): `DA01/CHG/2026/SWAP/0001` (Row 2, DT 1651).
     - Transaksi baru (`0062`) otomatis menempati posisi puncak #1 seketika disimpan.
  6. **Pembaruan Cache & Service Worker:**
     - Build ID dinaikkan ke **`2026.10.02.v34`**.
     - Service Worker cache dinaikkan ke **`charging-ev-v34`** di `sw.js`.
  7. **Deployment:**
     - Berhasil dideploy ke Google Apps Script Production Versi 82 (`@82`).

#### 25. 📱💻🖥️ Master Universal Responsive & UI/UX Audit Engine v35 (Mobile, iPad, Tablet, Desktop, 4K & Ultra-Wide) (02 Oktober 2026):
- **Latar Belakang & Kebutuhan:**
  - Pengguna meminta perombakan total audit style UI/UX pada versi Mobile, iPad/Tablet, dan Desktop agar otomatis menyesuaikan dengan sempurna saat berpindah perangkat (*auto-fit, auto-scale, auto-sync*).
  - Tampilan harus responsif dan adaptif di seluruh resolusi layar (dari layar saku 320px iPhone SE, foldable, iPad Air/Pro portrait & landscape, laptop FHD, hingga monitor 4K 3840px).
- **Hasil Audit Masalah UI/UX Terdahulu:**
  1. *iPad Trap:* Breakpoint sidebar sebelumnya adalah `@media (max-width: 768px)`. Perangkat iPad Air (820px) dan iPad Pro 11" (834px) dalam orientasi portrait terjebak dalam mode desktop dengan sidebar kaku 250px dan padding 22px, menyisakan area konten hanya ~500px sehingga tabel dan kartu terjepit.
  2. *Chart Distortion on Rotate:* Sebanyak 8 grafik analitik Chart.js tidak memiliki listener event `resize` / `orientationchange`, menyebabkan grafik terdistorsi atau terpotong saat orientasi perangkat diputar (portrait ke landscape).
  3. *Inconsistent Touch Targets:* Tombol aksi tertentu pada mobile memiliki area sentuh < 36px, rentan salah pencet (*fat-finger issues*) di lapangan.
  4. *iOS Input Auto-Zoom:* Input field dengan font-size di bawah 16px memicu auto-zoom browser iOS Safari/WebKit yang mengganggu navigasi.
- **Pembaruan Sistem yang Diterapkan:**
  1. **Solusi "iPad Trap" & Drawer Adaptif 1024px:**
     - Di `index.html`, fungsi `closeAppSidebar`, `openAppSidebar`, dan `toggleAppSidebar` diperbarui menggunakan kondisi `window.innerWidth <= 1024`.
     - CSS drawer sidebar dinaikkan dari `max-width: 768px` ke `max-width: 1024px`. Tablet dan iPad kini mendapatkan pengalaman kanvas 100% full-screen dengan drawer off-canvas yang mulus dan backdrop sentuh.
  2. **Fluid Typography & CSS Root Dynamic Clamp:**
     - Diinjeksikan Master Universal Responsive CSS Suite (V35.0) dengan root `--fs-root: clamp(13px, 0.85rem + 0.35vw, 16px)`.
     - Teks judul, angka KPI, sub-heading, dan badan kartu menggunakan fluid `clamp()` sehingga tidak pernah terpotong di layar kecil (320px) dan tetap elegan di monitor 4K.
  3. **Auto-Fit & Responsive Grid System:**
     - Grid metrik KPI otomatis menyesuaikan: `grid-template-columns: repeat(auto-fit, minmax(clamp(150px, 22vw, 240px), 1fr))`.
     - Quad Chart Grid analitik BI otomatis bertransisi mulus: 4 kolom pada ultra-wide 4K, 2 kolom pada desktop/tablet landscape, dan 1 kolom bertumpuk rapi pada tablet portrait & mobile.
  4. **Auto-Resize & Orientation Synchronization Controller di JS:**
     - Ditambahkan controller sinkronisasi otomatis dengan listener `resize` dan `orientationchange` (debounce 120ms).
     - Menyelaraskan ulang seluruh 8 instance Chart.js (`chartPpaKetepatan`, `chartPpaFreqDaily`, `chartPpaFreqWeekly`, `chartPpaFreqMonthly`, `chartPpaRoomCompare`, `chartPpaEnergyUnit`, `chartPpaEnergyDaily`, `chartPpaProblemBreakdown`) secara otomatis tanpa delay ataupun canvas blur.
     - Menyinkronkan penutupan drawer saat viewport membesar/mengecil dan menandai atribut `data-device-mode` pada `<body>`.
  5. **Touch Ergonomics & Apple HIG / Material 3 Compliance:**
     - Tombol aksi dan kontrol sentuh memiliki ukuran target minimal 44x44px pada layar pointer sentuh.
     - Penambahan padding safe-area insets (`env(safe-area-inset-bottom)`, `env(safe-area-inset-top)`) untuk dukungan iPhone Dynamic Island dan Home Indicator.
     - Proteksi font-size input minimal 16px pada viewport mobile untuk mencegah iOS WebKit auto-zoom.
  6. **Modal Dialog Container Containment:**
     - Seluruh 24 modal dialog dibatasi dengan `width: min(94vw, 680px)` dan `max-height: min(90vh, 760px)` dengan scroll elastis `-webkit-overflow-scrolling: touch` dan backdrop filter blur.
  7. **Pembaruan Build & Cache:**
     - `APP_BUILD_ID`: `'2026.10.02.v35'` di `index.html`.
     - Service Worker Cache: `'charging-ev-v35'` di `sw.js`.
     - Validasi sintaks JS Service Worker dan inline scripts diuji dan lolos 100%.


#### 26. 📱🛠️ Resolusi Tuntas Scroll Modal Revisi / Edit Transaksi pada Akses Mobile (HP) (03 Oktober 2026):
- **Latar Belakang & Gejala:**
  - Pengguna melaporkan bahwa pada menu **Operation** ➔ sub-menu **Charging Swap**, saat membuka dialog revisi/edit data transaksi (modal `Edit Data Transaksi`), tampilan terpotong pada isian bawah (Bat In / Bat Out) dan **sama sekali tidak bisa di-scroll naik-turun** pada perangkat ponsel (HP).
  - Akibatnya, operator lapangan tidak dapat melihat isian Status, Remark/Keterangan kendala, serta tidak dapat menekan tombol **[ Simpan Perubahan ]** maupun **[ Batal ]**.
- **Akar Masalah (Root Cause):**
  1. *Block Form in Column Flex:* `.modal-dialog` menerapkan `display: flex !important; flex-direction: column !important; overflow: hidden !important; max-height: calc(100dvh - 24px) !important;`. Di dalamnya, elemen `<form id="formEditRecord">` tidak memiliki aturan CSS khusus sehingga berstatus default browser `display: block; height: auto;`.
  2. *Unconstrained Form Expansion:* Karena `<form>` adalah elemen block tanpa batas tinggi, isian di dalamnya (`.modal-body-ent`) mengembang penuh secara alami (~957px). Karena tingginya tidak dibatasi oleh flexbox container, browser mengabaikan properti `flex: 1 1 auto` pada `.modal-body-ent` dan tidak memicu overflow scrollbar internal (`bodyCanScroll: false`).
  3. *Overflow Clipping:* Kontainer luar `.modal-dialog` memotong konten pada batas tinggi layar (726px) karena `overflow: hidden !important;`. Akibatnya, bagian bawah form (~230px ke bawah) terpotong dan tersembunyi tanpa konteks scroll apapun (`actualScrollTop: 0, didScroll: false`).
- **Pembaruan Sistem yang Diterapkan:**
  1. **Universal Modal Form Flexbox Containment (`index.html`):**
     - Menambahkan aturan universal `.modal-dialog > form, .modal-dialog form`:
       `display: flex !important; flex-direction: column !important; flex: 1 1 auto !important; min-height: 0 !important; height: 100% !important; max-height: 100% !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important; width: 100% !important; box-sizing: border-box !important;`.
     - Memberikan `min-height: 0 !important;` yang krusial pada level CSS Flexbox agar form diizinkan mengecil sesuai tinggi viewport yang tersedia.
  2. **Scrollable Modal Body dengan Momentum Touch & Overscroll Contain:**
     - `.modal-body-ent` kini berfungsi sebagai flex child sejati di dalam form:
       `flex: 1 1 auto !important; min-height: 0 !important; overflow-y: auto !important; overflow-x: hidden !important; -webkit-overflow-scrolling: touch !important; overscroll-behavior-y: contain !important; touch-action: pan-y !important;`.
     - Ditambahkan padding bawah lapang `padding: 14px 14px 30px 14px !important;` agar isian paling bawah (Remark / Problem) memiliki ruang bernapas yang nyaman di atas footer.
  3. **Fixed Floating Header & Anchored Action Footer:**
     - `.modal-header-ent`: Dilengkapi `flex-shrink: 0 !important;` sehingga judul dan tombol silang `[ ✕ ]` tetap terkunci di bagian atas.
     - `.modal-footer-ent`: Dilengkapi `flex-shrink: 0 !important;` dan bayangan lembut elevasi sehingga tombol aksi **[ Batal ]** dan **[ Simpan Perubahan ]** selalu terpampang jelas di dasar modal dan dapat ditekan kapan saja tanpa perlu mencari-cari.
  4. **Solid Slate Backdrop & Custom Styled Scrollbar:**
     - `.modal-overlay` ditingkatkan dengan `z-index: 5000 !important; background: rgba(15, 23, 42, 0.65) !important;` dan scrolling fallback.
     - Ditambahkan visual scrollbar modern (`::-webkit-scrollbar`) berlebar 6px dengan thumb abu-abu halus agar pengguna mendapatkan isyarat visual yang jelas bahwa konten modal dapat digulirkan.
  5. **Pengujian Komprehensif Chrome Headless Mobile (CDP 390x750px):**
     - Sebelum perbaikan: `bodyCanScroll: false`, `attemptedScrollTop: 300`, `actualScrollTop: 0`, `didScroll: false`.
     - Sesudah perbaikan: `bodyCanScroll: true`, `actualScrollTop: 300`, `didScroll: true`, seluruh 13 field form dan 2 tombol footer terlihat sempurna.
  6. **Pembaruan Cache & Build PWA:**
     - `APP_BUILD_ID`: Dinaikkan ke **`2026.10.03.v36`** di `index.html`.
     - `sw.js`: Cache Service Worker dinaikkan ke **`charging-ev-v36`**.
     - Query string registrasi Service Worker dinaikkan ke `?v=36`.
 
---

#### 27. 📊 Standarisasi Penuh Export Excel Transaksi (100% Identik Master Database Google Sheets DATA INPUT) (04 Oktober 2026):
- **Latar Belakang & Permintaan Pengguna:**
  - Pengguna meminta agar hasil unduhan tombol **`[ Export Data (.xlsx) ]`** pada menu **Operation** ➔ sub-menu **Charging Swap Transaction** dibuat **sama persis dengan databasenya**.
- **Analisis & Masalah pada Format Export Terdahulu:**
  1. *Susunan Kolom Berantakan:* File ekspor lama hanya memiliki 17 kolom dengan urutan sembarangan (`Manpower`, `NIK`, `Transaction ID`, `Category`, `Unit`, `Date`, ...), sedangkan database master Google Sheets (`DATA INPUT`) memiliki 20 kolom terstruktur dimulai dari `TRANSACTION ID`.
  2. *Kolom Hilang:* Sebanyak 3 kolom penting di database tidak ter-ekspor (`KETERANGAN`, `TIME SCH`, dan `SWAP STATION`).
  3. *Nama Kolom Tidak Seragam:* Header lama menggunakan bahasa Inggris informal (`Duration (Min)`, `Unit`, `Remark`, dll.) yang berbeda dengan header database resmi.
  4. *Nama Sheet Berbeda:* Sheet Excel lama dinamai `"Transactions"` alih-alih `"DATA INPUT"`.
  5. *Inkompatibilitas Re-Import:* File ekspor tidak bisa di-*copy-paste* langsung ke Google Sheets karena posisi kolom tidak sejajar.
- **Pembaruan Sistem yang Diterapkan:**
  1. **Susunan 20 Kolom Master Database (1-to-1 Identik Presisi):**
     - **Kolom 1 (A):** `TRANSACTION ID`
     - **Kolom 2 (B):** `DATE`
     - **Kolom 3 (C):** `SHIFT`
     - **Kolom 4 (D):** `CATEGORY`
     - **Kolom 5 (E):** `LOCATION`
     - **Kolom 6 (F):** `KODE UNIT` (kode murni armada seperti di Google Sheets misal `1614`, tanpa prefix `DT`)
     - **Kolom 7 (G):** `HM` (Hour meter)
     - **Kolom 8 (H):** `BATTERY BEFORE` (Persentase baterai masuk rapi misal `25%`)
     - **Kolom 9 (I):** `JAM IN SWAP` (Waktu masuk swap)
     - **Kolom 10 (J):** `BATTERY AFTER` (Persentase baterai keluar rapi misal `100%`)
     - **Kolom 11 (K):** `JAM OUT SWAP` (Waktu keluar swap)
     - **Kolom 12 (L):** `CHARGING TIME (MENIT)` (Durasi menit numerik)
     - **Kolom 13 (M):** `ENERGY (KWH)` (Energi kWh numerik desimal 2 angka)
     - **Kolom 14 (N):** `STATUS REMARK` (`Non-Schedule`, `On Time`, `Out Off Time`)
     - **Kolom 15 (O):** `PROBLEM REMARK` (Kategori kendala / `13.NO PROBLEM`)
     - **Kolom 16 (P):** `MANPOWER` (Nama operator)
     - **Kolom 17 (Q):** `NIK` (NIK operator)
     - **Kolom 18 (R):** `KETERANGAN` (Catatan detail lapangan)
     - **Kolom 19 (S):** `TIME SCH` (Target waktu jadwal swap)
     - **Kolom 20 (T):** `SWAP STATION` (Identitas mesin swap: `SWAP 01`, `SWAP 02`, `SWAP 03`)
  2. **Nama Sheet & Standar Workbook Excel:**
     - Nama lembar kerja (*worksheet*): **`DATA INPUT`**.
     - Auto-filter dropdown Excel aktif di baris header 1 (`A1:T...`).
     - Freeze pane baris 1 aktif (header terkunci diam saat digulirkan ke bawah).
     - Lebar kolom proporsional (*custom column widths*) untuk semua 20 kolom sehingga tidak ada teks terpotong atau cell `###`.
  3. **Modal Dialog Pilihan Jangkauan Export Pintar (`#modalExportDataChoice`):**
     - Jika tabel sedang memfilter data (misal pencarian, shift, tanggal, atau lokasi):
       - Muncul pop-up modal modern elegan:
         - **Opsi 1:** `[ 📄 Export Data Terfilter Saja ({N} Baris) ]`
         - **Opsi 2:** `[ 🌐 Export Seluruh Master Database ({Total} Baris) ]`
     - Jika tabel tidak memfilter data:
       - Mengklik tombol langsung mengunduh seluruh database secara instan (1 klik tanpa jeda).
  4. **Penyelarasan Ekspor Cadangan (Tab Backup & Migrasi):**
     - Fungsi `exportSwapsExcel()`, `exportAllToExcelMultiSheet()`, dan `exportSwapsCSV()` diselaraskan menggunakan standar 20 kolom `DATA INPUT` yang sama.
  5. **Pengujian Nyata End-to-End Headless Chrome (CDP):**
     - Teruji sukses 100% membuka modal pilihan jangkauan, mengekspor 20 kolom lengkap, format persis sama dengan database Google Sheets.
  6. **Pembaruan Build, Cache & Deployment:**
     - Build ID: `2026.10.04.v45` di `index.html`.
     - Service Worker Cache: `charging-ev-v45` di `sw.js`.
     - Google Apps Script Production: **`@93`** (Deployment ID `AKfycbz1S0_VHO2QaVFEKFjRxhtFhlCHqxI9MyNffFSM6iTfQA02lio6VAM_bf41vIRCk8Bh5Q`).
     - Git Commit & Push: `61f2588` pada branch `main` GitHub repo [urdailymotion/CHARGING-EV_SCM-1.2](https://github.com/urdailymotion/CHARGING-EV_SCM-1.2.git).

---

### 🌐 Status Deployment & Versi:
1. **Google Apps Script (GAS Production):**
   - **Deployment ID:** `AKfycbz1S0_VHO2QaVFEKFjRxhtFhlCHqxI9MyNffFSM6iTfQA02lio6VAM_bf41vIRCk8Bh5Q`
   - **Versi Rilis:** `@94` (Export Excel Direct 1-Click Filtered & Reminder Unfiltered v46)
   - **Tautan Live GAS:** https://script.google.com/macros/s/AKfycbz1S0_VHO2QaVFEKFjRxhtFhlCHqxI9MyNffFSM6iTfQA02lio6VAM_bf41vIRCk8Bh5Q/exec

2. **GitHub Repository & Netlify:**
   - **Remote URL:** https://github.com/urdailymotion/CHARGING-EV_SCM-1.2.git
   - **Branch:** `main`
   - **Service Worker Cache:** `charging-ev-v46`
   - **Anti-Cache Headers:** Aktif via `_headers` & `netlify.toml`

---

## 📌 PEMBARUAN TERAKHIR: 04 OKTOBER 2026 (BUILD v46 - EXPORT 1-KLIK LANGSUNG & REMINDER FILTER)

### 🎯 Sasaran Permintaan User:
1. Menghilangkan pop-up pilihan export jika pengguna sudah memasang filter (Tanggal, Shift, Lokasi, atau Pencarian). Ekspor langsung terunduh secara instan dalam 1 kali klik sesuai data yang tampil di layar.
2. Jika filter belum diaktifkan (seluruh data riwayat 8.400+ baris tampil), tampilkan pop-up notifikasi peringatan (*reminder modal*) yang menyarankan pengguna untuk mengaktifkan filter terlebih dahulu atau tetap mengekspor seluruh master database.

### 🛠️ Rincian Perubahan yang Diterapkan:
1. **Penerapan Alur Pintar di `exportFullCSV()` / `exportFullExcel()` ([index.html](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/index.html)):**
   - **Kondisi A (Filter Aktif):**
     - Mendeteksi apakah salah satu filter sedang aktif: `#filterStartDate`, `#filterEndDate`, `#filterShiftSelect !== 'ALL'`, `#filterLocationSelect !== 'ALL'`, atau `#inputTableSearch` terisi.
     - **0 MODAL / POPUP!** Data yang sedang difilter (`activeFilteredList`) langsung diekspor seketika ke file Excel (.xlsx).
     - Nama file otomatis memuat tag filter aktif (misal: `DATA_INPUT_Charging_Swap_FILTERED_Shift1_ROOMA1_2026-10-04.xlsx`).
     - Menampilkan toast informatif: `Mengunduh {N} data transaksi sesuai filter...`.
   - **Kondisi B (Filter Belum Aktif):**
     - Membuka modal peringatan cerdas `#modalExportNoFilterAlert`.
2. **Desain Pop-Up Pengingat Modern & Elegan (`#modalExportNoFilterAlert`):**
   - **Header Premium:** Dark slate navy (`#0f172a`) dengan aksen garis emas/amber (`#f59e0b`) dan badge peringatan visual segitiga bercahaya.
   - **Kotak Peringatan:** Menjelaskan bahwa tabel belum difilter dan sistem akan mengekspor seluruh master database transaksi sebanyak `{N}` baris (ke sheet `DATA INPUT` dengan susunan 20 kolom presisi).
   - **Tombol Rekomendasi Utama:**
     - `[ 🔍 Pasang Filter Dahulu (Disarankan) ]` (`#btnFocusTableFilters`)
     - Mengklik tombol ini otomatis menutup modal, melakukan *smooth-scroll* ke baris form filter (`.search-form-row`), memfokuskan kursor ke input tanggal awal (`#filterStartDate`), dan memberikan efek animasi denyut lembut (*pulse highlight*) selama 2,5 detik agar operator langsung melihat posisi pengisian filter.
   - **Tombol Aksi Alternatif:**
     - `[ 🌐 Tetap Ekspor Seluruh Database ({Total} Baris) ]` (`#btnConfirmExportAll`)
     - Mengklik tombol ini mengekspor seluruh master database tanpa batasan (misal untuk backup berkala).
   - **Tombol Batal:**
     - Menutup modal dengan aman.
3. **Standar File Excel (.xlsx) Tetap 100% Identik Database Google Sheets:**
   - 20 kolom berurutan: `TRANSACTION ID` s/d `SWAP STATION`.
   - Nama sheet: `DATA INPUT`.
   - Auto-filter di baris 1 (`A1:T...`).
   - Freeze row 1 aktif.
4. **Verifikasi End-to-End Headless Chrome (CDP Testing):**
   - Uji 1: Klik export saat tanpa filter -> Modal peringatan `#modalExportNoFilterAlert` tampil sempurna dengan penghitung baris akurat (`isVisible: true`).
   - Uji 2: Klik "Pasang Filter Dahulu" -> Modal menutup (`isClosed: true`), fokus beralih ke form filter.
   - Uji 3: Klik export saat filter aktif (Shift 1) -> Modal tidak muncul sama sekali (`modalShown: false`), file `DATA_INPUT_Charging_Swap_FILTERED_Shift1_2026-10-04.xlsx` (Sheet: `DATA INPUT`, 20 kolom) terunduh langsung dalam 1 klik.
5. **Build & Deployment:**
   - Build ID: `2026.10.04.v46` di `index.html`.
   - Cache Name: `charging-ev-v46` di `sw.js`.
   - Service Worker query: `sw.js?v=46`.
   - Google Apps Script: Versi **`@94`** aktif di Deployment ID `AKfycbz1S0_VHO2QaVFEKFjRxhtFhlCHqxI9MyNffFSM6iTfQA02lio6VAM_bf41vIRCk8Bh5Q`.














