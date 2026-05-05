import { NextRequest, NextResponse } from "next/server"
import { analyzeCompany, generateOpener } from "@/lib/openrouter"
import { getStandardsByCountry, getCountryLanguage } from "@/lib/standards"

export const runtime = "nodejs"
export const maxDuration = 60

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
    if (websiteUrl) {
      try {
        const jinaResp = await fetch(
          `https://r.jina.ai/${encodeURIComponent(websiteUrl)}`,
          { headers: { Accept: "text/plain" }, signal: AbortSignal.timeout(15000) }
        )
        if (jinaResp.ok) {
          webContent = (await jinaResp.text())
            .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 6000)
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
    if (!getStandardsByCountry(cc)) cc = "US"

    const stds = getStandardsByCountry(cc)!
    const autoDetected = cc !== (company.country_code || "UNKNOWN")

    // 4. AI 话术生成
    console.log(`[${rid}] Calling generateOpener...`)
    const opener = await generateOpener({
      company: companyName.trim(),
      biz: company.main_business,
      products: company.products || ["未知"],
      scale: company.scale || "未知",
      country: stds.country,
      stds: stds.standards.map(s => s.code),
      lang: getCountryLanguage(cc),
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
          inferred_country: company.country || stds.country,
          inferred_country_code: company.country_code || cc,
        },
        standards: {
          country: stds.country,
          code: stds.code,
          standard_system: stds.standard_system,
          standards: stds.standards,
          certifications: stds.certifications,
          auto_detected: autoDetected,
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

    // 返回详细错误供调试
    return NextResponse.json(
      { error: `服务器错误: ${msg.slice(0, 150)}` },
      { status: 500 }
    )
  }
}
