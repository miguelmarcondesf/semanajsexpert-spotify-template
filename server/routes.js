import config from "./config.js"
import { Controller } from "./controller.js"
import { logger } from "./util.js"

const { 
  location, 
  pages: { homeHTML, controllerHTML },
  constants : { CONTENT_TYPE }
 } = config
const controller = new Controller()

async function routes(request, response) {
  const { method, url } = request

  if(method === 'GET' && url === '/') {
    response.writeHead(302, {
      'Location': location.home
    })

    return response.end()
  }

  if(method === 'GET' && url === '/home') {
    const { 
      stream, type
    } = await controller.getFilStream(homeHTML)

    response.writeHead(200, {
      'Content-Type': 'text/html'
    })

    return stream.pipe(response)
  }

  
  if(method === 'GET' && url === '/controller') {
    const { 
      stream, type
    } = await controller.getFilStream(controllerHTML)

    response.writeHead(200, {
      'Content-Type': 'text/html'
    })

    return stream.pipe(response)
  }

  if(method === 'GET') {
    const {  
      stream,
      type
    } = await controller.getFilStream(url)
    
    const contentType = CONTENT_TYPE[type]

    if(contentType) {
      response.writeHead(200, {
        'Content-Type': contentType
      })

    }
    return stream.pipe(response)
  }

  response.writeHead(404)
  return response.end()
}

function handleError(error, response) {
  if(error.message.includes('ENOENT')) {
    logger.warn('asset not found')
    response.writeHead(404)
    return response.end()
  }

  logger.error(`caught error on api ${error.stack}`)
  response.writeHead(500)
  return response.end
}

export function handler(request, response) {
  return routes(request, response)
  .catch(error => handleError(error, response))
}
