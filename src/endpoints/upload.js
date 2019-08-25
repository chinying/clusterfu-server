exports.plugin = {
  name: 'upload handler',
  register: (server, options) => {
    server.route({
      method: 'POST',
      path: '/upload',
      handler: async (request, h) => {
        console.log(request.payload)
        return 'upload hit; tbd'
      }
    })
  }
}