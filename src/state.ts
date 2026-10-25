import { ref, computed } from 'vue'
import type { Session } from '@supabase/supabase-js'
import type { DiaryEvent, EventInput } from './types'
import { supabase } from './lib/supabase'
import { createRepository } from './lib/repository'
export const session = ref<Session | null>(null)
export const initialized = ref(false)
export const recovery = ref(false)
export const events = ref<DiaryEvent[]>([])
export const loading = ref(false)
export const busy = ref(false)
export const error = ref('')
export const toast = ref('')
export const isDemo = !supabase
export const signedIn = computed(() => isDemo || !!session.value)
let version = 0
let toastTimer: ReturnType<typeof setTimeout>
export function notify(message: string) { toast.value = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.value = '' }, 3600) }
export function readableError(e: unknown): string {
  const message = e instanceof Error ? e.message : String((e as { message?: string })?.message || '')
  if (/invalid login/i.test(message)) return 'Не совпали почта или пароль. Попробуйте ещё раз.'
  if (/email not confirmed/i.test(message)) return 'Сначала подтвердите почту по ссылке в письме.'
  if (/already registered/i.test(message)) return 'Эта почта уже зарегистрирована. Попробуйте войти.'
  if (/rate limit|too many/i.test(message)) return 'Слишком много попыток. Подождите немного.'
  if (/password/i.test(message)) return 'Пароль не принят. Используйте не менее 8 символов и другой пароль, если обновляете его.'
  if (/fetch|network|timeout|abort/i.test(message)) return 'Не удалось связаться с сервером. Проверьте интернет и попробуйте снова.'
  if (/row-level|permission/i.test(message)) return 'Нет доступа к данным. Войдите снова или проверьте политики Supabase.'
  if (/quota/i.test(message)) return 'Память браузера заполнена. Экспортируйте данные перед очисткой.'
  return 'Не удалось выполнить действие. Попробуйте ещё раз; если ошибка повторится, проверьте подключение Supabase.'
}
const repository = () => createRepository(session.value?.user.id || 'demo')
export async function refresh() {
  const request = ++version
  loading.value = true; error.value = ''
  try { const rows = await repository().list(); if (request === version) events.value = rows }
  catch (e) { if (request === version) error.value = readableError(e) }
  finally { if (request === version) loading.value = false }
}
export async function mutate(action: 'add' | 'update' | 'remove' | 'clear' | 'import', input?: EventInput | EventInput[], id?: string): Promise<boolean> {
  if (busy.value) return false
  busy.value = true; error.value = ''
  const current = version
  try {
    const repo = repository()
    if (action === 'add' || action === 'update') {
      const row = action === 'add' ? await repo.add(input as EventInput) : await repo.update(id!, input as EventInput)
      if (current === version) events.value = [...events.value.filter(e => e.id !== row.id), row].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    } else if (action === 'remove') { await repo.remove(id!); if (current === version) events.value = events.value.filter(e => e.id !== id) }
    else if (action === 'clear') { await repo.clear(); if (current === version) events.value = [] }
    else { await repo.import(input as EventInput[]); await refresh() }
    return true
  } catch (e) { error.value = readableError(e); return false }
  finally { busy.value = false }
}
export async function initialize() {
  if (!supabase) { initialized.value = true; await refresh(); return }
  supabase.auth.onAuthStateChange((event, next) => {
    const changed = session.value?.user.id !== next?.user.id
    session.value = next
    if (event === 'PASSWORD_RECOVERY') recovery.value = true
    if (changed) { ++version; events.value = []; if (next) setTimeout(() => { void refresh() }, 0) }
  })
  try { const { data, error: authError } = await supabase.auth.getSession(); if (authError) throw authError; session.value = data.session; if (data.session) await refresh() }
  catch (e) { error.value = readableError(e) }
  finally { initialized.value = true }
}
