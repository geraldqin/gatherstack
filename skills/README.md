# skills

仓库内 Skill 内容源（Markdown + YAML frontmatter）。

| 路径 | 说明 |
|------|------|
| `preset.json` | 进包登记（与 `src/db/skills/preset/bundled/preset.json` 保持同步）。每条用 `locales.zh` / `locales.en` 指向对应正文 |
| `<名称>/SKILL.md` | 中文正文 |
| `<名称>/SKILL.en.md` | 英文正文；浏览器 UI 为英文时 seed 加载这一份 |

打包运行时用 `src/db/skills/preset/bundled/*.md`（ASCII 文件名 + `data-text`）。`zh_*` 走中文，其余语言回退英文。

修改预置内容后：更新本目录 md，并复制到 `src/db/skills/preset/bundled/` 对应文件，再重新 `pnpm dev` / 加载扩展。

与 Options「Skill」里用户数据不是同一存储。安装/升级由扩展 seed 写入内置条目（只读）；用户若要改内容，在 Options 用「创建副本」复制为用户 Skill。
