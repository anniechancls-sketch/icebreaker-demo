/**
 * 管道标准知识库
 *
 * Demo 版本：内嵌静态数据，无需数据库
 * 生产版本：迁移至 Vercel Postgres（见 db/schema.sql）
 */

// ─── 国家 & 标准数据 ─────────────────────────────────────────

export interface StandardsData {
  country: string
  code: string
  language: string
  standard_system: string[]
  standards: Array<{ code: string; name: string; desc: string }>
  certifications: string[]
  market_notes: string
}

const STANDARDS_DB: Record<string, StandardsData> = {
  US: {
    country: "美国",
    code: "US",
    language: "English",
    standard_system: ["ASTM", "ANSI", "NSF", "ISO"],
    standards: [
      {
        code: "ASTM D3350",
        name: "聚乙烯塑料管材料标准",
        desc: "PE4710（高密度PE）给水管材料，等同于ISO 4427",
      },
      {
        code: "ASTM F876/F877",
        name: "交联聚乙烯（PEX）管标准",
        desc: "冷热水用PEX管，北美最主流的室内给水管材",
      },
      {
        code: "NSF/ANSI 61",
        name: "饮用水系统部件健康影响标准",
        desc: "进入美国的管道产品必须获得此认证",
      },
      {
        code: "AWWA C900/C906",
        name: "PVC压力管道标准",
        desc: "给水用PVC管道，规格从 4\" 到 60\"，有CI/FPR/PIJ 等接口类型",
      },
      {
        code: "IPC (International Plumbing Code)",
        name: "国际管道规范",
        desc: "美国多数州采用的管道安装标准",
      },
    ],
    certifications: [
      "NSF 61（饮用水健康认证）",
      "UL 1285（消防喷淋管）",
      "cUPC（统一管道产品认证）",
      "IAPMO认证",
    ],
    market_notes:
      "美国市场偏好PEX和PVC，大口径市政管道以 ductile iron 为主。PE主要用于燃气和给水支管。住宅市场PEX占比超60%。",
  },

  PL: {
    country: "波兰",
    code: "PL",
    language: "English / Polski",
    standard_system: ["PN", "EN", "ISO", "DVGW"],
    standards: [
      {
        code: "PN-EN 12201",
        name: "供水用塑料管道系统——聚乙烯（PE）",
        desc: "等效采用EN 12201，PE给水管、排水管标准，规格覆盖DN16-DN1600",
      },
      {
        code: "PN-EN 1401",
        name: "地下排水和污水用塑料管道系统——PVC-U",
        desc: "非压力地下排水管，SN2-SN16环刚度等级",
      },
      {
        code: "PN-EN 1452",
        name: "供水用塑料管道系统——PVC-C",
        desc: "冷热水用氯化聚氯乙烯管道系统",
      },
      {
        code: "PN-B-10711",
        name: "燃气聚乙烯管道安装标准",
        desc: "波兰燃气管道施工规范，与EN 1555等效",
      },
      {
        code: "DVGW W270",
        name: "塑料材料微生物生长测试",
        desc: "德国水气协会认证，波兰市场认可度高",
      },
    ],
    certifications: [
      "ATOX（波兰卫生认证）",
      "DVGW（德国水协认证，波兰高认可）",
      "CE标志（欧盟强制）",
      "PZH（国家卫生研究所认证）",
    ],
    market_notes:
      "波兰是中东欧最大管道市场，新建住宅以PE-Xa和PPR为主。旧改市场（苏联时期铸铁管替换）需求大。德国品牌（Uponor、Rehau）主导高端，土耳其品牌竞争价格市场。",
  },

  FR: {
    country: "法国",
    code: "FR",
    language: "English / Français",
    standard_system: ["NF", "EN", "ISO", "ACS"],
    standards: [
      {
        code: "NF EN ISO 15875",
        name: "冷热水装置用塑料管道系统——PEX",
        desc: "交联聚乙烯管道法国等效标准，规格从16到63mm",
      },
      {
        code: "NF EN ISO 22391",
        name: "低温地面辐射供暖系统用塑料管道",
        desc: "PE-RT II型地暖管道标准",
      },
      {
        code: "NF P 41-211",
        name: "冷热水分配装置规范（法国建筑标准）",
        desc: "法国建筑规范中管道安装的具体要求",
      },
      {
        code: "ACS",
        name: "Attestation de Conformité Sanitaire",
        desc: "法国卫生合格证，所有饮用水管道产品必须申请",
      },
      {
        code: "NF EN 12201",
        name: "供水用PE管道系统",
        desc: "与波兰相同，等效EN标准，大口径供水管主流标准",
      },
    ],
    certifications: [
      "ACS（卫生合格证，必需）",
      "NF标志（法国标准认证）",
      "CSTB（建筑科学技术中心认证）",
      "CE标志（欧盟强制）",
    ],
    market_notes:
      "法国市场注重ACS认证和NF标志。PPR和PE-Xa是建筑给水主流，HDPE主要用于市政大口径。环保要求高（REACH法规）。地暖系统普及率高（PE-RT II型）。核电站多，工业管道有特殊要求。",
  },
}

export function getStandardsByCountry(countryCode: string): StandardsData | null {
  return STANDARDS_DB[countryCode.toUpperCase()] ?? null
}

export function getAllCountries(): Array<{ code: string; country: string }> {
  return Object.values(STANDARDS_DB).map((s) => ({ code: s.code, country: s.country }))
}

export function getCountryLanguage(countryCode: string): string {
  return STANDARDS_DB[countryCode.toUpperCase()]?.language ?? "English"
}
