import { env } from '../config/env.js'
import { systemModules } from '../models/systemModel.js'

export function getSystemModules() {
  return systemModules
}

export function getSystemHealth() {
  return {
    status: 'ok',
    service: 'st-anthony-portal-backend',
    timestamp: new Date().toISOString(),
    frontendOrigin: env.frontendOrigin,
    modules: getSystemModules(),
  }
}

export function getSystemOverview() {
  return {
    name: 'St. Anthony Portal API',
    routes: ['GET /api/health', 'GET /api/modules'],
  }
}
