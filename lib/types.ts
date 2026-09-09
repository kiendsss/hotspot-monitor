export type SourceId =
  | 'weibo'
  | 'zhihu'
  | 'baidu'
  | 'github'
  | 'rss'
  | 'manual';

export interface RawItem {
  id: string;
  sourceId: SourceId;
  sourceName: string;
  title: string;
  text?: string;
  url?: string;
  /** 平台原始热度（如微博热搜数值、知乎热度），无量纲 */
  heat?: number;
  /** 来源侧附加信息，如微博的「热/新/爆」标签、GitHub 的语言/star 数 */
  extra?: string;
  fetchedAt: number;
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
  trend?: TrendType;
  /** 与上一期同热点热度差值 */
  delta?: number;
}

export interface SourceResult {
  id: SourceId;
  name: string;
  ok: boolean;
  count: number;
  error?: string;
  costMs: number;
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
}

export interface DbData {
  /** 原始条目池，analyze 后裁剪，保留最近 N 条 */
  items: RawItem[];
  snapshots: Snapshot[];
}
