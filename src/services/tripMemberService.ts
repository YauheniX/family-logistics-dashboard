import { SupabaseService } from './supabaseService';
import { supabase } from './supabaseClient';
import type { TripMember, TripMemberRole } from '@/types/entities';
import type { ApiResponse } from '@/types/api';

export async function fetchTripMembers(tripId: string): Promise<ApiResponse<TripMember[]>> {
  const membersResponse = await SupabaseService.select<TripMember>('trip_members', (builder) =>
    builder.eq('trip_id', tripId).order('created_at')
  );

  if (membersResponse.error || !membersResponse.data) {
    return membersResponse;
  }

  const members = membersResponse.data;

  // Resolve emails for each member via RPC
  const resolved = await Promise.all(
    members.map(async (m) => {
      try {
        const { data: email } = await supabase.rpc('get_email_by_user_id', {
          lookup_user_id: m.user_id,
        });
        return { ...m, email: email ?? undefined };
      } catch {
        return m;
      }
    }),
  );

  return { data: resolved, error: null };
}

export async function inviteMemberByEmail(
  tripId: string,
  email: string,
  role: TripMemberRole = 'viewer',
  currentUserId?: string,
): Promise<ApiResponse<TripMember>> {
  // Get user ID by email via RPC
  const { data: userData, error: userError } = await supabase
    .rpc('get_user_id_by_email', { lookup_email: email });

  if (userError) {
    return {
      data: null,
      error: { message: 'Unable to find user. They may need to sign up first.' },
    };
  }

  if (!userData) {
    return {
      data: null,
      error: { message: 'No user found with that email address.' },
    };
  }

  const userId = userData as string;

  if (currentUserId && userId === currentUserId) {
    return {
      data: null,
      error: { message: 'You cannot invite yourself to your own trip.' },
    };
  }

  const memberResponse = await SupabaseService.execute<TripMember>(async () => {
    const { data, error } = await supabase
      .from('trip_members')
      .insert({ trip_id: tripId, user_id: userId, role })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return {
          data: null,
          error: { ...error, message: 'This user is already a member of this trip.' },
        };
      }
      return { data, error };
    }

    return { data, error };
  });

  if (memberResponse.error || !memberResponse.data) {
    return memberResponse;
  }

  return {
    data: { ...memberResponse.data, email },
    error: null,
  };
}

export async function removeTripMember(memberId: string): Promise<ApiResponse<null>> {
  return SupabaseService.delete('trip_members', memberId);
}

export async function updateMemberRole(
  memberId: string,
  role: TripMemberRole,
): Promise<ApiResponse<TripMember>> {
  return SupabaseService.execute<TripMember>(async () => {
    const { data, error } = await supabase
      .from('trip_members')
      .update({ role })
      .eq('id', memberId)
      .select()
      .single();

    return { data, error };
  });
}
