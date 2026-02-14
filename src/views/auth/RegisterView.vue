<template>
  <div class="mx-auto max-w-md space-y-6">
    <div class="glass-card p-6 text-center">
      <p class="text-sm text-slate-500">Welcome</p>
      <h1 class="text-2xl font-semibold text-slate-900">Create Account</h1>
    </div>

    <div class="glass-card space-y-4 p-6">
      <form class="space-y-4" @submit.prevent="handleRegister">
        <div>
          <label for="email" class="block text-sm font-medium text-slate-700 mb-1">
            Email
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            class="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            :disabled="loading"
            placeholder="your@email.com"
          />
          <p v-if="validationErrors.email" class="mt-1 text-sm text-red-600">
            {{ validationErrors.email }}
          </p>
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-slate-700 mb-1">
            Password
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            class="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            :disabled="loading"
            placeholder="Min. 6 characters"
          />
          <p v-if="validationErrors.password" class="mt-1 text-sm text-red-600">
            {{ validationErrors.password }}
          </p>
        </div>

        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-slate-700 mb-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            required
            class="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            :disabled="loading"
            placeholder="Re-enter your password"
          />
          <p v-if="validationErrors.confirmPassword" class="mt-1 text-sm text-red-600">
            {{ validationErrors.confirmPassword }}
          </p>
        </div>

        <button
          type="submit"
          class="btn-primary w-full flex items-center justify-center gap-2"
          :disabled="loading"
        >
          <span v-if="loading" class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
          {{ loading ? 'Creating account...' : 'Create Account' }}
        </button>

        <p v-if="error" class="text-sm text-red-600 text-center">{{ error }}</p>
        <p v-if="success" class="text-sm text-green-600 text-center">{{ success }}</p>
      </form>

      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-slate-300"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="bg-white px-2 text-slate-500">or</span>
        </div>
      </div>

      <button
        class="btn-primary w-full flex items-center justify-center gap-2"
        type="button"
        :disabled="loading"
        @click="handleGoogleRegister"
      >
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
        Sign up with Google
      </button>

      <div class="text-center">
        <p class="text-sm text-slate-600">
          Already have an account?
          <router-link to="/login" class="text-blue-600 hover:text-blue-700 font-medium">
            Sign in
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '@/features/auth';
import { useToastStore } from '@/stores/toast';
import { isValidEmail, isValidPassword, MIN_PASSWORD_LENGTH } from '@/utils/validation';

const router = useRouter();
const toastStore = useToastStore();

const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');
const success = ref('');
const validationErrors = ref<{
  email?: string;
  password?: string;
  confirmPassword?: string;
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

  // Confirm password validation
  if (!confirmPassword.value) {
    validationErrors.value.confirmPassword = 'Please confirm your password';
    isValid = false;
  } else if (password.value !== confirmPassword.value) {
    validationErrors.value.confirmPassword = 'Passwords do not match';
    isValid = false;
  }

  return isValid;
};

const handleRegister = async () => {
  error.value = '';
  success.value = '';

  if (!validateForm()) {
    return;
  }

  loading.value = true;

  try {
    const response = await authService.signUp(email.value, password.value);
    
    if (response.error) {
      error.value = response.error.message;
      toastStore.error(error.value);
    } else {
      success.value = 'Account created successfully! Please check your email to confirm your account.';
      toastStore.success(success.value);
      
      // Clear form
      email.value = '';
      password.value = '';
      confirmPassword.value = '';
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to create account';
    toastStore.error(error.value);
  } finally {
    loading.value = false;
  }
};

const handleGoogleRegister = async () => {
  loading.value = true;
  error.value = '';

  try {
    const response = await authService.signInWithOAuth('google');
    
    if (response.error) {
      error.value = response.error.message;
      toastStore.error(error.value);
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to sign up with Google';
    toastStore.error(error.value);
  } finally {
    loading.value = false;
  }
};
</script>
