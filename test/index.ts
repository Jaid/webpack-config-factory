import path from 'node:path'
import {it} from 'node:test'
import {promisify} from 'node:util'

import fs from 'fs-extra'
import {globby} from 'globby'
import {isEmpty} from 'lodash-es'
import webpackOriginal from 'webpack'

import {toCleanYamlFile} from '~/lib/toYaml.js'
import {ConfigBuilder} from '~/src/ConfigBuilder.js'
import {buildConfig} from '~/src/index.js'

const webpack = promisify(webpackOriginal)
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
for (const fixture of fixtures) {
  for (const env of [`production`, `development`]) {
    const id = `${fixture}-${env}`
    await it(`fixture ${id}`, async () => {
      const fixtureFolder = path.join(fixturesFolder, fixture)
      const outputFixtureFolder = path.join(outputFolder, id)
      const outputCompilationFolder = path.join(outputFixtureFolder, `out`)
      const outputMetaFolder = path.join(outputFixtureFolder, `meta`)
      await fs.emptyDir(outputFixtureFolder)
      const configBuilder = new ConfigBuilder({
        contextFolder: fixtureFolder,
        outputFolder: outputCompilationFolder,
        env,
      })
      const config = await configBuilder.build()
      await toCleanYamlFile(config, path.join(outputMetaFolder, `config.yml`))
      const compilationResult = await webpack([config])
      const stats = compilationResult!.stats[0].compilation
      const keys = [
        `assetsInfo`,
        `asyncEntrypoints`,
        `buildModules`,
        `chunkGraph`,
        `chunkGroups`,
        `chunks`,
        `chunkTemplate`,
        `comparedForEmitAssets`,
        `entries`,
        `entrypoints`,
        `errors`,
        `fileDependencies`,
        `fullHash`,
        `globalEntry`,
        `logging`,
        `mainTemplate`,
        `missingDependencies`,
        `namedChunkGroups`,
        `namedChunks`,
        `options`,
        `records`,
        `valueCacheVersions`,
      ]
      for (const key of keys) {
        const value = stats[key] as unknown
        if (isEmpty(value)) {
          continue
        }
        const statsOutputFile = path.join(outputMetaFolder, `stats.${key}.yml`)
        await toCleanYamlFile(value, statsOutputFile)
      }
    })
  }
}
