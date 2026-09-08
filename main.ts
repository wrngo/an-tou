import {
	App,
	ItemView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	TFolder,
	WorkspaceLeaf,
} from "obsidian";

const VIEW_TYPE = "an-tou-desk";

interface Room {
	id: string;
	name: string;
	folder?: string;
	kicker?: string;
	line?: string;
	quiet?: boolean;
	parent?: string;
	pinBacklog?: boolean;
	maxNotes?: number;
}

type UiLang = "zh" | "en";

interface AnTouSettings {
	title: string;
	openOnStart: boolean;
	collapseExplorer: boolean;
	applyLook: boolean;
	skipPaths: string[];
	rooms: Room[];
	uiLang: UiLang;
}

const DEFAULT_SETTINGS: AnTouSettings = {
	title: "An Tou",
	openOnStart: true,
	collapseExplorer: true,
	applyLook: true,
	skipPaths: [],
	rooms: [],
	uiLang: "zh",
};

const COPY = {
	zh: {
		language: "界面语言",
		languageDesc: "只改设置页的说明。书桌卡片上的中文标题还是你自己填的。",
		chinese: "中文",
		english: "English",
		desk: "书桌",
		title: "书桌标题",
		titleDesc: "首页最大那行字，也显示在标签上。",
		look: "换上这套外观",
		lookDesc: "薄荷绿底和衬线字。关掉就只留卡片书桌，颜色仍用你现在的主题。",
		openOnStart: "打开库时进入书桌",
		openOnStartDesc: "启动时打开书桌，而不是上次那篇笔记。",
		collapse: "收起文件列表",
		collapseDesc: "打开书桌时把左边文件树收起来。",
		skip: "跳过这些路径",
		skipDesc: "用逗号分隔。这些文件夹不会出现在卡片和「最近」里。",
		rooms: "房间",
		roomsDesc:
			"每张卡片是一个房间。填文件夹就进那个目录；不填文件夹，只填子房间的「父房间编号」，这一张就是分组。",
		addRoom: "添加房间",
		fromVault: "按库根目录生成",
		fromVaultNotice: "已按顶层文件夹重建房间。",
		roomId: "编号",
		remove: "删除这个房间",
		name: "名称",
		nameDesc: "卡片中间的大标题。",
		folder: "文件夹",
		folderDesc: "库里的路径，比如 00-Inbox。留空则这张卡是分组。",
		kicker: "角标",
		kickerDesc: "卡片左上角那一小行，比如 Inbox。",
		line: "说明",
		lineDesc: "卡片底下那一行，写这格是干什么的。",
		parent: "父房间编号",
		parentDesc: "填上一级的编号，比如 cabinet。填了就不出现在首页。",
		quiet: "安静",
		quietDesc: "打开后卡片变淡，里面的笔记也不进「最近」。",
		newRoom: "新房间",
	},
	en: {
		language: "Language",
		languageDesc: "Settings copy only. Card titles stay whatever you typed.",
		chinese: "中文",
		english: "English",
		desk: "Desk",
		title: "Desk title",
		titleDesc: "The large heading on the home cards and the tab.",
		look: "Apply this look",
		lookDesc: "Mint paper and serif type. Off keeps the cards and your current theme.",
		openOnStart: "Open on start",
		openOnStartDesc: "Show the desk when the vault opens, instead of the last note.",
		collapse: "Collapse file explorer",
		collapseDesc: "Fold the left file tree when the desk opens.",
		skip: "Skip these paths",
		skipDesc: "Comma-separated folder prefixes hidden from cards and recents.",
		rooms: "Rooms",
		roomsDesc:
			"Each card is a room. Point it at a folder, or leave the folder empty and nest child rooms under its id.",
		addRoom: "Add room",
		fromVault: "Build from top-level folders",
		fromVaultNotice: "Rooms rebuilt from top-level folders.",
		roomId: "Id",
		remove: "Remove this room",
		name: "Name",
		nameDesc: "The large title in the middle of the card.",
		folder: "Folder",
		folderDesc: "A vault path such as 00-Inbox. Leave empty to make a group.",
		kicker: "Kicker",
		kickerDesc: "The small line at the top-left of the card, such as Inbox.",
		line: "Line",
		lineDesc: "The sentence under the title, what this room is for.",
		parent: "Parent room id",
		parentDesc: "The id of the parent room, such as cabinet. Then it leaves the home grid.",
		quiet: "Quiet",
		quietDesc: "Fades the card and keeps its notes out of recents.",
		newRoom: "New room",
	},
} as const;

type Page =
	| { type: "home" }
	| { type: "group"; room: Room }
	| {
			type: "folder";
			title: string;
			folder: string;
			kicker: string;
			parentLabel: string;
			pinBacklog?: boolean;
			maxNotes?: number;
	  };

function slug(name: string): string {
	const s = name
		.toLowerCase()
		.replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
		.replace(/^-|-$/g, "");
	return s || "room-" + Date.now().toString(36);
}

function inFolder(file: TFile, folder: string): boolean {
	if (!folder) return false;
	return file.path === folder + ".md" || file.path.startsWith(folder + "/");
}

function skipped(path: string, skipPaths: string[]): boolean {
	if (path.includes("/attachments/")) return true;
	return skipPaths.some((s) => path === s || path.startsWith(s + "/"));
}

function titleOf(file: TFile): string {
	if (/^\d{4}-\d{2}-\d{2}\b/.test(file.basename) || /quick$/i.test(file.basename)) return "";
	if (file.basename === "BACKLOG") return "Backlog";
	return file.basename;
}

function todayLabel(): string {
	const lang = document.documentElement.lang || navigator.language || "zh-CN";
	const tag = lang.toLowerCase().startsWith("zh") ? "zh-CN" : lang;
	return new Date().toLocaleDateString(tag, { month: "long", day: "numeric" });
}

function twoDigits(n: number): string {
	return (n < 10 ? "0" : "") + String(n);
}

function inboxStamp(): string {
	const d = new Date();
	return `${d.getFullYear()}-${twoDigits(d.getMonth() + 1)}-${twoDigits(d.getDate())} ${twoDigits(d.getHours())}${twoDigits(d.getMinutes())}`;
}

function safeName(name: string): string {
	return name.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim() || "未命名";
}

function isInboxFolder(folder: string): boolean {
	return /inbox/i.test(folder);
}

async function firstLine(app: App, file: TFile): Promise<string> {
	try {
		let t = await app.vault.cachedRead(file);
		if (t.startsWith("---")) {
			const end = t.indexOf("\n---", 3);
			if (end !== -1) t = t.slice(end + 4);
		}
		for (const raw of t.split("\n")) {
			let ln = raw.trim();
			if (!ln || ln.startsWith("#") || ln.startsWith("!") || ln.startsWith(">")) continue;
			if (ln.startsWith("```") || ln.startsWith("`")) continue;
			ln = ln.replace(/`[^`]+`/g, "").replace(/\s+/g, " ").trim();
			if (ln.length < 4) continue;
			return ln.slice(0, 36);
		}
	} catch {
		/* ignore */
	}
	return "";
}

class NameModal extends Modal {
	preset: string;
	onSubmit: (value: string) => void;

	constructor(app: App, preset: string, onSubmit: (value: string) => void) {
		super(app);
		this.preset = preset || "";
		this.onSubmit = onSubmit;
	}

	onOpen() {
		this.titleEl.setText("新笔记");
		const input = this.contentEl.createEl("input", { type: "text", cls: "prompt-input" });
		input.value = this.preset;
		input.placeholder = "这篇叫什么";
		input.addEventListener("keydown", (e) => {
			if (e.key !== "Enter") return;
			e.preventDefault();
			const v = input.value.trim();
			this.close();
			this.onSubmit(v);
		});
		window.setTimeout(() => {
			input.focus();
			if (this.preset) input.select();
		}, 20);
	}
}

class DeskView extends ItemView {
	plugin: AnTouPlugin;
	stack: Page[] = [{ type: "home" }];
	_tid = 0;

	constructor(leaf: WorkspaceLeaf, plugin: AnTouPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return VIEW_TYPE;
	}
	getDisplayText() {
		return this.plugin.settings.title || "An Tou";
	}
	getIcon() {
		return "layout-grid";
	}

	async onOpen() {
		this.contentEl.addClass("an-tou-view");
		this.registerEvent(this.app.vault.on("create", () => this.safeRender()));
		this.registerEvent(this.app.vault.on("delete", () => this.safeRender()));
		this.registerEvent(this.app.vault.on("rename", () => this.safeRender()));
		this.registerEvent(this.app.vault.on("modify", () => this.safeRender()));
		await this.render();
	}

	async onClose() {
		this.contentEl.empty();
	}

	safeRender() {
		if (this._tid) window.clearTimeout(this._tid);
		this._tid = window.setTimeout(() => {
			void this.render();
		}, 200);
	}

	resetHome() {
		this.stack = [{ type: "home" }];
		return this.render();
	}

	current(): Page {
		return this.stack[this.stack.length - 1];
	}

	push(page: Page) {
		this.stack.push(page);
		void this.render();
	}

	back() {
		if (this.stack.length > 1) {
			this.stack.pop();
			void this.render();
		}
	}

	mdIn(folder: string, extraSkip: string[] = []): TFile[] {
		if (!folder) return [];
		const skip = this.plugin.settings.skipPaths;
		return this.app.vault.getMarkdownFiles().filter((f) => {
			if (!inFolder(f, folder)) return false;
			if (skipped(f.path, skip)) return false;
			return !extraSkip.some((s) => f.path.endsWith(s) || f.basename === s);
		});
	}

	subfolders(folder: string): TFolder[] {
		const af = this.app.vault.getAbstractFileByPath(folder);
		if (!(af instanceof TFolder)) return [];
		const skip = this.plugin.settings.skipPaths;
		return af.children.filter((c): c is TFolder => {
			if (!(c instanceof TFolder)) return false;
			if (c.name.startsWith(".")) return false;
			return !skipped(c.path, skip);
		});
	}

	homeRooms(): Room[] {
		return this.plugin.settings.rooms.filter((r) => !r.parent);
	}

	childrenOf(id: string): Room[] {
		return this.plugin.settings.rooms.filter((r) => r.parent === id);
	}

	isQuietLine(room: Room): boolean {
		if (room.quiet) return true;
		if (!room.parent) return false;
		const parent = this.plugin.settings.rooms.find((r) => r.id === room.parent);
		return parent ? this.isQuietLine(parent) : false;
	}

	liveFolders(): { folder: string; kicker: string }[] {
		const out: { folder: string; kicker: string }[] = [];
		for (const room of this.plugin.settings.rooms) {
			if (this.isQuietLine(room)) continue;
			if (!room.folder) continue;
			out.push({ folder: room.folder, kicker: room.name });
		}
		return out;
	}

	roomCount(room: Room): number {
		const kids = this.childrenOf(room.id);
		if (kids.length) return kids.length;
		if (room.folder) return this.mdIn(room.folder).length;
		return 0;
	}

	openRoom(room: Room, parentLabel: string) {
		const kids = this.childrenOf(room.id);
		if (kids.length) {
			this.push({ type: "group", room });
			return;
		}
		if (room.folder) {
			this.push({
				type: "folder",
				title: room.name,
				folder: room.folder,
				kicker: room.kicker || room.name,
				parentLabel,
				pinBacklog: room.pinBacklog,
				maxNotes: room.maxNotes,
			});
		}
	}

	async openNote(file: TFile) {
		await this.app.workspace.getLeaf("tab").openFile(file);
	}

	async createNamedNote(folder: string, raw: string) {
		const base = safeName(raw || (isInboxFolder(folder) ? inboxStamp() : "未命名"));
		let filename = base;
		let n = 2;
		while (this.app.vault.getAbstractFileByPath(folder + "/" + filename + ".md")) {
			filename = base + " " + n++;
		}
		try {
			const file = await this.app.vault.create(folder + "/" + filename + ".md", "");
			await this.openNote(file);
		} catch {
			new Notice("没写成。");
		}
	}

	async newNote(folder: string) {
		if (!folder) return;
		if (!this.app.vault.getAbstractFileByPath(folder)) {
			new Notice("文件夹不在。");
			return;
		}
		const preset = isInboxFolder(folder) ? inboxStamp() : "";
		new NameModal(this.app, preset, (raw) => {
			void this.createNamedNote(folder, raw);
		}).open();
	}

	card(
		parent: HTMLElement,
		spec: {
			kicker?: string;
			count?: number | string;
			title: string;
			line?: string;
			quiet?: boolean;
			note?: boolean;
			span2?: boolean;
		},
		onClick?: () => void
	) {
		const el = parent.createEl("button", {
			cls:
				"desk-card" +
				(spec.quiet ? " is-quiet" : "") +
				(spec.note ? " is-note" : "") +
				(spec.span2 ? " span-2" : ""),
		});
		if (spec.kicker) el.createEl("span", { cls: "desk-kicker", text: spec.kicker });
		else if (!spec.note) el.createEl("span", { cls: "desk-kicker", text: "\u00a0" });
		if (spec.count !== undefined && spec.count !== "" && spec.count !== null) {
			el.createEl("span", { cls: "desk-count", text: String(spec.count) });
		}
		el.createEl("strong", { text: spec.title });
		if (spec.line) el.createEl("span", { cls: "desk-line", text: spec.line });
		else if (!spec.note) el.createEl("span", { cls: "desk-line", text: "\u00a0" });
		if (onClick) el.addEventListener("click", onClick);
		else el.addClass("is-still");
		return el;
	}

	nav(root: HTMLElement, crumbs: { label: string; go: () => void }[], folder?: string) {
		const bar = root.createDiv({ cls: "an-tou-nav" });
		const trail = bar.createDiv({ cls: "an-tou-crumbs" });
		crumbs.forEach((c, i) => {
			if (i > 0) trail.createSpan({ text: " · " });
			const b = trail.createEl("button", { text: c.label });
			b.addEventListener("click", c.go);
		});
		if (folder) {
			const add = bar.createEl("button", {
				cls: "an-tou-add",
				text: "+",
				attr: { type: "button", "aria-label": "新笔记" },
			});
			add.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				void this.newNote(folder);
			});
		}
	}

	async render() {
		const root = this.contentEl;
		root.empty();
		const inner = root.createDiv({ cls: "an-tou-inner" });
		const page = this.current();
		if (page.type === "home") await this.renderHome(inner);
		else if (page.type === "group") this.renderGroup(inner, page.room);
		else await this.renderFolder(inner, page);
	}

	async renderHome(inner: HTMLElement) {
		const title = this.plugin.settings.title || "An Tou";
		inner.createEl("h1", { text: title });
		inner.createEl("span", { cls: "an-tou-date", text: todayLabel() });

		const rooms = this.homeRooms();
		if (rooms.length === 0) {
			inner.createEl("p", {
				cls: "an-tou-lede",
				text: "还没有房间。打开设置添加文件夹，或从库根目录生成。",
			});
			return;
		}

		const grid = inner.createDiv({ cls: "an-tou-grid" });
		for (const room of rooms) {
			const n = this.roomCount(room);
			this.card(
				grid,
				{
					kicker: room.kicker,
					count: room.quiet ? undefined : n,
					title: room.name,
					line: room.line,
					quiet: room.quiet,
				},
				() => this.openRoom(room, title)
			);
		}

		inner.createEl("h2", { text: "最近" });
		const recentGrid = inner.createDiv({ cls: "an-tou-grid" });
		const live = this.liveFolders();
		const recent = this.app.vault
			.getMarkdownFiles()
			.filter((f) => live.some((r) => inFolder(f, r.folder)))
			.filter((f) => !skipped(f.path, this.plugin.settings.skipPaths))
			.filter((f) => f.basename !== "BACKLOG" && !f.basename.startsWith("BACKLOG"))
			.sort((a, b) => b.stat.mtime - a.stat.mtime)
			.slice(0, 3);

		for (const file of recent) {
			let titleText = titleOf(file);
			const line = await firstLine(this.app, file);
			if (!titleText) titleText = line || file.basename;
			const hit = live.find((r) => inFolder(file, r.folder));
			this.card(
				recentGrid,
				{
					kicker: hit?.kicker || "Note",
					title: titleText,
					line: titleText === line ? "" : line,
					note: true,
				},
				() => {
					void this.openNote(file);
				}
			);
		}
	}

	renderGroup(inner: HTMLElement, room: Room) {
		const title = this.plugin.settings.title || "An Tou";
		this.nav(inner, [{ label: "← " + title, go: () => this.back() }]);
		inner.createEl("h1", { text: room.name });
		if (room.line) inner.createEl("p", { cls: "an-tou-lede", text: room.line });
		const grid = inner.createDiv({ cls: "an-tou-grid" });
		for (const child of this.childrenOf(room.id)) {
			const files = child.folder ? this.mdIn(child.folder, child.pinBacklog ? ["BACKLOG"] : []) : [];
			const n = this.roomCount(child);
			this.card(
				grid,
				{
					count: n,
					title: child.name,
					line: child.line || (n === 1 && files[0] ? titleOf(files[0]) : ""),
					quiet: child.quiet || room.quiet,
				},
				() => this.openRoom(child, room.name)
			);
		}
	}

	async renderFolder(
		inner: HTMLElement,
		page: Extract<Page, { type: "folder" }>
	) {
		const title = this.plugin.settings.title || "An Tou";
		const goHome = () => {
			this.stack = [{ type: "home" }];
			void this.render();
		};
		const crumbs = [{ label: "← " + page.parentLabel, go: () => this.back() }];
		if (page.parentLabel !== title) crumbs.push({ label: title, go: goHome });
		this.nav(inner, crumbs, page.folder);
		inner.createEl("h1", { text: page.title });

		const all = this.mdIn(page.folder);
		const backlog = all.find((f) => f.basename === "BACKLOG");
		const useBacklog = page.pinBacklog || !!backlog;
		const subs = this.subfolders(page.folder);

		if (useBacklog && backlog) {
			inner.createEl("p", { cls: "an-tou-lede", text: "正本在 Backlog。" });
			inner.createEl("h2", { text: "正本" });
			const top = inner.createDiv({ cls: "an-tou-grid" });
			this.card(
				top,
				{ kicker: page.kicker, title: "Backlog", line: backlog.basename, span2: true },
				() => {
					void this.openNote(backlog);
				}
			);
		}

		if (subs.length && !useBacklog) {
			const grid = inner.createDiv({ cls: "an-tou-grid" });
			for (const folder of subs) {
				const n = this.mdIn(folder.path).length;
				this.card(grid, { count: n, title: folder.name }, () => {
					this.push({
						type: "folder",
						title: folder.name,
						folder: folder.path,
						kicker: page.kicker,
						parentLabel: page.title,
					});
				});
			}
		}

		let notes = all
			.filter((f) => f.basename !== "BACKLOG" && f.basename !== "BACKLOG-archive")
			.sort((a, b) => b.stat.mtime - a.stat.mtime);
		const cap = useBacklog ? 7 : page.maxNotes || (notes.length > 40 ? 24 : notes.length);
		const rest = Math.max(0, notes.length - cap);
		if (rest) notes = notes.slice(0, cap);

		if (useBacklog) inner.createEl("h2", { text: "最近的纸条" });
		const grid = inner.createDiv({ cls: "an-tou-grid" });
		for (const file of notes) {
			const line = await firstLine(this.app, file);
			this.card(
				grid,
				{ kicker: page.kicker, title: titleOf(file) || line || file.basename, line, note: true },
				() => {
					void this.openNote(file);
				}
			);
		}
		if (rest > 0) {
			this.card(grid, {
				title: "其余 " + rest + " 条",
				line: "用快速切换搜标题。",
				note: true,
				quiet: true,
			});
		}
		if (!notes.length && !subs.length && !backlog) {
			inner.createEl("p", { cls: "an-tou-lede", text: "这一格还没有笔记。" });
		}
	}
}

class AnTouSettingTab extends PluginSettingTab {
	plugin: AnTouPlugin;

	constructor(app: App, plugin: AnTouPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	copy() {
		return this.plugin.settings.uiLang === "en" ? COPY.en : COPY.zh;
	}

	display() {
		const { containerEl } = this;
		const t = this.copy();
		const lang = this.plugin.settings.uiLang === "en" ? "en" : "zh";
		containerEl.empty();

		new Setting(containerEl)
			.setName(t.language)
			.setDesc(t.languageDesc)
			.addButton((b) => {
				b.setButtonText(t.chinese).onClick(() => {
					void this.setLang("zh");
				});
				if (lang === "zh") b.setCta();
			})
			.addButton((b) => {
				b.setButtonText(t.english).onClick(() => {
					void this.setLang("en");
				});
				if (lang === "en") b.setCta();
			});

		new Setting(containerEl).setName(t.desk).setHeading();

		new Setting(containerEl)
			.setName(t.title)
			.setDesc(t.titleDesc)
			.addText((box) =>
				box.setValue(this.plugin.settings.title).onChange((v) => {
					this.plugin.settings.title = v.trim() || "An Tou";
					void this.saveAndRefresh();
				})
			);

		new Setting(containerEl)
			.setName(t.look)
			.setDesc(t.lookDesc)
			.addToggle((box) =>
				box.setValue(this.plugin.settings.applyLook !== false).onChange((v) => {
					this.plugin.settings.applyLook = v;
					this.plugin.applyLook();
					void this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t.openOnStart)
			.setDesc(t.openOnStartDesc)
			.addToggle((box) =>
				box.setValue(this.plugin.settings.openOnStart).onChange((v) => {
					this.plugin.settings.openOnStart = v;
					void this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t.collapse)
			.setDesc(t.collapseDesc)
			.addToggle((box) =>
				box.setValue(this.plugin.settings.collapseExplorer).onChange((v) => {
					this.plugin.settings.collapseExplorer = v;
					void this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t.skip)
			.setDesc(t.skipDesc)
			.addText((box) =>
				box.setValue(this.plugin.settings.skipPaths.join(", ")).onChange((v) => {
					this.plugin.settings.skipPaths = v
						.split(",")
						.map((s) => s.trim())
						.filter(Boolean);
					void this.saveAndRefresh();
				})
			);

		new Setting(containerEl).setName(t.rooms).setHeading();

		new Setting(containerEl)
			.setDesc(t.roomsDesc)
			.addButton((b) =>
				b.setButtonText(t.addRoom).onClick(() => {
					void this.addRoom();
				})
			)
			.addButton((b) =>
				b.setButtonText(t.fromVault).onClick(() => {
					void this.rebuildRooms();
				})
			);

		for (const room of this.plugin.settings.rooms) {
			this.drawRoom(containerEl, room, t);
		}
	}

	async setLang(uiLang: UiLang) {
		this.plugin.settings.uiLang = uiLang;
		await this.plugin.saveSettings();
		this.display();
	}

	async saveAndRefresh() {
		await this.plugin.saveSettings();
		this.plugin.refreshDesks();
	}

	async addRoom() {
		const t = this.copy();
		this.plugin.settings.rooms.push({
			id: "room-" + Date.now().toString(36),
			name: t.newRoom,
			kicker: "ROOM",
		});
		await this.saveAndRefresh();
		this.display();
	}

	async rebuildRooms() {
		this.plugin.settings.rooms = this.plugin.scanRooms();
		await this.saveAndRefresh();
		this.display();
		new Notice(this.copy().fromVaultNotice);
	}

	drawRoom(containerEl: HTMLElement, room: Room, t: (typeof COPY)[UiLang]) {
		const wrap = containerEl.createDiv({ cls: "an-tou-room-edit" });
		new Setting(wrap)
			.setName(room.name || t.newRoom)
			.setDesc(t.roomId + " · " + room.id)
			.addExtraButton((b) =>
				b.setIcon("trash").setTooltip(t.remove).onClick(() => {
					void this.removeRoom(room.id);
				})
			);

		const grid = wrap.createDiv({ cls: "an-tou-room-grid" });
		this.textField(grid, t.name, t.nameDesc, room.name, (v) => {
			room.name = v;
		});
		this.textField(grid, t.folder, t.folderDesc, room.folder || "", (v) => {
			room.folder = v.trim() || undefined;
		});
		this.textField(grid, t.kicker, t.kickerDesc, room.kicker || "", (v) => {
			room.kicker = v;
		});
		this.textField(grid, t.line, t.lineDesc, room.line || "", (v) => {
			room.line = v;
		});
		this.textField(grid, t.parent, t.parentDesc, room.parent || "", (v) => {
			room.parent = v.trim() || undefined;
		});
		new Setting(grid)
			.setName(t.quiet)
			.setDesc(t.quietDesc)
			.addToggle((box) =>
				box.setValue(!!room.quiet).onChange((v) => {
					room.quiet = v;
					void this.saveAndRefresh();
				})
			);
	}

	textField(
		parent: HTMLElement,
		name: string,
		desc: string,
		value: string,
		assign: (v: string) => void
	) {
		new Setting(parent)
			.setName(name)
			.setDesc(desc)
			.addText((box) =>
				box.setValue(value).onChange((v) => {
					assign(v);
					void this.saveAndRefresh();
				})
			);
	}

	async removeRoom(id: string) {
		this.plugin.settings.rooms = this.plugin.settings.rooms.filter((r) => r.id !== id);
		await this.saveAndRefresh();
		this.display();
	}
}

export default class AnTouPlugin extends Plugin {
	settings: AnTouSettings = DEFAULT_SETTINGS;

	async onload() {
		const saved = (await this.loadData()) as Partial<AnTouSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, saved ?? {});
		if (!Array.isArray(this.settings.rooms)) this.settings.rooms = [];
		if (!Array.isArray(this.settings.skipPaths)) this.settings.skipPaths = [];
		if (this.settings.uiLang !== "en") this.settings.uiLang = "zh";

		this.registerView(VIEW_TYPE, (leaf) => new DeskView(leaf, this));
		this.addCommand({
			id: "open-desk",
			name: "Open desk",
			callback: () => {
				void this.activateView();
			},
		});
		this.addSettingTab(new AnTouSettingTab(this.app, this));
		this.applyLook();
		this.app.workspace.onLayoutReady(async () => {
			if (this.settings.rooms.length === 0) {
				this.settings.rooms = this.scanRooms();
				await this.saveSettings();
			}
			if (this.settings.openOnStart) void this.activateView();
		});
	}

	onunload() {
		document.body.removeClass("an-tou-look");
	}

	applyLook() {
		document.body.toggleClass("an-tou-look", this.settings.applyLook !== false);
	}

	scanRooms(): Room[] {
		const rooms: Room[] = [];
		const root = this.app.vault.getRoot();
		for (const child of root.children) {
			if (!(child instanceof TFolder)) continue;
			if (child.name.startsWith(".")) continue;
			if (skipped(child.path, this.settings.skipPaths)) continue;
			rooms.push({
				id: slug(child.name),
				name: child.name,
				folder: child.path,
				kicker: "ROOM",
			});
		}
		return rooms;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	refreshDesks() {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
			const view = leaf.view as DeskView;
			if (view?.render) void view.render();
		}
	}

	async activateView() {
		const { workspace } = this.app;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE);
		for (const extra of leaves.slice(1)) extra.detach();
		let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
		if (!leaf) {
			leaf = workspace.getLeaf(false);
			await leaf.setViewState({ type: VIEW_TYPE, active: true });
		} else {
			workspace.setActiveLeaf(leaf, { focus: true });
		}
		if (this.settings.collapseExplorer && workspace.leftSplit) {
			workspace.leftSplit.collapse();
		}
	}
}
