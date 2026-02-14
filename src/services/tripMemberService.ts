import { supabase } from './supabaseClient';
import type { TripMember, TripMemberRole } from '@/types/entities';

export async function fetchTripMembers(tripId: string): Promise<TripMember[]> {
  const { data, error } = await supabase
    .from('trip_members')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at');

  if (error) throw error;

  const members = data ?? [];

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

  return resolved;
}

export async function inviteMemberByEmail(
  tripId: string,
  email: string,
  role: TripMemberRole = 'viewer',
): Promise<TripMember | null> {
  const { data: userData, error: userError } = await supabase
    .rpc('get_user_id_by_email', { lookup_email: email });

  if (userError) throw new Error('Unable to find user. They may need to sign up first.');
  if (!userData) throw new Error('No user found with that email address.');

  const userId = userData as string;

  const { data, error } = await supabase
    .from('trip_members')
    .insert({ trip_id: tripId, user_id: userId, role })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('This user is already a member of this trip.');
    }
    throw error;
  }

  return data ? { ...data, email } : null;
}

export async function removeTripMember(memberId: string): Promise<void> {
  const { error } = await supabase.from('trip_members').delete().eq('id', memberId);
  if (error) throw error;
}

export async function updateMemberRole(
  memberId: string,
  role: TripMemberRole,
): Promise<TripMember | null> {
  const { data, error } = await supabase
    .from('trip_members')
    .update({ role })
    .eq('id', memberId)
    .select()
    .single();

  if (error) throw error;
  return data ?? null;
}
