/**
 * 联网搜索 — 真实搜索公司信息
 * 使用 DuckDuckGo Instant Answer API（免费，无需 Key）
 * 也支持 Google SerpAPI（付费，可选）
 */

const DDG_API = "https://api.duckduckgo.com"

/**
 * 搜索公司情报
 * @param query 公司名 + 国家关键词
 * @returns 搜索结果摘要文本 + 来源 URL 列表
 */
export async function searchCompanyInfo(query: string): Promise<{
  content: string
  sources: Array<{ url: string; title: string }>
}> {
  try {
    const resp = await fetch(
      `${DDG_API}/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&t=hd_sem`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!resp.ok) throw new Error(`DDG ${resp.status}`)

    const data = await resp.json() as {
      AbstractText?: string
      DefinitionText?: string
      RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>
      Results?: Array<{ Text?: string; FirstURL?: string }>
      AnswerType?: string
    }

    const parts: string[] = []
    const sources: Array<{ url: string; title: string }> = []

    if (data.AbstractText) {
      parts.push(data.AbstractText)
    }
    if (data.DefinitionText) {
      parts.push(data.DefinitionText)
    }

    const addSource = (url?: string, text?: string) => {
      if (!url) return
      try {
        const u = new URL(url)
        sources.push({ url: u.href, title: text || u.hostname })
      } catch {}
    }

    if (data.RelatedTopics) {
      data.RelatedTopics.slice(0, 5).forEach((t) => {
        if (t.Text) parts.push(t.Text)
        addSource(t.FirstURL, t.Text)
      })
    }
    if (data.Results) {
      data.Results.slice(0, 5).forEach((r) => {
        if (r.Text) parts.push(r.Text)
        addSource(r.FirstURL, r.Text)
      })
    }

    const content = parts.join(" ").replace(/\s+/g, " ").trim()

    return {
      content: content || "",
      sources: sources.slice(0, 6),
    }
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
  try {
    const resp = await fetch(
      `${DDG_API}/?q=${encodeURIComponent(`pipe plumbing standards ${country}`)}&format=json&no_redirect=1&t=hd_sem`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!resp.ok) return ""

    const data = await resp.json() as {
      AbstractText?: string
      DefinitionText?: string
      RelatedTopics?: Array<{ Text?: string }>
    }

    const parts: string[] = []
    if (data.AbstractText) parts.push(data.AbstractText)
    if (data.DefinitionText) parts.push(data.DefinitionText)
    if (data.RelatedTopics) {
      data.RelatedTopics.slice(0, 3).forEach((t) => {
        if (t.Text) parts.push(t.Text)
      })
    }
    return parts.join(" ").replace(/\s+/g, " ").trim()
  } catch {
    return ""
  }
}