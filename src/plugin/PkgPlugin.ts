import type {ConfigBuilder, ConfigBuilderPlugin, HookMap} from '../ConfigBuilder.js'
import type {PackageJson} from 'type-fest'

import * as lodash from 'lodash-es'
import readFileJson from 'read-file-json'

import {normalizePackageData} from '~/lib/normalizePackageData.js'
import {EmitFilePlugin} from '~/src/webpackPlugin/EmitFilePlugin.js'

export type Options = {
  pkg: PackageJson | string
}

const name = `PkgPlugin`
export class PkgPlugin implements ConfigBuilderPlugin {
  options: Options
  pkg: PackageJson | undefined
  constructor(options: Partial<Options> = {}) {
    this.options = {
      pkg: `package.json`,
      ...options,
    }
  }
  apply(builder: ConfigBuilder, hooks: HookMap) {
    const that = this
    hooks.beforeBuild.tapPromise(name, async () => {
      if (lodash.isString(that.options.pkg)) {
        const pkgFile = builder.fromContextFolder(that.options.pkg)
        const pkg = await readFileJson.default(pkgFile) as PackageJson
        that.pkg = normalizePackageData(pkg)
      } else {
        that.pkg = normalizePackageData(that.options.pkg)
      }
    })
    hooks.buildDevelopment.tap(name, () => {
      const reducedPkg = lodash.pick(that.pkg, [
        `name`,
        `version`,
        `type`,
      ]) as PackageJson
      builder.addPlugin(this.#makeEmitter(reducedPkg))
    })
    hooks.buildProduction.tap(name, () => {
      const reducedPkg = lodash.pick(that.pkg, [
        `name`,
        `version`,
        `description`,
        `keywords`,
        `author`,
        `license`,
        `bugs`,
        `homepage`,
        `repository`,
        `type`,
        `dependencies`,
        `peerDependencies`,
        `optionalDependencies`,
        `peerDependenciesMeta`,
      ]) as PackageJson
      builder.addPlugin(this.#makeEmitter(reducedPkg))
    })
  }
  #makeEmitter(pkg: PackageJson) {
    const json = JSON.stringify(pkg)
    return new EmitFilePlugin(`package.json`, json)
  }
}
