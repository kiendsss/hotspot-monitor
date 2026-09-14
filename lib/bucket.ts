/** 标题归一化分桶 key：去掉空白与标点后取前 12 字。
 * 采集层之后的预聚合、搜索引擎验证缓存、Mock 简报必须同口径，否则会出现「验证 A、分析 B」错位。 */
export function bucketKey(title: string): string {
  return title.replace(/[\s\p{P}]+/gu, '').slice(0, 12);
}

/** 跨期/跨源标题配对用的强归一化（保留全量字符，仅去符号与大小写） */
export function normalizeTitle(title: string): string {
  return title.replace(/[\s\p{P}\p{S}]+/gu, '').toLowerCase();
}
