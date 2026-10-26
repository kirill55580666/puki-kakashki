import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hourlyCounts, timeOfDayStats, timeObservation } from '../src/lib/analytics.ts'
import { healthInsights } from '../src/lib/health.ts'
import { parseSymptoms } from '../src/lib/symptoms.ts'
import { parseImport } from '../src/lib/import.ts'
import { createLocalRepository } from '../src/lib/localRepository.ts'
import { dayKey } from '../src/lib/dates.ts'
import type { DiaryEvent } from '../src/types.ts'

const now = new Date(2026, 9, 26, 20)
const today = dayKey(now)
function event(day: number, hour: number, values: Partial<DiaryEvent> = {}): DiaryEvent {
  return {
    id: crypto.randomUUID(),
    user_id: 'demo',
    created_at: now.toISOString(),
    type: 'poop',
    occurred_at: new Date(2026, 9, day, hour).toISOString(),
    ...values,
  }
}

test('hourly and day-part counts respect local boundaries and separate event types', () => {
  const rows = [
    event(26, 0),
    event(26, 5),
    event(26, 6),
    event(26, 11),
    event(26, 12),
    event(26, 17),
    event(26, 18),
    event(26, 23),
    event(26, 8, { type: 'fart' }),
  ]
  const hours = hourlyCounts(rows)
  assert.equal(hours.length, 24)
  assert.equal(hours[8]?.fart, 1)
  assert.equal(hours[8]?.poop, 0)
  const parts = timeOfDayStats(rows)
  assert.deepEqual(
    parts.map((part) => part.poop),
    [2, 2, 2, 2],
  )
  assert.deepEqual(
    parts.map((part) => part.poopPercent),
    [25, 25, 25, 25],
  )
  assert.equal(parts[1]?.fartPercent, 100)
})

test('time observations handle a clear peak, ties, uniformity and empty data', () => {
  assert.match(
    timeObservation([event(26, 8), event(26, 9), event(26, 19)], 'poop'),
    /утром: 2 из 3/,
  )
  assert.match(timeObservation([event(26, 8), event(26, 19)], 'poop'), /Одинаково часто/)
  assert.match(
    timeObservation([event(26, 0), event(26, 8), event(26, 14), event(26, 19)], 'poop'),
    /поровну/,
  )
  assert.match(timeObservation([], 'fart'), /Пока нет/)
  assert.ok(timeOfDayStats([]).every((part) => part.poopPercent === 0 && part.fartPercent === 0))
})

test('medical rules never infer rare stool from gaps without explicit completeness confirmation', () => {
  assert.deepEqual(healthInsights([], today, false, now), [])
  assert.ok(healthInsights([], today, true, now).some((item) => item.id === 'frequency'))
  const todayOnly = [event(26, 8), event(26, 9), event(26, 10)]
  assert.ok(healthInsights(todayOnly, today, true, now).some((item) => item.id === 'frequency'))
  const completed = [event(19, 8), event(21, 8), event(25, 8)]
  assert.ok(!healthInsights(completed, today, true, now).some((item) => item.id === 'frequency'))
})

test('loose-stool rules count within a single local day, not across the week', () => {
  const loose = { bristol_type: 7 as const }
  assert.ok(
    !healthInsights(
      [event(24, 8, loose), event(25, 8, loose), event(26, 8, loose)],
      today,
      false,
      now,
    ).some((item) => item.id === 'loose'),
  )
  const three = [event(26, 8, loose), event(26, 9, loose), event(26, 10, loose)]
  assert.equal(
    healthInsights(three, today, false, now).find((item) => item.id === 'loose')?.level,
    'watch',
  )
  const six = [...three, event(26, 11, loose), event(26, 12, loose), event(26, 13, loose)]
  assert.equal(
    healthInsights(six, today, false, now).find((item) => item.id === 'loose')?.level,
    'attention',
  )
})

test('attention signals are explicit, prioritized, and ignore old or future records', () => {
  const insights = healthInsights(
    [
      event(26, 8, { bristol_type: 1 }),
      event(26, 9, { symptoms: { blood: true, pain: 3 } }),
      event(1, 9, { symptoms: { blood: true } }),
      event(26, 23, { symptoms: { blood: true } }),
    ],
    today,
    false,
    now,
  )
  assert.deepEqual(
    insights.slice(0, 2).map((item) => item.id),
    ['blood', 'pain'],
  )
  assert.match(insights[0]!.evidence, /: 1/)
  assert.ok(insights.every((item) => item.source.startsWith('https://')))
  assert.deepEqual(
    healthInsights([event(26, 8, { symptoms: { blood: false, pain: 0 } })], today, false, now),
    [],
  )
})

test('gas counts alone do not produce a medical claim', () => {
  const many = Array.from({ length: 100 }, () => event(26, 8, { type: 'fart' }))
  assert.deepEqual(healthInsights(many, today, false, now), [])
  assert.ok(
    healthInsights(
      [event(26, 8, { type: 'fart', symptoms: { bloating: true } })],
      today,
      false,
      now,
    ).some((item) => item.id === 'gas'),
  )
})

test('three calendar dates alone do not prove a continuous 48-hour illness', () => {
  const rows = [24, 25, 26].flatMap((day) =>
    [8, 9, 10].map((hour) => event(day, hour, { bristol_type: 6 })),
  )
  const insight = healthInsights(rows, today, false, now).find((item) => item.id === 'loose')
  assert.equal(insight?.level, 'watch')
  assert.match(insight!.rule, /не доказывают/)
})

test('symptoms distinguish missing from negative and reject malformed or inapplicable data', () => {
  assert.equal(parseSymptoms(undefined, 'poop'), null)
  assert.equal(parseSymptoms({ pain: null, blood: null }, 'poop'), null)
  assert.deepEqual(parseSymptoms({ pain: 0, blood: false }, 'poop'), { pain: 0, blood: false })
  for (const value of [
    [],
    1,
    'bad',
    { pain: 4 },
    { pain: 1.5 },
    { blood: 'yes' },
    { unrelated: true },
  ])
    assert.throws(() => parseSymptoms(value, 'poop'))
  assert.throws(() => parseSymptoms({ blood: true }, 'fart'))
  const input = {
    type: 'poop',
    occurred_at: now.toISOString(),
    symptoms: { pain: 2, straining: true },
  }
  assert.deepEqual(parseImport(JSON.stringify({ version: 3, events: [input] })), [input])
})

test('symptoms survive local reload and editing, and can be explicitly cleared', async () => {
  const data = new Map<string, string>()
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
  }
  const repo = createLocalRepository(storage)
  const saved = await repo.add({
    type: 'poop',
    occurred_at: now.toISOString(),
    symptoms: { pain: 1, straining: true },
  })
  assert.deepEqual((await createLocalRepository(storage).list())[0]?.symptoms, {
    pain: 1,
    straining: true,
  })
  await repo.update(saved.id, {
    type: 'poop',
    occurred_at: now.toISOString(),
    symptoms: { pain: 0, straining: false },
  })
  assert.deepEqual((await repo.list())[0]?.symptoms, { pain: 0, straining: false })
  await repo.update(saved.id, { type: 'poop', occurred_at: now.toISOString(), symptoms: null })
  assert.equal((await repo.list())[0]?.symptoms, null)
})
