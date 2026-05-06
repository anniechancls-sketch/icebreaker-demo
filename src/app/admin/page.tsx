"use client"

import { useState, useEffect } from "react"
import { BUILTIN_MODELS } from "@/lib/openrouter"

const DEFAULT_ADMIN_PASSWORD = "admin@rifeng2026"

export default function AdminPage() {
  const [password, setPassword] = useState("")
  const [authenticated, setAuthenticated] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [selectedModel, setSelectedModel] = useState("anthropic/claude-3.5-haiku")
  const [adminPassword, setAdminPassword] = useState(DEFAULT_ADMIN_PASSWORD)
  const [saveStatus, setSaveStatus] = useState("")

  useEffect(() => {
    // 检查是否已验证
    const savedAuth = localStorage.getItem("icebreaker_admin_auth")
    if (savedAuth === "true") setAuthenticated(true)

    // 读取已保存的设置
    const savedModel = localStorage.getItem("icebreaker_model")
    if (savedModel) setSelectedModel(savedModel)

    const savedPwd = localStorage.getItem("icebreaker_admin_password")
    if (savedPwd) setAdminPassword(savedPwd)
  }, [])

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setVerifying(true)

    // 简单密码验证（实际应传到后端，这里简化）
    setTimeout(() => {
      if (password === adminPassword) {
        localStorage.setItem("icebreaker_admin_auth", "true")
        setAuthenticated(true)
      } else {
        alert("密码错误，请重试")
      }
      setVerifying(false)
    }, 300)
  }

  function handleLogout() {
    localStorage.removeItem("icebreaker_admin_auth")
    setAuthenticated(false)
    setPassword("")
  }

  function handleModelSave() {
    localStorage.setItem("icebreaker_model", selectedModel)
    setSaveStatus("✅ 已保存，刷新主页后生效")
    setTimeout(() => setSaveStatus(""), 3000)
  }

  function handlePasswordSave() {
    if (!adminPassword.trim()) {
      alert("密码不能为空")
      return
    }
    localStorage.setItem("icebreaker_admin_password", adminPassword.trim())
    setSaveStatus("✅ 管理员密码已更新")
    setTimeout(() => setSaveStatus(""), 3000)
  }

  // ── 未登录状态 ─────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="container">
        <div className="header">
          <h1>🔐 模型管理</h1>
          <p>请输入管理员密码进入设置页面</p>
        </div>

        <div className="card" style={{ maxWidth: "400px", margin: "0 auto" }}>
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label className="form-label">管理员密码</label>
              <input
                type="password"
                className="form-input"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={verifying}
            >
              {verifying ? "验证中..." : "进入管理后台"}
            </button>
          </form>

          <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#f0fdf4", borderRadius: "8px", fontSize: "0.8rem", color: "#166534" }}>
            💡 默认密码：<code style={{ fontFamily: "monospace" }}>admin@rifeng2026</code>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <a href="/" style={{ color: "#64748b", fontSize: "0.85rem", textDecoration: "none" }}>
            ← 返回主页
          </a>
        </div>
      </div>
    )
  }

  // ── 已登录状态 ─────────────────────────────────────────
  return (
    <div className="container">
      <div className="header">
        <h1>⚙️ 模型管理后台</h1>
        <p>配置 AI 模型参数，这些设置将影响主页分析结果</p>
      </div>

      <div style={{ textAlign: "right", marginBottom: "1rem" }}>
        <button
          onClick={handleLogout}
          style={{
            background: "none",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            padding: "0.3rem 0.8rem",
            fontSize: "0.8rem",
            cursor: "pointer",
            color: "#64748b"
          }}
        >
          退出登录
        </button>
      </div>

      {/* AI 模型选择 */}
      <div className="card">
        <div className="card-title">🤖 AI 模型选择</div>
        <p style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "1rem" }}>
          选择用于公司分析和话术生成的 AI 模型。不同模型速度、成本和质量不同。
        </p>

        <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1rem" }}>
          {BUILTIN_MODELS.map((model) => (
            <label
              key={model.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                border: `1px solid ${selectedModel === model.id ? "#2563eb" : "#e2e8f0"}`,
                borderRadius: "8px",
                cursor: "pointer",
                background: selectedModel === model.id ? "#eff6ff" : "#fff",
                transition: "all 0.15s",
              }}
            >
              <input
                type="radio"
                name="model"
                value={model.id}
                checked={selectedModel === model.id}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{ accentColor: "#2563eb", width: "16px", height: "16px" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: "0.9rem" }}>{model.name}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  {model.provider} · 速度：{model.speed} · 成本：{model.cost}
                </div>
              </div>
              {selectedModel === model.id && (
                <span style={{ fontSize: "0.7rem", color: "#2563eb", fontWeight: 600 }}>✓ 使用中</span>
              )}
            </label>
          ))}
        </div>

        <button className="btn-primary" onClick={handleModelSave}>
          💾 保存模型选择
        </button>
      </div>

      {/* 管理员密码修改 */}
      <div className="card">
        <div className="card-title">🔐 修改管理员密码</div>
        <p style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "1rem" }}>
          修改进入模型管理后台的密码。建议使用强密码。
        </p>

        <div className="form-group">
          <label className="form-label">新密码</label>
          <input
            type="password"
            className="form-input"
            placeholder="输入新密码"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
          />
        </div>

        <button className="btn-primary" onClick={handlePasswordSave} style={{ background: "#059669" }}>
          💾 更新密码
        </button>
      </div>

      {/* 保存状态提示 */}
      {saveStatus && (
        <div style={{
          position: "fixed",
          bottom: "2rem",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#1e293b",
          color: "#fff",
          padding: "0.75rem 1.5rem",
          borderRadius: "999px",
          fontSize: "0.85rem",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
        }}>
          {saveStatus}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
        <a href="/" style={{ color: "#64748b", fontSize: "0.85rem", textDecoration: "none" }}>
          ← 返回主页
        </a>
      </div>

      <div className="footer">
        <p>日丰企业集团 IT部 · 海外数字化产品团队</p>
      </div>
    </div>
  )
}
