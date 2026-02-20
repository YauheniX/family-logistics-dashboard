<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Page Header -->
    <BaseCard>
      <h1 class="text-h1 text-neutral-900 dark:text-neutral-50 mb-2">Settings</h1>
      <p class="text-body text-neutral-600 dark:text-neutral-400">
        Manage your profile and preferences
      </p>
    </BaseCard>

    <!-- Profile Section -->
    <BaseCard>
      <template #header>
        <h2 class="text-h2 text-neutral-900 dark:text-neutral-50">Profile</h2>
      </template>

      <div class="space-y-4">
        <!-- Avatar Upload -->
        <div class="flex items-center gap-4">
          <div
            v-if="profileForm.avatarUrl"
            class="h-20 w-20 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden"
          >
            <img
              :src="profileForm.avatarUrl"
              :alt="profileForm.name || 'User avatar'"
              class="h-full w-full object-cover"
            />
          </div>
          <div
            v-else
            class="h-20 w-20 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-2xl font-semibold text-primary-700 dark:text-primary-400"
          >
            {{ userInitials }}
          </div>
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
              Change Photo
            </BaseButton>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              JPG, PNG or GIF. Max 2MB.
            </p>
          </div>
        </div>

        <!-- Name Input -->
        <BaseInput
          v-model="profileForm.name"
          type="text"
          label="Full Name"
          placeholder="Your full name"
          :error="errors.name"
          :disabled="loading"
        />

        <!-- Email Input (Read-only) -->
        <BaseInput
          v-model="profileForm.email"
          type="email"
          label="Email"
          :disabled="true"
          hint="Email cannot be changed"
        />

        <div class="flex justify-end pt-2">
          <BaseButton
            variant="primary"
            :loading="saving"
            :disabled="loading"
            @click="handleSaveProfile"
          >
            Save Changes
          </BaseButton>
        </div>
      </div>
    </BaseCard>

    <!-- Security Section -->
    <BaseCard>
      <template #header>
        <h2 class="text-h2 text-neutral-900 dark:text-neutral-50">Security</h2>
      </template>

      <div class="space-y-4">
        <div>
          <p class="text-body text-neutral-700 dark:text-neutral-300 mb-2">
            Change your password to keep your account secure
          </p>
          <BaseButton variant="secondary" @click="handleChangePassword">
            Change Password
          </BaseButton>
        </div>
      </div>
    </BaseCard>

    <!-- Preferences Section -->
    <BaseCard>
      <template #header>
        <h2 class="text-h2 text-neutral-900 dark:text-neutral-50">Preferences</h2>
      </template>

      <div class="space-y-4">
        <!-- Theme Selection -->
        <div>
          <label class="label mb-2">Theme</label>
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

        <!-- Email Notifications Toggle -->
        <div
          class="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-700"
        >
          <div>
            <p class="text-body-semibold text-neutral-900 dark:text-neutral-50">
              Email Notifications
            </p>
            <p class="text-small text-neutral-600 dark:text-neutral-400">
              Receive updates via email
            </p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="preferences.emailNotifications"
              type="checkbox"
              class="sr-only peer"
              @change="handleSavePreferences"
            />
            <div
              class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 dark:peer-focus:ring-primary-400 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-primary-500 dark:peer-checked:bg-primary-400"
            ></div>
          </label>
        </div>

        <!-- Push Notifications Toggle -->
        <div
          class="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-700"
        >
          <div>
            <p class="text-body-semibold text-neutral-900 dark:text-neutral-50">
              Push Notifications
            </p>
            <p class="text-small text-neutral-600 dark:text-neutral-400">
              Receive push notifications on your device
            </p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="preferences.pushNotifications"
              type="checkbox"
              class="sr-only peer"
              @change="handleSavePreferences"
            />
            <div
              class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 dark:peer-focus:ring-primary-400 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-primary-500 dark:peer-checked:bg-primary-400"
            ></div>
          </label>
        </div>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import BaseCard from '@/components/shared/BaseCard.vue';
import BaseInput from '@/components/shared/BaseInput.vue';
import BaseButton from '@/components/shared/BaseButton.vue';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { useTheme } from '@/composables/useTheme';
import { useUserProfile } from '@/composables/useUserProfile';
import { supabase } from '@/features/shared/infrastructure/supabase.client';

const authStore = useAuthStore();
const toastStore = useToastStore();
const { currentTheme, setTheme } = useTheme();
const { loadUserProfile } = useUserProfile();

const profileForm = ref({
  name: '',
  email: authStore.user?.email || '',
  avatarUrl: null as string | null,
});

const errors = ref<{ name?: string }>({});
const saving = ref(false);
const loading = ref(true);

const preferences = ref({
  emailNotifications: true,
  pushNotifications: false,
});

const selectedTheme = ref(currentTheme.value);

const themeOptions = [
  {
    value: 'light',
    label: 'Light',
    description: 'Light theme for bright environments',
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Dark theme for low-light environments',
  },
  {
    value: 'system',
    label: 'System Default',
    description: 'Follow your system preference',
  },
];

const userInitials = computed(() => {
  const email = authStore.user?.email || '';
  if (profileForm.value.name) {
    const names = profileForm.value.name.split(' ');
    return names
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
});

const handleAvatarUpload = () => {
  toastStore.info('Avatar upload feature coming soon!');
};

const handleSaveProfile = async () => {
  errors.value = {};

  if (!profileForm.value.name || profileForm.value.name.trim().length < 2) {
    errors.value.name = 'Name must be at least 2 characters';
    return;
  }

  if (!authStore.user?.id) {
    toastStore.error('User not authenticated');
    return;
  }

  saving.value = true;

  try {
    console.log('[SettingsView] Saving profile for user:', authStore.user.id);
    console.log('[SettingsView] Profile name:', profileForm.value.name.trim());

    // Debug: Check current session
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('[SettingsView] Current session:', sessionData.session?.user?.id);
    console.log(
      '[SettingsView] Session user ID matches?',
      sessionData.session?.user?.id === authStore.user.id,
    );

    // Check if profile exists first (RLS requires explicit insert vs update)
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', authStore.user.id)
      .maybeSingle();

    console.log('[SettingsView] Existing profile check:', existingProfile);

    const profileData = {
      display_name: profileForm.value.name.trim(),
    };

    let error;
    let updatedData;
    if (existingProfile) {
      // Profile exists, update it
      console.log('[SettingsView] Updating existing profile with data:', profileData);
      console.log('[SettingsView] For user ID:', authStore.user.id);
      const result = await supabase
        .from('user_profiles')
        .update(profileData)
        .eq('id', authStore.user.id)
        .select();
      console.log('[SettingsView] Update result:', result);
      error = result.error;
      updatedData = result.data?.[0];
    } else {
      // Profile doesn't exist, insert it
      console.log('[SettingsView] Inserting new profile');
      const result = await supabase
        .from('user_profiles')
        .insert({
          id: authStore.user.id,
          ...profileData,
        })
        .select();
      console.log('[SettingsView] Insert result:', result);
      error = result.error;
      updatedData = result.data?.[0];
    }

    console.log('[SettingsView] Updated data returned:', updatedData);

    if (error) {
      console.error('[SettingsView] Error saving profile:', error);
      toastStore.error(`Failed to save profile: ${error.message}`);
      return;
    }

    // Verify the save by reading back the data
    const { data: savedProfile, error: verifyError } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('id', authStore.user.id)
      .maybeSingle();

    console.log('[SettingsView] Verification query:', { savedProfile, verifyError });

    if (verifyError) {
      console.error('[SettingsView] Error verifying saved profile:', verifyError);
      toastStore.warning('Profile saved but could not verify changes');
    } else if (savedProfile) {
      console.log('[SettingsView] Profile saved successfully:', savedProfile);
      profileForm.value.name = savedProfile.display_name || '';
      // Refresh global user profile to update header
      console.log('[SettingsView] Calling loadUserProfile...');
      await loadUserProfile(authStore.user.id);
      console.log('[SettingsView] loadUserProfile completed');
      toastStore.success('Profile updated successfully!');
    } else {
      console.error('[SettingsView] Profile not found after save');
      toastStore.warning('Profile save may have failed');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    toastStore.error('An unexpected error occurred');
  } finally {
    saving.value = false;
  }
};

const handleChangePassword = () => {
  toastStore.info('Change password feature coming soon!');
};

const handleThemeChange = () => {
  setTheme(selectedTheme.value);
  toastStore.success(`Theme changed to ${selectedTheme.value}`);
};

const handleSavePreferences = () => {
  toastStore.success('Preferences saved');
};

onMounted(async () => {
  // Load user profile
  if (authStore.user?.id) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('display_name, avatar_url')
        .eq('id', authStore.user.id)
        .maybeSingle();

      if (!error && data) {
        profileForm.value.name = data.display_name;
        profileForm.value.avatarUrl = data.avatar_url;
      } else if (!data) {
        // Profile doesn't exist yet, use email as default
        profileForm.value.name = authStore.user.email?.split('@')[0] || '';
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      loading.value = false;
    }
  } else {
    loading.value = false;
  }

  // Load saved preferences from localStorage if available
  const savedPrefs = localStorage.getItem('user-preferences');
  if (savedPrefs) {
    try {
      preferences.value = JSON.parse(savedPrefs);
    } catch {
      // Ignore parsing errors
    }
  }
});
</script>
