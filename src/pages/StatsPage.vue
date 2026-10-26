<script setup lang="ts">
import { computed, ref } from 'vue';
import { events } from '../state';
import { dayKey, recentDays, prettyDate, fromDay } from '../lib/dates';
import StoolIcon from '../components/StoolIcon.vue';
import { bristolBreakdown } from '../lib/bristol';
const props = defineProps<{ today: string }>();
const period = ref(7);
const breakdownOpen = ref(false);
const dates = computed(() => recentDays(period.value, fromDay(props.today)));
const rows = computed(() =>
  events.value.filter((e) => dates.value.includes(dayKey(e.occurred_at))),
);
const monthRows = computed(() =>
  events.value.filter((e) => dayKey(e.occurred_at).slice(0, 7) === props.today.slice(0, 7)),
);
const monthPoops = computed(() => monthRows.value.filter((event) => event.type === 'poop'));
const breakdown = computed(() => bristolBreakdown(monthPoops.value));
const monthLabel = computed(() =>
  fromDay(props.today).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
);
const poopDays = computed(
  () => new Set(rows.value.filter((e) => e.type === 'poop').map((e) => dayKey(e.occurred_at))).size,
);
const chart = computed(() =>
  dates.value.map((day) => ({
    day,
    poop: rows.value.filter((e) => dayKey(e.occurred_at) === day && e.type === 'poop').length,
    fart: rows.value.filter((e) => dayKey(e.occurred_at) === day && e.type === 'fart').length,
  })),
);
const max = computed(() => Math.max(1, ...chart.value.map((d) => d.poop + d.fart)));
const best = computed(
  () => [...chart.value].filter((d) => d.fart).sort((a, b) => b.fart - a.fart)[0],
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
  <section class="card chart-card">
    <div class="section-head">
      <div>
        <span class="eyebrow">МАЛЕНЬКИЕ МОМЕНТЫ В ЦИФРАХ</span>
        <h2>Активность</h2>
      </div>
      <div class="segmented">
        <button
          v-for="n in [7, 30]"
          :key="n"
          :class="{ active: period === n }"
          :aria-pressed="period === n"
          @click="period = n"
        >
          {{ n }} дней
        </button>
      </div>
    </div>
    <p class="subtle">{{ prettyDate(dates[0]!) }} — {{ prettyDate(today) }}</p>
    <div
      class="chart"
      role="img"
      :aria-label="`За ${period} дней: ${rows.filter((e) => e.type === 'poop').length} какашек, ${rows.filter((e) => e.type === 'fart').length} пуков`"
    >
      <div
        v-for="(d, index) in chart"
        :key="d.day"
        class="chart-column"
        tabindex="0"
        :aria-label="`${prettyDate(d.day)}: ${d.poop} какашек, ${d.fart} пуков`"
        :title="`${prettyDate(d.day)}: 💩 ${d.poop}, 💨 ${d.fart}`"
      >
        <div class="bar-space">
          <div
            class="bar fart-bar"
            :style="{ height: `${(d.fart / max) * 100}%` }"
          />
          <div
            class="bar poop-bar"
            :style="{ height: `${(d.poop / max) * 100}%` }"
          />
        </div>
        <span>{{
          period === 7 || index % 5 === 0 || index === chart.length - 1
            ? fromDay(d.day).getDate()
            : ''
        }}</span>
      </div>
    </div>
    <p
      v-if="!rows.length"
      class="chart-empty"
    >
      Здесь появится твоя история — пока ни одной записи ♡
    </p>
    <div class="calendar-legend">
      <span><i class="poop-dot" /> Какашки</span><span><i class="fart-dot" /> Пуки</span>
    </div>
    <div class="period-stats">
      <div>
        <strong>{{ poopDays }}</strong
        ><span>дней с дефекацией</span>
      </div>
      <div>
        <strong>{{ period - poopDays }}</strong
        ><span>дней без записи о дефекации</span>
      </div>
      <div>
        <strong>{{ best ? prettyDate(best.day) : '—' }}</strong
        ><span>самый пукательный день{{ best ? ` · ${best.fart} 💨` : '' }}</span>
      </div>
    </div>
    <p class="fine-print">
      Дни без записи не обязательно означают отсутствие события. Здесь только твои наблюдения, без
      медицинских оценок.
    </p>
  </section>
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
