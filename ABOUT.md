# GatherStack

中文：[ABOUT_cn.md](./ABOUT_cn.md).

## What it does

Use AI to parse web pages, store the results locally, and make later summarization and comparison easier.

Best for: collecting and processing information across many pages.

## Where it came from

While apartment hunting, I had to manually note locations, rent, and other details, then gather them for comparison.

With large language models available, I wanted to simplify that workflow.

The idea: browse rental sites, and when one looks promising, ask a model to extract the fields I care about using rules I set up ahead of time (I call them Skills), then save the result in the browser.

Once I've saved a solid set, I export or paste the stored data into Gemini, Doubao, DeepSeek, or similar tools and let them compare for me.

That pattern—custom extract rules, AI page parsing, local storage, then summarize and compare—also fits product comparisons, job listings, and similar cross-page tasks.

## How to use

1. Open “Settings → Models”, add an external model (DeepSeek, OpenAI, DashScope, Claude, …), or load Chrome’s on-device Gemini Nano.
2. Browse as usual; when you find a page you want to extract from, click the toolbar icon to open the side panel.
3. Click “Read current page” to load the page into the side-panel chat. You can type / to pick a Skill, or just say what you want to extract.

   Models have different context limits; some may be too small for the page you want to extract from. Pages are trimmed to reduce context overflow, but that cannot cover every model. If something fails, switching to a stronger model is often a good fix.

   To keep things simple, each chat turn can only use one Skill.
4. After the model returns a result, click “Store” on the bubble. Review and edit under “Data” on the left. To ask the model again, “Export to side panel” the record.

## Send modes

Four built-in send modes are available; switch them to the left of Send.

- **Chat**: calls the model and can include chat history. Best for Q&A.
- **Direct store**: skips the model and writes locally right away. Best for quick manual saves.
- **Async parse**: run multiple page parses in parallel—up to 5 at a time by default.
- **One-click collect**: keep your page-parse setup and auto-save results—handy for parsing multiple pages continuously.

In Settings, combine chat conditions to create your own send modes.

## Data and privacy

Collected records stay in this browser by default (IndexedDB).

Anything sent to a model goes to the provider you configured in Settings.

System pages and the Chrome Web Store cannot be read.

Clearing this extension’s site data deletes the local store.

## Pricing

Everything is free for now. The extension runs locally in your browser, so there are no server costs.

Whether paid features show up later depends on how people actually use it. One thing is fixed: if anything becomes paid, it will only be new capabilities; what you can use today stays free.

## Help me make it better

If you have any suggestions or find any bugs, please drop me a line at [sxqsdbu@gmail.com](mailto:sxqsdbu@gmail.com?subject=GatherStack-). I'd love to hear from you! Please keep the subject starting with `GatherStack-`.

GitHub: [GatherStack](https://github.com/geraldqin/gatherstack)

---

Built with Cursor
