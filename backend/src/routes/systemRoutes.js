import { postInstructorLogin } from '../controllers/authController.js'
import {
  getDatabaseStatus,
  postDatabaseInitialization,
} from '../controllers/databaseController.js'
import { getInstructorDashboardData } from '../controllers/instructorDashboardController.js'
import {
  getHealth,
  getModules,
  getOverview,
} from '../controllers/systemController.js'

const routes = [
  { method: 'GET', pathname: '/', handler: getOverview },
  { method: 'GET', pathname: '/api/health', handler: getHealth },
  { method: 'GET', pathname: '/api/modules', handler: getModules },
  {
    method: 'POST',
    pathname: '/api/auth/instructor/login',
    handler: postInstructorLogin,
  },
  {
    method: 'GET',
    pathname: '/api/instructor/dashboard',
    handler: getInstructorDashboardData,
  },
  {
    method: 'GET',
    pathname: '/api/database/google-sheets/status',
    handler: getDatabaseStatus,
  },
  {
    method: 'POST',
    pathname: '/api/database/google-sheets/init',
    handler: postDatabaseInitialization,
  },
]

export function findRoute(method, pathname) {
  return routes.find(
    (route) => route.method === method && route.pathname === pathname,
  )?.handler
}
