export async function register() {
  // Node 运行时启动专题自动追踪调度器（edge 运行时不启动）
  // Vercel Serverless 上不启动：实例生命周期短、setInterval 不可靠，自动追踪在线上暂不生效
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.VERCEL !== '1') {
    const { ensureTopicScheduler } = await import('./lib/topics/scheduler');
    ensureTopicScheduler();
  }
}
