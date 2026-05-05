import { NextRequest, NextResponse } from "next/server"
import { analyzeCompanyWithAI, generateIcebreaker } from "@/lib/minimax"
import { extractWebsiteContent } from "@/lib/jina"
import { getStandardsByCountry, getCountryLanguage } from "@/lib/standards"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { companyName, websiteUrl, countryCode } = await req.json()

    // 参数校验
    if (!companyName?.trim()) {
      return NextResponse.json({ error: "请输入客户公司名称" }, { status: 400 })
    }

    if (!countryCode?.trim()) {
      return NextResponse.json({ error: "请选择目标国家" }, { status: 400 })
    }

    // 1. 抓取官网内容（可选，不阻塞主流程）
    let websiteContent = ""
    if (websiteUrl) {
      try {
        websiteContent = await extractWebsiteContent(websiteUrl)
      } catch (e) {
        console.warn("Website extraction failed, proceeding without it:", e)
        // 不阻塞，官网抓取失败不影响主流程
      }
    }

    // 2. 查询该国管道标准
    const standardsData = getStandardsByCountry(countryCode)
    if (!standardsData) {
      return NextResponse.json(
        { error: `暂未支持 ${countryCode} 的标准库，将在后续版本添加` },
        { status: 404 }
      )
    }

    // 3. AI 分析公司画像
    const companyInfo = await analyzeCompanyWithAI(companyName.trim(), websiteContent)

    // 4. AI 生成破冰话术
    const lang = getCountryLanguage(countryCode)
    const icebreaker = await generateIcebreaker({
      companyName: companyName.trim(),
      mainBusiness: companyInfo.main_business,
      products: companyInfo.products,
      scale: companyInfo.scale,
      countryName: standardsData.country,
      standardSystem: standardsData.standard_system,
      standardCodes: standardsData.standards.map((s) => s.code),
      language: lang,
    })

    return NextResponse.json({
      success: true,
      data: {
        company: companyInfo,
        standards: {
          country: standardsData.country,
          code: standardsData.code,
          standard_system: standardsData.standard_system,
          standards: standardsData.standards,
          certifications: standardsData.certifications,
        },
        icebreaker: icebreaker,
      },
    })
  } catch (error: any) {
    console.error("[/api/analyze] Error:", error)

    // MiniMax API 错误
    if (error.message?.includes("MiniMax")) {
      return NextResponse.json(
        { error: "AI 服务暂时不可用，请稍后重试" },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: "服务器内部错误，请重试" }, { status: 500 })
  }
}
