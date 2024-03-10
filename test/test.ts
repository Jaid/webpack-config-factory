import {test} from 'node:test'

import {runTest} from './lib/runTest.js'

test(`minimal-development`, async testContext => runTest(testContext))
test(`minimal-production`, async testContext => runTest(testContext))
test(`basic-development`, async testContext => runTest(testContext))
test(`basic-production`, async testContext => runTest(testContext))
