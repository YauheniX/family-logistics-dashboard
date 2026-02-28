<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-dark-bg pb-20 lg:pb-0">
    <div class="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <!-- Game Container -->
      <div
        class="game-container bg-white dark:bg-neutral-800 rounded-lg shadow-sm p-3 sm:p-6 lg:p-8"
      >
        <!-- Header with Title and Scores -->
        <div class="mb-4 sm:mb-6">
          <h1
            class="game-title text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-neutral-50 text-center mb-3 sm:mb-4"
          >
            Rock-Paper-Scissors
          </h1>
          <!-- Score Display -->
          <div class="flex justify-around text-center max-w-xs mx-auto">
            <div>
              <p class="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mb-1">You</p>
              <p class="text-2xl sm:text-3xl font-bold text-primary-600 dark:text-primary-400">
                {{ playerScore }}
              </p>
            </div>
            <div>
              <p class="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mb-1">Computer</p>
              <p class="text-2xl sm:text-3xl font-bold text-danger-600 dark:text-danger-400">
                {{ computerScore }}
              </p>
            </div>
          </div>
        </div>

        <div id="hands" :class="{ 'hands-paused': result }">
          <!-- Computer Hand -->
          <div id="computer-hand" class="hand" :class="getHandClass('computer')">
            <div class="fist"></div>
            <div class="finger finger-1"></div>
            <div class="finger finger-2"></div>
            <div class="finger finger-3"></div>
            <div class="finger finger-4"></div>
            <div class="thumb"></div>
            <div class="arm"></div>
          </div>

          <!-- Choice Icons / Next Round Button -->
          <div class="flex justify-center items-center gap-4 min-h-[60px]">
            <!-- Choice Icons -->
            <template v-if="!result">
              <button
                :disabled="isPlaying"
                class="choice-btn"
                aria-label="Play Rock"
                @click="play('Rock')"
              >
                ✊
              </button>
              <button
                :disabled="isPlaying"
                class="choice-btn"
                aria-label="Play Paper"
                @click="play('Paper')"
              >
                🖐️
              </button>
              <button
                :disabled="isPlaying"
                class="choice-btn"
                aria-label="Play Scissors"
                @click="play('Scissors')"
              >
                ✌️
              </button>
            </template>

            <!-- Next Round Button -->
            <button v-else class="choice-btn" aria-label="Next Round" @click="resetRound">
              ▶️
            </button>
          </div>

          <!-- User Hand -->
          <div id="user-hand" class="hand" :class="getHandClass('user')">
            <div class="fist"></div>
            <div class="finger finger-1"></div>
            <div class="finger finger-2"></div>
            <div class="finger finger-3"></div>
            <div class="finger finger-4"></div>
            <div class="thumb"></div>
            <div class="arm"></div>
          </div>
        </div>

        <!-- Result Display -->
        <div class="mt-4 sm:mt-8 text-center min-h-[80px] flex items-center justify-center">
          <div v-if="result" id="message">
            <h2
              class="text-xl sm:text-2xl font-bold"
              :class="{
                'text-success-600 dark:text-success-400': result === 'You Win!',
                'text-danger-600 dark:text-danger-400': result === 'You Lose!',
                'text-neutral-700 dark:text-neutral-300': result === 'Tie',
              }"
            >
              {{ result }}
            </h2>
          </div>
        </div>

        <!-- Game Controls -->
        <div class="flex gap-2 sm:gap-3 justify-center mt-4 sm:mt-8 px-2">
          <button
            class="px-4 sm:px-6 py-2.5 sm:py-2 text-sm bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 active:bg-neutral-400 dark:active:bg-neutral-500 transition-colors touch-manipulation"
            @click="resetGame"
          >
            Reset Game
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

type Choice = 'Rock' | 'Paper' | 'Scissors';

const playerScore = ref(0);
const computerScore = ref(0);
const playerChoice = ref<Choice | null>(null);
const computerChoice = ref<Choice | null>(null);
let winnerTimeoutId: ReturnType<typeof setTimeout> | null = null;
const result = ref<string | null>(null);
const isPlaying = ref(false);

function getComputerChoice(): Choice {
  const choices: Choice[] = ['Rock', 'Paper', 'Scissors'];
  const randomIndex = Math.floor(Math.random() * choices.length);
  return choices[randomIndex];
}

function determineWinner(player: Choice, computer: Choice): string {
  if (player === computer) {
    return 'Tie';
  }

  if (
    (player === 'Rock' && computer === 'Scissors') ||
    (player === 'Paper' && computer === 'Rock') ||
    (player === 'Scissors' && computer === 'Paper')
  ) {
    playerScore.value++;
    return 'You Win!';
  } else {
    computerScore.value++;
    return 'You Lose!';
  }
}

function getHandClass(hand: 'user' | 'computer'): string {
  const choice = hand === 'user' ? playerChoice.value : computerChoice.value;
  if (!choice) return '';
  return `show-${choice.toLowerCase()}`;
}

function play(choice: Choice) {
  if (isPlaying.value || result.value) return;

  isPlaying.value = true;
  playerChoice.value = choice;
  const computer = getComputerChoice();
  computerChoice.value = computer;

  // Small delay to show the animation
  winnerTimeoutId = setTimeout(() => {
    result.value = determineWinner(choice, computer);
    isPlaying.value = false;
    winnerTimeoutId = null;
  }, 500);
}

function resetRound() {
  if (winnerTimeoutId !== null) {
    clearTimeout(winnerTimeoutId);
    winnerTimeoutId = null;
  }
  playerChoice.value = null;
  computerChoice.value = null;
  result.value = null;
  isPlaying.value = false;
}

function resetGame() {
  playerScore.value = 0;
  computerScore.value = 0;
  resetRound();
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css?family=Acme&display=swap');

.game-container {
  position: relative;
}

.game-title {
  font-family: Acme, Arial, sans-serif;
}

@keyframes handShake {
  0%,
  100% {
    transform: rotate(10deg);
  }
  50% {
    transform: rotate(-10deg);
  }
}

@keyframes handShake2 {
  0%,
  100% {
    transform: rotateY(180deg) rotate(10deg);
  }
  50% {
    transform: rotateY(180deg) rotate(-10deg);
  }
}

#hands {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  gap: 15px;
}

@media (min-width: 640px) {
  #hands {
    min-height: 250px;
    gap: 20px;
  }
}

#hands.hands-paused .hand {
  animation: none !important;
}

.hand {
  width: 200px;
  height: 200px;
  position: relative;
  transform: rotate(10deg);
  animation: handShake 2s infinite;
}

.hand > div {
  position: absolute;
  box-sizing: border-box;
  border: 2px solid #000;
  background: gold;
  transition: all 0.3s;
}

.dark .hand > div {
  border-color: #ffd700;
  background: #ffa500;
}

.fist {
  height: 110px;
  left: 40px;
  top: 50px;
  width: 90px;
  border-radius: 20px 0 0 20px;
}

.finger {
  width: 70px;
  height: 30px;
  border-radius: 20px;
  left: 80px;
  transform-origin: 0 50%;
}

.finger-1 {
  top: 50px;
  --dif: 0px;
}
.finger-2 {
  top: 78px;
  left: 84px;
  --dif: 4px;
}
.finger-3 {
  top: 106px;
  --dif: 0px;
}
.finger-4 {
  top: 134px;
  height: 26px;
  left: 76px;
  --dif: -8px;
}

div.thumb {
  width: 35px;
  height: 70px;
  border-radius: 0 20px 20px 20px;
  top: 50px;
  left: 80px;
  border-left: 0 solid;
  box-shadow: -17px 6px 0 -15px black;
}

.dark div.thumb {
  box-shadow: -17px 6px 0 -15px #ffd700;
}

div.arm {
  width: 22px;
  height: 70px;
  left: 20px;
  top: 70px;
  border: 0;
  border-top: 2px solid black;
  border-bottom: 2px solid black;
}

.dark div.arm {
  border-top-color: #ffd700;
  border-bottom-color: #ffd700;
}

#user-hand {
  transform: rotateY(180deg) rotate(10deg);
  animation: handShake2 2s infinite;
}

/* Scissors animation */
.show-scissors .finger-1 {
  width: 130px;
  transform: rotate(-5deg);
}

.show-scissors .finger-2 {
  width: 130px;
  transform: rotate(5deg);
}

/* Paper animation */
.show-paper .finger-1,
.show-paper .finger-2,
.show-paper .finger-3,
.show-paper .finger-4 {
  left: calc(124px + var(--dif));
  width: 80px;
  border-left: 0;
  border-radius: 0 20px 20px 0;
}

/* Rock keeps default fist position */

.choice-btn {
  background: #f5f5f5;
  border: 2px solid #ccc;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 55px;
  width: 55px;
  font-size: 1.75rem;
  user-select: none;
  transition: all 0.2s;
  border-radius: 8px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

@media (min-width: 640px) {
  .choice-btn {
    height: 60px;
    width: 60px;
    font-size: 2rem;
  }
}

.choice-btn:hover:not(:disabled) {
  background: #e0e0e0;
  border-color: #999;
  transform: scale(1.05);
}

.choice-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.choice-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dark .choice-btn {
  background: #374151;
  border-color: #4b5563;
  color: #f3f4f6;
}

.dark .choice-btn:hover:not(:disabled) {
  background: #4b5563;
  border-color: #6b7280;
}

#message {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Mobile optimization for small screens */
@media (max-width: 640px) {
  .hand {
    width: 120px;
    height: 120px;
  }

  .fist {
    height: 66px;
    left: 24px;
    top: 30px;
    width: 54px;
  }

  .finger {
    width: 42px;
    height: 18px;
    left: 48px;
  }

  .finger-1 {
    top: 30px;
  }
  .finger-2 {
    top: 46px;
    left: 50px;
  }
  .finger-3 {
    top: 63px;
  }
  .finger-4 {
    top: 80px;
    height: 15px;
    left: 46px;
  }

  div.thumb {
    width: 21px;
    height: 42px;
    top: 30px;
    left: 48px;
    box-shadow: -14px 5px 0 -12px black;
  }

  .dark div.thumb {
    box-shadow: -14px 5px 0 -12px #ffd700;
  }

  div.arm {
    width: 13px;
    height: 42px;
    left: 12px;
    top: 42px;
  }

  .show-scissors .finger-1,
  .show-scissors .finger-2 {
    width: 78px;
  }

  .show-paper .finger-1,
  .show-paper .finger-2,
  .show-paper .finger-3,
  .show-paper .finger-4 {
    left: calc(74px + var(--dif));
    width: 48px;
  }
}

/* Extra small screens - further optimization */
@media (max-width: 380px) {
  .hand {
    width: 100px;
    height: 100px;
  }

  .fist {
    height: 55px;
    left: 20px;
    top: 25px;
    width: 45px;
  }

  .finger {
    width: 35px;
    height: 15px;
    left: 40px;
  }

  .finger-1 {
    top: 25px;
  }
  .finger-2 {
    top: 38px;
    left: 42px;
  }
  .finger-3 {
    top: 52px;
  }
  .finger-4 {
    top: 67px;
    height: 13px;
    left: 38px;
  }

  div.thumb {
    width: 18px;
    height: 35px;
    top: 25px;
    left: 40px;
    box-shadow: -12px 4px 0 -10px black;
  }

  .dark div.thumb {
    box-shadow: -12px 4px 0 -10px #ffd700;
  }

  div.arm {
    width: 11px;
    height: 35px;
    left: 10px;
    top: 35px;
  }

  .show-scissors .finger-1,
  .show-scissors .finger-2 {
    width: 65px;
  }

  .show-paper .finger-1,
  .show-paper .finger-2,
  .show-paper .finger-3,
  .show-paper .finger-4 {
    left: calc(62px + var(--dif));
    width: 40px;
  }

  #hands {
    min-height: 160px;
    gap: 10px;
  }
}
</style>
