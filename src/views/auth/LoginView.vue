<template>
  <div class="mx-auto max-w-md space-y-6">
    <!-- Header Card -->
    <div class="glass-card p-6 text-center">
      <h1 class="text-h1 text-neutral-900 dark:text-neutral-50 mb-2">{{ $t('auth.login.title') }}</h1>
      <p class="text-body text-neutral-700 dark:text-neutral-300">
        {{ $t('auth.login.subtitle') }}
      </p>
    </div>

    <!-- Login Form Card -->
    <div class="glass-card space-y-4 p-6">
      <form class="space-y-4" @submit.prevent="handleEmailLogin">
        <BaseInput
          v-model="email"
          type="email"
          :label="$t('auth.login.emailLabel')"
          :placeholder="$t('auth.login.emailPlaceholder')"
          :disabled="loading"
          :error="validationErrors.email"
          :required="true"
          :aria-label="$t('auth.login.emailLabel')"
        />

        <BaseInput
          v-model="password"
          type="password"
          :label="$t('auth.login.passwordLabel')"
          :placeholder="$t('auth.login.passwordPlaceholder')"
          :disabled="loading"
          :error="validationErrors.password"
          :required="true"
          :aria-label="$t('auth.login.passwordLabel')"
        />

        <BaseButton
          type="submit"
          variant="primary"
          :loading="loading"
          :disabled="loading"
          :full-width="true"
        >
          {{ loading ? $t('auth.login.signingIn') : $t('auth.login.signIn') }}
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
            {{ $t('common.or') }}
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
        {{ $t('auth.login.signInWithGoogle') }}
      </BaseButton>

      <!-- Footer -->
      <div class="text-center">
        <p class="text-small text-neutral-600 dark:text-neutral-400">
          {{ $t('auth.login.noAccount') }}
          <router-link
            to="/register"
            class="text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300 font-medium"
          >
            {{ $t('auth.login.createAccount') }}
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BaseInput from '@/components/shared/BaseInput.vue';
import BaseButton from '@/components/shared/BaseButton.vue';
import { authService } from '@/features/auth';
import { useToastStore } from '@/stores/toast';
import { isValidEmail, isValidPassword, MIN_PASSWORD_LENGTH } from '@/utils/validation';
import { normalizeRedirectParam } from '@/utils/pathValidation';

const { t } = useI18n();
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
    validationErrors.value.email = t('auth.login.emailRequired');
    isValid = false;
  } else if (!isValidEmail(email.value)) {
    validationErrors.value.email = t('auth.login.emailInvalid');
    isValid = false;
  }

  // Password validation
  if (!password.value) {
    validationErrors.value.password = t('auth.login.passwordRequired');
    isValid = false;
  } else if (!isValidPassword(password.value)) {
    validationErrors.value.password = t('auth.login.passwordTooShort', { min: MIN_PASSWORD_LENGTH });
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
      toastStore.success(t('auth.login.signedInSuccess'));
      const redirectParam =
        route.query.redirect && typeof route.query.redirect === 'string'
          ? route.query.redirect
          : undefined;
      const redirect = normalizeRedirectParam(redirectParam) || '/';
      router.push(redirect);
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : t('auth.login.failedToSignIn');
    toastStore.error(error.value);
  } finally {
    loading.value = false;
  }
};

const handleGoogleLogin = async () => {
  loading.value = true;
  error.value = '';

  try {
    const redirect = normalizeRedirectParam(
      route.query.redirect && typeof route.query.redirect === 'string'
        ? route.query.redirect
        : undefined,
    );
    const response = await authService.signInWithOAuth('google', redirect);

    if (response.error) {
      error.value = response.error.message;
      toastStore.error(error.value);
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : t('auth.login.failedToSignInWithGoogle');
    toastStore.error(error.value);
  } finally {
    loading.value = false;
  }
};
</script>
