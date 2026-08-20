import { env } from '../config/env.js'

export function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', env.frontendOrigin)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
}
