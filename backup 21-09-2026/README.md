# PPA Safe & Strong - EV Charging & Battery Swap System (SCM 1.2)

Aplikasi Enterprise Operasional Manajemen Pertukaran Baterai & Pengisian Daya Truk Listrik (EV Dump Truck 90T) di PT Putra Perkasa Abadi (PPA) Site BIB.

---

## ⚡ Fitur Utama

1. **Dedicated Input & Transaction Logging:**
   - Pencatatan transaksi real-time pertukaran baterai (Swab) dan pengisian daya (Charging).
   - Validasi ketat kode unit, HM, persentase SOC awal/akhir, dan durasi pengisian.
2. **3-Way Strict Schedule Matching:**
   - Pencocokan jadwal otomatis secara ketat berdasarkan **3 Kriteria Sekaligus**: **Kode Unit**, **Tanggal Operasional**, dan **Shift Kerja** (Shift 1 & Shift 2).
   - Deteksi cerdas antar-shift dengan notifikasi informatif tanpa penalti false *Out Off Schedule*.
3. **EV Intelligence Analytics (3 Sub-Modul):**
   - **⚡ Charging Station:** Analisis konsumsi energi (kWh), profil beban per jam, performa port charger, dan perbandingan lokasi ROM.
   - **🔋 Ketahanan Battery:** Analisis daya tahan baterai (HM cycle), laju pengurasan SOC per jam kerja (SOC/hour), dan grading baterai.
   - **⏱️ Swab Cycle Time:** Analisis SLA kecepatan pertukaran baterai (target ≤ 6 menit), throughput per jam, dan evaluasi kompartemen.
4. **Sinkronisasi Multi-Cloud:**
   - Google Sheets Master Spreadsheet sebagai database operasional.
   - Firebase Cloud Firestore untuk sinkronisasi instan dan pencadangan terdistribusi.
   - Google Apps Script (GAS) Web App V8 engine.

---

## 🚀 Live Production Deployment

- **Web App URL:** [PPA Charging EV Live (Versi 42)](https://script.google.com/macros/s/AKfycbz1S0_VHO2QaVFEKFjRxhtFhlCHqxI9MyNffFSM6iTfQA02lio6VAM_bf41vIRCk8Bh5Q/exec)
- **Deployment ID:** `AKfycbz1S0_VHO2QaVFEKFjRxhtFhlCHqxI9MyNffFSM6iTfQA02lio6VAM_bf41vIRCk8Bh5Q`

---

## 📁 Struktur Berkas

- `Code.gs`: Backend Google Apps Script (Data Input, User Auth, Schedule, Cloud Sync, Audit).
- `EvIntelligenceBackend.gs`: Backend analytics engine untuk EV Intelligence (Charging, Battery, Swab Cycle Time).
- `index.html`: Antarmuka utama aplikasi PPA Safe & Strong (Single Page Application).
- `intelligence.html`: Sub-modul analitik interaktif EV Intelligence dengan Chart.js.
- `appsscript.json`: Manifest konfigurasi Google Apps Script.
- `auto-deploy.js`: Otomasi deployment via `@google/clasp`.
- `ARSITECK.MD`: Dokumentasi arsitektur sistem lengkap.
- `LAST_PROGRESS_CHECKPOINT.md`: Catatan progres pengembangan dan riwayat perbaikan.

---

© PT Putra Perkasa Abadi · Site Borneo Indobara (BIB) · SCM Fuel & EV Operations