import fs from 'fs-extra'
import * as lodash from 'lodash-es'
import mapObject, {mapObjectSkip} from 'map-obj'
import yaml from 'yaml'

type StringifyReplacer = Parameters<typeof yaml["stringify"]>["1"]
type StringifyOptions = Parameters<typeof yaml["stringify"]>["2"]

const yamlSettings: StringifyOptions = {
  collectionStyle: `block`,
  indentSeq: false,
  lineWidth: 0,
  minContentWidth: 0,
  nullStr: `~`,
  singleQuote: true,
}
const replacer: StringifyReplacer = (key: string, value: unknown) => {
  const type = typeof value
  if (lodash.isFunction(value)) {
    return {}
  }
  if (type === `string`) {
    return value
  }
  if (type === `number`) {
    return value
  }
  if (type === `boolean`) {
    return value
  }
  if (type === `undefined`) {
    return value
  }
  if (value === null) {
    return value
  }
  if (lodash.isObjectLike(value)) {
    return value as unknown
  }
  if (Array.isArray(value)) {
    return value as unknown
  }
  if (value instanceof RegExp) {
    return value.source
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (value instanceof Set) {
    return value as unknown
  }
  if (value instanceof Map) {
    return value as unknown
  }
  console.log(`${type} ${value?.constructor?.name} <- ${key}`)
  return {}
}

export const toYaml = (input: unknown) => {
  return yaml.stringify(input, undefined, yamlSettings)
}

export const toCleanYaml = (input: unknown) => {
  return yaml.stringify(input, replacer, yamlSettings)
}

export const toYamlFile = async (input: unknown, file: string) => {
  await fs.outputFile(file, toYaml(input))
}

export const toCleanYamlFile = async (input: unknown, file: string) => {
  await fs.outputFile(file, toCleanYaml(input))
}
