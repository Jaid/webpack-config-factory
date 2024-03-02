import console from 'node:console'

import fs from 'fs-extra'
import yaml, {Document, isPair, isScalar} from 'yaml'

type StringifyReplacer = Parameters<typeof yaml["stringify"]>["1"]
type StringifyOptions = Parameters<typeof yaml["stringify"]>["2"]

export type Visitor = Parameters<typeof yaml["visit"]>[1]

export const yamlStringifySettings: StringifyOptions = {
  indentSeq: false,
  lineWidth: 0,
  minContentWidth: 0,
  // nullStr: `~`,
  singleQuote: true,
}
export const replacer: StringifyReplacer = (key: string, value: unknown) => {
  const type = typeof value
  if (type === `function`) {
    return
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
  if (Array.isArray(value)) {
    return value as unknown
  }
  if (type === `object`) {
    return value as unknown
  }
  return
}
export const skipUnderscoreReplacer: StringifyReplacer = (key: string, value: unknown) => {
  if (typeof key === `string` && key.startsWith(`_`)) {
    return
  }
  return replacer(key, value)
}

export const toYaml = (input: unknown) => {
  return yaml.stringify(input, undefined, yamlStringifySettings)
}

export const toYamlFile = async (input: unknown, file: string) => {
  await fs.outputFile(file, toYaml(input))
}

export const toCleanYaml = (input: unknown) => {
  const document = new Document(input)
  const removeFunctionsVisitor: Visitor = {
    Scalar: (key, node, path) => {
      const value = node.value
      if (typeof value === `function`) {
        const newNode = document.createNode({}, {flow: true})
        newNode.comment = ` ${value.toString()}`
        return newNode
      }
    },
  }
  const skipUnderscoreVisitor: Visitor = {
    Pair: (key, node, path) => {
      // @ts-expect-error
      const fieldName = node.key?.value as unknown
      if (typeof fieldName === `string` && fieldName.startsWith(`_`)) {
        return yaml.visit.REMOVE
      }
    },
  }
  yaml.visit(document, removeFunctionsVisitor)
  yaml.visit(document, skipUnderscoreVisitor)
  return document.toString({
    ...yamlStringifySettings,
  })
}

export const toCleanYamlFile = async (input: unknown, file: string) => {
  await fs.outputFile(file, toCleanYaml(input))
}
