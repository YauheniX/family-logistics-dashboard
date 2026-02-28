<template>
  <div
    ref="containerRef"
    class="fixed inset-0 pointer-events-none z-50 overflow-hidden"
    aria-hidden="true"
  >
    <div
      v-for="piece in confettiPieces"
      :key="piece.id"
      class="absolute w-3 h-3 animate-confetti"
      :style="{
        left: `${piece.x}%`,
        top: `${piece.y}%`,
        backgroundColor: piece.color,
        animationDelay: `${piece.delay}ms`,
        animationDuration: `${piece.duration}ms`,
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  color: string;
  delay: number;
  duration: number;
}

interface Props {
  trigger?: boolean;
  count?: number;
}

const props = withDefaults(defineProps<Props>(), {
  trigger: false,
  count: 30,
});

const containerRef = ref<HTMLDivElement | null>(null);
const confettiPieces = ref<ConfettiPiece[]>([]);

const colors = [
  '#4F86F7', // primary
  '#34C759', // success
  '#FF9F43', // warning
  '#FF5C5C', // danger
  '#6B9AF8', // light blue
  '#FFB366', // light orange
];

let pieceId = 0;

const triggerConfetti = () => {
  const newPieces: ConfettiPiece[] = [];

  for (let i = 0; i < props.count; i++) {
    newPieces.push({
      id: pieceId++,
      x: Math.random() * 100,
      y: -10,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 200,
      duration: 1000 + Math.random() * 500,
    });
  }

  confettiPieces.value = newPieces;

  // Clear after animation completes
  setTimeout(() => {
    confettiPieces.value = [];
  }, 2000);
};

watch(
  () => props.trigger,
  (newVal) => {
    if (newVal) {
      triggerConfetti();
    }
  },
);
</script>
