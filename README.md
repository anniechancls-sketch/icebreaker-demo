# 海外客户破冰助手 — 部署指南

## 功能概述

输入客户公司名 / 官网链接 → AI 自动输出：
- 🏢 **公司情报**（主营业务、产品类型、规模）
- 📋 **管道标准**（该国标准体系、常用标准、认证要求）
- 💬 **破冰话术**（AI 生成的专业开场白）

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 15 (App Router) |
| 样式 | Tailwind CSS v4 |
| AI 生成 | MiniMax API (MiniMax-Text-01) |
| URL 解析 | Jina AI Reader |
| 部署 | Vercel |
| 代码托管 | GitHub |

---

## 快速部署（5 分钟）

### 第一步：创建 GitHub 仓库

点击以下链接创建仓库：
👉 https://github.com/new

- Owner: `anniechancls-sketch`
- Repository name: `icebreaker-demo`
- Private / Public：自选

### 第二步：上传代码

```bash
# 克隆你刚创建的空仓库
git clone https://github.com/anniechancls-sketch/icebreaker-demo.git
cd icebreaker-demo

# 复制项目文件（nextjs-app 目录下的所有内容放到仓库根目录）
# 或者直接把 nextjs-app 里的所有文件复制过来

# 提交
git add .
git commit -m "feat: 海外客户破冰助手 Demo"
git push origin main
```

> 💡 如果你希望代码直接放在仓库根目录，把 `/nextjs-app/` 下的所有文件移到仓库根目录下再上传。

### 第三步：Vercel 导入

1. 打开 👉 https://vercel.com/new
2. 选择 Import Git Repository → 选择 `icebreaker-demo`
3. Framework Preset: **Next.js**（自动识别）
4. 点击 **Deploy**

### 第四步：配置环境变量

在 Vercel 项目 Settings → Environment Variables 中添加：

| Key | Value | 说明 |
|-----|-------|------|
| `MINIMAX_API_KEY` | `your_minimax_api_key` | MiniMax API 密钥 |

获取 MiniMax API Key：👉 https://platform.minimax.chat/

### 第五步：配置企微工作台

1. 登录企业微信管理后台
2. 进入「应用管理」→「应用」
3. 点击「创建应用」→「H5 应用」
4. 填写应用信息，H5 主页填入 Vercel 部署的 URL（如 `https://icebreaker-demo.vercel.app`）
5. 设置可用范围后保存

---

## 开发

```bash
cd nextjs-app

# 安装依赖
npm install

# 本地运行
npm run dev

# 构建
npm run build
```

本地运行需要设置环境变量：

```bash
export MINIMAX_API_KEY="your_api_key"
npm run dev
```

---

## 目录结构

```
├── src/
│   ├── app/
│   │   ├── page.tsx              # 首页主界面
│   │   ├── layout.tsx             # 布局
│   │   ├── globals.css            # 全局样式
│   │   └── api/
│   │       └── analyze/
│   │           └── route.ts       # 分析 API
│   ├── lib/
│   │   ├── jina.ts               # Jina URL 解析
│   │   ├── minimax.ts            # MiniMax AI 调用
│   │   └── standards.ts          # 管道标准知识库
│   └── types/
│       └── index.ts
├── db/
│   └── schema.sql                # Vercel Postgres Schema（生产用）
└── package.json
```

---

## 知识库覆盖

| 国家 | 代码 | 标准体系 | 主流标准 |
|------|------|----------|----------|
| 🇺🇸 美国 | US | ASTM, ANSI, NSF, ISO | ASTM D3350, ASTM F876, NSF/ANSI 61 |
| 🇵🇱 波兰 | PL | PN, EN, ISO, DVGW | PN-EN 12201, PN-EN 1401, DVGW W270 |
| 🇫🇷 法国 | FR | NF, EN, ISO, ACS | NF EN ISO 15875, ACS, NF P 41-211 |

---

## 扩展知识库

编辑 `src/lib/standards.ts`，按现有格式添加新国家数据。

如需迁移到 Vercel Postgres，参考 `db/schema.sql` 执行建表语句。

---

## TODO

- [ ] 添加更多国家知识库（印尼/越南/哈萨克斯坦/沙特等）
- [ ] 支持多语言话术（法语/波兰语）
- [ ] 添加公司名置信度可视化
- [ ] 接入 CRM（Salesforce / 企微 CRM）
