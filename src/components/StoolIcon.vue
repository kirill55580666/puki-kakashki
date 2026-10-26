<script setup lang="ts">
import type { BristolType } from '../types';
defineProps<{ type?: BristolType | null }>();
</script>

<template>
  <svg
    v-if="type"
    class="stool-icon"
    viewBox="0 0 64 64"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <ellipse
      cx="32"
      cy="56"
      rx="25"
      ry="4"
      fill="#DCC5B8"
      opacity=".35"
    />
    <g
      fill="#BC8A73"
      stroke="#9B6A56"
      stroke-width="1.5"
      stroke-linejoin="round"
    >
      <g v-if="type === 1">
        <circle
          cx="20"
          cy="23"
          r="9"
        />
        <circle
          cx="43"
          cy="20"
          r="8"
        />
        <circle
          cx="32"
          cy="38"
          r="11"
        />
        <circle
          cx="49"
          cy="43"
          r="7"
        />
        <circle
          cx="13"
          cy="44"
          r="7"
        />
      </g>
      <path
        v-else-if="type === 2"
        d="M14 48C5 44 8 34 15 32C8 24 14 17 21 19C18 9 29 6 35 13C43 6 52 13 48 22C59 24 58 35 50 38C57 49 45 57 38 51C30 60 20 55 22 49C19 51 16 51 14 48Z"
      />
      <g v-else-if="type === 3">
        <path
          d="M14 48C4 40 12 25 22 24C27 24 34 22 34 16C36 4 53 8 52 20C52 34 40 38 32 39C28 39 25 51 14 48Z"
        />
        <path
          d="m23 25 4 7-5 4m17-21 5 6-5 6"
          stroke="#865742"
          stroke-width="2.5"
          fill="none"
        />
      </g>
      <path
        v-else-if="type === 4"
        d="M14 48C4 40 13 27 25 26C34 25 39 22 37 17C32 6 49 5 53 17C60 35 43 40 32 40C25 40 23 55 14 48Z"
      />
      <g v-else-if="type === 5">
        <path d="M8 24C8 11 25 12 27 22C29 33 9 35 8 24Z" />
        <path d="M36 16C42 8 57 13 54 24C51 35 29 28 36 16Z" />
        <path d="M21 37C29 28 45 33 44 45C42 56 12 51 21 37Z" />
      </g>
      <path
        v-else-if="type === 6"
        d="m9 35 6-7-3-8 10 1 6-10 7 6 12-3 1 11 9 5-6 9 3 9-12 1-7 7-8-6-12 2-2-9-7-2Z"
        fill="#C69A76"
      />
      <g
        v-else-if="type === 7"
        fill="#C79D7E"
      >
        <path d="M7 42C7 32 21 32 28 34C38 25 57 33 57 43C57 55 7 56 7 42Z" />
        <path d="M17 9C17 9 10 18 13 22C17 28 24 23 22 18Z" />
        <path d="M45 10C45 10 39 17 41 21C46 26 51 21 49 17Z" />
      </g>
    </g>
    <g fill="#563D39">
      <ellipse
        :cx="type === 1 ? 28 : 26"
        :cy="type === 1 ? 37 : 34"
        rx="1.8"
        ry="2.5"
      />
      <ellipse
        :cx="type === 1 ? 36 : 38"
        :cy="type === 1 ? 37 : 34"
        rx="1.8"
        ry="2.5"
      />
    </g>
    <path
      :d="type === 1 ? 'M29 42q3 4 6 0' : 'M28 40q4 5 8 0'"
      stroke="#563D39"
      stroke-width="1.8"
      stroke-linecap="round"
    />
    <g
      fill="#ECA4AA"
      opacity=".85"
    >
      <ellipse
        cx="21"
        cy="39"
        rx="3.5"
        ry="2"
      />
      <ellipse
        cx="43"
        cy="39"
        rx="3.5"
        ry="2"
      />
    </g>
  </svg>
  <span
    v-else
    class="stool-icon stool-fallback"
    aria-hidden="true"
    >💩</span
  >
</template>
