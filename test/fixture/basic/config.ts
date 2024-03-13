import type {FixtureConfig} from '~/test/lib/runTest.js'

import {LibPlugin} from 'src/plugin/LibPlugin.js'

import {ConfigBuilder} from '~/src/ConfigBuilder.js'
import {CommonPlugin} from '~/src/plugin/CommonPlugin.js'
import {PkgPlugin} from '~/src/plugin/PkgPlugin.js'
import {TypescriptPlugin} from '~/src/plugin/TypescriptPlugin.js'

export const configBuilder: FixtureConfig['configBuilder'] = context => {
  const builder = new ConfigBuilder({
    contextFolder: context.fixtureFolder,
    outputFolder: context.outputCompilationFolder,
    env: context.env,
    plugins: [
      new CommonPlugin,
      new TypescriptPlugin,
      new PkgPlugin,
      new LibPlugin,
    ],
  })
  return builder
}

export const checkExport = value => {
  console.dir(value)
}
