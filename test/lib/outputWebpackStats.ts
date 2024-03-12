import type webpack from 'webpack'

import is from '@sindresorhus/is'
import fs from 'fs-extra'
import {toCleanYamlFile} from 'lib/toYaml.js'
import * as lodash from 'lodash-es'
import * as path from 'zeug/path'

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

export const outputWebpackStats = async (stats: Array<webpack.Stats> | webpack.Stats, folder: string) => {
  if (Array.isArray(stats)) {
    if (stats.length === 1) {
      await outputWebpackStats(stats[0], folder)
      return
    }
    for (const [index, stat] of stats.entries()) {
      const childFolder = path.join(folder, `${index}`)
      await outputWebpackStats(stat, childFolder)
    }
    return
  }
  await fs.emptyDir(folder)
  const jobs: Array<Promise<void>> = []
  for (const key of keys) {
    const value = stats.compilation[key] as unknown
    const isEmpty = is.set(value) ? value.size === 0 : lodash.isEmpty(value)
    if (isEmpty) {
      continue
    }
    const statsOutputFile = path.join(folder, `${key}.yml`)
    jobs.push(toCleanYamlFile(value, statsOutputFile))
  }
  await Promise.all(jobs)
}
