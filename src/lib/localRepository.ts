import type { DiaryEvent, EventInput, Repository } from '../types'
const storageKey = 'puki-demo-v1'
export function createLocalRepository(storage: Pick<Storage, 'getItem' | 'setItem'>): Repository {
  const read = (): DiaryEvent[] => JSON.parse(storage.getItem(storageKey) || '[]')
  const write = (rows: DiaryEvent[]) => storage.setItem(storageKey, JSON.stringify(rows))
  const make = (input: EventInput): DiaryEvent => ({
    ...input,
    id: crypto.randomUUID(),
    user_id: 'demo',
    created_at: new Date().toISOString(),
  })
  return {
    async list() {
      return read().sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    },
    async add(input) {
      const row = make(input)
      write([...read(), row])
      return row
    },
    async update(id, input) {
      const rows = read()
      const row = rows.find((r) => r.id === id)
      if (!row) throw new Error('Запись не найдена. Обновите страницу.')
      Object.assign(row, input)
      write(rows)
      return row
    },
    async remove(id) {
      write(read().filter((r) => r.id !== id))
    },
    async clear() {
      write([])
    },
    async import(inputs) {
      write([...read(), ...inputs.map(make)])
    },
  }
}
