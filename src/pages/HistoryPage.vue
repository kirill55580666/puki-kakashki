<script setup lang="ts">
import { computed, ref } from 'vue';
import { events, busy } from '../state';
import { dayKey, prettyDate, timeOf } from '../lib/dates';
import type { DiaryEvent } from '../types';
import StoolIcon from '../components/StoolIcon.vue';
import { bristolLabel } from '../lib/bristol';
defineEmits<{ edit: [event: DiaryEvent]; remove: [event: DiaryEvent] }>();
const filter = ref('all');
const limit = ref(50);
const filtered = computed(() =>
  events.value.filter((e) => filter.value === 'all' || e.type === filter.value),
);
</script>
<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">ВСЁ СОХРАНЕНО С ЗАБОТОЙ</span>
      <h1>Твоя история<span class="pink"> ♡</span></h1>
      <p>Маленькие моменты, к которым можно вернуться.</p>
    </div>
  </div>
  <section class="card">
    <div class="section-head">
      <h2>
        Все записи <span class="soft-label">{{ filtered.length }}</span>
      </h2>
      <label class="filter-label"
        ><span class="sr-only">Тип событий</span
        ><select
          v-model="filter"
          @change="limit = 50"
        >
          <option value="all">Все моменты</option>
          <option value="poop">💩 Какашки</option>
          <option value="fart">💨 Пуки</option>
        </select></label
      >
    </div>
    <div
      v-if="!filtered.length"
      class="empty"
    >
      <span class="empty-cloud">☁</span>
      <h3>История начинается с тебя</h3>
      <p>Записи появятся здесь, когда ты добавишь их в календаре.</p>
    </div>
    <ul class="event-list history-list">
      <li
        v-for="event in filtered.slice(0, limit)"
        :key="event.id"
      >
        <div
          class="event-symbol"
          :class="event.type"
        >
          <StoolIcon
            v-if="event.type === 'poop'"
            :type="event.bristol_type"
          />
          <span v-else>💨</span>
        </div>
        <div class="event-description">
          <strong>{{ event.type === 'poop' ? 'Миссия выполнена' : 'Ветер перемен' }}</strong>
          <span v-if="event.type === 'poop'">{{ bristolLabel(event.bristol_type) }}</span>
          <span v-if="event.attempt_duration_minutes != null"
            >Попытка · {{ event.attempt_duration_minutes }} мин</span
          >
          <span
            >{{ prettyDate(dayKey(event.occurred_at)) }}
            {{ new Date(event.occurred_at).getFullYear() }} · {{ timeOf(event.occurred_at) }}</span
          >
        </div>
        <button
          class="icon-button"
          aria-label="Редактировать запись"
          :disabled="busy"
          @click="$emit('edit', event)"
        >
          ✎</button
        ><button
          class="icon-button delete"
          aria-label="Удалить запись"
          :disabled="busy"
          @click="$emit('remove', event)"
        >
          ×
        </button>
      </li>
    </ul>
    <button
      v-if="filtered.length > limit"
      class="secondary full"
      @click="limit += 50"
    >
      Показать ещё
    </button>
  </section>
</template>
