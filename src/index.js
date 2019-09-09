const Hapi = require('@hapi/hapi')
const endpoints = require('./endpoints')
require('dotenv').config()

const server = new Hapi.Server({
  port: 7000,
  host: 'localhost',
  routes: {
    cors: true
  }
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

const serverUp = async () => {
  await server.register(endpoints)
  console.log('plugins registered')
  return server
}

async function start() {
  try {
    const server = await serverUp();
    await server.start();
  }
  catch (err) {
    console.log(err);
    process.exit(1);
  }

  console.log('Server running at:', server.info.uri);
};


process.on('unhandledRejection', (err) => {
  console.log(err)
  process.exit(1)
})

start()

exports.start = start