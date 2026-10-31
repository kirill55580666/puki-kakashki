export const wexnerVersion = 'wexner-1996-ru-v1'
const frequency = ['Никогда', 'Редко', 'Иногда', 'Обычно', 'Всегда']
export const wexnerQuestions = [
  {
    label: 'Как часто происходит дефекация?',
    options: [
      '1–2 раза за 1–2 дня',
      'Дважды в неделю',
      'Один раз в неделю',
      'Реже одного раза в неделю',
      'Реже одного раза в месяц',
    ],
  },
  { label: 'Как часто опорожнение требует болезненных усилий?', options: frequency },
  { label: 'Как часто остаётся ощущение неполного опорожнения?', options: frequency },
  { label: 'Как часто бывает боль в животе?', options: frequency },
  {
    label: 'Сколько минут занимает одна попытка?',
    options: ['Менее 5', '5–10', '10–20', '20–30', 'Более 30'],
  },
  {
    label: 'Какая помощь нужна для опорожнения?',
    options: ['Без помощи', 'Стимулирующие слабительные', 'Ручная помощь или клизма'],
  },
  {
    label: 'Сколько безуспешных попыток бывает за 24 часа?',
    options: ['Ни одной', '1–3', '3–6', '6–9', 'Более 9'],
  },
  {
    label: 'Сколько лет продолжаются затруднения?',
    options: ['0 лет (менее года)', '1–5 лет', '5–10 лет', '10–20 лет', 'Более 20 лет'],
  },
]

export interface WexnerInput {
  version: string
  assessed_at: string
  answers: number[]
}
export interface WexnerAssessment extends WexnerInput {
  id: string
  user_id: string
  created_at: string
}

export function wexnerScore(answers: readonly (number | null)[]): number | null {
  if (
    answers.length !== 8 ||
    Array.from(answers).some(
      (value, index) =>
        value == null ||
        !Number.isInteger(value) ||
        value < 0 ||
        value >= wexnerQuestions[index].options.length,
    )
  )
    return null
  return answers.reduce<number>((sum, value) => sum + value!, 0)
}

export function parseWexner(input: unknown): WexnerInput {
  if (!input || typeof input !== 'object') throw new Error('Некорректная оценка Wexner.')
  const row = input as Record<string, unknown>
  if (
    row.version !== wexnerVersion ||
    !Array.isArray(row.answers) ||
    wexnerScore(row.answers) == null
  )
    throw new Error('Для оценки Wexner нужны восемь допустимых ответов одной версии.')
  if (
    typeof row.assessed_at !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(row.assessed_at) ||
    !Number.isFinite(Date.parse(row.assessed_at))
  )
    throw new Error('Некорректная дата оценки Wexner.')
  return {
    version: wexnerVersion,
    assessed_at: new Date(row.assessed_at).toISOString(),
    answers: [...row.answers],
  }
}

export function previousWexner(current: WexnerAssessment, rows: WexnerAssessment[]) {
  return rows
    .filter(
      (row) =>
        row.id !== current.id &&
        row.version === current.version &&
        row.assessed_at < current.assessed_at &&
        wexnerScore(row.answers) != null,
    )
    .sort((a, b) => b.assessed_at.localeCompare(a.assessed_at))[0]
}

export function wexnerComparison(
  current: WexnerAssessment,
  previous?: WexnerAssessment,
): string | null {
  if (!previous || current.version !== previous.version) return null
  const score = wexnerScore(current.answers)
  const before = wexnerScore(previous.answers)
  if (score == null || before == null) return null
  const date = new Date(previous.assessed_at).toLocaleDateString('ru-RU')
  const delta = score - before
  const count = Math.abs(delta)
  const word =
    count % 100 >= 11 && count % 100 <= 14
      ? 'баллов'
      : count % 10 === 1
        ? 'балл'
        : count % 10 >= 2 && count % 10 <= 4
          ? 'балла'
          : 'баллов'
  return delta === 0
    ? `Балл не изменился по сравнению с ${date}.`
    : `На ${count} ${word} ${delta > 0 ? 'больше' : 'меньше'}, чем ${date}.`
}
