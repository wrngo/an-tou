# Quiet Desk

A glass card desk for Obsidian. One install: the homepage becomes rooms of cards, and the vault picks up the mint Quiet Glass look.

Chinese name: 静桌. Desk title defaults to 格物成栖 (you can change it).

Formerly **An Tou**. Plugin id stays `an-tou` so existing installs keep their `data.json` and desk tabs.

Requires Obsidian **1.7.2** or newer.

## What it does

- Opens on a card desk instead of the file tree
- Each card is a folder you configure (a room)
- A room with children and no notes grid is a group, like a cabinet
- Notes inside a room stay cards
- Every card that points at a folder has a **+** in its corner — one click writes a timestamped note and opens it, no dialog
- Applies the Quiet Glass look (three separate switches, see below)

## First run

A new vault opens on a welcome page. It says what the plugin changed, confirms your notes and folders were not touched, and lets you pick which top-level folders go on the home grid — six are pre-selected, and **Add all** maps every folder and its subfolders the way older versions did automatically.

Vaults that already have rooms skip the welcome page entirely.

## Settings

Settings default to Chinese. Switch to English at the top of the page — the desk itself follows, including the date format.

**Desk**

- **Desk title** — home heading and tab (default: 格物成栖)
- **Mint palette** — desk paper, glass cards, and chrome. Off uses your current theme everywhere
- **Serif type** — desk titles, card names, and note text. Off uses your theme fonts
- **Hide the ribbon** — off shows the left icon bar; on hides it
- **Open on start** — show the desk when the vault opens
- **Collapse file explorer** — off shows the left file tree; on folds it
- **Skip these paths** — comma-separated folder prefixes hidden from cards and recents (`attachments` is there by default)

**Rooms**

Rooms are grouped: home cards first, then each nested group under its parent. Each room collapses to one line. Click the line to edit.

- **Name** — large title on the card
- **Folder** — vault path, with autocompletion; a path that does not exist says so and suggests the closest match. Empty makes a group
- **Top-left text** — small line at the card's top-left
- **Caption** — sentence under the title
- **Put inside this room** — a dropdown of room names. Anything that would make a cycle (the room itself, its descendants) is left out
- **Max notes shown** — how many note cards this room shows at most
- **Fade the card** — the card fades and its notes stay out of recents

Deleting a room asks first and says where its children go — back to the home grid, never deleted with it.

Build from top-level folders keeps names, captions, and toggles you already edited. Rooms whose folder has disappeared are flagged rather than removed.

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
git tag 0.3.0
git push origin 0.3.0
```

Then submit or re-request review at [community.obsidian.md](https://community.obsidian.md).

Plugin id: `an-tou` (former name An Tou). The store name has to stay English / Basic Latin: **Quiet Desk**.
