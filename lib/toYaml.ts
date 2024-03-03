import type {ScalarTag} from 'yaml'

import console from 'node:console'

import prettier from '@prettier/sync'
import is from '@sindresorhus/is'
import fs from 'fs-extra'
import yaml, {Document, isPair, isScalar, Pair, Scalar, YAMLMap} from 'yaml'
import {createNode as newNode} from 'yaml/util'

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
type ScalarOutputTag = Omit<ScalarTag, "resolve" | "tag">

const formatCode = (code: string) => {
  const codeCompressed = code.replaceAll(/^\s*[\n\r]/gm, ``)
  const codeFormatted = prettier.format(codeCompressed, {
    parser: `typescript`,
    arrowParens: `avoid`,
    bracketSameLine: true,
    bracketSpacing: false,
    embeddedLanguageFormatting: `off`,
    jsxSingleQuote: true,
    printWidth: 80,
    quoteProps: `as-needed`,
    requirePragma: false,
    semi: false,
    singleQuote: true,
    tabWidth: 2,
    trailingComma: `none`,
  })
  const codeTrimmed = codeFormatted.trim()
  return codeTrimmed
}

export const toCleanYaml = (input: unknown) => {
  const regexOutputTag: ScalarOutputTag = {
    identify: value => value instanceof RegExp,
    createNode(schema, value: RegExp, ctx) {
      const patternSource = value.toString()
      const node = new Scalar(patternSource)
      node.comment = ` RegExp`
      return node
    },
  }
  const bigIntOutputTag: ScalarOutputTag = {
    identify: value => typeof value === `bigint`,
    createNode(schema, value: bigint, ctx) {
      const node = new Scalar(value)
      node.comment = ` BigInt`
      return node
    },
  }
  const functionOutputTag: ScalarOutputTag = {
    identify: value => typeof value === `function`,
    createNode(schema, functionValue: Function, ctx) {
      const node = new YAMLMap
      let functionSource = functionValue.toString()
      let formattingWorked = false
      try {
        functionSource = formatCode(functionSource)
        formattingWorked = true
      } catch (error) {
        // console.error(`Error formatting function source code:`, error)
      }
      const comment = formattingWorked ? `[Formatted with Prettier]\n${functionSource}` : functionSource
      const commentIndented = comment.replaceAll(/^/gm, ` `)
      if (functionValue.name !== undefined && functionValue.name !== ``) {
        const nameScalar = new Scalar(functionValue.name)
        nameScalar.comment = commentIndented
        node.set(`name`, nameScalar)
      } else {
        node.comment = commentIndented
      }
      for (const [key, value] of Object.entries(functionValue)) {
        node.set(key, value)
      }
      return node
    },
  }
  // const classInstanceOutputTag: ScalarOutputTag = {
  //   identify: value => {
  //     if (!is.object(value)) {
  //       return false
  //     }
  //     const className = value.constructor.name
  //     if (!className) {
  //       return false
  //     }
  //     const skippedNames = [
  //       `Object`,
  //       `Function`,
  //       `Array`,
  //       `Map`,
  //       `Set`,
  //       `Date`,
  //       `RegExp`,
  //     ]
  //     if (skippedNames.includes(className)) {
  //       return false
  //     }
  //     return true
  //   },
  //   createNode(schema, classInstanceValue: object, ctx) {
  //     const node = new YAMLMap
  //     const className = classInstanceValue.constructor.name
  //     node.comment = ` ${className}`
  //     for (const [key, value] of Object.entries(classInstanceValue)) {
  //       node.set(key, value)
  //     }
  //     return node
  //   },
  // }
  const document = new Document(input, {
    anchorPrefix: `anchor`,
    keepSourceTokens: true,
    logLevel: `debug`,
    customTags: tags => {
      return [
        bigIntOutputTag,
        regexOutputTag,
        functionOutputTag,
        // classInstanceOutputTag,
        ...tags,
      ] as Array<ScalarTag>
    },
  })
  // const removeFunctionsVisitor: Visitor = {
  //   Scalar: (key, node, path) => {
  //     const value = node.value
  //     if (typeof value === `function`) {
  //       const newNode = document.createNode({}, {flow: true})
  //       newNode.comment = ` function:\n ${value.toString()}`
  //       return newNode
  //     }
  //   },
  // }
  const skipUnderscoreVisitor: Visitor = {
    Pair: (key, node, path) => {
      // @ts-expect-error
      const fieldName = node.key?.value as unknown
      if (typeof fieldName === `string` && fieldName.startsWith(`_`)) {
        return yaml.visit.REMOVE
      }
    },
  }
  const loggerVisitor: Visitor = {
    Node: (key, node, path) => {
      console.dir({
        key,
        node,
        path,
      })
    },
  }
  // const addCommentsToClassInstancesVisitor: Visitor = {
  //   Pair: (key, node, path) => {
  //     if (isPair(node) && isScalar(node.key) && isScalar(node.value)) {
  //       const key = node.key.value
  //       const value = node.value.value
  //       if (typeof value === `object` && value !== null) {
  //         const className = value.constructor.name
  //         const newNode = document.createNode({}, {flow: true})
  //         newNode.comment = ` ${className}`
  //         return newNode
  //       }
  //     }
  //   },
  // }
  // yaml.visit(document, loggerVisitor)
  // yaml.visit(document, removeFunctionsVisitor)
  yaml.visit(document, skipUnderscoreVisitor)
  // yaml.visit(document, addCommentsToClassInstancesVisitor)
  return document.toString({
    ...yamlStringifySettings,
  })
}

export const toCleanYamlFile = async (input: unknown, file: string) => {
  await fs.outputFile(file, toCleanYaml(input))
}
