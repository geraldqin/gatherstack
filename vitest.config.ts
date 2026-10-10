import fs from "node:fs"
import path from "node:path"
import { defineConfig, type Plugin } from "vitest/config"

const VIRTUAL = "\0plasmo-data-text:"

function plasmoDataTextForVitest(): Plugin {
  return {
    name: "plasmo-data-text-for-vitest",
    enforce: "pre",
    resolveId(source, importer) {
      if (!source.startsWith("data-text:")) return null
      if (!importer) return null
      const abs = path.resolve(
        path.dirname(importer),
        source.slice("data-text:".length)
      )
      // Avoid *.json ids so Vite's json plugin does not parse our string module.
      return `${VIRTUAL}${abs}.as-text`
    },
    load(id) {
      if (!id.startsWith(VIRTUAL) || !id.endsWith(".as-text")) return null
      const filePath = id.slice(VIRTUAL.length, -".as-text".length)
      const code = fs.readFileSync(filePath, "utf8")
      return {
        code: `export default ${JSON.stringify(code)}`,
        map: null
      }
    }
  }
}

export default defineConfig({
  plugins: [plasmoDataTextForVitest()],
  resolve: {
    alias: [
      {
        find: /^~(.*)$/,
        replacement: path.resolve(__dirname, "src/$1")
      }
    ]
  },
  test: {
    setupFiles: ["./vitest.setup.ts"]
  }
})
