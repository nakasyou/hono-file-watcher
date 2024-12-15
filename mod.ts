/**
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { fileWatcher } from '@ns/hono-file-watcher'
 *
 * const app = new Hono()
 *
 * app.use(fileWatcher({
 *   targetDirs: ['.']
 * }))
 *
 * app.get('/', c => c.html('<h1>Hello World</h1>'))
 *
 * export default app
 * ```
 * @module
 */

import { watch } from 'node:fs/promises'
import type { MiddlewareHandler } from 'hono'

/**
 * Watch options
 */
export interface FileWatchOptions {
  /**
   * Directory paths watcher watches. A watcher detects file change recursively.
   */
  targetDirs: string[]

  /**
   * You can ignore file change by this option.
   * @param changedPath A path showing changed file.
   * @returns A boolean. If you want to reload a page by a file path, return `true`. If you want to ignore, return `false`.
   */
  check?: (changedPath?: string) => boolean | Promise<boolean>

  /**
   * A boolean showing whether you want to enable file watching.
   * @example
   * ```ts
   * app.use(fileWatcher({
   *   // ...
   *   enabled: process.env.NODE_ENV === 'development'
   * }))
   * ```
   * @default true
   */
  enabled?: boolean
}

const FILE_WATCHER_HEADER = 'X-HONO-FILE-WATCHER'

/**
 * File watcher for Hono.
 * @param options Options
 */
export function fileWatcher(options: FileWatchOptions): MiddlewareHandler {
  if (options.enabled === false) {
    return (_c, next) => next()
  }

  const check = options.check ?? (() => true)

  const reloadTarget = new EventTarget()

  for (const targetPath of options.targetDirs) {
    ;(async () => {
      for await (const evt of watch(targetPath, { recursive: true })) {
        if (await check(evt.filename ?? undefined)) {
          reloadTarget.dispatchEvent(new Event('reload'))
        }
      }
    })()
  }

  return async function fileWatcher(c, next) {
    if (c.req.header(FILE_WATCHER_HEADER) === 'to-reload') {
      c.header(FILE_WATCHER_HEADER, 'true')
      return new Promise((resolve) => {
        const listener = () => {
          reloadTarget.removeEventListener('reload', listener)
          resolve(c.text('reload'))
        }
        reloadTarget.addEventListener('reload', listener)
      })
    }
    if (c.req.header(FILE_WATCHER_HEADER) === 'state') {
      c.header(FILE_WATCHER_HEADER, 'true')
      return c.text('ok')
    }

    await next()
    if (c.res.headers.get('Content-Type')?.startsWith('text/html')) {
      const originalResReader = c.res.body?.getReader()
      c.res = c.body(
        new ReadableStream<Uint8Array>({
          async start(controller) {
            if (originalResReader) {
              while (true) {
                const { done, value } = await originalResReader.read()
                if (value) {
                  controller.enqueue(value)
                }
                if (done) {
                  break
                }
              }
            }
            controller.enqueue(new TextEncoder().encode(`<script>
            ;(async () => {
              const getState = (msg) => fetch("${
              c.req.path.replaceAll('"', '\\"')
            }", {headers: {"${FILE_WATCHER_HEADER}": msg}}).then(res => {
                if (res.headers.get("${FILE_WATCHER_HEADER}")) {
                  return res.text()
                }
                return "failed"
              }).catch(() => "failed")
              console.info('[Hono File Watcher] Connected.')
              while (true) {
                const text = await getState("to-reload")
                if (text === 'reload') {
                  console.info('[Hono File Watcher] File change detected, polling state.')
                  await getState("state")
                  while (true) {
                    const state = await getState("state")
                    if (state === "ok") {
                      break
                    }
                  }
                  location.reload()
                }
              }
            })()
          </script>`))
            controller.close()
          },
        }),
      )
    }
  }
}
