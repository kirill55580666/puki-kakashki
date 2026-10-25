<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { busy, error } from '../state'
defineProps<{ title: string; text: string; label?: string }>()
const emit = defineEmits<{ confirm: []; close: [] }>()
const dialog = ref<HTMLDialogElement>()
const previousFocus = document.activeElement as HTMLElement | null
onMounted(() => dialog.value?.showModal())
onBeforeUnmount(() => previousFocus?.focus())
</script>
<template><dialog ref="dialog" class="modal" aria-labelledby="confirm-title" @cancel.prevent="!busy && emit('close')"><h2 id="confirm-title">{{ title }}</h2><p>{{ text }}</p><p v-if="error" role="alert" class="error">{{ error }}</p><div class="button-row"><button :disabled="busy" class="secondary" autofocus @click="emit('close')">Отмена</button><button :disabled="busy" class="primary" @click="emit('confirm')">{{ busy ? 'Подождите…' : label || 'Удалить' }}</button></div></dialog></template>
