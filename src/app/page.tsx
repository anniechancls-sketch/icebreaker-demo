"use client"

import { useState } from "react"

const COUNTRIES = [
  { code: "US", name: "🇺🇸 美国", nameEn: "United States" },
  { code: "PL", name: "🇵🇱 波兰", nameEn: "Poland" },
  { code: "FR", name: "🇫🇷 法国", nameEn: "France" },
]

type ResultData = {
  company: {
    name: string
    main_business: string
    products: string[]
    scale: string
    confidence: number
  }
  standards: {
    country: string
    code: string
    standard_system: string[]
    standards: Array<{ code: string; name: string; desc: string }>
    certifications: string[]
  }
  icebreaker: {
    text: string
    language: string
  }
}

export default function HomePage() {
  const [companyName, setCompanyName] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [countryCode, setCountryCode] = useState("US")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ResultData | null>(null)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

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
          countryCode,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "分析失败，请重试")
      }

      setResult(data.data)
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

      {/* 输入表单 */}
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">客户公司名称</label>
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
              官网链接 <span className="optional">（可选）</span>
            </label>
            <input
              type="url"
              className="form-input"
              placeholder="https://..."
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">目标国家</label>
            <div style={{ position: "relative" }}>
              <select
                className="form-select"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                style={{ paddingRight: "2rem" }}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  fontSize: "0.7rem",
                }}
              >
                ▼
              </span>
            </div>
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
            正在抓取官网、分析公司、生成话术，请稍候...
          </div>
        </div>
      )}

      {/* 结果展示 */}
      {result && (
        <>
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
                  <span key={p} className="tag">
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <div className="result-item">
              <span className="result-label">规模估算</span>
              <span className="result-value">
                {result.company.scale}
                <span
                  style={{
                    marginLeft: "0.5rem",
                    fontSize: "0.75rem",
                    color: "#16a34a",
                  }}
                >
                  置信度 {Math.round(result.company.confidence * 100)}%
                </span>
              </span>
            </div>
          </div>

          {/* 管道标准 */}
          <div className="card">
            <div className="card-title">📋 管道标准</div>
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
                  <span key={s} className="tag green">
                    {s}
                  </span>
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
                  <span key={c} className="tag">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 破冰话术 */}
          <div className="card">
            <div className="card-title">💬 破冰话术</div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.75rem" }}>
              语言：{result.icebreaker.language}
            </div>
            <div className="icebreaker-text">{result.icebreaker.text}</div>
            <button
              className="btn-copy"
              onClick={() => handleCopy(result.icebreaker.text)}
            >
              {copied ? "✅ 已复制" : "📋 复制话术"}
            </button>
          </div>
        </>
      )}

      <div className="footer">
        <p>日丰企业集团 IT部 · 海外数字化产品团队</p>
        <p style={{ marginTop: "0.3rem", opacity: 0.6 }}>
          Powered by MiniMax AI · Built on Vercel
        </p>
      </div>
    </div>
  )
}
