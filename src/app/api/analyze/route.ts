import { NextRequest, NextResponse } from "next/server"
import { analyzeCompany, generateOpener, chatComplete } from "@/lib/openrouter"
import { getStandardsByCountry, getCountryLanguage } from "@/lib/standards"

export const runtime = "nodejs"
export const maxDuration = 90

function inferCountry(text: string): string {
  const t = text.toLowerCase()
  if (/usa|, us\b|united states|american/i.test(t))    return "US"
  if (/poland|, pl\b|polski|warsaw|krakow/i.test(t))   return "PL"
  if (/france|, fr\b|french|paris/i.test(t))           return "FR"
  if (/indonesia|, id\b|jakarta/i.test(t))             return "ID"
  if (/vietnam|, vn\b|hanoi|ho chi minh/i.test(t))    return "VN"
  if (/kazakh|, kz\b|astana|almaty/i.test(t))          return "KZ"
  if (/saudi|, sa\b|riyadh|jeddah/i.test(t))          return "SA"
  if (/india|, in\b|mumbai|delhi/i.test(t))            return "IN"
  return "UNKNOWN"
}

// ─── 联网研究未知国家标准 ───────────────────────────────

async function researchStandardsForCountry(country: string, model: string) {
  const prompt = `You are a pipe and plumbing standards researcher. Research the pipe/plumbing standards for ${country}.

Search the web for:
1. What pipe standards are used in ${country}? (ISO, EN, national standard like GOST, SNI, etc.)
2. What are the common pipe materials and pressure ratings?
3. What certifications are required for pipe products to enter this market?
4. Who are the major pipe manufacturers or brands in this country?

Respond ONLY with valid JSON in this exact format:
{
  "country": "${country}",
  "code": "XX",
  "language": "English / local language",
  "standard_system": ["standard1", "standard2"],
  "standards": [
    {"code": "STD001", "name": "Standard name", "desc": "Description of what this standard covers"}
  ],
  "certifications": ["cert1", "cert2"],
  "market_notes": "Brief market overview in 1-2 sentences"
}

Rules:
- If ${country} uses GOST/俄标, include Russian GOST standards
- If ${country} uses EN/欧盟标准, include EN standards
- If ${country} has local standards (SNI for Indonesia, PSB for Singapore, etc.), include those
- If you're unsure about specific standard codes, use your best knowledge but flag as "inferred"
- Always include at least 3 standards
- Return ONLY the JSON, no markdown fences`

  const raw = await chatComplete(
    [
      { role: "system", content: "You are a technical research assistant. Always respond with valid JSON only." },
      { role: "user", content: prompt }
    ],
    model, 600
  )

  const json = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim()
  try {
    return JSON.parse(json)
  } catch {
    return {
      country,
      code: "UNKNOWN",
      language: "English",
      standard_system: ["UNKNOWN"],
      standards: [{ code: "N/A", name: "标准待补充", desc: `系统尚未收录${country}的管道标准，请联系IT添加` }],
      certifications: [],
      market_notes: "标准数据待补充",
    }
  }
}

// ─── 主入口 ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rid = Math.random().toString(36).slice(2, 10)

  try {
    let body: { companyName?: string; websiteUrl?: string; selectedModel?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "无效的请求格式" }, { status: 400 })
    }

    const { companyName, websiteUrl, selectedModel } = body
    console.log(`[${rid}] START`, { companyName, websiteUrl, selectedModel })

    if (!companyName?.trim()) {
      return NextResponse.json({ error: "请输入客户公司名称" }, { status: 400 })
    }

    const model = selectedModel || "anthropic/claude-3.5-haiku"

    // 1. 抓取官网（容错）
    let webContent = ""
    let webSource = ""
    if (websiteUrl) {
      try {
        const jinaResp = await fetch(
          `https://r.jina.ai/${encodeURIComponent(websiteUrl)}`,
          { headers: { Accept: "text/plain" }, signal: AbortSignal.timeout(15000) }
        )
        if (jinaResp.ok) {
          webContent = (await jinaResp.text())
            .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 6000)
          webSource = websiteUrl
        }
      } catch (e: any) {
        console.warn(`[${rid}] Jina failed:`, e.message)
      }
    }

    // 2. AI 公司分析
    console.log(`[${rid}] Calling analyzeCompany...`)
    const company = await analyzeCompany(companyName.trim(), webContent, model)
    console.log(`[${rid}] OK`, JSON.stringify(company))

    // 3. 确定国家
    let cc = company.country_code || "UNKNOWN"
    if (cc === "UNKNOWN" || !getStandardsByCountry(cc)) {
      cc = inferCountry(companyName + " " + (websiteUrl || ""))
    }

    // 4. 选择标准数据
    let stds: any = getStandardsByCountry(cc)
    let standards_source: "knowledge_base" | "auto_researched" = "knowledge_base"

    if (!stds) {
      // 未知国家 → 联网研究
      console.log(`[${rid}] Unknown country ${cc}, researching standards online...`)
      standards_source = "auto_researched"
      try {
        stds = await researchStandardsForCountry(company.country || cc, model)
        console.log(`[${rid}] Researched standards:`, JSON.stringify(stds).slice(0, 200))
      } catch (e: any) {
        console.warn(`[${rid}] Standards research failed:`, e.message)
        // 研究失败则降级到美国标准
        stds = getStandardsByCountry("US")!
        standards_source = "knowledge_base"
      }
    }

    // 5. AI 话术生成
    console.log(`[${rid}] Calling generateOpener...`)
    const opener = await generateOpener({
      company: companyName.trim(),
      biz: company.main_business,
      products: company.products || ["未知"],
      scale: company.scale || "未知",
      country: stds.country || company.country || "未知",
      stds: (stds.standards || []).map((s: any) => s.code),
      lang: stds.language || getCountryLanguage(cc),
    }, model)
    console.log(`[${rid}] DONE`)

    return NextResponse.json({
      success: true,
      data: {
        company: {
          name: company.name || companyName,
          main_business: company.main_business || "未知",
          products: company.products || ["未知"],
          scale: company.scale || "未知",
          confidence: company.confidence || 0.5,
          inferred_country: company.country || stds.country || cc,
          inferred_country_code: company.country_code || cc,
          // 数据来源
          sources: (company.sources || []).map((s: string) => {
            if (s.startsWith("website|")) {
              return { type: "website", url: s.replace("website|", ""), desc: "公司官网" }
            }
            return { type: "inferred", desc: s }
          }),
        },
        standards: {
          country: stds.country,
          code: stds.code,
          standard_system: stds.standard_system,
          standards: stds.standards,
          certifications: stds.certifications,
          source: standards_source,
          auto_detected: cc !== (company.country_code || "UNKNOWN"),
        },
        icebreaker: opener,
      },
    })

  } catch (err: any) {
    console.error(`[${rid}] ERROR:`, err.message, err.stack || "")
    const msg = err.message || ""

    if (msg.includes("OPENROUTER_API_KEY") || msg.includes("not set")) {
      return NextResponse.json({ error: "OpenRouter API Key 未配置" }, { status: 503 })
    }
    if (msg.includes("OpenRouter")) {
      return NextResponse.json({ error: `AI 服务异常: ${msg.slice(0, 100)}` }, { status: 503 })
    }

    return NextResponse.json(
      { error: `服务器错误: ${msg.slice(0, 150)}` },
      { status: 500 }
    )
  }
}