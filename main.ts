import {
	AbstractInputSuggest,
	App,
	ItemView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TAbstractFile,
	TFile,
	TFolder,
	WorkspaceLeaf,
	setIcon,
} from "obsidian";

const VIEW_TYPE = "an-tou-desk";
const DEFAULT_TITLE = "格物成栖";
const RECENT_CAP = 6;
const SEARCH_CAP = 30;

interface Room {
	id: string;
	name: string;
	folder?: string;
	kicker?: string;
	line?: string;
	quiet?: boolean;
	parent?: string;
	maxNotes?: number;
	draft?: boolean;
	stale?: boolean;
}

type UiLang = "zh" | "en";

interface AnTouSettings {
	title: string;
	openOnStart: boolean;
	collapseExplorer: boolean;
	applyLook: boolean;
	applySerif: boolean;
	hideRibbon: boolean;
	skipPaths: string[];
	skipSeeded: boolean;
	rooms: Room[];
	uiLang: UiLang;
	welcomed: boolean;
	captureRoom: string;
	drawRoom: string;
}

const DEFAULT_SETTINGS: AnTouSettings = {
	title: DEFAULT_TITLE,
	openOnStart: true,
	collapseExplorer: true,
	applyLook: true,
	applySerif: true,
	hideRibbon: false,
	skipPaths: ["attachments"],
	skipSeeded: false,
	rooms: [],
	uiLang: "zh",
	welcomed: false,
	captureRoom: "",
	drawRoom: "",
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
		look: "薄荷绿配色",
		lookDesc: "书桌底色、毛玻璃卡片，以及状态栏和标签栏。关掉就全部改用你当前主题。",
		serif: "衬线字体",
		serifDesc: "书桌标题、卡片大字，还有笔记正文。关掉就用主题自己的字体。",
		hideRibbon: "隐藏左边的图标栏",
		hideRibbonDesc: "关掉就显示最左边那排图标，底下有设置。打开就整栏藏起来。",
		ribbonSettings: "打开设置",
		ribbonHelp: "帮助",
		sectionDraft: "还没保存",
		sectionHome: "首页 · {n} 张",
		sectionNested: "收在「{name}」里 · {n} 张",
		sectionOrphan: "所属卡片已失效",
		openOnStart: "打开库时进入书桌",
		openOnStartDesc: "启动时打开书桌，而不是上次那篇笔记。",
		collapse: "收起文件列表",
		collapseDesc: "关掉就显示左边的文件树；打开就收起来。",
		skip: "跳过这些路径",
		skipDesc: "用逗号分隔。这些文件夹不会出现在卡片和「最近」里。",
		rooms: "房间",
		roomsDesc: "下面这张图就是书桌卡片，对照着填就行。",
		addRoom: "加一张卡片",
		addHomeCard: "添加首页卡片",
		quietAdd: "加一张卡片",
		emptyRooms: "还没有房间。打开设置加一张。",
		searchPlaceholder: "搜一下…",
		searchClear: "清除搜索",
		searchNone: "没找到。换个词试试。",
		searchHead: (n: number) => n + " 条结果",
		searchMore: (n: number) => "还有 " + n + " 条，把词再收窄一点。",
		searchOther: "库内其他",
		fromVault: "按库根目录生成",
		fromVaultNotice: "已按文件夹更新房间。已有名称、说明和开关没动。",
		roomId: "编号",
		remove: "删除这个房间",
		name: "名称",
		nameDesc: "卡片正中间最大的那行字。",
		folder: "文件夹",
		folderDesc: "库里的路径，比如 00-收件箱。收纳柜这种分组请留空。",
		folderMissing: "库里没有这个文件夹。",
		folderDidYouMean: "你是不是想填 {folder}？",
		kicker: "左上角小字",
		kickerDesc: "卡片左上角那一行，比如 Inbox。",
		line: "底下那行说明",
		lineDesc: "标题下面那句，写这格是干什么的。",
		parent: "放进哪个房间",
		parentDesc: "选「不放，留在首页」它就留在首页；选另一个房间，它就收进那张卡里。",
		parentNone: "不放，留在首页",
		parentMissing: "⚠️ {id}（不存在）",
		parentUnselectable: "⚠️ {name}（当前值，不能再选）",
		quiet: "卡片变淡",
		quietDesc: "打开后这张卡变淡，里面的笔记也不进「最近」。",
		maxNotes: "最多显示几张",
		maxNotesDesc: "这个房间里最多显示多少张笔记卡片。留空就自动决定。",
		newRoom: "新房间",
		saveRoom: "保存",
		draftHint: "未保存。填好后点保存，这张卡会移到最下面。",
		deleteTitle: "删掉「{name}」？",
		deleteHolds: "里面还收着 {n} 个房间。删掉之后它们会回到首页，它们自己的子房间跟着一起走。",
		deleteNotesSafe: "你的笔记和文件夹一个都不会动。",
		deleteConfirm: "删掉",
		deleteCancel: "算了",
		roleGroup: "首页分组 · {n} 个子房间",
		roleHome: "首页 · {folder}",
		roleNested: "收在「{name}」里",
		roleParentMissing: "父房间不存在，这张卡不会显示",
		helpTitle: "书桌卡片长这样",
		helpKickerCap: "左上角小字",
		helpNameCap: "名称",
		helpLineCap: "底下那行说明",
		helpFolderCap: "文件夹",
		helpFolderNote: "填 00-收件箱 这类路径。留空的话，点进去看到的是子房间，不是笔记。",
		helpParentCap: "放进哪个房间",
		helpParentNote: "在「放进哪个房间」里选「收纳柜」，这张卡就从首页收进柜子里。",
		helpQuietCap: "卡片变淡",
		helpQuietNote: "打开后这张卡变淡，里面的笔记也不出现在「最近」。",
		helpCountCap: "数量，不用填",
		helpHome: "首页",
		helpInside: "点进收纳柜之后",
		sampleName: "入口",
		sampleLine: "今天这一张",
		sampleCabinet: "收纳柜",
		sampleThinking: "个人思考",
		staleFolder: "文件夹已不存在",
		roleGroupHidden: "（文件夹 {folder} 里的笔记不会显示）",
		roleNoFolder: "还没配文件夹，点了没反应",
		maxNotesBad: "只能填大于 0 的整数，留空就自动决定。",
		nameRequired: "先给这个房间起个名字。",
		recent: "最近",
		recentRootKicker: "库根",
		noMoreNotes: "没有更多笔记。",
		emptyFolder: "这一格还没有笔记。",
		newNote: "新笔记",
		newNotePlaceholder: "这篇叫什么",
		createFailed: "没写成。",
		folderGone: "文件夹不在。",
		untitled: "未命名",
		copyLink: "复制这篇的链接",
		copied: "链接已复制。贴回书桌搜索，或点它，就能打开这篇",
		copyDesk: "书桌链接",
		copyWiki: "库内 [[wikilink]]",
		copiedWiki: "已复制库内链接。贴进别的笔记就能链过去。",
		copyFailed: "没复制上。",
		today: "今天",
		todayEmpty: "还没写。点这里从空白页开始，文件名就是今天的日期。",
		todayBlank: "还是空白。",
		inboxWaiting: "未处理",
		inboxEmpty: "收件箱是空的。",
		resumeKicker: "上次停在",
		resume: "继续上次",
		draw: "抽一张",
		drawEmpty: "这间没有笔记可抽。",
		drawKicker: (name: string) => name + " · 抽到",
		drawDest: "抽一张从哪抽",
		drawDestDesc: "自动会去找知识库这类卡片。指定一间之后，只从那一间的文件夹里抽，子文件夹里的笔记也算。",
		drawAuto: "自动（知识库）",
		renamed: "显示名已改。文件夹没动。",
		nested: (name: string) => "已收进「" + name + "」。笔记还在原来的文件夹。",
		nestBlocked: "不能收进它自己里面。",
		linkMissing: "没找到这篇笔记。",
		capture: "记一条",
		captureHint: (folder: string) => "会放进 " + folder,
		noCaptureFolder: "还没有能放的地方。去设置里给任意一张卡片配上文件夹。",
		captureDest: "记一条放哪",
		captureDestDesc: "自动：先找收件箱类的卡片，没有就用首页第一张有文件夹的。",
		captureAuto: "自动",
		more: (n: number) => "其余 " + n + " 条",
		noteCount: (n: number) => n + " 篇笔记",
		welcomeTitle: "书桌准备好了",
		welcomeSub: "在动你的库之前，先说清楚我做了什么。",
		welcomePoint1: "换上了薄荷绿配色和衬线字，随时可以在设置里关掉",
		welcomePoint2: "把左边的文件树收起来了，点一下就能拉回来",
		welcomePoint3: "没有隐藏左边那排图标，想更清爽可以自己去开",
		welcomePoint4: "你的笔记和文件夹一个都没动过",
		welcomePick: (n: number) => "你的库里有 " + n + " 个文件夹。挑几个放首页：",
		welcomeAddAll: "全都放上去",
		welcomeStart: "就用选中的这几个，开始",
	},
	en: {
		language: "Language",
		languageDesc: "Settings copy only. Card titles stay whatever you typed.",
		chinese: "中文",
		english: "English",
		desk: "Desk",
		title: "Desk title",
		titleDesc: "The large heading on the home cards and the tab.",
		look: "Mint palette",
		lookDesc: "Desk paper, glass cards, and transparent chrome. Off uses your current theme everywhere.",
		serif: "Serif type",
		serifDesc: "Desk titles, card names, and note text. Off uses your theme fonts.",
		hideRibbon: "Hide the ribbon",
		hideRibbonDesc: "Off shows the left icon bar, with Settings at the bottom. On hides the bar.",
		ribbonSettings: "Open settings",
		ribbonHelp: "Help",
		sectionDraft: "Unsaved",
		sectionHome: "Home · {n}",
		sectionNested: "Inside \"{name}\" · {n}",
		sectionOrphan: "Parent missing",
		openOnStart: "Open on start",
		openOnStartDesc: "Show the desk when the vault opens, instead of the last note.",
		collapse: "Collapse file explorer",
		collapseDesc: "Off shows the left file tree. On folds it.",
		skip: "Skip these paths",
		skipDesc: "Comma-separated folder prefixes hidden from cards and recents.",
		rooms: "Rooms",
		roomsDesc: "The picture below is a desk card. Fill the fields to match.",
		addRoom: "Add a card",
		addHomeCard: "Add a home card",
		quietAdd: "Add a card",
		emptyRooms: "No rooms yet. Add one in settings.",
		searchPlaceholder: "Search…",
		searchClear: "Clear search",
		searchNone: "Nothing found. Try another word.",
		searchHead: (n: number) => n + (n === 1 ? " result" : " results"),
		searchMore: (n: number) => n + " more — narrow your words.",
		searchOther: "Elsewhere in the vault",
		fromVault: "Build from top-level folders",
		fromVaultNotice: "Rooms updated from folders. Names, captions, and toggles were kept.",
		roomId: "Id",
		remove: "Remove this room",
		name: "Name",
		nameDesc: "The large title in the middle of the card.",
		folder: "Folder",
		folderDesc: "A vault path such as 00-Inbox. Leave empty for a group like Cabinet.",
		folderMissing: "No such folder in the vault.",
		folderDidYouMean: "Did you mean {folder}?",
		kicker: "Top-left text",
		kickerDesc: "The small line at the top-left, such as Inbox.",
		line: "Caption under the title",
		lineDesc: "The sentence under the title, what this room is for.",
		parent: "Put inside this room",
		parentDesc: "Pick \"Leave on home\" to keep it on the home grid, or pick the room it should live inside.",
		parentNone: "Leave on home",
		parentMissing: "⚠️ {id} (missing)",
		parentUnselectable: "⚠️ {name} (current, not selectable)",
		quiet: "Fade the card",
		quietDesc: "The card fades, and its notes stay out of recents.",
		maxNotes: "Max notes shown",
		maxNotesDesc: "How many note cards this room shows at most. Empty means automatic.",
		newRoom: "New room",
		saveRoom: "Save",
		draftHint: "Unsaved. Fill it in, then save, and it moves to the bottom.",
		deleteTitle: "Delete \"{name}\"?",
		deleteHolds: "It holds {n} rooms. They move back to home, and their own children come with them.",
		deleteNotesSafe: "Your notes and folders are untouched.",
		deleteConfirm: "Delete",
		deleteCancel: "Cancel",
		roleGroup: "Home group · {n} children",
		roleHome: "Home · {folder}",
		roleNested: "Inside \"{name}\"",
		roleParentMissing: "Parent missing — this card is hidden",
		helpTitle: "A desk card looks like this",
		helpKickerCap: "Top-left text",
		helpNameCap: "Name",
		helpLineCap: "Caption under the title",
		helpFolderCap: "Folder",
		helpFolderNote: "A path like 00-Inbox. Leave empty and this card is only a group.",
		helpParentCap: "Put inside this room",
		helpParentNote: "Pick \"Cabinet\" under \"Put inside this room\" and the card leaves the home grid.",
		helpQuietCap: "Fade the card",
		helpQuietNote: "The card fades, and its notes stay out of recents.",
		helpCountCap: "Count, automatic",
		helpHome: "Home",
		helpInside: "After you open Cabinet",
		sampleName: "Inbox",
		sampleLine: "Today's one",
		sampleCabinet: "Cabinet",
		sampleThinking: "Thinking",
		staleFolder: "Folder is gone",
		roleGroupHidden: " (notes in {folder} stay hidden)",
		roleNoFolder: "No folder yet — this card does nothing",
		maxNotesBad: "Whole number above zero, or leave it empty.",
		nameRequired: "Give the room a name first.",
		recent: "Recent",
		recentRootKicker: "Vault root",
		noMoreNotes: "No more notes.",
		emptyFolder: "No notes in this room yet.",
		newNote: "New note",
		newNotePlaceholder: "What is it called",
		createFailed: "Could not create the note.",
		folderGone: "That folder is gone.",
		untitled: "Untitled",
		copyLink: "Copy link to this note",
		copied: "Link copied. Paste it in desk search, or open it, to get back.",
		copyDesk: "Desk link",
		copyWiki: "Vault [[wikilink]]",
		copiedWiki: "Vault link copied. Paste it into another note.",
		copyFailed: "Could not copy.",
		today: "Today",
		todayEmpty: "Nothing yet. Click to start a blank page named with today's date.",
		todayBlank: "Still blank.",
		inboxWaiting: "Waiting",
		inboxEmpty: "Inbox is empty.",
		resumeKicker: "Left off",
		resume: "Continue",
		draw: "Draw one",
		drawEmpty: "Nothing in that room to draw.",
		drawKicker: (name: string) => name + " · drawn",
		drawDest: "Where Draw one picks from",
		drawDestDesc: "Auto looks for a knowledge-style card. Pick a room to draw only from that folder, including notes in its subfolders.",
		drawAuto: "Auto (knowledge)",
		renamed: "Display name saved. The folder stayed put.",
		nested: (name: string) => "Tucked into \"" + name + "\". Notes stay in their folder.",
		nestBlocked: "A card can't go inside itself.",
		linkMissing: "That note is gone.",
		capture: "Jot a note",
		captureHint: (folder: string) => "Goes into " + folder,
		noCaptureFolder: "No room to put it in yet. Give one of the cards a folder in settings.",
		captureDest: "Where jotted notes go",
		captureDestDesc: "Auto: an inbox-like card first, else the first home card with a folder.",
		captureAuto: "Auto",
		more: (n: number) => n + " more",
		noteCount: (n: number) => n + " notes",
		welcomeTitle: "Your desk is ready",
		welcomeSub: "Before touching your vault, here is what changed.",
		welcomePoint1: "Mint palette and serif type — switch them off in settings anytime",
		welcomePoint2: "The file tree is folded — one click brings it back",
		welcomePoint3: "The ribbon is untouched — hide it yourself if you want",
		welcomePoint4: "Your notes and folders were not touched",
		welcomePick: (n: number) => "Your vault has " + n + " folders. Pick a few for the home grid:",
		welcomeAddAll: "Add all",
		welcomeStart: "Start with these",
	},
} as const;

type Copy = (typeof COPY)[UiLang];

type FolderPage = {
	title: string;
	folder: string;
	kicker: string;
	parentLabel: string;
	maxNotes?: number;
};

type Page =
	| { type: "home" }
	| { type: "welcome" }
	| { type: "group"; room: Room }
	| ({ type: "folder" } & FolderPage)
	| ({ type: "more" } & FolderPage & { skip: number });

type LiveFolder = { id: string; folder: string; kicker: string };

type VaultConfig = {
	getConfig?: (key: string) => unknown;
	setConfig?: (key: string, value: unknown) => void;
};

function setShowRibbon(app: App, show: boolean) {
	const vault = app.vault as unknown as VaultConfig;
	if (typeof vault.setConfig === "function") vault.setConfig("showRibbon", show);
}

type LeftRibbon = {
	ribbonSettingEl?: HTMLElement;
	show?: () => void;
	hide?: () => void;
	setCollapsedState?: (collapsed: boolean) => void;
};

function leftRibbonOf(app: App): LeftRibbon {
	return app.workspace.leftRibbon as unknown as LeftRibbon;
}

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

function noteCountLine(n: number, copy: Copy): string | undefined {
	if (n <= 0) return undefined;
	return copy.noteCount(n);
}

function isAutoLine(line?: string): boolean {
	if (!line) return false;
	const s = line.trim();
	return /^\d+\s*篇笔记$/.test(s) || /^\d+\s*notes?$/i.test(s);
}

function isAutoKicker(room: Room): boolean {
	if (!room.kicker || !room.folder) return false;
	const base = room.folder.slice(room.folder.lastIndexOf("/") + 1);
	return room.kicker === kickerOf(base);
}

function inFolder(file: TFile, folder: string): boolean {
	if (!folder) return false;
	return file.path === folder + ".md" || file.path.startsWith(folder + "/");
}

function skipped(path: string, skipPaths: string[]): boolean {
	return skipPaths.some((s) => path === s || path.startsWith(s + "/"));
}

function commonFolder(paths: string[]): string {
	const parts = paths.filter(Boolean).map((p) => p.split("/").filter(Boolean));
	if (!parts.length) return "";
	let n = parts[0].length;
	for (let i = 1; i < parts.length && n; i++) {
		let j = 0;
		while (j < n && j < parts[i].length && parts[i][j] === parts[0][j]) j++;
		n = j;
	}
	return parts[0].slice(0, n).join("/");
}

function weakBasename(file: TFile): boolean {
	return /^\d{4}-\d{2}-\d{2}\b/.test(file.basename) || /quick$/i.test(file.basename);
}

function titleOf(file: TFile): string {
	if (weakBasename(file)) return "";
	return file.basename;
}

function frontmatterTitle(app: App, file: TFile): string {
	const raw = app.metadataCache.getFileCache(file)?.frontmatter?.title;
	if (typeof raw === "string" && raw.trim()) return raw.trim();
	if (Array.isArray(raw) && raw.length && String(raw[0]).trim()) return String(raw[0]).trim();
	return "";
}

const SENTENCE_MAX = 60;
const SENTENCE_END = /[。！？!?]/;

function sentenceCut(ln: string): string {
	if (ln.length <= SENTENCE_MAX) return ln;
	let cut = -1;
	for (let i = 20; i < SENTENCE_MAX; i++) {
		if (SENTENCE_END.test(ln[i])) cut = i;
	}
	if (cut > 0) return ln.slice(0, cut + 1);
	return ln.slice(0, SENTENCE_MAX).replace(/\s+$/, "") + "…";
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
			.replace(/\s*\^[A-Za-z0-9-]+/g, "")
			.replace(/[\u200b-\u200d\ufeff]/g, "")
			.replace(/\s+/g, " ")
			.trim();
		if (ln.length < 2) continue;
		return sentenceCut(ln);
	}
	return "";
}

function stripFrontmatter(app: App, file: TFile, text: string): string {
	const offset = app.metadataCache.getFileCache(file)?.frontmatterPosition?.end?.offset;
	if (typeof offset === "number" && offset > 0 && offset <= text.length) {
		return text.slice(offset);
	}
	if (!text.startsWith("---")) return text;
	const end = text.indexOf("\n---", 3);
	if (end === -1) return text;
	return text.slice(end + 4);
}

type NoteCopy = { title: string; line: string; hay: string };

async function noteCardCopy(app: App, file: TFile): Promise<NoteCopy> {
	let body = "";
	try {
		body = stripFrontmatter(app, file, await app.vault.cachedRead(file));
	} catch {
		/* ignore */
	}
	const yaml = frontmatterTitle(app, file);
	const sentence = firstReadableFrom(body);
	const title = yaml || file.basename;
	const line = sentence && sentence !== title ? sentence : "";
	const hay = [title, line, file.basename, file.path, body].join("\n").toLowerCase();
	return { title, line, hay };
}

function noteUri(app: App, file: TFile): string {
	const vault = encodeURIComponent(app.vault.getName());
	const note = encodeURIComponent(file.path);
	return "obsidian://quiet-desk?vault=" + vault + "&note=" + note;
}

function parseDeskQuery(q: string): string | null {
	const raw = q.trim();
	if (!raw) return null;
	const wiki = raw.match(/^\[\[([^\]|#]+)(?:\|[^\]]*)?(?:#[^\]]*)?\]\]$/);
	if (wiki) return wiki[1].trim();
	if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
		if (!/^obsidian:\/\//i.test(raw)) return null;
		const qMark = raw.indexOf("?");
		if (qMark < 0) return null;
		const params = new URLSearchParams(raw.slice(qMark + 1));
		const note = params.get("note") || params.get("file") || params.get("path");
		return note?.trim() || null;
	}
	if (raw.endsWith(".md") || raw.includes("/")) return raw;
	return null;
}

function resolveNote(app: App, raw: string): TFile | null {
	const files = app.vault.getMarkdownFiles();
	const tryPath = (p: string) =>
		files.find((f) => f.path === p || f.path === p + ".md") ?? null;
	let file = tryPath(raw);
	if (file) return file;
	try {
		file = tryPath(decodeURIComponent(raw));
		if (file) return file;
	} catch {
		/* ignore */
	}
	const lower = raw.replace(/\.md$/i, "").toLowerCase();
	const hits = files.filter(
		(f) =>
			f.path.toLowerCase() === lower ||
			f.path.toLowerCase() === lower + ".md" ||
			f.basename.toLowerCase() === lower
	);
	if (hits.length === 1) return hits[0];
	const dest = app.metadataCache.getFirstLinkpathDest(raw.replace(/\.md$/i, ""), "");
	if (dest instanceof TFile && dest.extension === "md") return dest;
	return null;
}

function parentFolder(path: string): string {
	const i = path.lastIndexOf("/");
	return i === -1 ? "" : path.slice(0, i);
}

function roomCaption(room: Room, countShown: boolean): string | undefined {
	if (countShown && isAutoLine(room.line)) return undefined;
	return room.line;
}

async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}

function twoDigits(n: number): string {
	return (n < 10 ? "0" : "") + String(n);
}

function inboxStamp(): string {
	const d = new Date();
	return `${d.getFullYear()}-${twoDigits(d.getMonth() + 1)}-${twoDigits(d.getDate())} ${twoDigits(d.getHours())}${twoDigits(d.getMinutes())}`;
}

function safeName(name: string, copy: Copy): string {
	return name.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim() || copy.untitled;
}

function isInboxFolder(folder: string): boolean {
	return /inbox|收件|收集/i.test(folder);
}

function isDiaryRoom(room: Room): boolean {
	return /日记|日志|journal|daily|diary/i.test(
		(room.folder ?? "") + " " + room.name + " " + (room.kicker ?? "")
	);
}

function isKnowledgeRoom(room: Room): boolean {
	return /知识|读书|library|wiki|zettel|卡片/i.test(
		(room.folder ?? "") + " " + room.name + " " + (room.kicker ?? "")
	);
}

function todayName(): string {
	const d = new Date();
	return `${d.getFullYear()}-${twoDigits(d.getMonth() + 1)}-${twoDigits(d.getDate())}`;
}

function deskDateLine(lang: UiLang): string {
	const d = new Date();
	if (lang === "en") {
		return d.toLocaleDateString("en", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	}
	return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · 星期${"日一二三四五六"[d.getDay()]}`;
}

function blocksNest(rooms: Room[], childId: string, parentId: string): boolean {
	if (childId === parentId) return true;
	const blocked = new Set<string>();
	const walk = (id: string) => {
		if (blocked.has(id)) return;
		blocked.add(id);
		for (const room of rooms) {
			if (room.parent === id && room.id !== id) walk(room.id);
		}
	};
	walk(childId);
	return blocked.has(parentId);
}

function wikiLink(app: App, file: TFile): string {
	const same = app.vault.getMarkdownFiles().filter((f) => f.basename === file.basename);
	const target = same.length === 1 ? file.basename : file.path.replace(/\.md$/i, "");
	return "[[" + target + "]]";
}

function folderKey(path: string): string {
	return path.toLowerCase().replace(/[\d\-_.\/\s]+/g, "");
}

function closestFolder(query: string, folders: string[]): string {
	const q = query.trim();
	if (!q) return "";
	const lower = q.toLowerCase();
	for (const f of folders) {
		if (f.toLowerCase() === lower) return f;
	}
	const key = folderKey(q);
	if (key) {
		for (const f of folders) {
			if (folderKey(f) === key) return f;
		}
	}
	for (const f of folders) {
		const fl = f.toLowerCase();
		if (fl.length < 2) continue;
		if (fl.indexOf(lower) !== -1 || lower.indexOf(fl) !== -1) return f;
	}
	return "";
}

class NameModal extends Modal {
	preset: string;
	hint: string;
	t: Copy;
	onSubmit: (value: string) => void;

	constructor(
		app: App,
		preset: string,
		t: Copy,
		onSubmit: (value: string) => void,
		hint = ""
	) {
		super(app);
		this.preset = preset || "";
		this.hint = hint;
		this.t = t;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		this.titleEl.setText(this.t.newNote);
		if (this.hint) this.contentEl.createEl("p", { cls: "an-tou-modal-hint", text: this.hint });
		const input = this.contentEl.createEl("input", { type: "text", cls: "prompt-input" });
		input.value = this.preset;
		input.placeholder = this.t.newNotePlaceholder;
		input.addEventListener("keydown", (e) => {
			if (e.key !== "Enter") return;
			e.preventDefault();
			const v = input.value.trim();
			this.close();
			this.onSubmit(v);
		});
		input.focus();
		if (this.preset) input.select();
	}
}

class FolderSuggest extends AbstractInputSuggest<string> {
	inputEl: HTMLInputElement;
	onPick: (value: string) => void;

	constructor(app: App, inputEl: HTMLInputElement, onPick: (value: string) => void) {
		super(app, inputEl);
		this.inputEl = inputEl;
		this.onPick = onPick;
		this.limit = 20;
	}

	protected getSuggestions(query: string): string[] {
		const all = this.app.vault.getAllFolders(false).map((f) => f.path);
		const q = query.trim().toLowerCase();
		if (!q) return all.slice(0, this.limit);
		return all.filter((p) => p.toLowerCase().indexOf(q) !== -1).slice(0, this.limit);
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		el.setText(value);
	}

	selectSuggestion(value: string): void {
		this.inputEl.value = value;
		this.onPick(value);
		this.close();
	}
}

class RoomModal extends Modal {
	t: Copy;
	onSubmit: (name: string, folder: string) => void;

	constructor(app: App, t: Copy, onSubmit: (name: string, folder: string) => void) {
		super(app);
		this.t = t;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const t = this.t;
		this.titleEl.setText(t.quietAdd);
		this.contentEl.addClass("an-tou-room-modal");
		let name = "";
		let folder = "";
		let folderEl: HTMLInputElement | null = null;
		const submit = () => {
			const n = name.trim();
			if (!n) {
				new Notice(t.nameRequired);
				return;
			}
			this.close();
			this.onSubmit(n, folder.trim());
		};
		new Setting(this.contentEl).setName(t.name).addText((box) => {
			box.setPlaceholder(t.name);
			box.onChange((v) => {
				name = v;
			});
			box.inputEl.addEventListener("keydown", (e) => {
				if (e.key !== "Enter") return;
				e.preventDefault();
				folderEl?.focus();
			});
			box.inputEl.focus();
		});
		new Setting(this.contentEl)
			.setName(t.folder)
			.setDesc(t.folderDesc)
			.addText((box) => {
				folderEl = box.inputEl;
				box.setPlaceholder("00-收件箱");
				box.onChange((v) => {
					folder = v;
				});
				new FolderSuggest(this.app, box.inputEl, (picked) => {
					box.setValue(picked);
					folder = picked;
				});
				box.inputEl.addEventListener("keydown", (e) => {
					if (e.key !== "Enter") return;
					e.preventDefault();
					submit();
				});
			});
		new Setting(this.contentEl).addButton((b) => {
			b.setButtonText(t.saveRoom).setCta().onClick(submit);
		});
	}
}

class ConfirmModal extends Modal {
	heading: string;
	lines: string[];
	confirmText: string;
	cancelText: string;
	onConfirm: () => void;

	constructor(
		app: App,
		opts: {
			title: string;
			lines: string[];
			confirm: string;
			cancel: string;
			onConfirm: () => void;
		}
	) {
		super(app);
		this.heading = opts.title;
		this.lines = opts.lines;
		this.confirmText = opts.confirm;
		this.cancelText = opts.cancel;
		this.onConfirm = opts.onConfirm;
	}

	onOpen() {
		this.titleEl.setText(this.heading);
		for (const line of this.lines) {
			this.contentEl.createEl("p", { cls: "an-tou-confirm-line", text: line });
		}
		const row = this.contentEl.createDiv({ cls: "an-tou-confirm-actions" });
		const cancel = row.createEl("button", {
			text: this.cancelText,
			attr: { type: "button" },
		});
		cancel.addEventListener("click", () => this.close());
		const ok = row.createEl("button", {
			cls: "mod-warning",
			text: this.confirmText,
			attr: { type: "button" },
		});
		ok.addEventListener("click", () => {
			this.close();
			this.onConfirm();
		});
	}
}

class DeskView extends ItemView {
	plugin: AnTouPlugin;
	stack: Page[] = [{ type: "home" }];
	_tid = 0;
	renderSeq = 0;
	dirty = false;
	renderFiles: TFile[] | null = null;
	searchIndex = new Map<string, NoteCopy>();
	spotlight: { path: string; kicker: string } | null = null;
	copyMenu: HTMLElement | null = null;
	copyCloser: ((ev: PointerEvent) => void) | null = null;
	searchEls: {
		row: HTMLElement;
		input: HTMLInputElement;
		clearBtn: HTMLButtonElement;
		home: HTMLElement;
		body: HTMLElement;
	} | null = null;

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

	copy(): Copy {
		return this.plugin.settings.uiLang === "en" ? COPY.en : COPY.zh;
	}

	async onOpen() {
		this.contentEl.addClass("an-tou-view");
		this.registerEvent(this.app.vault.on("create", () => this.safeRender()));
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				this.searchIndex.delete(file.path);
				this.safeRender();
			})
		);
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				this.searchIndex.delete(oldPath);
				this.safeRender();
			})
		);
		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (file instanceof TFile) this.searchIndex.delete(file.path);
				if (this.modifyAffectsPage(file)) this.safeRender();
			})
		);
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				if (this.dirty && this.isShownNow()) {
					this.dirty = false;
					void this.render();
				}
			})
		);
		await this.render();
	}

	async onClose() {
		if (this._tid) window.clearTimeout(this._tid);
		this.renderSeq++;
		this.contentEl.empty();
	}

	isShownNow(): boolean {
		if (typeof this.contentEl.isShown === "function") return this.contentEl.isShown();
		return this.contentEl.offsetParent !== null;
	}

	modifyAffectsPage(file: TAbstractFile): boolean {
		if (!(file instanceof TFile)) return true;
		const page = this.current();
		if (page.type === "folder" || page.type === "more") {
			return inFolder(file, page.folder);
		}
		if (page.type === "home") {
			return !!this.ownerOf(file, this.liveFolders());
		}
		return true;
	}

	safeRender() {
		if (this.current().type === "welcome") return;
		if (this.searchEls && document.activeElement === this.searchEls.input) {
			this.dirty = true;
			return;
		}
		if (!this.isShownNow()) {
			this.dirty = true;
			if (this._tid) {
				window.clearTimeout(this._tid);
				this._tid = 0;
			}
			return;
		}
		if (this._tid) window.clearTimeout(this._tid);
		this._tid = window.setTimeout(() => {
			this._tid = 0;
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
		const all = this.renderFiles ?? this.app.vault.getMarkdownFiles();
		return all.filter((f) => {
			if (!inFolder(f, folder)) return false;
			if (skipped(f.path, skip)) return false;
			return !extraSkip.some((s) => f.path.endsWith(s) || f.basename === s);
		});
	}

	mdHere(folder: string): TFile[] {
		return this.mdIn(folder).filter((f) => parentFolder(f.path) === folder);
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
		return this.plugin.settings.rooms.filter(
			(r) => r.parent === id && r.id !== id && !r.draft
		);
	}

	// ponytail: groups often have no folder; + writes to the shared parent of child rooms
	noteFolder(room: Room): string | undefined {
		if (room.folder) return room.folder;
		return commonFolder(this.childrenOf(room.id).map((c) => c.folder ?? "")) || undefined;
	}

	isQuietLine(room: Room, seen?: Set<string>): boolean {
		if (room.quiet) return true;
		if (!room.parent) return false;
		const visited = seen ?? new Set<string>();
		visited.add(room.id);
		if (visited.has(room.parent)) return false;
		const parent = this.plugin.settings.rooms.find((r) => r.id === room.parent);
		return parent ? this.isQuietLine(parent, visited) : false;
	}

	liveFolders(): LiveFolder[] {
		const out: LiveFolder[] = [];
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

	ownerOf(file: TFile, live: LiveFolder[]): LiveFolder | undefined {
		let best: LiveFolder | undefined;
		for (const room of live) {
			if (!inFolder(file, room.folder)) continue;
			if (!best || room.folder.length > best.folder.length) best = room;
		}
		return best;
	}

	roomCount(room: Room, seen?: Set<string>): number {
		const visited = seen ?? new Set<string>();
		if (visited.has(room.id)) return 0;
		visited.add(room.id);
		if (room.folder) return this.mdIn(room.folder).length;
		let n = 0;
		for (const kid of this.childrenOf(room.id)) n += this.roomCount(kid, visited);
		return n;
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
				maxNotes: room.maxNotes,
			});
		}
	}

	async openNote(file: TFile) {
		const ws = this.app.workspace;
		const remembered = this.plugin.readingLeaf;
		let leaf =
			remembered && ws.getLeavesOfType("markdown").includes(remembered)
				? remembered
				: null;
		if (!leaf) {
			leaf = ws.getLeaf("tab");
			this.plugin.readingLeaf = leaf;
		}
		await leaf.openFile(file);
	}

	async copyNoteLink(file: TFile) {
		const t = this.copy();
		const ok = await copyText(noteUri(this.app, file));
		new Notice(ok ? t.copied : t.copyFailed);
	}

	async copyWikiLink(file: TFile) {
		const t = this.copy();
		const ok = await copyText(wikiLink(this.app, file));
		new Notice(ok ? t.copiedWiki : t.copyFailed);
	}

	closeCopyMenu() {
		if (this.copyCloser) {
			window.removeEventListener("pointerdown", this.copyCloser);
			this.copyCloser = null;
		}
		this.copyMenu?.remove();
		this.copyMenu = null;
	}

	showCopyMenu(anchor: HTMLElement, file: TFile) {
		if (this.copyMenu) {
			this.closeCopyMenu();
			return;
		}
		const t = this.copy();
		const menu = this.contentEl.createDiv({ cls: "desk-copy-menu" });
		this.copyMenu = menu;
		const host = this.contentEl.getBoundingClientRect();
		const box = anchor.getBoundingClientRect();
		menu.style.top = box.bottom - host.top + this.contentEl.scrollTop + 6 + "px";
		menu.style.left = Math.max(8, box.right - host.left - 168) + "px";
		const add = (label: string, run: () => void) => {
			const b = menu.createEl("button", { text: label, attr: { type: "button" } });
			b.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				run();
				this.closeCopyMenu();
			});
		};
		add(t.copyDesk, () => void this.copyNoteLink(file));
		add(t.copyWiki, () => void this.copyWikiLink(file));
		const closer = (ev: PointerEvent) => {
			if (menu.contains(ev.target as Node) || anchor.contains(ev.target as Node)) return;
			this.closeCopyMenu();
		};
		this.copyCloser = closer;
		window.setTimeout(() => window.addEventListener("pointerdown", closer), 0);
	}

	goToNote(file: TFile) {
		const title = this.plugin.settings.title || DEFAULT_TITLE;
		this.stack = [{ type: "home" }];
		const owner = this.ownerOf(file, this.liveFolders());
		const room = owner
			? this.plugin.settings.rooms.find((r) => r.id === owner.id)
			: undefined;
		if (room) {
			const parent = room.parent
				? this.plugin.settings.rooms.find((r) => r.id === room.parent)
				: undefined;
			if (parent) this.openRoom(parent, title);
			this.openRoom(room, parent ? parent.name : title);
		}
		void this.render();
	}

	async createNamedNote(folder: string, raw: string) {
		const t = this.copy();
		const base = safeName(raw || (isInboxFolder(folder) ? inboxStamp() : t.untitled), t);
		let filename = base;
		let n = 2;
		while (this.app.vault.getAbstractFileByPath(folder + "/" + filename + ".md")) {
			filename = base + " " + n++;
		}
		try {
			const file = await this.app.vault.create(folder + "/" + filename + ".md", "");
			await this.openNote(file);
		} catch {
			new Notice(t.createFailed);
		}
	}

	async newNote(folder: string) {
		if (!folder) return;
		if (!this.app.vault.getAbstractFileByPath(folder)) {
			new Notice(this.copy().folderGone);
			return;
		}
		const preset = isInboxFolder(folder) ? inboxStamp() : "";
		new NameModal(this.app, preset, this.copy(), (raw: string) => {
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
			mini?: boolean;
			live?: boolean;
			noteFile?: TFile;
		},
		onClick?: () => void
	) {
		const el = parent.createEl("div", {
			cls:
				"desk-card" +
				(spec.quiet ? " is-quiet" : "") +
				(spec.note ? " is-note" : "") +
				(spec.mini ? " is-mini" : "") +
				(spec.span2 ? " span-2" : ""),
			attr: onClick ? { role: "button", tabindex: "0" } : {},
		});
		if (spec.kicker) el.createEl("span", { cls: "desk-kicker", text: spec.kicker });
		else if (!spec.note) el.createEl("span", { cls: "desk-kicker", text: "\u00a0" });
		if (spec.count !== undefined && spec.count !== "" && spec.count !== null) {
			el.createEl("span", { cls: "desk-count", text: String(spec.count) });
		}
		el.createEl("strong", { text: spec.title });
		if (spec.line) el.createEl("span", { cls: "desk-line", text: spec.line });
		else if (!spec.note && !spec.mini) el.createEl("span", { cls: "desk-line", text: "\u00a0" });
		if (spec.noteFile) {
			const cp = el.createEl("button", {
				cls: "desk-copy",
				attr: { type: "button", "aria-label": this.copy().copyLink },
			});
			setIcon(cp, "link");
			cp.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				this.showCopyMenu(cp, spec.noteFile as TFile);
			});
		}
		if (onClick) {
			el.addEventListener("click", onClick);
			el.addEventListener("keydown", (e: KeyboardEvent) => {
				if (e.key !== "Enter" && e.key !== " ") return;
				e.preventDefault();
				onClick();
			});
		} else if (!spec.live) {
			el.addClass("is-still");
		}
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
				attr: { type: "button", "aria-label": this.copy().newNote },
			});
			add.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				void this.newNote(folder);
			});
		}
	}

	async render() {
		this.closeCopyMenu();
		const seq = ++this.renderSeq;
		this.renderFiles = this.app.vault.getMarkdownFiles();
		try {
			const root = this.contentEl;
			root.empty();
			const inner = root.createDiv({ cls: "an-tou-inner" });
			const page = this.current();
			if (page.type === "welcome") this.renderWelcome(inner);
			else if (page.type === "home") await this.renderHome(inner, seq);
			else if (page.type === "group") await this.renderGroup(inner, page.room, seq);
			else if (page.type === "more") await this.renderMore(inner, page, seq);
			else await this.renderFolder(inner, page, seq);
		} finally {
			if (this.renderSeq === seq) this.renderFiles = null;
		}
	}

	topFolders(): TFolder[] {
		const skip = this.plugin.settings.skipPaths;
		return this.app.vault.getRoot().children.filter(
			(c): c is TFolder =>
				c instanceof TFolder && !c.name.startsWith(".") && !skipped(c.path, skip)
		);
	}

	renderWelcome(inner: HTMLElement) {
		const t = this.copy();
		inner.createEl("h1", { text: t.welcomeTitle });
		inner.createEl("p", { cls: "an-tou-lede", text: t.welcomeSub });

		const list = inner.createEl("ul", { cls: "an-tou-welcome-list" });
		for (const line of [t.welcomePoint1, t.welcomePoint2, t.welcomePoint3, t.welcomePoint4]) {
			list.createEl("li", { text: line });
		}

		const folders = this.topFolders();
		inner.createEl("p", { cls: "an-tou-lede", text: t.welcomePick(folders.length) });

		const picked = new Set(folders.slice(0, 6).map((f) => f.path));
		const chips = inner.createDiv({ cls: "an-tou-chips" });
		for (const folder of folders) {
			const chip = chips.createEl("button", {
				cls: "an-tou-chip" + (picked.has(folder.path) ? " is-on" : ""),
				text: folder.name,
				attr: { type: "button", "aria-pressed": picked.has(folder.path) ? "true" : "false" },
			});
			chip.addEventListener("click", () => {
				const on = picked.has(folder.path);
				if (on) picked.delete(folder.path);
				else picked.add(folder.path);
				chip.toggleClass("is-on", !on);
				chip.setAttribute("aria-pressed", on ? "false" : "true");
			});
		}

		const row = inner.createDiv({ cls: "an-tou-welcome-btns" });
		const all = row.createEl("button", { text: t.welcomeAddAll, attr: { type: "button" } });
		all.addEventListener("click", () => {
			void this.finishWelcome(null);
		});
		const go = row.createEl("button", {
			cls: "mod-cta",
			text: t.welcomeStart,
			attr: { type: "button" },
		});
		go.addEventListener("click", () => {
			void this.finishWelcome([...picked]);
		});
	}

	async finishWelcome(only: string[] | null) {
		const plugin = this.plugin;
		plugin.settings.rooms = only === null ? plugin.scanRooms() : plugin.scanRooms(only, false);
		plugin.settings.welcomed = true;
		await plugin.saveSettings();
		await this.resetHome();
	}

	homeActions(inner: HTMLElement) {
		const t = this.copy();
		const add = inner.createEl("button", {
			cls: "an-tou-add",
			text: "+",
			attr: { type: "button", "aria-label": t.capture },
		});
		add.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.captureNote();
		});
	}

	captureFolder(): string | undefined {
		const rooms = this.plugin.settings.rooms.filter((r) => !r.draft);
		const chosen = this.plugin.settings.captureRoom;
		if (chosen) {
			const room = rooms.find((r) => r.id === chosen);
			const folder = room ? this.noteFolder(room) : undefined;
			if (folder) return folder;
		}
		const home = this.homeRooms();
		const inbox = home.find((r) => r.folder && isInboxFolder(r.folder + " " + r.name));
		const pick = inbox ?? home.find((r) => this.noteFolder(r));
		return pick ? this.noteFolder(pick) : undefined;
	}

	captureNote(name = "") {
		const t = this.copy();
		const folder = this.captureFolder();
		if (!folder) {
			new Notice(t.noCaptureFolder);
			return;
		}
		const preset = name || (isInboxFolder(folder) ? inboxStamp() : "");
		if (!name && isInboxFolder(folder)) {
			void this.createNamedNote(folder, preset);
			return;
		}
		new NameModal(this.app, preset, t, (raw: string) => {
			void this.createNamedNote(folder, raw);
		}, t.captureHint(folder)).open();
	}

	diaryRoom(): Room | undefined {
		return this.plugin.settings.rooms.find(
			(r) => !r.draft && !!r.folder && !this.isQuietLine(r) && isDiaryRoom(r)
		);
	}

	inboxRoom(): Room | undefined {
		return this.plugin.settings.rooms.find(
			(r) =>
				!r.draft &&
				!!r.folder &&
				!this.isQuietLine(r) &&
				isInboxFolder((r.folder ?? "") + " " + r.name)
		);
	}

	knowledgeRoom(): Room | undefined {
		const rooms = this.plugin.settings.rooms.filter(
			(r) =>
				!r.draft &&
				!!r.folder &&
				!this.isQuietLine(r) &&
				!isInboxFolder((r.folder ?? "") + " " + r.name) &&
				!isDiaryRoom(r)
		);
		return (
			rooms.find((r) => isKnowledgeRoom(r)) ??
			rooms.slice().sort((a, b) => this.roomCount(b) - this.roomCount(a))[0]
		);
	}

	drawSource(): Room | undefined {
		const chosen = this.plugin.settings.drawRoom;
		if (chosen) {
			const room = this.plugin.settings.rooms.find(
				(r) => r.id === chosen && !r.draft && !!r.folder
			);
			if (room) return room;
		}
		return this.knowledgeRoom();
	}

	todayPath(): string | undefined {
		const folder = this.diaryRoom()?.folder;
		return folder ? folder + "/" + todayName() + ".md" : undefined;
	}

	todayFile(): TFile | null {
		const path = this.todayPath();
		if (!path) return null;
		const file = this.app.vault.getAbstractFileByPath(path);
		return file instanceof TFile ? file : null;
	}

	async openToday() {
		const t = this.copy();
		const path = this.todayPath();
		if (!path) {
			new Notice(t.noCaptureFolder);
			return;
		}
		const found = this.app.vault.getAbstractFileByPath(path);
		let file: TFile;
		if (found instanceof TFile) file = found;
		else {
			try {
				file = await this.app.vault.create(path, "");
			} catch {
				new Notice(t.createFailed);
				return;
			}
		}
		await this.openNote(file);
	}

	leftOff(): { file: TFile; kicker: string } | null {
		const t = this.copy();
		if (this.spotlight) {
			const file = this.app.vault.getAbstractFileByPath(this.spotlight.path);
			if (file instanceof TFile) return { file, kicker: this.spotlight.kicker };
			this.spotlight = null;
		}
		const today = this.todayFile()?.path;
		const hit = this.recentNotes().find((e) => e.file.path !== today);
		return hit ? { file: hit.file, kicker: t.resumeKicker } : null;
	}

	drawOne() {
		const t = this.copy();
		const room = this.drawSource();
		const files = room?.folder ? this.mdIn(room.folder) : [];
		if (!room || files.length === 0) {
			new Notice(t.drawEmpty);
			return;
		}
		const current = this.spotlight?.path;
		const pool = files.filter((f) => f.path !== current);
		const pile = pool.length ? pool : files;
		const pick = pile[Math.floor(Math.random() * pile.length)];
		if (!pick) return;
		this.spotlight = {
			path: pick.path,
			kicker: t.drawKicker(room.kicker || room.name),
		};
		void this.render();
	}

	bindHomeRoom(el: HTMLElement, room: Room, open: () => void) {
		const t = this.copy();
		el.setAttribute("data-room-id", room.id);
		el.setAttribute("role", "button");
		el.tabIndex = 0;
		el.addEventListener("keydown", (e) => {
			if (e.key !== "Enter" && e.key !== " ") return;
			if ((e.target as HTMLElement).closest("input")) return;
			e.preventDefault();
			open();
		});
		let timer = 0;
		let clicks = 0;
		let dragged = false;
		let sx = 0;
		let sy = 0;
		let active = false;
		const strong = () => el.querySelector("strong");
		const clearDrop = () => {
			this.contentEl.querySelectorAll(".desk-card.is-drop").forEach((n) => {
				n.classList.remove("is-drop");
			});
		};
		const startRename = () => {
			const title = strong();
			if (!title || el.querySelector("input.desk-rename")) return;
			const input = document.createElement("input");
			input.className = "desk-rename";
			input.value = room.name;
			title.replaceWith(input);
			input.focus();
			input.select();
			let done = false;
			const finish = (save: boolean) => {
				if (done) return;
				done = true;
				const next = input.value.trim();
				const label = document.createElement("strong");
				label.textContent = save && next ? next : room.name;
				input.replaceWith(label);
				if (!save || !next || next === room.name) return;
				room.name = next;
				void this.plugin.saveSettings();
				new Notice(t.renamed);
			};
			input.addEventListener("blur", () => finish(true));
			input.addEventListener("keydown", (e) => {
				e.stopPropagation();
				if (e.key === "Enter") input.blur();
				if (e.key === "Escape") {
					e.preventDefault();
					finish(false);
				}
			});
		};
		el.addEventListener("dblclick", (e) => {
			if ((e.target as HTMLElement).closest("input, button")) return;
			e.preventDefault();
			e.stopPropagation();
			window.clearTimeout(timer);
			clicks = 0;
			startRename();
		});
		el.addEventListener("click", (e) => {
			if ((e.target as HTMLElement).closest("input, button")) return;
			if (dragged) {
				dragged = false;
				return;
			}
			clicks++;
			window.clearTimeout(timer);
			timer = window.setTimeout(() => {
				if (clicks === 1) open();
				clicks = 0;
			}, 260);
		});
		el.addEventListener("pointerdown", (e) => {
			if (e.button !== 0) return;
			if ((e.target as HTMLElement).closest("input, button")) return;
			active = true;
			dragged = false;
			sx = e.clientX;
			sy = e.clientY;
			const move = (ev: PointerEvent) => {
				if (!active) return;
				const dx = ev.clientX - sx;
				const dy = ev.clientY - sy;
				if (!dragged && dx * dx + dy * dy < 64) return;
				dragged = true;
				clearDrop();
				const hit = document
					.elementFromPoint(ev.clientX, ev.clientY)
					?.closest("[data-room-id]");
				const id = hit?.getAttribute("data-room-id");
				if (hit && id && id !== room.id && !blocksNest(this.plugin.settings.rooms, room.id, id)) {
					hit.classList.add("is-drop");
				}
			};
			const up = (ev: PointerEvent) => {
				active = false;
				window.removeEventListener("pointermove", move);
				window.removeEventListener("pointerup", up);
				const hit = document
					.elementFromPoint(ev.clientX, ev.clientY)
					?.closest("[data-room-id]");
				const id = hit?.getAttribute("data-room-id");
				clearDrop();
				if (!dragged || !id || id === room.id) return;
				const parent = this.plugin.settings.rooms.find((r) => r.id === id);
				if (!parent) return;
				if (blocksNest(this.plugin.settings.rooms, room.id, id)) {
					new Notice(t.nestBlocked);
					return;
				}
				room.parent = parent.id;
				void this.plugin.saveSettings().then(() => {
					new Notice(t.nested(parent.name));
					void this.render();
				});
			};
			window.addEventListener("pointermove", move);
			window.addEventListener("pointerup", up);
		});
	}

	async renderHome(inner: HTMLElement, seq: number) {
		const t = this.copy();
		const title = this.plugin.settings.title || DEFAULT_TITLE;
		this.homeActions(inner);
		inner.createEl("p", { cls: "desk-date", text: deskDateLine(this.plugin.settings.uiLang) });
		inner.createEl("h1", { text: title });
		const homeBody = this.mountSearch(inner);

		const todayGrid = homeBody.createDiv({ cls: "an-tou-grid" });
		const todayExisting = this.todayFile();
		let todayCopy: NoteCopy | null = null;
		if (todayExisting) {
			todayCopy = await noteCardCopy(this.app, todayExisting);
			if (seq !== this.renderSeq) return;
		}
		const todayLine =
			(todayExisting ? todayCopy?.line || this.copy().todayBlank : this.copy().todayEmpty) + "";
		if (this.diaryRoom()) {
			this.card(
				todayGrid,
				{ kicker: t.today, title: todayName(), line: todayLine },
				() => void this.openToday()
			);
		}

		const inbox = this.inboxRoom();
		if (inbox?.folder) {
			const notes = this.mdIn(inbox.folder).sort((a, b) => b.stat.mtime - a.stat.mtime);
			const preview = notes
				.slice(0, 3)
				.map((f) => f.basename)
				.join(" · ");
			this.card(
				todayGrid,
				{
					kicker: t.inboxWaiting,
					count: notes.length || undefined,
					title: inbox.kicker || inbox.name,
					line: preview || t.inboxEmpty,
				},
				() => this.openRoom(inbox, title)
			);
		}

		const left = this.leftOff();
		if (left) {
			const copy = await noteCardCopy(this.app, left.file);
			if (seq !== this.renderSeq) return;
			const card = this.card(
				todayGrid,
				{
					kicker: left.kicker,
					title: copy.title,
					line: copy.line,
					note: true,
					noteFile: left.file,
				},
				() => void this.openNote(left.file)
			);
			const actions = card.createDiv({ cls: "desk-actions" });
			const resume = actions.createEl("button", {
				cls: "desk-chip",
				text: t.resume,
				attr: { type: "button" },
			});
			resume.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				void this.openNote(left.file);
			});
			if (this.drawSource()) {
				const draw = actions.createEl("button", {
					cls: "desk-chip",
					text: t.draw,
					attr: { type: "button" },
				});
				draw.addEventListener("click", (e) => {
					e.preventDefault();
					e.stopPropagation();
					this.drawOne();
				});
			}
		}

		const rooms = this.homeRooms();
		if (rooms.length === 0) {
			homeBody.createEl("p", { cls: "an-tou-lede", text: t.emptyRooms });
		} else {
			homeBody.createEl("h2", { cls: "desk-section", text: t.rooms });
			const grid = homeBody.createDiv({ cls: "an-tou-grid" });
			for (const room of rooms) {
				const n = this.roomCount(room);
				const count = room.quiet ? undefined : n;
				const el = this.card(grid, {
					kicker: room.kicker,
					count,
					title: room.name,
					quiet: room.quiet,
					live: true,
				});
				this.bindHomeRoom(el, room, () => this.openRoom(room, title));
			}
		}

		homeBody.createEl("h2", { cls: "desk-section", text: t.recent });
		const recentGrid = homeBody.createDiv({ cls: "an-tou-grid" });
		const recent = this.recentNotes();
		await this.paintNotes(
			recentGrid,
			recent.map((e) => e.file),
			seq,
			(file, i) => recent[i].kicker
		);
	}

	mountSearch(inner: HTMLElement): HTMLElement {
		const t = this.copy();
		const searchRow = inner.createDiv({ cls: "an-tou-search-row" });
		const glyph = searchRow.createSpan({ cls: "desk-search-glyph" });
		setIcon(glyph, "search");
		const input = searchRow.createEl("input", {
			cls: "desk-search",
			type: "text",
			attr: {
				placeholder: t.searchPlaceholder,
				autocomplete: "off",
				spellcheck: "false",
				enterkeyhint: "search",
			},
		});
		const clearBtn = searchRow.createEl("button", {
			cls: "desk-search-clear",
			text: "×",
			attr: { type: "button", "aria-label": t.searchClear },
		});
		const pageBody = inner.createDiv({ cls: "desk-home-body" });
		const searchBody = inner.createDiv({ cls: "desk-search-body hidden" });
		this.searchEls = {
			row: searchRow,
			input,
			clearBtn,
			home: pageBody,
			body: searchBody,
		};

		const grab = () => {
			this.app.workspace.setActiveLeaf(this.leaf, { focus: true });
			input.focus();
		};
		searchRow.addEventListener("pointerdown", (e) => {
			if (e.target === clearBtn) return;
			if (e.target !== input) e.preventDefault();
			grab();
		});

		let searchTimer = 0;
		const schedule = (jump: boolean) => {
			window.clearTimeout(searchTimer);
			searchTimer = window.setTimeout(() => void this.applySearch(jump), jump ? 0 : 150);
		};
		input.addEventListener("input", (e) => {
			if ((e as InputEvent).isComposing) return;
			const kind = (e as InputEvent).inputType || "";
			schedule(kind === "insertFromPaste" || kind === "insertFromDrop");
		});
		input.addEventListener("compositionend", () => schedule(false));
		input.addEventListener("keydown", (e) => {
			e.stopPropagation();
			if (e.isComposing) return;
			if (e.key === "Escape") {
				e.preventDefault();
				this.clearSearch();
				return;
			}
			if (e.key === "Enter") {
				e.preventDefault();
				window.clearTimeout(searchTimer);
				void this.applySearch(true);
			}
		});
		clearBtn.addEventListener("click", () => {
			this.clearSearch();
			grab();
		});
		return pageBody;
	}

	focusSearch() {
		const input = this.searchEls?.input;
		if (!input) return;
		this.app.workspace.setActiveLeaf(this.leaf, { focus: true });
		input.focus();
	}

	async searchEntry(file: TFile): Promise<NoteCopy> {
		const hit = this.searchIndex.get(file.path);
		if (hit) return hit;
		const entry = await noteCardCopy(this.app, file);
		this.searchIndex.set(file.path, entry);
		return entry;
	}

	async paintNotes(
		grid: HTMLElement,
		files: TFile[],
		seq: number,
		kickerOfFile: (file: TFile, i: number) => string | undefined
	): Promise<boolean> {
		const copies = await Promise.all(files.map((f) => noteCardCopy(this.app, f)));
		if (seq !== this.renderSeq) return false;
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			this.card(
				grid,
				{
					kicker: kickerOfFile(file, i),
					title: copies[i].title,
					line: copies[i].line,
					note: true,
						noteFile: file,
				},
				() => {
					void this.openNote(file);
				}
			);
		}
		return true;
	}

	clearSearch() {
		const els = this.searchEls;
		if (!els) return;
		els.input.value = "";
		void this.applySearch();
		els.input.blur();
	}

	async applySearch(jump = false) {
		const els = this.searchEls;
		if (!els) return;
		const q = els.input.value.trim();
		const ql = q.toLowerCase();
		els.input.classList.toggle("has-q", ql.length > 0);
		els.clearBtn.classList.toggle("show", ql.length > 0);
		els.row.classList.toggle("is-live", ql.length > 0);
		if (!ql) {
			els.home.removeClass("hidden");
			els.body.addClass("hidden");
			els.body.empty();
			return;
		}
		const linked = parseDeskQuery(q);
		if (linked) {
			const file = resolveNote(this.app, linked);
			if (file) {
				if (jump) {
					els.input.value = "";
					els.input.classList.remove("has-q");
					els.clearBtn.classList.remove("show");
					els.row.classList.remove("is-live");
					els.home.removeClass("hidden");
					els.body.addClass("hidden");
					els.body.empty();
					await this.plugin.openFromLink({ note: file.path });
					return;
				}
				els.home.addClass("hidden");
				els.body.removeClass("hidden");
				els.body.empty();
				const t = this.copy();
				const head = els.body.createEl("h2", {
					cls: "desk-search-head",
					text: t.searchHead(1) + " · ",
				});
				head.createEl("span", { cls: "q", text: "“" + q + "”" });
				const grid = els.body.createDiv({ cls: "an-tou-grid" });
				const copy = await this.searchEntry(file);
				this.card(
					grid,
					{
						title: copy.title,
						line: copy.line,
						note: true,
						noteFile: file,
					},
					() => {
						void this.openNote(file);
					}
				);
				return;
			}
		}
		const stale = () =>
			this.searchEls !== els || els.input.value.trim().toLowerCase() !== ql;
		const skip = this.plugin.settings.skipPaths;
		const rooms = this.plugin.settings.rooms.filter((r) => !r.draft);
		const folderRooms = rooms.filter((r) => r.folder);
		const roomHits = rooms.filter((r) => {
			const blob = [r.name, r.kicker ?? "", r.folder ?? "", r.line ?? ""]
				.join("\n")
				.toLowerCase();
			return blob.includes(ql);
		});
		const hits: { file: TFile; room?: Room }[] = [];
		for (const file of this.app.vault.getMarkdownFiles()) {
			if (stale()) return;
			if (skipped(file.path, skip)) continue;
			const entry = await this.searchEntry(file);
			if (!entry.hay.includes(ql)) continue;
			let owner: Room | undefined;
			for (const room of folderRooms) {
				if (!inFolder(file, room.folder ?? "")) continue;
				if (!owner || (room.folder ?? "").length > (owner.folder ?? "").length) {
					owner = room;
				}
			}
			hits.push({ file, room: owner });
		}
		if (stale()) return;
		els.home.addClass("hidden");
		els.body.removeClass("hidden");
		els.body.empty();
		const t = this.copy();
		const total = roomHits.length + hits.length;
		if (total === 0) {
			els.body.createEl("p", { cls: "an-tou-lede desk-search-none", text: t.searchNone });
			return;
		}
		const head = els.body.createEl("h2", {
			cls: "desk-search-head",
			text: t.searchHead(total) + " · ",
		});
		head.createEl("span", { cls: "q", text: "“" + q + "”" });
		if (roomHits.length) {
			const grid = els.body.createDiv({ cls: "an-tou-grid" });
			const deskTitle = this.plugin.settings.title || DEFAULT_TITLE;
			for (const room of roomHits) {
				const n = this.roomCount(room);
				const count = room.quiet ? undefined : n;
				this.card(
					grid,
					{
						kicker: room.kicker,
						count,
						title: room.name,
						line: roomCaption(room, count !== undefined),
						quiet: room.quiet,
					},
					() => {
						this.clearSearch();
						this.openRoom(room, deskTitle);
					}
				);
			}
		}
		const shown = hits.slice(0, SEARCH_CAP);
		const groups: { room?: Room; items: { file: TFile; room?: Room }[] }[] = [];
		for (const room of folderRooms) {
			const items = shown.filter((h) => h.room === room);
			if (items.length) groups.push({ room, items });
		}
		const others = shown.filter((h) => !h.room);
		if (others.length) groups.push({ items: others });
		for (const group of groups) {
			els.body.createEl("p", {
				cls: "desk-search-group",
				text: group.room ? group.room.name : t.searchOther,
			});
			const grid = els.body.createDiv({ cls: "an-tou-grid" });
			const copies = await Promise.all(group.items.map((h) => this.searchEntry(h.file)));
			if (stale()) return;
			group.items.forEach((h, i) => {
				const file = h.file;
				this.card(
					grid,
					{
						kicker: group.room?.kicker,
						title: copies[i].title,
						line: copies[i].line,
						note: true,
						noteFile: file,
					},
					() => {
						void this.openNote(file);
					}
				);
			});
		}
		if (hits.length > SEARCH_CAP) {
			els.body.createEl("p", {
				cls: "desk-search-more",
				text: t.searchMore(hits.length - SEARCH_CAP),
			});
		}
	}

	quietFolders(): string[] {
		return this.plugin.settings.rooms
			.filter((r) => !r.draft && r.folder && this.isQuietLine(r))
			.map((r) => r.folder as string);
	}

	recentNotes(): { file: TFile; kicker: string }[] {
		const live = this.liveFolders();
		const quiet = this.quietFolders();
		const skip = this.plugin.settings.skipPaths;
		const t = this.copy();
		const all = this.renderFiles ?? this.app.vault.getMarkdownFiles();
		const entries: { file: TFile; kicker: string }[] = [];
		for (const file of all) {
			if (skipped(file.path, skip)) continue;
			if (quiet.some((f) => inFolder(file, f))) continue;
			const owner = this.ownerOf(file, live);
			if (owner) {
				entries.push({ file, kicker: owner.kicker });
				continue;
			}
			const slash = file.path.indexOf("/");
			const top = slash === -1 ? "" : file.path.slice(0, slash);
			entries.push({ file, kicker: top ? kickerOf(top) : t.recentRootKicker });
		}
		entries.sort((a, b) => b.file.stat.mtime - a.file.stat.mtime);
		return entries.slice(0, RECENT_CAP);
	}

	async renderGroup(inner: HTMLElement, room: Room, seq: number) {
		const title = this.plugin.settings.title || DEFAULT_TITLE;
		this.nav(inner, [{ label: "← " + title, go: () => this.back() }], this.noteFolder(room));
		inner.createEl("h1", { text: room.name });
		if (room.line && !isAutoLine(room.line)) {
			inner.createEl("p", { cls: "an-tou-lede", text: room.line });
		}
		const pageBody = this.mountSearch(inner);
		const grid = pageBody.createDiv({ cls: "an-tou-grid" });
		for (const child of this.childrenOf(room.id)) {
			const files = child.folder ? this.mdHere(child.folder) : [];
			const n = this.roomCount(child);
			const quiet = this.isQuietLine(child);
			this.card(
				grid,
				{
					count: quiet ? undefined : n,
					title: child.name,
					line:
						roomCaption(child, !quiet) ||
						(n === 1 && files[0] ? titleOf(files[0]) : ""),
					quiet,
				},
				() => this.openRoom(child, room.name)
			);
		}
		if (!room.folder) return;
		const leftover = this.mdHere(room.folder).sort((a, b) => b.stat.mtime - a.stat.mtime);
		await this.paintNotes(grid, leftover, seq, () => room.kicker || room.name);
	}

	async renderFolder(
		inner: HTMLElement,
		page: Extract<Page, { type: "folder" }>,
		seq: number
	) {
		const t = this.copy();
		const title = this.plugin.settings.title || DEFAULT_TITLE;
		const goHome = () => {
			this.stack = [{ type: "home" }];
			void this.render();
		};
		const crumbs = [{ label: "← " + page.parentLabel, go: () => this.back() }];
		if (page.parentLabel !== title) crumbs.push({ label: title, go: goHome });
		this.nav(inner, crumbs, page.folder);
		inner.createEl("h1", { text: page.title });
		const pageBody = this.mountSearch(inner);

		const subs = this.subfolders(page.folder);
		if (subs.length) {
			const grid = pageBody.createDiv({ cls: "an-tou-grid" });
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

		let notes = this.mdHere(page.folder).sort((a, b) => b.stat.mtime - a.stat.mtime);
		const cap = page.maxNotes || (notes.length > 40 ? 24 : notes.length);
		const rest = Math.max(0, notes.length - cap);
		if (rest) notes = notes.slice(0, cap);

		const grid = pageBody.createDiv({ cls: "an-tou-grid" });
		const ok = await this.paintNotes(grid, notes, seq, () => page.kicker);
		if (!ok) return;
		if (rest > 0) {
			this.card(
				grid,
				{
					title: t.more(rest),
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
						maxNotes: page.maxNotes,
						skip: cap,
					});
				}
			);
		}
		if (!notes.length && !subs.length) {
			pageBody.createEl("p", { cls: "an-tou-lede", text: t.emptyFolder });
		}
	}

	async renderMore(inner: HTMLElement, page: Extract<Page, { type: "more" }>, seq: number) {
		const t = this.copy();
		this.nav(
			inner,
			[{ label: "← " + page.title, go: () => this.back() }],
			page.folder
		);
		inner.createEl("h1", { text: page.title });
		const pageBody = this.mountSearch(inner);
		const notes = this.mdHere(page.folder)
			.sort((a, b) => b.stat.mtime - a.stat.mtime)
			.slice(page.skip);
		pageBody.createEl("p", {
			cls: "an-tou-lede",
			text: notes.length ? t.more(notes.length) : t.noMoreNotes,
		});
		const grid = pageBody.createDiv({ cls: "an-tou-grid" });
		await this.paintNotes(grid, notes, seq, () => page.kicker);
	}
}

class AnTouSettingTab extends PluginSettingTab {
	plugin: AnTouPlugin;
	_saveTimer: number | null = null;
	_savePending = false;

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
					this.debouncedSave();
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
			.setName(t.serif)
			.setDesc(t.serifDesc)
			.addToggle((box) =>
				box.setValue(this.plugin.settings.applySerif !== false).onChange((v) => {
					this.plugin.settings.applySerif = v;
					this.plugin.applyLook();
					void this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t.hideRibbon)
			.setDesc(t.hideRibbonDesc)
			.addToggle((box) =>
				box.setValue(this.plugin.settings.hideRibbon === true).onChange((v) => {
					this.plugin.settings.hideRibbon = v;
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
					this.plugin.applyExplorer();
					void this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t.captureDest)
			.setDesc(t.captureDestDesc)
			.addDropdown((box) => {
				box.addOption("", t.captureAuto);
				for (const room of this.plugin.settings.rooms) {
					if (room.draft || !room.folder) continue;
					box.addOption(room.id, room.name);
				}
				box.setValue(this.plugin.settings.captureRoom || "").onChange((v) => {
					this.plugin.settings.captureRoom = v;
					void this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName(t.drawDest)
			.setDesc(t.drawDestDesc)
			.addDropdown((box) => {
				box.addOption("", t.drawAuto);
				for (const room of this.plugin.settings.rooms) {
					if (room.draft || !room.folder) continue;
					box.addOption(room.id, room.name);
				}
				box.setValue(this.plugin.settings.drawRoom || "").onChange((v) => {
					this.plugin.settings.drawRoom = v;
					void this.plugin.saveSettings();
					this.plugin.refreshDesks();
				});
			});

		new Setting(containerEl)
			.setName(t.skip)
			.setDesc(t.skipDesc)
			.addText((box) =>
				box.setValue(this.plugin.settings.skipPaths.join(", ")).onChange((v) => {
					this.plugin.settings.skipPaths = v
						.split(",")
						.map((s) => s.trim())
						.filter(Boolean);
					this.debouncedSave();
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

		this.drawRoomList(containerEl, t);
	}

	drawRoomList(containerEl: HTMLElement, t: Copy) {
		const drafts = this.plugin.settings.rooms.filter((r) => r.draft);
		const saved = this.plugin.settings.rooms.filter((r) => !r.draft);
		const home = saved.filter((r) => !r.parent);
		const byId = new Map(saved.map((r) => [r.id, r]));

		if (drafts.length) {
			this.drawZone(containerEl, t.sectionDraft, drafts, t);
		}
		this.drawZone(containerEl, t.sectionHome.replace("{n}", String(home.length)), home, t);

		const seen = new Set<string>();
		for (const parent of [...home, ...saved]) {
			if (seen.has(parent.id)) continue;
			const kids = saved.filter((r) => r.parent === parent.id && r.id !== parent.id);
			if (!kids.length) continue;
			seen.add(parent.id);
			this.drawZone(
				containerEl,
				t.sectionNested.replace("{name}", parent.name || parent.id).replace("{n}", String(kids.length)),
				kids,
				t
			);
		}

		const orphans = saved.filter((r) => !!r.parent && !byId.has(r.parent));
		if (orphans.length) {
			this.drawZone(containerEl, t.sectionOrphan, orphans, t);
		}
	}

	drawZone(containerEl: HTMLElement, title: string, rooms: Room[], t: Copy) {
		if (!rooms.length) return;
		const box = containerEl.createDiv({ cls: "an-tou-set-zone" });
		new Setting(box).setName(title).setHeading();
		const list = box.createDiv({ cls: "an-tou-set-zone-list" });
		for (const room of rooms) this.drawRoom(list, room, t);
	}

	async setLang(uiLang: UiLang) {
		this.plugin.settings.uiLang = uiLang;
		await this.plugin.saveSettings();
		this.display();
	}

	async saveAndRefresh() {
		if (this._saveTimer !== null) {
			window.clearTimeout(this._saveTimer);
			this._saveTimer = null;
		}
		this._savePending = false;
		await this.plugin.saveSettings();
		this.plugin.refreshDesks();
	}

	debouncedSave() {
		this._savePending = true;
		if (this._saveTimer !== null) window.clearTimeout(this._saveTimer);
		this._saveTimer = window.setTimeout(() => {
			void this.saveAndRefresh();
		}, 400);
	}

	hide() {
		const pending = this._savePending;
		if (this._saveTimer !== null) {
			window.clearTimeout(this._saveTimer);
			this._saveTimer = null;
		}
		this._savePending = false;
		if (pending) void this.saveAndRefresh();
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
		const t = this.copy();
		const name = (rooms[i].name || "").trim();
		if (!name || name === t.newRoom) {
			new Notice(t.nameRequired);
			return;
		}
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
		const details = containerEl.createEl("details", {
			cls: "an-tou-room-edit" + (room.draft ? " is-draft" : ""),
		});
		if (room.draft) details.open = true;

		const summary = details.createEl("summary", { cls: "an-tou-room-summary" });
		summary.createSpan({ cls: "an-tou-room-caret", text: "▸" });
		const nameEl = summary.createSpan({
			cls: "an-tou-room-name",
			text: room.name || t.newRoom,
		});
		const role = this.roomRole(room, t);
		const roleEl = summary.createSpan({
			cls: "an-tou-room-role" + (role.bad ? " is-bad" : ""),
			text: role.text,
		});
		const syncSummary = () => {
			nameEl.setText(room.name || t.newRoom);
			const next = this.roomRole(room, t);
			roleEl.setText(next.text);
			roleEl.toggleClass("is-bad", next.bad);
		};

		const actions = summary.createDiv({ cls: "an-tou-room-actions" });
		if (room.draft) {
			const save = actions.createEl("button", {
				cls: "an-tou-room-save mod-cta",
				text: t.saveRoom,
				attr: { type: "button" },
			});
			save.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				void this.saveRoom(room.id);
			});
		}
		const del = actions.createEl("button", {
			cls: "an-tou-room-del",
			attr: { type: "button", "aria-label": t.remove, title: t.remove },
		});
		setIcon(del, "trash");
		del.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.confirmRemove(room, t);
		});

		details.createDiv({ cls: "an-tou-room-id", text: t.roomId + " · " + room.id });

		const grid = details.createDiv({ cls: "an-tou-room-grid" });
		this.textField(grid, t.name, t.nameDesc, room.name, (v) => {
			room.name = v;
			syncSummary();
		});
		this.folderField(grid, room, t, syncSummary);
		this.textField(grid, t.kicker, t.kickerDesc, room.kicker || "", (v) => {
			room.kicker = v;
		});
		this.textField(grid, t.line, t.lineDesc, room.line || "", (v) => {
			room.line = v;
		});
		this.parentField(grid, room, t);
		{
			const setting = new Setting(grid).setName(t.maxNotes).setDesc(t.maxNotesDesc);
			setting.addText((box) => {
				const apply = (v: string) => {
					const raw = v.trim();
					const num = Number(raw);
					const ok = raw === "" || (Number.isInteger(num) && num > 0);
					room.maxNotes = ok && raw !== "" ? num : undefined;
					this.showFieldError(setting, box.inputEl, ok ? "" : t.maxNotesBad);
					this.debouncedSave();
				};
				box.setValue(room.maxNotes ? String(room.maxNotes) : "").onChange(apply);
			});
		}
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

	roomRole(room: Room, t: Copy): { text: string; bad: boolean } {
		if (room.draft) return { text: t.draftHint, bad: false };
		if (room.stale) return { text: t.staleFolder, bad: true };
		if (room.parent) {
			const parent = this.plugin.settings.rooms.find((r) => r.id === room.parent);
			if (!parent) return { text: t.roleParentMissing, bad: true };
			return { text: t.roleNested.replace("{name}", parent.name || parent.id), bad: false };
		}
		// 点进房间时子房间优先，摘要要跟这个顺序一致，否则说的和看到的对不上
		const kids = this.childrenIds(room.id).length;
		if (kids) {
			let text = t.roleGroup.replace("{n}", String(kids));
			if (room.folder) text += t.roleGroupHidden.replace("{folder}", room.folder);
			return { text, bad: false };
		}
		if (room.folder) return { text: t.roleHome.replace("{folder}", room.folder), bad: false };
		return { text: t.roleNoFolder, bad: true };
	}

	childrenIds(id: string): string[] {
		return this.plugin.settings.rooms
			.filter((r) => r.parent === id && r.id !== id && !r.draft)
			.map((r) => r.id);
	}

	blockedParentIds(room: Room): Set<string> {
		const blocked = new Set<string>();
		const walk = (id: string) => {
			if (blocked.has(id)) return;
			blocked.add(id);
			for (const r of this.plugin.settings.rooms) {
				if (r.parent === id && r.id !== id) walk(r.id);
			}
		};
		walk(room.id);
		return blocked;
	}

	async changeParent(room: Room, value: string) {
		room.parent = value || undefined;
		await this.saveAndRefresh();
		this.display();
	}

	parentField(grid: HTMLElement, room: Room, t: Copy) {
		new Setting(grid)
			.setName(t.parent)
			.setDesc(t.parentDesc)
			.addDropdown((dd) => {
				dd.addOption("", t.parentNone);
				const blocked = this.blockedParentIds(room);
				const rooms = this.plugin.settings.rooms;
				const candidates = rooms.filter((r) => !r.draft && !blocked.has(r.id));
				const counts = new Map<string, number>();
				for (const r of candidates) counts.set(r.name, (counts.get(r.name) ?? 0) + 1);
				for (const r of candidates) {
					const dup = (counts.get(r.name) ?? 0) > 1;
					dd.addOption(r.id, dup ? r.name + " · " + r.id : r.name);
				}
				const current = room.parent || "";
				if (current && !candidates.some((r) => r.id === current)) {
					const known = rooms.find((r) => r.id === current);
					dd.addOption(
						current,
						known
							? t.parentUnselectable.replace("{name}", known.name || known.id)
							: t.parentMissing.replace("{id}", current)
					);
				}
				dd.setValue(current);
				dd.onChange((v) => {
					void this.changeParent(room, v);
				});
			});
	}

	folderField(grid: HTMLElement, room: Room, t: Copy, sync: () => void) {
		const setting = new Setting(grid).setName(t.folder).setDesc(t.folderDesc);
		setting.addText((box) => {
			const apply = (v: string) => {
				room.folder = v.trim() || undefined;
				this.showFolderError(setting, box.inputEl, v);
				sync();
				this.debouncedSave();
			};
			box.setValue(room.folder || "").onChange(apply);
			new FolderSuggest(this.app, box.inputEl, (picked) => apply(picked));
			this.showFolderError(setting, box.inputEl, room.folder || "");
		});
	}

	showFieldError(setting: Setting, inputEl: HTMLInputElement, message: string) {
		const prev = setting.settingEl.querySelector(".an-tou-field-error");
		if (prev) prev.remove();
		if (!message) {
			inputEl.removeClass("is-invalid");
			return;
		}
		inputEl.addClass("is-invalid");
		setting.settingEl.createDiv({ cls: "an-tou-field-error", text: message });
	}

	showFolderError(setting: Setting, inputEl: HTMLInputElement, raw: string) {
		const path = raw.trim();
		const prev = setting.settingEl.querySelector(".an-tou-field-error");
		if (prev) prev.remove();
		if (!path) {
			inputEl.removeClass("is-invalid");
			return;
		}
		const folders = this.app.vault.getAllFolders(false).map((f) => f.path);
		if (folders.indexOf(path) !== -1) {
			inputEl.removeClass("is-invalid");
			return;
		}
		inputEl.addClass("is-invalid");
		const t = this.copy();
		const box = setting.settingEl.createDiv({ cls: "an-tou-field-error" });
		box.createDiv({ text: t.folderMissing });
		const near = closestFolder(path, folders);
		if (near) box.createDiv({ text: t.folderDidYouMean.replace("{folder}", near) });
	}

	confirmRemove(room: Room, t: Copy) {
		const kids = this.plugin.settings.rooms.filter(
			(r) => r.parent === room.id && r.id !== room.id
		).length;
		const lines: string[] = [];
		if (kids) lines.push(t.deleteHolds.replace("{n}", String(kids)));
		lines.push(t.deleteNotesSafe);
		new ConfirmModal(this.app, {
			title: t.deleteTitle.replace("{name}", room.name || t.newRoom),
			lines: lines,
			confirm: t.deleteConfirm,
			cancel: t.deleteCancel,
			onConfirm: () => {
				void this.removeRoom(room.id);
			},
		}).open();
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
					this.debouncedSave();
				})
			);
	}

	fillHelp(pop: HTMLElement, t: Copy) {
		pop.createDiv({ cls: "an-tou-help-kicker-line", text: t.helpTitle });

		const demo = pop.createDiv({ cls: "an-tou-help-demo" });
		const card = demo.createDiv({ cls: "an-tou-help-card" });
		card.createSpan({ cls: "an-tou-help-kicker", text: "Inbox" });
		card.createSpan({ cls: "an-tou-help-count", text: "3" });
		card.createEl("strong", { text: t.sampleName });
		card.createSpan({ cls: "an-tou-help-line", text: t.sampleLine });

		const keys = demo.createDiv({ cls: "an-tou-help-keys" });
		const addKey = (cls: string, cap: string, sample: string) => {
			const row = keys.createDiv({ cls: "an-tou-help-key" });
			row.createSpan({ cls: "an-tou-help-swatch " + cls });
			row.createSpan({ text: cap + " · " + sample });
		};
		addKey("is-kicker", t.helpKickerCap, "Inbox");
		addKey("is-name", t.helpNameCap, t.sampleName);
		addKey("is-line", t.helpLineCap, t.sampleLine);
		addKey("is-folder", t.helpFolderCap, "00-Inbox");
		addKey("is-count", t.helpCountCap, "3");

		pop.createDiv({ cls: "an-tou-help-note", text: t.helpFolderNote });

		const nest = pop.createDiv({ cls: "an-tou-help-nest" });
		nest.createDiv({ cls: "an-tou-help-kicker-line", text: t.helpParentCap });
		const home = nest.createDiv({ cls: "an-tou-help-flow" });
		home.createSpan({ cls: "an-tou-help-chip", text: t.helpHome });
		const cab = home.createDiv({ cls: "an-tou-help-mini" });
		cab.createSpan({ cls: "an-tou-help-kicker", text: "Cabinet" });
		cab.createEl("strong", { text: t.sampleCabinet });
		cab.createSpan({ cls: "an-tou-help-id", text: "cabinet" });
		home.createSpan({ cls: "an-tou-help-arrow", text: "↓" });
		home.createSpan({ cls: "an-tou-help-chip", text: t.helpInside });
		const child = home.createDiv({ cls: "an-tou-help-mini" });
		child.createSpan({ cls: "an-tou-help-kicker", text: "Thinking" });
		child.createEl("strong", { text: t.sampleThinking });
		child.createSpan({ cls: "an-tou-help-id", text: "cabinet" });
		nest.createDiv({ cls: "an-tou-help-note", text: t.helpParentNote });

		pop.createDiv({ cls: "an-tou-help-note", text: t.helpQuietNote });
	}

	async removeRoom(id: string) {
		this.plugin.settings.rooms = this.plugin.settings.rooms.filter((r) => r.id !== id);
		for (const room of this.plugin.settings.rooms) {
			if (room.parent === id) delete room.parent;
		}
		await this.saveAndRefresh();
		this.display();
	}
}

export default class AnTouPlugin extends Plugin {
	settings: AnTouSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
	ribbonChrome: HTMLElement[] = [];
	readingLeaf: WorkspaceLeaf | null = null;

	async onload() {
		const saved = (await this.loadData()) as Partial<AnTouSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, saved ?? {});
		// Object.assign 是浅拷贝，这两个数组会跟默认配置共用同一份，必须切断
		this.settings.rooms = Array.isArray(this.settings.rooms) ? this.settings.rooms.slice() : [];
		this.settings.skipPaths = Array.isArray(this.settings.skipPaths)
			? this.settings.skipPaths.slice()
			: [];
		if (!Array.isArray(this.settings.rooms)) this.settings.rooms = [];
		if (!Array.isArray(this.settings.skipPaths)) this.settings.skipPaths = [];
		if (this.settings.uiLang !== "en") this.settings.uiLang = "zh";
		if (!this.settings.title || this.settings.title === "An Tou") {
			this.settings.title = DEFAULT_TITLE;
		}
		let migrated = false;
		if (saved && typeof saved.applySerif === "undefined") {
			this.settings.applySerif = this.settings.applyLook !== false;
			migrated = true;
		}
		if (saved && typeof saved.hideRibbon === "undefined") {
			this.settings.hideRibbon = false;
			migrated = true;
		}
		if (migrated) await this.saveSettings();
		if (this.settings.skipSeeded !== true) {
			if (!this.settings.skipPaths.includes("attachments")) {
				this.settings.skipPaths.push("attachments");
			}
			this.settings.skipSeeded = true;
			await this.saveSettings();
		}

		this.registerView(VIEW_TYPE, (leaf) => new DeskView(leaf, this));
		this.addCommand({
			id: "open-desk",
			name: "Open desk",
			callback: () => {
				void this.activateView().then(() => {
					const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
					if (leaf?.view instanceof DeskView) void leaf.view.resetHome();
				});
			},
		});
		this.addCommand({
			id: "search-desk",
			name: "Search the desk",
			callback: () => {
				void this.activateView().then(() => {
					const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
					if (leaf?.view instanceof DeskView) leaf.view.focusSearch();
				});
			},
		});
		this.addCommand({
			id: "copy-desk-link",
			name: "Copy link to current note",
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || file.extension !== "md") return false;
				if (!checking) void this.copyActiveLink(file);
				return true;
			},
		});
		this.addCommand({
			id: "capture-note",
			name: "Jot a note",
			callback: () => {
				void this.activateView().then(() => {
					const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
					if (leaf?.view instanceof DeskView) leaf.view.captureNote();
				});
			},
		});
		this.registerObsidianProtocolHandler("quiet-desk", (data) => {
			void this.openFromLink(data);
		});
		this.addSettingTab(new AnTouSettingTab(this.app, this));
		this.applyLook();
		this.app.workspace.onLayoutReady(async () => {
			this.applyLook();
			this.applyExplorer();
			const fresh = this.settings.rooms.length === 0 && this.settings.welcomed !== true;
			if (!fresh && this.settings.welcomed !== true) {
				// 已经在用的老用户：标记一下，别拿欢迎页打扰他
				this.settings.welcomed = true;
				await this.saveSettings();
			}
			if (fresh) {
				await this.activateView("welcome");
				return;
			}
			if (this.settings.rooms.length === 0) {
				this.settings.rooms = this.scanRooms();
				await this.saveSettings();
			}
			if (this.settings.openOnStart) void this.activateView();
		});
	}

	onunload() {
		this.clearRibbonChrome();
		document.body.removeClass(
			"an-tou-look",
			"an-tou-serif",
			"an-tou-hide-ribbon",
			"an-tou-show-ribbon"
		);
	}

	applyLook() {
		const body = document.body;
		body.toggleClass("an-tou-look", this.settings.applyLook !== false);
		body.toggleClass("an-tou-serif", this.settings.applySerif !== false);
		const hide = this.settings.hideRibbon === true;
		body.toggleClass("an-tou-hide-ribbon", hide);
		body.toggleClass("an-tou-show-ribbon", !hide);
		setShowRibbon(this.app, !hide);
		const ribbon = leftRibbonOf(this.app);
		if (hide) {
			this.clearRibbonChrome();
			ribbon.hide?.();
			return;
		}
		ribbon.show?.();
		ribbon.setCollapsedState?.(false);
		this.ensureRibbonChrome();
	}

	clearRibbonChrome() {
		for (const el of this.ribbonChrome) el.remove();
		this.ribbonChrome = [];
	}

	ensureRibbonChrome() {
		const box = leftRibbonOf(this.app).ribbonSettingEl;
		if (!box) return;
		if (box.querySelector(".an-tou-ribbon-chrome")) return;
		const t = this.settings.uiLang === "en" ? COPY.en : COPY.zh;
		const add = (icon: string, label: string, run: () => void) => {
			const btn = box.createDiv({
				cls: "clickable-icon side-dock-ribbon-action an-tou-ribbon-chrome",
				attr: { "aria-label": label },
			});
			setIcon(btn, icon);
			btn.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				run();
			});
			this.ribbonChrome.push(btn);
		};
		const app = this.app as App & {
			commands: { executeCommandById: (id: string) => boolean };
		};
		add("help", t.ribbonHelp, () => {
			app.commands.executeCommandById("app:open-help");
		});
		add("lucide-settings", t.ribbonSettings, () => {
			app.commands.executeCommandById("app:open-settings");
		});
	}

	scanRooms(only?: string[] | null, withSubs = true): Room[] {
		const rooms: Room[] = [];
		const used = new Set<string>();
		const skip = this.settings.skipPaths;
		const copy = this.settings.uiLang === "en" ? COPY.en : COPY.zh;
		const files = this.app.vault.getMarkdownFiles();
		const root = this.app.vault.getRoot();
		for (const child of root.children) {
			if (!(child instanceof TFolder)) continue;
			if (child.name.startsWith(".")) continue;
			if (skipped(child.path, skip)) continue;
			if (only && !only.includes(child.path)) continue;
			const id = uniqueId(slug(child.name), used);
			const n = this.mdCount(child.path, files);
			const room: Room = {
				id,
				name: child.name,
				folder: child.path,
				kicker: kickerOf(child.name),
			};
			const line = noteCountLine(n, copy);
			if (line) room.line = line;
			rooms.push(room);
			if (!withSubs) continue;
			for (const sub of child.children) {
				if (!(sub instanceof TFolder)) continue;
				if (sub.name.startsWith(".")) continue;
				if (skipped(sub.path, skip)) continue;
				const sid = uniqueId(slug(sub.name), used);
				const sn = this.mdCount(sub.path, files);
				const childRoom: Room = {
					id: sid,
					name: sub.name,
					folder: sub.path,
					kicker: kickerOf(sub.name),
					parent: id,
				};
				const childLine = noteCountLine(sn, copy);
				if (childLine) childRoom.line = childLine;
				rooms.push(childRoom);
			}
		}
		return rooms;
	}

	mdCount(folder: string, files?: TFile[]): number {
		const skip = this.settings.skipPaths;
		const all = files ?? this.app.vault.getMarkdownFiles();
		return all.filter((f) => {
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
			if (isAutoKicker(parent)) parent.kicker = s.kicker;
			if (isAutoLine(parent.line)) parent.line = s.line;
		}

		for (const s of scanned) {
			const eid = idMap.get(s.id);
			if (!eid) continue;
			const ex = all.find((r) => r.id === eid);
			if (!ex) continue;
			if (isAutoKicker(ex)) ex.kicker = s.kicker;
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
		// 文件夹已经不在了的房间：只做标记，不替用户删——他可能只是暂时挪走了
		const hasKids = new Set(all.map((r) => r.parent).filter(Boolean) as string[]);
		for (const room of all) {
			if (!room.folder || hasKids.has(room.id)) {
				delete room.stale;
				continue;
			}
			const here = this.app.vault.getAbstractFileByPath(room.folder);
			if (here instanceof TFolder) delete room.stale;
			else room.stale = true;
		}
		return all;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async copyActiveLink(file: TFile) {
		const t = this.settings.uiLang === "en" ? COPY.en : COPY.zh;
		const ok = await copyText(noteUri(this.app, file));
		new Notice(ok ? t.copied : t.copyFailed);
	}

	async openFromLink(params: Record<string, string>) {
		const t = this.settings.uiLang === "en" ? COPY.en : COPY.zh;
		if (params.new === "1") {
			await this.activateView();
			const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
			const view = leaf?.view;
			if (!(view instanceof DeskView)) return;
			const folder = view.captureFolder();
			if (!folder) {
				new Notice(t.noCaptureFolder);
				return;
			}
			if (params.name) await view.createNamedNote(folder, params.name);
			else view.captureNote();
			return;
		}
		const raw = (params.note || params.file || "").trim();
		if (!raw) return;
		const files = this.app.vault.getMarkdownFiles();
		let file = files.find((f) => f.path === raw || f.path === raw + ".md");
		if (!file) {
			const lower = raw.toLowerCase();
			file = files.find(
				(f) => f.path.toLowerCase() === lower || f.basename.toLowerCase() === lower
			);
		}
		if (!file) {
			new Notice(t.linkMissing);
			return;
		}
		if (params.copy === "1") {
			await this.copyActiveLink(file);
			return;
		}
		await this.activateView();
		const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
		if (leaf?.view instanceof DeskView) {
			leaf.view.goToNote(file);
			await leaf.view.openNote(file);
		}
	}

	refreshDesks() {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
			const view = leaf.view;
			if (!(view instanceof DeskView)) continue;
			// 看得见的立刻重画；看不见的只标记，等它露面时再画
			if (view.isShownNow()) void view.render();
			else view.dirty = true;
		}
	}

	async activateView(start?: "welcome") {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
		if (!leaf) {
			leaf = workspace.getLeaf("tab");
			await leaf.setViewState({ type: VIEW_TYPE, active: true });
		}
		if (start === "welcome") {
			const view = leaf.view;
			if (view instanceof DeskView) {
				view.stack = [{ type: "welcome" }];
				void view.render();
			}
		}
		workspace.setActiveLeaf(leaf, { focus: true });
		this.applyExplorer();
	}

	applyExplorer() {
		const split = this.app.workspace.leftSplit;
		if (!split) return;
		if (this.settings.collapseExplorer) split.collapse();
		else split.expand();
	}
}
