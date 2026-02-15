import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './styles/main.css';
import { useAuthStore } from '@/stores/auth';
import { handleSupabaseAuthRedirect } from '@/utils/supabaseAuthRedirect';
import { normalizeRedirectParam } from '@/utils/pathValidation';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

// IMPORTANT bootstrap order:
// 1) Handle Supabase OAuth redirect hash (tokens/code) and clean URL
// 2) Initialize auth store (so router guards see authenticated state)
// 3) Install router (initial navigation happens here)
// 4) Redirect away from guest-only routes if already authenticated
// 5) Mount
(async () => {
  try {
    await handleSupabaseAuthRedirect();
  } catch {
    // Never block app startup on redirect parsing.
  }

  const authStore = useAuthStore();
  try {
    await authStore.initialize();
  } catch (error) {
    console.error('Auth initialization failed:', error);
  }

  app.use(router);
  await router.isReady();

  try {
    if (authStore.isAuthenticated) {
      const current = router.currentRoute.value;
      if (current.meta.guestOnly) {
        const redirectQuery = current.query.redirect;
        const redirectParam = Array.isArray(redirectQuery) ? redirectQuery[0] : redirectQuery;
        const redirectFromQuery = typeof redirectParam === 'string' ? redirectParam : undefined;
        const redirectFromStorage = window.sessionStorage.getItem('postAuthRedirect');

        const fromQuery = normalizeRedirectParam(redirectFromQuery);
        const fromStorage = normalizeRedirectParam(redirectFromStorage ?? undefined);
        // Try query param first, then storage, then default to '/'
        const target = fromQuery !== '/' ? fromQuery : fromStorage;

        window.sessionStorage.removeItem('postAuthRedirect');
        await router.replace(target);
      }
    }
  } catch {
    // ignore
  }

  app.mount('#app');
})();
