import { NextRequest, NextResponse } from "next/server"
import { analyzeCompanyWithAI, generateIcebreaker } from "@/lib/openrouter"
import { extractWebsiteContent } from "@/lib/jina"
import { getStandardsByCountry, getCountryLanguage } from "@/lib/standards"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { companyName, websiteUrl, selectedModel } = await req.json()

    // 必填校验：只有公司名是必须的
    if (!companyName?.trim()) {
      return NextResponse.json({ error: "请输入客户公司名称" }, { status: 400 })
    }

    // 使用的模型
    const model = selectedModel || "anthropic/claude-3.5-haiku"

    // 1. 抓取官网（可选）
    let websiteContent = ""
    if (websiteUrl) {
      try {
        websiteContent = await extractWebsiteContent(websiteUrl)
      } catch (e) {
        console.warn("Website extraction failed:", e)
      }
    }

    // 2. AI 分析公司画像（含国家推断）
    const companyInfo = await analyzeCompanyWithAI(
      companyName.trim(),
      websiteContent,
      model
    )

    // 3. 确定目标国家代码（优先用 AI 推断结果，否则回退到关键词推断）
    let countryCode = companyInfo.country_code
    if (countryCode === "UNKNOWN" || !getStandardsByCountry(countryCode)) {
      countryCode = inferCountryCode(companyName + " " + (websiteUrl || ""))
    }
    if (!getStandardsByCountry(countryCode)) {
      countryCode = "US" // 默认兜底到美国
    }

    const standardsData = getStandardsByCountry(countryCode)!
    const autoDetected = countryCode !== companyInfo.country_code

    // 4. AI 生成破冰话术
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
    console.error("[/api/analyze] Error:", error)

    if (error.message?.includes("OpenRouter")) {
      return NextResponse.json(
        { error: "AI 服务不可用，请检查 OpenRouter API Key 配置" },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: "服务器内部错误，请重试" }, { status: 500 })
  }
}

function inferCountryCode(text: string): string {
  const lower = text.toLowerCase()

  const patterns: Array<[RegExp, string]> = [
    // 美国
    [/usa|, us\b|united states|american|us based/i, "US"],
    // 波兰
    [/poland|, pl\b|polski|polska|krakow|warsaw|varsovie/i, "PL"],
    // 法国
    [/france|, fr\b|français|french|paris|lyon/i, "FR"],
    // 印尼
    [/indonesia|, id\b|indonesian|jakart/i, "ID"],
    // 越南
    [/vietnam|, vn\b|vietnamese|hanoi|ho chi minh/i, "VN"],
    // 哈萨克斯坦
    [/kazakh|, kz\b|kazakhstan|astana|almaty/i, "KZ"],
    // 沙特
    [/saudi|, sa\b|saudi arabia|riyadh|jeddah/i, "SA"],
    // 印度
    [/india|, in\b|indian|mumbai|delhi|bangalore/i, "IN"],
  ]

  for (const [pattern, code] of patterns) {
    if (pattern.test(lower)) return code
  }

  return "UNKNOWN"
}
