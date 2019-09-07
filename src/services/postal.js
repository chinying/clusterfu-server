const fs = require('fs')
const csv = require('csv-parser')
import axios from 'axios'

class PostalDatabase {
  constructor (ddbConstuctor, postalFlatFilePath, fallbackOnOnemap = true) {
    this.blacklist = new Set()
    this.cache = new Map()
    this.loaded = false
    this.newPostals = []
    this.fallbackOnOnemap = fallbackOnOnemap
    this.db = ddbConstuctor
    this.postalFlatFilePath = postalFlatFilePath
  }

  init () {
    let self = this
    return new Promise(function (resolve, reject) {
      fs.createReadStream(self.postalFlatFilePath)
        .pipe(csv())
        .on('data', function (data) {
          if (!(self.cache.has(data.postal_code))) {
            self.cache.set(data.postal_code, {x: data.x, y: data.y})
          }
        })
        .on('end', function () {
          this.loaded = true
          resolve(true)
        })
        .on('error', function (err) {
          reject(err)
        })
    })
  }

  /**
   * has to be async or cache will not return promise
   * @param {Number} postal
   * @returns {Promise<x: string, y: string> | undefined}
   */
  async getXY(postal) {
    try {
      if (this.blacklist.has(postal)) throw new Error('unable to determine postal')
      if (this.cache.has(postal)) return this.cache.get(postal)
      const dbResult = await this.queryDDB(postal)
      if (dbResult.Count > 0) {
        let retrievedItem = dbResult.Items[0]
        this.cache.set(postal, {x: retrievedItem.x.N, y: retrievedItem.y.N})
        return {x: retrievedItem.x.N, y: retrievedItem.y.N}
      } else if (this.fallbackOnOnemap) {
        return this.queryOneMap(postal)
      }
      throw new Error('unable to determine postal')
    } catch (err) {
      console.log(`cannot get postal ${postal}`)
      throw err
    }
  }

  queryDDB(postal) {
    let params = {
      ProjectionExpression: 'x, y',
      TableName: process.env.DYNAMODB_TABLENAME,
      ExpressionAttributeValues: {
        ':v1': {
          N: postal
        }
      },
      KeyConditionExpression: 'postal = :v1'
    }
    return this.db.query(params).promise()
  }

  async queryOneMap(postal) {
    try {
      const response = await axios.get(`https://developers.onemap.sg/commonapi/search?searchVal=${postal}&returnGeom=Y&getAddrDetails=Y&pageNum=1`)
      if (response.data !== undefined) {
        let data = response.data
        if (data['results'].length > 0 && data['results'][0]['POSTAL'] === postal.toString()) {
          let x = data['results'][0]['X']
          let y = data['results'][0]['Y']
          this.cache.set(postal, {x, y})

          // TODO: batch write items (push to some array) to DB, maybe consider some form of queue
          let item = {
            'postal': {'N': postal},
            'timestamp': {'S': (new Date() / 1000).toString()},
            'x': {'N': x},
            'y': {'N': y},
            'address': {'S': data['results'][0]['ADDRESS'] || ' '}
          }

          this.newPostals.push(this.db.putItem({
            'Item': item,
            'TableName': process.env.POSTAL_TABLE_NAME
          }).promise())

          return {x, y}
        }
      }
      return undefined
    } catch (err) { throw err }
  }
}

export { PostalDatabase }