<script setup lang="ts">
defineProps<{ small?: boolean }>();
</script>
<template>
  <svg
    :class="['mascot', { small }]"
    viewBox="0 0 260 210"
    fill="none"
    aria-hidden="true"
  >
    <ellipse
      cx="132"
      cy="191"
      rx="82"
      ry="10"
      fill="#D8BBC9"
      opacity=".22"
    />
    <path
      d="M77 139C58 122 71 104 96 98C78 72 112 71 121 48C131 25 110 23 119 18C159 21 172 55 157 73C184 77 194 96 183 110C225 116 229 149 207 163C225 192 192 196 159 194H91C43 196 31 159 77 139Z"
      fill="#BC8A73"
    />
    <path
      d="M78 139C111 147 166 149 191 140M98 99C122 106 156 109 175 101"
      stroke="#A87560"
      stroke-width="4"
      stroke-linecap="round"
    />
    <ellipse
      cx="103"
      cy="147"
      rx="5"
      ry="7"
      fill="#553D3E"
    />
    <ellipse
      cx="160"
      cy="147"
      rx="5"
      ry="7"
      fill="#553D3E"
    />
    <path
      d="M122 155Q132 166 142 155"
      stroke="#553D3E"
      stroke-width="4"
      stroke-linecap="round"
    />
    <ellipse
      cx="88"
      cy="159"
      rx="13"
      ry="7"
      fill="#ECA4AA"
    />
    <ellipse
      cx="176"
      cy="159"
      rx="13"
      ry="7"
      fill="#ECA4AA"
    />
    <path
      d="M154 63C183 34 193 43 184 71C211 68 215 91 189 96L158 77Z"
      fill="#E590AC"
    />
    <path
      d="M159 65C136 42 125 55 137 80L162 79"
      fill="#E590AC"
    />
    <circle
      cx="161"
      cy="75"
      r="10"
      fill="#D87597"
    />
    <path
      d="m38 47 4 9 10 2-8 7 1 10-9-5-9 5 2-10-7-7 10-2Z"
      fill="#EBD495"
    />
    <path
      d="M220 106c-16-15-24 7 0 18 25-12 15-33 0-18Z"
      fill="#E7ACBE"
    />
    <path
      d="m204 23 2 6 7 2-7 2-2 7-2-7-7-2 7-2Z"
      fill="#BEACCE"
    />
  </svg>
</template>
