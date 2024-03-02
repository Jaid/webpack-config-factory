import type {TsConfigJson} from 'type-fest'

import assert from 'node:assert'
import path from 'node:path'
import {it} from 'node:test'
import {promisify} from 'node:util'

import {execa} from 'execa'
import fs from 'fs-extra'
import {globby} from 'globby'
import webpackModule from 'webpack'

import {toCleanYamlFile, toYamlFile} from '~/lib/toYaml.js'
import {buildConfig} from '~/src/index.js'

const webpack = promisify(webpackModule)
class TempFile implements AsyncDisposable {
  #file: string
  constructor(file: string) {
    this.#file = file
  }
  async [Symbol.asyncDispose]() {
    await fs.remove(this.#file)
  }
  async write(text: string) {
    await fs.outputFile(this.#file, text)
  }
}
const rootFolder = process?.env?.npm_config_local_prefix
if (rootFolder === undefined) {
  throw new Error(`Must be called from an npm run script`)
}
const fixturesFolder = path.join(rootFolder, `test`, `fixture`)
const outputFolder = path.join(rootFolder, `out`, `fixture`)
const fixtures = await globby(`*`, {
  cwd: fixturesFolder,
  onlyDirectories: true,
})
console.dir(fixtures)
for (const fixture of fixtures) {
  it(`fixture ${fixture}`, async () => {
    const fixtureFolder = path.join(fixturesFolder, fixture)
    const outputFixtureFolder = path.join(outputFolder, fixture)
    const outputCompilationFolder = path.join(outputFixtureFolder, `out`)
    const outputMetaFolder = path.join(outputFixtureFolder, `meta`)
    await fs.emptyDir(outputFixtureFolder)
    const config = await buildConfig()
    await toCleanYamlFile(config, path.join(outputMetaFolder, `config.yml`))
    const compilationResult = await webpack([config])
    await toCleanYamlFile(compilationResult, path.join(outputMetaFolder, `compilation.yml`))
  })
}
