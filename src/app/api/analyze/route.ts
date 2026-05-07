import { NextRequest, NextResponse } from "next/server"
import { analyzeCompany, generateOpener } from "@/lib/openrouter"
import { searchCompanyInfo, searchStandardsInfo } from "@/lib/search"
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

    // ─── 步骤1：联网搜索公司 ───────────────────────────────
    console.log(`[${rid}] Step1: Searching company online...`)
    const searchResult = await searchCompanyInfo(companyName.trim())
    console.log(`[${rid}] Search got ${searchResult.sources.length} sources, content len=${searchResult.content.length}`)

    // ─── 步骤2：抓取官网（容错）───────────────────────────
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

    // ─── 步骤3：AI公司分析（基于真实搜索结果）─────────────
    console.log(`[${rid}] Step2: Calling analyzeCompany...`)
    const company = await analyzeCompany(
      companyName.trim(),
      searchResult.content,
      webContent,
      model
    )
    console.log(`[${rid}] OK`, JSON.stringify(company).slice(0, 200))

    // ─── 步骤4：确定国家标准 ──────────────────────────────
    let cc = company.country_code || "UNKNOWN"
    if (cc === "UNKNOWN" || !getStandardsByCountry(cc)) {
      cc = inferCountry(companyName + " " + (websiteUrl || "") + " " + (company.country || ""))
    }

    let stds = getStandardsByCountry(cc)
    let standards_source: "knowledge_base" | "auto_researched" | "us_fallback" = "knowledge_base"
    let autoResearchNote = ""

    if (!stds) {
      console.warn(`[${rid}] Country ${cc} not in knowledge base, searching online...`)
      const searched = await searchStandardsInfo(cc)
      if (searched) {
        // 搜索成功：以 US 标准为结构基础，附加搜索到的原始内容
        standards_source = "auto_researched"
        autoResearchNote = searched
        stds = getStandardsByCountry("US")!
        console.log(`[${rid}] Auto-researched standards for ${cc}: ${searched.slice(0, 100)}...`)
      } else {
        // 联网搜索也失败 → 降级到 US 默认值
        standards_source = "us_fallback"
        console.warn(`[${rid}] Online search failed for ${cc}, falling back to US defaults`)
        stds = getStandardsByCountry("US")!
      }
    }

    const autoDetected = cc !== (company.country_code || "UNKNOWN")

    // ─── 步骤5：AI话术生成（含客户类型）───────────────────
    console.log(`[${rid}] Step3: Calling generateOpener...`)
    const opener = await generateOpener({
      company: companyName.trim(),
      customer_type: company.customer_type || "other",
      biz: company.main_business || "未知",
      products: company.products || ["未知"],
      scale: company.scale || "未知",
      country: company.country || stds.country || "未知",
      stds: (stds.standards || []).map((s: any) => s.code),
      lang: getCountryLanguage(cc),
    }, model)
    console.log(`[${rid}] DONE`)

    // ─── 整理数据来源 ────────────────────────────────────
    const sources: Array<{ type: string; url?: string; title?: string; desc: string }> = []

    // 搜索结果 → search_result 来源
    searchResult.sources.forEach((s) => {
      sources.push({ type: "search_result", url: s.url, title: s.title, desc: `搜索结果: ${s.title}` })
    })

    // 官网 URL → website 来源
    if (websiteUrl) {
      sources.push({ type: "website", url: websiteUrl, title: "官网", desc: "官网内容" })
    }

    // 知识库
    sources.push({ type: "knowledge_base", desc: `管道标准知识库 (${stds.country})` })

    return NextResponse.json({
      success: true,
      data: {
        company: {
          name: company.name || companyName,
          main_business: company.main_business || "未知",
          customer_type: company.customer_type || "other",
          customer_type_label: customerTypeLabel(company.customer_type),
          products: company.products || ["未知"],
          scale: company.scale || "未知",
          confidence: company.confidence || 0.5,
          inferred_country: company.country || stds.country || cc,
          inferred_country_code: company.country_code || cc,
          sources,
        },
        standards: {
          country: stds.country,
          code: stds.code,
          standard_system: stds.standard_system,
          standards: stds.standards,
          certifications: stds.certifications,
          source: standards_source,
          auto_detected: autoDetected,
          auto_research_note: autoResearchNote || undefined,
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

function customerTypeLabel(t?: string): string {
  const map: Record<string, string> = {
    distributor: "批发商",
    contractor: "工程施工",
    manufacturer: "制造商",
    project_developer: "项目开发商",
    municipal: "市政/政府采购",
    retailer: "零售商",
    other: "其他",
  }
  return map[t || "other"] || "其他"
}
