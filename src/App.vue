<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import CalendarPage from './pages/CalendarPage.vue'
import StatsPage from './pages/StatsPage.vue'
import HistoryPage from './pages/HistoryPage.vue'
import SettingsPage from './pages/SettingsPage.vue'
import AuthPage from './pages/AuthPage.vue'
import EventDialog from './components/EventDialog.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import type { DiaryEvent, EventType } from './types'
import {
  initialize,
  initialized,
  signedIn,
  recovery,
  isDemo,
  toast,
  error,
  mutate,
  notify,
  loading,
  refresh,
} from './state'
import { configurationError } from './lib/supabase'
import { dayKey } from './lib/dates'
const page = ref('calendar')
const tabs = [
  { id: 'calendar', icon: '▦', name: 'Календарь' },
  { id: 'stats', icon: '▥', name: 'Мой ритм' },
  { id: 'history', icon: '◷', name: 'История' },
  { id: 'settings', icon: '⚙', name: 'Настройки' },
]
const editor = ref<{ type: EventType; event?: DiaryEvent } | null>(null)
const deleting = ref<DiaryEvent | null>(null)
const today = ref(dayKey(new Date()))
let timer: ReturnType<typeof setInterval>
onMounted(() => {
  if (!configurationError) void initialize()
  timer = setInterval(() => {
    today.value = dayKey(new Date())
  }, 30000)
})
onBeforeUnmount(() => clearInterval(timer))
watch(signedIn, () => {
  editor.value = null
  deleting.value = null
  page.value = 'calendar'
})
function add(type: EventType) {
  error.value = ''
  editor.value = { type }
}
function edit(event: DiaryEvent) {
  error.value = ''
  editor.value = { type: event.type, event }
}
function remove(event: DiaryEvent) {
  error.value = ''
  deleting.value = event
}
async function confirmDelete() {
  if (await mutate('remove', undefined, deleting.value!.id)) {
    deleting.value = null
    notify('Запись удалена ♡')
  }
}
</script>
<template>
  <div class="app-shell">
    <header class="topbar">
      <a
        href="#"
        class="brand"
        @click.prevent="page = 'calendar'"
        ><span class="brand-icon">💩<i>🎀</i></span
        ><span>Пуки <em>&</em> Какашки<small>ДНЕВНИК СЧАСТЛИВОГО ЖИВОТИКА</small></span></a
      >
      <nav
        v-if="signedIn && !recovery && initialized"
        aria-label="Основная навигация"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="{ active: page === tab.id }"
          :aria-current="page === tab.id ? 'page' : undefined"
          @click="page = tab.id"
        >
          <span>{{ tab.icon }}</span
          >{{ tab.name }}
        </button>
      </nav>
      <button
        v-if="signedIn && initialized && !recovery"
        class="profile-button"
        aria-label="Настройки аккаунта"
        @click="page = 'settings'"
      >
        ♡
      </button>
    </header>
    <div
      v-if="configurationError"
      class="card config-error"
    >
      <h1>Проверим подключение</h1>
      <p>
        В конфигурации не хватает корректного URL Supabase или публичного ключа. Укажите обе
        переменные из .env.example и перезапустите сборку.
      </p>
    </div>
    <div
      v-else-if="!initialized"
      class="app-loading"
    >
      <span>🎀</span>
      <p>Открываем твой дневник…</p>
    </div>
    <template v-else
      ><div
        v-if="isDemo"
        class="demo-banner"
      >
        <span>✧ Локальный демо-режим</span><span>Записи сохраняются только в этом браузере</span>
      </div>
      <div
        v-if="error && !editor && !deleting"
        class="error global-error"
        role="alert"
      >
        {{ error }}
        <button
          v-if="signedIn"
          class="text-button"
          :disabled="loading"
          @click="refresh"
        >
          Повторить загрузку
        </button>
      </div>
      <AuthPage v-if="!signedIn || recovery" />
      <main
        v-else
        class="main-content"
      >
        <CalendarPage
          v-if="page === 'calendar'"
          :today="today"
          @add="add"
          @edit="edit"
          @remove="remove"
        /><StatsPage
          v-else-if="page === 'stats'"
          :today="today"
        /><HistoryPage
          v-else-if="page === 'history'"
          @edit="edit"
          @remove="remove"
        /><SettingsPage v-else /></main
    ></template>
    <footer>
      <span>Сделано с нежностью и чувством юмора ♡</span><span>Твой животик. Твои правила.</span>
    </footer>
    <EventDialog
      v-if="editor"
      :type="editor.type"
      :event="editor.event"
      @close="editor = null"
    /><ConfirmDialog
      v-if="deleting"
      title="Удалить этот момент?"
      text="Запись исчезнет из календаря и статистики. Это действие нельзя отменить."
      @confirm="confirmDelete"
      @close="deleting = null"
    /><Transition name="toast"
      ><div
        v-if="toast"
        class="toast"
        role="status"
      >
        {{ toast }}
      </div></Transition
    >
  </div>
</template>
