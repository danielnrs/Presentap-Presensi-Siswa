# PresenTap - Sistem Presensi Berbasis RFID & IoT

PresenTap adalah sistem manajemen dan pemantauan presensi siswa sekolah modern berbasis web yang terintegrasi langsung dengan perangkat RFID secara *real-time* via WebSocket. Dibangun menggunakan **Nuxt 3**, **Prisma ORM**, dan **MySQL**.

---

## ✨ Fitur Utama

- **⚡ Presensi Real-Time (WebSocket):** Terhubung langsung dengan alat RFID / NodeMCU / ESP8266. Data kehadiran siswa otomatis muncul tanpa perlu me-refresh halaman.
- **📊 Dashboard Interaktif Admin:** Menampilkan statistik harian (total siswa, jumlah hadir, tidak hadir/alpa, dan persentase kehadiran).
- **📋 Manajemen Presensi:**
  - Pencatatan Check-in & Check-out otomatis.
  - Mode *Full Screen* untuk display monitor gerbang/sekolah saat jam kedatangan.
  - Input presensi manual (Izin, Sakit, Alpa).
- **👨‍🎓 Manajemen Data Siswa:**
  - CRUD (Tambah, Edit, Hapus) siswa.
  - Perekaman UID kartu RFID otomatis via WebSocket langsung ke formulir pendaftaran siswa.
- **📑 Rekapitulasi & Ekspor Laporan:** Filter data absensi per periode (harian, mingguan, bulanan) atau per kelas, dan ekspor langsung ke format **Excel (.xlsx)** lengkap dengan format rapi.
- **📱 Halaman Publik Siswa / Wali Murid:** Siswa atau orang tua dapat mengecek status kehadiran secara transparan melalui portal publik (`/user`).
- **🔒 Autentikasi Aman:** Sistem otentikasi login admin menggunakan **JWT (JSON Web Token)** dan enkripsi password dengan **bcryptjs**.

---

## 🛠️ Tech Stack

- **Frontend & Framework:** [Nuxt 3](https://nuxt.com/) (Vue 3 + Composition API)
- **State Management:** [Pinia](https://pinia.vuejs.org/)
- **ORM & Database:** [Prisma ORM](https://www.prisma.io/) + [MySQL](https://www.mysql.com/)
- **Real-Time Communication:** [ws](https://github.com/websockets/ws) (WebSocket Server)
- **Ekspor Data:** ExcelJS & xlsx-js-style
- **Styling:** CSS3 Native Custom Styling

---

## 📋 Prasyarat Sistem

Sebelum memulai, pastikan perangkat Anda telah terpasang:
- **Node.js** (versi 18.x atau 20.x ke atas)
- **MySQL Database Server** (XAMPP / Laragon / Docker / MySQL Server)
- Package Manager: `npm`, `pnpm`, atau `yarn`

---

## 🚀 Panduan Instalasi & Menjalankan

### 1. Clone Repositori
```bash
git clone https://github.com/username-anda/presentap.git
cd presentap
```

### 2. Install Dependensi
```bash
npm install
```

### 3. Konfigurasi Lingkungan (`.env`)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Sesuaikan konfigurasi database dan rahasia JWT Anda di file `.env`:
```env
# Database Configuration (MySQL)
DATABASE_URL="mysql://root:@localhost:3306/presentap"

# JWT Secret
JWT_SECRET="kunci-rahasia-anda-yang-aman"

# Konfigurasi Waktu Presensi
MIN_CHECKOUT_INTERVAL_MINUTES=2
MAX_CHECKOUT_HOURS=12

# Node Environment
NODE_ENV=development
```

### 4. Setup Database dengan Prisma
Jalankan migrasi untuk membuat database dan tabel otomatis di MySQL:
```bash
npx prisma migrate dev --name init
```
*(Atau jika ingin sinkronisasi cepat skema tanpa file migration: `npx prisma db push`)*

Generate Prisma Client:
```bash
npx prisma generate
```

*(Opsional)* Anda dapat membuka antarmuka GUI database bawaan Prisma:
```bash
npx prisma studio
```

### 5. Jalankan Server Development
```bash
npm run dev
```

Aplikasi akan berjalan di:
- **Web App:** `http://localhost:3000` (atau IP lokal Anda `http://192.168.x.x:3000`)
- **WebSocket Server:** `ws://localhost:3001` (atau port 3001 pada IP lokal)

---

## 🔌 Integrasi Alat RFID / IoT

Perangkat keras scanner (seperti ESP8266/ESP32 dengan RC522 RFID) dapat mengirimkan tap presensi menggunakan dua cara:

### 1. REST API
- **Endpoint:** `POST /api/attendances/attendance`
- **Headers:** `Content-Type: application/json`
- **Payload:**
  ```json
  {
    "rfid": "A1B2C3D4",
    "timestamp": "2026-03-05T07:15:00"
  }
  ```
- *Dokumentasi lengkap API dapat dilihat di [docs/api-endpoint.md](docs/api-endpoint.md).*

### 2. WebSocket
Kirim pesan JSON ke server WebSocket di port `3001`:
```json
{
  "rfid": "A1B2C3D4"
}
```

---

## 📂 Struktur Direktori Proyek

```text
├── assets/             # File style CSS global
├── components/         # Komponen reusable Vue (Form, Modal, dll.)
│   └── common/
├── docs/               # Dokumentasi API & IoT
├── middleware/         # Middleware otentikasi route (Admin guard)
├── pages/              # Halaman routing Nuxt
│   ├── admin/          # Panel Admin (dashboard, absensi, siswa, rekap)
│   ├── auth/           # Login & Registrasi admin
│   ├── user/           # Tampilan absensi untuk siswa/publik
│   └── index.vue       # Redirect landing
├── prisma/             # Skema Prisma ORM & migrasi database
│   └── schema.prisma
├── public/             # Asset statis publik (ikon, gambar)
├── server/             # Backend Nitro Nuxt 3
│   ├── api/            # REST API Endpoints (presensi, siswa, auth)
│   └── plugins/        # Server plugin (WebSocket Server ws)
├── stores/             # Global Store Pinia
└── nuxt.config.ts      # Konfigurasi Nuxt 3 & Vite
```

---

## 📦 Build untuk Production

Untuk melakukan build ke lingkungan produksi:

```bash
npm run build
```

Jalankan server hasil build:
```bash
node .output/server/index.mjs
```

---

## 📤 Panduan Push ke GitHub

Proyek ini telah dikonfigurasi dengan file [`.gitignore`](.gitignore), sehingga folder berat seperti **`node_modules/`** (hasil `npm install`), folder build **`.output/`** & **`.nuxt/`** (hasil `npm run build`), serta file konfigurasi rahasia **`.env`** **secara otomatis diabaikan** dan tidak akan ikut ter-push ke GitHub.

Berikut langkah-langkah untuk melakukan push ke GitHub secara mandiri:

### 1. Buat Repositori di GitHub
1. Buka [github.com/new](https://github.com/new).
2. Beri nama repositori (contoh: `presentap` atau `presentab_new`).
3. Pilih visibilitas (**Public** atau **Private**).
4. **Jangan** centang *"Add a README file"* (karena repositori lokal sudah memiliki README).
5. Klik **Create repository**, lalu salin URL repositorinya (contoh: `https://github.com/username/presentap.git`).

### 2. Hubungkan Repositori Lokal ke GitHub
Buka terminal di folder proyek ini:

```bash
# Pastikan nama remote mengarah ke repositori Anda
git remote set-url origin https://github.com/<USERNAME>/<NAMA_REPO>.git

# Atau jika belum ada remote 'origin':
git remote add origin https://github.com/<USERNAME>/<NAMA_REPO>.git
```

### 3. Tambahkan File & Commit
```bash
# 1. Cek file mana saja yang akan dimasukkan (node_modules & .output otomatis diabaikan)
git status

# 2. Tambahkan semua file yang diperlukan
git add .

# 3. Buat commit pesan
git commit -m "feat: initial commit presentap school attendance system"
```

### 4. Push ke GitHub
```bash
# Jika cabang (branch) Anda bernama master:
git push -u origin master

# Atau jika menggunakan cabang main:
git branch -M main
git push -u origin main
```

> **Tips Login:**
> - Jika terminal meminta autentikasi, jendela browser **Git Credential Manager** akan terbuka otomatis untuk konfirmasi login.
> - Jika menggunakan **Personal Access Token (PAT)**, gunakan token Anda sebagai pengganti password saat diminta.

---

## 📄 Lisensi
Proyek ini dibuat untuk keperluan manajemen absensi sekolah. Bebas dimodifikasi dan dikembangkan sesuai kebutuhan instansi.
