<script setup lang="ts">
import { ref } from 'vue'
import {
  events,
  session,
  isDemo,
  busy,
  mutate,
  notify,
  error,
  readableError,
  refresh,
} from '../state'
import { supabase, redirectUrl } from '../lib/supabase'
import { parseImport } from '../lib/import'
import type { EventInput } from '../types'
import ConfirmDialog from '../components/ConfirmDialog.vue'
const pending = ref(false)
const confirmation = ref<'clear' | 'import' | null>(null)
const inputs = ref<EventInput[]>([])
const importError = ref('')
function exportData() {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          version: 1,
          exported_at: new Date().toISOString(),
          events: events.value.map(({ type, occurred_at }) => ({ type, occurred_at })),
        },
        null,
        2,
      ),
    ],
    { type: 'application/json' },
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'my-little-diary.json'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  notify('Файл с твоей историей готов ♡')
}
async function importFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  importError.value = ''
  try {
    if (file.size > 2_000_000) throw new Error('Файл слишком большой. Максимум — 2 МБ.')
    inputs.value = parseImport(await file.text())
    error.value = ''
    confirmation.value = 'import'
  } catch (e) {
    importError.value =
      e instanceof SyntaxError ? 'Это не JSON-файл. Проверьте формат.' : (e as Error).message
  } finally {
    input.value = ''
  }
}
async function confirm() {
  if (await mutate(confirmation.value === 'clear' ? 'clear' : 'import', inputs.value)) {
    notify(
      confirmation.value === 'clear'
        ? 'Дневник очищен. Можно начать заново ♡'
        : 'Записи импортированы ♡',
    )
    confirmation.value = null
  }
}
async function authAction(action: 'logout' | 'reset') {
  if (!supabase || pending.value) return
  pending.value = true
  error.value = ''
  try {
    const result =
      action === 'logout'
        ? await supabase.auth.signOut({ scope: 'local' })
        : await supabase.auth.resetPasswordForEmail(session.value!.user.email!, {
            redirectTo: redirectUrl(),
          })
    if (result.error) throw result.error
    if (action === 'reset') notify('Письмо для смены пароля отправлено ♡')
  } catch (e) {
    error.value = readableError(e)
  } finally {
    pending.value = false
  }
}
</script>
<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">ТВОЙ УЮТНЫЙ УГОЛОК</span>
      <h1>Всё по-твоему<span class="pink"> 🎀</span></h1>
      <p>Твоя история принадлежит только тебе.</p>
    </div>
  </div>
  <div class="settings-grid">
    <section class="card">
      <h2>Мой аккаунт</h2>
      <div class="account-info">
        <span class="avatar">♡</span>
        <div>
          <strong>{{ isDemo ? 'Локальный дневник' : session?.user.email }}</strong>
          <p>{{ isDemo ? 'Данные только в этом браузере' : 'Личный дневник в Supabase' }}</p>
        </div>
      </div>
      <p
        v-if="isDemo"
        class="notice"
      >
        Демо-режим без регистрации. Записи сохраняются в браузере и не синхронизируются. Перед
        очисткой браузера экспортируй свою историю.
      </p>
      <div
        v-else
        class="settings-actions"
      >
        <button
          class="secondary"
          :disabled="pending || busy"
          @click="authAction('reset')"
        >
          Сменить пароль</button
        ><button
          class="text-button"
          :disabled="pending || busy"
          @click="authAction('logout')"
        >
          {{ pending ? 'Подождите…' : 'Выйти из аккаунта' }}
        </button>
      </div>
    </section>
    <section class="card">
      <h2>Твоя история</h2>
      <p>Сохрани копию или перенеси записи из другого дневника.</p>
      <div class="settings-actions">
        <button
          class="secondary"
          :disabled="busy"
          @click="exportData"
        >
          ↓ Экспортировать JSON</button
        ><label class="secondary upload"
          >↑ Импортировать JSON<input
            type="file"
            accept=".json,application/json"
            :disabled="busy"
            @change="importFile"
        /></label>
      </div>
      <p class="fine-print">
        Импорт добавляет записи к существующим. Личные идентификаторы из файла не переносятся.
      </p>
      <p
        v-if="importError"
        class="error"
        role="alert"
      >
        {{ importError }}
      </p>
      <button
        class="text-button"
        :disabled="busy"
        @click="refresh"
      >
        ↻ Обновить данные
      </button>
    </section>
    <section class="card privacy-card">
      <span>🔒</span>
      <div>
        <h2>Только для тебя</h2>
        <p>
          {{
            isDemo
              ? 'Локальный дневник доступен в этом профиле браузера.'
              : 'Записи привязаны к твоему аккаунту и защищены политиками доступа в базе данных.'
          }}
          Никаких рейтингов, сравнений и публичных профилей.
        </p>
      </div>
    </section>
    <section class="card danger-card">
      <h2>Начать с чистого листа</h2>
      <p>
        Удалить все свои записи из дневника. Отменить это действие нельзя — сначала можно скачать
        копию.
      </p>
      <!-- prettier-ignore -->
      <button
        class="danger-button"
        :disabled="busy || !events.length"
        @click="error = ''; confirmation = 'clear'"
      >
        Удалить все записи
      </button>
    </section>
  </div>
  <ConfirmDialog
    v-if="confirmation"
    :title="confirmation === 'clear' ? 'Очистить дневник?' : 'Добавить записи из файла?'"
    :text="
      confirmation === 'clear'
        ? `Будут удалены все ${events.length} записей. Восстановить их без экспорта не получится.`
        : `Добавим ${inputs.length} записей. Повторный импорт создаст дубликаты. Продолжить?`
    "
    :label="confirmation === 'import' ? 'Добавить записи' : 'Удалить всё'"
    @close="confirmation = null"
    @confirm="confirm"
  />
</template>
