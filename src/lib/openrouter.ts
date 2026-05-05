/**
 * OpenRouter API — 纯 fetch，无任何第三方 AI SDK
 * 已知 Vercel Node 24 运行时对 Unicode 头有问题，所有 header 强制 ASCII
 */

const OR_BASE = "https://openrouter.ai/api/v1"

async function chatComplete(
  messages: Array<{ role: string; content: string }>,
  model: string,
  maxTokens: number
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set")

  const vercelUrl = process.env.VERCEL_URL
  // 强制 ASCII referer，避免 Node 24 TextEncoder 对 Unicode 的 bug
  const referer = vercelUrl
    ? `https://${vercelUrl.replace(/[^\x00-\x7F]/g, '')}`
    : "https://icebreaker-demo.vercel.app"

  const resp = await fetch(`${OR_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": referer,
      // 改用 ASCII only 的 title，避免 TextEncoder 异常
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

const COMPANY_PROMPT = `You are a B2B company research analyst. Respond ONLY with valid JSON.

Company: {name}
Website content: {content}

JSON:
{"name":"...","main_business":"...","products":["...","..."],"scale":"...","country":"...","country_code":"...","confidence":0.0}`

const ICEBREAKER_PROMPT = `Write a 100-150 word professional cold outreach opener in {lang}.

Company: {company}
Business: {biz}
Products: {products}
Country: {country}
Standards: {stds}

Write ONLY the opener text.`

// ─── 导出 ────────────────────────────────────────────────────

export async function analyzeCompany(
  name: string,
  content: string,
  model: string
) {
  const prompt = COMPANY_PROMPT
    .replace("{name}", name)
    .replace("{content}", content || "（no website content）")

  const raw = await chatComplete(
    [{ role: "system", content: "Respond JSON only." },
     { role: "user", content: prompt }],
    model, 400
  )

  const json = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim()
  try { return JSON.parse(json) } catch {
    return { name, main_business: "分析失败", products: ["未知"],
             scale: "未知", country: "未知", country_code: "UNKNOWN", confidence: 0.1 }
  }
}

export async function generateOpener(
  p: {
    company: string; biz: string; products: string[];
    scale: string; country: string; stds: string[]; lang: string
  },
  model: string
) {
  const prompt = ICEBREAKER_PROMPT
    .replace("{lang}", p.lang)
    .replace("{company}", p.company)
    .replace("{biz}", p.biz)
    .replace("{products}", p.products.join("、"))
    .replace("{scale}", p.scale)
    .replace("{country}", p.country)
    .replace("{stds}", p.stds.join(" / "))

  const text = await chatComplete(
    [{ role: "system", content: "Reply with opener text only." },
     { role: "user", content: prompt }],
    model, 300
  )
  return { text: text.trim(), language: p.lang }
}
