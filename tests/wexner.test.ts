import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseWexner,
  previousWexner,
  wexnerComparison,
  wexnerScore,
  wexnerVersion,
  type WexnerAssessment,
} from '../src/lib/wexner.ts'
import { createLocalWexnerRepository } from '../src/lib/localWexnerRepository.ts'
import { createLocalRepository } from '../src/lib/localRepository.ts'
import { parseImport } from '../src/lib/import.ts'
import { parseDuration } from '../src/lib/duration.ts'

test('Wexner requires eight explicit answers, including zero, and caps assistance at two', () => {
  assert.equal(wexnerScore(Array(8).fill(0)), 0)
  assert.equal(wexnerScore([4, 4, 4, 4, 4, 2, 4, 4]), 30)
  assert.equal(wexnerScore([4, 4, 4, 4, 4, 3, 4, 4]), null)
  assert.equal(wexnerScore([0, 0, 0, 0, 0, 0, 0, null]), null)
  assert.equal(wexnerScore(new Array(8)), null)
  assert.equal(wexnerScore([0, 0, 0]), null)
  assert.equal(wexnerScore([0, 0, 0, 0, 0, 0, 0, 1.5]), null)
  assert.throws(() =>
    parseWexner({ version: wexnerVersion, assessed_at: 'bad', answers: Array(8).fill(0) }),
  )
})

test('comparisons use only previous complete assessments of the same version', () => {
  const row = (
    id: string,
    day: number,
    value: number,
    version = wexnerVersion,
  ): WexnerAssessment => ({
    id,
    user_id: 'demo',
    version,
    assessed_at: `2026-10-${day}T12:00:00.000Z`,
    created_at: '2026-10-31T12:00:00.000Z',
    answers: [value, 0, 0, 0, 0, 0, 0, 0],
  })
  const current = row('current', 31, 2)
  const previous = row('previous', 29, 1)
  assert.equal(
    previousWexner(current, [
      row('future', 31, 0),
      row('other', 30, 0, 'other'),
      { ...row('incomplete', 30, 0), answers: [] },
      previous,
      row('old', 28, 0),
    ])?.id,
    'previous',
  )
  assert.match(wexnerComparison(current, previous)!, /1.*больше/)
  assert.match(wexnerComparison(previous, current)!, /1.*меньше/)
  assert.match(wexnerComparison(current, row('equal', 28, 2))!, /не изменился/)
  assert.equal(wexnerComparison(current), null)
  assert.equal(wexnerComparison(current, row('other', 30, 0, 'other')), null)
})

test('assessments persist with date and version and failed writes reject', async () => {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
  const input = {
    version: wexnerVersion,
    assessed_at: '2026-10-31T12:00:00.000Z',
    answers: Array(8).fill(0),
  }
  const saved = await createLocalWexnerRepository(storage).add(input)
  assert.deepEqual(await createLocalWexnerRepository(storage).list(), [saved])
  await assert.rejects(
    createLocalWexnerRepository({
      ...storage,
      setItem: () => {
        throw new Error('Quota')
      },
    }).add(input),
    /Quota/,
  )
  await assert.rejects(createLocalWexnerRepository(storage).add({ ...input, answers: [0] }))
})

test('duration preserves unknown, survives import and editing for both attempt outcomes', async () => {
  assert.equal(parseDuration(undefined), null)
  for (const invalid of [0, -1, 1.5, 1441, '10', true, NaN, Infinity])
    assert.throws(() => parseDuration(invalid))
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
  const repo = createLocalRepository(storage)
  const first = await repo.add({
    type: 'fart',
    occurred_at: '2026-10-31T12:00:00.000Z',
    attempt_duration_minutes: 61,
  })
  await repo.add({
    type: 'poop',
    occurred_at: '2026-10-31T13:00:00.000Z',
    attempt_duration_minutes: 1,
  })
  const reloaded = await createLocalRepository(storage).list()
  const imported = parseImport(JSON.stringify({ version: 4, events: reloaded }))
  assert.deepEqual(
    imported.map((row) => row.attempt_duration_minutes),
    [1, 61],
  )
  await repo.update(first.id, {
    type: 'fart',
    occurred_at: first.occurred_at,
    attempt_duration_minutes: null,
  })
  assert.equal(
    (await repo.list()).find((row) => row.id === first.id)?.attempt_duration_minutes,
    null,
  )
  assert.equal(
    parseImport(JSON.stringify([{ type: 'poop', occurred_at: first.occurred_at }]))[0]
      .attempt_duration_minutes,
    undefined,
  )
  assert.throws(() =>
    parseImport(
      JSON.stringify([
        { type: 'fart', occurred_at: first.occurred_at, attempt_duration_minutes: 0 },
      ]),
    ),
  )
})
