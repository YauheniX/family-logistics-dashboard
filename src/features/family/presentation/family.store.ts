import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useToastStore } from '@/stores/toast';
import { familyService } from '@/features/family/domain/family.service';
import type { Family, UpdateFamilyDto, FamilyMember } from '@/features/shared/domain/entities';

export const useFamilyStore = defineStore('family', () => {
  // ─── State ───────────────────────────────────────────────
  const families = ref<Family[]>([]);
  const currentFamily = ref<Family | null>(null);
  const members = ref<FamilyMember[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ─── Getters ─────────────────────────────────────────────
  const familyCount = computed(() => families.value.length);
  const memberCount = computed(() => members.value.length);

  // ─── Actions ─────────────────────────────────────────────
  async function loadFamilies(userId: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await familyService.getUserFamilies(userId);
      if (response.error) {
        error.value = response.error.message;
        useToastStore().error(`Failed to load families: ${response.error.message}`);
      } else {
        families.value = response.data ?? [];
      }
    } finally {
      loading.value = false;
    }
  }

  async function loadFamily(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await familyService.getFamily(id);
      if (response.error) {
        error.value = response.error.message;
        useToastStore().error(`Failed to load family: ${response.error.message}`);
      } else {
        currentFamily.value = response.data;
        if (currentFamily.value) {
          await loadMembers(id);
        }
      }
    } finally {
      loading.value = false;
    }
  }

  async function createFamily(name: string, userId: string) {
    loading.value = true;
    try {
      const response = await familyService.createFamily(name, userId);
      if (response.error) {
        useToastStore().error(`Failed to create family: ${response.error.message}`);
        return null;
      }
      if (response.data) {
        families.value.unshift(response.data);
        useToastStore().success('Family created successfully!');
      }
      return response.data;
    } finally {
      loading.value = false;
    }
  }

  async function updateFamily(id: string, data: UpdateFamilyDto) {
    loading.value = true;
    try {
      const response = await familyService.updateFamily(id, data);
      if (response.error) {
        useToastStore().error(`Failed to update family: ${response.error.message}`);
        return null;
      }
      if (response.data) {
        families.value = families.value.map((f) => (f.id === id ? response.data! : f));
        currentFamily.value = response.data;
        useToastStore().success('Family updated successfully!');
      }
      return response.data;
    } finally {
      loading.value = false;
    }
  }

  async function removeFamily(id: string): Promise<boolean> {
    loading.value = true;
    try {
      const response = await familyService.deleteFamily(id);
      if (response.error) {
        useToastStore().error(`Failed to delete family: ${response.error.message}`);
        return false;
      } else {
        families.value = families.value.filter((f) => f.id !== id);
        if (currentFamily.value?.id === id) {
          currentFamily.value = null;
          members.value = [];
        }
        useToastStore().success('Family deleted successfully!');
        return true;
      }
    } finally {
      loading.value = false;
    }
  }

  async function loadMembers(familyId: string) {
    const response = await familyService.getFamilyMembers(familyId);
    if (response.error) {
      error.value = response.error.message;
      useToastStore().error(`Failed to load members: ${response.error.message}`);
    } else {
      members.value = response.data ?? [];
    }
  }

  async function inviteMember(familyId: string, email: string, currentUserId?: string) {
    const response = await familyService.inviteMemberByEmail(familyId, email, currentUserId);
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
    const response = await familyService.removeMember(memberId);
    if (response.error) {
      useToastStore().error(`Failed to remove member: ${response.error.message}`);
    } else {
      members.value = members.value.filter((m) => m.id !== memberId);
      useToastStore().success('Member removed successfully!');
    }
  }

  return {
    // State
    families,
    currentFamily,
    members,
    loading,
    error,
    // Getters
    familyCount,
    memberCount,
    // Actions
    loadFamilies,
    loadFamily,
    createFamily,
    updateFamily,
    removeFamily,
    loadMembers,
    inviteMember,
    removeMember,
  };
});
