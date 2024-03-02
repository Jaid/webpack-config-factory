import type {PackageJson} from 'type-fest'

import {cloneDeep} from 'lodash-es'
import originalNormalizePackageData from 'normalize-package-data'

export const normalizePackageData = (pkg: any) => {
  const newPkg = cloneDeep(pkg)
  originalNormalizePackageData(newPkg)
  return newPkg as PackageJson
}
