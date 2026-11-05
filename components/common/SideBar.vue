<script setup>
import NavItem from '@/components/common/NavItem.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

function handleLogout() {
  router.push('/')
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-inner">
      <router-link to="/" class="logo-link">
        <div class="logo-circle">
          <img src="/presentap.png" alt="Logo" class="logo-img" />
        </div>
        <span class="logo-text">PresenTap</span>
      </router-link>
      <nav class="navbar-menu">
        <ul>
          <NavItem to="/admin" label="Dashboard" />
          <NavItem to="/admin/siswa" label="Siswa" />
          <NavItem to="/admin/absensi" label="Absensi" />
          <NavItem to="/admin/rekap" label="Rekap" />
        </ul>
      </nav>
      <button class="logout-btn" @click="handleLogout">
        Logout
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 250px;
  background: white;
  padding: 0;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.sidebar-inner {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 20px 20px 20px 0;
}
.logo-link {
  text-decoration: none;
  color: inherit;
  display: flex;
  align-items: center;
  text-align: center;
  padding: 10px;
  border-bottom: 2px solid #E0E0E0;
}
.logo-circle {
  background: #c8d5dc;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  margin-left: 10px;
  box-shadow: 0 2px 8px 0 rgba(200,213,220,0.25);
}
.logo-img {
  width: 30px;
  height: 30px;
  object-fit: contain;
}
.logo-text {
  font-weight: bold;
  font-size: 18px;
  color: #333;
}
.navbar-menu {
  flex-grow: 1;
  padding: 10px 0;
}
.navbar-menu ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.navbar-menu li {
  margin: 5px 5px 0 0;
}
.logout-btn {
  margin-top: auto;
  width: 90%;
  margin-left: 5%;
  margin-bottom: 10px;
  background: #e53e3e;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 10px 0;
  font-weight: bold;
  font-size: 1em;
  cursor: pointer;
  transition: background 0.15s;
}
.logout-btn:hover {
  background: #b91c1c;
}
</style>