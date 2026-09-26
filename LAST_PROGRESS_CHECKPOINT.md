# 📌 CHECKPOINT PROGRES TERAKHIR (CHARGING EV APP)
**Tanggal Pencatatan:** 27 September 2026, Pukul 06:15 WITA  
**Status Sesi:** Penanganan Bug Auto-Zoom & Adaptasi Responsif Semua Perangkat Mobile (Status: Sukses Terverifikasi)

---

### 📋 Ringkasan Pekerjaan Hari Ini (27 September 2026):

#### 1. 🔍 Diagnosis Mendalam Bug "Auto-Zoom" & Inkonsistensi Antar HP:
- **Gejala:** Saat mengisi form input transaksi (misal memilih unit lalu berpindah ke kolom HM / energi), aplikasi di HP otomatis melakukan zoom-in sendiri sehingga tampilan membesar dan harus di-zoom out manual dengan 2 jari.
- **Penyebab Utama (Root Cause):**
  1. **iOS WebKit & Android Chrome 16px Threshold:** Browser mobile secara otomatis memicu pembesaran paksa (*pinch auto-zoom*) setiap kali elemen input yang difokuskan memiliki `font-size < 16px`. Pada CSS sebelumnya, seluruh input di form logsheet memiliki `font-size: 11px - 13px !important`.
  2. **Viewport Meta Tag:** Tag viewport sebelumnya mengizinkan `maximum-scale=5.0` tanpa `user-scalable=no` dan tanpa `viewport-fit=cover`.
  3. **Programmatic Focus Jump:** Fungsi `selectComboboxUnit()` memanggil `focus()` pada `dedSwapHM` tanpa opsi `{ preventScroll: true }`, sehingga memicu lonjakan viewport.
  4. **Overflow pada Layar Sempit (360px):** Form pencarian transaksi dan tombol modal aksi melebihi lebar layar pada ponsel 360px (seperti Samsung Galaxy A-series).

#### 2. 🛠️ Solusi & Perbaikan Komprehensif:
- **Viewport Anti-Zoom & Notch Safe:**
  Diubah menjadi `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">`.
- **Aturan Standar Universal 16px untuk Mobile Input:**
  Semua field input, select, textarea pada perangkat mobile (`max-width: 768px`) kini diproteksi dengan `font-size: 16px !important;` serta `touch-action: manipulation !important;`.
- **Fokus Lembut (Smooth Transition):**
  Fungsi pemilihan unit kini memanggil `hmTarget.focus({ preventScroll: true })` sehingga transisi kursor dari unit ke HM berjalan mulus tanpa lompatan viewport.
- **Skrip Proteksi Gesture & Double-Tap:**
  Ditambahkan pencegah event `gesturestart`/`gesturechange` dan multi-touch zoom liar di `<head>`.
- **Safe Area Insets (iOS iPhone Notch & Android Gesture Bar):**
  Diterapkan `env(safe-area-inset-top)` dan `env(safe-area-inset-bottom)` pada header dan wrapper utama.
- **Adaptasi Layar 360px - 430px (Zero Overflow):**
  - Form pencarian 2 kolom dibuat fleksibel tanpa overflow (`min-width: 0`).
  - Container tombol aksi modal kini membungkus rapi (*responsive wrap*).
  - Baris sesi terkunci dialihkan ke 2 baris pada layar `<= 520px` agar pemilih tanggal tidak terjepit.
- **Pembaruan Service Worker Caching:**
  Versi cache di [sw.js](file:///e:/APLIKASI%20SRY/CHARGING%20EV%202/sw.js) dinaikkan ke `charging-ev-v2` untuk memaksa ponsel memperbarui aset ke versi terbaru secara instan.

#### 3. 🧪 Verifikasi Headless CDP Multi-Device:
- **Pengujian Ukuran Layar:**
  - Samsung Small (360x800): `overflowCount: 0`, `leakingContainers: []`, `docScrollW: 360px`, `hasHorizScroll: false`.
  - iPhone 13/14 (390x844): `overflowCount: 0`, `leakingContainers: []`, `docScrollW: 390px`.
  - Android Standard (412x915): `overflowCount: 0`, `leakingContainers: []`, `docScrollW: 412px`.
  - iPhone Pro Max (430x932): `overflowCount: 0`, `leakingContainers: []`, `docScrollW: 430px`.
- **Pengujian Transisi Input:**
  - Simulasi memilih unit `DT 1601` lalu fokus ke HM: `visualViewport.scale` tetap **1.0** (tidak zoom sama sekali), `scrollX: 0`, `scrollY: 0`.

---

### 🌐 Status Deployment & Versi:
1. **Google Apps Script (GAS Production):**
   - **Deployment ID:** `AKfycbz1S0_VHO2QaVFEKFjRxhtFhlCHqxI9MyNffFSM6iTfQA02lio6VAM_bf41vIRCk8Bh5Q`
   - **Versi Terpasang:** **Versi 43** (Auto Deploy 27 September 2026, 06:13 WITA)
   - **Tautan Live GAS:** https://script.google.com/macros/s/AKfycbz1S0_VHO2QaVFEKFjRxhtFhlCHqxI9MyNffFSM6iTfQA02lio6VAM_bf41vIRCk8Bh5Q/exec

2. **GitHub Repository:**
   - **Remote URL:** https://github.com/urdailymotion/CHARGING-EV_SCM-1.2.git
   - **Branch:** `main`
