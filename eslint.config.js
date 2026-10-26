import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import prettier from 'eslint-plugin-prettier/recommended'

export default defineConfig([
  {
    ignores: ['dist/**', 'node_modules/**', '.idea/**'],
  },
  {
    files: ['**/*.{js,ts,vue}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  ...vue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    files: ['src/**/*.{ts,vue}'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['*.{js,ts}', 'tests/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  prettier,
])
