import { ref } from 'vue';
import { supabase } from '@/features/shared/infrastructure/supabase.client';

const userDisplayName = ref<string | null>(null);
const userAvatarUrl = ref<string | null>(null);

export function useUserProfile() {
  const loadUserProfile = async (userId: string) => {
    console.log('[useUserProfile] Loading profile for user:', userId);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('display_name, avatar_url')
        .eq('id', userId)
        .maybeSingle();

      console.log('[useUserProfile] Query result:', { data, error });

      if (!error && data) {
        userDisplayName.value = data.display_name;
        userAvatarUrl.value = data.avatar_url;
        console.log('[useUserProfile] Set display name to:', data.display_name);
        console.log('[useUserProfile] Set avatar URL to:', data.avatar_url);
      } else {
        console.log('[useUserProfile] No profile data or error, clearing values');
        userDisplayName.value = null;
        userAvatarUrl.value = null;
      }
    } catch (err) {
      console.error('[useUserProfile] Error loading user profile:', err);
      userDisplayName.value = null;
      userAvatarUrl.value = null;
    }
  };

  const clearUserProfile = () => {
    userDisplayName.value = null;
    userAvatarUrl.value = null;
  };

  return {
    userDisplayName,
    userAvatarUrl,
    loadUserProfile,
    clearUserProfile,
  };
}
