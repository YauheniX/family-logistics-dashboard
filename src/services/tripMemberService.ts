import { supabase } from './supabaseClient';
import type { TripMember, TripMemberRole } from '@/types/entities';

export async function fetchTripMembers(tripId: string): Promise<TripMember[]> {
  const { data, error } = await supabase
    .from('trip_members')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at');

  if (error) throw error;
  return data ?? [];
}

export async function inviteMemberByEmail(
  tripId: string,
  email: string,
  role: TripMemberRole = 'viewer',
): Promise<TripMember | null> {
  // Look up the user by email via Supabase auth admin or a profiles lookup.
  // Since we don't have admin access from the client, we query the trip_members
  // table after inserting via an RPC or look up the user id via a public profiles
  // table. For simplicity, we use Supabase's auth API to find the user.
  //
  // Approach: We'll use a Supabase RPC or direct query. Since the anon key
  // doesn't have access to auth.users, we look up users by querying existing
  // trip_members or use the approach of searching with a filter.
  //
  // Best practice: Use a Supabase Edge Function or a lookup table. For now,
  // we query the auth.users via the supabase client if the user has the right
  // permissions, or we simply try to insert and let it fail gracefully.
  //
  // Practical approach: Look up user by email using the Supabase admin API
  // is not available on the client side. Instead, we'll use a simple RPC.
  // If no RPC is available, we need a profiles table or an alternative.
  //
  // Simplest approach that works: We'll try to find the user via a Supabase
  // function. If not available, we can store the email and resolve later.
  // For now, let's use a direct lookup approach with a database function.

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
