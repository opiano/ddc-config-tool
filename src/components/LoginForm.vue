<template>
  <div class="login-wrapper">
    <Card class="login-card">
      <template #title>
        <div class="login-header">
          <h2>DDC Config Tool</h2>
          <p>관리자 로그인이 필요합니다.</p>
        </div>
      </template>
      <template #content>
        <div class="p-fluid">
          <div class="field mb-4">
            <label for="username" style="font-weight: bold; display: block; margin-bottom: 0.5rem;">아이디</label>
            <InputText id="username" v-model="username" @keyup.enter="handleLogin" placeholder="아이디를 입력하세요" />
          </div>
          <div class="field mb-4">
            <label for="password" style="font-weight: bold; display: block; margin-bottom: 0.5rem;">패스워드</label>
            <Password id="password" v-model="password" :feedback="false" @keyup.enter="handleLogin" placeholder="패스워드를 입력하세요" toggleMask />
          </div>
          <Message severity="error" v-if="loginError" :closable="false" class="mb-3">{{ loginError }}</Message>
        </div>
      </template>
      <template #footer>
        <Button label="로그인" @click="handleLogin" class="w-full" />
      </template>
    </Card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useConfigStore } from '../store/configStore'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'

const store = useConfigStore()

const username = ref('')
const password = ref('')
const loginError = ref('')

const handleLogin = () => {
  loginError.value = ''
  if (!username.value || !password.value) {
    loginError.value = '아이디와 패스워드를 모두 입력해주세요.'
    return
  }

  const success = store.login(username.value, password.value)
  if (!success) {
    loginError.value = '아이디 또는 비밀번호가 일치하지 않습니다.'
  }
}
</script>

<style scoped>
.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
  background-color: var(--p-surface-100);
}

.login-card {
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.login-header {
  text-align: center;
  margin-bottom: 1rem;
}

.login-header h2 {
  margin: 0 0 0.5rem 0;
  color: var(--p-primary-color);
}

.login-header p {
  margin: 0;
  color: var(--p-text-color-secondary);
  font-size: 0.9rem;
}

.w-full {
  width: 100%;
}
.mb-4 {
  margin-bottom: 1.5rem;
}
.mb-3 {
  margin-bottom: 1rem;
}
.p-fluid .field {
  display: flex;
  flex-direction: column;
}
</style>
