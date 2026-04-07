<script setup>
import { useConfigStore } from './store/configStore'
import SidebarTree from './components/SidebarTree.vue'
import ConfigTable from './components/ConfigTable.vue'
import LoginForm from './components/LoginForm.vue'

const store = useConfigStore()
</script>

<template>
  <LoginForm v-if="!store.isLoggedIn" />

  <div class="app-layout" v-else>
    <div class="sidebar-wrapper">
      <SidebarTree />
    </div>
    <div class="main-wrapper">
      <ConfigTable />
    </div>
  </div>
</template>

<style>
.app-layout {
  display: flex;
  width: 100%;
  height: 100%;
  background: var(--bg-color);
}

.sidebar-wrapper {
  width: 252px;
  min-width: 216px;
  max-width: 300px;
  border-right: 1px solid var(--border-color);
  background: var(--surface-color);
  box-shadow: var(--shadow-sm);
  z-index: 10;
}

.main-wrapper {
  flex: 1;
  min-width: 0; /* for flex shrinking if needed */
  display: flex;
  flex-direction: column;
}
</style>
