import type { DiaryEvent, EventInput, Repository } from '../types'
import { supabase } from './supabase'
import { createLocalRepository } from './localRepository'
export function createRepository(userId: string): Repository {
  if (!supabase) return createLocalRepository(localStorage)
  const client = supabase
  const normalize = (input: EventInput): EventInput => ({
    ...input,
    bristol_type: input.type === 'poop' ? (input.bristol_type ?? null) : null,
  })
  return {
    async list() {
      const rows: DiaryEvent[] = []
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await client
          .from('events')
          .select('*')
          .eq('user_id', userId)
          .order('occurred_at', { ascending: false })
          .order('id')
          .range(offset, offset + 999)
        if (error) throw error
        rows.push(...data)
        if (data.length < 1000) return rows
      }
    },
    async add(input) {
      const { data, error } = await client
        .from('events')
        .insert({ ...normalize(input), user_id: userId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    async update(id, input) {
      const { data, error } = await client
        .from('events')
        .update(normalize(input))
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    async remove(id) {
      const { error } = await client.from('events').delete().eq('id', id).eq('user_id', userId)
      if (error) throw error
    },
    async clear() {
      const { error } = await client.from('events').delete().eq('user_id', userId)
      if (error) throw error
    },
    async import(inputs) {
      const { error } = await client
        .from('events')
        .insert(inputs.map((input) => ({ ...normalize(input), user_id: userId })))
      if (error) throw error
    },
  }
}
