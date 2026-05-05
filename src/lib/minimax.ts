/**
 * MiniMax API 调用封装
 * API Docs: https://www.minimaxi.com/document/Guides/Quickstart
 */

const MINIMAX_BASE_URL = "https://api.minimax.chat/v1"

interface MiniMaxMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface MiniMaxResponse {
  choices: Array<{
    message: { content: string }
  }>
  usage?: {
    total_tokens: number
  }
}

export async function minimaxChatCompletion(
  messages: MiniMaxMessage[],
  model: string = "MiniMax-Text-01",
  maxTokens: number = 300
): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY

  if (!apiKey) {
    throw new Error("MINIMAX_API_KEY environment variable is not set")
  }

  const response = await fetch(`${MINIMAX_BASE_URL}/text/chatcompletion_v2`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`MiniMax API error ${response.status}: ${errorText}`)
  }

  const data: MiniMaxResponse = await response.json()
  return data.choices[0]?.message?.content ?? ""
}

// ─── 公司分析 Prompt ───────────────────────────────────────

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
  "confidence": 0.0-1.0 (how confident are you in this analysis)
}}

If website content is empty or minimal, base your analysis on the company name alone and set confidence below 0.6.
Only respond with the JSON. No markdown formatting.`

// ─── 破冰话术 Prompt ───────────────────────────────────────

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
  websiteContent?: string
): Promise<{
  name: string
  main_business: string
  products: string[]
  scale: string
  confidence: number
}> {
  const content = websiteContent || "（无官网内容，仅基于公司名称分析）"

  const prompt = COMPANY_ANALYSIS_PROMPT.replace("{companyName}", companyName).replace(
    "{websiteContent}",
    content
  )

  const response = await minimaxChatCompletion(
    [
      {
        role: "system",
        content:
          "You are a precise company analyst. Always respond with valid JSON only, no markdown code blocks.",
      },
      { role: "user", content: prompt },
    ],
    "MiniMax-Text-01",
    400
  )

  // 清理可能的 markdown JSON 包装
  const jsonStr = response.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim()

  try {
    return JSON.parse(jsonStr)
  } catch {
    // 降级：返回基于名称的简单分析
    return {
      name: companyName,
      main_business: "未能明确分析，请补充官网链接",
      products: ["未知"],
      scale: "待确认",
      confidence: 0.2,
    }
  }
}

export async function generateIcebreaker(params: {
  companyName: string
  mainBusiness: string
  products: string[]
  scale: string
  countryName: string
  standardSystem: string[]
  standardCodes: string[]
  language: string
}): Promise<{ text: string; language: string }> {
  const prompt = ICEBREAKER_PROMPT.replace("{companyName}", params.companyName)
    .replace("{mainBusiness}", params.mainBusiness)
    .replace("{products}", params.products.join("、"))
    .replace("{scale}", params.scale)
    .replace("{country}", params.countryName)
    .replace("{standardSystem}", params.standardSystem.join(" / "))
    .replace("{standardCodes}", params.standardCodes.join("、"))
    .replace("{language}", params.language)

  const response = await minimaxChatCompletion(
    [
      {
        role: "system",
        content:
          "You are a professional B2B sales consultant. Only respond with the opener text, no explanations.",
      },
      { role: "user", content: prompt },
    ],
    "MiniMax-Text-01",
    300
  )

  return {
    text: response.trim(),
    language: params.language,
  }
}
