import type {TestContext} from '~/test/lib/types.js'
import type {Promisable} from 'type-fest'

import path from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {promisify} from 'node:util'

import is from '@sindresorhus/is'
import fs from 'fs-extra'
import * as lodash from 'lodash-es'
import webpackOriginal from 'webpack'

import {toCleanYamlFile} from '~/lib/toYaml.js'
import {ConfigBuilder} from '~/src/ConfigBuilder.js'

const thisFolder = path.dirname(fileURLToPath(import.meta.url))
const rootFolder = path.resolve(thisFolder, `..`, `..`)
export const webpack = promisify(webpackOriginal)

export const fixturesFolder = path.join(rootFolder, `test`, `fixture`)
export const outputFolder = path.join(rootFolder, `out`, `fixture`)

export const runTest = async (testContext: TestContext) => {
  const id = testContext.name
  const {fixtureProject, env} = /^(?<fixtureProject>.+)-(?<env>.+)$/.exec(id)!.groups!
  const fixtureFolder = path.join(fixturesFolder, fixtureProject)
  const outputFixtureFolder = path.join(outputFolder, id)
  await fs.emptyDir(outputFixtureFolder)
  const outputCompilationFolder = path.join(outputFixtureFolder, `out`)
  const outputMetaFolder = path.join(outputFixtureFolder, `meta`)
  const builderFile = path.join(fixtureFolder, `builder.ts`)
  const builderFileExists = await fs.pathExists(builderFile)
  const context = {
    testContext,
    fixture: fixtureProject,
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
  if (!process.env.OUTPUT_WEBPACK_STATS) {
    return
  }
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
}
