import type {ConfigBuilder, ConfigBuilderPlugin, HookMap} from '../ConfigBuilder.js'
import type {Options as TsLoaderOptions} from 'ts-loader'
import type {PackageJson} from 'type-fest'

import TypescriptDeclarationPlugin from 'typescript-declaration-webpack-plugin'

import {OutputConfigPlugin} from '../OutputConfigPlugin.js'

export type Options = {
  pkg?: PackageJson | string
}

const tempTypesFolder = `.types`
const getTsLoaderOptions = (builder: ConfigBuilder) => {
  const tsLoaderOptions: Partial<TsLoaderOptions> = {
    onlyCompileBundledFiles: true,
  }
  if (builder.isDevelopment) {
    tsLoaderOptions.transpileOnly = true
    tsLoaderOptions.compilerOptions = {
      inlineSourceMap: true,
      inlineSources: true,
    }
  } else {
    tsLoaderOptions.compilerOptions = {
      declaration: true,
      declarationDir: builder.fromOutputFolder(tempTypesFolder),
    }
  }
  return tsLoaderOptions
}
const name = `TypescriptPlugin`
export class TypescriptPlugin implements ConfigBuilderPlugin {
  protected options: Options
  protected pkg: PackageJson | undefined
  apply(builder: ConfigBuilder, hooks: HookMap) {
    hooks.build.tapPromise(name, async () => {
      builder.addExtension(`ts`)
      builder.addPlugin(OutputConfigPlugin)
      builder.addRuleCustom(`js`, {
        loader: `source-map-loader`,
        enforce: `pre`,
      })
      builder.addRule(`ts`, {
        loader: `ts-loader`,
        options: getTsLoaderOptions(builder),
      })
      builder.setExtensionAlias(`js`, `ts`)
    })
    hooks.buildProduction.tap(name, () => {
      builder.addPlugin(TypescriptDeclarationPlugin, {
        out: builder.fromOutputFolder(tempTypesFolder),
      })
    })
  }
  contructor(options: Partial<Options>) {
    this.options = options
  }
}
