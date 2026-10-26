<script setup lang="ts">
import { computed, ref } from 'vue';
import { events } from '../state';
import { dayKey, fromDay } from '../lib/dates';
import ActivityInsights from '../components/ActivityInsights.vue';
import HealthInsights from '../components/HealthInsights.vue';
import StoolIcon from '../components/StoolIcon.vue';
import { bristolBreakdown } from '../lib/bristol';
const props = defineProps<{ today: string }>();
const breakdownOpen = ref(false);
const monthRows = computed(() =>
  events.value.filter((e) => dayKey(e.occurred_at).slice(0, 7) === props.today.slice(0, 7)),
);
const monthPoops = computed(() => monthRows.value.filter((event) => event.type === 'poop'));
const breakdown = computed(() => bristolBreakdown(monthPoops.value));
const monthLabel = computed(() =>
  fromDay(props.today).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
);
const achievements = computed(() => [
  {
    icon: '🌱',
    title: 'Первый шаг',
    text: 'Первая запись в дневнике',
    unlocked: events.value.length > 0,
  },
  {
    icon: '🎀',
    title: 'Своя маленькая история',
    text: '10 сохранённых моментов',
    unlocked: events.value.length >= 10,
  },
  {
    icon: '🌷',
    title: 'Внимание к себе',
    text: 'Записи в 7 разных дней',
    unlocked: new Set(events.value.map((e) => dayKey(e.occurred_at))).size >= 7,
  },
]);
</script>
<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">ЗАМЕЧАТЬ — ЗНАЧИТ ЗАБОТИТЬСЯ</span>
      <h1>Твой ритм<span class="pink"> ✧</span></h1>
      <p>Немного цифр из твоей маленькой истории.</p>
    </div>
  </div>
  <div class="stats-grid">
    <section
      class="stat-card peach bristol-stat"
      :class="{ expanded: breakdownOpen }"
    >
      <button
        type="button"
        class="bristol-summary"
        :aria-label="`Какашек в этом месяце: ${monthPoops.length}. Разбивка по типам`"
        :aria-expanded="breakdownOpen"
        aria-controls="bristol-breakdown"
        @click="breakdownOpen = !breakdownOpen"
      >
        <span
          class="stat-emoji"
          aria-hidden="true"
          >💩</span
        >
        <strong>{{ monthPoops.length }}</strong>
        <span class="stat-label">какашек в этом месяце</span>
        <span class="breakdown-toggle"
          >По типам
          <span
            class="breakdown-chevron"
            aria-hidden="true"
            >⌄</span
          ></span
        >
      </button>
      <div
        id="bristol-breakdown"
        class="breakdown-collapse"
        :aria-hidden="!breakdownOpen"
        :inert="!breakdownOpen"
      >
        <div class="breakdown-clip">
          <div class="bristol-breakdown">
            <p class="breakdown-period">{{ monthLabel }} · все записи дефекации</p>
            <p
              v-if="!monthPoops.length"
              class="breakdown-empty"
            >
              Пока нет записей за этот месяц ♡
            </p>
            <ul>
              <li
                v-for="item in breakdown"
                :key="item.type ?? 'unknown'"
              >
                <StoolIcon :type="item.type" />
                <div class="breakdown-description">
                  <span>{{ item.type ? `Тип ${item.type} · ` : '' }}{{ item.name }}</span>
                  <div
                    class="breakdown-track"
                    aria-hidden="true"
                  >
                    <div :style="{ width: `${item.percentage}%` }" />
                  </div>
                </div>
                <span class="breakdown-count"
                  >{{ item.count }}<small>{{ item.percentage }}%</small></span
                >
              </li>
            </ul>
            <p class="breakdown-note">Одна запись — один момент. Проценты округлены.</p>
          </div>
        </div>
      </div>
    </section>
    <section class="stat-card lavender">
      <span>💨</span><strong>{{ monthRows.filter((e) => e.type === 'fart').length }}</strong>
      <p>пуков в этом месяце</p>
    </section>
  </div>
  <ActivityInsights :today="today" />
  <HealthInsights :today="today" />
  <h2 class="achievements-heading">Маленькие достижения <span class="pink">♡</span></h2>
  <div class="achievements">
    <section
      v-for="a in achievements"
      :key="a.title"
      class="card achievement"
      :class="{ locked: !a.unlocked }"
    >
      <span>{{ a.icon }}</span>
      <h3>{{ a.title }}</h3>
      <p>{{ a.text }}</p>
      <small>{{ a.unlocked ? 'Открыто ♡' : 'Ещё впереди' }}</small>
    </section>
  </div>
</template>
