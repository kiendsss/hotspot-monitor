// Vercel Serverless 兼容的环境与 AI 配置统一入口
// 原因：Serverless 下无持久文件、Key 可能只存在于环境变量，
// 所有 Route 都走这里拿 Key/模型/是否 Mock，避免各处重复判断出错。

export const isVercel = process.env.VERCEL === '1';

/** 存储入口复用：是否跑在 Vercel Serverless 上（KV vs 本地 JSON 的切换依据） */
export function isVercelRuntime(): boolean {
  return process.env.VERCEL === '1';
}

export type KeySource = 'settings' | 'env' | 'none';

export function getServerApiKey(settingsKey?: string): string | undefined {
  const s = settingsKey?.trim();
  if (s) return s;
  const env =
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.DEEPSEEK_API_KEY?.trim() ||
    '';
  return env || undefined;
}

export function getKeySource(settingsKey?: string): KeySource {
  if (settingsKey?.trim()) return 'settings';
  if (
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.DEEPSEEK_API_KEY?.trim()
  )
    return 'env';
  return 'none';
}

export function getServerModel(storedModel?: string): string {
  return (
    storedModel?.trim() ||
    process.env.AI_MODEL?.trim() ||
    'deepseek/deepseek-chat'
  );
}

export interface AiConfig {
  apiKey?: string;
  model: string;
  mock: boolean;
  keySource: KeySource;
}

/**
 * 渐进式增强核心规则：
 * - 无 Key → 强制 Mock（在线演示可直接看效果）
 * - Key 来自 env（Vercel 后台配置）→ 强制真实 AI，忽略本地 settings.mockMode
 *  （否则首次部署默认 mockMode=true 会把真实 Key 屏蔽掉）
 * - Key 来自设置页 → 尊重用户的 mockMode 开关
 */
export function resolveAiConfig(opts: {
  settingsKey?: string;
  storedModel?: string;
  mockMode?: boolean;
}): AiConfig {
  const keySource = getKeySource(opts.settingsKey);
  const apiKey = getServerApiKey(opts.settingsKey);
  const model = getServerModel(opts.storedModel);
  let mock: boolean;
  if (!apiKey || model === 'mock-rules') {
    mock = true;
  } else if (keySource === 'env') {
    mock = process.env.FORCE_MOCK === '1';
  } else {
    mock = opts.mockMode ?? true;
  }
  return { apiKey: mock ? undefined : apiKey, model, mock, keySource };
}
