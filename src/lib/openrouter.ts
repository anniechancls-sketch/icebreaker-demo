/**
 * OpenRouter API — 纯 fetch，无任何第三方 AI SDK
 * 已知 Vercel Node 24 运行时对 Unicode 头有问题，所有 header 强制 ASCII
 */

const OR_BASE = "https://openrouter.ai/api/v1"

export async function chatComplete(
  messages: Array<{ role: string; content: string }>,
  model: string,
  maxTokens: number
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set")

  const vercelUrl = process.env.VERCEL_URL
  const referer = vercelUrl
    ? `https://${vercelUrl.replace(/[^\x00-\x7F]/g, '')}`
    : "https://icebreaker-demo.vercel.app"

  const resp = await fetch(`${OR_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": referer,
      "X-Title": "Icebreaker Demo",
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  })

  if (!resp.ok) {
    const body = await resp.text().catch(() => "")
    throw new Error(`OpenRouter ${resp.status}: ${body.slice(0, 200)}`)
  }

  const data = await resp.json() as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error("OpenRouter returned empty response")
  return content
}

// ─── 内置模型 ───────────────────────────────────────────────

export const BUILTIN_MODELS = [
  { id: "anthropic/claude-3.5-haiku",  name: "Claude 3.5 Haiku",  provider: "Anthropic", speed: "最快",  cost: "最低" },
  { id: "anthropic/claude-3-haiku",    name: "Claude 3 Haiku",    provider: "Anthropic", speed: "快",    cost: "低"   },
  { id: "openai/gpt-4o-mini",          name: "GPT-4o Mini",        provider: "OpenAI",    speed: "快",    cost: "低"   },
  { id: "google/gemini-2.0-flash",     name: "Gemini 2.0 Flash",   provider: "Google",    speed: "很快",  cost: "低"   },
  { id: "meta-llama/llama-3.1-8b-instruct", name: "Llama 3.1 8B",  provider: "Meta",      speed: "快",    cost: "极低" },
  { id: "deepseek/deepseek-chat-v3",   name: "DeepSeek Chat V3",   provider: "DeepSeek",  speed: "快",    cost: "极低" },
  { id: "mistralai/mistral-7b-instruct",name: "Mistral 7B",        provider: "Mistral",   speed: "快",    cost: "低"   },
  { id: "qwen/qwen2.5-72b-instruct",   name: "Qwen 2.5 72B",      provider: "Alibaba",   speed: "中",    cost: "中"   },
  { id: "openai/gpt-4o",               name: "GPT-4o",              provider: "OpenAI",    speed: "中",    cost: "高"   },
  { id: "anthropic/claude-3-opus",     name: "Claude 3 Opus",      provider: "Anthropic", speed: "慢",    cost: "最高" },
]

// ─── Prompts ─────────────────────────────────────────────────

// ─── 公司分析 Prompt ────────────────────────────────────────
const COMPANY_PROMPT = `You are a B2B company research analyst specializing in the building materials and plumbing pipe industry. You MUST use real-time web search results to gather facts. Respond ONLY with valid JSON.

Company to research: {name}

Web search results (use these as primary source):
{search_content}

Your task:
1. Based on the web search results above, identify the company
2. Determine its main business model: distributor (批发商), contractor (工程施工), manufacturer (制造商), project developer (项目开发商), municipal/government (市政/政府采购), retailer (零售商), or other
3. Extract: main products, estimated scale, country

JSON format (ALL fields required):
{
  "name": "official company name",
  "main_business": "1-2 sentence description of what this company does",
  "customer_type": "distributor|contractor|manufacturer|project_developer|municipal|retailer|other",
  "products": ["product1", "product2"],
  "scale": "estimated company size (employees/revenue range if available)",
  "country": "country name in Chinese",
  "country_code": "2-letter ISO code",
  "confidence": 0.0-1.0 (how certain are you based on web sources),
  "sources": [
    {"url": "https://...", "title": "page title or source name", "type": "search_result|website|linkedin|wiki|news"}
  ]
}

Rules:
- Use web search results as primary evidence. If search results are empty or vague, set confidence to 0.3 and note in sources
- At minimum include one source URL from the search results provided
- If the company cannot be identified from search results, return: confidence:0.1, customer_type:"unknown", sources:[]
- NEVER make up company details that are not supported by the search results
- customer_type must be one of: distributor, contractor, manufacturer, project_developer, municipal, retailer, other`

// ─── 破冰话术 Prompt ────────────────────────────────────────
const ICEBREAKER_PROMPT = `你是日丰企业集团（Rifong Enterprise）的海外业务员。日丰是中国塑料管道行业领先企业，主营 PE、PVC、PPR、HDPE 等管道产品，广泛应用于给水、排水、消防、地暖、市政工程、农业灌溉等领域。

Your identity: 日丰塑料管道领先企业的专业业务员

Company you are contacting: {company}
Customer type: {customer_type}
Customer business: {biz}
Customer products: {products}
Customer country: {country}
Relevant pipe standards in their country: {stds}

Write a 120-160 word cold outreach opener in {lang}.

Rules based on customer type:
- distributor (批发商): Emphasize product range advantage, supply stability, bulk pricing
- contractor (工程施工): Emphasize product quality, installation ease, project reference cases
- manufacturer (制造商): Emphasize raw material quality, certification compliance, OEM capability
- project_developer (项目开发商): Emphasize project track record, large-scale supply capacity, certification coverage
- municipal (市政/政府采购): Emphasize certifications, compliance with national standards, long-term reliability
- retailer (零售商): Emphasize brand support, marketing materials, consumer demand fit

Style: Professional but warm, knowledgeable about their market, specific to their country and standards, no generic filler.

Output ONLY the opener text in {lang} language.`

// ─── 导出函数 ───────────────────────────────────────────────

export async function analyzeCompany(
  name: string,
  searchContent: string,
  websiteContent: string,
  model: string
) {
  const prompt = COMPANY_PROMPT
    .replace("{name}", name)
    .replace("{search_content}", searchContent || "（no search results available）")

  const raw = await chatComplete(
    [
      { role: "system", content: "You are a professional B2B research analyst. Always respond with valid JSON only. Never invent facts not supported by sources." },
      { role: "user", content: prompt }
    ],
    model, 500
  )

  const json = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim()
  try {
    const result = JSON.parse(json)
    // Normalize sources format
    if (result.sources && Array.isArray(result.sources) && typeof result.sources[0] === "string") {
      result.sources = (result.sources as string[]).map((s: string) => {
        if (s.startsWith("website|")) {
          return { type: "website", url: s.replace("website|", ""), title: "" }
        }
        return { type: "inferred", url: "", title: s }
      })
    }
    return result
  } catch {
    return {
      name,
      main_business: "分析失败",
      customer_type: "other",
      products: ["未知"],
      scale: "未知",
      country: "未知",
      country_code: "UNKNOWN",
      confidence: 0.1,
      sources: []
    }
  }
}

export async function generateOpener(
  p: {
    company: string
    customer_type: string
    biz: string
    products: string[]
    scale: string
    country: string
    stds: string[]
    lang: string
  },
  model: string
) {
  const prompt = ICEBREAKER_PROMPT
    .replace("{lang}", p.lang)
    .replace("{company}", p.company)
    .replace("{customer_type}", p.customer_type)
    .replace("{biz}", p.biz)
    .replace("{products}", p.products.join("、"))
    .replace("{scale}", p.scale)
    .replace("{country}", p.country)
    .replace("{stds}", p.stds.join(" / "))

  const text = await chatComplete(
    [
      { role: "system", content: "You are a professional overseas sales representative for Rifong Enterprise, a leading Chinese plastic pipe manufacturer. Write a natural, professional cold outreach message." },
      { role: "user", content: prompt }
    ],
    model, 350
  )
  return { text: text.trim(), language: p.lang }
}
