import type {describe, it} from 'node:test'

export type TestFunction = NonNullable<Parameters<typeof it>[0]>
export type TestContext = Parameters<TestFunction>[0]
export type SuiteFunction = NonNullable<Parameters<typeof describe>[0]>
export type SuiteContext = Parameters<SuiteFunction>[0]
