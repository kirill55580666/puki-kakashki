import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bristolTypes, bristolBreakdown, bristolLabel } from '../src/lib/bristol.ts'
import { parseImport } from '../src/lib/import.ts'
import { createLocalRepository } from '../src/lib/localRepository.ts'
import type { DiaryEvent } from '../src/types.ts'

test('Bristol breakdown counts all seven types and legacy entries, excluding farts', () => {
  const rows: Pick<DiaryEvent, 'type' | 'bristol_type'>[] = [
    ...bristolTypes.map(({ type }) => ({ type: 'poop' as const, bristol_type: type })),
    { type: 'poop', bristol_type: 4 },
    { type: 'poop' },
    { type: 'poop', bristol_type: null },
    { type: 'fart' },
  ]
  const breakdown = bristolBreakdown(rows)
  assert.equal(breakdown.length, 8)
  assert.equal(
    breakdown.reduce((sum, row) => sum + row.count, 0),
    10,
  )
  assert.equal(breakdown.find((row) => row.type === 4)?.count, 2)
  assert.equal(breakdown.find((row) => row.type === null)?.count, 2)
  assert.equal(breakdown.find((row) => row.type === 1)?.percentage, 10)
  assert.match(bristolLabel(4), /Тип 4/)
  assert.equal(bristolLabel(), 'Тип не указан')
})

test('empty Bristol breakdown includes all types with finite zero percentages', () => {
  const breakdown = bristolBreakdown([{ type: 'fart' }])
  assert.equal(breakdown.length, 8)
  assert.ok(breakdown.every((row) => row.count === 0 && row.percentage === 0))
})

test('import and export round trip preserves Bristol types and accepts old backups', () => {
  const occurred_at = '2026-10-25T12:00:00.000Z'
  const inputs = bristolTypes.map(({ type }) => ({ type: 'poop', occurred_at, bristol_type: type }))
  assert.deepEqual(parseImport(JSON.stringify({ version: 2, events: inputs })), inputs)
  assert.deepEqual(
    parseImport(JSON.stringify({ version: 1, events: [{ type: 'poop', occurred_at }] })),
    [{ type: 'poop', occurred_at }],
  )
  for (const invalid of [0, 8, -1, 1.5, '4', true, {}, []]) {
    assert.throws(
      () => parseImport(JSON.stringify([{ type: 'poop', occurred_at, bristol_type: invalid }])),
      /Тип стула/,
    )
  }
  assert.throws(
    () => parseImport(JSON.stringify([{ type: 'fart', occurred_at, bristol_type: 4 }])),
    /Тип стула/,
  )
})

test('Bristol type survives local reload, editing, clearing and importing', async () => {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
  const occurred_at = '2026-10-25T12:00:00.000Z'
  const repository = createLocalRepository(storage)
  const event = await repository.add({ type: 'poop', occurred_at, bristol_type: 4 })
  const reloaded = createLocalRepository(storage)
  assert.equal((await reloaded.list())[0]?.bristol_type, 4)
  await reloaded.update(event.id, { type: 'poop', occurred_at, bristol_type: 6 })
  assert.equal((await repository.list())[0]?.bristol_type, 6)
  await reloaded.update(event.id, { type: 'poop', occurred_at, bristol_type: null })
  assert.equal((await repository.list())[0]?.bristol_type, null)
  await reloaded.update(event.id, { type: 'fart', occurred_at, bristol_type: 4 })
  assert.equal((await repository.list())[0]?.bristol_type, null)
  await reloaded.import([{ type: 'poop', occurred_at, bristol_type: 7 }])
  assert.equal((await repository.list()).find((row) => row.id !== event.id)?.bristol_type, 7)
  await reloaded.remove(event.id)
  assert.equal(bristolBreakdown(await reloaded.list()).find((row) => row.type === 7)?.count, 1)
})
