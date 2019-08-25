export const plugin = {
  name: 'routes',
  register: async (server, options) => {
    server.register([
      await import('./upload')
    ])
  }
}