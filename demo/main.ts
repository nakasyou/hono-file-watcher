import { Hono } from 'hono'
import { html } from 'hono/html'
import { fileWatcher } from '../mod.ts'

const app = new Hono()

app.use(fileWatcher({ targetDirs: ['./demo'] }))
app.get('/', (c) => c.html(html`<h1>Hello World!</h1>`))

Deno.serve(app.fetch)
