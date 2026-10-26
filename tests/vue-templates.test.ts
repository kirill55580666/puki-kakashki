import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import prettier from 'prettier'
import { templateErrors } from '../scripts/check-vue-templates.js'

const filename = 'src/pages/Regression.vue'
const valid = `<template><button @click="first(); second()">OK</button></template>`
const invalid = `<template><button @click="
  first()
  second()
">OK</button></template>`

test('Vue formatting preserves separators between inline event statements', async () => {
  const options = await prettier.resolveConfig(filename)
  const formatted = await prettier.format(valid, { ...options, filepath: filename })
  assert.match(formatted, /first\(\);/)
  assert.deepEqual(templateErrors(formatted, filename), [])
  assert.equal(await prettier.format(formatted, { ...options, filepath: filename }), formatted)
})

test('template validation rejects statements without a separator and reports their location', () => {
  const errors = templateErrors(invalid, filename)
  assert.equal(errors.length, 1)
  assert.match(errors[0].message, /Error parsing JavaScript expression/)
  assert.ok(errors[0].line > 0)
})

test('template check command fails on invalid Vue input', () => {
  const directory = mkdtempSync(join(tmpdir(), 'diary-template-'))
  try {
    const fixture = join(directory, 'Invalid.vue')
    writeFileSync(fixture, invalid)
    const script = fileURLToPath(new URL('../scripts/check-vue-templates.js', import.meta.url))
    const result = spawnSync(process.execPath, [script, fixture], { encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.ok(result.stderr.includes(fixture))
    assert.match(result.stderr, /Error parsing JavaScript expression/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
