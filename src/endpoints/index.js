exports.plugin = {
  name: 'routes',
  register: (server, options) => {
    server.register([
      require('./upload')
    ])
  }
}