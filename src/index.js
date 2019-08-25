const Hapi = require('@hapi/hapi')

const server = new Hapi.Server({
  port: 7000,
  host: 'localhost'
})

server.route({
  method: 'GET',
  path:'/',
  handler: (request, h) => {
    return 'Hello World!'
  }
})

exports.init = async () => {
  await server.initialize()
  return server
}

const start = async () => {
  await server.start();
  console.log(`Server running at: ${server.info.uri}`)
  return server
}

process.on('unhandledRejection', (err) => {
  console.log(err)
  process.exit(1)
})

start()

exports.start = start