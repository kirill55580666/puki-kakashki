import { globSync, readFileSync } from 'node:fs'
import { parse, compileTemplate } from 'vue/compiler-sfc'

export function templateErrors(source, filename) {
  const { descriptor, errors } = parse(source, { filename })
  if (errors.length) {
    return errors.map((error) => ({
      message: typeof error === 'string' ? error : error.message,
      line: error.loc?.start.line ?? 1,
      column: error.loc?.start.column ?? 1,
    }))
  }
  if (!descriptor.template || descriptor.template.src) return []

  const result = compileTemplate({
    source: descriptor.template.content,
    filename,
    id: filename,
    compilerOptions: {
      expressionPlugins:
        descriptor.scriptSetup?.lang === 'ts' || descriptor.script?.lang === 'ts'
          ? ['typescript']
          : [],
    },
  })
  return result.errors.map((error) => ({
    message: typeof error === 'string' ? error : error.message,
    line: (error.loc?.start.line ?? 1) + descriptor.template.loc.start.line - 1,
    column: error.loc?.start.column ?? 1,
  }))
}

if (import.meta.main) {
  const files = process.argv.length > 2 ? process.argv.slice(2) : globSync('src/**/*.vue')
  let count = 0
  for (const filename of files) {
    for (const error of templateErrors(readFileSync(filename, 'utf8'), filename)) {
      console.error(`${filename}:${error.line}:${error.column}: ${error.message}`)
      count++
    }
  }
  if (count) process.exitCode = 1
  else console.log(`Синтаксис Vue-шаблонов проверен: ${files.length} файлов.`)
}
