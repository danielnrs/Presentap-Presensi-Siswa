<template>
  <div class="container">
    <Sidebar />
    <main class="content">
      <h1 class="title">Dashboard</h1>
      <div class="grid">
        <Card title="Jumlah Siswa Terdaftar" :isWide="true">
          <template #default>
            <div class="card-content">
              <AcademicCapIcon class="card-icon" />
              <span class="count">{{ totalStudents }}</span>
              <span class="description">Siswa terdaftar</span>
            </div>
          </template>
        </Card>
        <Card title="Jumlah Siswa Telah Presensi" :isWide="true">
          <template #default>
            <div class="card-content">
              <CheckCircleIcon class="card-icon success" />
              <span class="count">{{ studentsPresent }}</span>
              <span class="description">Siswa yang telah presensi</span>
            </div>
          </template>
        </Card>
        <Card title="Jumlah Siswa Belum Presensi" :isWide="true">
          <template #default>
            <div class="card-content">
              <ClockIcon class="card-icon warning" />
              <span class="count">{{ studentsAbsent }}</span>
              <span class="description">Siswa yang belum presensi</span>
            </div>
          </template>
        </Card>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from "vue";
import Sidebar from "@/components/common/SideBar.vue";
import Card from "@/components/common/card.vue";
import { AcademicCapIcon, CheckCircleIcon, ClockIcon } from "@heroicons/vue/24/solid";
import axios from "axios";

definePageMeta({
  layout: 'admin',
  middleware: ['auth']
});

export default {
  name: "IndexPage",
  components: {
    Sidebar,
    Card,
    AcademicCapIcon,
    CheckCircleIcon,
    ClockIcon,
  },
  setup() {
    const totalStudents = ref(0);
    const studentsPresent = ref(0);
    const studentsAbsent = ref(0);
    let socket = null;

    // Fungsi untuk update data dashboard
    const updateDashboard = async () => {
      try {
        const studentsRes = await axios.get("/api/attendances/students");
        const students = studentsRes.data || [];
        totalStudents.value = students.length;

        // Ambil hanya presensi hari ini (WIB)
        const now = new Date();
        const todayWIB = new Date(now);
        todayWIB.setHours(0, 0, 0, 0);
        const tomorrowWIB = new Date(todayWIB);
        tomorrowWIB.setDate(tomorrowWIB.getDate() + 1);

        const attendanceRes = await axios.get("/api/attendances/attendance", {
          params: {
            start: todayWIB.toISOString(),
            end: tomorrowWIB.toISOString()
          }
        });
        const attendances = attendanceRes.data || [];

        // Ganti studentId/nis sesuai struktur attendance Anda
        const presentStudentIds = new Set(attendances.map(a => a.studentId || a.nis));
        studentsPresent.value = students.filter(s =>
          presentStudentIds.has(s.id) || presentStudentIds.has(s.nis)
        ).length;
        studentsAbsent.value = totalStudents.value - studentsPresent.value;
      } catch (error) {
        console.error("Error updating dashboard:", error);
      }
    };

    // Koneksi WebSocket
    const connectWebSocket = () => {
      const wsUrl = (location.port === "3000" || location.port === "5173")
        ? `ws://${location.hostname}:3001`
        : (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws";

      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log("WebSocket connected");
      };

      socket.onmessage = (event) => {
        // Anda bisa menyesuaikan trigger update sesuai pesan dari server
        // Misal, jika ada data baru masuk, panggil updateDashboard()
        try {
          const data = JSON.parse(event.data);
          // Jika pesan dari server menandakan ada perubahan presensi, update dashboard
          if (data.type === "attendance_update" || data.rfid) {
            updateDashboard();
          }
        } catch (e) {
          // Jika bukan JSON, abaikan
        }
      };

      socket.onclose = () => {
        console.log("WebSocket disconnected, reconnecting...");
        setTimeout(connectWebSocket, 3000);
      };

      socket.onerror = (err) => {
        console.error("WebSocket error:", err);
      };
    };

    onMounted(() => {
      updateDashboard(); // Ambil data awal
      connectWebSocket(); // Mulai koneksi WebSocket
    });

    onBeforeUnmount(() => {
      if (socket) socket.close();
    });

    return {
      totalStudents,
      studentsPresent,
      studentsAbsent,
    };
  },
};
</script>

<style scoped>
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}
.card-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.card-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 8px;
}
.card-icon.success {
  color: #16a34a;
}
.card-icon.warning {
  color: #ca8a04;
}
.count {
  font-size: 36px;
  font-weight: bold;
  color: #178fb7;
  margin-bottom: 4px;
}
.description {
  font-size: 14px;
  color: #555;
}
</style>
