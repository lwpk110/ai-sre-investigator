// 知识库 API 客户端（V2-F1）

export interface KnowledgeEntry {
  id: number;
  symptom: string;
  service_name: string;
  root_cause: string;
  confidence: string;
  tags: string;
  created_at: string;
}

export interface KnowledgeSearchResult {
  total: number;
  entries: KnowledgeEntry[];
}

/** 搜索相似 RCA */
export async function searchKnowledge(
  keyword: string
): Promise<KnowledgeSearchResult> {
  const resp = await fetch(`/api/knowledge?q=${encodeURIComponent(keyword)}`);
  if (!resp.ok) throw new Error(`搜索失败 (${resp.status})`);
  return resp.json();
}

/** 获取知识库列表 */
export async function listKnowledge(
  limit = 20
): Promise<KnowledgeSearchResult> {
  const resp = await fetch(`/api/knowledge?limit=${limit}`);
  if (!resp.ok) throw new Error(`获取列表失败 (${resp.status})`);
  return resp.json();
}
