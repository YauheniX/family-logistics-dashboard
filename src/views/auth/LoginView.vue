<template>
  <div class="mx-auto max-w-md space-y-6">
    <!-- Header Card -->
    <div class="glass-card p-6 text-center">
      <h1 class="text-h1 text-neutral-900 dark:text-neutral-50 mb-2">Welcome Back</h1>
      <p class="text-body text-neutral-700 dark:text-neutral-300">Sign in to manage your family</p>
    </div>

    <!-- Login Form Card -->
    <div class="glass-card space-y-4 p-6">
      <form class="space-y-4" @submit.prevent="handleEmailLogin">
        <BaseInput
          v-model="email"
          type="email"
          label="Email"
          placeholder="your@email.com"
          :disabled="loading"
          :error="validationErrors.email"
          :required="true"
          aria-label="Email address"
        />

        <BaseInput
          v-model="password"
          type="password"
          label="Password"
          placeholder="Min. 6 characters"
          :disabled="loading"
          :error="validationErrors.password"
          :required="true"
          aria-label="Password"
        />

        <BaseButton
          type="submit"
          variant="primary"
          :loading="loading"
          :disabled="loading"
          :full-width="true"
        >
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </BaseButton>

        <p v-if="error" class="text-sm text-danger-500 dark:text-danger-400 text-center">
          {{ error }}
        </p>
      </form>

      <!-- Divider -->
      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-neutral-300 dark:border-neutral-600"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="bg-white dark:bg-neutral-800 px-2 text-neutral-500 dark:text-neutral-400">
            OR
          </span>
        </div>
      </div>

      <!-- Google Sign In -->
      <BaseButton
        variant="secondary"
        :disabled="loading"
        :full-width="true"
        @click="handleGoogleLogin"
      >
        <template #icon>
          <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        </template>
        Sign in with Google
      </BaseButton>

      <!-- Footer -->
      <div class="text-center">
        <p class="text-small text-neutral-600 dark:text-neutral-400">
          Don't have an account?
          <router-link
            to="/register"
            class="text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300 font-medium"
          >
            Create account
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import BaseInput from '@/components/shared/BaseInput.vue';
import BaseButton from '@/components/shared/BaseButton.vue';
import { authService } from '@/features/auth';
import { useToastStore } from '@/stores/toast';
import { isValidEmail, isValidPassword, MIN_PASSWORD_LENGTH } from '@/utils/validation';

const router = useRouter();
const route = useRoute();
const toastStore = useToastStore();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const validationErrors = ref<{
  email?: string;
  password?: string;
}>({});

const validateForm = (): boolean => {
  validationErrors.value = {};
  let isValid = true;

  // Email validation
  if (!email.value) {
    validationErrors.value.email = 'Email is required';
    isValid = false;
  } else if (!isValidEmail(email.value)) {
    validationErrors.value.email = 'Please enter a valid email address';
    isValid = false;
  }

  // Password validation
  if (!password.value) {
    validationErrors.value.password = 'Password is required';
    isValid = false;
  } else if (!isValidPassword(password.value)) {
    validationErrors.value.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    isValid = false;
  }

  return isValid;
};

const handleEmailLogin = async () => {
  error.value = '';

  if (!validateForm()) {
    return;
  }

  loading.value = true;

  try {
    const response = await authService.signIn(email.value, password.value);

    if (response.error) {
      error.value = response.error.message;
      toastStore.error(error.value);
    } else {
      toastStore.success('Successfully signed in!');
      const redirect = (route.query.redirect as string) || '/';
      router.push(redirect);
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to sign in';
    toastStore.error(error.value);
  } finally {
    loading.value = false;
  }
};

const handleGoogleLogin = async () => {
  loading.value = true;
  error.value = '';

  try {
    const redirect = (route.query.redirect as string) || '/';
    const response = await authService.signInWithOAuth('google', redirect);

    if (response.error) {
      error.value = response.error.message;
      toastStore.error(error.value);
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to sign in with Google';
    toastStore.error(error.value);
  } finally {
    loading.value = false;
  }
};
</script>
