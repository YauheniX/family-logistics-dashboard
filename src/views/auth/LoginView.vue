<template>
  <div class="mx-auto max-w-md space-y-6">
    <div class="glass-card p-6 text-center">
      <p class="text-sm text-slate-500">Welcome back</p>
      <h1 class="text-2xl font-semibold text-slate-900">Sign in</h1>
    </div>

    <form class="glass-card space-y-4 p-6" @submit.prevent="handleLogin">
      <div>
        <label class="label" for="email">Email</label>
        <input id="email" v-model="email" type="email" class="input" required />
      </div>
      <div>
        <label class="label" for="password">Password</label>
        <input id="password" v-model="password" type="password" class="input" required />
      </div>
      <button class="btn-primary w-full" type="submit" :disabled="authStore.loading">
        Sign in
      </button>
      <p v-if="authStore.error" class="text-sm text-red-600">{{ authStore.error }}</p>
      <p class="text-sm text-slate-600">
        No account?
        <RouterLink to="/register" class="text-brand-600">Create one</RouterLink>
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const email = ref('');
const password = ref('');

const handleLogin = async () => {
  await authStore.login(email.value, password.value);
  const redirect = (route.query.redirect as string) || '/';
  router.push(redirect);
};
</script>
