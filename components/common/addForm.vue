<template>
  <transition name="modal-fade">
    <div v-if="isOpen" class="modal-overlay" @click.self="close">
      <div class="modal-content">
        <h2 class="modal-title">
          {{ student?.id ? "Edit Siswa" : "Tambah Siswa" }}
        </h2>
        <form @submit.prevent="submitForm">
          <div class="form-group">
            <label for="rfid">No ID</label>
            <input
              id="rfid"
              v-model="formData.rfid"
              type="text"
              required
              readonly
              class="rfid-input"
            />
          </div>
          <div class="form-group">
            <label for="name">Nama</label>
            <input id="name" v-model="formData.name" type="text" required />
          </div>

          <div class="form-group">
            <label for="nis">NIS</label>
            <input id="nis" v-model="formData.nis" type="text" required />
          </div>

          <div class="form-group">
            <label for="kelas">Kelas</label>
            <input id="kelas" v-model="formData.kelas" type="text" required />
          </div>

          <!-- ✅ Pesan error -->
          <p v-if="errorMessage" class="error-message">
            ⚠️ {{ errorMessage }}
          </p>

          <div class="modal-actions">
            <button type="submit" class="btn-save" :disabled="isSubmitting">
              {{ isSubmitting ? "Menyimpan..." : "Simpan" }}
            </button>
            <button type="button" class="btn-cancel" @click="close">
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from "vue";
import axios from "axios";

const props = defineProps({
  isOpen: Boolean,
  student: Object,
});

const emit = defineEmits(["close", "studentAdded"]);

const defaultStudent = { nis: "", rfid: "", name: "", kelas: "" };
const formData = ref({ ...defaultStudent });
const isSubmitting = ref(false);
const errorMessage = ref("");
let socket;

watch(
  () => props.student,
  (newStudent) => {
    errorMessage.value = "";
    if (newStudent) {
      formData.value = { ...newStudent };
    } else {
      formData.value = { ...defaultStudent };
    }
  },
  { immediate: true }
);

// Fungsi untuk memformat kelas dan nama
const formatData = () => {
  // Format kelas menjadi huruf kapital semua
  formData.value.kelas = formData.value.kelas.toUpperCase();

  // Format nama menjadi kapital di awal setiap kata
  formData.value.name = formData.value.name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const submitForm = async () => {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  errorMessage.value = "";

  try {
    // Format data sebelum disimpan
    formatData();

    if (props.student?.id) {
      await axios.put("/api/attendances/students", {
        id: props.student.id,
        ...formData.value,
      });
    } else {
      await axios.post("/api/attendances/students", formData.value);
    }

    emit("studentAdded");
    resetForm();
    close(); // ✅ hanya ditutup jika berhasil
  } catch (error) {
    console.error("Gagal menyimpan data siswa:", error);
    const responseData = error?.response?.data;
    if (responseData?.statusMessage) {
      errorMessage.value = responseData.statusMessage;
    } else if (responseData?.error) {
      errorMessage.value = responseData.error;
    } else {
      errorMessage.value = "Terjadi kesalahan saat menyimpan data.";
    }
    // ❌ Jangan panggil close()
  } finally {
    isSubmitting.value = false;
  }
};

const resetForm = () => {
  formData.value = { ...defaultStudent };
  errorMessage.value = "";
};

const close = () => {
  resetForm();
  emit("close");
};

// WebSocket untuk membaca RFID
const connectWebSocket = () => {
  const wsUrl = (location.port === "3000" || location.port === "5173")
    ? `ws://${location.hostname}:3001`
    : (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws";

  socket = new WebSocket(wsUrl);

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.rfid) {
      formData.value.rfid = data.rfid;
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket Error:", error);
  };
};

onMounted(() => {
  connectWebSocket();
});

onUnmounted(() => {
  if (socket) {
    socket.close();
  }
});
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease, backdrop-filter 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(3px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.modal-title {
  font-size: 20px;
  margin-bottom: 10px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  font-weight: bold;
  margin-bottom: 5px;
}

.form-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.rfid-input {
  pointer-events: none;
  background-color: #edecec;
  cursor: default;
}

.error-message {
  color: red;
  font-weight: bold;
  margin-bottom: 10px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-save {
  background: #28a745;
  color: white;
  padding: 8px 12px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.btn-save:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.btn-cancel {
  background: #dc3545;
  color: white;
  padding: 8px 12px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
</style>
