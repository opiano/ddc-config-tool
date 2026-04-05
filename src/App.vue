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
/* Reset and Base Styles */
body, html {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  font-family: var(--font-family, Inter, "Helvetica Neue", sans-serif);
}

#app {
  width: 100%;
  height: 100vh;
}

.app-layout {
  display: flex;
  width: 100%;
  height: 100%;
}

.sidebar-wrapper {
  width: 300px;
  min-width: 250px;
  max-width: 400px;
  border-right: 1px solid var(--p-surface-200);
}

.main-wrapper {
  flex: 1;
  min-width: 0; /* for flex shrinking if needed */
}
</style>
