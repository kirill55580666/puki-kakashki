<script setup lang="ts">
import { computed, useId } from 'vue';
import { durationLabel } from '../lib/duration';
const model = defineModel<number | null>({ required: true });
defineProps<{ disabled?: boolean }>();
const id = useId();
const strength = computed(() => (model.value == null ? 0 : (Math.min(model.value, 60) - 1) / 59));
const glow = computed(() => ({
  '--duration-position': `${strength.value * 100}%`,
  '--duration-strength': strength.value,
  '--duration-halo': `${14 + strength.value * 36}px`,
  '--duration-alpha': model.value == null ? 0 : 0.12 + strength.value * 0.7,
  '--duration-speed': `${3.7 - strength.value * 1.9}s`,
  '--duration-drift': `${1 + strength.value * 4}px`,
}));
function updateNumber(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.value === '') model.value = null;
  else if (input.validity.valid) model.value = input.valueAsNumber;
}
function chooseMinimum(event: KeyboardEvent) {
  if (model.value == null && ['Home', 'ArrowLeft', 'ArrowDown'].includes(event.key)) {
    event.preventDefault();
    model.value = 1;
  }
}
</script>

<template>
  <fieldset
    class="attempt-duration"
    :disabled="disabled"
    :style="glow"
  >
    <legend>Время попытки <span>необязательно</span></legend>
    <p class="duration-subtitle">Сколько времени провела в туалете?</p>
    <output
      :for="`${id}-range ${id}-number`"
      class="duration-reading"
      aria-live="polite"
    >
      {{ model == null ? 'Не указано' : durationLabel(model) }}
    </output>
    <div
      class="duration-control"
      :class="{ 'is-empty': model == null }"
    >
      <div
        class="duration-track"
        aria-hidden="true"
      >
        <div class="duration-fill" />
      </div>
      <div
        class="duration-halo"
        aria-hidden="true"
      >
        <span />
      </div>
      <input
        :id="`${id}-range`"
        class="duration-range"
        type="range"
        min="1"
        max="60"
        step="1"
        :value="Math.min(model ?? 1, 60)"
        :aria-valuetext="model == null ? 'Не указано' : durationLabel(model)"
        aria-label="Длительность попытки в минутах"
        @input="model = Number(($event.target as HTMLInputElement).value)"
        @keydown="chooseMinimum"
        @pointerup="model == null && (model = 1)"
      />
    </div>
    <div
      class="duration-scale"
      aria-hidden="true"
    >
      <span>1 мин</span><span>30 мин</span><span>60+ мин</span>
    </div>
    <div class="duration-entry">
      <label :for="`${id}-number`">Или укажи точнее</label>
      <div>
        <input
          :id="`${id}-number`"
          type="number"
          min="1"
          max="1440"
          step="1"
          :value="model ?? ''"
          inputmode="numeric"
          @input="updateNumber"
        /><span>мин</span>
      </div>
    </div>
    <button
      type="button"
      class="text-button duration-clear"
      @click="model = null"
    >
      Не помню время
    </button>
  </fieldset>
</template>

<style scoped>
.attempt-duration {
  --duration-brown: #7b4529;
  border: 0;
  padding: 0;
  margin: 24px 0;
  min-width: 0;
  isolation: isolate;
}
legend {
  font-size: 14px;
  font-weight: 900;
  color: #765565;
}
legend span {
  font-size: 11px;
  font-weight: 500;
  color: #92717f;
}
.duration-subtitle {
  font-size: 12px;
  margin: 6px 0 0;
  color: #92717f;
}
.duration-reading {
  display: block;
  margin-top: 18px;
  font-size: 25px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #674c59;
}
.duration-control {
  position: relative;
  height: 66px;
  margin-top: 6px;
}
.duration-track {
  position: absolute;
  left: 14px;
  right: 14px;
  top: 29px;
  height: 8px;
  border-radius: 99px;
  background: #f4e8ee;
}
.duration-fill {
  height: 100%;
  width: var(--duration-position);
  border-radius: 99px;
  background: linear-gradient(90deg, #c69b7c, var(--duration-brown));
  transition: width 0.16s ease;
  filter: drop-shadow(0 0 calc(2px + var(--duration-strength) * 7px) #975d3d55);
}
.duration-halo {
  position: absolute;
  left: calc(14px + (100% - 28px) * var(--duration-strength));
  top: 33px;
  width: 0;
  height: 0;
  pointer-events: none;
  transition: left 0.16s ease;
}
.duration-halo span {
  position: absolute;
  left: calc(-1 * var(--duration-halo));
  top: calc(-1 * var(--duration-halo));
  width: calc(var(--duration-halo) * 2);
  height: calc(var(--duration-halo) * 2);
  border-radius: 43% 57% 61% 39%;
  background: radial-gradient(ellipse, #87502f 0%, #a76e3b 25%, transparent 70%);
  filter: blur(7px);
  opacity: var(--duration-alpha);
  animation: duration-float var(--duration-speed) ease-in-out infinite alternate;
  transition:
    width 0.25s,
    height 0.25s,
    left 0.25s,
    top 0.25s,
    opacity 0.25s;
}
.duration-range {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 66px;
  margin: 0;
  padding: 0;
  background: transparent;
  border: 0;
  appearance: none;
  z-index: 1;
  cursor: pointer;
}
.duration-range::-webkit-slider-runnable-track {
  height: 8px;
  background: transparent;
}
.duration-range::-webkit-slider-thumb {
  appearance: none;
  width: 28px;
  height: 28px;
  border: 3px solid #fffcfa;
  border-radius: 50%;
  margin-top: -10px;
  background: var(--duration-brown);
  box-shadow:
    0 2px 5px #45251335,
    0 0 calc(4px + var(--duration-strength) * 18px) #9a603d66;
  transition: box-shadow 0.25s;
}
.duration-range::-moz-range-track {
  height: 8px;
  background: transparent;
}
.duration-range::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border: 3px solid #fffcfa;
  border-radius: 50%;
  background: var(--duration-brown);
  box-shadow: 0 0 calc(4px + var(--duration-strength) * 18px) #9a603d66;
}
.is-empty {
  opacity: 0.5;
}
.duration-scale {
  display: flex;
  justify-content: space-between;
  color: #92717f;
  font-size: 11px;
  margin-bottom: 18px;
}
.duration-entry {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-top: 1px solid #eee3e7;
  padding-top: 16px;
  font-size: 12px;
  color: #92717f;
}
.duration-entry label {
  margin: 0;
  font-weight: 500;
}
.duration-entry > div {
  display: flex;
  align-items: center;
  gap: 7px;
}
.duration-entry input {
  box-sizing: border-box;
  width: 80px;
  margin: 0;
  padding: 10px;
  font-size: 16px;
  font-variant-numeric: tabular-nums;
}
.duration-clear {
  min-height: 44px;
}
fieldset:disabled {
  opacity: 0.65;
}
@keyframes duration-float {
  from {
    transform: translate(calc(-1 * var(--duration-drift)), 1px) scale(0.86) rotate(-12deg);
  }
  to {
    transform: translate(var(--duration-drift), -2px) scale(1.12) rotate(14deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
  }
}
</style>
