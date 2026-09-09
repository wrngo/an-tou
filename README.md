# Quiet Desk

A glass card desk for Obsidian. One install: the homepage becomes rooms of cards, and the vault picks up the mint Quiet Glass look.

Chinese name: 静桌. Desk title defaults to 格物成栖 (you can change it).

Formerly **An Tou**. Plugin id stays `an-tou` so existing installs keep their `data.json` and desk tabs.

## What it does

- Opens on a card desk instead of the file tree
- Each card is a folder you configure (a room)
- A room with children and no notes grid is a group, like a cabinet
- Notes inside a room stay cards
- Applies the Quiet Glass look (can be turned off in settings)

On first run, if you have not added rooms, it maps top-level folders and nests their subfolders.

## Settings

Settings default to Chinese. Switch to English at the top of the page.

- **Desk title** — home heading and tab (default: 格物成栖)
- **Apply Quiet Glass look** — mint paper and serif type
- **Rooms** — one card per room
  - **Name** — large title on the card
  - **Folder** — vault path; empty makes a group
  - **Kicker** — small top-left line
  - **Line** — sentence under the title
  - **Parent room id** — nest under another room
  - **Quiet** — fade the card, skip recents

If a room folder contains `BACKLOG.md`, opening it shows that note first and the rest as a few recent slips. No extra switch.

Build from top-level folders keeps names, captions, and quiet you already edited. New folders are appended.

## Install

Copy `main.js`, `manifest.json`, and `styles.css` into:

```
<vault>/.obsidian/plugins/an-tou/
```

Enable **Quiet Desk** under Community plugins.

```
npm install
npm run build
```

## Publish

Push a version tag that matches `manifest.json` (no `v` prefix). GitHub Actions builds the plugin, signs artifact attestations, and creates the release:

```
git tag 0.2.5
git push origin 0.2.5
```

Then submit or re-request review at [community.obsidian.md](https://community.obsidian.md).

Plugin id: `an-tou` (former name An Tou). The store name has to stay English / Basic Latin: **Quiet Desk**.
