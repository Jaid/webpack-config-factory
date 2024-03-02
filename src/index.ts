import {ConfigBuilder} from './ConfigBuilder.js'

export const buildConfig = async () => {
  const configBuilder = new ConfigBuilder
  const webpackConfig = await configBuilder.build()
  return webpackConfig
}

export default buildConfig
