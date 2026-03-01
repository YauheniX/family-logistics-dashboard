<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Page Header -->
    <BaseCard>
      <h1 class="text-h1 text-neutral-900 dark:text-neutral-50 mb-2">{{ $t('settings.title') }}</h1>
      <p class="text-body text-neutral-600 dark:text-neutral-400">
        {{ $t('settings.subtitle') }}
      </p>
    </BaseCard>

    <!-- Profile Section -->
    <BaseCard>
      <template #header>
        <h2 class="text-h2 text-neutral-900 dark:text-neutral-50">
          {{ $t('settings.profile.title') }}
        </h2>
      </template>

      <div class="space-y-4">
        <!-- Avatar Upload -->
        <div class="flex items-center gap-4">
          <Avatar
            :avatar-url="resolvedAvatar"
            :name="profileForm.name || authStore.user?.email || 'User'"
            :size="80"
            :show-role-badge="false"
          />
          <div>
            <BaseButton variant="secondary" @click="handleAvatarUpload">
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {{ $t('settings.profile.changePhoto') }}
            </BaseButton>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {{ $t('settings.profile.photoHint') }}
            </p>
          </div>
        </div>

        <!-- Name Display with Edit Button -->
        <div>
          <label class="label">{{ $t('settings.profile.fullNameLabel') }}</label>
          <div class="flex items-center gap-3">
            <BaseInput
              :model-value="profileForm.name"
              type="text"
              :placeholder="$t('settings.profile.fullNamePlaceholder')"
              :disabled="true"
              class="flex-1"
            />
            <BaseButton
              variant="secondary"
              :aria-label="$t('settings.profile.editName')"
              @click="openEditNameModal"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </BaseButton>
          </div>
        </div>

        <!-- Email Input (Read-only) -->
        <BaseInput
          v-model="profileForm.email"
          type="email"
          :label="$t('settings.profile.emailLabel')"
          :disabled="true"
          :hint="$t('settings.profile.emailHint')"
        />
      </div>
    </BaseCard>

    <!-- Security Section -->
    <BaseCard>
      <template #header>
        <h2 class="text-h2 text-neutral-900 dark:text-neutral-50">
          {{ $t('settings.security.title') }}
        </h2>
      </template>

      <div class="space-y-4">
        <div>
          <p class="text-body text-neutral-700 dark:text-neutral-300 mb-2">
            {{ $t('settings.security.changePasswordHint') }}
          </p>
          <BaseButton variant="secondary" @click="handleChangePassword">
            {{ $t('settings.security.changePassword') }}
          </BaseButton>
        </div>
      </div>
    </BaseCard>

    <!-- Preferences Section -->
    <BaseCard>
      <template #header>
        <h2 class="text-h2 text-neutral-900 dark:text-neutral-50">
          {{ $t('settings.preferences.title') }}
        </h2>
      </template>

      <div class="space-y-4">
        <!-- Theme Selection -->
        <div>
          <label class="label mb-2">{{ $t('settings.preferences.themeLabel') }}</label>
          <div class="space-y-2">
            <label
              v-for="option in themeOptions"
              :key="option.value"
              class="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
              :class="{
                'bg-primary-50 dark:bg-primary-900 border-primary-500 dark:border-primary-400':
                  selectedTheme === option.value,
              }"
            >
              <input
                v-model="selectedTheme"
                type="radio"
                :value="option.value"
                class="h-4 w-4 text-primary-500 dark:text-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400"
                @change="handleThemeChange"
              />
              <div>
                <p class="text-body-semibold text-neutral-900 dark:text-neutral-50">
                  {{ option.label }}
                </p>
                <p class="text-small text-neutral-600 dark:text-neutral-400">
                  {{ option.description }}
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </BaseCard>
  </div>

  <!-- Edit Name Modal -->
  <ModalDialog
    :open="showEditNameModal"
    :title="$t('settings.profile.editNameModal.title')"
    @close="showEditNameModal = false"
  >
    <form class="space-y-4" @submit.prevent="confirmEditName">
      <BaseInput
        v-model="editNameForm"
        type="text"
        :label="$t('settings.profile.editNameModal.label')"
        :placeholder="$t('settings.profile.editNameModal.placeholder')"
        :error="errors.name"
        :disabled="saving"
        required
      />
      <div class="flex gap-3">
        <BaseButton type="submit" :loading="saving">{{
          $t('settings.profile.editNameModal.save')
        }}</BaseButton>
        <BaseButton variant="ghost" type="button" @click="showEditNameModal = false">
          {{ $t('common.cancel') }}
        </BaseButton>
      </div>
    </form>
  </ModalDialog>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseCard from '@/components/shared/BaseCard.vue';
import BaseInput from '@/components/shared/BaseInput.vue';
import BaseButton from '@/components/shared/BaseButton.vue';
import Avatar from '@/components/shared/Avatar.vue';
import ModalDialog from '@/components/shared/ModalDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { useTheme } from '@/composables/useTheme';
import { useUserProfile } from '@/composables/useUserProfile';
import { UserProfileRepository } from '@/features/shared/infrastructure/user-profile.repository';
import { resolveUserProfile } from '@/utils/profileResolver';

const authStore = useAuthStore();
const toastStore = useToastStore();
const { currentTheme, setTheme } = useTheme();
const { loadUserProfile } = useUserProfile();
const { t } = useI18n();
const profileRepository = new UserProfileRepository();

const profileForm = ref({
  name: '',
  email: authStore.user?.email || '',
  avatarUrl: null as string | null,
});

const errors = ref<{ name?: string }>({});
const saving = ref(false);
const loading = ref(true);
const originalName = ref('');
const showEditNameModal = ref(false);
const editNameForm = ref('');

const selectedTheme = ref(currentTheme.value);

const themeOptions = computed(() => [
  {
    value: 'light',
    label: t('settings.themes.light'),
    description: t('settings.themes.lightDesc'),
  },
  {
    value: 'dark',
    label: t('settings.themes.dark'),
    description: t('settings.themes.darkDesc'),
  },
  {
    value: 'system',
    label: t('settings.themes.system'),
    description: t('settings.themes.systemDesc'),
  },
]);

// Resolve avatar with Google fallback
const resolvedAvatar = computed(() => {
  const resolved = resolveUserProfile(
    {
      display_name: profileForm.value.name,
      avatar_url: profileForm.value.avatarUrl,
    },
    authStore.user,
    authStore.user?.email,
  );
  return resolved.avatar;
});

const handleAvatarUpload = () => {
  toastStore.info(t('settings.profile.avatarComingSoon'));
};

const openEditNameModal = () => {
  editNameForm.value = profileForm.value.name;
  errors.value = {};
  showEditNameModal.value = true;
};

const confirmEditName = async () => {
  errors.value = {};

  // Skip save if name unchanged
  if (editNameForm.value.trim() === originalName.value) {
    showEditNameModal.value = false;
    return;
  }

  if (!editNameForm.value || editNameForm.value.trim().length < 2) {
    errors.value.name = t('settings.profile.nameTooShort');
    return;
  }

  if (!authStore.user?.id) {
    toastStore.error(t('settings.profile.notAuthenticated'));
    return;
  }

  saving.value = true;

  try {
    const result = await profileRepository.saveProfile(authStore.user.id, {
      display_name: editNameForm.value.trim(),
      avatar_url: profileForm.value.avatarUrl,
    });

    if (result.error) {
      toastStore.error(t('settings.profile.updateFailed', { error: result.error.message }));
      return;
    }

    if (result.data) {
      profileForm.value.name = result.data.display_name || '';
      profileForm.value.avatarUrl = result.data.avatar_url;
      originalName.value = result.data.display_name || '';
      toastStore.success(t('settings.profile.updateSuccess'));
      showEditNameModal.value = false;

      // Refresh global user profile to update header (non-blocking)
      try {
        await loadUserProfile(authStore.user.id);
      } catch {
        toastStore.error(t('settings.profile.refreshFailed'));
      }
    }
  } catch {
    toastStore.error(t('settings.profile.unexpectedError'));
  } finally {
    saving.value = false;
  }
};

const handleChangePassword = () => {
  toastStore.info(t('settings.security.changePasswordComingSoon'));
};

const handleThemeChange = () => {
  setTheme(selectedTheme.value);
  toastStore.success(t('settings.preferences.themeChanged', { theme: selectedTheme.value }));
};

onMounted(async () => {
  // Load user profile
  if (authStore.user?.id) {
    try {
      const result = await profileRepository.findById(authStore.user.id);

      if (!result.error && result.data) {
        profileForm.value.name = result.data.display_name;
        profileForm.value.avatarUrl = result.data.avatar_url;
        originalName.value = result.data.display_name || '';
      } else if (!result.data) {
        // Profile doesn't exist yet, use email as default
        profileForm.value.name = authStore.user.email?.split('@')[0] || '';
        originalName.value = profileForm.value.name;
      }
    } catch {
      // Handle exceptions from repository
      toastStore.error(t('settings.profile.loadFailed'));
    } finally {
      loading.value = false;
    }
  } else {
    loading.value = false;
  }
});
</script>
