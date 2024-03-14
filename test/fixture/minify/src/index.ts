import * as lodash from 'lodash-es'

const getMessage = (name: string = `you`) => {
  const template = `Hello, <%= name %>!`
  const message = name ? lodash.template(template)({name}) : `Hello!`
  return message
}
const message = getMessage(process.env.name ?? `world`)
console.log(message)
export default message
