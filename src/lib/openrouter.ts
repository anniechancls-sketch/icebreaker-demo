/**
 * OpenRouter API 调用封装
 * 纯 fetch 实现，无任何第三方 AI SDK 依赖
 * API Docs: https://openrouter.ai/docs
 */

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

interface OpenRouterMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface OpenRouterResponse {
  choices: Array<{
    message: { content: string }
  }>
  usage?: {
    total_tokens: number
  }
}

async function openRouterChatCompletion(
  messages: OpenRouterMessage[],
  model: string = "anthropic/claude-3.5-haiku",
  maxTokens: number = 300
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set")
  }

  const referer = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://icebreaker-demo.vercel.app"

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": referer,
      "X-Title": "海外客户破冰助手",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`)
  }

  const data = await response.json() as OpenRouterResponse
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error("OpenRouter returned empty response")
  }
  return content
}

// ─── 内置模型列表（供模型管理页面使用）──────────────────────

export const BUILTIN_MODELS = [
  { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", provider: "Anthropic", speed: "最快", cost: "最低" },
  { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku", provider: "Anthropic", speed: "快", cost: "低" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", speed: "快", cost: "低" },
  { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "Google", speed: "很快", cost: "低" },
  { id: "meta-llama/llama-3.1-8b-instruct", name: "Llama 3.1 8B", provider: "Meta", speed: "快", cost: "极低" },
  { id: "deepseek/deepseek-chat-v3", name: "DeepSeek Chat V3", provider: "DeepSeek", speed: "快", cost: "极低" },
  { id: "mistralai/mistral-7b-instruct", name: "Mistral 7B", provider: "Mistral", speed: "快", cost: "低" },
  { id: "qwen/qwen2.5-72b-instruct", name: "Qwen 2.5 72B", provider: "Alibaba", speed: "中", cost: "中" },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI", speed: "中", cost: "高" },
  { id: "anthropic/claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic", speed: "慢", cost: "最高" },
]

// ─── 公司分析 ───────────────────────────────────────────────

const COMPANY_ANALYSIS_PROMPT = `You are a B2B company research analyst. Based on the following information, analyze this company and respond ONLY with valid JSON (no markdown, no explanation).

Input information:
- Company name: {companyName}
- Website content (if available): {websiteContent}

Respond with this exact JSON structure:
{{
  "name": "Official company name or inferred from input",
  "main_business": "One sentence describing their core business in Chinese (e.g. '建材批发商' / '工程施工服务商' / '管道制造商' / '分销商')",
  "products": ["product category 1", "product category 2", "product category 3"],
  "scale": "Estimated company scale in Chinese (e.g. '小型批发商' / '中型工程商' / '大型制造商')",
  "country": "The country this company is based in, in Chinese (e.g. '美国' / '波兰' / '法国'). Infer from company name and website content.",
  "country_code": "ISO 3166-1 alpha-2 country code in uppercase (e.g. 'US' / 'PL' / 'FR'). If you're unsure, return 'UNKNOWN'.",
  "confidence": 0.0-1.0 (how confident are you in this analysis)
}}

If website content is empty or minimal, base your analysis on the company name alone and set confidence below 0.6.
Only respond with the JSON. No markdown formatting.`

// ─── 破冰话术 ───────────────────────────────────────────────

const ICEBREAKER_PROMPT = `You are a senior B2B piping & building materials sales consultant.

Generate a natural, professional cold outreach opener (100-150 words) based on the following client information:

Client Company: {companyName}
Main Business: {mainBusiness}
Product Types: {products}
Scale: {scale}
Target Country: {country}
Standard System: {standardSystem}
Common Standards: {standardCodes}

Requirements:
1. Professional but not cold — make the client feel understood
2. Reference the local market standards naturally (show you understand their market)
3. Include information value — not just pleasantries
4. Naturally lead into introducing pipe products suitable for their market
5. Write in {language}

Respond ONLY with the opener text, nothing else.`

// ─── 导出方法 ───────────────────────────────────────────────

export async function analyzeCompanyWithAI(
  companyName: string,
  websiteContent?: string,
  model?: string
): Promise<{
  name: string
  main_business: string
  products: string[]
  scale: string
  country: string
  country_code: string
  confidence: number
}> {
  const content = websiteContent || "（无官网内容，仅基于公司名称分析）"

  const prompt = COMPANY_ANALYSIS_PROMPT
    .replace("{companyName}", companyName)
    .replace("{websiteContent}", content)

  const response = await openRouterChatCompletion(
    [
      {
        role: "system",
        content:
          "You are a precise company analyst. Always respond with valid JSON only, no markdown code blocks.",
      },
      { role: "user", content: prompt },
    ],
    model || "anthropic/claude-3.5-haiku",
    400
  )

  // 清理可能的 markdown JSON 包装
  const jsonStr = response.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim()

  try {
    return JSON.parse(jsonStr)
  } catch {
    return {
      name: companyName,
      main_business: "未能明确分析，请补充官网链接",
      products: ["未知"],
      scale: "待确认",
      country: "未知",
      country_code: "UNKNOWN",
      confidence: 0.2,
    }
  }
}

export async function generateIcebreaker(
  params: {
    companyName: string
    mainBusiness: string
    products: string[]
    scale: string
    countryName: string
    standardSystem: string[]
    standardCodes: string[]
    language: string
  },
  model?: string
): Promise<{ text: string; language: string }> {
  const prompt = ICEBREAKER_PROMPT
    .replace("{companyName}", params.companyName)
    .replace("{mainBusiness}", params.mainBusiness)
    .replace("{products}", params.products.join("、"))
    .replace("{scale}", params.scale)
    .replace("{country}", params.countryName)
    .replace("{standardSystem}", params.standardSystem.join(" / "))
    .replace("{standardCodes}", params.standardCodes.join("、"))
    .replace("{language}", params.language)

  const response = await openRouterChatCompletion(
    [
      {
        role: "system",
        content:
          "You are a professional B2B sales consultant. Only respond with the opener text, no explanations.",
      },
      { role: "user", content: prompt },
    ],
    model || "anthropic/claude-3.5-haiku",
    300
  )

  return {
    text: response.trim(),
    language: params.language,
  }
}
