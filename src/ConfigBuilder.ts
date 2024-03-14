import type {Class, Get, Paths} from 'type-fest'
import type {Configuration, RuleSetCondition, RuleSetUse, WebpackPluginInstance} from 'webpack'

import * as lodash from 'lodash-es'
import {AsyncSeriesHook, AsyncSeriesWaterfallHook, SyncHook, SyncWaterfallHook} from 'tapable'
import * as path from 'zeug/path'

// @ts-expect-error
export type Key = Paths<Configuration>
export type Options = {
  contextFolder: string
  env: string
  outputFolder: string
  plugins?: Array<ConfigBuilderPlugin>
}
export type TesterInput = Array<string> | RegExp | string
export type PluginInput = Class<WebpackPluginInstance> | WebpackPluginInstance
type SplitChunksOptions = Exclude<NonNullable<NonNullable<Configuration["optimization"]>["splitChunks"]>, false>
type CacheGroups = SplitChunksOptions["cacheGroups"]
type ExtractValues<T> = T extends Record<string, infer U> ? U : never;
type CacheGroup = Exclude<ExtractValues<CacheGroups>, false | Function | RegExp | string | null>

export interface ConfigBuilderPlugin {
  apply: (configBuilder: ConfigBuilder, hooks: HookMap) => void
}
export const hooks = {
  afterBuild: new AsyncSeriesHook<[]>,
  afterConstructor: new SyncHook<[]>,
  beforeBuild: new AsyncSeriesHook<[]>,
  build: new AsyncSeriesHook<[]>,
  buildDevelopment: new AsyncSeriesHook<[]>,
  buildProduction: new AsyncSeriesHook<[]>,
  buildStatic: new AsyncSeriesHook<[]>,
  buildWatch: new AsyncSeriesHook<[]>,
  finalizeConfig: new AsyncSeriesWaterfallHook<[Configuration]>([`config`]),
  finalizeOptions: new SyncWaterfallHook<[Options]>([`options`]),
  setDefaultOptions: new SyncWaterfallHook<[Options]>([`options`]),
}
export type HookMap = typeof hooks
const defaultOptions: Options = {
  contextFolder: `.`,
  env: process.env.NODE_ENV ?? `development`,
  outputFolder: `out/package`,
}
const compileTester = (testerInput: TesterInput): RuleSetCondition => {
  if (testerInput instanceof RegExp) {
    return testerInput
  }
  if (Array.isArray(testerInput)) {
    const insertion = testerInput.join(`|`)
    return new RegExp(`\\.(${insertion})$`)
  }
  return new RegExp(`\\.${testerInput}$`)
}
export class ConfigBuilder {
  protected config: Configuration = {}
  contextFolder: string
  hooks = new Map<string, AsyncSeriesHook<unknown> | AsyncSeriesWaterfallHook<unknown> | SyncHook<unknown> | SyncWaterfallHook<unknown>>
  mode: "development" | "none" | "production"
  options: Options
  outputFolder: string
  #isProduction: boolean
  #isWatch = false
  constructor(options: Partial<Options> = {}) {
    for (const plugin of options?.plugins ?? []) {
      plugin.apply(this, hooks)
    }
    const finalDefaultOptions = hooks.setDefaultOptions.call(defaultOptions)
    const mergedOptions = {
      ...finalDefaultOptions,
      ...options,
    }
    this.options = hooks.finalizeOptions.call(mergedOptions)
    this.#isProduction = this.options.env === `production`
    this.mode = this.#isProduction ? `production` : `development`
    this.outputFolder = path.resolve(this.options.outputFolder)
    this.contextFolder = path.resolve(this.options.contextFolder)
    hooks.afterConstructor.call()
  }
  get isDevelopment() {
    return !this.#isProduction
  }
  get isProduction() {
    return this.#isProduction
  }
  get isStatic() {
    return !this.#isWatch
  }
  get isWatch() {
    return this.#isWatch
  }
  get webpackConfig() {
    return this.config
  }
  addCacheGroup(name: string, test: CacheGroup['test'], options: Omit<CacheGroup, | "test"> = {}) {
    this.setDefault(`optimization.splitChunks.chunks`, `async`)
    this.setDefault(`optimization.splitChunks.cacheGroups`, {})
    const splitChunksOptions = this.config.optimization!.splitChunks! as SplitChunksOptions
    splitChunksOptions.cacheGroups![name] = {
      test,
      ...options,
    }
  }
  addClassOrInstance(key: Key, plugin: PluginInput, options?: unknown) {
    let instance: WebpackPluginInstance
    if (lodash.isFunction(plugin)) {
      const Plugin = (plugin as unknown) as Class<WebpackPluginInstance>
      if (options !== undefined) {
        instance = new Plugin(options)
      } else {
        instance = new Plugin
      }
    } else {
      instance = plugin
    }
    this.append(key, instance)
  }
  addExtension(extension: string) {
    this.appendUnique(`resolve.extensions`, `.${extension}`)
  }
  addMinimizer(plugin: PluginInput, options?: unknown) {
    this.addClassOrInstance(`optimization.minimizer`, plugin, options)
    this.set(`optimization.minimize`, true)
  }
  addPlugin(plugin: PluginInput, options?: unknown) {
    this.addClassOrInstance(`plugins`, plugin, options)
  }
  addResolveAlias(virtualFolder: string, ...replacements: Array<string>) {
    this.setDefault(`resolve.alias`, {})
    const replacementsNormalized = replacements.map(replacement => this.fromContextFolder(replacement))
    this.config.resolve!.alias![virtualFolder] = replacementsNormalized
  }
  addResolvePlugin(plugin: PluginInput, options?: unknown) {
    this.addClassOrInstance(`resolve.plugins`, plugin, options)
  }
  addRule(testerInput: TesterInput, ...loaders: Array<RuleSetUse>) {
    this.append(`module.rules`, {
      test: compileTester(testerInput),
      use: loaders,
    })
  }
  addRuleCustom(testerInput: TesterInput, ruleConfig: Record<string, unknown>) {
    this.append(`module.rules`, {
      test: compileTester(testerInput),
      ...ruleConfig,
    })
  }
  append(key: Key, value: unknown) {
    const array = this.getEnsuredArray(key)
    array.push(value)
  }
  appendUnique(key: Key, value: unknown) {
    const array = this.getEnsuredArray(key)
    if (!array.includes(value)) {
      array.push(value)
    }
  }
  async build() {
    await hooks.beforeBuild.promise()
    if (this.isDevelopment) {
      await hooks.buildDevelopment.promise()
    } else {
      await hooks.buildProduction.promise()
    }
    if (this.isWatch) {
      await hooks.buildWatch.promise()
    } else {
      await hooks.buildStatic.promise()
    }
    await hooks.build.promise()
    this.setDefault(`mode`, this.mode)
    this.setDefault(`target`, `web`)
    this.setDefault(`output.path`, this.outputFolder)
    this.setDefault(`context`, this.contextFolder)
    await hooks.afterBuild.promise()
    const config = hooks.finalizeConfig.promise(this.config)
    return config
  }
  fromContextFolder(...pathSegments: Array<string>) {
    return path.join(this.contextFolder, ...pathSegments)
  }
  fromOutputFolder(...pathSegments: Array<string>) {
    return path.join(this.outputFolder, ...pathSegments)
  }
  get<T extends Key>(key: T): Get<Configuration, T> {
    return lodash.get(this.config, key) as Get<Configuration, T>
  }
  getEnsuredArray(key: Key) {
    const array = this.get(key) as Array<unknown> | undefined
    if (Array.isArray(array)) {
      return array
    }
    const value = []
    this.set(key, value)
    return value
  }
  has(key: Key) {
    return lodash.has(this.config, key)
  }
  prepend(key: Key, value: unknown) {
    const array = this.getEnsuredArray(key)
    array.unshift(value)
  }
  prependUnique(key: Key, value: unknown) {
    const array = this.getEnsuredArray(key)
    if (!array.includes(value)) {
      array.unshift(value)
    }
  }
  set<T extends Key>(key: T, value: Get<Configuration, T>) {
    lodash.set(this.config, key, value)
  }
  setDefault<T extends Key>(key: T, value: Get<Configuration, T>) {
    if (!this.has(key)) {
      this.set(key, value)
    }
  }
  setExtensionAlias(extension: string, ...extensions: Array<string>) {
    this.setDefault(`resolve.extensionAlias`, {})
    const normalizedExtension = `.${extension}`
    const normalizedExtensions = extensions.map(extensionsEntry => `.${extensionsEntry}`)
    normalizedExtensions.push(normalizedExtension)
    this.config.resolve!.extensionAlias![normalizedExtension] = normalizedExtensions
  }
}
