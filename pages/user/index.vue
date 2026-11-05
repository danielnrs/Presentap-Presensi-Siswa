<template>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <div class="logo-circle">
        <img src="/presentap.png" alt="Logo" class="logo-img" />
      </div>
      <span class="header-text">PresenTap</span>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <div class="card">
        <!-- Title -->
        <div class="title">
          <span class="title-1">Selamat Datang di</span>
          <span class="title-2">Presensi Sekolah</span>
          <span class="title-3">!</span>
        </div>
        <p class="sub-title">
          Orang tua dapat memantau kehadiran anak dengan mudah dan cepat.
        </p>

        <!-- Form Pencarian -->
        <form class="form" @submit.prevent="handleSearch">
          <div class="serch-bar">
            <MagnifyingGlassIcon class="serch-icon" />
            <span>Pencarian Presensi Siswa</span>
          </div>

          <div class="serch-input">
            <!-- Input Nama/NIS -->
            <div class="select-nameOrNis">
              <label for="nameOrNis">Nama Siswa atau NIS</label>
              <input
                v-model="form.nameOrNis"
                type="text"
                id="nameOrNis"
                name="nameOrNis"
                placeholder="Masukkan Nama Siswa atau NIS"
              />
            </div>

            <!-- Periode & Tanggal -->
            <div class="row">
              <div class="select-periode">
                <label for="periode">Periode</label>
                <select v-model="form.periode" id="mode-period">
                  <option value="harian">Harian</option>
                  <option value="mingguan">Mingguan</option>
                </select>
              </div>
              <!-- Input tanggal -->
              <div class="select-date">
                <label for="date">Tanggal</label>
                <input
                  v-model="form.date"
                  type="date"
                  :max="todayStr"
                />
              </div>
            </div>
          </div>

          <!-- Tombol Submit -->
          <button class="btn-submit" :disabled="loading">
            {{ loading ? "Mencari..." : "Cari" }}
          </button>
        </form>

        <!-- Hasil Pencarian -->
        <div v-if="searched" class="results">
          <div v-if="results.length > 0" class="result-list">
            <div
              v-for="(item, index) in results"
              :key="index"
              class="result-card"
            >
              <!-- Header -->
              <div class="result-header">
                <h3 class="result-name">{{ item.name }}</h3>
                <span class="result-date">
                  {{
                    item.tanggal
                      ? new Date(item.tanggal).toLocaleDateString("id-ID", {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })
                      : "-"
                  }}
                </span>
              </div>

              <!-- Body -->
              <div class="result-body">
                <p><strong>NIS</strong> : {{ item.nis }}</p>
                <p><strong>Kelas</strong> : {{ item.class }}</p>
                <p>
                  <strong>Jam Masuk</strong> :
                  {{
                    item.attendance && item.attendance.checkInTime
                      ? new Date(item.attendance.checkInTime).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Jakarta"
                        })
                      : "-"
                  }}
                </p>
                <p>
                  <strong>Jam Pulang</strong> :
                  {{
                    item.attendance && item.attendance.checkOutTime
                      ? new Date(item.attendance.checkOutTime).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Jakarta"
                        })
                      : "-"
                  }}
                </p>
                <p>
                  <strong>Status</strong> :
                  <span
                    class="status"
                    :class="
                      item.libur
                        ? 'libur'
                        : item.attendance
                        ? item.attendance.info.toLowerCase()
                        : 'alpa'
                    "
                  >
                    {{ item.libur ? "Libur" : getStatusPresensi(item.attendance) }}
                  </span>
                </p>
              </div>
            </div>
          </div>
          <p v-else class="no-data">Tidak ada data untuk pencarian ini.</p>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="footer">
      © 2025 SI-Presensi Sekolah. Hak cipta dilindungi undang-undang.
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { MagnifyingGlassIcon } from "@heroicons/vue/24/solid";

// Batas waktu absen (sama dengan di admin/rekap.vue)
const batasJam = 8;
const batasMenit = 0;

// Helper: Cek apakah melewati jam batas absen
function isAfterBatasWaktu(dateObj) {
  if (!dateObj) return false;
  const jamAbsen = new Date(dateObj);
  const batas = new Date(jamAbsen);
  // Gunakan timezone WIB untuk jam batas
  batas.setHours(batasJam, batasMenit, 0, 0);
  return jamAbsen > batas;
}

// Helper: Tentukan status presensi (manual tidak terpengaruh batas jam)
function getStatusPresensi(attendance) {
  if (!attendance) return "Alpa";
  
  const keterangan = attendance.info || "Hadir";
  const isPresensiManual = ["Izin", "Sakit", "Dispen"].includes(keterangan);
  
  if (isAfterBatasWaktu(attendance.checkInTime) && !isPresensiManual) {
    return "Alpa";
  }
  
  return keterangan;
}

// Helper: dapatkan tanggal WIB hari ini
const getWIBDate = () => {
  const now = new Date();
  // Gunakan timezone WIB untuk mendapatkan tanggal yang benar
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
};

const today = getWIBDate();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, "0"); // bulan 0-11
const dd = String(today.getDate()).padStart(2, "0");
const todayStr = `${yyyy}-${mm}-${dd}`;

const form = ref({
  nameOrNis: "",
  periode: "harian",
  date: todayStr,
});

const results = ref([]);
const loading = ref(false);
const searched = ref(false);
const searchedDate = ref("");

const holidays = ref([]); // data libur nasional

// 🔹 Ambil libur nasional dari API holidays
const fetchHolidays = async () => {
  try {
    const year = new Date().getFullYear();
    const res = await fetch(`/api/holidays?year=${year}`);
    const data = await res.json();
    if (data && data.holidays) {
      holidays.value = data.holidays; // contoh: ["2025-01-01", "2025-08-17", ...]
    }
  } catch (err) {
    console.error("Gagal ambil data libur:", err);
  }
};

// 🔹 Cek apakah tanggal libur
function isHoliday(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDay(); // 0 = Minggu
  if (day === 0) return true; // Minggu
  if (holidays.value.includes(dateStr)) return true; // tanggal merah API
  return false;
}

// 🔹 Ambil range 1 minggu (Senin - Minggu) dari tanggal yang dipilih
function getWeekDates(baseDate) {
  const d = new Date(baseDate);
  const day = d.getDay(); // Minggu = 0, Senin = 1
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7)); // mundur ke Senin

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    // Format YYYY-MM-DD dengan timezone WIB
    return date.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  });
}

// 🔹 Cari data presensi
const handleSearch = async () => {
  loading.value = true;
  searched.value = false;
  results.value = [];

  try {
    if (form.value.periode === "harian") {
      // Mode harian
      const res = await fetch(
        `/api/attendances/search?query=${form.value.nameOrNis}&date=${form.value.date}`
      );
      const data = await res.json();

      let tempResults = Array.isArray(data.data) ? data.data : [];

      if (isHoliday(form.value.date)) {
        tempResults = tempResults.map((item) => ({
          ...item,
          attendance: null,
          libur: true,
          tanggal: form.value.date,
        }));
      } else {
        tempResults = tempResults.map((item) => ({
          ...item,
          tanggal: form.value.date,
        }));
      }

      results.value = tempResults;
      searchedDate.value = form.value.date;
    } else {
      // Mode mingguan
      const todayWIB = getWIBDate();
      todayWIB.setHours(0, 0, 0, 0);
      const todayWIBStr = todayWIB.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
      
      const weekDates = getWeekDates(form.value.date);
      const allResults = [];

      // Hanya proses tanggal yang <= hari ini (WIB)
      for (const d of weekDates) {
        // Konversi string tanggal ke objek Date untuk perbandingan yang akurat (WIB)
        const currentDate = new Date(d + "T00:00:00.000+07:00");
        
        // Hentikan loop jika tanggal melebihi hari ini (WIB)
        if (currentDate > todayWIB) break;
        
        // Jika hari libur, tambahkan data kosong
        if (isHoliday(d)) {
          allResults.push({
            name: form.value.nameOrNis,
            nis: '',
            class: '',
            attendance: null,
            libur: true,
            tanggal: d
          });
          continue;
        }
        const res = await fetch(
          `/api/attendances/search?query=${form.value.nameOrNis}&date=${d}`
        );
        const data = await res.json();

        // Jika ada data, tambahkan ke hasil
        if (Array.isArray(data.data) && data.data.length > 0) {
          const tempResults = data.data.map(item => ({
            ...item,
            tanggal: d
          }));
          allResults.push(...tempResults);
        }
      }

      results.value = allResults;
      searchedDate.value = form.value.date; // tanggal referensi (misalnya Senin minggu itu)
    }
  } catch (err) {
    console.error("Gagal ambil data:", err);
    results.value = [];
  } finally {
    loading.value = false;
    searched.value = true;
  }
};

// 🔹 Ambil data libur saat pertama kali load
onMounted(() => {
  fetchHolidays();
});
</script>

<style scoped>
/* ====== GLOBAL ====== */
.container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(to bottom, #e6f2fc, #ffffff);
  font-family: "Segoe UI", Arial, sans-serif;
  overflow-x: hidden; /* cegah geser horizontal */
}

/* ====== HEADER ====== */
.header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  flex-wrap: wrap;
}

.logo-circle {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: #c8d5dc;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px 0 rgba(200,213,220,0.25);
}

.logo-img {
  width: 1.8rem;
  height: 1.8rem;
  object-fit: contain;
}

.header-text {
  font-size: clamp(1rem, 2vw, 1.25rem);
  font-weight: 750;
  color: #1e3a8a;
  flex: 1;
  min-width: 150px;
}

/* ====== MAIN CONTENT ====== */
.main-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 2rem 1rem;
}

.card {
  background: white;
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 5px 14px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  text-align: left;
}

/* ====== TITLE ====== */
.title {
  display: flex;
  justify-content: center;
  align-items: baseline;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
  gap: 0.25rem;
}

.title-1 {
  font-size: clamp(1.25rem, 2.5vw, 1.6rem);
  font-weight: 700;
  color: #2563eb;
}

.title-2 {
  font-size: clamp(1.4rem, 3vw, 1.8rem);
  font-weight: 800;
  background-color: #dbeafe;
  padding: 0 0.4rem;
  border-radius: 0.5rem;
  color: #0369a1;
}

.title-3 {
  font-size: clamp(1.4rem, 3vw, 1.8rem);
  font-weight: 800;
  color: #2563eb;
}

.sub-title {
  color: #37506d;
  font-size: clamp(0.9rem, 2vw, 1rem);
  font-weight: 500;
  text-align: center;
  margin: 0.5rem 0 1.5rem;
}

/* ====== FORM ====== */
.form {
  margin-top: 1rem;
  margin-bottom: 1.5rem;
  max-width: 100%;
  border: 1.5px solid #a4b3c7;
  border-radius: 0.75rem;
  padding: 1.2rem;
  background: #fafcff;
}

.serch-bar {
  display: flex;
  align-items: center;
  font-size: 1rem;
  color: #8553b7;
  font-weight: 700;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.serch-icon {
  width: 1.2rem;
  height: 1.2rem;
  margin-right: 0.5rem;
  color: #8553b7;
}

.serch-input {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ====== INPUT & SELECT ====== */
.select-nameOrNis input,
.select-periode select,
.select-date input {
  padding: 0.65rem 0.9rem;
  border: 1.5px solid #cbd5e1;
  border-radius: 0.6rem;
  font-size: 0.95rem;
  color: #374151;
  transition: all 0.3s ease;
  outline: none;
  margin-top: 0.4rem;
  background: #f9fafb;
  width: 100%;
}

.select-nameOrNis input:hover,
.select-periode select:hover,
.select-date input:hover {
  border-color: #60a5fa;
}

.select-nameOrNis input:focus,
.select-periode select:focus,
.select-date input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 6px rgba(37, 99, 235, 0.3);
  background: white;
}

/* Label */
.select-nameOrNis label,
.select-periode label,
.select-date label {
  font-weight: 600;
  font-size: 0.85rem;
  color: #1e3a8a;
  margin-bottom: 0.25rem;
}

/* Dropdown select */
.select-periode select {
  appearance: none;
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;
  padding-right: 2rem;
  cursor: pointer;
}

/* Row (periode & tanggal) */
.row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.row > div {
  flex: 1;
  min-width: 140px;
  display: flex;
  flex-direction: column;
}

/* ====== BUTTON ====== */
.btn-submit {
  width: 100%;
  margin-top: 1.2rem;
  padding: 0.8rem 1rem;
  background: linear-gradient(to right, #2563eb, #3b82f6);
  color: white;
  font-size: 1rem;
  font-weight: 700;
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 3px 8px rgba(37, 99, 235, 0.3);
}

.btn-submit:hover {
  background: linear-gradient(to right, #1e40af, #2563eb);
  transform: scale(1.03);
  box-shadow: 0 5px 12px rgba(37, 99, 235, 0.4);
}

.btn-submit:active {
  transform: scale(0.98);
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
}

.status.libur {
  background: #ffc5a5;
  color: #7c4949;
}

/* ====== FOOTER ====== */
.footer {
  text-align: center;
  padding: 1rem;
  background: white;
  border-top: 1px solid #e5e7eb;
  color: #666;
  font-size: 0.8rem;
  flex-shrink: 0;
}

/* ====== HASIL PENCARIAN ====== */
.results {
  margin-top: 0.5rem;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.result-card {
  background: #ffffff;
  border: 1.5px solid #e5e7eb;
  border-radius: 0.85rem;
  padding: 1rem 1.25rem;
  box-shadow: 0 3px 8px rgba(0,0,0,0.05);
  transition: all 0.2s ease;
}

.result-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 12px rgba(0,0,0,0.1);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.result-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e3a8a;
  word-break: break-word;
}

.result-date {
  font-size: 0.9rem;
  font-weight: 600;
  color: #444;
  word-break: break-word;
}

.result-body p {
  margin: 0.3rem 0;
  font-size: 0.95rem;
  color: #333;
}

.status {
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 0.4rem;
}

.status.hadir {
  background: #43ff85;
  color: #0a3e24;
}

.status.sakit {
  background: #ffea98;
  color: #92400e;
}

.status.izin {
  background: #bae6fd;
  color: #1e3a8a;
}

.status.dispen {
  background: #ddd6fe;
  color: #4c1d95;
}

.status.alpa {
  background: #facecef0;
  color: #991b1b;
}

.no-data {
  margin-top: 1rem;
  text-align: center;
  font-style: italic;
  color: #666;
}
</style>