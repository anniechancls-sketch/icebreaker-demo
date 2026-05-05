"use client"

import { useState, useEffect } from "react"

type ResultData = {
  company: {
    name: string
    main_business: string
    products: string[]
    scale: string
    confidence: number
    inferred_country: string
    inferred_country_code: string
    sources: Array<{ type: string; url?: string; desc: string }>
  }
  standards: {
    country: string
    code: string
    standard_system: string[]
    standards: Array<{ code: string; name: string; desc: string }>
    certifications: string[]
    auto_detected: boolean
    source: "knowledge_base" | "auto_researched"
  }
  icebreaker: {
    text: string
    language: string
  }
  selected_model: string
}

export default function HomePage() {
  const [companyName, setCompanyName] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ResultData | null>(null)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [selectedModel, setSelectedModel] = useState("anthropic/claude-3.5-haiku")

  useEffect(() => {
    // 从 localStorage 读取上次使用的模型
    const saved = localStorage.getItem("icebreaker_model")
    if (saved) setSelectedModel(saved)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName.trim()) return

    setLoading(true)
    setError("")
    setResult(null)

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          websiteUrl: websiteUrl.trim() || undefined,
          selectedModel,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "分析失败，请重试")
      }

      setResult({ ...data.data, selected_model: selectedModel })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="container">
      <div className="header">
        <h1>🌐 海外客户破冰助手</h1>
        <p>输入客户公司名，AI 自动分析 + 生成专业破冰话术</p>
      </div>

      {/* 顶部操作栏：模型选择入口 */}
      <div style={{ textAlign: "right", marginBottom: "1rem" }}>
        <a href="/admin" style={{ fontSize: "0.8rem", color: "#64748b", textDecoration: "none" }}>
          ⚙️ 模型管理
        </a>
      </div>

      {/* 输入表单 */}
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">客户公司名称 <span style={{ color: "#dc2626" }}>*</span></label>
            <input
              type="text"
              className="form-input"
              placeholder="例如：Saint-Gobain, Uponor, Gestiòn"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              官网链接 <span className="optional">（可选，信息更丰富）</span>
            </label>
            <input
              type="url"
              className="form-input"
              placeholder="https://..."
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !companyName.trim()}
          >
            {loading ? (
              <>
                <span className="spinner" />
                分析中...
              </>
            ) : (
              <>🔍 开始分析</>
            )}
          </button>
        </form>
      </div>

      {/* 错误提示 */}
      {error && <div className="error-msg">{error}</div>}

      {/* 加载中 */}
      {loading && (
        <div className="card">
          <div className="loading">
            <span className="spinner" />
            正在分析公司、识别国家、生成话术，请稍候...
          </div>
        </div>
      )}

      {/* 结果展示 */}
      {result && (
        <>
          {/* 知识库扩展提示（首次遇到该国家） */}
          {result.standards.source === "auto_researched" && (
            <div style={{
              background: "#eff6ff",
              border: "1px solid #93c5fd",
              color: "#1e40af",
              padding: "0.7rem 1rem",
              borderRadius: "8px",
              fontSize: "0.8rem",
              marginBottom: "1rem"
            }}>
              🆕 知识库扩展：系统首次分析来自 <strong>{result.company.inferred_country}</strong> 的客户，
              已自动联网搜索当地管道标准并补充。如需保存到知识库，请联系 IT 管理员。
            </div>
          )}

          {/* 国家自动推断提示 */}
          {result.standards.auto_detected && result.standards.source === "knowledge_base" && (
            <div style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              color: "#92400e",
              padding: "0.6rem 1rem",
              borderRadius: "8px",
              fontSize: "0.8rem",
              marginBottom: "1rem"
            }}>
              💡 系统自动识别到该客户位于 <strong>{result.company.inferred_country}</strong>，
              已加载知识库中的管道标准。
            </div>
          )}

          {/* 公司情报 */}
          <div className="card">
            <div className="card-title">🏢 公司情报</div>
            <div className="result-item">
              <span className="result-label">公司名称</span>
              <span className="result-value">{result.company.name}</span>
            </div>
            <div className="result-item">
              <span className="result-label">主营业务</span>
              <span className="result-value">{result.company.main_business}</span>
            </div>
            <div className="result-item">
              <span className="result-label">产品类型</span>
              <div className="result-tags">
                {result.company.products.map((p) => (
                  <span key={p} className="tag">{p}</span>
                ))}
              </div>
            </div>
            <div className="result-item">
              <span className="result-label">规模估算</span>
              <span className="result-value">
                {result.company.scale}
                <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "#16a34a" }}>
                  置信度 {Math.round(result.company.confidence * 100)}%
                </span>
              </span>
            </div>
            <div className="result-item">
              <span className="result-label">推断国家</span>
              <span className="result-value">{result.company.inferred_country}</span>
            </div>
            {/* 数据来源 */}
            {result.company.sources && result.company.sources.length > 0 && (
              <div className="result-item" style={{ flexDirection: "column", gap: "0.3rem" }}>
                <span className="result-label">数据来源</span>
                {result.company.sources.map((s, i) => (
                  <span key={i} style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    {s.type === "website" ? (
                      <>🔗 <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>{s.url}</a> — {s.desc}</>
                    ) : (
                      <>💡 {s.desc}</>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 管道标准 */}
          <div className="card">
            <div className="card-title">📋 管道标准
              {result.standards.source === "auto_researched" && (
                <span style={{ fontSize: "0.7rem", fontWeight: "normal", color: "#2563eb", marginLeft: "0.5rem" }}>
                  ← 联网研究新补充
                </span>
              )}
            </div>
            <div className="result-item">
              <span className="result-label">国别</span>
              <span className="result-value">
                {result.standards.country}（{result.standards.code}）
              </span>
            </div>
            <div className="result-item">
              <span className="result-label">标准体系</span>
              <div className="result-tags">
                {result.standards.standard_system.map((s) => (
                  <span key={s} className="tag green">{s}</span>
                ))}
              </div>
            </div>
            <div className="result-item" style={{ flexDirection: "column", gap: "0.4rem" }}>
              <span className="result-label">常用标准</span>
              {result.standards.standards.map((s) => (
                <div key={s.code} style={{ fontSize: "0.85rem" }}>
                  <strong>{s.code}</strong>
                  <span style={{ color: "#64748b", marginLeft: "0.4rem" }}>
                    {s.name} — {s.desc}
                  </span>
                </div>
              ))}
            </div>
            <div className="result-item">
              <span className="result-label">认证要求</span>
              <div className="result-tags">
                {result.standards.certifications.map((c) => (
                  <span key={c} className="tag">{c}</span>
                ))}
              </div>
            </div>
          </div>

          {/* 破冰话术 */}
          <div className="card">
            <div className="card-title">💬 破冰话术</div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.75rem" }}>
              语言：{result.icebreaker.language} &nbsp;·&nbsp; 模型：{result.selected_model}
            </div>
            <div className="icebreaker-text">{result.icebreaker.text}</div>
            <button className="btn-copy" onClick={() => handleCopy(result.icebreaker.text)}>
              {copied ? "✅ 已复制" : "📋 复制话术"}
            </button>
          </div>
        </>
      )}

      <div className="footer">
        <p>日丰企业集团 IT部 · 海外数字化产品团队</p>
        <p style={{ marginTop: "0.3rem", opacity: 0.6 }}>
          Powered by OpenRouter AI · Built on Vercel
        </p>
      </div>
    </div>
  )
}