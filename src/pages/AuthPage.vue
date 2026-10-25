<script setup lang="ts">
import { ref } from 'vue'
import Mascot from '../components/Mascot.vue'
import { supabase, redirectUrl } from '../lib/supabase'
import { recovery, readableError, notify } from '../state'
const mode = ref<'login' | 'signup' | 'reset'>('login')
const email = ref(''); const password = ref(''); const pending = ref(false); const message = ref(''); const failure = ref('')
function switchMode(next: typeof mode.value) { mode.value = next; failure.value = ''; message.value = ''; password.value = '' }
async function submit() {
  if (pending.value || !supabase) return
  pending.value = true; failure.value = ''; message.value = ''
  try {
    if (recovery.value) { const { error } = await supabase.auth.updateUser({ password: password.value }); if (error) throw error; recovery.value = false; notify('Пароль обновлён ♡') }
    else if (mode.value === 'signup') { const { data, error } = await supabase.auth.signUp({ email: email.value, password: password.value, options: { emailRedirectTo: redirectUrl() } }); if (error) throw error; if (!data.session) message.value = 'Проверьте почту: для завершения регистрации перейдите по ссылке в письме. Если аккаунт уже есть, войдите или восстановите пароль.' }
    else if (mode.value === 'reset') { const { error } = await supabase.auth.resetPasswordForEmail(email.value, { redirectTo: redirectUrl() }); if (error) throw error; message.value = 'Если аккаунт с этой почтой существует, письмо со ссылкой для смены пароля скоро придёт.' }
    else { const { error } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value }); if (error) throw error }
  } catch (e) { failure.value = readableError(e) } finally { pending.value = false }
}
</script>
<template><main class="auth-layout"><section class="auth-art"><span class="eyebrow">МАЛЕНЬКИЕ МОМЕНТЫ. БОЛЬШЕ ЛЁГКОСТИ.</span><Mascot/><h1>Здесь можно<br>быть собой<span class="pink">.</span></h1><p>Твой уютный дневник счастливого животика.<br>Без стеснения. С заботой о себе.</p></section><section class="card auth-card"><span class="eyebrow">ТВОЙ ЛИЧНЫЙ УГОЛОК</span><h2>{{ recovery ? 'Новый пароль' : mode === 'signup' ? 'Давай знакомиться ♡' : mode === 'reset' ? 'Вернёмся в дневник' : 'С возвращением ♡' }}</h2><p>{{ recovery ? 'Придумай новый пароль для своего аккаунта.' : mode === 'reset' ? 'Отправим ссылку на твою почту.' : 'Все маленькие секреты останутся твоими.' }}</p><form @submit.prevent="submit"><label v-if="!recovery">Электронная почта<input v-model="email" type="email" autocomplete="email" placeholder="you@example.com" required :disabled="pending"></label><label v-if="recovery || mode !== 'reset'">Пароль<input v-model="password" type="password" :minlength="mode === 'login' && !recovery ? 1 : 8" :autocomplete="mode === 'login' && !recovery ? 'current-password' : 'new-password'" placeholder="Не менее 8 символов" required :disabled="pending"></label><p v-if="failure" class="error" role="alert">{{ failure }}</p><p v-if="message" class="success" role="status">{{ message }}</p><button class="primary full" :disabled="pending">{{ pending ? 'Подождите…' : recovery ? 'Сохранить пароль' : mode === 'signup' ? 'Создать дневник' : mode === 'reset' ? 'Отправить ссылку' : 'Войти в дневник' }}</button></form><template v-if="!recovery"><button v-if="mode === 'login'" class="text-button" :disabled="pending" @click="switchMode('reset')">Не помню пароль</button><div class="auth-bottom"><span>{{ mode === 'login' ? 'Ещё нет дневника?' : 'Уже есть аккаунт?' }}</span><button class="text-button" :disabled="pending" @click="switchMode(mode === 'login' ? 'signup' : 'login')">{{ mode === 'login' ? 'Зарегистрироваться' : 'Войти' }}</button></div></template></section></main></template>
