<template>
  <transition name="modal-fade">
    <div v-if="isOpen" class="modal-overlay" @click.self="close">
      <div class="modal-content">
        <h2 class="modal-title">Presensi Manual</h2>
        <form @submit.prevent="submitPresensi">
          <div class="form-group">
            <label for="nis">NIS</label>
            <input id="nis" v-model="nis" type="text" required />
          </div>

          <div class="form-group">
            <label for="info">Keterangan</label>
            <select id="info" v-model="info" required>
              <option disabled value="">-- Pilih Keterangan --</option>
              <option value="Hadir">Hadir</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
              <option value="Dispen">Dispen</option>
            </select>
          </div>

          <div class="modal-actions">
            <button type="submit" class="btn-save" :disabled="isSubmitting">
              {{ isSubmitting ? "Mengirim..." : "Kirim" }}
            </button>
            <button type="button" class="btn-cancel" @click="close">Batal</button>
          </div>
        </form>
        <p v-if="message" class="message">{{ message }}</p>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref } from "vue";
import axios from "axios";

const props = defineProps({ isOpen: Boolean });
const emit = defineEmits(["close", "presensiAdded"]);

const nis = ref("");
const info = ref("");
const message = ref("");
const isSubmitting = ref(false);

const submitPresensi = async () => {
  if (isSubmitting.value) return;
  isSubmitting.value = true;

  try {
    const response = await axios.post("/api/attendances/attendance", {
      nis: nis.value,
      info: info.value,
    });
    message.value = response.data.message || "Presensi berhasil.";
    emit("presensiAdded");
    setTimeout(() => close());
  } catch (error) {
    message.value = "Terjadi kesalahan, coba lagi.";
    console.error("Error submitting presensi:", error);
  } finally {
    isSubmitting.value = false;
  }
};

const close = () => {
  nis.value = "";
  info.value = "";
  message.value = "";
  emit("close");
};
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

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 5px;
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

.message {
  margin-top: 10px;
  color: #007bff;
  font-size: 14px;
}
</style>
