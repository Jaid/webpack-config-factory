import type {ConfigBuilder, ConfigBuilderPlugin, HookMap} from '../ConfigBuilder.js'

export class LibPlugin implements ConfigBuilderPlugin {
  apply(builder: ConfigBuilder, hooks: HookMap) {
    hooks.build.tapPromise(LibPlugin.name, async () => {
      builder.set(`experiments.outputModule`, true)
      builder.set(`output.library.type`, `module`)
    })
  }
}
