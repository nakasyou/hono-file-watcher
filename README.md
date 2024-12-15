# Hono File Watcher

Simple file watcher for [Hono](https://hono.dev).

## Features

- 🏭 **Good development experience** Automatic HTML reload with simple API.
- 🧹 **Fewer dependencies** Depends only on `hono`.
- 🏫 **Unused WebSocket** WebSocket isn't used. Works with the proxy blocking
  WebSockets on schools or workplaces.

## Usage

To install, you have to use [JSR](https://jsr.io/@ns/hono-file-watcher).

```shell
deno add jsr:@ns/hono-file-watcher # If you use Deno
npx jsr add --bun @ns/hono-file-watcher # If you use Bun
npx jsr add --npm @ns/hono-file-watcher # If you use npm
yarn dlx jsr add --yarn @ns/hono-file-watcher # If you use yarn
pnpm dlx jsr add --pnpm @ns/hono-file-watcher # If you use pnpm
```

And add this code to your Hono code.

```diff
  import { Hono } from 'hono'
+ import { fileWatcher } from '@ns/hono-file-watcher'

  const app = new Hono()
+ app.use(fileWatcher({
+   targetDirs: ['./static'] // Directories you want to watch.
+ }))
  // ...
```

Then, if you change file, your page will be auto-reloaded.
