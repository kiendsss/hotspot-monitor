import OpenAI from 'openai';
import type { Hotspot, HotspotCategory, RawItem } from './types';

const APP_TITLE = 'Hotspot Gazette';
const APP_URL = 'http://localhost:3000';

/** 按 key 前缀识别供应商：sk-or-v1-*=OpenRouter；sk-*=DeepSeek 官方（两者均为 OpenAI 兼容协议） */
export function resolveProvider(apiKey: string): {
  baseURL: string;
  headers: Record<string, string>;
  resolveModel: (model: string) => string;
} {
  if (apiKey.startsWith('sk-or-v1-')) {
    return {
      baseURL: 'https://openrouter.ai/api/v1',
      headers: { 'HTTP-Referer': APP_URL, 'X-OpenRouter-Title': APP_TITLE },
      resolveModel: (model) => model,
    };
  }
  return {
    baseURL: 'https://api.deepseek.com',
    headers: {},
    // DeepSeek 官方模型名不带 "deepseek/" 前缀，兼容设置页存的 OpenRouter 风格 slug
    resolveModel: (model) => (model.startsWith('deepseek/') ? model.slice('deepseek/'.length) : model),
  };
}

/** 单次分析送入模型的最大条目数与单条文本上限，控制 token */
const MAX_ITEMS_FOR_AI = 120;
const MAX_TEXT_LEN = 160;

export interface AnalyzeInput {
  items: RawItem[];
  model: string;
  apiKey?: string;
  /** 预聚合桶 key → 佐证摘要（如 [佐证:2源/引擎2个/分61]），AI 据此判断可信度 */
  evidenceByItemId?: Map<string, string>;
}

export interface AnalyzeOutput {
  hotspots: Omit<Hotspot, 'id' | 'rank' | 'trend' | 'delta'>[];
  model: string;
  mock: boolean;
}

interface AiHotspotRaw {
  title?: unknown;
  summary?: unknown;
  category?: unknown;
  heat?: unknown;
  entities?: unknown;
  sentiment?: unknown;
  itemIds?: unknown;
}

const VALID_CATEGORIES: HotspotCategory[] = [
  '社会', '科技', '财经', '娱乐', '体育', '国际', '健康', '其他',
];

const SYSTEM_PROMPT = `你是新闻热点分析师。根据提供的多来源内容条目，识别并聚合出 10-20 个热点话题。
规则：
1. 跨来源报道同一事件的条目必须合并为一个热点，itemIds 收录所有相关条目 id
2. heat 为 0-100 综合热度：综合来源数量、平台原始热度、榜单位置；条目自带的 [佐证] 摘要代表搜索引擎交叉验证结论，佐证分越高越可信
3. category 必须是：社会/科技/财经/娱乐/体育/国际/健康/其他 之一
4. sentiment 必须是：正/中/负 之一
5. summary 为 50 字以内的中文摘要，说明事件本身
6. entities 为 2-5 个关键实体（人名/机构/产品/地名）
7. 可信度把关：仅由单个来源、且无榜单热度（heat 为空，如 RSS/手动来稿）、且只有一条 itemIds 的候选，一律不得输出；榜单 rank 尾部（>30）的单源条目也不得单独成热点
8. 只输出 JSON，不要任何其他文字`;

function buildUserPrompt(items: RawItem[], evidenceByItemId?: Map<string, string>): string {
  const lines = items.map((item) => {
    const heat = item.heat ? ` heat=${item.heat}` : '';
    const rank = item.rank ? ` rank=${item.rank}` : '';
    const evidence = evidenceByItemId?.get(item.id) ? ` ${evidenceByItemId.get(item.id)}` : '';
    const text = item.text ? ` | ${item.text.slice(0, MAX_TEXT_LEN)}` : '';
    return `- id=${item.id} [${item.sourceName}] ${item.title}${heat}${rank}${evidence}${text}`;
  });
  return `内容条目（共 ${items.length} 条）：\n${lines.join('\n')}\n\n请输出 JSON：{"hotspots":[{"title":"...","summary":"...","category":"科技","heat":85,"entities":["..."],"sentiment":"中","itemIds":["id1","id2"]}]}`;
}

const RESPONSE_SCHEMA = {
  name: 'hotspot_report',
  strict: false,
  schema: {
    type: 'object' as const,
    properties: {
      hotspots: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            title: { type: 'string' as const },
            summary: { type: 'string' as const },
            category: { type: 'string' as const, enum: VALID_CATEGORIES },
            heat: { type: 'number' as const },
            entities: { type: 'array' as const, items: { type: 'string' as const } },
            sentiment: { type: 'string' as const, enum: ['正', '中', '负'] },
            itemIds: { type: 'array' as const, items: { type: 'string' as const } },
          },
          required: ['title', 'summary', 'category', 'heat', 'entities', 'sentiment', 'itemIds'],
        },
      },
    },
    required: ['hotspots'],
  },
};

/** 从模型输出中稳健提取 JSON（剥围栏、找平衡块） */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  try {
    return JSON.parse(candidate.trim());
  } catch {
    const start = candidate.indexOf('{');
    if (start === -1) throw new Error('输出中未找到 JSON');
    let depth = 0;
    for (let i = start; i < candidate.length; i++) {
      if (candidate[i] === '{') depth++;
      else if (candidate[i] === '}') {
        depth--;
        if (depth === 0) {
          return JSON.parse(candidate.slice(start, i + 1));
        }
      }
    }
    throw new Error('JSON 不完整');
  }
}

function normalizeHotspot(raw: AiHotspotRaw): Omit<Hotspot, 'id' | 'rank' | 'trend' | 'delta'> | null {
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!title) return null;
  const category = VALID_CATEGORIES.includes(raw.category as HotspotCategory)
    ? (raw.category as HotspotCategory)
    : '其他';
  const heat = Math.max(0, Math.min(100, Number(raw.heat) || 0));
  const entities = Array.isArray(raw.entities)
    ? raw.entities.filter((e): e is string => typeof e === 'string').slice(0, 5)
    : [];
  const sentiment = raw.sentiment === '正' || raw.sentiment === '负' ? raw.sentiment : '中';
  const itemIds = Array.isArray(raw.itemIds)
    ? raw.itemIds.filter((i): i is string => typeof i === 'string')
    : [];
  return {
    title,
    summary: typeof raw.summary === 'string' ? raw.summary.slice(0, 120) : '',
    category,
    heat,
    entities,
    sentiment,
    itemIds,
  };
}

/** 真实 AI 分析：按 key 识别供应商；结构化输出不支持时降级为提示词约束 */
async function analyzeWithAi(input: AnalyzeInput): Promise<AnalyzeOutput> {
  const provider = resolveProvider(input.apiKey!);
  const client = new OpenAI({
    baseURL: provider.baseURL,
    apiKey: input.apiKey,
    defaultHeaders: provider.headers,
  });
  const model = provider.resolveModel(input.model);
  const trimmed = input.items.slice(-MAX_ITEMS_FOR_AI);
  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    { role: 'user' as const, content: buildUserPrompt(trimmed, input.evidenceByItemId) },
  ];

  const attempt = async (useSchema: boolean) => {
    const completion = await client.chat.completions.create({
      model,
      messages,
      ...(useSchema ? { response_format: { type: 'json_schema' as const, json_schema: RESPONSE_SCHEMA } } : {}),
      temperature: 0.3,
    });
    return completion.choices[0]?.message?.content ?? '';
  };

  let text = '';
  try {
    text = await attempt(true);
  } catch {
    text = await attempt(false);
  }

  const parsed = extractJson(text);
  const rawList = (parsed as { hotspots?: AiHotspotRaw[] })?.hotspots;
  if (!Array.isArray(rawList) || rawList.length === 0) {
    throw new Error('AI 返回的 hotspots 为空');
  }
  const hotspots = rawList
    .map(normalizeHotspot)
    .filter((h): h is NonNullable<ReturnType<typeof normalizeHotspot>> => h !== null);
  if (hotspots.length === 0) throw new Error('AI 返回内容均无法解析');
  return { hotspots, model: input.model, mock: false };
}

/**
 * Mock 分析（无 Key 时）：按来源 heat 归一化 + 跨源标题相似聚合。
 * 规则可解释、可复现，用于跑通全链路与演示。
 * 单桶孤条且平台热度极低的尾部噪声在此淘汰，挡住「随便发一条」。
 */
async function analyzeWithMock(input: AnalyzeInput): Promise<AnalyzeOutput> {
  const items = input.items.slice(-MAX_ITEMS_FOR_AI);
  const bySourceMax = new Map<string, number>();
  for (const item of items) {
    if (item.heat) {
      bySourceMax.set(item.sourceId, Math.max(bySourceMax.get(item.sourceId) ?? 0, item.heat));
    }
  }

  // 简易聚合：标题前 12 字归一化分桶
  const buckets = new Map<string, RawItem[]>();
  for (const item of items) {
    const key = item.title.replace(/[\s\p{P}]+/gu, '').slice(0, 12);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }

  const hotspots = [...buckets.values()]
    .map((bucket): (Omit<Hotspot, 'id' | 'rank' | 'trend' | 'delta'> & { evidenceLine?: string }) | null => {
      const primary = bucket.reduce((a, b) => ((b.heat ?? 0) > (a.heat ?? 0) ? b : a));
      const maxHeat = bySourceMax.get(primary.sourceId) ?? 0;
      const heatFromPlatform = maxHeat > 0 ? Math.round(((primary.heat ?? 0) / maxHeat) * 80) : 0;
      const crossSourceBonus = Math.min(bucket.length * 8, 20);
      const heat = Math.min(100, heatFromPlatform + crossSourceBonus);
      // 单源孤条 + 无榜单热度（RSS/手动/尾部）→ 噪声淘汰
      const isHeatless = bucket.every((b) => b.heat === undefined);
      if (bucket.length === 1 && (isHeatless || heat < 15)) return null;
      const evidenceLine = input.evidenceByItemId?.get(primary.id);
      return {
        title: primary.title,
        summary: `${evidenceLine ? `${evidenceLine} ` : ''}${primary.text?.slice(0, 80) || `来自 ${primary.sourceName} 的热点：${primary.title}`}`.slice(0, 120),
        category: '其他',
        heat,
        entities: [],
        sentiment: '中' as const,
        itemIds: bucket.map((b) => b.id),
      };
    })
    .filter((h): h is NonNullable<typeof h> => h !== null)
    .sort((a, b) => b.heat - a.heat)
    .slice(0, 20)
    .map(({ evidenceLine: _dropped, ...hotspot }) => hotspot);

  return { hotspots, model: 'mock-rules', mock: true };
}

/** 统一入口：有 Key 且非 Mock 模式走真实 AI（DeepSeek 官方或 OpenRouter），否则 Mock */
export async function analyzeHotspots(input: AnalyzeInput): Promise<AnalyzeOutput> {
  if (input.apiKey && input.model !== 'mock-rules') {
    return analyzeWithAi(input);
  }
  return analyzeWithMock(input);
}
