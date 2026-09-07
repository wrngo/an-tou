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

interface AnTouSettings {
	title: string;
	openOnStart: boolean;
	collapseExplorer: boolean;
	applyLook: boolean;
	skipPaths: string[];
	rooms: Room[];
}

const DEFAULT_SETTINGS: AnTouSettings = {
	title: "An Tou",
	openOnStart: true,
	collapseExplorer: true,
	applyLook: true,
	skipPaths: [],
	rooms: [],
};

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

function inboxStamp(): string {
	const d = new Date();
	const p = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}${p(d.getMinutes())}`;
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
		this._tid = window.setTimeout(() => this.render(), 200);
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
		this.render();
	}

	back() {
		if (this.stack.length > 1) {
			this.stack.pop();
			this.render();
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

	async newNote(folder: string) {
		if (!folder) return;
		if (!this.app.vault.getAbstractFileByPath(folder)) {
			new Notice("文件夹不在。");
			return;
		}
		const preset = isInboxFolder(folder) ? inboxStamp() : "";
		new NameModal(this.app, preset, async (raw) => {
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
				this.newNote(folder);
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
				() => this.openNote(file)
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
			this.render();
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
				() => this.openNote(backlog)
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
				() => this.openNote(file)
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

	display() {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "An Tou" });

		new Setting(containerEl)
			.setName("Desk title")
			.setDesc("Shown on the home cards and the tab.")
			.addText((t) =>
				t.setValue(this.plugin.settings.title).onChange(async (v) => {
					this.plugin.settings.title = v.trim() || "An Tou";
					await this.plugin.saveSettings();
					this.plugin.refreshDesks();
				})
			);

		new Setting(containerEl)
			.setName("换上这套外观")
			.setDesc("薄荷绿底和衬线字。关掉就只留卡片书桌，颜色仍用你现在的主题。")
			.addToggle((t) =>
				t.setValue(this.plugin.settings.applyLook !== false).onChange(async (v) => {
					this.plugin.settings.applyLook = v;
					await this.plugin.saveSettings();
					this.plugin.applyLook();
				})
			);

		new Setting(containerEl)
			.setName("Open on start")
			.setDesc("Show the desk when the vault opens, instead of the last note.")
			.addToggle((t) =>
				t.setValue(this.plugin.settings.openOnStart).onChange(async (v) => {
					this.plugin.settings.openOnStart = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Collapse file explorer")
			.addToggle((t) =>
				t.setValue(this.plugin.settings.collapseExplorer).onChange(async (v) => {
					this.plugin.settings.collapseExplorer = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Skip paths")
			.setDesc("Comma-separated folder prefixes to hide from cards and recents.")
			.addText((t) =>
				t.setValue(this.plugin.settings.skipPaths.join(", ")).onChange(async (v) => {
					this.plugin.settings.skipPaths = v
						.split(",")
						.map((s) => s.trim())
						.filter(Boolean);
					await this.plugin.saveSettings();
					this.plugin.refreshDesks();
				})
			);

		new Setting(containerEl)
			.setName("Rooms")
			.setDesc("Each room is a card. Leave folder empty to make a group of child rooms. Set parent to a room id.")
			.addButton((b) =>
				b.setButtonText("Add room").onClick(async () => {
					this.plugin.settings.rooms.push({
						id: "room-" + Date.now().toString(36),
						name: "New room",
						kicker: "ROOM",
					});
					await this.plugin.saveSettings();
					this.display();
					this.plugin.refreshDesks();
				})
			)
			.addButton((b) =>
				b.setButtonText("From vault folders").onClick(async () => {
					this.plugin.settings.rooms = this.plugin.scanRooms();
					await this.plugin.saveSettings();
					this.display();
					this.plugin.refreshDesks();
					new Notice("Rooms rebuilt from top-level folders.");
				})
			);

		for (const room of this.plugin.settings.rooms) {
			this.drawRoom(containerEl, room);
		}
	}

	drawRoom(containerEl: HTMLElement, room: Room) {
		const wrap = containerEl.createDiv({ cls: "an-tou-room-edit" });
		new Setting(wrap)
			.setName(room.name)
			.setDesc(room.id)
			.addText((t) =>
				t.setPlaceholder("Name").setValue(room.name).onChange(async (v) => {
					room.name = v;
					await this.plugin.saveSettings();
					this.plugin.refreshDesks();
				})
			)
			.addText((t) =>
				t.setPlaceholder("Folder").setValue(room.folder || "").onChange(async (v) => {
					room.folder = v.trim() || undefined;
					await this.plugin.saveSettings();
					this.plugin.refreshDesks();
				})
			)
			.addExtraButton((b) =>
				b.setIcon("trash").setTooltip("Remove").onClick(async () => {
					this.plugin.settings.rooms = this.plugin.settings.rooms.filter((r) => r.id !== room.id);
					await this.plugin.saveSettings();
					this.display();
					this.plugin.refreshDesks();
				})
			);

		new Setting(wrap)
			.setName("Label")
			.addText((t) =>
				t.setPlaceholder("Kicker").setValue(room.kicker || "").onChange(async (v) => {
					room.kicker = v;
					await this.plugin.saveSettings();
					this.plugin.refreshDesks();
				})
			)
			.addText((t) =>
				t.setPlaceholder("Line").setValue(room.line || "").onChange(async (v) => {
					room.line = v;
					await this.plugin.saveSettings();
					this.plugin.refreshDesks();
				})
			)
			.addText((t) =>
				t.setPlaceholder("Parent id").setValue(room.parent || "").onChange(async (v) => {
					room.parent = v.trim() || undefined;
					await this.plugin.saveSettings();
					this.plugin.refreshDesks();
				})
			)
			.addToggle((t) =>
				t.setValue(!!room.quiet).onChange(async (v) => {
					room.quiet = v;
					await this.plugin.saveSettings();
					this.plugin.refreshDesks();
				})
			);
	}
}

export default class AnTouPlugin extends Plugin {
	settings: AnTouSettings = DEFAULT_SETTINGS;

	async onload() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		if (!Array.isArray(this.settings.rooms)) this.settings.rooms = [];
		if (!Array.isArray(this.settings.skipPaths)) this.settings.skipPaths = [];

		this.registerView(VIEW_TYPE, (leaf) => new DeskView(leaf, this));
		this.addCommand({
			id: "open-desk",
			name: "Open desk",
			callback: () => this.activateView(),
		});
		this.addSettingTab(new AnTouSettingTab(this.app, this));
		this.applyLook();
		this.app.workspace.onLayoutReady(async () => {
			if (this.settings.rooms.length === 0) {
				this.settings.rooms = this.scanRooms();
				await this.saveSettings();
			}
			if (this.settings.openOnStart) this.activateView();
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
			await workspace.revealLeaf(leaf);
		}
		if (this.settings.collapseExplorer && workspace.leftSplit) {
			workspace.leftSplit.collapse();
		}
	}
}
