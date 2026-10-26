<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { events } from '../state';
import { healthInsights } from '../lib/health';
import { dayKey, fromDay, recentDays, prettyDate } from '../lib/dates';
import { bristolLabel } from '../lib/bristol';
import { symptomFields } from '../lib/symptoms';
const props = defineProps<{ today: string }>();
const completeWeek = ref(false);
watch([() => props.today, events], () => {
  completeWeek.value = false;
});
const dates = computed(() => recentDays(7, fromDay(props.today)));
const weekEnd = computed(() => {
  const date = fromDay(props.today);
  date.setDate(date.getDate() - 1);
  return date;
});
const completedDates = computed(() => recentDays(7, weekEnd.value));
const recent = computed(() =>
  events.value.filter(
    (row) =>
      dates.value.includes(dayKey(row.occurred_at)) && new Date(row.occurred_at) <= new Date(),
  ),
);
const insights = computed(() => healthInsights(events.value, props.today, completeWeek.value));
const classified = computed(
  () => recent.value.filter((row) => row.type === 'poop' && row.bristol_type != null).length,
);
const symptomCount = computed(
  () =>
    recent.value.filter(
      (row) => row.symptoms && Object.values(row.symptoms).some((value) => value != null),
    ).length,
);
function downloadSummary() {
  const summaryDates = new Set([
    ...dates.value,
    ...(completeWeek.value ? completedDates.value : []),
  ]);
  const summaryRows = events.value.filter(
    (row) => summaryDates.has(dayKey(row.occurred_at)) && new Date(row.occurred_at) <= new Date(),
  );
  const lines = [
    'Дневник самочувствия — сводка для обсуждения с врачом',
    `Период: ${completeWeek.value ? completedDates.value[0] : dates.value[0]} — ${props.today}. Часовой пояс: ${Intl.DateTimeFormat().resolvedOptions().timeZone}.`,
    `Полнота семи завершённых дней: ${completeWeek.value ? 'подтверждена пользователем' : 'не подтверждена'}.`,
    'Это записи пользователя, не диагноз. Пропуски не означают отсутствие событий.',
    ...summaryRows.map((row) => {
      const symptoms = row.symptoms;
      const notes = symptoms
        ? [
            ...(symptoms.pain != null ? [`Боль: ${symptoms.pain}/3`] : []),
            ...symptomFields
              .filter((field) => symptoms[field.key] != null)
              .map((field) => `${field.label}: ${symptoms[field.key] ? 'да' : 'нет'}`),
          ].join('; ')
        : 'Самочувствие не указано';
      return `${new Date(row.occurred_at).toLocaleString('ru-RU')} · ${row.type === 'poop' ? 'Дефекация · ' + bristolLabel(row.bristol_type) : 'Газы'} · ${notes}`;
    }),
    '',
    ...insights.value.map(
      (item) =>
        `${item.title}\n${item.evidence}\n${item.advice}\nПравило: ${item.rule}\nИсточник: ${item.source}\n`,
    ),
  ];
  const url = URL.createObjectURL(
    new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `diary-health-${props.today}.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
</script>

<template>
  <section
    class="card health-panel"
    aria-labelledby="health-heading"
  >
    <div class="section-head health-heading">
      <div>
        <span class="eyebrow">ВНИМАНИЕ К САМОЧУВСТВИЮ</span>
        <h2 id="health-heading">Что говорят записи <span class="pink">♡</span></h2>
      </div>
      <span class="health-badge">Для взрослых 18+</span>
    </div>
    <p class="health-period">
      {{ prettyDate(dates[0]!) }} — {{ prettyDate(today) }} · сегодня и предыдущие 6 дней
    </p>
    <p class="health-intro">
      Подсказки по форме стула и отмеченным симптомам. Они помогают заметить изменения и
      подготовиться к разговору с врачом, но не устанавливают диагноз.
    </p>
    <div class="health-coverage">
      <span
        >Тип стула:
        <strong
          >{{ classified }} / {{ recent.filter((row) => row.type === 'poop').length }}</strong
        ></span
      ><span
        >Самочувствие: <strong>{{ symptomCount }} / {{ recent.length }}</strong></span
      >
    </div>
    <div
      class="health-cards"
      aria-live="polite"
    >
      <article
        v-for="item in insights"
        :key="item.id"
        class="health-insight"
        :class="item.level"
      >
        <div class="insight-level">
          {{
            item.level === 'attention'
              ? '⚑ Требует внимания'
              : item.level === 'watch'
                ? '✦ Стоит обсудить'
                : 'ⓘ Контекст'
          }}
        </div>
        <h3>{{ item.title }}</h3>
        <p class="insight-evidence">{{ item.evidence }}</p>
        <p>{{ item.advice }}</p>
        <details class="insight-explanation">
          <summary>Почему появилась подсказка</summary>
          <p>{{ item.rule }}</p>
          <a
            :href="item.source"
            target="_blank"
            rel="noopener noreferrer"
            >Медицинский источник · {{ item.source.includes('nhs.uk') ? 'NHS' : 'NIDDK' }} ↗</a
          >
        </details>
      </article>
      <div
        v-if="!insights.length"
        class="health-empty"
      >
        <span>✧</span>
        <h3>{{ recent.length ? 'Пока нет отдельных сигналов' : 'Начнём с наблюдений' }}</h3>
        <p>
          {{
            recent.length
              ? 'В записях не сработали перечисленные правила. Это не подтверждение отсутствия проблем: неотмеченные симптомы неизвестны.'
              : 'Добавляй тип стула и, по желанию, самочувствие. Тогда здесь появятся персональные наблюдения.'
          }}
        </p>
      </div>
    </div>
    <details class="completeness-panel">
      <summary>Можно ли оценить редкий стул?</summary>
      <p>
        Для этого нужны все дефекации за семь завершённых дней:
        {{ prettyDate(completedDates[0]!) }} — {{ prettyDate(completedDates[6]!) }}. Сегодня не
        учитывается.
      </p>
      <label class="completeness-check"
        ><input
          v-model="completeWeek"
          type="checkbox"
        />Я записала все дефекации за эти даты, включая дни, когда их не было</label
      >
      <p class="fine-print">
        Без подтверждения дни без записей не считаются днями без стула. Подтверждение сбрасывается
        при изменении записей или даты.
      </p>
    </details>
    <button
      class="secondary"
      :disabled="!recent.length && !insights.length"
      @click="downloadSummary"
    >
      ↓ Скачать сводку для врача
    </button>
    <p class="health-footnote">
      Причины симптомов и необходимость лечения оценивает врач. Время суток и количество пуков сами
      по себе не используются для вывода о болезни.
    </p>
  </section>
</template>
