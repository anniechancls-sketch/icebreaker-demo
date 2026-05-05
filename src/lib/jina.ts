/**
 * Jina AI Reader — 云端 URL 内容提取
 * 替代 Camoufox，无需浏览器，零配置
 * 免费额度：每月 10 万 tokens
 */

export async function extractWebsiteContent(url: string): Promise<string> {
  try {
    const apiUrl = `https://r.jina.ai/${encodeURIComponent(url)}`
    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
        "X-Return-Format": "text",
      },
      next: { revalidate: 3600 }, // 缓存 1 小时
    })

    if (!response.ok) {
      throw new Error(`Jina API error: ${response.status}`)
    }

    const text = await response.text()
    // 清理 HTML 标签和多余空白
    return text
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000) // 限制长度
  } catch (error) {
    console.error("Jina extraction failed:", error)
    throw error
  }
}
