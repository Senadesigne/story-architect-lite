import { handle } from 'hono/vercel'
import app from '../server/src/api'

export const config = {
    runtime: 'nodejs'
}

export default handle(app)
