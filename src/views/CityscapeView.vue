<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-dark-bg pb-20">
    <div class="cityscape-viewport">
      <div class="wrapper">
        <div class="container" :class="{ grayscale: isGrayscale }">
          <h1 :class="{ 'title-night': isNight }">Cityscape</h1>
          <div class="scene" :class="{ night: isNight }">
            <div class="cloud-container">
              <div class="sun">
                <div
                  id="cloud-sun"
                  class="cloud"
                  :style="{ display: showRain ? 'block' : 'none' }"
                ></div>
                <div class="moon" :style="{ display: isNight ? 'block' : 'none' }"></div>
              </div>
              <div id="cloud-1" class="cloud"></div>
              <div id="cloud-2" class="cloud"></div>
              <div id="cloud-3" class="cloud"></div>
              <div id="cloud-4" class="cloud"></div>
              <div id="cloud-5" class="cloud"></div>
            </div>

            <div class="skyscrapers" :class="{ 'skyscraper-night': isNight }">
              <div class="skyscraper-1"></div>
              <div class="skyscraper-2"></div>
              <div class="skyscraper-3"></div>
              <div class="skyscraper-4"></div>
              <div class="skyscraper-5"></div>
              <div class="skyscraper-6"></div>
            </div>

            <div class="houses">
              <div class="house-1" @click="triggerMailTruck">
                <div class="house-1-windows">
                  <div class="house-windows-row">
                    <div class="window house-1-window"></div>
                    <div class="window house-1-window"></div>
                  </div>
                  <div class="house-windows-row">
                    <div class="window house-1-window"></div>
                    <div class="window house-1-window"></div>
                  </div>
                  <div class="house-windows-row">
                    <div class="door house-1-door"></div>
                    <div class="window house-1-window"></div>
                  </div>
                </div>
              </div>

              <div class="house-2" @click="triggerBike">
                <div class="tank">
                  <div class="tank-details"></div>
                </div>
                <div class="house-2-sign"></div>
                <div class="house-2-windows">
                  <div class="house-windows-row">
                    <div class="window house-2-window"></div>
                    <div class="window house-2-window"></div>
                    <div class="window house-2-window"></div>
                  </div>
                  <div class="house-windows-row">
                    <div class="window house-2-window"></div>
                    <div class="window house-2-window"></div>
                    <div class="window house-2-window"></div>
                  </div>
                  <div class="house-windows-row">
                    <div class="door house-2-door"></div>
                    <div class="window house-2-window"></div>
                    <div class="window house-2-window"></div>
                  </div>
                </div>
                <div class="house-2-rack"></div>
              </div>

              <div class="house-3-container" @click="toggleHouse3">
                <div class="house-3">
                  <div class="house-3-chimney">
                    <div class="smoke" :style="{ display: showSmoke ? 'block' : 'none' }">
                      <span class="s0"></span>
                      <span class="s1"></span>
                      <span class="s2"></span>
                      <span class="s3"></span>
                      <span class="s4"></span>
                      <span class="s5"></span>
                      <span class="s6"></span>
                      <span class="s7"></span>
                      <span class="s8"></span>
                      <span class="s9"></span>
                    </div>
                  </div>
                  <div class="house-3-roof-window window">
                    <div
                      class="house-3-window-shades"
                      :style="{ display: showShades ? 'block' : 'none' }"
                    ></div>
                  </div>
                  <div class="house-3-windows">
                    <div class="house-windows-row">
                      <div class="window house-3-window">
                        <div
                          class="house-3-window-shades"
                          :style="{ display: showShades ? 'block' : 'none' }"
                        ></div>
                      </div>
                      <div class="window house-3-window">
                        <div
                          id="shade-2"
                          class="house-3-window-shades"
                          :style="{ display: showShades ? 'block' : 'none' }"
                        ></div>
                      </div>
                    </div>
                    <div class="house-windows-row">
                      <div class="window house-3-window">
                        <div
                          id="shade-3"
                          class="house-3-window-shades"
                          :style="{ display: showShades ? 'block' : 'none' }"
                        ></div>
                      </div>
                      <div class="door house-3-door"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="house-4" @click="triggerRain">
                <div class="house-4-window-circle"></div>
                <div class="house-4-windows">
                  <div class="house-windows-row">
                    <div class="window house-4-window">
                      <div class="house-4-window-frame"></div>
                    </div>
                  </div>
                </div>
                <div class="door house-4-door">
                  <div class="house-4-door-stairs">
                    <div class="house-4-door-rail"></div>
                  </div>
                </div>
              </div>

              <div class="house-5" @click="toggleNight">
                <div class="house-5-roof">
                  <div class="tank">
                    <div class="tank-details"></div>
                  </div>
                </div>
                <div class="house-5-windows">
                  <div class="house-windows-row top-row">
                    <div class="window house-5-window"></div>
                    <div class="window house-5-window"></div>
                    <div class="window house-5-window"></div>
                    <div class="antenna"></div>
                  </div>
                  <div class="house-windows-row">
                    <div class="window house-5-window"></div>
                    <div class="window house-5-window"></div>
                    <div class="window house-5-window"></div>
                  </div>
                  <div class="house-windows-row">
                    <div class="window house-5-window"></div>
                    <div class="door house-5-door"></div>
                    <div class="window house-5-window"></div>
                  </div>
                </div>
              </div>
            </div>

            <div id="tree-1" class="tree-container">
              <div class="tree">
                <div id="leaf-1" class="leaf"></div>
                <div id="leaf-2" class="leaf"></div>
                <div id="leaf-3" class="leaf"></div>
              </div>
              <div class="tree-base"></div>
            </div>

            <div
              id="streetlamp-1"
              class="streetlamp"
              @mouseenter="isGrayscale = true"
              @mouseleave="isGrayscale = false"
              @click="toggleGrayscale"
            >
              <div class="streetlamp-glow"></div>
            </div>

            <div
              id="streetlamp-2"
              class="streetlamp"
              @mouseenter="isGrayscale = true"
              @mouseleave="isGrayscale = false"
              @click="toggleGrayscale"
            >
              <div class="streetlamp-glow"></div>
            </div>

            <div id="tree-2" class="tree-container">
              <div class="tree">
                <div class="bird bird-1"></div>
                <div class="bird bird-2"></div>
              </div>
              <div class="tree-base"></div>
            </div>

            <div class="bike-container" :class="{ 'bike-animation': bikeAnimating }">
              <div class="bike-frame"><span></span></div>
              <div id="wheel-1" class="bike-wheel"><span></span></div>
              <div id="wheel-2" class="bike-wheel"><span></span></div>
            </div>

            <div class="mailtruck" :class="{ 'mailtruck-animation': truckAnimating }">
              <div class="mailtruck-letter">
                <div class="letter"></div>
              </div>
              <div class="mailtruck-wheels"></div>
              <div class="mailtruck-details">
                <span></span>
              </div>
            </div>

            <div class="rain" :style="{ display: showRain ? 'block' : 'none' }">
              <div v-for="n in 7" :key="n" class="drops-container">
                <div v-for="m in 16" :key="m" class="drop"></div>
              </div>
            </div>
          </div>
        </div>

        <p>Tap or click any building, tree, or lamppost for fun surprises!</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const isGrayscale = ref(false);
const isNight = ref(false);
const showRain = ref(false);
const showSmoke = ref(false);
const showShades = ref(true);
const bikeAnimating = ref(false);
const truckAnimating = ref(false);

const triggerRain = () => {
  showRain.value = true;
  setTimeout(() => {
    showRain.value = false;
  }, 2500);
};

const toggleHouse3 = () => {
  showShades.value = !showShades.value;
  showSmoke.value = !showSmoke.value;
};

const triggerBike = () => {
  bikeAnimating.value = true;
  setTimeout(() => {
    bikeAnimating.value = false;
  }, 6000);
};

const triggerMailTruck = () => {
  truckAnimating.value = true;
  setTimeout(() => {
    truckAnimating.value = false;
  }, 5000);
};

const toggleNight = () => {
  isNight.value = !isNight.value;
};

const toggleGrayscale = () => {
  isGrayscale.value = !isGrayscale.value;
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css?family=Sanchez');

* {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

*:before,
*:after {
  content: '';
  position: absolute;
  box-sizing: border-box;
}

.cityscape-viewport {
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  padding: 20px 5px;
  overflow-x: auto;
  display: flex;
  justify-content: center;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 640px) {
  .cityscape-viewport {
    padding: 8px 2px;
  }
}

@media (max-width: 420px) {
  .cityscape-viewport {
    padding: 5px 0px;
  }
}

.wrapper {
  font-family: 'Sanchez', serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transform-origin: top center;
  /* Prevent text selection on mobile for better UX */
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* Mobile scaling - optimized for phones like Samsung S25 */
@media (max-width: 1040px) {
  .wrapper {
    transform: scale(1);
  }
}

@media (max-width: 980px) {
  .wrapper {
    transform: scale(0.98);
  }
}

@media (max-width: 860px) {
  .wrapper {
    transform: scale(0.92);
  }
}

@media (max-width: 740px) {
  .wrapper {
    transform: scale(0.88);
  }
}

@media (max-width: 640px) {
  .wrapper {
    transform: scale(0.84);
  }
}

@media (max-width: 540px) {
  .wrapper {
    transform: scale(0.78);
  }
}

@media (max-width: 480px) {
  .wrapper {
    transform: scale(0.72);
  }
}

/* Samsung S25 and similar phones (360-420px width) */
@media (max-width: 420px) {
  .wrapper {
    transform: scale(0.68);
  }
}

@media (max-width: 380px) {
  .wrapper {
    transform: scale(0.64);
  }
}

@media (max-width: 360px) {
  .wrapper {
    transform: scale(0.62);
  }
}

h1 {
  position: absolute;
  margin: 20px;
  right: 0;
  z-index: 600;
  font-size: 30px;
  color: #71728f;
}

p {
  color: #4c4e75;
  text-align: center;
  margin: 12px auto;
  font-size: 16px;
  max-width: 90%;
}

@media (max-width: 640px) {
  p {
    font-size: 14px;
  }
}

.title-night {
  color: #cfebeb;
}

.grayscale {
  filter: grayscale(1);
}

.scene {
  width: 1000px;
  height: 600px;
  background-color: #e4f2ff;
  transition: all 0.3s ease;
}

.container {
  width: 1000px;
  height: 600px;
  position: relative;
  background-color: #204362;
  overflow: hidden;
  border-radius: 10px;
}

.container:before {
  width: 100%;
  height: 20px;
  background-color: #918686;
  bottom: 0px;
  border-radius: 10px;
  z-index: 200;
}

.skyscrapers {
  padding-top: 100px;
}

.skyscraper-night {
  opacity: 0.3;
}

.cloud-night {
  opacity: 0.05;
}

.skyscrapers,
.houses {
  position: absolute;
  width: 100%;
  height: auto;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  bottom: 20px;
  left: 0;
}

.skyscraper-1 {
  border-top: 24px solid transparent;
  border-bottom: none;
  border-right: 132px solid #d6d6d6;
  height: 194px;
  position: relative;
}

.skyscraper-1:before {
  border-top: 30px solid transparent;
  border-bottom: none;
  border-right: 90px solid #d6d6d6;
  height: 60px;
  transform: scaleX(-1);
  top: -60px;
  left: 15px;
}

.skyscraper-1:after {
  width: 4px;
  height: 48px;
  background-color: #d6d6d6;
  top: -100px;
  left: 30px;
}

.skyscraper-2 {
  background-color: #d6d6d6;
  width: 100px;
  height: 366px;
  margin-left: 67px;
  position: relative;
}

.skyscraper-2:before {
  width: 4px;
  height: 48px;
  background-color: #d6d6d6;
  top: -48px;
  left: 15px;
}

.skyscraper-3 {
  background-color: #d6d6d6;
  width: 140px;
  height: 480px;
  margin-left: 78px;
  position: relative;
}

.skyscraper-3:before {
  width: 16px;
  height: 8px;
  background-color: #d6d6d6;
  top: -8px;
}

.skyscraper-4 {
  background-color: #d6d6d6;
  width: 94px;
  height: 350px;
  margin-left: 20px;
  position: relative;
}

.skyscraper-5 {
  background-color: #d6d6d6;
  width: 94px;
  height: 422px;
  margin-left: 10px;
  position: relative;
}

.skyscraper-5:before {
  width: 12px;
  height: 4px;
  background-color: #d6d6d6;
  top: -4px;
  right: 10px;
}

.skyscraper-6 {
  background-color: #d6d6d6;
  width: 140px;
  height: 378px;
  margin-left: 77px;
  position: relative;
}

.skyscraper-6:before {
  width: 10px;
  height: 22px;
  background-color: #d6d6d6;
  top: -16px;
  right: 12px;
}

.skyscraper-6:after {
  width: 4px;
  height: 60px;
  background-color: #d6d6d6;
  top: -75px;
  right: 12px;
}

.house-1 {
  background-color: #edc181;
  width: 144px;
  height: 276px;
  position: relative;
  border-top: 6px solid #d9b176;
  border-right: 6px solid #d9b176;
}

.house-1:hover,
.house-2:hover,
.house-3:hover,
.house-4:hover,
.house-5:hover {
  animation: bounce 0.5s ease;
  z-index: 101;
  cursor: pointer;
}

/* Touch support - trigger animation on active (touch) state */
.house-1:active,
.house-2:active,
.house-3:active,
.house-4:active,
.house-5:active {
  animation: bounce 0.5s ease;
  z-index: 101;
}

.house-3:hover {
  z-index: 99;
}

.house-3:active {
  z-index: 99;
}

@keyframes bounce {
  from,
  20%,
  53%,
  80%,
  to {
    animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
    transform: translate3d(0, 0, 0);
  }
  40%,
  43% {
    animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
    transform: translate3d(0, 5px, 0);
  }
  70% {
    animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
    transform: translate3d(0, 2px, 0);
  }
  90% {
    transform: translate3d(0, 1px, 0);
  }
}

.house-1:before {
  background-color: #666961;
  height: 12px;
  width: 148px;
  right: -6px;
  top: -18px;
}

.house-1-windows {
  margin-top: 16px;
}

.window {
  width: 32px;
  height: 56px;
  position: relative;
}

.window:after {
  width: 40px;
  height: 8px;
  bottom: -2px;
  left: -10px;
}

.door {
  width: 44px;
  height: 74px;
  position: relative;
  top: 9px;
  margin: 6px;
}

.door:before {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: #f9bd82;
  top: 50%;
  right: 4px;
}

.door:after {
  width: 52px;
  height: 12px;
  bottom: -11px;
  left: -10px;
}

.house-1-window {
  background-color: #b2c7e6;
  border: 6px solid #666961;
  margin: 12px;
}

.house-1-window:before {
  width: 20px;
  height: 4px;
  background-color: #666961;
  bottom: 50%;
}

.house-1-window:after {
  background-color: #7c7f76;
  border-top: 3px solid #93968c;
}

.house-windows-row {
  display: flex;
  justify-content: center;
  align-items: center;
  height: contain;
}

.house-1-door {
  background-color: #93968c;
  border: 6px solid #666961;
}

.house-1-door:after {
  background-color: #8b8f85;
  border-bottom: 4px solid #b6baad;
  border-top: 4px solid #b6baad;
}

.house-2 {
  background-color: #ceae99;
  width: 202px;
  height: 330px;
  position: relative;
  border-top: 42px solid #b89b88;
}

.house-2:before {
  background-color: #997071;
  width: 218px;
  height: 14px;
  top: -22px;
  left: -8px;
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
}

.house-2:after {
  background-color: #997071;
  width: 226px;
  height: 14px;
  top: -42px;
  left: -12px;
}

.tank {
  width: 48px;
  height: 54px;
  background-color: #eadadb;
  position: relative;
  top: -105px;
  left: 15px;
}

.tank:before,
.tank:after {
  width: 6px;
  height: 9px;
  background-color: #ccbebf;
  border-top: 4px solid #a59a9a;
  bottom: -9px;
}

.tank:after {
  right: 0;
}

.tank-details {
  width: 22px;
  height: 7px;
  background-color: #ccbebf;
  border-top-left-radius: 2px;
  border-top-right-radius: 2px;
  left: 13px;
  position: absolute;
  top: -7px;
}

.tank-details:before {
  width: 48px;
  height: 2px;
  background-color: #ccbebf;
  bottom: -50px;
  left: -13px;
}

.tank-details:after {
  width: 48px;
  height: 8px;
  border-top: 2px solid #ccbebf;
  border-bottom: 2px solid #ccbebf;
  bottom: -20px;
  left: -13px;
}

.house-2-windows {
  margin-top: -54px;
}

.house-2-window {
  background-color: #cce1ff;
  border: 6px solid #997071;
  margin: 12px;
}

.house-2-window:before {
  width: 20px;
  height: 4px;
  background-color: #997071;
  bottom: 70%;
}

.house-2-window:after {
  background-color: #a87b7c;
  border-top: 3px solid #c28e8f;
}

.house-2-door {
  background-color: #705253;
  border: 6px solid #997071;
  top: 43px;
}

.house-2-door:after {
  background-color: #8a6566;
  border-bottom: 4px solid #c28e8f;
  border-top: 4px solid #c28e8f;
}

.house-2-sign {
  width: 22px;
  height: 100px;
  border-radius: 11px;
  background-color: #8d8f8c;
  border: 6px solid #caccc8;
  position: absolute;
  right: -29px;
  top: 10px;
  z-index: 100;
}

.house-2-sign:before,
.house-2-sign:after {
  width: 7px;
  height: 6px;
  background-color: inherit;
  left: -13px;
}

.house-2-sign:before {
  top: 8px;
}

.house-2-sign:after {
  bottom: 8px;
}

.house-2-rack {
  position: absolute;
  width: 94px;
  background-color: #b89b88;
  height: 4px;
  margin-top: 14px;
  margin-left: 82px;
}

.house-2-rack:before {
  border: 4px solid #e8ebe6;
  top: -4px;
  width: 94px;
  height: 32px;
  border-radius: 4px;
  background: repeating-linear-gradient(
    to right,
    transparent,
    transparent 6px,
    #e8ebe6 6px,
    #e8ebe6 10px
  );
}

.house-3-container {
  width: 144px;
  height: 160px;
  position: relative;
}

.house-3 {
  width: 144px;
  height: 160px;
  background-color: #ea8a85;
  border: 6px solid #c97c78;
  border-bottom: none;
  position: absolute;
}

.house-3:before {
  width: 32px;
  height: 48px;
  left: 50px;
  top: -62px;
  z-index: 101;
  border-top: 3px solid #bf5a5a;
  border-bottom: 4px solid #632e2e;
}

.house-3:after {
  background: linear-gradient(to bottom, #b65951, #b65951 50%, #964a43 50%, #964a43);
  background-size: 100% 8px;
  width: 144px;
  height: 56px;
  left: -6px;
  top: -62px;
  clip-path: polygon(17.5% 0%, 82.5% 0%, 100% 100%, 0% 100%);
}

.house-3-chimney {
  position: relative;
  background-color: #b3a6a6;
  width: 18px;
  height: 8px;
  border-bottom: 4px solid #c7baba;
  top: -70px;
  right: -90px;
}

.house-3-chimney:before {
  background-color: #eadadb;
  width: 22px;
  height: 6px;
  top: -6px;
  left: -2px;
  z-index: 102;
}

.smoke {
  position: absolute;
  z-index: 101;
  width: 110px;
  height: 170px;
  top: -170px;
  left: -45px;
  pointer-events: none;
}

.smoke span {
  display: block;
  position: absolute;
  bottom: -28px;
  left: 20px;
  height: 0px;
  width: 0px;
  border: 35px solid #fff;
  border-radius: 50%;
  opacity: 0;
  transform: scale(0.2);
}

@keyframes smokeL {
  0% {
    transform: scale(0.2) translate(0, 0);
  }
  10% {
    opacity: 1;
    transform: scale(0.2) translate(0, -5px);
  }
  100% {
    opacity: 0;
    transform: scale(1) translate(-20px, -130px);
  }
}

@keyframes smokeR {
  0% {
    transform: scale(0.2) translate(0, 0);
  }
  10% {
    opacity: 1;
    transform: scale(0.2) translate(0, -5px);
  }
  100% {
    opacity: 0;
    transform: scale(1) translate(20px, -130px);
  }
}

.smoke .s0 {
  animation: smokeL 10s 0s infinite;
}
.smoke .s1 {
  animation: smokeR 10s 1s infinite;
}
.smoke .s2 {
  animation: smokeL 10s 2s infinite;
}
.smoke .s3 {
  animation: smokeR 10s 3s infinite;
}
.smoke .s4 {
  animation: smokeL 10s 4s infinite;
}
.smoke .s5 {
  animation: smokeR 10s 5s infinite;
}
.smoke .s6 {
  animation: smokeL 10s 6s infinite;
}
.smoke .s7 {
  animation: smokeR 10s 7s infinite;
}
.smoke .s8 {
  animation: smokeL 10s 8s infinite;
}
.smoke .s9 {
  animation: smokeR 10s 9s infinite;
}

.house-3-windows {
  margin-top: -5px;
}

.house-3-window {
  background-color: #b2c7e6;
  border: 6px solid #964a43;
  margin: 15px;
  height: 48px;
}

.house-3-window:before,
.house-3-window:after {
  background-color: #b85a52;
  border-top: 3px solid #d4675e;
}

.house-3-window:before {
  width: 40px;
  height: 8px;
  top: -14px;
  left: -10px;
}

.house-3-window-shades {
  background: linear-gradient(to bottom, #d6e5fc, #d6e5fc 50%, #f0f6ff 50%, #f0f6ff);
  background-size: 100% 4px;
  width: 100%;
  height: 60%;
  border-bottom: 2px solid #72bcd4;
}

#shade-2 {
  height: 72%;
}

#shade-3 {
  height: 100%;
}

.house-3-door {
  margin-top: -10px;
  background-color: #964a43;
  border: 6px solid #b65951;
  border-bottom: none;
  height: 66px;
}

.house-3-roof-window {
  background-color: #cce1ff;
  border: 6px solid #d16465;
  position: absolute;
  top: -62px;
  z-index: 100;
  left: 50px;
  height: 48px;
}

.house-3-roof-window:before {
  top: -20px;
  left: -10px;
  width: 0;
  height: 0;
  border-left: 20px solid transparent;
  border-right: 20px solid transparent;
  border-bottom: 14px solid #e86e6f;
}

.house-3-roof-window:after {
  background-color: #e86e6f;
  border-top: 3px solid #ff7a81;
}

.house-4 {
  background: linear-gradient(to bottom, #babdb0, #babdb0 40%, #ced1c3 40%, #ced1c3);
  background-size: 100% 8px;
  width: 100px;
  height: 230px;
  border-top: 50px solid #ced1c3;
  position: relative;
}

.house-4:before {
  width: 108px;
  height: 50px;
  border-top: 6px solid #5a6666;
  border-bottom: 6px solid #5a6666;
  top: -50px;
  left: -4px;
}

.house-4:after {
  width: 0;
  height: 0;
  border-left: 50px solid transparent;
  border-right: 50px solid transparent;
  border-bottom: 22px solid #738282;
  top: -72px;
}

.house-4-window-circle {
  width: 30px;
  height: 30px;
  background-color: #cde1fe;
  border-radius: 50%;
  border: 6px solid #5a6666;
  position: relative;
  left: 33px;
  top: -40px;
}

.house-4-window-circle:before {
  width: 4px;
  height: 18px;
  background-color: #5a6666;
  left: 7px;
}

.house-4-window-circle:after {
  width: 18px;
  height: 4px;
  background-color: #5a6666;
  top: 7px;
}

.house-4-windows {
  margin-top: -22px;
}

.house-4-window {
  width: 50px;
  height: 50px;
  background-color: #cce1ff;
  border: 6px solid #5a6666;
  margin: 12px;
}

.house-4-window:before {
  width: 4px;
  left: 17px;
  height: 100%;
  background-color: #5a6666;
}

.house-4-window:after {
  background-color: #738282;
  border-top: 3px solid #8b9e9e;
  width: 58px;
  height: 8px;
  bottom: -2px;
  left: -10px;
}

.house-4-window-frame {
  width: 26px;
  height: 100%;
  left: 6px;
  position: absolute;
  border-left: 4px solid #5a6666;
  border-right: 4px solid #5a6666;
}

.house-4-window-frame:before,
.house-4-window-frame:after {
  background-color: #5a6666;
  width: 6px;
  height: 4px;
  top: 20px;
}

.house-4-window-frame:before {
  left: -10px;
}

.house-4-window-frame:after {
  right: -10px;
}

.house-4-door {
  left: 25px;
  background-color: #5a6666;
  border: 6px solid #738282;
  border-bottom: none;
  height: 66px;
  width: 38px;
}

.house-4-door-stairs {
  background-color: #cfebeb;
  width: 56px;
  height: 6px;
  position: relative;
  top: 71px;
  left: -9px;
}

.house-4-door-stairs:before {
  background-color: inherit;
  width: 50px;
  height: 6px;
  top: -6px;
}

.house-4-door-stairs:after {
  background-color: inherit;
  width: 44px;
  height: 6px;
  top: -12px;
}

.house-4-door-rail {
  top: -26px;
  left: 10px;
  position: absolute;
  background-color: transparent;
  width: 14px;
  height: 14px;
  border-left: 4px solid #cfebeb;
  border-right: 4px solid #cfebeb;
}

.house-4-door-rail:before {
  width: 34px;
  height: 4px;
  background-color: #cfebeb;
  top: -4px;
  left: -14px;
}

.house-4-door-rail:after {
  background-color: transparent;
  width: 34px;
  height: 14px;
  border-left: 4px solid #cfebeb;
  border-right: 4px solid #cfebeb;
  left: -14px;
}

.house-5 {
  width: 216px;
  height: 160px;
  background-color: #8a6259;
  border-left: 6px solid #7f5b52;
  border-top: 6px solid #7f5b52;
  position: relative;
}

.house-5:before {
  background-color: #61453e;
  width: 220px;
  height: 8px;
  top: -14px;
  left: -6px;
}

.house-5:after {
  background-color: #b09b95;
  width: 194px;
  height: 100px;
  top: -114px;
  left: 5px;
  border-top: 6px solid #9c8984;
}

.house-5-roof {
  position: absolute;
  background-color: #6e615d;
  width: 202px;
  height: 8px;
  top: -122px;
  left: 2px;
}

.house-5-roof:before {
  background-color: #c7baba;
  width: 42px;
  height: 30px;
  top: -30px;
  left: 16px;
}

.house-5-roof:after {
  border-top: 6px solid #c7baba;
  width: 48px;
  height: 30px;
  background: repeating-linear-gradient(
    to right,
    transparent,
    transparent 6px,
    #c7baba 6px,
    #c7baba 12px
  );
  top: -30px;
  left: 58px;
}

.house-5 .house-5-roof .tank {
  top: -55px;
  left: 124px;
  width: 58px;
  height: 46px;
}

.house-5 .house-5-roof .tank-details {
  width: 30px;
  height: 7px;
  background-color: #ccbebf;
  border-top-left-radius: 2px;
  border-top-right-radius: 2px;
  left: 15px;
  position: absolute;
  top: -7px;
}

.house-5 .house-5-roof .tank-details:before {
  width: 58px;
  height: 2px;
  background-color: #ccbebf;
  bottom: -40px;
  left: -15px;
}

.house-5 .house-5-roof .tank-details:after {
  width: 58px;
  height: 8px;
  border-top: 2px solid #ccbebf;
  border-bottom: 2px solid #ccbebf;
  left: -15px;
}

.house-5-windows {
  margin-top: 3px;
  margin-left: -3px;
}

.house-5-window {
  background-color: #d6e5fc;
  border: 6px solid #61453e;
  margin: 15px;
  height: 48px;
}

.house-5-window:before,
.house-5-window:after {
  background-color: #705048;
  border-top: 3px solid #7a574f;
}

.house-5-window:before {
  width: 40px;
  height: 8px;
  top: -14px;
  left: -10px;
}

.house-5-windows .top-row {
  position: absolute;
  margin-top: -100px;
  z-index: 101;
  left: 10px;
}

.house-5-windows .top-row .house-5-window {
  border: 6px solid #6e615d;
}

.house-5-windows .top-row .house-5-window:before,
.house-5-windows .top-row .house-5-window:after {
  background-color: #857570;
  border-top: 3px solid #9c8984;
}

.house-5-door {
  margin-top: -10px;
  background-color: #705048;
  border: 6px solid #61453e;
  border-bottom: none;
  height: 66px;
}

.antenna {
  width: 24px;
  height: 24px;
  background-color: #a69b9b;
  border: 10px solid #eadadb;
  position: absolute;
  z-index: 102;
  border-radius: 50%;
  right: 0;
  top: 36px;
  margin-right: 10px;
}

.antenna:before,
.antenna:after {
  background-color: inherit;
  opacity: 0.3;
}

.antenna:before {
  width: 2px;
  height: 24px;
  top: -10px;
  left: 1px;
}

.antenna:after {
  width: 24px;
  height: 2px;
  left: -10px;
  top: 1px;
}

.streetlamp {
  position: absolute;
  bottom: 20px;
  width: 4px;
  height: 122px;
  background-color: #677575;
  margin: 0 170px;
  cursor: pointer;
  z-index: 200;
}

.streetlamp:before {
  width: 8px;
  height: 25px;
  background-color: #809191;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  bottom: 0;
  left: -2px;
}

.streetlamp:after {
  width: 12px;
  height: 12px;
  background-color: #809191;
  border-radius: 50%;
  left: -4px;
  top: -10px;
}

.streetlamp:hover > .streetlamp-glow {
  opacity: 1;
}

/* Touch support for mobile - show glow when grayscale is active */
.grayscale .streetlamp-glow {
  opacity: 1;
}

.streetlamp-glow {
  position: absolute;
  z-index: 102;
  width: 12px;
  height: 12px;
  top: -10px;
  left: -4px;
  border-radius: 50%;
  background-color: #fff;
  box-shadow: 0 0 60px 30px #fff;
  opacity: 0;
}

#streetlamp-1 {
  left: 76px;
}

#streetlamp-2 {
  left: 426px;
}

.tree-container {
  position: absolute;
  width: 75px;
  height: 148px;
  z-index: 200;
  bottom: 20px;
}

#tree-1 {
  left: 25px;
}

#tree-2 {
  left: 895px;
}

.leaf {
  position: absolute;
  width: 10px;
  height: 3px;
  background-color: #91dba6;
  border-radius: 50%;
  margin-top: -10px;
}

#leaf-1 {
  left: -10px;
}

#leaf-2 {
  left: 2px;
  animation-duration: 0.8s;
}

#leaf-3 {
  left: 24px;
  top: -12px;
  animation-duration: 1.5s;
}

.tree-base {
  position: relative;
  width: 26px;
  height: 4px;
  background-color: #bfb2b3;
  top: -15px;
  margin-top: 144px;
  left: 26px;
}

.tree-base:before {
  background: repeating-linear-gradient(
    to right,
    #f4f7f2,
    #f4f7f2 6px,
    transparent 6px,
    transparent 10px
  );
  width: 36px;
  height: 15px;
  top: -4px;
  left: -4px;
}

.tree-base:after {
  width: 42px;
  height: 8px;
  background-color: #bfb2b3;
  top: 11px;
  left: -7px;
}

.tree:hover {
  cursor: pointer;
  animation: shake 0.82s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
  perspective: 1000px;
}

/* Touch support for trees */
.tree:active {
  cursor: pointer;
  animation: shake 0.82s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
  perspective: 1000px;
}

.tree:hover .leaf {
  animation: falling 2s ease;
}

.tree:active .leaf {
  animation: falling 2s ease;
}

@keyframes falling {
  0% {
    transform: translate3d(30, 0, 0) rotate(0deg);
    opacity: 1;
  }
  70% {
    transform: translate3d(30, 0, 0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translate3d(-30px, 70px, 0) rotate(90deg);
    opacity: 0;
  }
}

@keyframes shake {
  10%,
  90% {
    transform: translate3d(-1px, 0, 0);
  }
  20%,
  80% {
    transform: translate3d(2px, 0, 0);
  }
  30%,
  50%,
  70% {
    transform: translate3d(-4px, 0, 0);
  }
  40%,
  60% {
    transform: translate3d(4px, 0, 0);
  }
}

.tree {
  width: 10px;
  height: 75px;
  background-color: #936161;
  margin-left: 9px;
  border-top: 5px solid #704a4a;
  bottom: 8px;
  position: absolute;
  left: 26px;
}

.tree:before {
  background-color: #91dba6;
  width: 75px;
  height: 40px;
  border-top-left-radius: 60px;
  border-bottom-left-radius: 90px;
  border-top-right-radius: 60px;
  border-bottom-right-radius: 90px;
  left: -35px;
  margin-top: -45px;
}

.tree:after {
  background-color: #91dba6;
  width: 40px;
  height: 60px;
  border-top-left-radius: 60px;
  border-top-right-radius: 80px;
  border-bottom-left-radius: 60px;
  border-bottom-right-radius: 90px;
  margin-top: -70px;
  left: -15px;
  transform: rotate(-10deg);
}

.sun {
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #fdf381;
  left: 130px;
  top: 80px;
}

.moon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: #3f6b91;
  margin-left: 25px;
  display: none;
}

#cloud-sun {
  position: absolute;
  margin-left: 130px;
  margin-top: 15px;
  display: none;
  transform: scale(0.4);
}

.cloud-container {
  height: 100%;
}

#cloud-1 {
  top: 5px;
  transform: scale(0.35);
  animation: clouds 20s linear infinite;
  animation-delay: 5s;
}

#cloud-2 {
  top: 80px;
  transform: scale(0.35);
  animation: clouds 24s linear infinite;
  animation-delay: 1s;
}

#cloud-3 {
  top: 120px;
  transform: scale(0.25);
  animation: clouds 26s linear infinite;
  animation-delay: 4s;
}

#cloud-4 {
  top: 160px;
  transform: scale(0.2);
  animation: clouds 14s linear infinite;
}

#cloud-5 {
  top: 200px;
  transform: scale(0.2);
  animation: clouds 18s linear infinite;
  animation-delay: 10s;
}

.cloud {
  width: 350px;
  height: 120px;
  background: #fff;
  border-radius: 100px;
  position: absolute;
  transform: scale(0.3);
  left: -250px;
}

.cloud:after,
.cloud:before {
  content: '';
  position: absolute;
  background: inherit;
  z-index: -1;
}

.cloud:after {
  width: 100px;
  height: 100px;
  top: -50px;
  left: 50px;
  border-radius: 100px;
}

.cloud:before {
  width: 180px;
  height: 180px;
  top: -90px;
  right: 50px;
  border-radius: 200px;
}

@keyframes clouds {
  0% {
    left: -250px;
  }
  100% {
    left: 100%;
  }
}

.bird:before,
.bird:after {
  border: 2px solid #5a6666;
  border-bottom: 0;
  width: 18px;
  height: 8px;
  z-index: 200;
}

.bird {
  position: absolute;
  animation: bird 1s infinite;
  z-index: 200;
  transition: all 2s ease-in-out;
  z-index: -1;
}

.bird:after {
  border-top-left-radius: 18px;
  border-top-right-radius: 18px;
  border-right: 0;
  animation: wing-right 1s infinite;
  transform-origin: bottom left;
}

.bird:before {
  left: -16px;
  border-top-right-radius: 18px;
  border-top-left-radius: 18px;
  border-left: 0;
  animation: wing-left 1s infinite;
  transform-origin: bottom right;
}

.bird-1 {
  top: -50px;
  transform: scale(0.9);
}

.bird-2 {
  top: -30px;
  transform: scale(0.7);
  animation-delay: 2s;
}

.tree:hover .bird-1 {
  animation: flying-1 0.8s ease-in;
}

.tree:hover .bird-2 {
  animation: flying-2 1s ease-in;
}

/* Touch support for bird flying */
.tree:active .bird-1 {
  animation: flying-1 0.8s ease-in;
}

.tree:active .bird-2 {
  animation: flying-2 1s ease-in;
}

@keyframes flying-1 {
  60% {
    opacity: 1;
  }
  100% {
    transform: translate3d(100px, -100px, 0) rotate(45deg);
    opacity: 0;
  }
}

@keyframes flying-2 {
  60% {
    opacity: 1;
  }
  100% {
    transform: translate3d(20px, -150px, 0) rotate(-5deg);
    opacity: 0;
  }
}

@keyframes bird {
  0% {
    transform: translate(0px, 0px);
  }
  50% {
    transform: translate(2px, -3px);
  }
  100% {
    transform: translate(0px, 0px);
  }
}

@keyframes wing-right {
  0% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(10deg);
  }
  100% {
    transform: rotate(0deg);
  }
}

@keyframes wing-left {
  0% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(-10deg);
  }
  100% {
    transform: rotate(0deg);
  }
}

.bike-container {
  position: absolute;
  width: 96px;
  height: 70px;
  bottom: 20px;
  left: -96px;
  z-index: 200;
}

.bike-animation {
  animation: bike 6s linear;
}

@keyframes bike {
  0% {
    left: -96px;
  }
  100% {
    left: 100%;
  }
}

.bike-frame {
  position: relative;
}

.bike-frame:before,
.bike-frame:after {
  position: absolute;
  width: 30px;
  height: 24px;
  margin-left: 24px;
  margin-top: 28px;
  border: 3px solid #324172;
}

.bike-frame:before {
  transform: skew(-30deg);
}

.bike-frame:after {
  top: -6px;
  left: 11px;
  width: 34px;
  height: 30px;
  transform: skew(32deg);
  border-top: none;
  border-bottom: none;
}

.bike-frame span {
  position: absolute;
  width: 10px;
  height: 3px;
  background-color: #50698b;
  border-radius: 3px;
  top: 22px;
  left: 24px;
}

.bike-frame span:before {
  position: absolute;
  width: 10px;
  height: 3px;
  background-color: #324172;
  border-radius: 3px;
  left: 26px;
  top: -3px;
}

.bike-wheel {
  width: 37px;
  height: 37px;
  border-radius: 50%;
  border: 3px solid #5a6666;
  position: absolute;
  transform-origin: center center;
  animation: rotation 2s infinite linear;
  bottom: 0;
}

#wheel-1 {
  left: 0;
}

#wheel-2 {
  right: 0;
}

@keyframes rotation {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.bike-wheel:before,
.bike-wheel:after,
.bike-wheel span,
.bike-wheel span:before {
  position: absolute;
  width: 100%;
  height: 1px;
  background-color: #758585;
  top: 15px;
}

.bike-wheel:after {
  transform: rotate(90deg);
}

.bike-wheel span {
  transform: rotate(45deg);
}

.bike-wheel span:before {
  transform: rotate(90deg);
  top: 0px;
}

.mailtruck {
  position: absolute;
  background-color: #e9ebea;
  width: 100px;
  height: 80px;
  bottom: 32px;
  border-radius: 5px;
  border-top: 6px solid #cacccb;
  right: -155px;
  transform: scaleX(-1);
  z-index: 200;
}

.mailtruck-animation {
  animation: truck 5s linear;
}

@keyframes truck {
  0% {
    right: -155px;
  }
  69% {
    right: 80%;
  }
  70% {
    right: 79.5%;
  }
  71% {
    right: 79%;
  }
  85% {
    right: 79%;
  }
  100% {
    right: 100%;
  }
}

.mailtruck:before {
  background-color: #e9ebea;
  width: 30px;
  height: 60px;
  bottom: 0px;
  right: -30px;
  border-top-right-radius: 5px;
  border-left: 1px solid #4d4d4b;
  border-top: 6px solid #cacccb;
}

.mailtruck:after {
  background-color: #e9ebea;
  width: 15px;
  height: 28px;
  bottom: 6px;
  right: -45px;
  border-top-right-radius: 15px;
  border-right: 1px solid #cacccb;
}

.mailtruck-wheels {
  width: 155px;
  height: 6px;
  background-color: #4d4d4b;
  bottom: 0;
  position: absolute;
  left: -5px;
  border-radius: 2px;
}

.mailtruck-wheels:before,
.mailtruck-wheels:after {
  width: 30px;
  height: 30px;
  background-color: gray;
  border-radius: 50%;
  border: 10px solid #4d4d4b;
  top: -12px;
  z-index: 102;
}

.mailtruck-wheels:before {
  left: 15px;
}

.mailtruck-wheels:after {
  right: 15px;
}

.mailtruck-details {
  background-color: #8bcfde;
  width: 20px;
  height: 15px;
  right: -25px;
  top: 25px;
  position: absolute;
}

.mailtruck-details:before {
  width: 100px;
  height: 12px;
  left: -105px;
  top: 20px;
  z-index: 101;
  border-top: 4px solid #4497bd;
  border-bottom: 4px solid #db353c;
}

.mailtruck-details:after {
  background-color: #4d4d4b;
  width: 10px;
  height: 4px;
  bottom: -9px;
  border-radius: 2px;
}

.mailtruck-details span {
  background-color: #dfab3e;
  width: 6px;
  height: 8px;
  position: absolute;
  border-left: #4d4d4b solid 3px;
  left: 37px;
  z-index: 101;
  top: 28px;
}

.mailtruck-letter {
  width: 50px;
  height: 35px;
  background-color: #4497bd;
  display: flex;
  justify-content: center;
  align-items: center;
  transform: skewX(10deg);
  margin-left: 25px;
  margin-top: 5px;
}

.letter {
  transform: scale(0.6) skewX(-10deg);
  background-color: #e9ebea;
  position: relative;
  height: 35px;
  width: 50px;
  overflow: hidden;
}

.letter:before,
.letter:after {
  left: 50%;
  height: 20px;
  width: 20px;
  transform: rotate(45deg) skew(-5deg, -5deg);
  margin-left: -25px;
  height: 50px;
  width: 50px;
  background-color: #e9ebea;
}

.letter:before {
  bottom: -100%;
  box-shadow: -2px -2px 0 0 #4497bd;
}

.letter:after {
  top: -95%;
  box-shadow: 2px 2px 0 0 #4497bd;
}

.rain {
  width: 100%;
  height: 100%;
  background-color: rgba(100, 100, 100, 0.3);
  position: absolute;
  top: 0;
  z-index: 300;
  display: none;
}

.drops-container {
  width: 170px;
  height: 700px;
  top: -100px;
  position: absolute;
  left: 5px;
}

.night {
  opacity: 0.8;
  background-color: #3f6b91;
}

.drops-container:nth-child(2) {
  margin-left: 170px;
}

.drops-container:nth-child(3) {
  margin-left: 340px;
}

.drops-container:nth-child(4) {
  margin-left: 510px;
}

.drops-container:nth-child(5) {
  margin-left: 680px;
}

.drops-container:nth-child(6) {
  margin-left: 850px;
}

.drops-container:nth-child(7) {
  margin-left: 1020px;
}

.drop {
  background: #fff;
  width: 1px;
  height: 20px;
  top: -40px;
  animation: fall 1.2s ease-in 0s infinite;
  animation-fill-mode: both;
  margin-right: 45px;
  position: absolute;
  animation-delay: 0.9s;
  margin-left: 10px;
}

.drop:nth-child(even) {
  top: -80px;
}

.drop:nth-child(3n - 1) {
  top: -10px;
}

.drop:nth-child(3n + 1) {
  margin-left: 40px;
}

.drop:nth-child(3n) {
  margin-left: 80px !important;
}

.drop:nth-child(4n) {
  margin-left: 120px !important;
}

.drop:nth-child(5) ~ .drop {
  animation-delay: 0.6s !important;
  left: 30px;
}

.drop:nth-child(8) ~ .drop {
  animation-delay: 0.3s !important;
  left: 0px;
}

.drop:nth-child(12) ~ .drop {
  animation-delay: 0s !important;
  left: 30px;
}

@keyframes fall {
  0% {
    margin-top: 90px;
    opacity: 1;
  }
  60% {
    opacity: 1;
  }
  100% {
    margin-top: 700px;
    opacity: 0;
  }
}

.window-night {
  background-color: #ffe9ab;
  box-shadow: inset 0px 0px 5px 1px #3f6b91;
}
</style>
