import * as cheerio from 'cheerio';
import type { RawItem } from '../types';
import { fetchText } from './fetch';

/** GitHub Trending：解析 trending 页的仓库卡片，heat 用今日 star 数 */
export async function collectGithub(): Promise<{ items: RawItem[] }> {
  const html = await fetchText('https://github.com/trending');
  const $ = cheerio.load(html);
  const now = Date.now();
  const items: RawItem[] = [];

  $('article.Box-row').each((index, el) => {
    const repoPath = $(el).find('h2 a').attr('href')?.trim();
    if (!repoPath) return;
    const title = repoPath.replace(/^\//, '');
    const desc = $(el).find('p').text().trim();
    const language = $(el).find('[itemprop="programmingLanguage"]').text().trim();
    const starsText = $(el).find('a.Link--muted').first().text().trim().replace(/\s|,/g, '');
    // 今日 star：「1,234 stars today」
    const todayStarsText = $(el).find('span.d-inline-block.float-sm-right').text().trim();
    const todayStars = Number(todayStarsText.replace(/\D/g, '')) || undefined;
    items.push({
      id: `github_${now}_${index}_${title.replace('/', '_')}`,
      sourceId: 'github',
      sourceName: 'GitHub Trending',
      title,
      text: desc.slice(0, 200) || undefined,
      url: `https://github.com${repoPath}`,
      heat: todayStars,
      extra: [language, starsText ? `★${starsText}` : ''].filter(Boolean).join(' · ') || undefined,
      fetchedAt: now,
    });
  });

  if (items.length === 0) throw new Error('GitHub Trending 解析为空');
  return { items };
}
