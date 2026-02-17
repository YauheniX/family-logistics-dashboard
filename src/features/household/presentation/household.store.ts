import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useToastStore } from '@/stores/toast';
import { householdService } from '@/features/household/domain/household.service';
import type { Household, UpdateHouseholdDto, Member } from '@/features/shared/domain/entities';

export const useHouseholdEntityStore = defineStore('household-entity', () => {
  // ─── State ───────────────────────────────────────────────
  const households = ref<Household[]>([]);
  const currentHousehold = ref<Household | null>(null);
  const members = ref<Member[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ─── Getters ─────────────────────────────────────────────
  const householdCount = computed(() => households.value.length);
  const memberCount = computed(() => members.value.length);

  // ─── Actions ─────────────────────────────────────────────
  async function loadHouseholds(userId: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await householdService.getUserHouseholds(userId);
      if (response.error) {
        error.value = response.error.message;
        useToastStore().error(`Failed to load households: ${response.error.message}`);
      } else {
        households.value = response.data ?? [];
      }
    } finally {
      loading.value = false;
    }
  }

  async function loadHousehold(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await householdService.getHousehold(id);
      if (response.error) {
        error.value = response.error.message;
        useToastStore().error(`Failed to load household: ${response.error.message}`);
      } else {
        currentHousehold.value = response.data;
        if (currentHousehold.value) {
          await loadMembers(id);
        }
      }
    } finally {
      loading.value = false;
    }
  }

  async function createHousehold(name: string, userId: string) {
    loading.value = true;
    try {
      const response = await householdService.createHousehold(name, userId);
      if (response.error) {
        useToastStore().error(`Failed to create household: ${response.error.message}`);
        return null;
      }
      if (response.data) {
        households.value.unshift(response.data);
        useToastStore().success('Household created successfully!');
      }
      return response.data;
    } finally {
      loading.value = false;
    }
  }

  async function updateHousehold(id: string, data: UpdateHouseholdDto) {
    loading.value = true;
    try {
      const response = await householdService.updateHousehold(id, data);
      if (response.error) {
        useToastStore().error(`Failed to update household: ${response.error.message}`);
        return null;
      }
      if (response.data) {
        households.value = households.value.map((household) => (household.id === id ? response.data! : household));
        currentHousehold.value = response.data;
        useToastStore().success('Household updated successfully!');
      }
      return response.data;
    } finally {
      loading.value = false;
    }
  }

  async function removeHousehold(id: string): Promise<boolean> {
    loading.value = true;
    try {
      const response = await householdService.deleteHousehold(id);
      if (response.error) {
        useToastStore().error(`Failed to delete household: ${response.error.message}`);
        return false;
      } else {
        households.value = households.value.filter((household) => household.id !== id);
        if (currentHousehold.value?.id === id) {
          currentHousehold.value = null;
          members.value = [];
        }
        useToastStore().success('Household deleted successfully!');
        return true;
      }
    } finally {
      loading.value = false;
    }
  }

  async function loadMembers(householdId: string) {
    const response = await householdService.getMembers(householdId);
    if (response.error) {
      error.value = response.error.message;
      useToastStore().error(`Failed to load members: ${response.error.message}`);
    } else {
      members.value = response.data ?? [];
    }
  }

  async function inviteMember(householdId: string, email: string, currentUserId?: string) {
    const response = await householdService.inviteMemberByEmail(householdId, email, currentUserId);
    if (response.error) {
      useToastStore().error(`Failed to invite member: ${response.error.message}`);
      return null;
    }
    if (response.data) {
      members.value.push(response.data);
      useToastStore().success('Member invited successfully!');
    }
    return response.data;
  }

  async function removeMember(memberId: string) {
    const response = await householdService.removeMember(memberId);
    if (response.error) {
      useToastStore().error(`Failed to remove member: ${response.error.message}`);
    } else {
      members.value = members.value.filter((m) => m.id !== memberId);
      useToastStore().success('Member removed successfully!');
    }
  }

  return {
    // State
    households,
    currentHousehold,
    members,
    loading,
    error,
    // Getters
    householdCount,
    memberCount,
    // Actions
    loadHouseholds,
    loadHousehold,
    createHousehold,
    updateHousehold,
    removeHousehold,
    loadMembers,
    inviteMember,
    removeMember,
  };
});
