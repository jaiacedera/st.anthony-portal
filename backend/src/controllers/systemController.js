import {
  getSystemHealth,
  getSystemModules,
  getSystemOverview,
} from '../services/systemService.js'
import { sendJson } from '../utils/http.js'

export function getOverview(_req, res) {
  sendJson(res, 200, getSystemOverview())
}

export function getHealth(_req, res) {
  sendJson(res, 200, getSystemHealth())
}

export function getModules(_req, res) {
  sendJson(res, 200, {
    items: getSystemModules(),
  })
}
