import { NextRequest, NextResponse } from "next/server"
import { analyzeCompanyWithAI, generateIcebreaker } from "@/lib/openrouter"
import { extractWebsiteContent } from "@/lib/jina"
import { getStandardsByCountry, getCountryLanguage } from "@/lib/standards"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  let requestId = Math.random().toString(36).slice(2, 10)

  try {
    const { companyName, websiteUrl, selectedModel } = await req.json()

    console.log(`[${requestId}] START companyName=`, companyName, "url=", websiteUrl, "model=", selectedModel)

    if (!companyName?.trim()) {
      return NextResponse.json({ error: "请输入客户公司名称" }, { status: 400 })
    }

    const model = selectedModel || "anthropic/claude-3.5-haiku"

    // 1. 抓取官网（可选）
    let websiteContent = ""
    if (websiteUrl) {
      try {
        websiteContent = await extractWebsiteContent(websiteUrl)
        console.log(`[${requestId}] Jina OK, content length=`, websiteContent.length)
      } catch (e: any) {
        console.error(`[${requestId}] Jina failed:`, e.message)
      }
    }

    // 2. AI 分析公司画像
    console.log(`[${requestId}] Calling analyzeCompanyWithAI...`)
    const companyInfo = await analyzeCompanyWithAI(companyName.trim(), websiteContent, model)
    console.log(`[${requestId}] Company analysis OK:`, JSON.stringify(companyInfo))

    // 3. 确定国家
    let countryCode = companyInfo.country_code
    if (countryCode === "UNKNOWN" || !getStandardsByCountry(countryCode)) {
      countryCode = inferCountryCode(companyName + " " + (websiteUrl || ""))
      console.log(`[${requestId}] Country inferred:`, countryCode)
    }
    if (!getStandardsByCountry(countryCode)) {
      countryCode = "US"
    }

    const standardsData = getStandardsByCountry(countryCode)!
    const autoDetected = countryCode !== companyInfo.country_code

    // 4. AI 生成话术
    console.log(`[${requestId}] Calling generateIcebreaker...`)
    const icebreaker = await generateIcebreaker(
      {
        companyName: companyName.trim(),
        mainBusiness: companyInfo.main_business,
        products: companyInfo.products,
        scale: companyInfo.scale,
        countryName: standardsData.country,
        standardSystem: standardsData.standard_system,
        standardCodes: standardsData.standards.map((s) => s.code),
        language: getCountryLanguage(countryCode),
      },
      model
    )
    console.log(`[${requestId}] Icebreaker OK`)

    return NextResponse.json({
      success: true,
      data: {
        company: {
          name: companyInfo.name,
          main_business: companyInfo.main_business,
          products: companyInfo.products,
          scale: companyInfo.scale,
          confidence: companyInfo.confidence,
          inferred_country: companyInfo.country,
          inferred_country_code: companyInfo.country_code,
        },
        standards: {
          country: standardsData.country,
          code: standardsData.code,
          standard_system: standardsData.standard_system,
          standards: standardsData.standards,
          certifications: standardsData.certifications,
          auto_detected: autoDetected,
        },
        icebreaker: icebreaker,
      },
    })

  } catch (error: any) {
    console.error(`[${requestId}] ERROR:`, error.message, error.stack || "")
    console.error(`[${requestId}] Error type:`, error.constructor.name)

    if (error.message?.includes("OpenRouter") || error.message?.includes("API")) {
      return NextResponse.json(
        { error: "AI 服务不可用，请检查 OpenRouter API Key 配置" },
        { status: 503 }
      )
    }

    // Return actual error for debugging
    return NextResponse.json(
      { error: `服务器错误: ${error.message}` },
      { status: 500 }
    )
  }
}

function inferCountryCode(text: string): string {
  const lower = text.toLowerCase()
  const patterns: Array<[RegExp, string]> = [
    [/usa|, us\b|united states|amercan|us based/i, "US"],
    [/poland|, pl\b|polski|polska|krakow|warsaw|varsovie/i, "PL"],
    [/france|, fr\b|français|french|paris|lyon/i, "FR"],
    [/indonesia|, id\b|indonesian|jakart/i, "ID"],
    [/vietnam|, vn\b|vietnamese|hanoi|ho chi minh/i, "VN"],
    [/kazakh|, kz\b|kazakhstan|astana|almaty/i, "KZ"],
    [/saudi|, sa\b|saudi arabia|riyadh|jeddah/i, "SA"],
    [/india|, in\b|indian|mumbai|delhi|bangalore/i, "IN"],
  ]
  for (const [pattern, code] of patterns) {
    if (pattern.test(lower)) return code
  }
  return "UNKNOWN"
}
