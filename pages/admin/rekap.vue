<template>
  <div class="container">
    <Sidebar />
    <main class="content">apak
      <h1 class="title">Rekap Presensi</h1>
      <div class="grid">
        <Card>
          <div class="rekap-controls">
            <div class="filter-row">
              <div>
                <label for="period">Periode Rekap:</label>
                <select
                  id="period"
                  v-model="selectedPeriod"
                  class="filter-dropdown">
                  <option value="daily">Harian</option>
                  <option value="weekly">Mingguan</option>
                  <option value="monthly">Bulanan</option>
                </select>
              </div>
              <div>
                <label for="filterkelas">Kelas:</label>
                <select
                  id="filterkelas"
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
              <div v-if="selectedPeriod === 'monthly'">
                <label for="monthfilter">Bulan:</label>
                <input
                  id="monthfilter"
                  type="month"
                  v-model="monthFilter"
                  :max="maxMonth"
                  class="filter-date" />
              </div>
              <div v-else>
                <label for="datefilter">Tanggal:</label>
                <input
                  id="datefilter"
                  type="date"
                  v-model="dateFilter"
                  :max="today"
                  class="filter-date"
                  @change="validateWeeklyDate" />
              </div>
              <button class="btn-export" @click="exportToExcel">
                Export ke Excel
              </button>
            </div>
          </div>
        </Card>

        <!-- Tabel Bulanan dan Mingguan visual mirip: tidak ada header hari di bulanan -->
        <Card :isWide="true">
          <p v-if="selectedPeriod === 'weekly'" class="week-range">
            Menampilkan data dari:
            <strong>{{ formatDate(getPeriodRange().start) }}</strong>
            s.d.
            <strong>{{ formatDate(getPeriodRange().end) }}</strong>
          </p>
          <p v-if="selectedPeriod === 'monthly'" class="week-range">
            Menampilkan data bulan <strong>{{ monthLabel }}</strong>
          </p>
          <div class="table-container">
            <table class="table">
              <!-- Mingguan -->
              <thead v-if="selectedPeriod === 'weekly'">
                <tr>
                  <th rowspan="2">No</th>
                  <th rowspan="2" @click="setSort('name')">Nama</th>
                  <th rowspan="2" @click="setSort('nis')">NIS</th>
                  <th rowspan="2" @click="setSort('kelas')">Kelas</th>
                  <th colspan="7" class="tanggal-header">Tanggal</th>
                  <th rowspan="2" class="rekap-header">H</th>
                  <th rowspan="2" class="rekap-header">S</th>
                  <th rowspan="2" class="rekap-header">I</th>
                  <th rowspan="2" class="rekap-header">A</th>
                  <th rowspan="2" class="rekap-header">D</th>
                </tr>
                <tr>
                  <th
                    v-for="day in daysInWeek"
                    :key="day.getDate()"
                    :class="{
                      'sunday-column': day.getDay() === 0,
                      'saturday-column': day.getDay() === 6,
                      'holiday-column': isHoliday(day)
                    }"
                  >
                    {{ getDayName(day) }}<br />{{ day.getDate() }}
                  </th>
                </tr>
              </thead>
              <!-- Bulanan: sama seperti mingguan (tanpa baris kedua berisi hari) -->
              <!-- HEADER BULANAN -->
              <thead v-else-if="selectedPeriod === 'monthly'">
                <tr>
                  <th rowspan="2">No</th>
                  <th rowspan="2" @click="setSort('name')">Nama</th>
                  <th rowspan="2" @click="setSort('nis')">NIS</th>
                  <th rowspan="2" @click="setSort('kelas')">Kelas</th>
                  <th :colspan="daysInMonth.length" class="tanggal-header">
                    Tanggal
                  </th>
                  <th rowspan="2" class="rekap-header">H</th>
                  <th rowspan="2" class="rekap-header">S</th>
                  <th rowspan="2" class="rekap-header">I</th>
                  <th rowspan="2" class="rekap-header">A</th>
                  <th rowspan="2" class="rekap-header">D</th>
                </tr>
                <tr>
                  <th
                    v-for="tanggal in daysInMonth"
                    :key="tanggal"
                    :class="{
                      'sunday-column': isSunday(tanggal),
                      'saturday-column': isSaturday(tanggal),
                      'holiday-column': isHoliday(new Date(monthFilter+'-'+String(tanggal).padStart(2,'0')))
                    }"
                  >
                    {{ tanggal }}
                  </th>
                </tr>
              </thead>
              <!-- Harian -->
              <thead v-else>
                <tr>
                  <th>No</th>
                  <th @click="setSort('name')">Nama</th>
                  <th @click="setSort('nis')">NIS</th>
                  <th @click="setSort('kelas')">Kelas</th>
                  <th>Status</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                </tr>
              </thead>
              <tbody>
                <!-- DAILY -->
                <tr
                  v-if="selectedPeriod === 'daily' && sortedRekapData.length === 0">
                  <td colspan="7" class="empty-message">
                    Tidak ada data rekap.
                  </td>
                </tr>
                <tr
                  v-for="(row, i) in sortedRekapData"
                  :key="row.nis"
                  v-if="selectedPeriod === 'daily'">
                  <td>{{ i + 1 }}</td>
                  <td class="text-left">{{ row.name }}</td>
                  <td class="text-left">{{ row.nis }}</td>
                  <td class="text-left">{{ row.kelas }}</td>
                  <td>{{ row.status }}</td>
                  <td>{{ row.checkInTime || '-' }}</td>
                  <td>{{ row.checkOutTime || '-' }}</td>
                </tr>
                <!-- WEEKLY -->
                <tr
                  v-if="selectedPeriod === 'weekly' && sortedWeeklyRekapData.length === 0">
                  <td colspan="999" class="empty-message">
                    Tidak ada data rekap mingguan.
                  </td>
                </tr>
                <tr
                  v-for="(row, i) in sortedWeeklyRekapData"
                  :key="row.nis"
                  v-if="selectedPeriod === 'weekly'">
                  <td>{{ i + 1 }}</td>
                  <td class="text-left">{{ row.name }}</td>
                  <td class="text-left">{{ row.nis }}</td>
                  <td class="text-left">{{ row.kelas }}</td>
                  <td
                    v-for="day in daysInWeek"
                    :key="day.getDate()"
                    :class="day.getDay() === 0
                      ? 'sunday-column' 
                      : day.getDay() === 6
                      ? 'saturday-column'
                      : (isHoliday(day) ? 'holiday-column' : '')"
                  >
                    {{ row.attendance[day.getDate()] || '' }}
                  </td>
                  <td class="rekap-header">{{ row.h }}</td>
                  <td class="rekap-header">{{ row.s }}</td>
                  <td class="rekap-header">{{ row.i }}</td>
                  <td class="rekap-header">{{ row.a }}</td>
                  <td class="rekap-header">{{ row.d }}</td>
                </tr>
                <!-- MONTHLY -->
                <!-- BODY BULANAN -->
                <tr
                  v-for="(row, i) in sortedMonthlyRekapData"
                  :key="row.nis"
                  v-if="selectedPeriod === 'monthly'">
                  <td>{{ i + 1 }}</td>
                  <td class="text-left">{{ row.name }}</td>
                  <td class="text-left">{{ row.nis }}</td>
                  <td class="text-left">{{ row.kelas }}</td>
                  <td
                    v-for="tanggal in daysInMonth"
                    :key="tanggal"
                    :class="isSunday(tanggal) 
                      ? 'sunday-column' 
                      : isSaturday(tanggal)
                      ? 'saturday-column'
                      : (isHoliday(new Date(monthFilter+'-'+String(tanggal).padStart(2,'0'))) ? 'holiday-column' : '')"
                  >
                    {{ row.attendance[tanggal] || '' }}
                  </td>
                  <td class="rekap-header">{{ row.h }}</td>
                  <td class="rekap-header">{{ row.s }}</td>
                  <td class="rekap-header">{{ row.i }}</td>
                  <td class="rekap-header">{{ row.a }}</td>
                  <td class="rekap-header">{{ row.d }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </main>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
});

import { ref, computed, onMounted, watch } from "vue";
import Sidebar from "@/components/common/SideBar.vue";
import Card from "@/components/common/card.vue";
import ExcelJS from "exceljs";
import pkg from "file-saver";
const { saveAs } = pkg;

const batasJam = 8;
const batasMenit = 0;

// Helper: Cek apakah melewati jam batas absen
function isAfterBatasWaktu(dateObj) {
  if (!dateObj) return false;
  const jamAbsen = new Date(dateObj);
  const batas = new Date(jamAbsen);
  batas.setHours(batasJam, batasMenit, 0, 0);
  return jamAbsen > batas;
}

// Helper: Cek apakah hari Minggu
function isSundayDate(dateObj) {
  return dateObj.getDay() === 0;
}

// Helper: Cek apakah hari Sabtu
function isSaturdayDate(dateObj) {
  return dateObj.getDay() === 6;
}

// Helper: Cek apakah hari libur (Minggu atau Sabtu atau hari libur resmi)
function isWeekendDate(dateObj) {
  return isSundayDate(dateObj) || isSaturdayDate(dateObj) || isHoliday(dateObj);
}

// Helper: Cek apakah masa depan (besok/dst)
function isFuture(dateObj) {
  const now = new Date();
  now.setHours(0,0,0,0);
  const d = new Date(dateObj);
  d.setHours(0,0,0,0);
  return d > now;
}

// 🔹 Helper: cek apakah libur nasional
function isHoliday(dateObj) {
  if (!dateObj) return false;
  const d = new Date(dateObj);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const isoLocal = `${yyyy}-${mm}-${dd}`;
  return holidays.value.includes(isoLocal);
}

const selectedPeriod = ref("daily");
// Gunakan tanggal WIB (UTC+7) untuk default
const getWIBDate = () => {
  const now = new Date();
  const wibOffset = 7 * 60 * 60 * 1000; // WIB is UTC+7
  const wibTime = new Date(now.getTime() + wibOffset);
  return wibTime.toISOString().slice(0, 10);
};
const dateFilter = ref(getWIBDate());
const monthFilter = ref(getWIBDate().slice(0, 7));
const attendances = ref([]);
const students = ref([]);
const selectedClass = ref("");
const sortKey = ref("name");
const sortOrder = ref("asc");
// Gunakan tanggal WIB untuk today
const today = getWIBDate();
const maxMonth = getWIBDate().slice(0, 7);

// 🔹 State untuk libur nasional
const holidays = ref([]);

const validateWeeklyDate = () => {
  if (selectedPeriod.value === "weekly") {
    const date = new Date(dateFilter.value);
    const day = date.getDay();
    if (day !== 1) {
      date.setDate(date.getDate() - ((day + 6) % 7));
      dateFilter.value = date.toISOString().slice(0, 10);
    }
  }
};
const getDayName = (date) => {
  const dayNames = ["min", "sen", "sel", "rab", "kam", "jum", "sab"];
  return dayNames[date.getDay()];
};

const fetchData = async () => {
  const studentsRes = await $fetch("/api/attendances/students");
  students.value = studentsRes || [];

  const { start, end } = getPeriodRange();
  const attendanceRes = await $fetch("/api/attendances/attendance", {
    query: { start: start.toISOString(), end: end.toISOString() },
  });
  attendances.value = attendanceRes || [];

  // 🔹 Fetch libur nasional (pakai tahun dari filter harian)
  const year = +dateFilter.value.slice(0, 4);
  const holidayRes = await $fetch(`/api/holidays?year=${year}`);
  holidays.value = holidayRes?.holidays || [];
};
onMounted(fetchData);
watch(
  [selectedPeriod, dateFilter, monthFilter],
  () => fetchData(),
  { immediate: true }
);

const availableClasses = computed(() => {
  const set = new Set(students.value.map((s) => s.kelas || s.class));
  return Array.from(set).filter(Boolean).sort();
});

// Untuk header tanggal bulanan
const daysInMonth = computed(() => {
  if (selectedPeriod.value !== "monthly" || !monthFilter.value) return [];
  const year = +monthFilter.value.slice(0, 4);
  const month = +monthFilter.value.slice(5, 7);
  const lastDay = new Date(year, month, 0).getDate();
  return Array.from({ length: lastDay }, (_, i) => i + 1);
});

const isSunday = (tanggal) => {
  if (selectedPeriod.value !== "monthly" || !monthFilter.value) return false;
  const year = +monthFilter.value.slice(0, 4);
  const month = +monthFilter.value.slice(5, 7);
  const date = new Date(year, month - 1, tanggal);
  return date.getDay() === 0; // Hanya Minggu
};

const isSaturday = (tanggal) => {
  if (selectedPeriod.value !== "monthly" || !monthFilter.value) return false;
  const year = +monthFilter.value.slice(0, 4);
  const month = +monthFilter.value.slice(5, 7);
  const date = new Date(year, month - 1, tanggal);
  return date.getDay() === 6; // Hanya Sabtu
};

const daysInWeek = computed(() => {
  if (selectedPeriod.value !== "weekly") return [];
  const { start } = getPeriodRange();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
});

const getPeriodRange = () => {
  // Helper untuk membuat start/end date dalam WIB timezone
  const createWIBDate = (dateStr, hours = 0, minutes = 0, seconds = 0, ms = 0) => {
    const date = new Date(dateStr);
    date.setHours(hours, minutes, seconds, ms);
    return date;
  };

  if (selectedPeriod.value === "monthly") {
    const year = +monthFilter.value.slice(0, 4);
    const month = +monthFilter.value.slice(5, 7);
    const start = createWIBDate(`${year}-${monthFilter.value.slice(5, 7)}-01`, 0, 0, 0, 0);
    const end = createWIBDate(`${year}-${monthFilter.value.slice(5, 7)}-01`, 23, 59, 59, 999);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0); // Set to last day of month
    return { start, end };
  } else if (selectedPeriod.value === "weekly") {
    const d = new Date(dateFilter.value);
    const day = d.getDay();
    const diff = (day + 6) % 7;
    const start = createWIBDate(dateFilter.value, 0, 0, 0, 0);
    start.setDate(start.getDate() - diff);
    const end = createWIBDate(start, 23, 59, 59, 999);
    end.setDate(end.getDate() + 6);
    return { start, end };
  } else {
    const start = createWIBDate(dateFilter.value, 0, 0, 0, 0);
    const end = createWIBDate(dateFilter.value, 23, 59, 59, 999);
    return { start, end };
  }
};

// === REKAP HARIAN (Minggu & libur nasional & masa depan kosong) ===
const rekapData = computed(() => {
  const { start, end } = getPeriodRange();

  // Hari Minggu / libur nasional: kosong
  if (start.getDay() === 0 || isHoliday(start)) {
    return students.value.map((s) => ({
      name: s.name,
      nis: s.nis,
      kelas: s.kelas || s.class,
      status: ""
    }));
  }
  // Masa depan: kosong
  const now = new Date();
  now.setHours(0,0,0,0);
  if (start > now) {
    return students.value.map((s) => ({
      name: s.name,
      nis: s.nis,
      kelas: s.kelas || s.class,
      status: ""
    }));
  }
  // Hari <= hari ini
  const filtered = attendances.value.filter((a) => {
    const tgl = new Date(a.checkInTime);
    return tgl >= start && tgl <= end;
  });
  return students.value.map((s) => {
    const presensiSiswa = filtered.filter((a) => a.nis === s.nis);
    let status = "-";
    let checkInTime = "";
    let checkOutTime = "";
    
    if (presensiSiswa.length > 0) {
      const attendance = presensiSiswa[0];
      // Format waktu untuk display
      checkInTime = attendance.checkInTime ? 
        new Date(attendance.checkInTime).toLocaleString("id-ID", {
          day: "2-digit",
          month: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        }) : "";
      checkOutTime = attendance.checkOutTime ? 
        new Date(attendance.checkOutTime).toLocaleString("id-ID", {
          day: "2-digit",
          month: "numeric", 
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        }) : "";
        
      // Presensi manual (Izin/Sakit/Dispen) tidak terpengaruh batas jam
      const keterangan = attendance.info || "Hadir";
      const isPresensiManual = ["Izin", "Sakit", "Dispen"].includes(keterangan);
      
      if (isAfterBatasWaktu(attendance.checkInTime) && !isPresensiManual) {
        status = "Alpa";
      } else {
        status = keterangan;
      }
    } else {
      status = "Alpa";
    }
    return { 
      name: s.name, 
      nis: s.nis, 
      kelas: s.kelas || s.class, 
      status,
      checkInTime,
      checkOutTime
    };
  });
});

const rekapDataFiltered = computed(() => {
  if (!selectedClass.value) return rekapData.value;
  return rekapData.value.filter((row) => row.kelas === selectedClass.value);
});

const sortedRekapData = computed(() => {
  const dataWithNo = rekapDataFiltered.value.map((row, idx) => ({ ...row, no: idx + 1 }));
  return [...dataWithNo].sort((a, b) => {
    let aVal = a[sortKey.value], bVal = b[sortKey.value];
    aVal = typeof aVal === 'number' ? aVal : (aVal ?? '').toString().toLowerCase();
    bVal = typeof bVal === 'number' ? bVal : (bVal ?? '').toString().toLowerCase();
    if (aVal < bVal) return sortOrder.value === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder.value === "asc" ? 1 : -1;
    return 0;
  });
});

// === REKAP MINGGUAN ===
const sortedWeeklyRekapData = computed(() => {
  const dataWithNo = weeklyRekapFiltered.value.map((row, idx) => ({ ...row, no: idx + 1 }));
  return [...dataWithNo].sort((a, b) => {
    let aVal = a[sortKey.value], bVal = b[sortKey.value];
    aVal = typeof aVal === 'number' ? aVal : (aVal ?? '').toString().toLowerCase();
    bVal = typeof bVal === 'number' ? bVal : (bVal ?? '').toString().toLowerCase();
    if (aVal < bVal) return sortOrder.value === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder.value === "asc" ? 1 : -1;
    return 0;
  });
});
const weeklyRekapFiltered = computed(() => {
  if (selectedPeriod.value !== "weekly") return [];
  const { start, end } = getPeriodRange();
  const filtered = attendances.value.filter((a) => {
    const tgl = new Date(a.checkInTime);
    return tgl >= start && tgl <= end;
  });
  const studentsInClass = selectedClass.value
    ? students.value.filter((s) => s.kelas === selectedClass.value)
    : students.value;

  return studentsInClass.map((student) => {
    const studentPresensi = filtered.filter((a) => a.nis === student.nis);
    const attendanceMap = {};
    let h = "", s = "", i = "", a = "", d = "";
    daysInWeek.value.forEach((date) => {
      if (isWeekendDate(date) || isFuture(date)) {
        attendanceMap[date.getDate()] = "";
        return;
      }
      const match = studentPresensi.find((p) => {
        const pDate = new Date(p.checkInTime);
        return pDate.toDateString() === date.toDateString();
      });
      if (match) {
        let status = (match.info || "HADIR").toUpperCase();
        const keterangan = (match.info || "HADIR").toUpperCase();
        const isPresensiManual = ["IZIN", "SAKIT", "DISPEN"].includes(keterangan);
        
        if (isAfterBatasWaktu(match.checkInTime) && !isPresensiManual) {
          status = "A"; a++;
        } else if (status === "HADIR") { status = "H"; h++; }
        else if (status === "SAKIT") { status = "S"; s++; }
        else if (status === "IZIN") { status = "I"; i++; }
        else if (status === "ALPA") { status = "A"; a++; }
        else if (status === "DISPEN") { status = "D"; d++; }
        else status = "-";
        attendanceMap[date.getDate()] = status;
      } else {
        attendanceMap[date.getDate()] = "A"; a++;
      }
    });

    return {
      name: student.name,
      nis: student.nis,
      kelas: student.kelas || student.class,
      attendance: attendanceMap,
      h, s, i, a, d,
    };
  });
});

// === REKAP BULANAN ===
const sortedMonthlyRekapData = computed(() => {
  const dataWithNo = monthlyRekapFiltered.value.map((row, idx) => ({ ...row, no: idx + 1 }));
  return [...dataWithNo].sort((a, b) => {
    let aVal = a[sortKey.value], bVal = b[sortKey.value];
    aVal = typeof aVal === 'number' ? aVal : (aVal ?? '').toString().toLowerCase();
    bVal = typeof bVal === 'number' ? bVal : (bVal ?? '').toString().toLowerCase();
    if (aVal < bVal) return sortOrder.value === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder.value === "asc" ? 1 : -1;
    return 0;
  });
});
const monthlyRekapFiltered = computed(() => {
  if (selectedPeriod.value !== "monthly" || !monthFilter.value) return [];
  const { start, end } = getPeriodRange();
  const filtered = attendances.value.filter((a) => {
    const tgl = new Date(a.checkInTime);
    return tgl >= start && tgl <= end;
  });
  const studentsInClass = selectedClass.value
    ? students.value.filter((s) => s.kelas === selectedClass.value)
    : students.value;
  return studentsInClass.map((student) => {
    const attendanceMap = {};
    let h = "", s = "", i = "", a = "", d = "";
    for(let tgl of daysInMonth.value) {
      const searchDate = new Date(start.getFullYear(), start.getMonth(), tgl);
      if (isWeekendDate(searchDate)) {
        attendanceMap[tgl] = "";
        continue;
      }
      if (isFuture(searchDate)) {
        attendanceMap[tgl] = "";
        continue;
      }
      const match = filtered.find((p) => {
        const pDate = new Date(p.checkInTime);
        return (p.nis === student.nis) && (pDate.getDate() === searchDate.getDate()) && (pDate.getMonth() === searchDate.getMonth()) && (pDate.getFullYear() === searchDate.getFullYear());
      });
      if (match) {
        let status = (match.info || "HADIR").toUpperCase();
        const keterangan = (match.info || "HADIR").toUpperCase();
        const isPresensiManual = ["IZIN", "SAKIT", "DISPEN"].includes(keterangan);
        
        if (isAfterBatasWaktu(match.checkInTime) && !isPresensiManual) {
          attendanceMap[tgl] = "A"; a++;
        } else if (status === "HADIR") { attendanceMap[tgl] = "H"; h++; }
        else if (status === "SAKIT") { attendanceMap[tgl] = "S"; s++; }
        else if (status === "IZIN") { attendanceMap[tgl] = "I"; i++; }
        else if (status === "ALPA") { attendanceMap[tgl] = "A"; a++; }
        else if (status === "DISPEN") { attendanceMap[tgl] = "D"; d++; }
        else attendanceMap[tgl] = "-";
      } else {
        attendanceMap[tgl] = "A"; a++;
      }
    }
    return {
      name: student.name,
      nis: student.nis,
      kelas: student.kelas || student.class,
      attendance: attendanceMap,
      h, s, i, a, d,
    };
  });
});

const formatDate = (date) => {
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};
const monthLabel = computed(() => {
  if (!monthFilter.value) return "";
  const d = new Date(monthFilter.value + "-01");
  return d.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
});
const setSort = (key) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortOrder.value = "asc";
  }
};

// 🔹 Tambahkan helper di sini
function getExcelColumnLetter(colNumber) {
  let letter = "";
  while (colNumber > 0) {
    let remainder = (colNumber - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    colNumber = Math.floor((colNumber - 1) / 26);
  }
  return letter;
}

const exportToExcel = async () => {
  /* ----------  EXPORT HARIAN  ---------- */
  if (selectedPeriod.value === "daily") {
    const tanggal = new Date(dateFilter.value);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Rekap Harian");

    // Judul tanggal (merge B2‑G2)
    ws.mergeCells("B2:G2");
    const cellTitle = ws.getCell("B2");
    cellTitle.value = `Tanggal: ${formatDate(tanggal)}`;
    cellTitle.font = { bold: true };
    cellTitle.alignment = { vertical: "middle", horizontal: "left" };

    // Header
    const headerRow = ws.addRow(["No", "Nama", "NIS", "Kelas", "Status", "Check-in", "Check-out"]);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F4F4" } };
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };
    });

    // Data
    sortedRekapData.value.forEach((row, idx) => {
      const dataRow = ws.addRow([idx + 1, row.name, row.nis, row.kelas, row.status, row.checkInTime || '-', row.checkOutTime || '-']);
      dataRow.getCell(2).alignment = { horizontal: "left" };
      dataRow.getCell(3).alignment = { horizontal: "left" };
      dataRow.getCell(4).alignment = { horizontal: "left" };
      dataRow.getCell(6).alignment = { horizontal: "left" };
      dataRow.getCell(7).alignment = { horizontal: "left" };
      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FF000000" } },
          left: { style: "thin", color: { argb: "FF000000" } },
          bottom: { style: "thin", color: { argb: "FF000000" } },
          right: { style: "thin", color: { argb: "FF000000" } },
        };
        if (![2, 3, 4, 6, 7].includes(cell.col)) {
          cell.alignment = { horizontal: "center" };
        }
      });
    });

    // Lebar kolom
    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 25;
    ws.getColumn(3).width = 15;
    ws.getColumn(4).width = 10;
    ws.getColumn(5).width = 12;
    ws.getColumn(6).width = 25;
    ws.getColumn(7).width = 25;

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], { type: "application/octet-stream" }),
      `Rekap_Harian_${dateFilter.value}.xlsx`
    );
  }


/* ----------  EXPORT MINGGUAN  ---------- */
else if (selectedPeriod.value === "weekly") {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Rekap Mingguan");

  // -------------------------------------------------
  // 1️⃣  Baris judul (periode) – merge semua kolom data
  // -------------------------------------------------
  // Kolom terakhir yang dipakai = 16 (A‑P)
  const lastColLetter = "P";

  // Judul periode (merge B2‑P2)
  ws.mergeCells(`B2:${lastColLetter}2`);
  const period = getPeriodRange(); // { start, end }
  const periodLabel = `Tanggal: ${formatDate(period.start)} s/d ${formatDate(
    period.end
  )}`;
  const titleCell = ws.getCell("B2");
  titleCell.value = periodLabel;
  titleCell.font = { bold: true };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };

  // -------------------------------------------------
  // 2️⃣  Header utama (row 3) – merge sesuai rowspan/colspan
  // -------------------------------------------------
  // Merge No, Nama, NIS, Kelas (rowspan‑2)
  ws.mergeCells("A3:A4"); // No
  ws.mergeCells("B3:B4"); // Nama
  ws.mergeCells("C3:C4"); // NIS
  ws.mergeCells("D3:D4"); // Kelas

  // Merge Tanggal (colspan‑7)
  ws.mergeCells("E3:K3"); // Tanggal

  // Merge H‑S‑I‑A‑D (rowspan‑2)
  ws.mergeCells("L3:L4"); // H
  ws.mergeCells("M3:M4"); // S
  ws.mergeCells("N3:N4"); // I
  ws.mergeCells("O3:O4"); // A
  ws.mergeCells("P3:P4"); // D

  // Isi teks pada row 3
  ws.getCell("A3").value = "No";
  ws.getCell("B3").value = "Nama";
  ws.getCell("C3").value = "NIS";
  ws.getCell("D3").value = "Kelas";
  ws.getCell("E3").value = "Tanggal";
  ws.getCell("L3").value = "H";
  ws.getCell("M3").value = "S";
  ws.getCell("N3").value = "I";
  ws.getCell("O3").value = "A";
  ws.getCell("P3").value = "D";

  // -------------------------------------------------
  // 3️⃣  Sub‑header tanggal (row 4) – Sen‑…‑Min
  // -------------------------------------------------
  // Kolom tanggal dimulai dari kolom 5 (E) sampai 11 (K)
  daysInWeek.value.forEach((day, idx) => {
    const colIdx = 5 + idx; // 5 = E
    const cell = ws.getCell(4, colIdx);

    cell.value = `${getDayName(day).toUpperCase()} ${String(day.getDate()).padStart(2,"0")}`;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };

    // 🔹 Default warna abu-abu muda
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F4F4" } };

    // 🔹 Jika hari Minggu
    if (day.getDay() === 0) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F4F4" } };
      cell.font = { color: { argb: "FF0000" }, bold: true }; // merah
    }

    // 🔹 Jika hari Sabtu
    if (day.getDay() === 6) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F4F4" } };
      cell.font = { color: { argb: "FF000000" }, bold: true }; // hitam
    }

    // 🔹 Jika libur nasional
    if (isHoliday(day)) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F4F4" } }; // kuning muda
      cell.font = { color: { argb: "FF0000" }, bold: true }; // oranye
    }
  });

  // -------------------------------------------------
  // 4️⃣  Styling untuk seluruh baris header (row 3)
  // -------------------------------------------------
  const headerRow3 = ws.getRow(3);
  headerRow3.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F4F4" } };
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
  });

  // -------------------------------------------------
  // 5️⃣  Data baris (dimulai dari row 5)
  // -------------------------------------------------
  sortedWeeklyRekapData.value.forEach((row, idx) => {
    const rowValues = [
      idx + 1,                     // No
      row.name,                    // Nama
      row.nis,                     // NIS
      row.kelas,                   // Kelas
      // 7 kolom tanggal
      ...daysInWeek.value.map((day) => row.attendance[day.getDate()] || ""),
      row.h, row.s, row.i, row.a, row.d, // H S I A D
    ];
    const dataRow = ws.addRow(rowValues); // otomatis masuk ke row 5,6,…

    dataRow.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };

      if ([2, 3, 4].includes(colNumber)) {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      } else {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }

      // 🔹 Styling khusus tanggal Minggu / libur nasional
      if (colNumber >= 5 && colNumber <= 11) {
        const idxDay = colNumber - 5;
        const date = daysInWeek.value[idxDay];

        if (date.getDay() === 0 && isHoliday(date)) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "f1efef" } };
          cell.font = { color: { argb: "FF0000" }, bold: true };
        }

        else if (date.getDay() === 0) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "f1efef" } };
          cell.font = { color: { argb: "FF0000" }, bold: true };
        }

        else if (date.getDay() === 6) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "f1efef" } };
          cell.font = { color: { argb: "FF000000" }, bold: true };
        }

        else if (isHoliday(date)) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "fff8dc" } };
        }
      }

      // Kolom rekap H-D
      if (colNumber >= 12) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF6F1E2" } };
      }
    });
  });

  // -------------------------------------------------
  // 6️⃣  Lebar kolom
  // -------------------------------------------------
  ws.getColumn(1).width = 5;   // No
  ws.getColumn(2).width = 25;  // Nama
  ws.getColumn(3).width = 15;  // NIS
  ws.getColumn(4).width = 10;  // Kelas
  // Tanggal (kolom 5‑11)
  for (let i = 5; i <= 11; i++) ws.getColumn(i).width = 7;
  // Rekap H‑S‑I‑A‑D (kolom 12‑16)
  for (let i = 12; i <= 16; i++) ws.getColumn(i).width = 5;

  // -------------------------------------------------
  // 7️⃣  Simpan file
  // -------------------------------------------------
  const startStr = period.start.toISOString().slice(0, 10);
  const endStr = period.end.toISOString().slice(0, 10);
  const filename = `Rekap_Mingguan_${startStr}_sampai_${endStr}.xlsx`;

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf], { type: "application/octet-stream" }), filename);
}

/* ----------  EXPORT BULANAN  ---------- */
else if (selectedPeriod.value === "monthly") {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Rekap Bulanan");

  const { start, end } = getPeriodRange();
  const lastDate = daysInMonth.value.length;
  const lastColIdx = 4 + lastDate + 5; // 4 kolom awal + tanggal + 5 rekap
  const lastColLetter = getExcelColumnLetter(lastColIdx);

  // Judul periode (merge B2:??2)
  ws.mergeCells(`B2:${lastColLetter}2`);
  const titleCell = ws.getCell("B2");
  titleCell.value = `Bulan: ${monthLabel.value}`;
  titleCell.font = { bold: true };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };

  // Header utama
  ws.mergeCells("A3:A4"); // No
  ws.mergeCells("B3:B4"); // Nama
  ws.mergeCells("C3:C4"); // NIS
  ws.mergeCells("D3:D4"); // Kelas

  // Merge kolom tanggal
  ws.mergeCells(`E3:${getExcelColumnLetter(4 + lastDate)}3`);
  ws.getCell("E3").value = "Tanggal";

  // Merge kolom rekap
  const baseIdx = 4 + lastDate;
  ws.mergeCells(`${getExcelColumnLetter(baseIdx+1)}3:${getExcelColumnLetter(baseIdx+1)}4`); ws.getCell(`${getExcelColumnLetter(baseIdx+1)}3`).value = "H";
  ws.mergeCells(`${getExcelColumnLetter(baseIdx+2)}3:${getExcelColumnLetter(baseIdx+2)}4`); ws.getCell(`${getExcelColumnLetter(baseIdx+2)}3`).value = "S";
  ws.mergeCells(`${getExcelColumnLetter(baseIdx+3)}3:${getExcelColumnLetter(baseIdx+3)}4`); ws.getCell(`${getExcelColumnLetter(baseIdx+3)}3`).value = "I";
  ws.mergeCells(`${getExcelColumnLetter(baseIdx+4)}3:${getExcelColumnLetter(baseIdx+4)}4`); ws.getCell(`${getExcelColumnLetter(baseIdx+4)}3`).value = "A";
  ws.mergeCells(`${getExcelColumnLetter(baseIdx+5)}3:${getExcelColumnLetter(baseIdx+5)}4`); ws.getCell(`${getExcelColumnLetter(baseIdx+5)}3`).value = "D";

  // Isi teks pada row 3
  ws.getCell("A3").value = "No";
  ws.getCell("B3").value = "Nama";
  ws.getCell("C3").value = "NIS";
  ws.getCell("D3").value = "Kelas";
  ws.getCell("E3").value = "Tanggal";

  // Sub header tanggal (row 4)
  daysInMonth.value.forEach((tgl, idx) => {
  const colIdx = 5 + idx; // Mulai kolom E
  const cell = ws.getCell(4, colIdx);

  const date = new Date(monthFilter.value+"-"+String(tgl).padStart(2,"0"));

  // Nama hari + tanggal (SENIN 01, SELASA 02, dst)
  cell.value = `${String(date.getDate()).padStart(2,"0")}`;
  cell.font = { bold: true };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  };

  // 🔹 Default abu-abu muda
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F4F4" } };

  // 🔹 Jika Minggu
  if (date.getDay() === 0) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F4F4" } };
    cell.font = { color: { argb: "FF0000" }, bold: true };
  }

  // 🔹 Jika Sabtu
  if (date.getDay() === 6) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F4F4" } };
    cell.font = { color: { argb: "FF000000" }, bold: true };
  }

  // 🔹 Jika libur nasional
  if (isHoliday(date)) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F4F4" } };
    cell.font = { color: { argb: "FF0000" }, bold: true };
  }
});

  // Styling header baris 3
  const headerRow3 = ws.getRow(3);
  headerRow3.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F4F4" } };
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
  });

  // Data siswa
  sortedMonthlyRekapData.value.forEach((row, idx) => {
    const rowValues = [
      idx + 1,
      row.name,
      row.nis,
      row.kelas,
      ...daysInMonth.value.map((tgl) => row.attendance[tgl] || ""),
      row.h, row.s, row.i, row.a, row.d
    ];
    const dataRow = ws.addRow(rowValues);

    dataRow.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };
      if ([2, 3, 4].includes(colNumber)) {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      } else {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }

        // Styling tanggal Minggu & libur
        if (colNumber >= 5 && colNumber < baseIdx+1) {
          const idxTgl = colNumber - 5 + 1;
          const date = new Date(monthFilter.value+"-"+String(idxTgl).padStart(2,"0"));

          if (date.getDay() === 0 && isHoliday(date)) {
            // 🔹 Jika Minggu sekaligus libur nasional → warna oranye muda
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "f1efef" } };
            cell.font = { color: { argb: "FF0000" }, bold: true };
          } 
          else if (date.getDay() === 0) {
            // 🔹 Hanya Minggu
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "f1efef" } };
            cell.font = { color: { argb: "FF0000" }, bold: true };
          }
          else if (date.getDay() === 6) {
            // 🔹 Hanya Sabtu
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "f1efef" } };
            cell.font = { color: { argb: "FF000000" }, bold: true };
          }
          else if (isHoliday(date)) {
            // 🔹 Hanya libur nasional
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "fff8dc" } };
            cell.font = { color: { argb: "FF0000" }, bold: true };
          }
        }

      // Kolom rekap H-D
      if (colNumber >= baseIdx+1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF6F1E2" } };
      }
    });
  });

  // Atur lebar kolom (fixed, bukan auto)
  ws.getColumn(1).width = 5;   // No
  ws.getColumn(2).width = 25;  // Nama
  ws.getColumn(3).width = 15;  // NIS
  ws.getColumn(4).width = 10;  // Kelas

  // Kolom tanggal (E sampai sebelum rekap)
  for (let i = 5; i < baseIdx+1; i++) {
    ws.getColumn(i).width = 5;
  }

  // Kolom rekap (H, S, I, A, D)
  for (let i = baseIdx+1; i <= baseIdx+5; i++) {
    ws.getColumn(i).width = 5;
  }

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf], { type: "application/octet-stream" }), `Rekap_Bulanan_${monthFilter.value}.xlsx`);
}

};
</script>

<style scoped>
.grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.rekap-controls {
  width: 100%;
}
.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: end;
}
label {
  font-weight: bold;
  margin-right: 6px;
}
.filter-dropdown,
.filter-date {
  padding: 8px;
  border: 1px solid #aaa;
  border-radius: 5px;
  font-size: 14px;
  margin-right: 10px;
}
.btn-export {
  background: #178fb7;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 8px 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
  height: 40px;
}
.btn-export:hover {
  background: #0e6e91;
}
.table-container {
  max-height: 500px;
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
  text-align: center;
}
.table th {
  background-color: #f4f4f4;
  position: sticky;
  top: 0;
  z-index: 1;
  user-select: none;
  cursor: pointer;
}
.empty-message {
  text-align: center;
  font-style: italic;
  color: #777;
  padding: 15px;
  font-size: 14px;
}
.sunday-column {
  background-color: #f1efef;
  color: #FF0000;
  font-weight: bold;
}
.saturday-column {
  background-color: #f1efef;
  color: #000000;
  font-weight: bold;
}
.holiday-column {
  background-color: #fff8dc;
  color: #FF0000;
  font-weight: bold;
}
.rekap-header {
  background-color: #f6f1e2;
}
.text-left {
  text-align: left !important;
}
.week-range {
  font-size: 13px;
  color: #444;
  margin-left: 4px;
  margin-bottom: 5px;
}
</style>