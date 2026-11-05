<template>
  <div class="container">
    <Sidebar />
    <main class="content">
      <h1 class="title">Absensi</h1>
      <div class="grid">
        <div class="top-cards">
          <Card>
            <div class="search-container">
              <label for="search">Cari Siswa:</label>
              <input
                id="search"
                v-model="searchQuery"
                type="text"
                class="search-input"
                placeholder="Masukkan Nama atau NIS..." />
            </div>
          </Card>

          <Card>
            <div class="filter-container">
              <label for="kelas">Pilih Kelas:</label>
              <select
                id="kelas"
                v-model="selectedClass"
                class="filter-dropdown">
                <option value="">Semua Kelas</option>
                <option
                  v-for="kelas in availableClasses"
                  :key="kelas"
                  :value="kelas">
                  {{ kelas }}
                </option>
              </select>
            </div>
          </Card>
        </div>

        <Card :isWide="true">
          <div class="title-container">
            <h2 class="card-title">Daftar Presensi Siswa</h2>
            <div class="button-group">
              <BaseButton class="btn-custom" @click="openPresensiManual">
                <template #icon>
                  <UserPlusIcon class="icon" />
                </template>
                Presensi Manual
              </BaseButton>
              <BaseButton
                class="btn-fullscreen"
                @click="showFullScreenPresensi = true">
                Fullscreen
              </BaseButton>
            </div>
          </div>

          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>No ID</th>
                  <th>NIS</th>
                  <th
                    @click="sortAttendances('studentName')"
                    style="cursor: pointer; user-select: none;">
                    Nama
                    <span v-if="sortKey === 'studentName'">
                      {{ sortOrder === 'asc' ? '▲' : '▼' }}
                    </span>
                  </th>
                  <th>Kelas</th>
                  <th>Keterangan</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="sortedAndFilteredAttendances.length === 0">
                  <td colspan="9" class="empty-message">
                    Tidak ada data presensi tersedia.
                  </td>
                </tr>
                <tr
                  v-for="(attendance, i) in sortedAndFilteredAttendances"
                  :key="attendance.id">
                  <td>{{ i + 1 }}</td>
                  <td>{{ attendance.rfid }}</td>
                  <td>{{ attendance.nis }}</td>
                  <td>{{ attendance.studentName }}</td>
                  <td>{{ attendance.kelas }}</td>
                  <td>
                    <span
                      v-if="attendance.info"
                      :class="{
                        'bg-yellow-200 text-yellow-800': attendance.info === 'Izin',
                        'bg-red-200 text-red-800': attendance.info === 'Sakit',
                        'bg-blue-200 text-blue-800': attendance.info === 'Dispen'
                      }"
                      class="px-2 py-1 rounded-full text-xs font-semibold">
                      {{ attendance.info }}
                    </span>
                    <span v-else>-</span>
                  </td>
                  <td>{{ formatDate(attendance.checkInTime) }}</td>
                  <td>
                    {{ attendance.checkOutTime ? formatDate(attendance.checkOutTime) : '-' }}
                  </td>
                  <td class="action-cell">
                    <BaseButton
                      class="btn-delete"
                      @click="confirmDelete(attendance.id)">
                      Hapus
                    </BaseButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </main>
  </div>

  <!-- Modal full screen -->
  <div v-if="showFullScreenPresensi" class="fullscreen-overlay">
    <div class="fullscreen-content">
      <BaseButton class="btn-kembali" @click="showFullScreenPresensi = false">
        ← Kembali
      </BaseButton>
      <h2>Daftar Presensi</h2>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>No</th>
              <th>No ID</th>
              <th>NIS</th>
              <th>Nama</th>
              <th>Kelas</th>
              <th>Keterangan</th>
              <th>Check-in</th>
              <th>Check-out</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="attendances.length === 0">
              <td colspan="8" class="empty-message">
                Belum ada data presensi.
              </td>
            </tr>
            <tr v-for="(attendance, i) in attendances" :key="attendance.id">
              <td>{{ i + 1 }}</td>
              <td>{{ attendance.rfid }}</td>
              <td>{{ attendance.nis }}</td>
              <td>{{ attendance.studentName }}</td>
              <td>{{ attendance.kelas }}</td>
              <td>{{ attendance.info || 'Hadir' }}</td>
              <td>{{ formatDate(attendance.checkInTime) }}</td>
              <td>
                {{ attendance.checkOutTime ? formatDate(attendance.checkOutTime) : '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <PresensiManual
    :isOpen="isPresensiOpen"
    @close="closePresensiManual"
    @presensiAdded="fetchAttendances" />
  <ConfirmDialog
    :isOpen="isConfirmOpen"
    message="Apakah Anda yakin ingin menghapus presensi ini?"
    @confirm="deleteAttendance"
    @cancel="isConfirmOpen = false" />
</template>

<script setup>
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
});

import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import Sidebar from "@/components/common/SideBar.vue";
import Card from "@/components/common/card.vue";
import BaseButton from "@/components/common/baseButton.vue";
import PresensiManual from "@/components/common/presensiManual.vue";
import ConfirmDialog from "@/components/common/confirmDialog.vue";
import { UserPlusIcon } from "@heroicons/vue/24/solid";
import axios from "axios";

const attendances = ref([]);
const isPresensiOpen = ref(false);
const isConfirmOpen = ref(false);
const searchQuery = ref("");
const selectedClass = ref("");
const sortKey = ref("");
const sortOrder = ref("asc");
const showFullScreenPresensi = ref(false);
let attendanceToDelete = null;
let socket;

const fetchAttendances = async () => {
  try {
    // Ambil hanya presensi hari ini (WIB)
    const now = new Date();
    const todayWIB = new Date(now);
    todayWIB.setHours(0, 0, 0, 0);
    const tomorrowWIB = new Date(todayWIB);
    tomorrowWIB.setDate(tomorrowWIB.getDate() + 1);

    const response = await axios.get("/api/attendances/attendance", {
      params: {
        start: todayWIB.toISOString(),
        end: tomorrowWIB.toISOString()
      }
    });
    if (JSON.stringify(response.data) !== JSON.stringify(attendances.value)) {
      attendances.value = response.data;
    }
  } catch (error) {
    console.error("Error fetching attendances:", error);
  }
};

const openPresensiManual = () => {
  isPresensiOpen.value = true;
};

const closePresensiManual = () => {
  isPresensiOpen.value = false;
};

const connectWebSocket = () => {
  const wsUrl = (location.port === "3000" || location.port === "5173")
    ? `ws://${location.hostname}:3001`
    : (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws";

  socket = new WebSocket(wsUrl);

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.rfid) {
        console.log("RFID terbaca via WS:", data.rfid);

        // Cari index attendance di array utama
        const index = attendances.value.findIndex(a => a.id === data.id);
        if (index !== -1) {
          // Update data yang sudah ada (misal check-out)
          attendances.value[index] = { ...attendances.value[index], ...data };
        } else {
          // Tambahkan data baru ke atas array
          attendances.value.unshift(data);
        }

        // Modal fullscreen otomatis ikut update karena pakai same ref attendances.value
        if (showFullScreenPresensi.value) {
          // bisa dipaksa re-render, tapi biasanya Vue reaktif sudah cukup
          attendances.value = [...attendances.value];
        }
      }
    } catch (error) {
      console.error("Gagal memproses data WebSocket:", error);
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket Error:", error);
  };

  socket.onclose = () => {
    console.log("WebSocket Disconnected. Reconnecting...");
    setTimeout(connectWebSocket, 3000);
  };
};

onMounted(() => {
  fetchAttendances();
  connectWebSocket();
});

onBeforeUnmount(() => {
  if (socket) {
    socket.close();
  }
});

const availableClasses = computed(() => {
  const kelasSet = new Set(attendances.value.map(a => a.kelas).filter(k => k));
  return Array.from(kelasSet);
});

const filteredAttendances = computed(() => {
  return attendances.value.filter((attendance) => {
    const matchesClass = selectedClass.value ? attendance.kelas === selectedClass.value : true;
    const matchesSearch =
      attendance.studentName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      attendance.nis.toString().includes(searchQuery.value);
    return matchesClass && matchesSearch;
  });
});

const sortedAndFilteredAttendances = computed(() => {
  let data = [...filteredAttendances.value];
  if (sortKey.value) {
    data.sort((a, b) => {
      const mod = sortOrder.value === "asc" ? 1 : -1;
      const valA = (a[sortKey.value] || "").toString().toLowerCase();
      const valB = (b[sortKey.value] || "").toString().toLowerCase();
      if (valA < valB) return -1 * mod;
      if (valA > valB) return 1 * mod;
      return 0;
    });
  }
  return data;
});

const sortAttendances = (key) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortOrder.value = "asc";
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "-";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Format tidak valid";

  return date.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour12: false,
  });
};

const confirmDelete = (id) => {
  attendanceToDelete = id;
  isConfirmOpen.value = true;
};

const deleteAttendance = async () => {
  if (!attendanceToDelete) return;
  try {
    await axios.delete(`/api/attendances/attendance?id=${attendanceToDelete}`);
    fetchAttendances();
  } catch (error) {
    console.error("Error deleting attendance:", error);
  } finally {
    isConfirmOpen.value = false;
    attendanceToDelete = null;
  }
};
</script>

<style scoped>
.grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.top-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.top-cards .card {
  flex: 1;
  min-width: 200px;
}

/* Container untuk pencarian & filter */
.filter-container, .search-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 14px;
}

/* Style label */
.filter-container label, .search-container label {
  font-weight: bold;
  color: #333;
}

/* Style dropdown */
.filter-dropdown {
  padding: 8px;
  border: 1px solid #aaa;
  border-radius: 5px;
  font-size: 14px;
  width: 100%;
  background-color: white;
  cursor: pointer;
}

.filter-dropdown:hover {
  border-color: #666;
}

.filter-dropdown:focus {
  border-color: #007bff;
  outline: none;
}

/* Input pencarian */
.search-input {
  padding: 8px;
  border: 1px solid #aaa;
  border-radius: 5px;
  font-size: 14px;
  width: 100%;
}

.search-input:focus {
  border-color: #007bff;
  outline: none;
}

/* Menjadikan judul & tombol dalam satu baris dengan jarak di antara mereka */
.title-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 2px solid #ddd;
  margin-bottom: 10px;
}

.card-title {
  font-size: 18px;
  font-weight: bold;
}

.btn-custom {
  padding: 6px 10px; /* Ukuran lebih besar */
  font-size: 14px;
  background-color: #178fb7 !important;
  color: white !important;
}

.btn-delete {
  padding: 6px;
  font-size: 12px;
  width: 70px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto; /* Pastikan tombol tepat di tengah */
  background-color: #fc5061;
}

.btn-delete:hover {
  background-color: #c82333;
}

.title-container .icon {
  height: 20px;
  width: 20px;
}

.table-container {
  max-height: 465px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 14px;
}

.table th,
.table td {
  border: 1px solid #ddd;
  padding: 5px;
  text-align: left;
}

.table th {
  background-color: #f4f4f4;
  position: sticky;
  top: 0;
  z-index: 1;
  text-align: center;
}

.table tbody tr:hover {
  background-color: #eaeaea;
  transition: background-color 0.5s ease;
}

.empty-message {
  text-align: center;
  font-style: italic;
  color: #777;
  padding: 15px;
  font-size: 14px;
}

.fullscreen-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: white;
  z-index: 9999;
  padding: 20px;
  overflow-y: auto;
}
.fullscreen-content {
  max-width: 1200px;
  margin: auto;
}
.btn-kembali {
  background-color: #e74c3c;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  margin-bottom: 20px;
}
.button-group {
  display: flex;
  gap: 10px;
}
.btn-fullscreen {
  background-color: #3498db;
  color: white;
  padding: 6px 10px;
  border: none;
  border-radius: 5px;
  font-size: 14px;
}
</style>
