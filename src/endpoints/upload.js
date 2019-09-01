const path = require('path')
import { PostalDatabase } from '../services/postal'
import * as _ from 'lodash'
const AWS = require('aws-sdk')

AWS.config.update({
  accessKeyId: process.env.ACCESSKEY,
  secretAccessKey: process.env.SECRETKEY,
  region: 'ap-southeast-1'
})

const db = new AWS.DynamoDB()

const transformPostals = (postal) => {
  if (parseInt(postal, 10) < 100000) return postal.toString().trim().padStart(6, '0')
  return postal.toString()
}

export const plugin = {
  name: 'upload handler',
  register: async (server, options) => {
    const flatFile = path.resolve(__dirname, '..', 'data' ,'postal_code_to_address.csv')
    const postalService = new PostalDatabase(db, flatFile, true)

    server.route({
      method: 'POST',
      path: '/upload',
      config: {
        payload: {
          maxBytes: Number.MAX_SAFE_INTEGER
        }
      },
      handler: async (request, h) => {
        if (!postalService.loaded) await postalService.init()
        const [head, ...tail] = request.payload.rows
        let promisedCoords = tail.reduce(
          (acc, row) => {
            if (row.length < 2) return acc // filters blank lines
            const [originPostal, destinationPostal] = [row[1], row[2]].map(x => transformPostals(x))
            acc[0].push(postalService.getXY(originPostal))
            acc[1].push(postalService.getXY(destinationPostal))
            return acc
          },
          [[], []]
        )

        // can technically Promise.all([origins, destinations]) but I don't feel like figuring out the map / zip syntax
        let origins = await Promise.all(
          promisedCoords[0].map(p => p.catch(() => null))
        )

        let destinations = await Promise.all(
          promisedCoords[1].map(p => p.catch(() => null))
        )
        const entriesWithPostals = _.zip(origins, destinations, tail)
          .map(r => {
            const row = _.flatten(r)
            if (!row || row.length < 4) return
            let [origin, destination] = [row[0], row[1]]
            if (!origin || !destination) return
            return [row[2], origin.x, origin.y, destination.x, destination.y, ...row.slice(3)]
          })
          .filter(x => x !== undefined)

        return h.response(entriesWithPostals)
      }
    })
  }
}