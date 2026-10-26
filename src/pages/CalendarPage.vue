<script setup lang="ts">
import { computed, ref } from 'vue'
import MascotIcon from '../components/MascotIcon.vue'
import { events, loading, busy } from '../state'
import { dayKey, fromDay, monthDays, prettyDate, timeOf } from '../lib/dates'
import type { DiaryEvent, EventType } from '../types'
defineProps<{ today: string }>()
const emit = defineEmits<{
  add: [type: EventType]
  edit: [event: DiaryEvent]
  remove: [event: DiaryEvent]
}>()
const selected = ref(dayKey(new Date()))
const month = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const days = computed(() => monthDays(month.value))
const label = computed(() =>
  month.value.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).replace(' г.', ''),
)
const byDay = computed(() => {
  const result = new Map<string, DiaryEvent[]>()
  for (const e of events.value) {
    const key = dayKey(e.occurred_at)
    result.set(key, [...(result.get(key) || []), e])
  }
  return result
})
const selectedEvents = computed(() => byDay.value.get(selected.value) || [])
const counts = (key: string, type: EventType) =>
  (byDay.value.get(key) || []).filter((e) => e.type === type).length
function move(step: number) {
  month.value = new Date(month.value.getFullYear(), month.value.getMonth() + step, 1)
}
function goToday(today: string) {
  selected.value = today
  const d = fromDay(today)
  month.value = new Date(d.getFullYear(), d.getMonth(), 1)
}
</script>
<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">ТВОЙ ДНЕВНИК ЛЁГКОСТИ</span>
      <h1>Привет, животик<span class="pink"> ♡</span></h1>
      <p>Слушай себя. Замечай маленькое. Просто будь.</p>
    </div>
    <span class="date-pill">✧ {{ prettyDate(today) }}</span>
  </div>
  <section class="hero">
    <div class="hero-copy">
      <span class="tiny-tag">С ЗАБОТОЙ О СЕБЕ</span>
      <h2>Отпускай лишнее.<br />Сохраняй лёгкость.</h2>
      <p>
        Маленький ритуал для тебя и твоего животика.<br class="desktop-only" />
        Как ты себя чувствуешь сегодня?
      </p>
      <div class="hero-actions">
        <button
          class="primary"
          :disabled="busy || loading"
          @click="emit('add', 'poop')"
        >
          <span>💩</span> Я покакала! <span>＋</span></button
        ><button
          class="lavender-button"
          :disabled="busy || loading"
          @click="emit('add', 'fart')"
        >
          <span>💨</span> Я пукнула! <span>＋</span>
        </button>
      </div>
      <small>Пара секунд — и момент сохранён ♡</small>
    </div>
    <div class="hero-art">
      <span class="art-note">всё, что естественно,<br />то мило!</span><MascotIcon /><span
        class="art-spark"
        >✧</span
      >
    </div>
  </section>
  <div class="diary-grid">
    <section class="card calendar-card">
      <div class="section-head">
        <div>
          <span class="eyebrow">ТВОЯ МАЛЕНЬКАЯ ИСТОРИЯ</span>
          <h2>Календарь</h2>
        </div>
        <button
          class="chip"
          @click="goToday(today)"
        >
          Сегодня
        </button>
      </div>
      <div class="month-nav">
        <button
          class="icon-button"
          aria-label="Предыдущий месяц"
          @click="move(-1)"
        >
          ‹
        </button>
        <h3>{{ label }}</h3>
        <button
          class="icon-button"
          aria-label="Следующий месяц"
          @click="move(1)"
        >
          ›
        </button>
      </div>
      <div class="calendar-week">
        <span
          v-for="day in ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']"
          :key="day"
          >{{ day }}</span
        >
      </div>
      <div class="calendar-days">
        <template
          v-for="(day, i) in days"
          :key="i"
          ><div v-if="!day" />
          <button
            v-else
            class="day"
            :class="{
              selected: selected === dayKey(day),
              today: today === dayKey(day),
              weekend: i % 7 > 4,
            }"
            :aria-pressed="selected === dayKey(day)"
            :aria-current="today === dayKey(day) ? 'date' : undefined"
            :aria-label="`${prettyDate(dayKey(day))}: какашек ${counts(dayKey(day), 'poop')}, пуков ${counts(dayKey(day), 'fart')}`"
            @click="selected = dayKey(day)"
          >
            <span>{{ day.getDate() }}</span
            ><span class="day-events"
              ><span v-if="counts(dayKey(day), 'poop')"
                >💩<sup v-if="counts(dayKey(day), 'poop') > 1">{{
                  counts(dayKey(day), 'poop')
                }}</sup></span
              ><span v-if="counts(dayKey(day), 'fart')"
                >💨<sup v-if="counts(dayKey(day), 'fart') > 1">{{
                  counts(dayKey(day), 'fart')
                }}</sup></span
              ></span
            >
          </button></template
        >
      </div>
      <div class="calendar-legend">
        <span>💩 Какашки</span><span>💨 Пуки</span><span><i /> Сегодня</span>
      </div>
    </section>
    <aside class="day-column">
      <section class="card selected-card">
        <div class="section-head">
          <h2>
            {{ selected === today ? 'Сегодня' : prettyDate(selected) }} <span class="pink">♡</span>
          </h2>
          <span class="soft-label">{{ selectedEvents.length }} записей</span>
        </div>
        <p class="subtle">
          {{
            selected === today
              ? prettyDate(selected) + ' · твои маленькие моменты'
              : 'Маленькие моменты этого дня'
          }}
        </p>
        <div
          v-if="loading"
          class="empty"
        >
          Заглядываем в дневник…
        </div>
        <div
          v-else-if="!selectedEvents.length"
          class="empty"
        >
          <span class="empty-cloud">☁</span>
          <h3>Здесь пока тихо</h3>
          <p>Каждый момент на своём месте.<br />Добавь первый, когда захочется.</p>
        </div>
        <ul
          v-else
          class="event-list"
        >
          <li
            v-for="event in selectedEvents"
            :key="event.id"
          >
            <div
              class="event-symbol"
              :class="event.type"
            >
              {{ event.type === 'poop' ? '💩' : '💨' }}
            </div>
            <div class="event-description">
              <strong>{{ event.type === 'poop' ? 'Миссия выполнена' : 'Ветер перемен' }}</strong
              ><span>{{ timeOf(event.occurred_at) }}</span>
            </div>
            <button
              class="icon-button"
              :disabled="busy"
              :aria-label="`Изменить запись ${timeOf(event.occurred_at)}`"
              @click="emit('edit', event)"
            >
              ✎</button
            ><button
              class="icon-button delete"
              :disabled="busy"
              aria-label="Удалить запись"
              @click="emit('remove', event)"
            >
              ×
            </button>
          </li>
        </ul>
      </section>
      <section class="kind-note">
        <span>🎀</span>
        <div>
          <h3>У каждого свой ритм</h3>
          <p>Этот дневник — место для наблюдений.<br />Без оценок и сравнений. Только ты.</p>
        </div>
      </section>
    </aside>
  </div>
</template>
