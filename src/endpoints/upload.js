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
      handler: async (request, h) => {
        if (!postalService.loaded) await postalService.init()
        const [head, ...tail] = request.payload.rows
        let promisedCoords = tail.map(async row => {
          const [originPostal, destinationPostal] = [row[1], row[2]].map(x => transformPostals(x))
          return {origin: postalService.getXY(originPostal), destination: postalService.getXY(destinationPostal)}
        })

        let xy = await Promise.all(
          promisedCoords.map(p => p.catch(() => null))
        )

        const entriesWithPostals = _.zip(xy, tail)
          .map(r => {
            const row = _.flatten(r)
            return [row[1], row[0].origin.x, row[0].origin.y, row[0].destination.x, row[0].destination.y, ...row.slice(2)]
          })

        return h.response(entriesWithPostals)
      }
    })
  }
}