import { getDb } from '../store';
import { runTopicCycle } from './service';

/** 专题自动追踪调度器：应用内单例，每 TICK_MS 扫描一次开启自动追踪且到期的专题。
 * 约束：仅在 dev/start 进程存活时工作；Windows 本地无 cron，由 instrumentation 启动。
 * 失败隔离：单个专题失败记 lastError，不阻塞其他；并发上限防反爬。 */

const TICK_MS = 60_000;
const MAX_CONCURRENT = 2;

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const db = await getDb();
    const now = Date.now();
    const due = (db.topics ?? []).filter(
      (t) => t.autoTrack && (!t.lastTrackedAt || now - t.lastTrackedAt >= t.trackIntervalHours * 3_600_000),
    );
    for (let i = 0; i < due.length; i += MAX_CONCURRENT) {
      const batch = due.slice(i, i + MAX_CONCURRENT);
      await Promise.allSettled(batch.map((t) => runTopicCycle(t.id)));
    }
  } catch {
    // 调度器异常不抛出，避免杀死宿主进程
  } finally {
    running = false;
  }
}

export function ensureTopicScheduler(): void {
  if (timer || typeof setInterval === 'undefined') return;
  // 错开启动瞬间的抓取洪峰，首次延迟半个 tick
  timer = setInterval(tick, TICK_MS);
  timer.unref?.();
  setTimeout(() => void tick(), 30_000);
}
