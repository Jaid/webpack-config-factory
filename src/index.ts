import {ConfigBuilder} from './ConfigBuilder.js'
import {LibConfigBuilder} from './LibConfigBuilder.js'

const buildConfig = async () => {
  const configBuilder = new ConfigBuilder
  const webpackConfig = await configBuilder.build()
  console.dir(configBuilder)
  return webpackConfig
}

export default buildConfig
export {buildConfig}
