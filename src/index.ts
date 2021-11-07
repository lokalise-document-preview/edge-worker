import { routeRequest } from './router'

addEventListener('fetch', (event) => {
  event.respondWith(routeRequest(event.request))
})
