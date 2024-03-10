import type {ConfigBuilder, ConfigBuilderPlugin, HookMap} from '../ConfigBuilder.js'
import type {PackageJson} from 'type-fest'

import {OutputConfigPlugin} from '../OutputConfigPlugin.js'

export type Options = {
  pkg?: PackageJson | string
}

const name = `CommonPlugin`
export class CommonPlugin implements ConfigBuilderPlugin {
  protected options: Options
  protected pkg: PackageJson | undefined
  constructor(options: Partial<Options> = {}) {
    this.options = options
  }
  apply(builder: ConfigBuilder, hooks: HookMap) {
    hooks.setDefaultOptions.tap(name, defaultOptions => {
      return {
        ...defaultOptions,
        outputFolder: `out/package/{{mode}}`,
      }
    })
    hooks.build.tapPromise(name, async () => {
      builder.set(`mode`, builder.mode)
      builder.set(`target`, `web`)
      builder.set(`experiments.futureDefaults`, true)
      // builder.addExtension(`ts`)
      // builder.addPlugin(OutputConfigPlugin)
      // builder.addResolveAlias(`~/lib`, `lib`)
      // builder.addResolveAlias(`~/src`, `src`)
      // builder.addResolveAlias(`~/etc`, `etc`)
      builder.addResolveAlias(`~`, `.`)
    })
    hooks.buildProduction.tap(name, () => {
      builder.set(`optimization.minimize`, false)
      builder.set(`output.clean`, true)
    })
    hooks.buildDevelopment.tap(name, () => {
      builder.set(`devtool`, `inline-source-map`)
    })
    hooks.finalizeOptions.tap(name, options => {
      if (!options.outputFolder.includes(`{{mode}}`)) {
        return options
      }
      const mode = options.env === `production` ? `production` : `development`
      return {
        ...options,
        outputFolder: options.outputFolder.replaceAll(`{{mode}}`, mode),
      }
    })
  }
}
