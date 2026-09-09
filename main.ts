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
const DEFAULT_TITLE = "格物成栖";
const RECENT_CAP = 3;

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
	draft?: boolean;
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
	title: DEFAULT_TITLE,
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
		look: "应用 Quiet Glass 外观",
		lookDesc: "薄荷绿底和衬线字。关掉就只留卡片书桌，颜色仍用你现在的主题。",
		openOnStart: "打开库时进入书桌",
		openOnStartDesc: "启动时打开书桌，而不是上次那篇笔记。",
		collapse: "收起文件列表",
		collapseDesc: "打开书桌时把左边文件树收起来。",
		skip: "跳过这些路径",
		skipDesc: "用逗号分隔。这些文件夹不会出现在卡片和「最近」里。",
		rooms: "房间",
		roomsDesc: "下面这张图就是书桌卡片，对照着填就行。",
		addRoom: "添加房间",
		fromVault: "按库根目录生成",
		fromVaultNotice: "已按文件夹更新房间。已有名称、说明和开关没动。",
		roomId: "编号",
		remove: "删除这个房间",
		name: "名称",
		nameDesc: "卡片正中间最大的那行字。",
		folder: "文件夹",
		folderDesc: "库里的路径，比如 00-Inbox。收纳柜这种分组请留空。",
		kicker: "左上角小字",
		kickerDesc: "卡片左上角那一行，比如 Inbox。",
		line: "底下那行说明",
		lineDesc: "标题下面那句，写这格是干什么的。",
		parent: "放进哪个房间",
		parentDesc: "要出现在首页就留空。要收进另一张卡里，填上一级的编号，比如 cabinet。",
		quiet: "卡片变淡",
		quietDesc: "打开后这张卡变淡，里面的笔记也不进「最近」。",
		pinBacklog: "进房间先看 BACKLOG",
		pinBacklogDesc: "没有 BACKLOG.md 时也可以强制：其它笔记只留几张最近的。",
		backlogNote: "这个房间有 BACKLOG.md",
		backlogNoteDesc: "进房间会先看到它，其它笔记变成下面几张最近的。放进 BACKLOG.md 就会这样，不用另开开关。",
		newRoom: "新房间",
		saveRoom: "保存",
		draftHint: "未保存。填好后点保存，这张卡会移到最下面。",
		roleGroup: "首页分组。文件夹空着没问题，子房间把「放进哪个房间」填成这个编号。",
		roleHomeFolder: "首页卡片，对着下面的文件夹。",
		roleNested: "不在首页，收在编号 ",
		helpTitle: "书桌卡片长这样",
		helpKickerCap: "左上角小字",
		helpNameCap: "名称",
		helpLineCap: "底下那行说明",
		helpFolderCap: "文件夹",
		helpFolderNote: "填 00-Inbox 这类路径。留空的话，点进去看到的是子房间，不是笔记。",
		helpParentCap: "放进哪个房间",
		helpParentNote: "收纳柜的编号是 cabinet。个人思考要藏进柜子，这里填 cabinet，首页就只剩收纳柜。",
		helpQuietCap: "卡片变淡",
		helpQuietNote: "打开后这张卡变淡，里面的笔记也不出现在「最近」。",
		helpCountCap: "数量，不用填",
		helpHome: "首页",
		helpInside: "点进收纳柜之后",
	},
	en: {
		language: "Language",
		languageDesc: "Settings copy only. Card titles stay whatever you typed.",
		chinese: "中文",
		english: "English",
		desk: "Desk",
		title: "Desk title",
		titleDesc: "The large heading on the home cards and the tab.",
		look: "Apply Quiet Glass look",
		lookDesc: "Mint paper and serif type. Off keeps the cards and your current theme.",
		openOnStart: "Open on start",
		openOnStartDesc: "Show the desk when the vault opens, instead of the last note.",
		collapse: "Collapse file explorer",
		collapseDesc: "Fold the left file tree when the desk opens.",
		skip: "Skip these paths",
		skipDesc: "Comma-separated folder prefixes hidden from cards and recents.",
		rooms: "Rooms",
		roomsDesc: "The picture below is a desk card. Fill the fields to match.",
		addRoom: "Add room",
		fromVault: "Build from top-level folders",
		fromVaultNotice: "Rooms updated from folders. Names, captions, and toggles were kept.",
		roomId: "Id",
		remove: "Remove this room",
		name: "Name",
		nameDesc: "The large title in the middle of the card.",
		folder: "Folder",
		folderDesc: "A vault path such as 00-Inbox. Leave empty for a group like Cabinet.",
		kicker: "Top-left text",
		kickerDesc: "The small line at the top-left, such as Inbox.",
		line: "Caption under the title",
		lineDesc: "The sentence under the title, what this room is for.",
		parent: "Put inside this room",
		parentDesc: "Leave empty to stay on the home grid. To nest it, type the parent id, such as cabinet.",
		quiet: "Fade the card",
		quietDesc: "The card fades, and its notes stay out of recents.",
		pinBacklog: "Show BACKLOG first",
		pinBacklogDesc: "Force the same layout without a BACKLOG.md: other notes stay as a few recent slips.",
		backlogNote: "This room has BACKLOG.md",
		backlogNoteDesc: "Opening the room shows it first; other notes become a few recent slips. Automatic when that file exists.",
		newRoom: "New room",
		saveRoom: "Save",
		draftHint: "Unsaved. Fill it in, then save, and it moves to the bottom.",
		roleGroup: "Home group. Empty folder is fine; children type this id in Put inside this room.",
		roleHomeFolder: "Home card, pointed at the folder below.",
		roleNested: "Not on home. Nested under ",
		helpTitle: "A desk card looks like this",
		helpKickerCap: "Top-left text",
		helpNameCap: "Name",
		helpLineCap: "Caption under the title",
		helpFolderCap: "Folder",
		helpFolderNote: "A path like 00-Inbox. Leave empty and this card is only a group.",
		helpParentCap: "Put inside this room",
		helpParentNote: "Cabinet's id is cabinet. A child that should live there types cabinet, and leaves the home grid.",
		helpQuietCap: "Fade the card",
		helpQuietNote: "The card fades, and its notes stay out of recents.",
		helpCountCap: "Count, automatic",
		helpHome: "Home",
		helpInside: "After you open Cabinet",
	},
} as const;

type Copy = (typeof COPY)[UiLang];

type FolderPage = {
	title: string;
	folder: string;
	kicker: string;
	parentLabel: string;
	pinBacklog?: boolean;
	maxNotes?: number;
};

type Page =
	| { type: "home" }
	| { type: "group"; room: Room }
	| ({ type: "folder" } & FolderPage)
	| ({ type: "more" } & FolderPage & { skip: number });

function slug(name: string): string {
	const s = name
		.toLowerCase()
		.replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
		.replace(/^-|-$/g, "");
	return s || "room-" + Date.now().toString(36);
}

function uniqueId(base: string, used: Set<string>): string {
	const root = base || "room";
	if (!used.has(root)) {
		used.add(root);
		return root;
	}
	let n = 2;
	while (used.has(root + "-" + n)) n++;
	const id = root + "-" + n;
	used.add(id);
	return id;
}

function kickerOf(folderName: string): string {
	let s = folderName.replace(/^\d+[-_\s]*/, "").trim();
	s = s.replace(/（[^）]*）/g, "").replace(/\([^)]*\)/g, "").trim();
	if (!s) s = folderName.replace(/^\d+[-_\s]*/, "").trim() || folderName;
	if (/[\u4e00-\u9fff]/.test(s)) {
		s = s.replace(/^[A-Za-z0-9]+[-_]/, "").trim() || s;
		return s.slice(0, 4);
	}
	if (/^[A-Za-z0-9][A-Za-z0-9._ -]*$/.test(s)) {
		const parts = s.split(/[-_\s]+/).filter(Boolean);
		if (parts.length === 1) {
			const w = parts[0];
			return w.length <= 12 ? w : w.slice(0, 8);
		}
		const first = parts[0];
		if (first.length >= 3 && first.length <= 10) return first;
		return parts.map((p) => p[0]).join("").slice(0, 8);
	}
	return s.slice(0, 4);
}

function noteCountLine(n: number, zh: boolean): string | undefined {
	if (n <= 0) return undefined;
	return zh ? n + " 篇笔记" : n + " notes";
}

function isAutoLine(line?: string): boolean {
	if (!line) return false;
	const s = line.trim();
	return /^\d+\s*篇笔记$/.test(s) || /^\d+\s*notes?$/i.test(s);
}

function inFolder(file: TFile, folder: string): boolean {
	if (!folder) return false;
	return file.path === folder + ".md" || file.path.startsWith(folder + "/");
}

function skipped(path: string, skipPaths: string[]): boolean {
	if (path.includes("/attachments/")) return true;
	return skipPaths.some((s) => path === s || path.startsWith(s + "/"));
}

function weakBasename(file: TFile): boolean {
	return /^\d{4}-\d{2}-\d{2}\b/.test(file.basename) || /quick$/i.test(file.basename);
}

function titleOf(file: TFile): string {
	if (weakBasename(file)) return "";
	if (file.basename === "BACKLOG") return "Backlog";
	return file.basename;
}

function frontmatterTitle(app: App, file: TFile): string {
	const raw = app.metadataCache.getFileCache(file)?.frontmatter?.title;
	if (typeof raw === "string" && raw.trim()) return raw.trim();
	if (Array.isArray(raw) && raw.length && String(raw[0]).trim()) return String(raw[0]).trim();
	return "";
}

function firstH1(app: App, file: TFile, body: string): string {
	const heading = app.metadataCache.getFileCache(file)?.headings?.find((h) => h.level === 1);
	if (heading?.heading?.trim()) return heading.heading.trim();
	for (const raw of body.split("\n")) {
		const m = raw.trim().match(/^#\s+(.+)$/);
		if (m) return m[1].replace(/\s+#+\s*$/, "").trim();
	}
	return "";
}

function firstReadableFrom(body: string): string {
	for (const raw of body.split("\n")) {
		let ln = raw.trim();
		if (!ln) continue;
		if (ln === "---" || ln === "***" || ln === "___") continue;
		if (ln.startsWith("```") || ln.startsWith("`")) continue;
		if (ln.startsWith("#")) continue;
		if (ln.startsWith("!")) continue;
		if (ln.startsWith(">")) continue;
		ln = ln
			.replace(/^[-*+]\s+\[[ xX]\]\s*/, "")
			.replace(/^[-*+]\s+/, "")
			.replace(/^\d+\.\s+/, "")
			.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
			.replace(/\[\[([^\]|]+)(\|[^\]]*)?\]\]/g, (_m, p1, p2) => (p2 ? String(p2).slice(1) : p1))
			.replace(/`[^`]+`/g, "")
			.replace(/[*_]/g, "")
			.replace(/\s+/g, " ")
			.trim();
		if (ln.length < 2) continue;
		return ln.slice(0, 48);
	}
	return "";
}

function stripFrontmatter(text: string): string {
	if (!text.startsWith("---")) return text;
	const end = text.indexOf("\n---", 3);
	if (end === -1) return text;
	return text.slice(end + 4);
}

async function noteCardCopy(app: App, file: TFile): Promise<{ title: string; line: string }> {
	if (file.basename === "BACKLOG") return { title: "Backlog", line: "" };
	let body = "";
	try {
		body = stripFrontmatter(await app.vault.cachedRead(file));
	} catch {
		/* ignore */
	}
	const yaml = frontmatterTitle(app, file);
	const h1 = firstH1(app, file, body);
	const sentence = firstReadableFrom(body);
	const base = file.basename;
	const title = yaml || h1 || sentence || (weakBasename(file) ? "" : titleOf(file)) || base;
	const line = sentence && sentence !== title ? sentence : "";
	return { title, line };
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
		return this.plugin.settings.title || DEFAULT_TITLE;
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
		return this.plugin.settings.rooms.filter((r) => !r.parent && !r.draft);
	}

	childrenOf(id: string): Room[] {
		return this.plugin.settings.rooms.filter((r) => r.parent === id && !r.draft);
	}

	isQuietLine(room: Room): boolean {
		if (room.quiet) return true;
		if (!room.parent) return false;
		const parent = this.plugin.settings.rooms.find((r) => r.id === room.parent);
		return parent ? this.isQuietLine(parent) : false;
	}

	liveFolders(): { id: string; folder: string; kicker: string }[] {
		const out: { id: string; folder: string; kicker: string }[] = [];
		for (const room of this.plugin.settings.rooms) {
			if (room.draft) continue;
			if (this.isQuietLine(room)) continue;
			if (!room.folder) continue;
			out.push({
				id: room.id,
				folder: room.folder,
				kicker: room.kicker || room.name,
			});
		}
		return out;
	}

	ownerOf(
		file: TFile,
		live: { id: string; folder: string; kicker: string }[]
	): { id: string; folder: string; kicker: string } | undefined {
		let best: { id: string; folder: string; kicker: string } | undefined;
		for (const room of live) {
			if (!inFolder(file, room.folder)) continue;
			if (!best || room.folder.length > best.folder.length) best = room;
		}
		return best;
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
		else if (page.type === "more") await this.renderMore(inner, page);
		else await this.renderFolder(inner, page);
	}

	async renderHome(inner: HTMLElement) {
		const title = this.plugin.settings.title || DEFAULT_TITLE;
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
		const recent = this.recentNotes();
		for (const file of recent) {
			const copy = await noteCardCopy(this.app, file);
			const hit = this.ownerOf(file, live);
			this.card(
				recentGrid,
				{
					kicker: hit?.kicker || "Note",
					title: copy.title,
					line: copy.line,
					note: true,
				},
				() => {
					void this.openNote(file);
				}
			);
		}
	}

	recentNotes(): TFile[] {
		const live = this.liveFolders();
		const skip = this.plugin.settings.skipPaths;
		const files = this.app.vault.getMarkdownFiles().filter((f) => {
			if (!this.ownerOf(f, live)) return false;
			if (skipped(f.path, skip)) return false;
			if (f.basename === "BACKLOG" || f.basename.startsWith("BACKLOG")) return false;
			return true;
		});
		const buckets = new Map<string, TFile[]>();
		for (const file of files) {
			const owner = this.ownerOf(file, live);
			if (!owner) continue;
			const list = buckets.get(owner.id) || [];
			list.push(file);
			buckets.set(owner.id, list);
		}
		for (const list of buckets.values()) {
			list.sort((a, b) => b.stat.mtime - a.stat.mtime);
		}
		const rooms = Array.from(buckets.values())
			.filter((list) => list.length)
			.sort((a, b) => b[0].stat.mtime - a[0].stat.mtime);
		const picked: TFile[] = [];
		const seen = new Set<string>();
		for (const list of rooms) {
			if (picked.length >= RECENT_CAP) break;
			picked.push(list[0]);
			seen.add(list[0].path);
		}
		if (picked.length < RECENT_CAP) {
			const rest = files
				.filter((f) => !seen.has(f.path))
				.sort((a, b) => b.stat.mtime - a.stat.mtime);
			for (const file of rest) {
				if (picked.length >= RECENT_CAP) break;
				picked.push(file);
			}
		}
		return picked;
	}

	renderGroup(inner: HTMLElement, room: Room) {
		const title = this.plugin.settings.title || DEFAULT_TITLE;
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
		const title = this.plugin.settings.title || DEFAULT_TITLE;
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
			const copy = await noteCardCopy(this.app, file);
			this.card(
				grid,
				{ kicker: page.kicker, title: copy.title, line: copy.line, note: true },
				() => {
					void this.openNote(file);
				}
			);
		}
		if (rest > 0) {
			this.card(
				grid,
				{
					title: "其余 " + rest + " 条",
					note: true,
					quiet: true,
				},
				() => {
					this.push({
						type: "more",
						title: page.title,
						folder: page.folder,
						kicker: page.kicker,
						parentLabel: page.parentLabel,
						pinBacklog: page.pinBacklog,
						maxNotes: page.maxNotes,
						skip: cap,
					});
				}
			);
		}
		if (!notes.length && !subs.length && !backlog) {
			inner.createEl("p", { cls: "an-tou-lede", text: "这一格还没有笔记。" });
		}
	}

	async renderMore(inner: HTMLElement, page: Extract<Page, { type: "more" }>) {
		this.nav(
			inner,
			[{ label: "← " + page.title, go: () => this.back() }],
			page.folder
		);
		inner.createEl("h1", { text: page.title });
		const notes = this.mdIn(page.folder)
			.filter((f) => f.basename !== "BACKLOG" && f.basename !== "BACKLOG-archive")
			.sort((a, b) => b.stat.mtime - a.stat.mtime)
			.slice(page.skip);
		inner.createEl("p", {
			cls: "an-tou-lede",
			text: notes.length ? "其余 " + notes.length + " 条" : "没有更多笔记。",
		});
		const grid = inner.createDiv({ cls: "an-tou-grid" });
		for (const file of notes) {
			const copy = await noteCardCopy(this.app, file);
			this.card(
				grid,
				{ kicker: page.kicker, title: copy.title, line: copy.line, note: true },
				() => {
					void this.openNote(file);
				}
			);
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
					this.plugin.settings.title = v.trim() || DEFAULT_TITLE;
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

		this.fillHelp(containerEl.createDiv({ cls: "an-tou-help-inline" }), t);

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

		const drafts = this.plugin.settings.rooms.filter((r) => r.draft);
		const rest = this.plugin.settings.rooms.filter((r) => !r.draft);
		for (const room of drafts.concat(rest)) {
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
		this.plugin.settings.rooms.unshift({
			id: "room-" + Date.now().toString(36),
			name: t.newRoom,
			draft: true,
		});
		await this.saveAndRefresh();
		this.display();
	}

	async saveRoom(id: string) {
		const rooms = this.plugin.settings.rooms;
		const i = rooms.findIndex((r) => r.id === id);
		if (i < 0) return;
		const [room] = rooms.splice(i, 1);
		delete room.draft;
		rooms.push(room);
		await this.saveAndRefresh();
		this.display();
	}

	async rebuildRooms() {
		this.plugin.settings.rooms = this.plugin.mergeRooms(this.plugin.scanRooms());
		await this.saveAndRefresh();
		this.display();
		new Notice(this.copy().fromVaultNotice);
	}

	drawRoom(containerEl: HTMLElement, room: Room, t: Copy) {
		const wrap = containerEl.createDiv({
			cls: "an-tou-room-edit" + (room.draft ? " is-draft" : ""),
		});
		const head = new Setting(wrap)
			.setName(room.name || t.newRoom)
			.setDesc(t.roomId + " · " + room.id + "\n" + this.roomRole(room, t));
		if (room.draft) {
			head.addButton((b) =>
				b.setButtonText(t.saveRoom)
					.setCta()
					.onClick(() => {
						void this.saveRoom(room.id);
					})
			);
		}
		head.addExtraButton((b) =>
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
		if (this.hasBacklogFile(room)) {
			new Setting(grid).setName(t.backlogNote).setDesc(t.backlogNoteDesc);
		} else if (room.pinBacklog) {
			new Setting(grid)
				.setName(t.pinBacklog)
				.setDesc(t.pinBacklogDesc)
				.addToggle((box) =>
					box.setValue(true).onChange((v) => {
						room.pinBacklog = v;
						void this.saveAndRefresh();
					})
				);
		}
	}

	hasBacklogFile(room: Room): boolean {
		if (!room.folder) return false;
		const f = this.app.vault.getAbstractFileByPath(room.folder + "/BACKLOG.md");
		return f instanceof TFile;
	}

	roomRole(room: Room, t: Copy): string {
		if (room.draft) return t.draftHint;
		if (room.parent) return t.roleNested + room.parent;
		if (room.folder) return t.roleHomeFolder;
		return t.roleGroup;
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

	fillHelp(pop: HTMLElement, t: Copy) {
		pop.createDiv({ cls: "an-tou-help-kicker-line", text: t.helpTitle });

		const demo = pop.createDiv({ cls: "an-tou-help-demo" });
		const card = demo.createDiv({ cls: "an-tou-help-card" });
		card.createSpan({ cls: "an-tou-help-kicker", text: "Inbox" });
		card.createSpan({ cls: "an-tou-help-count", text: "3" });
		card.createEl("strong", { text: "入口" });
		card.createSpan({ cls: "an-tou-help-line", text: "今天这一张" });

		const keys = demo.createDiv({ cls: "an-tou-help-keys" });
		const addKey = (cls: string, cap: string, sample: string) => {
			const row = keys.createDiv({ cls: "an-tou-help-key" });
			row.createSpan({ cls: "an-tou-help-swatch " + cls });
			row.createSpan({ text: cap + " · " + sample });
		};
		addKey("is-kicker", t.helpKickerCap, "Inbox");
		addKey("is-name", t.helpNameCap, "入口");
		addKey("is-line", t.helpLineCap, "今天这一张");
		addKey("is-folder", t.helpFolderCap, "00-Inbox");
		addKey("is-count", t.helpCountCap, "3");

		pop.createDiv({ cls: "an-tou-help-note", text: t.helpFolderNote });

		const nest = pop.createDiv({ cls: "an-tou-help-nest" });
		nest.createDiv({ cls: "an-tou-help-kicker-line", text: t.helpParentCap });
		const home = nest.createDiv({ cls: "an-tou-help-flow" });
		home.createSpan({ cls: "an-tou-help-chip", text: t.helpHome });
		const cab = home.createDiv({ cls: "an-tou-help-mini" });
		cab.createSpan({ cls: "an-tou-help-kicker", text: "Cabinet" });
		cab.createEl("strong", { text: "收纳柜" });
		cab.createSpan({ cls: "an-tou-help-id", text: "cabinet" });
		home.createSpan({ cls: "an-tou-help-arrow", text: "↓" });
		home.createSpan({ cls: "an-tou-help-chip", text: t.helpInside });
		const child = home.createDiv({ cls: "an-tou-help-mini" });
		child.createSpan({ cls: "an-tou-help-kicker", text: "Thinking" });
		child.createEl("strong", { text: "个人思考" });
		child.createSpan({ cls: "an-tou-help-id", text: "cabinet" });
		nest.createDiv({ cls: "an-tou-help-note", text: t.helpParentNote });

		pop.createDiv({ cls: "an-tou-help-note", text: t.helpQuietNote });
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
		if (!this.settings.title || this.settings.title === "An Tou") {
			this.settings.title = DEFAULT_TITLE;
		}

		this.registerView(VIEW_TYPE, (leaf) => new DeskView(leaf, this));
		this.addCommand({
			id: "open-desk",
			name: "Open Quiet Desk",
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
		const used = new Set<string>();
		const skip = this.settings.skipPaths;
		const zh = this.settings.uiLang !== "en";
		const root = this.app.vault.getRoot();
		for (const child of root.children) {
			if (!(child instanceof TFolder)) continue;
			if (child.name.startsWith(".")) continue;
			if (skipped(child.path, skip)) continue;
			const id = uniqueId(slug(child.name), used);
			const n = this.mdCount(child.path);
			const room: Room = {
				id,
				name: child.name,
				folder: child.path,
				kicker: kickerOf(child.name),
			};
			const line = noteCountLine(n, zh);
			if (line) room.line = line;
			rooms.push(room);
			for (const sub of child.children) {
				if (!(sub instanceof TFolder)) continue;
				if (sub.name.startsWith(".")) continue;
				if (skipped(sub.path, skip)) continue;
				const sid = uniqueId(slug(sub.name), used);
				const sn = this.mdCount(sub.path);
				const childRoom: Room = {
					id: sid,
					name: sub.name,
					folder: sub.path,
					kicker: kickerOf(sub.name),
					parent: id,
				};
				const childLine = noteCountLine(sn, zh);
				if (childLine) childRoom.line = childLine;
				rooms.push(childRoom);
			}
		}
		return rooms;
	}

	mdCount(folder: string): number {
		const skip = this.settings.skipPaths;
		return this.app.vault.getMarkdownFiles().filter((f) => {
			if (!inFolder(f, folder)) return false;
			if (skipped(f.path, skip)) return false;
			return true;
		}).length;
	}

	mergeRooms(scanned: Room[]): Room[] {
		const all = this.settings.rooms.slice();
		const usedIds = new Set(all.map((r) => r.id));
		const byFolder = new Map<string, Room>();
		for (const room of all) {
			if (room.folder) byFolder.set(room.folder, room);
		}
		const idMap = new Map<string, string>();

		for (const s of scanned) {
			if (!s.folder) continue;
			const hit = byFolder.get(s.folder);
			if (hit) idMap.set(s.id, hit.id);
		}

		for (const s of scanned) {
			if (s.parent || !s.folder || idMap.has(s.id)) continue;
			const prefix = s.folder + "/";
			const parents = new Set<string>();
			for (const room of all) {
				if (!room.folder || !room.folder.startsWith(prefix)) continue;
				if (room.parent) parents.add(room.parent);
			}
			if (parents.size !== 1) continue;
			const pid = [...parents][0];
			idMap.set(s.id, pid);
			const parent = all.find((r) => r.id === pid);
			if (!parent) continue;
			if (!parent.folder) parent.folder = s.folder;
			if (parent.kicker === "ROOM") parent.kicker = s.kicker;
			if (isAutoLine(parent.line)) parent.line = s.line;
		}

		for (const s of scanned) {
			const eid = idMap.get(s.id);
			if (!eid) continue;
			const ex = all.find((r) => r.id === eid);
			if (!ex) continue;
			if (ex.kicker === "ROOM") ex.kicker = s.kicker;
			if (isAutoLine(ex.line)) ex.line = s.line;
		}

		for (const s of scanned) {
			if (idMap.has(s.id)) continue;
			let parent = s.parent;
			if (parent) {
				const mapped = idMap.get(parent);
				if (mapped) parent = mapped;
			}
			const id = uniqueId(s.id, usedIds);
			idMap.set(s.id, id);
			const room: Room = { ...s, id };
			if (parent) room.parent = parent;
			else delete room.parent;
			all.push(room);
			if (room.folder) byFolder.set(room.folder, room);
		}
		return all;
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
