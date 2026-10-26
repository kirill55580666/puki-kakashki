<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { BristolType, DiaryEvent, EventType, Symptoms } from '../types';
import { parseSymptoms, symptomFields } from '../lib/symptoms';
import StoolIcon from './StoolIcon.vue';
import { bristolTypes } from '../lib/bristol';
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
const bristolType = ref<BristolType | null>(props.event?.bristol_type ?? null);
const symptoms = ref<Symptoms>({
  pain: null,
  bloating: null,
  straining: null,
  incomplete: null,
  blood: null,
  laxative: null,
  ...props.event?.symptoms,
});
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
      {
        type: props.type,
        occurred_at: date.toISOString(),
        bristol_type: props.type === 'poop' ? bristolType.value : null,
        symptoms: parseSymptoms(symptoms.value, props.type),
      },
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
    class="modal event-modal"
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
    <div class="modal-emoji">
      <StoolIcon
        v-if="type === 'poop'"
        :type="bristolType"
      />
      <span v-else>💨</span>
    </div>
    <h2 id="event-title">
      {{ event ? 'Поправим запись?' : type === 'poop' ? 'Маленькая победа!' : 'Отпускаем лишнее!' }}
    </h2>
    <p>Один момент — и он в твоём дневнике.</p>
    <form @submit.prevent="save">
      <fieldset
        v-if="type === 'poop'"
        class="bristol-picker"
        :disabled="busy"
      >
        <legend>Какой был стул?</legend>
        <p
          id="bristol-hint"
          class="bristol-hint"
        >
          Бристольская шкала · выбери похожий вариант
        </p>
        <div class="bristol-options">
          <label
            v-for="item in bristolTypes"
            :key="item.type"
            class="bristol-option"
            :class="{ chosen: bristolType === item.type }"
          >
            <input
              v-model="bristolType"
              type="radio"
              name="bristol-type"
              :value="item.type"
              :aria-label="`Тип ${item.type}: ${item.name}. ${item.description}`"
            />
            <StoolIcon :type="item.type" />
            <span class="bristol-option-text"
              ><strong>Тип {{ item.type }} · {{ item.name }}</strong
              ><span>{{ item.description }}</span></span
            >
            <span
              class="choice-mark"
              aria-hidden="true"
              >{{ bristolType === item.type ? '✓' : '○' }}</span
            >
          </label>
          <label
            class="bristol-option bristol-unknown"
            :class="{ chosen: bristolType === null }"
          >
            <input
              v-model="bristolType"
              type="radio"
              name="bristol-type"
              :value="null"
              aria-label="Тип не указан"
            />
            <StoolIcon />
            <span class="bristol-option-text"
              ><strong>Тип не указан</strong><span>Можно записать без выбора типа</span></span
            >
            <span
              class="choice-mark"
              aria-hidden="true"
              >{{ bristolType === null ? '✓' : '○' }}</span
            >
          </label>
        </div>
      </fieldset>
      <details
        class="symptom-editor"
        :open="Boolean(event?.symptoms)"
      >
        <summary>Самочувствие <span>необязательно</span></summary>
        <p class="symptom-help">Отмечай только то, что помнишь. «Не указано» не означает «нет».</p>
        <div class="symptom-fields">
          <label
            >Боль в животе
            <select
              v-model="symptoms.pain"
              :disabled="busy"
            >
              <option :value="null">Не указано</option>
              <option :value="0">Боли не было</option>
              <option :value="1">Слабая</option>
              <option :value="2">Умеренная</option>
              <option :value="3">Сильная</option>
            </select>
          </label>
          <template
            v-for="field in symptomFields"
            :key="field.key"
          >
            <label v-if="!field.poopOnly || type === 'poop'"
              >{{ field.label }}
              <select
                v-model="symptoms[field.key]"
                :disabled="busy"
              >
                <option :value="null">Не указано</option>
                <option :value="true">Да</option>
                <option :value="false">Нет</option>
              </select>
            </label>
          </template>
        </div>
      </details>
      <p
        v-if="symptoms.pain === 3"
        class="symptom-alert"
        role="alert"
      >
        Если сильная боль есть сейчас или не проходит, обратитесь за медицинской помощью без
        промедления. Сохранение записи не заменяет обращение к врачу.
      </p>
      <p
        v-if="symptoms.blood === true"
        class="symptom-alert"
        role="alert"
      >
        Кровь в стуле стоит обсудить с врачом. При большом количестве крови, продолжающемся
        кровотечении или сильной боли нужна срочная помощь.
      </p>
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
