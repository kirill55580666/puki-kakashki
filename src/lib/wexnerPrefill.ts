import type { DiaryEvent } from '../types'
import { dayKey, fromDay, prettyDate, recentDays } from './dates.ts'
import { wexnerQuestions } from './wexner.ts'

export interface WexnerSuggestion {
  value: number | null
  evidence: string
  reason: string
}

// These are reviewable diary suggestions, not a validated diary-to-Wexner conversion.
// Neither suggestions nor completeness checks are answers until explicitly confirmed.
export function wexnerPrefill(
  events: DiaryEvent[],
  today: string,
  completePoops = false,
  completeAttempts = false,
): WexnerSuggestion[] {
  const end = fromDay(today)
  end.setDate(end.getDate() - 1)
  const dates = recentDays(7, end)
  const rows = events.filter((row) => dates.includes(dayKey(row.occurred_at)))
  const poops = rows.filter((row) => row.type === 'poop')
  const attempts = rows.filter((row) => row.type === 'fart')
  const counts = (items: DiaryEvent[]) =>
    dates.map((day) => items.filter((row) => dayKey(row.occurred_at) === day).length)
  const poopDays = counts(poops)
  const attemptDays = counts(attempts)
  const byDay = (values: number[]) =>
    dates.map((day, index) => `${prettyDate(day)}: ${values[index]}`).join('; ')
  let frequency: number | null = null
  if (completePoops) {
    if (poops.length === 1) frequency = 2
    else if (poops.length === 2) frequency = 1
    else if (
      poops.length >= 3 &&
      poopDays.every((count) => count <= 2) &&
      poopDays.every(
        (count, index) =>
          count > 0 || (index > 0 && poopDays[index - 1] > 0) || (index === 0 && poopDays[1] > 0),
      )
    )
      frequency = 0
  }
  const incomplete = poops.filter((row) => typeof row.symptoms?.incomplete === 'boolean')
  const incompleteYes = incomplete.filter((row) => row.symptoms?.incomplete === true).length
  const painKnown = rows.filter((row) => row.symptoms?.pain != null)
  const painYes = painKnown.filter((row) => row.symptoms!.pain! > 0).length
  const strain = poops.filter((row) => row.symptoms?.straining === true).length
  const timed = rows.filter(
    (row) =>
      Number.isInteger(row.attempt_duration_minutes) &&
      row.attempt_duration_minutes! >= 1 &&
      row.attempt_duration_minutes! <= 1440,
  )
  const durationBand = (minutes: number): number | null => {
    if (minutes === 10 || minutes === 20) return null
    return minutes < 5 ? 0 : minutes < 10 ? 1 : minutes < 20 ? 2 : minutes <= 30 ? 3 : 4
  }
  const bands = timed.map((row) => durationBand(row.attempt_duration_minutes!))
  const duration =
    rows.length > 0 &&
    timed.length === rows.length &&
    bands[0] != null &&
    bands.every((band) => band === bands[0])
      ? bands[0]
      : null
  const distribution = wexnerQuestions[4].options
    .map((label, index) => `${label} мин: ${bands.filter((band) => band === index).length}`)
    .join('; ')
  const attemptBand = (count: number): number | null => {
    if (count === 3 || count === 6) return null
    return count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count <= 9 ? 3 : 4
  }
  const failures =
    completeAttempts && attemptDays.every((count) => count === attemptDays[0])
      ? attemptBand(attemptDays[0])
      : null
  const laxativeKnown = poops.filter((row) => typeof row.symptoms?.laxative === 'boolean')
  return [
    {
      value: frequency,
      evidence: `Дефекаций записано: ${poops.length}. По дням: ${byDay(poopDays)}.`,
      reason:
        frequency != null
          ? 'Предложение по подтверждённым записям. Подтверди, что оно описывает твою обычную частоту.'
          : !completePoops
            ? 'Для предложения подтверди, что записаны все дефекации.'
            : 'Эти записи не определяют однозначный вариант. Выбери ответ самостоятельно.',
    },
    {
      value: null,
      evidence: `Натуживание отмечено в ${strain} из ${poops.length} дефекаций.`,
      reason:
        'Натуживание и боль в животе не определяют частоту именно болезненных усилий при опорожнении. Нужен твой ответ.',
    },
    {
      value:
        poops.length > 0 &&
        incomplete.length === poops.length &&
        (incompleteYes === 0 || incompleteYes === poops.length)
          ? incompleteYes === 0
            ? 0
            : 4
          : null,
      evidence: `Неполное опорожнение: «да» — ${incompleteYes}, «нет» — ${incomplete.length - incompleteYes}, не указано — ${poops.length - incomplete.length}.`,
      reason:
        'Проверь, подходит ли ответ по записям к опроснику в целом. При смешанных отметках частоту выбираешь ты.',
    },
    {
      value: null,
      evidence: `Боль в животе: отмечена в ${painYes} записях, явно отсутствует в ${painKnown.length - painYes}, не указана в ${rows.length - painKnown.length}.`,
      reason: 'Боль вне посещений туалета в этих записях не учтена. Общую частоту выбираешь ты.',
    },
    {
      value: duration,
      evidence: `Время указано в ${timed.length} из ${rows.length} попыток.${timed.length ? ` Диапазоны: ${distribution}.${bands.includes(null) ? ' На границе 10 или 20 минут: нужен выбор диапазона.' : ''}` : ''}`,
      reason:
        duration != null
          ? 'Все записанные попытки имеют один однозначный диапазон. Подтверди, что он описывает длительность твоих попыток.'
          : 'Нет единственного полного диапазона. Выбери ответ по своему опыту; среднее и максимум не подставляются.',
    },
    {
      value: null,
      evidence: `Приём слабительного: «да» — ${laxativeKnown.filter((row) => row.symptoms?.laxative === true).length}, «нет» — ${laxativeKnown.filter((row) => row.symptoms?.laxative === false).length}, не указано — ${poops.length - laxativeKnown.length}.`,
      reason:
        'В дневнике не различаются стимулирующий препарат, ручная помощь и клизма. Нужен твой ответ.',
    },
    {
      value: failures,
      evidence: `Безуспешных попыток записано: ${attempts.length}. По дням: ${byDay(attemptDays)}.`,
      reason:
        failures != null
          ? 'Во все подтверждённые дни одинаковое количество. Подтверди, что эта суточная категория подходит тебе.'
          : !completeAttempts
            ? 'Для предложения подтверди, что записаны все безуспешные попытки.'
            : 'Количество по дням различается или попало на границу 3/6. Недельная сумма не заменяет ответ за 24 часа.',
    },
    {
      value: null,
      evidence: 'Дата первой записи в приложении не определяет начало затруднений.',
      reason: 'Длительность проблемы укажи самостоятельно.',
    },
  ]
}
