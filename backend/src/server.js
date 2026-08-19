import { createApp } from './app.js'
import { env } from './config/env.js'

const server = createApp()

server.listen(env.port, () => {
  console.log(
    `Backend listening on http://localhost:${env.port} with origin ${env.frontendOrigin}`,
  )
})
