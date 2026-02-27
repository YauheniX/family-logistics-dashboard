<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-dark-bg pb-20 lg:pb-0">
    <div class="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <!-- Game Container -->
      <div class="game-container bg-white dark:bg-neutral-800 rounded-lg shadow-sm p-6 sm:p-8">
        <!-- Header with Title and Scores -->
        <div class="mb-6">
          <h1
            class="game-title text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-50 text-center mb-4"
          >
            Rock-Paper-Scissors
          </h1>
          <!-- Score Display -->
          <div class="flex justify-around text-center">
            <div>
              <p class="text-sm text-neutral-600 dark:text-neutral-400 mb-1">You</p>
              <p class="text-3xl font-bold text-primary-600 dark:text-primary-400">
                {{ playerScore }}
              </p>
            </div>
            <div>
              <p class="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Computer</p>
              <p class="text-3xl font-bold text-danger-600 dark:text-danger-400">
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

          <!-- Choice Icons -->
          <div id="icons">
            <div>
              <button :disabled="isPlaying" class="choice-btn" @click="play('Rock')">✊</button>
            </div>
            <div>
              <button :disabled="isPlaying" class="choice-btn" @click="play('Paper')">🖐️</button>
            </div>
            <div>
              <button :disabled="isPlaying" class="choice-btn" @click="play('Scissors')">✌️</button>
            </div>
          </div>
        </div>

        <!-- Result Display -->
        <div v-if="result" id="message" class="mt-8 text-center">
          <h2
            class="text-2xl font-bold mb-4"
            :class="{
              'text-success-600 dark:text-success-400': result === 'You Win!',
              'text-danger-600 dark:text-danger-400': result === 'You Lose!',
              'text-neutral-700 dark:text-neutral-300': result === 'Tie',
            }"
          >
            {{ result }}
          </h2>
        </div>

        <!-- Game Controls -->
        <div class="flex gap-3 justify-center mt-8">
          <button
            v-if="result"
            class="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
            @click="resetRound"
          >
            Next Round
          </button>
          <button
            class="px-4 py-2 text-sm bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
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
  computerChoice.value = getComputerChoice();

  // Small delay to show the animation
  setTimeout(() => {
    if (computerChoice.value) {
      result.value = determineWinner(choice, computerChoice.value);
    }
    isPlaying.value = false;
  }, 500);
}

function resetRound() {
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
  align-items: center;
  justify-content: center;
  min-height: 250px;
  gap: 20px;
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

#icons {
  width: 60px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

#icons > div {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
}

.choice-btn {
  background: #f5f5f5;
  border: 2px solid #ccc;
  cursor: pointer;
  display: block;
  height: 60px;
  width: 60px;
  line-height: 60px;
  font-size: 2rem;
  user-select: none;
  transition: all 0.2s;
  border-radius: 8px;
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

@media (max-width: 640px) {
  .hand {
    width: 150px;
    height: 150px;
  }

  .fist {
    height: 82px;
    left: 30px;
    top: 37px;
    width: 67px;
  }

  .finger {
    width: 52px;
    height: 22px;
    left: 60px;
  }

  .finger-1 {
    top: 37px;
  }
  .finger-2 {
    top: 58px;
    left: 63px;
  }
  .finger-3 {
    top: 79px;
  }
  .finger-4 {
    top: 100px;
    height: 19px;
    left: 57px;
  }

  div.thumb {
    width: 26px;
    height: 52px;
    top: 37px;
    left: 60px;
  }

  div.arm {
    width: 16px;
    height: 52px;
    left: 15px;
    top: 52px;
  }

  .show-scissors .finger-1,
  .show-scissors .finger-2 {
    width: 97px;
  }

  .show-paper .finger-1,
  .show-paper .finger-2,
  .show-paper .finger-3,
  .show-paper .finger-4 {
    left: calc(93px + var(--dif));
    width: 60px;
  }

  #icons {
    width: 50px;
  }

  #icons > div {
    width: 50px;
    height: 50px;
  }

  .choice-btn {
    width: 50px;
    height: 50px;
    font-size: 1.5rem;
  }
}
</style>
