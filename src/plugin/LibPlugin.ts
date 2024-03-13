import type {ConfigBuilder, ConfigBuilderPlugin, HookMap} from '../ConfigBuilder.js'

export class LibPlugin implements ConfigBuilderPlugin {
  apply(builder: ConfigBuilder, hooks: HookMap) {
    hooks.build.tapPromise(LibPlugin.name, async () => {
      builder.set(`experiments.outputModule`, true)
      builder.set(`output.library.type`, `module`)
      builder.set(`output.filename`, `[name].js`)
      builder.set(`output.chunkFilename`, `[name].js`)
      builder.set(`output.chunkFormat`, `module`)
    })
  }
}
