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
}

function mask(key: string): string {
  if (key.length <= 12) return '****';
  return `${key.slice(0, 8)}****${key.slice(-4)}`;
}

/** POST /api/settings：更新设置（榜单源开关等；Key/模型/Mock 在 Loop 2 接入） */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SettingsBody;
    const settings = await getSettings();
    if (body.builtinSources) {
      settings.builtinSources = { ...settings.builtinSources, ...body.builtinSources };
    }
    if (body.model) settings.model = body.model;
    if (typeof body.mockMode === 'boolean') settings.mockMode = body.mockMode;
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
