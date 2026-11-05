<template>
  <div class="auth-bg">
    <div class="auth-card">
      <div class="logo-circle">
        <img
          src="/presentap.png"
          alt="Logo PresenTap"
          class="logo-img"
        />
      </div>
      <h2>Registrasi Admin</h2>
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label>Username</label>
          <input v-model="username" type="text" required autocomplete="username" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="password" type="password" required minlength="5" autocomplete="new-password"/>
        </div>
        <div class="form-group">
          <label>Ulangi Password</label>
          <input v-model="password2" type="password" required minlength="5" autocomplete="new-password"/>
        </div>
        <button :disabled="loading" class="btn" type="submit">
          {{ loading ? 'Memproses...' : 'Daftar' }}
        </button>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        <p v-if="successMsg" class="success-msg">{{ successMsg }}</p>
      </form>
      <div class="mt-2">
        <span>Sudah punya akun?</span>
        <NuxtLink to="/auth/login" class="link">Login</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const username = ref('')
const password = ref('')
const password2 = ref('')
const errorMsg = ref('')
const successMsg = ref('')
const loading = ref(false)
const router = useRouter()

async function handleRegister() {
  errorMsg.value = ''
  successMsg.value = ''
  if (password.value.length < 5) {
    errorMsg.value = 'Password minimal 5 karakter!'
    return
  }
  if (password.value !== password2.value) {
    errorMsg.value = 'Konfirmasi password tidak sesuai.'
    return
  }
  loading.value = true
  try {
    const res = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { action: 'register', username: username.value, password: password.value }
    })
    if (res.status === 200) {
      successMsg.value = "Registrasi berhasil! Silakan login."
      setTimeout(() => {
        router.push('/auth/login')
      }, 1200)
    } else {
      errorMsg.value = res.message || 'Registrasi gagal'
    }
  } catch (err) {
    errorMsg.value = err.data?.message || err.message || 'Terjadi kesalahan'
  }
  loading.value = false
}
</script>

<style scoped>
.auth-bg {
  min-height: 100vh;
  width: 100vw;
  background: linear-gradient(120deg, #e3f0ff 0%, #f8fcff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.auth-card {
  background: #fff;
  padding: 38px 38px 30px 38px;
  border-radius: 18px;
  box-shadow: 0 8px 32px 0 rgba(22,82,176,0.13);
  width: 100%;
  max-width: 410px;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: fadeIn 0.7s;
}
@media (max-width: 600px) {
  .auth-card {
    padding: 22px 8vw 18px 8vw;
    max-width: 98vw;
    border-radius: 10px;
  }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(30px);}
  to { opacity: 1; transform: none;}
}
.logo-circle {
  background: #c8d5dc;
  border-radius: 50%;
  width: 54px;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 7px;
  box-shadow: 0 2px 8px 0 rgba(249,115,22,0.25);
}
.logo-img {
  height: 40px;
  width: 40px;
  object-fit: contain;
  border-radius: 50%;
}
h2 {
  color: #174ea6;
  font-size: 1.45em;
  font-weight: 700;
  margin-bottom: 22px;
  margin-top: 10px;
  letter-spacing: .01em;
  text-align: center;
}
.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 18px;
  width: 100%;
}
label {
  font-weight: 500;
  margin-bottom: 6px;
  color: #2a4070;
  font-size: 1.05em;
}
input {
  padding: 11px 13px;
  border: 1.5px solid #b5d2ee;
  border-radius: 7px;
  font-size: 1.08em;
  outline: none;
  color: #1a2326;
  background: #f8fbff;
  transition: border 0.13s, box-shadow 0.13s;
  box-shadow: 0 1px 2px 0 rgba(80,120,180,0.04);
}
input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px #e3f0ff;
}
.btn {
  width: 100%;
  background: linear-gradient(90deg, #2563eb 60%, #178fb7 100%);
  font-weight: 600;
  color: #fff;
  border: none;
  border-radius: 7px;
  padding: 13px 0;
  font-size: 1.08em;
  margin: 10px 0 0 0;
  cursor: pointer;
  transition: background .15s, box-shadow .15s;
  box-shadow: 0 2px 9px 0 rgba(27,68,148,0.07);
  letter-spacing: .01em;
}
.btn:hover:enabled {
  background: linear-gradient(90deg, #174ea6 60%, #178fb7 100%);
  box-shadow: 0 4px 18px 0 rgba(27,68,148,0.13);
}
.btn:disabled {
  background: #b8cdf5;
  color: #f8fafc;
  cursor: not-allowed;
}
.link {
  color: #2563eb;
  text-decoration: none;
  margin-left: 4px;
  font-weight: 600;
  transition: color 0.13s;
}
.link:hover { text-decoration: underline; color: #174ea6; }
.mt-2 { margin-top: 18px; text-align: center; color: #2c466f; font-size: 1em;}
.error-msg {
  margin-top: 10px;
  color: #dc2626;
  font-size: 1em;
  text-align: center;
}
.success-msg {
  margin-top: 10px;
  color: #1ca23a;
  font-size: 1em;
  text-align: center;
}
</style>