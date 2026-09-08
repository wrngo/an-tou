# An Tou

A glass card desk for Obsidian. One install: the homepage becomes rooms of cards, and the vault picks up the mint Quiet Glass look.

## What it does

- Opens on a card desk instead of the file tree
- Each card is a folder you configure (a room)
- A room with children and no folder is a group, like a cabinet
- Notes inside a room stay cards
- Applies the mint paper look (can be turned off in settings)

On first run, if you have not added rooms, it maps top-level folders.

## Settings

Settings default to Chinese. Switch to English at the top of the page.

- **Desk title** — home heading and tab
- **Apply this look** — mint paper and serif type
- **Rooms** — one card per room
  - **Name** — large title on the card
  - **Folder** — vault path; empty makes a group
  - **Kicker** — small top-left line
  - **Line** — sentence under the title
  - **Parent room id** — nest under another room
  - **Quiet** — fade the card, skip recents

## Install

Copy `main.js`, `manifest.json`, and `styles.css` into:

```
<vault>/.obsidian/plugins/an-tou/
```

Enable **An Tou** under Community plugins.

```
npm install
npm run build
```

## Publish

Push a version tag that matches `manifest.json` (no `v` prefix). GitHub Actions builds the plugin, signs artifact attestations, and creates the release:

```
git tag 0.2.4
git push origin 0.2.4
```

Then submit or re-request review at [community.obsidian.md](https://community.obsidian.md).

Plugin id: `an-tou`. The store name has to stay English / Basic Latin.

---

本库里首页标题是「拾穗」。别人只装这一个插件就会看到卡片书桌和薄荷绿外观。
