import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './styles/main.css';
import { useAuthStore } from '@/stores/auth';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Initialize auth before mounting the app to prevent flickering
const authStore = useAuthStore();
authStore
  .initialize()
  .catch((error) => {
    // Log initialization error but still mount the app
    // User will be treated as not authenticated and can try to log in
    console.error('Auth initialization failed:', error);
  })
  .finally(() => {
    app.mount('#app');
  });
