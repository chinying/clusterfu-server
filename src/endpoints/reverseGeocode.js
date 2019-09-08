import { reverseGeocodeXY, reverseGeocodeLatLng } from '../services/geocode'

export const plugin = {
  name: 'reverse geocode handler',
  register: async (server, options) => {
    server.route({
      method: 'GET',
      path: '/reverse_geocode',
      handler: async (request, h) => {
        try {
          console.log(request.query)

          const queryParams = request.query
          const [lat, lng] = [queryParams.lat, queryParams.lng]
          const [x, y] = [queryParams.x, queryParams.y]

          let name = null
          if (lat !== undefined && lng !== undefined) {
            name = await reverseGeocodeLatLng(lat, lng)
          } else if (x !== undefined && y !== undefined) {
            name = await reverseGeocodeXY(x, y)
          } else {
            throw new Error('invalid req')
          }

          return h.response(name)
        } catch (err) {
          console.error(err)
          Boom.badImplementation('server died')
        }
      }
    })
  }
}