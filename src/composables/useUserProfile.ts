import { ref } from 'vue';
import { supabase } from '@/features/shared/infrastructure/supabase.client';
import { createLogger, serializeError } from '@/utils/logger';

const logger = createLogger('UserProfile');

const userDisplayName = ref<string | null>(null);
const userAvatarUrl = ref<string | null>(null);

export function useUserProfile() {
  const loadUserProfile = async (userId: string) => {
    logger.debug('Loading profile for user', { userId });
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('display_name, avatar_url')
        .eq('id', userId)
        .maybeSingle();

      logger.debug('Query result', { hasData: !!data, hasError: !!error });

      if (!error && data) {
        userDisplayName.value = data.display_name;
        userAvatarUrl.value = data.avatar_url;
        logger.debug('Profile loaded', { displayName: data.display_name });
      } else {
        logger.debug('No profile data or error, clearing values');
        userDisplayName.value = null;
        userAvatarUrl.value = null;
      }
    } catch (err) {
      logger.error('Error loading user profile', serializeError(err));
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
