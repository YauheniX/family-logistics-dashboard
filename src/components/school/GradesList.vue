<template>
  <div>
    <!-- Empty state -->
    <div
      v-if="!Object.keys(bySubject).length"
      class="text-center py-10 text-neutral-400 dark:text-neutral-500"
    >
      <span class="text-4xl block mb-2">📊</span>
      <p>{{ $t('school.grades.empty') }}</p>
    </div>

    <!-- Grades by subject -->
    <div v-else class="space-y-4">
      <div
        v-for="(subjectGrades, subject) in bySubject"
        :key="subject"
        class="glass-card rounded-xl p-4"
      >
        <!-- Subject header -->
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-neutral-800 dark:text-neutral-200">{{ subject }}</h3>
          <span
            v-if="average(subjectGrades) !== null"
            class="text-sm font-mono px-2 py-0.5 rounded-full"
            :class="averageClass(average(subjectGrades)!)"
          >
            {{ $t('school.grades.avg') }} {{ average(subjectGrades) }}
          </span>
        </div>

        <!-- Grade chips -->
        <div class="flex flex-wrap gap-2">
          <div v-for="grade in subjectGrades" :key="grade.id" class="relative group">
            <span
              class="inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold cursor-default transition-transform hover:scale-110"
              :class="gradeColor(grade.grade)"
              :title="`${grade.category ?? ''} • ${grade.date}${grade.added_by ? ' • ' + grade.added_by : ''}`"
            >
              {{ grade.grade }}
            </span>
            <!-- Weight badge -->
            <span
              v-if="grade.weight && grade.weight > 1"
              class="absolute -top-1 -right-1 text-[10px] w-4 h-4 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center"
            >
              {{ grade.weight }}
            </span>
          </div>
        </div>

        <!-- Latest comment -->
        <p
          v-if="latestComment(subjectGrades)"
          class="mt-2 text-xs text-neutral-500 dark:text-neutral-400 italic truncate"
        >
          💬 {{ latestComment(subjectGrades) }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSchoolStore } from '@/features/school/presentation/school.store';
import { schoolService } from '@/features/school/domain/school.service';
import type { SchoolGrade } from '@/features/school/domain/school.entities';

const schoolStore = useSchoolStore();

const bySubject = computed(() => schoolStore.gradesBySubject);

function average(grades: SchoolGrade[]): number | null {
  return schoolService.calculateAverage(grades);
}

function averageClass(avg: number): string {
  if (avg >= 4.5) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
  if (avg >= 3.5) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
  return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
}

function gradeColor(grade: string): string {
  const n = parseFloat(grade);
  if (isNaN(n)) {
    // Non-numeric: plus/minus modifiers
    if (grade.includes('+') || grade === 'A')
      return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300';
    if (grade.includes('-') || grade === 'F')
      return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300';
    return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300';
  }
  if (n >= 5) return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300';
  if (n === 4) return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300';
  if (n === 3) return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300';
  return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300';
}

function latestComment(grades: SchoolGrade[]): string | null {
  return grades.find((g) => g.comment)?.comment ?? null;
}
</script>
