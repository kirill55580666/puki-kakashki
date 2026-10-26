<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { DiaryEvent, EventType } from '../types';
import { localInput } from '../lib/dates';
import { busy, error, mutate, notify } from '../state';
const props = defineProps<{ type: EventType; day?: string; event?: DiaryEvent }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement>();
const now = localInput(new Date());
const value = ref(
  props.event
    ? localInput(props.event.occurred_at)
    : props.day
      ? `${props.day}${now.slice(10)}`
      : now,
);
const validation = ref('');
const previousFocus = document.activeElement as HTMLElement | null;
onMounted(() => dialog.value?.showModal());
onBeforeUnmount(() => previousFocus?.focus());
async function save() {
  const date = new Date(value.value);
  if (!value.value || !Number.isFinite(date.getTime()) || localInput(date) !== value.value) {
    validation.value = 'Укажите существующую дату и время.';
    return;
  }
  if (
    await mutate(
      props.event ? 'update' : 'add',
      { type: props.type, occurred_at: date.toISOString() },
      props.event?.id,
    )
  ) {
    notify(
      props.event
        ? 'Запись обновлена ♡'
        : props.type === 'poop'
          ? 'Миссия выполнена! 💩💕'
          : 'Ветер перемен! 💨✨',
    );
    emit('close');
  }
}
</script>
<template>
  <dialog
    ref="dialog"
    class="modal"
    @cancel.prevent="!busy && emit('close')"
    aria-labelledby="event-title"
  >
    <button
      class="close icon-button"
      :disabled="busy"
      aria-label="Закрыть"
      @click="emit('close')"
    >
      ×
    </button>
    <div class="modal-emoji">{{ type === 'poop' ? '💩' : '💨' }}</div>
    <h2 id="event-title">
      {{ event ? 'Поправим запись?' : type === 'poop' ? 'Маленькая победа!' : 'Отпускаем лишнее!' }}
    </h2>
    <p>Один момент — и он в твоём дневнике.</p>
    <form @submit.prevent="save">
      <label
        >Когда это случилось?<input
          v-model="value"
          type="datetime-local"
          required
          :disabled="busy"
      /></label>
      <p
        v-if="validation || error"
        role="alert"
        class="error"
      >
        {{ validation || error }}
      </p>
      <button
        class="primary full"
        :disabled="busy"
      >
        {{ busy ? 'Сохраняем…' : event ? 'Сохранить изменения' : 'Записать в дневник ♡' }}
      </button>
    </form>
  </dialog>
</template>
