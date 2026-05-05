/**
 * 联网搜索 — 真实搜索公司信息
 * 使用 Tavily Search API（免费额度 1000次/月，专为 AI 设计）
 * 环境变量：TAVILY_API_KEY
 */

const TAVILY_API = "https://api.tavily.com/search"

/**
 * 搜索公司情报
 * @param query 公司名
 * @returns 搜索结果摘要文本 + 来源 URL 列表
 */
export async function searchCompanyInfo(query: string): Promise<{
  content: string
  sources: Array<{ url: string; title: string }>
}> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    console.warn("TAVILY_API_KEY not set, skipping search")
    return { content: "", sources: [] }
  }

  try {
    const resp = await fetch(TAVILY_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: "basic",
        max_results: 5,
        include_answer: true,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!resp.ok) {
      const text = await resp.text().catch(() => "")
      throw new Error(`Tavily ${resp.status}: ${text}`)
    }

    const data = await resp.json() as {
      answer?: string
      results?: Array<{ url: string; title: string; content: string }>
    }

    const parts: string[] = []
    const sources: Array<{ url: string; title: string }> = []

    if (data.answer) {
      parts.push(data.answer)
    }

    if (data.results) {
      data.results.slice(0, 5).forEach((r) => {
        if (r.content) {
          // 取前 300 字摘要，避免过长
          parts.push(r.content.slice(0, 300))
        }
        sources.push({ url: r.url, title: r.title || r.url })
      })
    }

    const content = parts.join(" ").replace(/\s+/g, " ").trim()
    return { content, sources: sources.slice(0, 6) }
  } catch (e: any) {
    console.warn("searchCompanyInfo failed:", e.message)
    return { content: "", sources: [] }
  }
}

/**
 * 搜索国家标准信息
 * @param country 国家名称
 * @returns 标准相关信息摘要
 */
export async function searchStandardsInfo(country: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return ""

  try {
    const resp = await fetch(TAVILY_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: `${country} pipe plumbing water supply standards regulations`,
        search_depth: "basic",
        max_results: 3,
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!resp.ok) return ""

    const data = await resp.json() as {
      results?: Array<{ content: string }>
    }
    if (!data.results) return ""

    return data.results
      .slice(0, 3)
      .map((r) => r.content)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500)
  } catch {
    return ""
  }
}
