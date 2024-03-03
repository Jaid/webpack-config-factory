import type {Promisable} from 'type-fest'

import path from 'node:path'
import test from 'node:test'
import {pathToFileURL} from 'node:url'
import {promisify} from 'node:util'

import is from '@sindresorhus/is'
import fs from 'fs-extra'
import {globby} from 'globby'
import * as lodash from 'lodash-es'
import webpackOriginal from 'webpack'

import {toCleanYamlFile} from '~/lib/toYaml.js'
import {ConfigBuilder} from '~/src/ConfigBuilder.js'

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
test.before(async () => {
  await fs.emptyDir(outputFolder)
})
for (const fixture of fixtures) {
  await test(`fixture ${fixture}`, async testContext => {
    for (const env of [`production`, `development`]) {
      await testContext.test(`env ${env}`, async innerTestContext => {
        const id = `${fixture}-${env}`
        const fixtureFolder = path.join(fixturesFolder, fixture)
        const outputFixtureFolder = path.join(outputFolder, id)
        const outputCompilationFolder = path.join(outputFixtureFolder, `out`)
        const outputMetaFolder = path.join(outputFixtureFolder, `meta`)
        const builderFile = path.join(fixtureFolder, `builder.ts`)
        const builderFileExists = await fs.pathExists(builderFile)
        const context = {
          fixture,
          id,
          env,
          fixtureFolder,
          outputCompilationFolder,
          outputMetaFolder,
          outputFixtureFolder,
        }
        let configBuilder: ConfigBuilder
        if (builderFileExists) {
          const customBuilderModule = await import(pathToFileURL(builderFile).toString()) as {default: (((passedContext: typeof context) => Promisable<ConfigBuilder>) | ConfigBuilder)}
          const customBuilder = customBuilderModule.default
          if (customBuilder instanceof ConfigBuilder) {
            configBuilder = customBuilder
          } else {
            configBuilder = await customBuilder(context)
          }
        } else {
          configBuilder = new ConfigBuilder({
            contextFolder: fixtureFolder,
            outputFolder: outputCompilationFolder,
            env,
          })
        }
        const config = await configBuilder.build()
        await toCleanYamlFile(context, path.join(outputMetaFolder, `context.yml`))
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
          const isEmpty = is.set(value) ? value.size === 0 : lodash.isEmpty(value)
          if (isEmpty) {
            continue
          }
          const statsOutputFile = path.join(outputMetaFolder, `stats.${key}.yml`)
          await toCleanYamlFile(value, statsOutputFile)
        }
      })
    }
  })
}
