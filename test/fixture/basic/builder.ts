import {ConfigBuilder} from '~/src/ConfigBuilder.js'
import {CommonPlugin} from '~/src/plugin/CommonPlugin.js'
import {PkgPlugin} from '~/src/plugin/PkgPlugin.js'
import {TypescriptPlugin} from '~/src/plugin/TypescriptPlugin.js'

export default function (context) {
  const configBuilder = new ConfigBuilder({
    contextFolder: context.fixtureFolder,
    outputFolder: context.outputCompilationFolder,
    env: context.env,
    plugins: [
      new CommonPlugin,
      new TypescriptPlugin,
      new PkgPlugin,
    ],
  })
  return configBuilder
}
