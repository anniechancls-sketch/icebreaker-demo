import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "海外客户破冰助手",
  description: "输入客户公司名，AI自动分析公司画像、管道标准、生成破冰话术",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
