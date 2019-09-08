const axios = require('axios')

const checkExpiry = (expiry) => {
  // ensures that token is not expired
  return expiry * 1e3 > Date.now()
}

let tokenCache = null
let tokenExpiry = null

async function authenticate () {
  if (tokenCache !== null && tokenExpiry != null && !checkExpiry(tokenExpiry)) return tokenCache

  const email = process.env.ONEMAP_USERNAME
  const password = process.env.ONEMAP_PASSWORD

  try {
    const response = await axios.post('https://developers.onemap.sg/privateapi/auth/post/getToken', {
      email, password
    })

    let [token, expiry] = [response.data.access_token, response.data.expiry_timestamp]
    // presumably write to somewhere, check expiry and use that token instead
    tokenCache = token
    tokenExpiry = expiry
    return token
  } catch (err) { console.error(err) }
}

export async function reverseGeocodeLatLng (latitude, longitude) {
  try {
    let token = await authenticate()
    const response = await axios.get(`https://developers.onemap.sg/privateapi/commonsvc/revgeocode?location=${latitude},${longitude}&token=${token}`)
    const geocodeInfo = response.data.GeocodeInfo
    if (geocodeInfo.length < 1) return (`${latitude}, ${longitude}`)
    if (geocodeInfo[0]['BUILDINGNAME'] !== undefined) return geocodeInfo[0]['BUILDINGNAME']
    else if (geocodeInfo[0]['ROAD'] !== undefined) return geocodeInfo[0]['ROAD']

    return `${latitude}, ${longitude}`
  } catch (err) { console.error(err) }
}

export async function reverseGeocodeXY (x, y) {
  try {
    let token = await authenticate()
    const response = await axios.get(`https://developers.onemap.sg/privateapi/commonsvc/revgeocodexy?location=${x},${y}&token=${token}`)
    const geocodeInfo = response.data.GeocodeInfo
    if (geocodeInfo.length < 1) return (`${x}, ${y}`) // consider if length > 0 {...} else return x, y
    if (geocodeInfo[0]['BUILDINGNAME'] !== undefined) return geocodeInfo[0]['BUILDINGNAME']
    else if (geocodeInfo[0]['ROAD'] !== undefined) return geocodeInfo[0]['ROAD']
    return `${x}, ${y}`
  } catch (err) { console.error(err) }
}