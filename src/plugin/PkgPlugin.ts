import type {ConfigBuilder, ConfigBuilderPlugin, HookMap} from '../ConfigBuilder.js'
import type {PackageJson} from 'type-fest'

import * as lodash from 'lodash-es'
import readFileJson from 'read-file-json'

import normalizePackageData from '~/lib/normalizePackageData.js'

export type Options = {
  pkg: PackageJson | string
}

const name = `PkgPlugin`
export class PkgPlugin implements ConfigBuilderPlugin {
  protected options: Options
  protected pkg: PackageJson | undefined
  apply(builder: ConfigBuilder, hooks: HookMap) {
    hooks.beforeBuild.tapPromise(name, async () => {
      if (lodash.isString(this.options.pkg)) {
        const pkgFile = builder.fromContextFolder(this.options.pkg)
        const pkg = <PackageJson> await readFileJson.default(pkgFile)
        this.pkg = normalizePackageData(pkg)
      } else {
        this.pkg = normalizePackageData(this.options.pkg)
      }
    })
  }
  contructor(options: Partial<Options>) {
    this.options = {
      pkg: `package.json`,
      ...options,
    }
  }
}
