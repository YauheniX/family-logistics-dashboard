import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './styles/main.css';
import { useAuthStore } from '@/stores/auth';
import { handleSupabaseAuthRedirect } from '@/features/auth';
import { normalizeRedirectParam } from '@/utils/pathValidation';
import i18n from './i18n';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(i18n);

// IMPORTANT bootstrap order:
// 1) Handle Supabase OAuth redirect (tokens/code) and clean URL
// 2) Initialize auth store (so router guards see authenticated state)
// 3) Install router (initial navigation happens here)
// 4) Redirect away from guest-only routes if already authenticated
// 5) Apply any post-auth redirect stored in sessionStorage
// 6) Mount
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

      // Consume post-auth redirect (set by OAuth flow in sessionStorage).
      const redirectFromStorage = window.sessionStorage.getItem('postAuthRedirect');
      window.sessionStorage.removeItem('postAuthRedirect');

      if (current.meta.guestOnly) {
        // Authenticated user landed on login/register — redirect to intended page.
        const redirectQuery = current.query.redirect;
        const redirectParam = Array.isArray(redirectQuery) ? redirectQuery[0] : redirectQuery;
        const redirectFromQuery = typeof redirectParam === 'string' ? redirectParam : undefined;

        const fromQuery = normalizeRedirectParam(redirectFromQuery);
        const fromStorage = normalizeRedirectParam(redirectFromStorage ?? undefined);
        // Try query param first, then storage, then default to '/'
        const target = fromQuery !== '/' ? fromQuery : fromStorage;

        await router.replace(target);
      } else if (redirectFromStorage) {
        // Post-OAuth redirect: user landed on default route, apply saved redirect.
        const target = normalizeRedirectParam(redirectFromStorage);
        if (target !== '/' && target !== current.fullPath) {
          await router.replace(target);
        }
      }
    }
  } catch {
    // ignore
  }

  app.mount('#app');
})();
