<template>
  <div class="mx-auto max-w-md space-y-6">
    <div class="glass-card p-6 text-center">
      <p class="text-sm text-slate-500">Join the family workspace</p>
      <h1 class="text-2xl font-semibold text-slate-900">Create account</h1>
    </div>

    <form class="glass-card space-y-4 p-6" @submit.prevent="handleRegister">
      <div>
        <label class="label" for="email">Email</label>
        <input id="email" v-model="email" type="email" class="input" required />
      </div>
      <div>
        <label class="label" for="password">Password</label>
        <input id="password" v-model="password" type="password" class="input" required />
      </div>
      <button class="btn-primary w-full" type="submit" :disabled="authStore.loading">
        Create account
      </button>
      <p v-if="authStore.error" class="text-sm text-red-600">{{ authStore.error }}</p>
      <p class="text-sm text-slate-600">
        Already have an account?
        <RouterLink to="/login" class="text-brand-600">Sign in</RouterLink>
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const email = ref('');
const password = ref('');

const handleRegister = async () => {
  await authStore.register(email.value, password.value);
  router.push('/');
};
</script>
