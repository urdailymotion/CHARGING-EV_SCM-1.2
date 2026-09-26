# ðŸ—ï¸ FULL ARCHITECTURE PROMPT

# EV OPERATIONAL PERFORMANCE â€” v1.0

**Disusun oleh:** ARCHON â€” Senior Full Stack Architect
**Status:** APPROVED / ACC
**Target:** Web + Mobile
**Deployment:** Cloud
**Connectivity:** Online Only
**Developer:** Solo Developer
**Architecture:** Modular Monolith
**Database:** PostgreSQL
**Integration:** Google Spreadsheet + Excel/CSV
**Primary Domain:** EV Fleet Charging / Battery Swap Operational Performance

---

# [BAGIAN 1] â€” EXECUTIVE SUMMARY & VISI PRODUK

## 1.1 Nama Produk

**Nama:** EV Operational Performance

**Tagline:**

> **â€œSatu sumber data untuk mengendalikan seluruh operasional EV.â€**

Nama dan struktur produk mengikuti konsep aplikasi referensi yang berfokus pada operational performance kendaraan listrik/battery swap.

---

## 1.2 Visi Produk

### Visi 6 Bulan

Membangun satu platform operasional yang menggantikan proses pencatatan manual/spreadsheet menjadi sistem terpusat untuk:

* transaksi charging swap;
* histori operasional;
* problem & downtime;
* schedule dan queue;
* populasi unit;
* KPI;
* user management;
* database management;
* backup;
* export/import.

Target utama bukan membuat sistem yang terlalu kompleks, tetapi membuat **data operasional menjadi konsisten, mudah dicari, dan dapat digunakan sebagai dasar pengambilan keputusan.**

### Visi 2â€“3 Tahun

Sistem dapat berkembang menjadi platform **EV Fleet Operational Intelligence** yang mendukung:

* multi-site;
* multi-tenant;
* real-time monitoring;
* predictive analytics;
* automated alert;
* integrasi ERP;
* integrasi telematics;
* API eksternal;
* mobile operational workflow;
* AI-assisted operational analytics.

---

## 1.3 Target Persona

### Persona 1 â€” Charging Man / Operator

Fokus:

* melakukan charging/swap;
* melihat schedule;
* memproses queue;
* melaporkan problem;
* melihat histori aktivitasnya.

### Persona 2 â€” Group Leader / Supervisor

Fokus:

* monitoring aktivitas shift;
* memastikan transaksi tercatat;
* monitoring problem;
* memonitor downtime;
* mengawasi queue;
* melihat KPI.

Referensi secara eksplisit memperlihatkan role seperti **CHARGING MAN / OPERATOR** dan **GROUP LEADER / SUPERVISOR**.

### Persona 3 â€” Administrator

Fokus:

* user;
* role;
* master unit;
* master data;
* database;
* backup;
* import/export;
* konfigurasi sistem.

### Persona 4 â€” Management

Fokus:

* KPI;
* performance;
* trend;
* downtime;
* swap volume;
* operational efficiency.

---

# 1.4 Unique Value Proposition

Sistem harus memberikan:

1. **Single Source of Truth**
   Semua transaksi berasal dari database yang sama.

2. **Operational Traceability**
   Setiap aktivitas dapat ditelusuri siapa, kapan, unit apa, dan statusnya.

3. **Fast Operational Input**
   Operator dapat melakukan input dari mobile tanpa harus menggunakan komputer.

4. **Management Visibility**
   Supervisor dan management memperoleh KPI tanpa mengolah spreadsheet secara manual.

5. **Controlled Data Management**
   Backup, import, export, dan audit dikontrol oleh sistem.

---

# 1.5 Problem yang Diselesaikan

Sistem dirancang untuk mengurangi:

* pencatatan transaksi manual;
* data tersebar;
* duplikasi data;
* kesulitan mencari histori;
* keterlambatan laporan;
* sulitnya tracking downtime;
* kesalahan schedule;
* tidak adanya audit trail;
* ketergantungan pada spreadsheet sebagai database utama.

---

# 1.6 KPI Keberhasilan Produk

### KPI Sistem

* API p95 < 500 ms untuk operasi standar.
* Availability target MVP â‰¥ 99,5%.
* Error rate API < 1%.
* Backup berhasil â‰¥ 99%.
* Tidak ada duplicate transaction ID.
* 100% transaksi memiliki timestamp dan actor.
* Export data berhasil tanpa kehilangan record.

### KPI Operasional

KPI domain yang perlu tersedia:

* Total swap.
* Swap per shift.
* Swap per unit.
* Swap per operator.
* Problem count.
* Downtime duration.
* Schedule adherence.
* Queue completion.
* Unit availability.
* Operational utilization.

**Catatan:** formula final KPI harus dikonfirmasi dengan definisi operasional perusahaan sebelum production karena file referensi menunjukkan KPI/dashboard tetapi tidak mendefinisikan seluruh rumus bisnisnya.

---

# [BAGIAN 2] â€” DAFTAR LENGKAP FITUR & MODUL

## 2.1 Modul Authentication & Account

**Deskripsi:** Login dan pengelolaan akun.

**User:** Operator, Supervisor, Admin.

**Trigger:** User membuka aplikasi.

**Input:**

* NIK/email/username
* password

**Process:**

```text
Login
â†’ Validate credential
â†’ Validate account status
â†’ Load role
â†’ Generate session
â†’ Redirect dashboard
```

**Output:** authenticated session.

**Business Rule:**

* user inactive tidak dapat login;
* password tidak pernah disimpan plaintext;
* session memiliki expiry;
* akses berdasarkan role.

**Edge Case:**

* password salah;
* account locked;
* session expired;
* token invalid.

**Priority:** MUST HAVE.

---

# 2.2 Modul User & Role Management

**Deskripsi:** Administrasi pengguna.

**User:** Admin.

**Input:**

* NIK;
* nama;
* role;
* status;
* password;
* shift.

**Process:**

```text
Create User
â†’ Validate NIK uniqueness
â†’ Assign Role
â†’ Hash Password
â†’ Save
â†’ Audit Log
```

**Output:** user account.

**Business Rule:**

* NIK unik;
* user inactive tidak dapat login;
* perubahan role dicatat audit log.

**Edge Case:**

* duplicate NIK;
* role dihapus;
* user terakhir dengan role admin dinonaktifkan.

**Priority:** MUST HAVE.

---

# 2.3 Modul Charging Swap Transaction

Ini adalah **core transaction module**.

**Deskripsi:** Pencatatan aktivitas charging/battery swap.

**User:** Operator, Supervisor.

**Trigger:** Operator melakukan proses swap.

**Input minimal:**

* operational date;
* shift;
* unit;
* swap time;
* operator;
* charging category;
* status;
* optional notes.

**Process:**

```text
Select Unit
â†’ Validate Unit
â†’ Validate Operational Status
â†’ Validate Shift
â†’ Create Swap Transaction
â†’ Update Unit State
â†’ Write Audit Log
â†’ Update KPI
```

**Output:**

* transaction ID;
* updated unit status;
* history record;
* KPI update.

**Business Rule:**

1. Transaction ID immutable.
2. Timestamp server menjadi timestamp utama.
3. Unit harus valid.
4. Operator harus memiliki permission.
5. Transaction tidak boleh dibuat untuk unit inactive.
6. Duplicate submission harus ditolak.
7. Delete transaction tidak diperbolehkan untuk transaksi finalized.
8. Koreksi dilakukan melalui correction/void workflow.

**Edge Case:**

* user double-click submit;
* network timeout setelah server berhasil menyimpan;
* unit tidak ditemukan;
* shift tidak aktif;
* duplicate transaction;
* transaction correction.

**Priority:** MUST HAVE.

---

# 2.4 Modul History Daily

**Deskripsi:** Menampilkan seluruh histori aktivitas berdasarkan tanggal.

**User:** Operator, Supervisor, Admin.

**Input:**

* date;
* shift;
* unit;
* operator;
* status.

**Output:**

* table;
* detail transaction;
* summary.

Referensi memang menyediakan halaman **History Daily** sebagai bagian dari Operation.

**Priority:** MUST HAVE.

---

# 2.5 Modul Problem & Downtime

**Deskripsi:** Mencatat gangguan operasional.

**User:** Operator, Supervisor.

**Input:**

* date;
* time;
* unit;
* problem category;
* description;
* start time;
* end time;
* severity;
* status.

**Process:**

```text
Report Problem
â†’ Validate
â†’ Create Incident
â†’ Mark Unit Problematic
â†’ Track Downtime
â†’ Resolve
â†’ Calculate Duration
```

**Business Rule:**

```text
downtime_minutes =
resolved_at - started_at
```

Jika problem masih open:

```text
resolved_at = NULL
```

**Edge Case:**

* downtime overlap;
* end time < start time;
* unresolved incident;
* unit sudah memiliki active downtime.

**Priority:** MUST HAVE.

---

# 2.6 Modul Swap Schedule

**Deskripsi:** Perencanaan aktivitas swap.

**User:** Supervisor, Admin.

**Input:**

* operational date;
* shift;
* unit;
* planned time;
* sequence;
* notes.

Referensi menunjukkan schedule berdasarkan tanggal, shift, unit, waktu, serta aksi edit/delete.

**Priority:** MUST HAVE.

---

# 2.7 Modul Queue Plan

**Deskripsi:** Mengatur urutan unit yang akan diproses.

**User:** Operator, Supervisor.

**Input:**

* unit;
* queue position;
* schedule;
* priority.

**Business Rule:**

* satu unit tidak boleh memiliki duplicate active queue;
* queue position unik dalam scope schedule;
* completed item keluar dari active queue.

**Priority:** MUST HAVE.

---

# 2.8 Modul Visual Analytics & KPI

**Deskripsi:** Dashboard performance.

**User:** Supervisor, Admin, Management.

**Input:** seluruh data transaksi dan operasional.

**Output:**

* total swap;
* daily trend;
* shift performance;
* problem count;
* downtime;
* unit utilization;
* schedule performance.

Referensi menyediakan modul **Visual Analytics & KPI** di bawah Operation.

**Priority:** MUST HAVE.

---

# 2.9 Modul Populasi Unit

**Deskripsi:** Master data armada EV.

**User:** Admin, Supervisor.

**Data minimal:**

* unit code;
* model;
* status;
* location;
* description;
* active flag.

Referensi menampilkan daftar populasi unit dengan kode unit, tipe/model, status operasional, total swap hari ini, lokasi terakhir, keterangan, dan aksi.

**Priority:** MUST HAVE.

---

# 2.10 Modul Database Manager

**Deskripsi:** Pusat pengelolaan data aplikasi.

**User:** Admin.

**Fitur:**

* user data;
* transaction data;
* problem/downtime;
* schedule;
* unit;
* export;
* import;
* backup.

Referensi secara eksplisit menggambarkan Database Management Center sebagai pusat pengelolaan master data dan menyediakan export backup JSON.

**Priority:** MUST HAVE.

---

# 2.11 Modul Import / Export

**Format:**

* CSV;
* XLSX;
* JSON.

**Export:**

* transactions;
* units;
* users;
* schedules;
* problems;
* KPI/report.

**Import:**

* unit;
* master data;
* schedule.

**Business Rule:**

Import menggunakan staging/preview terlebih dahulu:

```text
Upload
â†’ Parse
â†’ Validate
â†’ Preview
â†’ User Confirm
â†’ Commit
â†’ Audit
```

Tidak boleh langsung memasukkan file mentah ke production database.

**Priority:** MUST HAVE.

---

# 2.12 Modul Google Spreadsheet Backup

Referensi menunjukkan konsep backup/sinkronisasi data operasional ke **Google Spreadsheet Master**, termasuk auto-resume agar data baru tidak dikirim ulang.

**Process:**

```text
Database
â†’ Determine last successful sync
â†’ Select unsynced records
â†’ Send to Google Spreadsheet
â†’ Validate response
â†’ Mark sync checkpoint
```

**Business Rule:**

Setiap record harus memiliki:

```text
sync_status
sync_attempts
synced_at
sync_batch_id
```

**Priority:** MUST HAVE.

---

# 2.13 Modul Backup & Restore

**Backup:**

* automated database backup;
* manual JSON export;
* operational export;
* Google Spreadsheet backup.

**Business Rule:**

Restore hanya boleh dilakukan oleh Admin dengan confirmation step.

**Priority:** MUST HAVE.

---

# 2.14 Modul Audit Log

Mencatat:

* login;
* logout;
* create;
* update;
* void;
* delete;
* import;
* export;
* backup;
* restore;
* permission changes.

**Priority:** MUST HAVE.

---

# [BAGIAN 3] â€” DESAIN MENU & NAVIGASI PER ROLE

## ROLE: OPERATOR / CHARGING MAN

```text
DASHBOARD
â”œâ”€â”€ Aktivitas Hari Ini
â”œâ”€â”€ Schedule Berikutnya
â”œâ”€â”€ Queue
â””â”€â”€ Status Operasional

INPUT DATA
â”œâ”€â”€ Input Swap
â””â”€â”€ Report Problem

OPERATION
â”œâ”€â”€ Charging Swap Transaction
â”œâ”€â”€ History Daily
â”œâ”€â”€ Problem & Downtime
â””â”€â”€ Swap Schedule & Queue

PROFIL
â”œâ”€â”€ Profil Saya
â”œâ”€â”€ Ganti Password
â””â”€â”€ Logout
```

---

## ROLE: SUPERVISOR / GROUP LEADER

```text
DASHBOARD
â”œâ”€â”€ Operational KPI
â”œâ”€â”€ Swap Today
â”œâ”€â”€ Problem Today
â”œâ”€â”€ Downtime
â”œâ”€â”€ Queue Status
â””â”€â”€ Schedule Status

INPUT DATA
â”œâ”€â”€ Input Swap
â”œâ”€â”€ Report Problem
â””â”€â”€ Schedule

OPERATION
â”œâ”€â”€ Charging Swap Transaction
â”œâ”€â”€ History Daily
â”œâ”€â”€ Problem & Downtime Log
â”œâ”€â”€ Swap Schedule & Queue Plan
â””â”€â”€ Visual Analytics & KPI

POPULASI UNIT
â”œâ”€â”€ Daftar Unit
â””â”€â”€ Unit Detail

REPORT
â”œâ”€â”€ Daily Performance
â”œâ”€â”€ Shift Performance
â””â”€â”€ Export

PROFIL
â””â”€â”€ Logout
```

---

## ROLE: ADMIN

```text
DASHBOARD
â”œâ”€â”€ System KPI
â”œâ”€â”€ Operational KPI
â””â”€â”€ System Health

INPUT DATA
â”œâ”€â”€ Master Data
â”œâ”€â”€ Unit
â””â”€â”€ Schedule

OPERATION
â”œâ”€â”€ Charging Swap Transaction
â”œâ”€â”€ History Daily
â”œâ”€â”€ Problem & Downtime
â”œâ”€â”€ Schedule & Queue
â””â”€â”€ Visual Analytics & KPI

POPULASI UNIT
â”œâ”€â”€ Unit List
â”œâ”€â”€ Add Unit
â”œâ”€â”€ Edit Unit
â”œâ”€â”€ Unit Status
â””â”€â”€ Unit History

DATABASE MANAGER
â”œâ”€â”€ Users
â”œâ”€â”€ Transactions
â”œâ”€â”€ Problems
â”œâ”€â”€ Schedules
â”œâ”€â”€ Units
â”œâ”€â”€ Import
â”œâ”€â”€ Export
â”œâ”€â”€ Backup
â”œâ”€â”€ Google Spreadsheet Sync
â””â”€â”€ Restore

SECURITY
â”œâ”€â”€ Users
â”œâ”€â”€ Roles
â”œâ”€â”€ Permissions
â”œâ”€â”€ Audit Log
â””â”€â”€ Active Sessions

SYSTEM
â”œâ”€â”€ Configuration
â”œâ”€â”€ Integration
â””â”€â”€ System Health
```

---

# [BAGIAN 4] â€” ARSITEKTUR TEKNIKAL

# 4.1 Architecture Overview

## Pola

**Modular Monolith + REST API**

Kenapa?

Karena:

* hanya satu lokasi;
* user terbatas;
* solo developer;
* deployment lebih sederhana;
* biaya rendah;
* debugging lebih mudah.

Tetapi module boundary harus tegas sehingga dapat diekstrak menjadi service jika bisnis berkembang.

---

## Architecture Diagram

```text
                         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                         â”‚   Web Application   â”‚
                         â”‚      Next.js        â”‚
                         â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                   â”‚
                         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                         â”‚   Mobile App       â”‚
                         â”‚ React Native/Expo  â”‚
                         â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                   â”‚ HTTPS
                                   â–¼
                       â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                       â”‚      API Gateway       â”‚
                       â”‚      NestJS API        â”‚
                       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                   â”‚
        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
        â”‚                          â”‚                           â”‚
        â–¼                          â–¼                           â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Auth Module   â”‚         â”‚ Operation      â”‚         â”‚ Reporting      â”‚
â”‚ RBAC          â”‚         â”‚ Module         â”‚         â”‚ KPI Module     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜         â””â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜         â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                  â”‚
                                  â–¼
                         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                         â”‚   PostgreSQL     â”‚
                         â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                  â”‚
                 â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                 â–¼                â–¼                â–¼
           Object Storage   Backup Service   Sync Service
                                  â”‚
                                  â–¼
                         Google Spreadsheet
```

---

# 4.2 Tech Stack

| Layer      | Teknologi             |   Versi Target | Alasan                 |
| ---------- | --------------------- | -------------: | ---------------------- |
| Web        | Next.js               |    Current LTS | Dashboard dan routing  |
| Language   | TypeScript            | Current stable | Type safety            |
| UI         | Tailwind + shadcn/ui  |        Current | Cepat dan konsisten    |
| Mobile     | React Native + Expo   | Current stable | Satu ekosistem TS      |
| Backend    | NestJS                | Current stable | Modular architecture   |
| ORM        | Prisma                | Current stable | Produktivitas database |
| Database   | PostgreSQL            |            16+ | ACID & relational      |
| Auth       | JWT + Refresh Token   |              â€” | Cocok untuk API        |
| Validation | Zod / class-validator |        Current | Input validation       |
| API Docs   | OpenAPI/Swagger       |        Current | Dokumentasi API        |
| Excel      | ExcelJS               |        Current | XLSX                   |
| CSV        | CSV parser            |        Current | Import/export          |
| Storage    | S3-compatible         |              â€” | Backup/file storage    |
| Monitoring | Managed monitoring    |              â€” | Observability          |
| CI/CD      | GitHub Actions        |              â€” | Automated deployment   |

**Kenapa tidak langsung memakai Redis?**

MVP belum membutuhkannya. Menambahkan Redis sejak hari pertama akan menambah infrastructure dan failure point. Redis baru ditambahkan ketika kebutuhan cache/queue benar-benar muncul.

---

# 4.3 Database Schema

## `users`

```text
id              UUID PK
nik             VARCHAR(50) UNIQUE NOT NULL
name            VARCHAR(150) NOT NULL
email           VARCHAR(255) UNIQUE NULL
password_hash   TEXT NOT NULL
role_id         UUID FK
shift_id        UUID NULL
is_active       BOOLEAN DEFAULT true
last_login_at   TIMESTAMPTZ NULL
created_at      TIMESTAMPTZ NOT NULL
updated_at      TIMESTAMPTZ NOT NULL
```

Index:

```text
UNIQUE(nik)
INDEX(role_id)
INDEX(is_active)
```

---

## `roles`

```text
id
code
name
description
created_at
updated_at
```

---

## `permissions`

```text
id
code
name
description
```

---

## `role_permissions`

```text
role_id FK
permission_id FK
PRIMARY KEY(role_id, permission_id)
```

---

## `shifts`

```text
id
code
name
start_time
end_time
is_active
```

---

## `ev_units`

```text
id                  UUID PK
unit_code           VARCHAR(50) UNIQUE NOT NULL
model               VARCHAR(100)
unit_type           VARCHAR(100)
status              VARCHAR(30) NOT NULL
location            VARCHAR(150)
description         TEXT
last_swap_at        TIMESTAMPTZ
is_active            BOOLEAN DEFAULT true
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

Status:

```text
ACTIVE
INACTIVE
MAINTENANCE
DOWN
```

---

## `swap_transactions`

```text
id                  UUID PK
transaction_no      VARCHAR(50) UNIQUE
operational_date    DATE NOT NULL
shift_id            UUID FK
unit_id             UUID FK
operator_id         UUID FK
swap_at             TIMESTAMPTZ NOT NULL
charging_category   VARCHAR(100)
status              VARCHAR(30)
notes               TEXT
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

Index:

```text
INDEX(operational_date)
INDEX(unit_id, swap_at)
INDEX(operator_id, operational_date)
INDEX(shift_id, operational_date)
UNIQUE(transaction_no)
```

---

## `problems`

```text
id
problem_no
unit_id
reported_by
category
severity
description
started_at
resolved_at
status
resolution
created_at
updated_at
```

---

## `schedules`

```text
id
operational_date
shift_id
unit_id
planned_time
sequence_no
status
notes
created_by
created_at
updated_at
```

Index:

```text
INDEX(operational_date, shift_id)
INDEX(unit_id, operational_date)
```

---

## `queues`

```text
id
schedule_id
unit_id
queue_position
status
queued_at
started_at
completed_at
```

Constraint:

```text
UNIQUE(schedule_id, queue_position)
```

---

## `audit_logs`

```text
id
actor_id
action
entity_type
entity_id
old_data JSONB
new_data JSONB
ip_address
user_agent
created_at
```

Index:

```text
INDEX(actor_id, created_at)
INDEX(entity_type, entity_id)
INDEX(created_at)
```

---

## `sync_checkpoints`

```text
id
provider
dataset
last_synced_at
last_synced_id
status
error_message
updated_at
```

Digunakan untuk mekanisme auto-resume Google Spreadsheet.

---

## `sync_records`

```text
id
provider
entity_type
entity_id
sync_batch_id
status
attempts
synced_at
error_message
created_at
updated_at
```

Unique:

```text
UNIQUE(provider, entity_type, entity_id)
```

---

## `backup_jobs`

```text
id
backup_type
storage_provider
file_path
file_size
checksum
status
started_at
completed_at
created_by
```

---

## `system_settings`

```text
id
key
value JSONB
description
updated_by
updated_at
```

---

# 4.4 API DESIGN

## Authentication

```text
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
POST   /api/v1/auth/change-password
```

## Users

```text
GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/:id
PATCH  /api/v1/users/:id
PATCH  /api/v1/users/:id/status
DELETE /api/v1/users/:id
```

## Roles

```text
GET    /api/v1/roles
POST   /api/v1/roles
PATCH  /api/v1/roles/:id
GET    /api/v1/roles/:id/permissions
PUT    /api/v1/roles/:id/permissions
```

## Units

```text
GET    /api/v1/units
POST   /api/v1/units
GET    /api/v1/units/:id
PATCH  /api/v1/units/:id
PATCH  /api/v1/units/:id/status
GET    /api/v1/units/:id/history
```

## Swap

```text
GET    /api/v1/swaps
POST   /api/v1/swaps
GET    /api/v1/swaps/:id
POST   /api/v1/swaps/:id/void
POST   /api/v1/swaps/:id/correct
```

## Problems

```text
GET    /api/v1/problems
POST   /api/v1/problems
GET    /api/v1/problems/:id
PATCH  /api/v1/problems/:id
POST   /api/v1/problems/:id/resolve
```

## Schedules

```text
GET    /api/v1/schedules
POST   /api/v1/schedules
GET    /api/v1/schedules/:id
PATCH  /api/v1/schedules/:id
DELETE /api/v1/schedules/:id
```

## Queue

```text
GET    /api/v1/queues
POST   /api/v1/queues
PATCH  /api/v1/queues/:id
POST   /api/v1/queues/:id/start
POST   /api/v1/queues/:id/complete
```

## KPI

```text
GET /api/v1/kpi/dashboard
GET /api/v1/kpi/daily
GET /api/v1/kpi/shift
GET /api/v1/kpi/unit
GET /api/v1/kpi/operator
GET /api/v1/kpi/downtime
```

## Reports

```text
GET /api/v1/reports/daily
GET /api/v1/reports/shift
GET /api/v1/reports/swaps
GET /api/v1/reports/problems
GET /api/v1/reports/downtime
```

## Import / Export

```text
POST /api/v1/import/units
POST /api/v1/import/schedules
GET  /api/v1/export/swaps
GET  /api/v1/export/problems
GET  /api/v1/export/units
GET  /api/v1/export/full
```

## Backup

```text
POST /api/v1/backups
GET  /api/v1/backups
GET  /api/v1/backups/:id
POST /api/v1/backups/:id/restore
```

## Google Spreadsheet

```text
POST /api/v1/integrations/google/sync
GET  /api/v1/integrations/google/status
POST /api/v1/integrations/google/test
```

## Audit

```text
GET /api/v1/audit-logs
GET /api/v1/audit-logs/:id
```

---

# 4.5 Security Architecture

## Authentication

Gunakan:

```text
Short-lived Access Token
+
Rotating Refresh Token
```

Access token digunakan untuk API.

Refresh token digunakan untuk mendapatkan session baru.

---

## RBAC

Permission dibuat granular.

Contoh:

```text
swap:create
swap:read
swap:void

problem:create
problem:read
problem:update

schedule:create
schedule:update

unit:create
unit:update

backup:create
backup:restore

user:create
user:update
```

---

## Role Matrix

| Permission      |  Operator |  Supervisor |  Admin |
| --------------- | --------: | ----------: | -----: |
| Create Swap     |         âœ… |           âœ… |      âœ… |
| View Swap       | Own/Shift |           âœ… |      âœ… |
| Void Swap       |         âŒ |     Limited |      âœ… |
| Create Problem  |         âœ… |           âœ… |      âœ… |
| Resolve Problem |         âŒ |           âœ… |      âœ… |
| Schedule        |      Read |      Manage | Manage |
| Unit            |      Read | Read/Update |   Full |
| Users           |         âŒ |           âŒ |   Full |
| Backup          |         âŒ |           âŒ |   Full |
| Restore         |         âŒ |           âŒ |   Full |
| Audit           |         âŒ |     Limited |   Full |

---

## Security Rules

* HTTPS wajib.
* Password menggunakan Argon2id/bcrypt.
* SQL injection dicegah melalui ORM parameterization.
* Input validation di API.
* Rate limiting login.
* CORS whitelist.
* Secure cookie/token handling.
* Audit log untuk aksi sensitif.
* Secrets tidak boleh berada di Git.
* Database hanya menerima koneksi dari trusted application layer.

---

# 4.6 Caching Strategy

MVP tidak perlu cache agresif.

Cache yang boleh digunakan setelah kebutuhan muncul:

| Data            |         TTL |
| --------------- | ----------: |
| Shift master    |       1 jam |
| Role permission |    15 menit |
| Unit list       |   1â€“5 menit |
| Dashboard KPI   | 30â€“60 detik |
| System config   |    10 menit |

Transaction data **tidak boleh bergantung pada cache sebagai source of truth**.

PostgreSQL tetap menjadi source of truth.

---

# 4.7 Offline-First

**Tidak digunakan pada MVP**, karena requirement yang disepakati adalah online-only.

Namun API dirancang idempotent agar kelak mobile offline-sync dapat ditambahkan.

Setiap mutation penting sebaiknya menerima:

```text
Idempotency-Key
```

Contoh:

```http
POST /api/v1/swaps
Idempotency-Key: 8e4f...
```

Ini mencegah duplicate transaction ketika mobile mengalami timeout.

---

# [BAGIAN 5] â€” STRUKTUR FOLDER & CODEBASE

Gunakan monorepo agar web, mobile, backend, dan shared package dapat berkembang terkontrol.

```text
ev-operational-performance/
â”‚
â”œâ”€â”€ apps/
â”‚   â”‚
â”‚   â”œâ”€â”€ web/
â”‚   â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â”‚   â”œâ”€â”€ (auth)/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ login/
â”‚   â”‚   â”‚   â”‚
â”‚   â”‚   â”‚   â”œâ”€â”€ (dashboard)/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ dashboard/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ swaps/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ history/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ problems/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ schedules/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ analytics/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ units/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ database/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ settings/
â”‚   â”‚   â”‚   â”‚
â”‚   â”‚   â”‚   â””â”€â”€ layout.tsx
â”‚   â”‚   â”‚
â”‚   â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”‚   â”œâ”€â”€ ui/
â”‚   â”‚   â”‚   â”œâ”€â”€ dashboard/
â”‚   â”‚   â”‚   â”œâ”€â”€ swaps/
â”‚   â”‚   â”‚   â”œâ”€â”€ problems/
â”‚   â”‚   â”‚   â””â”€â”€ charts/
â”‚   â”‚   â”‚
â”‚   â”‚   â”œâ”€â”€ hooks/
â”‚   â”‚   â”œâ”€â”€ lib/
â”‚   â”‚   â””â”€â”€ tests/
â”‚   â”‚
â”‚   â”œâ”€â”€ mobile/
â”‚   â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â”œâ”€â”€ screens/
â”‚   â”‚   â”‚   â”œâ”€â”€ dashboard/
â”‚   â”‚   â”‚   â”œâ”€â”€ swap/
â”‚   â”‚   â”‚   â”œâ”€â”€ queue/
â”‚   â”‚   â”‚   â”œâ”€â”€ schedule/
â”‚   â”‚   â”‚   â””â”€â”€ problem/
â”‚   â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ hooks/
â”‚   â”‚   â””â”€â”€ services/
â”‚   â”‚
â”‚   â””â”€â”€ api/
â”‚       â”œâ”€â”€ src/
â”‚       â”‚   â”œâ”€â”€ auth/
â”‚       â”‚   â”œâ”€â”€ users/
â”‚       â”‚   â”œâ”€â”€ roles/
â”‚       â”‚   â”œâ”€â”€ units/
â”‚       â”‚   â”œâ”€â”€ swaps/
â”‚       â”‚   â”œâ”€â”€ problems/
â”‚       â”‚   â”œâ”€â”€ schedules/
â”‚       â”‚   â”œâ”€â”€ queues/
â”‚       â”‚   â”œâ”€â”€ analytics/
â”‚       â”‚   â”œâ”€â”€ reports/
â”‚       â”‚   â”œâ”€â”€ imports/
â”‚       â”‚   â”œâ”€â”€ exports/
â”‚       â”‚   â”œâ”€â”€ backups/
â”‚       â”‚   â”œâ”€â”€ integrations/
â”‚       â”‚   â”œâ”€â”€ audit/
â”‚       â”‚   â””â”€â”€ common/
â”‚       â”‚
â”‚       â””â”€â”€ test/
â”‚
â”œâ”€â”€ packages/
â”‚   â”œâ”€â”€ database/
â”‚   â”‚   â”œâ”€â”€ prisma/
â”‚   â”‚   â””â”€â”€ seed/
â”‚   â”‚
â”‚   â”œâ”€â”€ shared-types/
â”‚   â”œâ”€â”€ validation/
â”‚   â”œâ”€â”€ api-client/
â”‚   â””â”€â”€ config/
â”‚
â”œâ”€â”€ infrastructure/
â”‚   â”œâ”€â”€ docker/
â”‚   â”œâ”€â”€ terraform/
â”‚   â””â”€â”€ monitoring/
â”‚
â”œâ”€â”€ docs/
â”‚   â”œâ”€â”€ architecture/
â”‚   â”œâ”€â”€ api/
â”‚   â”œâ”€â”€ database/
â”‚   â”œâ”€â”€ business-rules/
â”‚   â””â”€â”€ runbooks/
â”‚
â”œâ”€â”€ scripts/
â”‚
â”œâ”€â”€ .github/
â”‚   â””â”€â”€ workflows/
â”‚       â”œâ”€â”€ ci.yml
â”‚       â”œâ”€â”€ staging.yml
â”‚       â””â”€â”€ production.yml
â”‚
â”œâ”€â”€ docker-compose.yml
â”œâ”€â”€ package.json
â”œâ”€â”€ turbo.json
â””â”€â”€ README.md
```

---

# [BAGIAN 6] â€” ROADMAP PENGEMBANGAN

# FASE 0 â€” FOUNDATION

**Minggu 1â€“2**

```text
â–¡ Monorepo
â–¡ TypeScript
â–¡ PostgreSQL
â–¡ Prisma
â–¡ NestJS
â–¡ Next.js
â–¡ Expo
â–¡ Authentication
â–¡ RBAC
â–¡ CI/CD
â–¡ Dev/Staging/Production
â–¡ Logging
```

---

# FASE 1 â€” MVP CORE

**Minggu 3â€“6**

```text
â–¡ User
â–¡ Role
â–¡ Unit
â–¡ Shift
â–¡ Swap Transaction
â–¡ History
â–¡ Problem
â–¡ Downtime
â–¡ Schedule
â–¡ Queue
```

---

# FASE 2 â€” BUSINESS & REPORTING

**Minggu 7â€“10**

```text
â–¡ Dashboard
â–¡ KPI
â–¡ Reports
â–¡ Excel Export
â–¡ CSV Export
â–¡ Import
â–¡ Database Manager
â–¡ Audit Log
â–¡ JSON Backup
```

---

# FASE 3 â€” INTEGRATION

**Minggu 11â€“14**

```text
â–¡ Google Spreadsheet
â–¡ Auto-resume sync
â–¡ Sync monitoring
â–¡ Retry mechanism
â–¡ Backup verification
â–¡ Operational alert
```

---

# FASE 4 â€” SCALE & OPTIMIZE

**Bulan 4+**

```text
â–¡ Multi-site
â–¡ Multi-tenant
â–¡ Real-time monitoring
â–¡ Advanced analytics
â–¡ Telematics integration
â–¡ ERP integration
â–¡ Predictive analytics
â–¡ Mobile offline mode
â–¡ Public API
```

---

# Definition of Done

Setiap fitur dianggap selesai apabila:

```text
â–¡ Business rule sudah terdokumentasi
â–¡ Database migration selesai
â–¡ API selesai
â–¡ Validation selesai
â–¡ Authorization selesai
â–¡ Unit test tersedia
â–¡ Integration test tersedia
â–¡ UI selesai
â–¡ Error handling tersedia
â–¡ Loading state tersedia
â–¡ Empty state tersedia
â–¡ Audit log tersedia untuk aksi sensitif
â–¡ Swagger/API documentation diperbarui
â–¡ Staging berhasil
â–¡ Regression test lulus
â–¡ Tidak ada critical security issue
```

Target test coverage:

```text
Core business logic â‰¥ 80%
```

---

# [BAGIAN 7] â€” SCALABILITY & PERFORMANCE

## 7.1 Horizontal Scaling

Awal:

```text
1 API instance
1 PostgreSQL
1 Storage
```

Jika traffic meningkat:

```text
Load Balancer
      â”‚
 â”Œâ”€â”€â”€â”€â”´â”€â”€â”€â”€â”
 â–¼         â–¼
API #1    API #2
 â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”˜
      â–¼
 PostgreSQL
```

API harus stateless sehingga instance dapat ditambah tanpa perubahan besar.

---

# 7.2 Database Optimization

Wajib:

* index berdasarkan filter utama;
* pagination;
* composite index;
* avoid SELECT *;
* transaction boundary;
* connection pooling;
* query profiling.

Jangan melakukan query seluruh histori untuk dashboard.

Gunakan aggregate query:

```sql
COUNT()
SUM()
AVG()
GROUP BY
```

dengan date range.

---

# 7.3 Pagination

Semua endpoint list wajib pagination.

Contoh:

```text
GET /api/v1/swaps?page=1&limit=25
```

Maximum:

```text
limit <= 100
```

---

# 7.4 CDN

Gunakan CDN untuk:

* static assets;
* application bundle;
* exported public assets bila diperlukan.

Database/API tidak ditempatkan di CDN.

---

# 7.5 Rate Limiting

Contoh baseline:

```text
Login:
5 attempts / minute / IP

Normal API:
100 requests / minute / user

Export:
10 requests / hour / user
```

Nilai final harus disesuaikan dengan traffic aktual.

---

# 7.6 Background Jobs

Gunakan background worker ketika:

* export besar;
* backup;
* Google Spreadsheet sync;
* report generation;
* notification;
* bulk import.

Jangan membuat user menunggu HTTP request 30â€“60 detik hanya untuk export besar.

---

# 7.7 Performance Budget

Target:

```text
API standard p95       < 500ms
Dashboard API p95      < 1000ms
Initial page load      < 2.5s
Database query         < 200ms target
Export async job       < 5 min typical
```

---

# [BAGIAN 8] â€” DISASTER RECOVERY & BUSINESS CONTINUITY

## 8.1 Backup Strategy

### Database

Minimal:

```text
Daily full backup
+
Point-in-time recovery jika provider mendukung
```

### Application Data

Backup:

* database;
* configuration;
* operational exports;
* JSON backup;
* integration checkpoint.

---

# 8.2 RPO

Target MVP:

**RPO â‰¤ 24 jam**

Artinya kehilangan data maksimal ditargetkan tidak lebih dari 24 jam pada skenario disaster backup tertentu.

Setelah sistem menjadi critical operational system:

**RPO target â‰¤ 1 jam**

---

# 8.3 RTO

MVP:

**RTO â‰¤ 4 jam**

Growth:

**RTO â‰¤ 1 jam**

Nilai tersebut adalah target arsitektur, bukan SLA provider.

---

# 8.4 Failover

Awal:

```text
Application
    â†“
Managed PostgreSQL
```

Growth:

```text
Application
    â†“
Database Primary
    â†“
Database Replica
```

Automatic failover hanya diterapkan ketika cost dan operational complexity sudah justified.

---

# 8.5 Health Check

```text
GET /health
GET /health/live
GET /health/ready
```

Contoh:

```json
{
  "status": "ok",
  "database": "ok",
  "storage": "ok",
  "timestamp": "..."
}
```

---

# 8.6 Incident Response

```text
Detect
  â†“
Classify Severity
  â†“
Contain
  â†“
Investigate
  â†“
Recover
  â†“
Verify
  â†“
Postmortem
  â†“
Prevent recurrence
```

---

# [BAGIAN 9] â€” ESTIMASI BIAYA INFRASTRUKTUR

Angka berikut adalah **budget arsitektur**, bukan quotation vendor. Harga aktual bergantung provider, region, storage, traffic, backup, dan penggunaan.

## MVP

Target:

```text
<100 active users/day
1 location
```

Estimasi:

| Komponen           |        Budget/bulan |
| ------------------ | ------------------: |
| API hosting        |              $10â€“30 |
| Managed PostgreSQL |              $15â€“30 |
| Storage            |               $3â€“10 |
| Monitoring         |               $0â€“20 |
| Backup             |               $5â€“15 |
| Domain             |               ~$1â€“2 |
| **Total**          | **Â± $34â€“107/bulan** |

Untuk tahap awal, **Redis tidak wajib**.

---

# GROWTH

Target:

```text
Multiple locations
1.000â€“10.000 active users/day
```

| Komponen         |         Budget/bulan |
| ---------------- | -------------------: |
| API 2+ instances |              $50â€“150 |
| PostgreSQL       |              $75â€“200 |
| Storage          |               $10â€“40 |
| Backup           |               $20â€“50 |
| Monitoring       |               $20â€“50 |
| Redis/Queue      |               $15â€“50 |
| CDN              |                $0â€“30 |
| **Total**        | **Â± $190â€“570/bulan** |

---

# SCALE

Target:

```text
Multi-site
High availability
Large operational dataset
```

Budget awal:

**$1.000+/bulan**

Komponen dapat mencakup:

* multiple API instances;
* managed database HA;
* replicas;
* Redis;
* worker;
* object storage;
* CDN;
* monitoring;
* centralized logging;
* security tooling.

---

# [BAGIAN 10] â€” CHECKLIST PRE-LAUNCH

# SECURITY

```text
â–¡ HTTPS aktif
â–¡ Password hashing aktif
â–¡ JWT/refresh token secure
â–¡ RBAC tested
â–¡ Semua endpoint protected
â–¡ Input validation
â–¡ SQL injection protection
â–¡ XSS protection
â–¡ CSRF strategy
â–¡ Rate limiting
â–¡ CORS configured
â–¡ Secrets tidak ada di Git
â–¡ Production database credentials aman
â–¡ Audit log aktif
â–¡ Dependency vulnerability scan
â–¡ Backup terenkripsi
```

---

# DATABASE

```text
â–¡ Semua FK valid
â–¡ Unique constraint
â–¡ Required index
â–¡ Migration tested
â–¡ Transaction tested
â–¡ Backup tested
â–¡ Restore tested
â–¡ Pagination tested
â–¡ Query N+1 diperiksa
â–¡ Slow query monitoring
```

---

# TRANSACTION

```text
â–¡ Duplicate submission protection
â–¡ Idempotency key
â–¡ Server timestamp
â–¡ Transaction status
â–¡ Void/correction workflow
â–¡ Audit trail
â–¡ Concurrent update tested
â–¡ Timeout handling
```

---

# GOOGLE SPREADSHEET

```text
â–¡ OAuth/service credential aman
â–¡ Spreadsheet ID configurable
â–¡ Sheet mapping configurable
â–¡ Sync checkpoint
â–¡ Duplicate prevention
â–¡ Retry mechanism
â–¡ Failed sync visibility
â–¡ Manual retry
â–¡ Sync history
â–¡ Auto-resume tested
```

Konsep auto-resume dan pencegahan duplikasi ini secara khusus mengikuti pola yang terlihat pada referensi.

---

# PERFORMANCE

```text
â–¡ API p95 tested
â–¡ Dashboard load tested
â–¡ Database indexes verified
â–¡ Large history tested
â–¡ Pagination tested
â–¡ Export large dataset tested
â–¡ Mobile network tested
â–¡ Concurrent transaction tested
```

---

# OPERASIONAL

```text
â–¡ Production environment
â–¡ Staging environment
â–¡ CI/CD
â–¡ Monitoring
â–¡ Error tracking
â–¡ Health check
â–¡ Alerting
â–¡ Backup schedule
â–¡ Restore procedure
â–¡ Rollback procedure
â–¡ Runbook
â–¡ Admin documentation
```

---

# ðŸŽ¯ FINAL ARCHITECTURE PRINCIPLES

Aplikasi ini harus mengikuti prinsip:

```text
1. PostgreSQL = Source of Truth
2. API = Business Logic Authority
3. Mobile/Web = Presentation Layer
4. RBAC = Security Boundary
5. Audit Log = Operational Traceability
6. Backup â‰  Database
7. Google Spreadsheet = Integration/Backup Destination,
   bukan primary database
8. Transaction harus idempotent
9. Jangan menghapus finalized operational records
10. Modular Monolith terlebih dahulu
11. Scale berdasarkan kebutuhan nyata
12. Jangan menambahkan infrastructure sebelum dibutuhkan
```

## âš ï¸ WARNING PALING PENTING

**Jangan menjadikan Google Spreadsheet sebagai database utama.**

Referensi memang menunjukkan sinkronisasi/backup ke Google Spreadsheet Master, tetapi secara arsitektur spreadsheet harus ditempatkan sebagai **integration/export/backup destination**. Database utama tetap PostgreSQL.

Jika spreadsheet dijadikan database utama, masalah yang kemungkinan muncul:

* race condition;
* duplicate data;
* concurrent edit;
* permission terlalu luas;
* performa menurun;
* sulit audit;
* sulit transaction consistency.

---

# ðŸš€ URUTAN IMPLEMENTASI PALING AMAN

```text
STEP 1
Foundation + Database
        â†“
STEP 2
Authentication + RBAC
        â†“
STEP 3
Master Unit + Shift
        â†“
STEP 4
Swap Transaction
        â†“
STEP 5
History
        â†“
STEP 6
Problem + Downtime
        â†“
STEP 7
Schedule + Queue
        â†“
STEP 8
Dashboard + KPI
        â†“
STEP 9
Import / Export
        â†“
STEP 10
Backup + Database Manager
        â†“
STEP 11
Google Spreadsheet Sync
        â†“
STEP 12
Production Hardening
```

# ðŸ DEFINITION OF PRODUCTION READY

Sistem **belum dianggap production-ready** hanya karena UI sudah terlihat seperti referensi.

Production-ready berarti:

```text
UI
+
Business Logic
+
Database Integrity
+
RBAC
+
Audit
+
Backup
+
Restore Test
+
Error Handling
+
Monitoring
+
Security
+
Performance Test
+
Operational Runbook
```

Referensi visual dapat dijadikan **UI/UX baseline**, termasuk struktur navigation dan halaman operation/populasi/database manager, tetapi implementation harus memisahkan presentation dari business logic agar aplikasi tidak menjadi sekadar HTML dashboard dengan data hard-coded. Referensi saat ini sendiri memperlihatkan elemen UI seperti daftar unit, database manager, user/role, transaksi, dan backup sebagai bagian dari prototype.
**END OF ARCHITECTURE v1.0**
