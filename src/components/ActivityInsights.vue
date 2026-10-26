<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { events } from '../state';
import { dayKey, fromDay, prettyDate, recentDays } from '../lib/dates';
import { hourlyCounts, timeOfDayStats, timeObservation } from '../lib/analytics';
const props = defineProps<{ today: string }>();
const mode = ref<'days' | 'hours'>('days');
const period = ref(7);
const selectedDay = ref(props.today);
const selectedBucket = ref<string | null>(null);
const currentDay = computed(() => {
  const date = fromDay(selectedDay.value);
  return Number.isFinite(date.getTime()) &&
    dayKey(date) === selectedDay.value &&
    selectedDay.value <= props.today
    ? selectedDay.value
    : props.today;
});
const dates = computed(() =>
  mode.value === 'hours' ? [currentDay.value] : recentDays(period.value, fromDay(props.today)),
);
const rows = computed(() =>
  events.value.filter((row) => dates.value.includes(dayKey(row.occurred_at))),
);
const totals = computed(() => ({
  poop: rows.value.filter((row) => row.type === 'poop').length,
  fart: rows.value.filter((row) => row.type === 'fart').length,
}));
const buckets = computed(() =>
  mode.value === 'hours'
    ? hourlyCounts(rows.value).map((row) => ({
        ...row,
        key: String(row.hour),
        label: String(row.hour).padStart(2, '0'),
        description: `${String(row.hour).padStart(2, '0')}:00–${String(row.hour).padStart(2, '0')}:59`,
      }))
    : dates.value.map((day) => ({
        key: day,
        label: String(fromDay(day).getDate()),
        description: prettyDate(day),
        poop: rows.value.filter((row) => row.type === 'poop' && dayKey(row.occurred_at) === day)
          .length,
        fart: rows.value.filter((row) => row.type === 'fart' && dayKey(row.occurred_at) === day)
          .length,
      })),
);
const max = computed(() => Math.max(1, ...buckets.value.map((row) => row.poop + row.fart)));
const activeBucket = computed(() => buckets.value.find((row) => row.key === selectedBucket.value));
const parts = computed(() => timeOfDayStats(rows.value));
const scopeLabel = computed(() =>
  mode.value === 'hours'
    ? fromDay(currentDay.value).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : `${prettyDate(dates.value[0]!)} — ${prettyDate(props.today)} · ${period.value} дней`,
);
const poopDays = computed(
  () =>
    new Set(rows.value.filter((row) => row.type === 'poop').map((row) => dayKey(row.occurred_at)))
      .size,
);
const best = computed(() =>
  mode.value === 'days'
    ? [...buckets.value].filter((row) => row.fart > 0).sort((a, b) => b.fart - a.fart)[0]
    : null,
);
watch([mode, period, currentDay], () => {
  selectedBucket.value = null;
});
function moveDay(step: number) {
  const date = fromDay(currentDay.value);
  date.setDate(date.getDate() + step);
  selectedDay.value = dayKey(date);
}
function chooseBucket(key: string) {
  if (mode.value === 'days') {
    selectedDay.value = key;
    mode.value = 'hours';
  } else selectedBucket.value = key;
}
</script>

<template>
  <section
    class="card rhythm-panel"
    aria-labelledby="activity-heading"
  >
    <div class="section-head rhythm-heading">
      <div>
        <span class="eyebrow">ЗАМЕТЬ СВОЙ РИТМ</span>
        <h2 id="activity-heading">Когда это происходит</h2>
      </div>
      <div
        class="segmented"
        aria-label="Масштаб графика"
      >
        <button
          :class="{ active: mode === 'days' }"
          :aria-pressed="mode === 'days'"
          @click="mode = 'days'"
        >
          По дням</button
        ><button
          :class="{ active: mode === 'hours' }"
          :aria-pressed="mode === 'hours'"
          @click="mode = 'hours'"
        >
          По часам
        </button>
      </div>
    </div>
    <div class="rhythm-toolbar">
      <div
        v-if="mode === 'days'"
        class="segmented"
        aria-label="Период"
      >
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
      <div
        v-else
        class="day-selector"
      >
        <button
          class="icon-button"
          aria-label="Предыдущий день"
          @click="moveDay(-1)"
        >
          ‹</button
        ><label
          ><span class="sr-only">Дата почасового графика</span
          ><input
            v-model="selectedDay"
            type="date"
            :max="today"
            @change="selectedDay = currentDay" /></label
        ><button
          class="icon-button"
          aria-label="Следующий день"
          :disabled="currentDay >= today"
          @click="moveDay(1)"
        >
          ›</button
        ><button
          class="chip"
          @click="selectedDay = today"
        >
          Сегодня
        </button>
      </div>
      <p class="rhythm-scope">{{ scopeLabel }}</p>
    </div>
    <div class="rhythm-totals">
      <span
        >💩 <strong>{{ totals.poop }}</strong> какашек</span
      ><span
        >💨 <strong>{{ totals.fart }}</strong> пуков</span
      >
    </div>
    <div
      class="rhythm-chart-scroll"
      role="region"
      tabindex="0"
      :aria-label="
        mode === 'hours' ? 'Почасовой график. Можно прокручивать горизонтально' : 'График по дням'
      "
    >
      <div
        class="chart rhythm-chart"
        :class="{ 'hourly-chart': mode === 'hours' }"
      >
        <button
          v-for="(bucket, index) in buckets"
          :key="bucket.key"
          class="chart-column rhythm-column"
          :class="{ selected: selectedBucket === bucket.key }"
          :aria-label="`${bucket.description}: какашек ${bucket.poop}, пуков ${bucket.fart}${mode === 'days' ? '. Открыть по часам' : ''}`"
          :title="`${bucket.description} · 💩 ${bucket.poop} · 💨 ${bucket.fart}`"
          @click="chooseBucket(bucket.key)"
        >
          <span class="bar-space"
            ><span
              class="bar fart-bar"
              :style="{ height: `${(bucket.fart / max) * 100}%` }" /><span
              class="bar poop-bar"
              :style="{ height: `${(bucket.poop / max) * 100}%` }"
          /></span>
          <span>{{
            mode === 'hours' || period === 7 || index % 5 === 0 || index === buckets.length - 1
              ? bucket.label
              : ''
          }}</span>
        </button>
      </div>
    </div>
    <div
      class="rhythm-chart-caption"
      aria-live="polite"
    >
      <span v-if="activeBucket"
        >{{ activeBucket.description }} · 💩 {{ activeBucket.poop }} · 💨
        {{ activeBucket.fart }}</span
      ><span v-else-if="!rows.length">За это время записей пока нет ♡</span
      ><span v-else>{{
        mode === 'hours'
          ? 'Нажми на час для подробностей · график прокручивается'
          : 'Нажми на день, чтобы посмотреть события по часам'
      }}</span>
    </div>
    <div class="calendar-legend">
      <span><i class="poop-dot" /> Какашки</span><span><i class="fart-dot" /> Пуки</span>
    </div>
    <div
      v-if="mode === 'days'"
      class="period-stats"
    >
      <div>
        <strong>{{ poopDays }}</strong
        ><span>дней с дефекацией</span>
      </div>
      <div>
        <strong>{{ period - poopDays }}</strong
        ><span>дней без записи о дефекации</span>
      </div>
      <div>
        <strong>{{ best ? prettyDate(best.key) : '—' }}</strong
        ><span>самый пукательный день{{ best ? ` · ${best.fart} 💨` : '' }}</span>
      </div>
    </div>
    <div class="time-of-day-heading">
      <div>
        <span class="eyebrow"
          >ВЫБРАННОЕ ВРЕМЯ · {{ mode === 'hours' ? 'ОДИН ДЕНЬ' : period + ' ДНЕЙ' }}</span
        >
        <h3>В какое время чаще?</h3>
      </div>
      <span class="time-badge">{{ mode === 'hours' ? 'Итоги дня' : 'Итоги периода' }}</span>
    </div>
    <div class="time-of-day-grid">
      <article
        v-for="part in parts"
        :key="part.name"
        class="time-part"
      >
        <div class="time-part-heading">
          <span aria-hidden="true">{{ part.icon }}</span>
          <div>
            <h3>{{ part.name }}</h3>
            <small>{{ part.hours }}</small>
          </div>
        </div>
        <div class="time-part-line">
          <span>💩 {{ part.poop }}</span
          ><strong>{{ part.poopPercent }}%</strong>
        </div>
        <div class="time-track"><span :style="{ width: part.poopPercent + '%' }" /></div>
        <div class="time-part-line">
          <span>💨 {{ part.fart }}</span
          ><strong>{{ part.fartPercent }}%</strong>
        </div>
        <div class="time-track fart-track"><span :style="{ width: part.fartPercent + '%' }" /></div>
      </article>
    </div>
    <div
      class="time-observations"
      aria-live="polite"
    >
      <p><span aria-hidden="true">💩</span>{{ timeObservation(rows, 'poop') }}</p>
      <p><span aria-hidden="true">💨</span>{{ timeObservation(rows, 'fart') }}</p>
    </div>
    <p class="fine-print">
      Проценты считаются отдельно среди какашек и среди пуков за выбранное время. Это наблюдения по
      записям, а не оценка здоровья. Дни без записей не означают отсутствие событий.
    </p>
  </section>
</template>
