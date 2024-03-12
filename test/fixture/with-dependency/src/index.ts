import * as lodash from 'lodash-es'

const name = process.env.name ?? `world`
const template = `Hello, <%= name %>!`
const message = name ? lodash.template(template)({name}) : `Hello!`
console.log(message)
export default message
