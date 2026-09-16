export async function register() {
  // Node 运行时启动专题自动追踪调度器（edge 运行时不启动）
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureTopicScheduler } = await import('./lib/topics/scheduler');
    ensureTopicScheduler();
  }
}
