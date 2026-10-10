const HARD_NOISE_SELECTOR =
  "script,noscript,style,template,svg,iframe,canvas,object,embed,meta,link"

export function stripHtmlNoise(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html")
  doc.querySelectorAll(HARD_NOISE_SELECTOR).forEach((el) => {
    el.remove()
  })
  return doc.documentElement.outerHTML
}
