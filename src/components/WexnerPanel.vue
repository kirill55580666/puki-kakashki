<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import { events, isDemo, loading as diaryLoading, notify, readableError, session } from '../state';
import { dayKey, fromDay, prettyDate, recentDays } from '../lib/dates';
import {
  previousWexner,
  wexnerComparison,
  wexnerQuestions,
  wexnerScore,
  wexnerVersion,
  type WexnerAssessment,
} from '../lib/wexner';
import { createWexnerRepository } from '../lib/wexnerRepository';
import { wexnerPrefill } from '../lib/wexnerPrefill';
const props = defineProps<{ today: string }>();
const answers = ref<(number | null)[]>(Array(8).fill(null));
const answerSources = ref<('manual' | 'diary' | null)[]>(Array(8).fill(null));
const completePoops = ref(false);
const completeAttempts = ref(false);
const inputId = useId();
const suggestions = computed(() =>
  wexnerPrefill(events.value, props.today, completePoops.value, completeAttempts.value),
);
function resetDraft() {
  answers.value = Array(8).fill(null);
  answerSources.value = Array(8).fill(null);
  completePoops.value = false;
  completeAttempts.value = false;
}
function displayedAnswer(index: number) {
  return answerSources.value[index] == null ? suggestions.value[index].value : answers.value[index];
}
function chooseAnswer(index: number, event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  answers.value[index] = value === '' ? null : Number(value);
  answerSources.value[index] = 'manual';
}
function confirmSuggestion(index: number, event: Event) {
  const confirmed = (event.target as HTMLInputElement).checked;
  answers.value[index] = confirmed ? suggestions.value[index].value : null;
  answerSources.value[index] = confirmed ? 'diary' : null;
}
function invalidateDiaryAnswers() {
  answers.value = answers.value.map((value, index) =>
    answerSources.value[index] === 'diary' ? null : value,
  );
  answerSources.value = answerSources.value.map((source) => (source === 'diary' ? null : source));
}
watch(
  [() => props.today, () => JSON.stringify(events.value)],
  () => {
    invalidateDiaryAnswers();
    completePoops.value = false;
    completeAttempts.value = false;
  },
  { flush: 'sync' },
);
watch(
  [completePoops, completeAttempts],
  () => {
    // Revoking completeness must also revoke any dependent accepted answer.
    for (const index of [0, 6]) {
      if (
        answerSources.value[index] === 'diary' &&
        answers.value[index] !== suggestions.value[index].value
      ) {
        answers.value[index] = null;
        answerSources.value[index] = null;
      }
    }
  },
  { flush: 'sync' },
);
const rows = ref<WexnerAssessment[]>([]);
const pending = ref(false);
const loading = ref(false);
const message = ref('');
const open = ref(false);
const historyLimit = ref(5);
const owner = computed(() => (isDemo ? 'demo' : session.value?.user.id));
let generation = 0;
const score = computed(() => wexnerScore(answers.value));
const missing = computed(() =>
  wexnerQuestions.flatMap((_, index) => (answers.value[index] == null ? [index + 1] : [])),
);
const dates = computed(() => {
  const end = fromDay(props.today);
  end.setDate(end.getDate() - 1);
  return recentDays(7, end);
});
const reference = computed(() =>
  events.value.filter((row) => dates.value.includes(dayKey(row.occurred_at))),
);
const poops = computed(() => reference.value.filter((row) => row.type === 'poop').length);
const attempts = computed(() => reference.value.filter((row) => row.type === 'fart').length);
const timed = computed(
  () => reference.value.filter((row) => row.attempt_duration_minutes != null).length,
);
watch(
  owner,
  async (userId) => {
    const request = ++generation;
    rows.value = [];
    resetDraft();
    message.value = '';
    pending.value = false;
    open.value = false;
    historyLimit.value = 5;
    loading.value = Boolean(userId);
    if (!userId) return;
    try {
      const data = await createWexnerRepository(userId).list();
      if (request === generation) rows.value = data;
    } catch (error) {
      if (request === generation) message.value = readableError(error);
    } finally {
      if (request === generation) loading.value = false;
    }
  },
  { immediate: true },
);
async function save() {
  if (pending.value || loading.value || diaryLoading.value || score.value == null || !owner.value)
    return;
  pending.value = true;
  message.value = '';
  const request = generation;
  try {
    const row = await createWexnerRepository(owner.value).add({
      version: wexnerVersion,
      assessed_at: new Date().toISOString(),
      answers: [...answers.value] as number[],
    });
    if (request === generation) {
      rows.value = [row, ...rows.value].sort((a, b) => b.assessed_at.localeCompare(a.assessed_at));
      resetDraft();
      open.value = false;
      notify('Оценка Wexner сохранена ♡');
    }
  } catch (error) {
    if (request === generation) message.value = readableError(error);
  } finally {
    if (request === generation) pending.value = false;
  }
}
function download() {
  const lines = [
    'Опросник Wexner — сохранённые оценки',
    'Это результаты самооценки, не диагноз.',
    ...rows.value.map((row) =>
      [
        new Date(row.assessed_at).toLocaleString('ru-RU'),
        row.version,
        `Результат: ${wexnerScore(row.answers)} из 30`,
        wexnerComparison(row, previousWexner(row, rows.value)) ?? '',
        ...wexnerQuestions.map(
          (question, index) => `${question.label} ${question.options[row.answers[index]]}`,
        ),
      ].join('\n'),
    ),
  ];
  const url = URL.createObjectURL(
    new Blob([lines.join('\n\n')], { type: 'text/plain;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `wexner-${props.today}.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
</script>

<template>
  <section
    class="card wexner-panel"
    aria-labelledby="wexner-heading"
  >
    <div class="section-head">
      <div>
        <span class="eyebrow">САМОНАБЛЮДЕНИЕ · 18+</span>
        <h2 id="wexner-heading">Как проходит опорожнение?</h2>
      </div>
    </div>
    <p class="wexner-intro">
      Опросник Wexner · 8 вопросов о затруднениях. Сохраняй ответы и сравнивай баллы с предыдущими
      оценками.
    </p>
    <details class="wexner-reference">
      <summary>
        Записи под рукой · {{ prettyDate(dates[0]!) }} — {{ prettyDate(dates[6]!) }}
      </summary>
      <p>
        Дефекаций записано: {{ poops }}. Безуспешных попыток: {{ attempts }}. Время указано в
        {{ timed }} из {{ reference.length }} записей.
      </p>
      <p>
        В этом дневнике «пук» — безуспешная попытка дефекации. Успешные дефекации не обнуляют
        попытки. Пропуски не означают отсутствие событий.
      </p>
      <p>
        Эти семь завершённых дней используются для предложений в форме. Предложения нужно проверить
        и подтвердить: недельная сумма не заменяет число попыток за 24 часа.
      </p>
    </details>
    <p
      v-if="loading"
      role="status"
    >
      Загружаем оценки…
    </p>
    <p
      v-if="message"
      class="error"
      role="alert"
    >
      {{ message }}
    </p>
    <details
      :open="open"
      class="wexner-form"
      @toggle="open = ($event.target as HTMLDetailsElement).open"
    >
      <summary>Заполнить новую оценку</summary>
      <form @submit.prevent="save">
        <p class="fine-print">
          Подходящие ответы уже предложены из дневника. Проверь их и подтверди под вопросом или
          выбери ответ сама. Без подтверждения предложение не входит в балл. Опросник оценивает твои
          симптомы в целом, а записи за неделю помогают вспомнить детали.
        </p>
        <fieldset :disabled="pending || loading || diaryLoading">
          <legend class="sr-only">Вопросы Wexner</legend>
          <div class="wexner-completeness">
            <p>Полнота записей · {{ prettyDate(dates[0]!) }} — {{ prettyDate(dates[6]!) }}</p>
            <label class="wexner-check"
              ><input
                v-model="completePoops"
                type="checkbox"
              />Все дефекации записаны; в дни без записей их не было.</label
            >
            <label class="wexner-check"
              ><input
                v-model="completeAttempts"
                type="checkbox"
              />Все безуспешные попытки записаны; в дни без записей их не было.</label
            >
          </div>
          <div
            v-for="(question, index) in wexnerQuestions"
            :key="index"
            class="wexner-question"
          >
            <label :for="`${inputId}-${index}`">{{ index + 1 }}. {{ question.label }}</label>
            <select
              :id="`${inputId}-${index}`"
              :value="displayedAnswer(index) ?? ''"
              :aria-describedby="`${inputId}-hint-${index}`"
              @change="chooseAnswer(index, $event)"
            >
              <option value="">Не указано</option>
              <option
                v-for="(option, value) in question.options"
                :key="value"
                :value="value"
              >
                {{ option }}
              </option>
            </select>
            <div
              :id="`${inputId}-hint-${index}`"
              class="wexner-hint"
            >
              <p>{{ suggestions[index].evidence }}</p>
              <p>{{ suggestions[index].reason }}</p>
            </div>
            <label
              v-if="suggestions[index].value != null && answerSources[index] !== 'manual'"
              class="wexner-check wexner-confirm"
            >
              <input
                type="checkbox"
                :checked="answerSources[index] === 'diary'"
                @change="confirmSuggestion(index, $event)"
              />
              {{
                answerSources[index] === 'diary'
                  ? 'Ответ из дневника подтверждён'
                  : 'Из дневника — проверь. Этот ответ подходит мне'
              }}
            </label>
            <p
              v-else-if="answerSources[index] === 'manual' && answers[index] != null"
              class="wexner-manual"
            >
              Ответ выбран вручную
            </p>
          </div>
        </fieldset>
        <p class="fine-print">
          На пересекающихся границах диапазонов ответ остаётся ручным. Изменение записей или даты
          сбрасывает подтверждение полноты и ответы из дневника; ручные ответы сохраняются.
        </p>
        <div
          class="wexner-result"
          aria-live="polite"
        >
          <template v-if="score != null"
            >Результат опросника Wexner: <strong>{{ score }} из 30</strong></template
          ><template v-else
            >Для расчёта ответьте на оставшиеся вопросы: {{ missing.join(', ') }}.</template
          >
        </div>
        <button
          class="primary"
          :disabled="score == null || pending || loading || diaryLoading || !owner"
        >
          {{ pending ? 'Сохраняем…' : 'Сохранить оценку' }}
        </button>
      </form>
    </details>
    <div
      v-if="rows.length"
      class="wexner-history"
    >
      <h3>Сохранённые оценки</h3>
      <article
        v-for="row in rows.slice(0, historyLimit)"
        :key="row.id"
      >
        <div class="wexner-history-heading">
          <time :datetime="row.assessed_at">{{
            new Date(row.assessed_at).toLocaleString('ru-RU')
          }}</time
          ><strong>{{ wexnerScore(row.answers) }} / 30</strong>
        </div>
        <p v-if="wexnerComparison(row, previousWexner(row, rows))">
          {{ wexnerComparison(row, previousWexner(row, rows)) }}
        </p>
        <details>
          <summary>Ответы</summary>
          <ul>
            <li
              v-for="(question, index) in wexnerQuestions"
              :key="index"
            >
              {{ question.label }} <strong>{{ question.options[row.answers[index]] }}</strong>
            </li>
          </ul>
        </details>
      </article>
      <div class="wexner-actions">
        <button
          v-if="rows.length > historyLimit"
          class="secondary"
          @click="historyLimit += 5"
        >
          Показать ещё</button
        ><button
          class="secondary"
          @click="download"
        >
          ↓ Скачать оценки для врача
        </button>
      </div>
    </div>
    <p
      v-else-if="!loading && !message"
      class="fine-print"
    >
      Сохранённых оценок пока нет. Для результата нужны ответы на все восемь вопросов.
    </p>
    <details class="wexner-source">
      <summary>О шкале и источниках</summary>
      <p>
        Семь вопросов оцениваются от 0 до 4, вопрос о помощи — от 0 до 2. Сумма: 0–30. Более высокий
        балл — более высокий результат опросника; изменение балла само по себе не доказывает
        ухудшение или улучшение здоровья. Порогов диагноза в приложении нет.
      </p>
      <p>
        Русский перевод для дневника, версия {{ wexnerVersion }}. Длительность и количество записей
        используются для предложений с твоим подтверждением. Это помощь в заполнении, а не
        валидированное автоматическое вычисление шкалы из недельных записей.
      </p>
      <a
        href="https://pubmed.ncbi.nlm.nih.gov/8646957/"
        target="_blank"
        rel="noopener noreferrer"
        >Agachan и соавт., 1996 ↗</a
      ><a
        href="https://www.royalberkshire.nhs.uk/media/inmfdaiu/wexner-constipation-questionnaire_apr26.pdf"
        target="_blank"
        rel="noopener noreferrer"
        >Форма опросника NHS ↗</a
      >
    </details>
  </section>
</template>

<style scoped>
.wexner-panel {
  margin-top: 24px;
}
.wexner-intro {
  font-size: 13px;
  margin: 14px 0 20px;
}
details {
  font-size: 12px;
}
summary {
  cursor: pointer;
  font-weight: 800;
  min-height: 44px;
  display: flex;
  align-items: center;
}
summary::after {
  content: '⌄';
  margin-left: auto;
  padding-left: 10px;
}
details[open] > summary::after {
  transform: rotate(180deg);
}
.wexner-reference,
.wexner-source {
  background: #f8f1f5;
  border-radius: 14px;
  padding: 4px 14px;
  margin: 16px 0;
}
details p {
  font-size: 12px;
  margin: 8px 0 14px;
  line-height: 1.7;
}
fieldset {
  border: 0;
  padding: 0;
  min-width: 0;
}
label {
  line-height: 1.6;
}
select {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 12px;
  border: 1px solid #e5d8e0;
  border-radius: 12px;
  background: #fffcfe;
  color: #705563;
  font: inherit;
  font-size: 16px;
}
.wexner-result {
  padding: 14px;
  border-radius: 14px;
  background: #f4edf7;
  margin: 18px 0;
  line-height: 1.7;
  font-size: 13px;
}
.wexner-history h3 {
  font-size: 15px;
  margin-top: 22px;
}
.wexner-history article {
  padding: 16px 0;
  border-bottom: 1px solid #eee3e7;
}
.wexner-history-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  flex-wrap: wrap;
}
.wexner-history-heading strong {
  font-size: 23px;
  color: #8c5671;
  font-variant-numeric: tabular-nums;
}
.wexner-history article p {
  font-size: 12px;
  margin-top: 8px;
}
li {
  margin: 10px 0;
  line-height: 1.7;
}
ul {
  padding-left: 18px;
}
.wexner-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
}
.wexner-source a {
  display: block;
  margin: 10px 0;
  color: #985779;
}
.wexner-completeness {
  background: #f8f1f5;
  border-radius: 14px;
  padding: 14px;
  margin-top: 18px;
}
.wexner-question {
  margin: 24px 0;
}
.wexner-question > label {
  margin: 0;
}
.wexner-hint {
  margin-top: 10px;
  color: #846475;
}
.wexner-hint p {
  margin: 6px 0;
  font-size: 12px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}
form .wexner-check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 12px;
  line-height: 1.7;
  font-weight: 500;
  margin: 12px 0 0;
  cursor: pointer;
}
.wexner-check input {
  display: inline-block;
  width: 18px;
  height: 18px;
  padding: 0;
  margin: 2px 0 0;
  flex: 0 0 18px;
  accent-color: #a56585;
}
form .wexner-confirm {
  background: #f4edf7;
  padding: 12px;
  border-radius: 12px;
}
.wexner-manual {
  color: #846475;
  font-size: 12px;
  margin-top: 8px;
}
</style>
