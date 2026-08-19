import {
  getHealth,
  getModules,
  getOverview,
} from '../controllers/systemController.js'

const routes = [
  { method: 'GET', pathname: '/', handler: getOverview },
  { method: 'GET', pathname: '/api/health', handler: getHealth },
  { method: 'GET', pathname: '/api/modules', handler: getModules },
]

export function findRoute(method, pathname) {
  return routes.find(
    (route) => route.method === method && route.pathname === pathname,
  )?.handler
}
