import type {ConfigBuilder, ConfigBuilderPlugin, HookMap} from '../ConfigBuilder.js'
import type {PackageJson} from 'type-fest'

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
      builder.set(`experiments.topLevelAwait`, true)
      builder.set(`experiments.futureDefaults`, true)
      builder.set(`experiments.outputModule`, true)
      builder.set(`output.module`, true)
      builder.set(`output.chunkFormat`, `module`)
      builder.set(`output.chunkLoading`, `import`)
      builder.set(`output.hashDigest`, `base64url`)
      builder.set(`output.hashDigestLength`, 8)
      builder.set(`output.filename`, `[name].js`)
      builder.set(`output.chunkFilename`, `[name].js`)
      builder.addResolveAlias(`~`, `.`)
      builder.set(`stats.all`, false)
      builder.set(`stats.assets`, true)
      builder.set(`stats.assetsSort`, `!size`)
      builder.set(`stats.excludeAssets`, /.(map|d.ts)$/)
      builder.set(`stats.colors`, true)
      builder.set(`stats.warnings`, true)
      builder.set(`stats.errors`, true)
      builder.set(`stats.errorDetails`, true)
      builder.set(`module.parser.javascript.importMeta`, true)
      builder.set(`module.parser.javascript.importMetaContext`, true)
      builder.set(`optimization.realContentHash`, true)
      builder.set(`optimization.runtimeChunk.name`, `runtime`)
      builder.addCacheGroup(`defaultVendors`, /[/\\]node_modules[/\\]/, {
        chunks: `all`,
        name: `vendor`,
      })
    })
    hooks.buildProduction.tap(name, () => {
      builder.setDefault(`optimization.minimize`, false)
      builder.set(`output.clean`, true)
      builder.set(`output.assetModuleFilename`, `[contenthash][ext][query]`)
      builder.set(`optimization.chunkIds`, `deterministic`)
      builder.set(`optimization.concatenateModules`, true)
      builder.set(`optimization.mangleExports`, `size`)
      builder.set(`optimization.removeAvailableModules`, true)
    })
    hooks.buildDevelopment.tap(name, () => {
      builder.set(`devtool`, `inline-source-map`)
      builder.set(`output.assetModuleFilename`, `assets/[contenthash]_[file]`)
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
