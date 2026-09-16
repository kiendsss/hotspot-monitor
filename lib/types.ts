export type SourceId =
  | 'weibo'
  | 'zhihu'
  | 'baidu'
  | 'github'
  | 'rss'
  | 'manual'
  | 'search';

/** 各采集源的尾部过滤阈值：榜单只保留前 topN 条，且平台原始热度不得低于 minHeat */
export interface SourceLimit {
  topN: number;
  minHeat: number;
}

/** 信息质量门槛：交叉验证与多源佐证配置 */
export interface QualitySettings {
  /** 是否启用搜索引擎交叉验证 */
  verifyEnabled: boolean;
  /** 通过验证所需的最少命中引擎数 */
  minEngines: number;
  /** 通过验证所需的最少搜索结果数（任一引擎） */
  minHits: number;
  /** 无平台热度的条目（RSS/手动）是否必须有跨源佐证 */
  requireCrossSource: boolean;
  /** 验证结果缓存时长（毫秒） */
  cacheTtlMs: number;
}

export interface RawItem {
  id: string;
  sourceId: SourceId;
  sourceName: string;
  title: string;
  text?: string;
  url?: string;
  /** 来源榜单位次（1 开始）；非榜单来源不设置 */
  rank?: number;
  /** 平台原始热度（如微博热搜数值、知乎热度），无量纲 */
  heat?: number;
  /** 来源侧附加信息，如微博的「热/新/爆」标签、GitHub 的语言/star 数 */
  extra?: string;
  /** 内容发布时间（毫秒时间戳）；榜单接口多数不提供，RSS/微博部分条目有 */
  publishedAt?: number;
  /** 平台互动数据，仅有接口直接返回时填充，不做回抓补齐 */
  interactions?: ItemInteractions;
  fetchedAt: number;
}

export interface ItemInteractions {
  likes?: number;
  replies?: number;
  reposts?: number;
  /** 无法拆分时的原始口径描述，如「今日 +1234 star」 */
  raw?: string;
}

export type HotspotCategory =
  | '社会'
  | '科技'
  | '财经'
  | '娱乐'
  | '体育'
  | '国际'
  | '健康'
  | '其他';

export type TrendType = 'new' | 'up' | 'down' | 'flat';

export interface Hotspot {
  id: string;
  rank: number;
  title: string;
  summary: string;
  category: HotspotCategory;
  /** 0-100 */
  heat: number;
  entities: string[];
  sentiment: '正' | '中' | '负';
  /** 指向快照内 RawItem 的 id 列表 */
  itemIds: string[];
  /** 搜索引擎交叉验证证据（未启用验证时为空） */
  verification?: Verification;
  trend?: TrendType;
  /** 与上一期同热点热度差值 */
  delta?: number;
  /** 与用户兴趣关键词的相关度 0-100（未配置兴趣词时缺失） */
  relevance?: number;
  /** AI 给出的相关度理由：引用命中关键词与来源佐证，一句话 */
  relevanceReason?: string;
  /** 出刊时从原始条目聚合的时间/来源/互动摘要，头版卡片直接展示免跳转 */
  meta?: HotspotMeta;
}

/** 热点元信息聚合：来自成员条目的时间、来源分布与互动总量 */
export interface HotspotMeta {
  /** 成员条目中最早的发布时间；榜单源多数不提供 */
  publishedAt?: number;
  /** 本项目首次抓取到该热点的时间 */
  firstFetchedAt?: number;
  /** 本项目最近一次抓取时间 */
  lastFetchedAt?: number;
  /** 来源分布明细，如 微博热搜2 · 知乎热榜1 */
  sources?: { name: string; count: number }[];
  /** 各条目互动数求和（仅对提供了该字段的条目累加） */
  interactions?: ItemInteractions;
}

export interface SourceResult {
  id: SourceId;
  name: string;
  ok: boolean;
  count: number;
  error?: string;
  costMs: number;
  /** 尾部过滤丢弃的条目数（未启用过滤时为 0） */
  filteredOut?: number;
}

/** 单个搜索引擎的佐证结果 */
export interface EngineHit {
  engine: string;
  ok: boolean;
  /** 搜索结果总数（解析失败时为 counted 的实际条数） */
  total: number;
  /** 实际抓到的结果条数 */
  counted: number;
  /** 结果总数是否来自“约 X 个结果”类官方计数 */
  officialCount: boolean;
  error?: string;
  /** v3-b 专题追踪：同一次解析提取的结果条目（验证层忽略，仅抓取用） */
  entries?: { title: string; url?: string; text?: string }[];
}

/** 候选热点的交叉验证证据 */
export interface Verification {
  /** 命中（counted > 0）的引擎数 */
  engines: number;
  /** 各引擎中的最大结果数 */
  maxHits: number;
  /** 各引擎结果数之和 */
  totalHits: number;
  /** 新闻引擎（百度新闻）的结果数 */
  newsHits: number;
  /** 综合佐证分（0-100） */
  score: number;
  /** 是否通过质量门槛 */
  passed: boolean;
  /** 未通过时的原因 */
  reason?: string;
  hits: EngineHit[];
}

/** 一次分析的验证统计摘要 */
export interface VerificationSummary {
  checked: number;
  passed: number;
  dropped: number;
  skipped: boolean;
}

export interface Snapshot {
  id: string;
  /** 刊号，从 1 递增 */
  issue: number;
  createdAt: number;
  model: string;
  mock: boolean;
  sources: SourceResult[];
  hotspots: Hotspot[];
  /** 交叉验证统计（未启用验证时 skipped=true） */
  verificationSummary?: VerificationSummary;
}

export interface RssFeed {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  addedAt: number;
}

export interface Settings {
  openrouterKey?: string;
  model: string;
  mockMode: boolean;
  rssFeeds: RssFeed[];
  /** 内置榜单源开关 */
  builtinSources: Record<'weibo' | 'zhihu' | 'baidu' | 'github', boolean>;
  /** 各源尾部过滤阈值（缺失时用 DEFAULT_SOURCE_LIMITS） */
  sourceLimits?: Partial<Record<'weibo' | 'zhihu' | 'baidu' | 'github', SourceLimit>>;
  /** 信息质量门槛（缺失时用 DEFAULT_QUALITY） */
  quality?: QualitySettings;
  /** 用户兴趣关键词：AI 据此给出 relevance 相关度与理由 */
  interestKeywords?: string[];
}

/** 专题追踪间隔档位（小时）：手动最小 1h，防反爬不设更细粒度 */
export type TrackInterval = 1 | 6 | 12 | 24;

/** 关键词专题：独立于头版快照的定向抓取 + AI 分析单元 */
export interface KeywordTopic {
  id: string;
  keyword: string;
  createdAt: number;
  /** 最近一次抓取（手动或自动）时间 */
  updatedAt: number;
  /** 自动追踪开关：开启后由调度器按 trackIntervalHours 周期抓取 + 分析 */
  autoTrack: boolean;
  trackIntervalHours: TrackInterval;
  /** 最近一次自动/手动执行完成时间（调度器判到期用） */
  lastTrackedAt?: number;
  /** 最近一次执行失败原因（抓取或分析），成功后清除 */
  lastError?: string;
  /** 专题素材条目（搜索引擎 + 微博站内搜索），按标题去重增量追加 */
  items: RawItem[];
  /** 最近一次分析报告：独立存放，不进头版快照序列 */
  report?: TopicReport;
}

export interface TopicReport {
  createdAt: number;
  model: string;
  mock: boolean;
  hotspots: Hotspot[];
}

export interface DbData {
  /** 原始条目池，analyze 后裁剪，保留最近 N 条 */
  items: RawItem[];
  snapshots: Snapshot[];
  /** 关键词专题（v3-b 新增，旧 db.json 缺失时视为空） */
  topics?: KeywordTopic[];
}
