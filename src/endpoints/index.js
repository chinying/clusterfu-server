const routes = [
  import('./upload'),
  import('./reverseGeocode')
]

export const plugin = {
  name: 'routes',
  register: async (server, options) => {
    await server.register(await Promise.all(routes))
  }
}
