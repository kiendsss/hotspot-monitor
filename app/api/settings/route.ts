import { NextResponse, type NextRequest } from 'next/server';
import { getSettings, saveSettings } from '@/lib/store';
import type { Settings } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** GET /api/settings：读取设置（Key 脱敏返回） */
export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({
    ok: true,
    settings: {
      ...settings,
      openrouterKey: settings.openrouterKey ? mask(settings.openrouterKey) : undefined,
      hasKey: Boolean(settings.openrouterKey),
    },
  });
}

interface SettingsBody {
  openrouterKey?: string;
  model?: string;
  mockMode?: boolean;
  builtinSources?: Partial<Settings['builtinSources']>;
  sourceLimits?: Partial<Settings['sourceLimits']>;
  quality?: Partial<Settings['quality']>;
  interestKeywords?: string[];
}

function mask(key: string): string {
  if (key.length <= 12) return '****';
  return `${key.slice(0, 8)}****${key.slice(-4)}`;
}

/** 数值钳制：非法/越界输入回落到现值，防止一条坏配置打坏整条链路 */
function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

/** POST /api/settings：更新设置（榜单源开关等；Key/模型/Mock 在 Loop 2 接入） */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SettingsBody;
    const settings = await getSettings();
    if (body.builtinSources) {
      settings.builtinSources = { ...settings.builtinSources, ...body.builtinSources };
    }
    if (body.sourceLimits) {
      const merged = { ...(settings.sourceLimits ?? {}) } as NonNullable<Settings['sourceLimits']>;
      for (const [key, value] of Object.entries(body.sourceLimits)) {
        if (value && (typeof value.topN === 'number' || typeof value.minHeat === 'number')) {
          const prev = merged[key as keyof typeof merged] ?? { topN: 30, minHeat: 0 };
          merged[key as keyof typeof merged] = {
            topN: clampInt(value.topN, 5, 50, prev.topN),
            minHeat: clampInt(value.minHeat, 0, 100_000_000, prev.minHeat),
          };
        }
      }
      settings.sourceLimits = merged;
    }
    if (body.quality) {
      settings.quality = {
        verifyEnabled: typeof body.quality.verifyEnabled === 'boolean' ? body.quality.verifyEnabled : (settings.quality?.verifyEnabled ?? true),
        minEngines: clampInt(body.quality.minEngines, 1, 4, settings.quality?.minEngines ?? 1),
        minHits: clampInt(body.quality.minHits, 0, 1_000_000, settings.quality?.minHits ?? 5),
        requireCrossSource: typeof body.quality.requireCrossSource === 'boolean' ? body.quality.requireCrossSource : (settings.quality?.requireCrossSource ?? true),
        cacheTtlMs: settings.quality?.cacheTtlMs ?? 6 * 60 * 60 * 1000,
      };
    }
    if (body.model) settings.model = body.model;
    if (typeof body.mockMode === 'boolean') settings.mockMode = body.mockMode;
    if (Array.isArray(body.interestKeywords)) {
      settings.interestKeywords = body.interestKeywords
        .filter((kw): kw is string => typeof kw === 'string')
        .map((kw) => kw.trim())
        .filter(Boolean)
        .slice(0, 30);
    }
    if (body.openrouterKey !== undefined && body.openrouterKey !== '') {
      settings.openrouterKey = body.openrouterKey;
    }
    await saveSettings(settings);
    return NextResponse.json({
      ok: true,
      settings: {
        ...settings,
        openrouterKey: settings.openrouterKey ? mask(settings.openrouterKey) : undefined,
        hasKey: Boolean(settings.openrouterKey),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
