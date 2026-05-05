// Types for the icebreaker app
export interface CompanyInfo {
  name: string
  main_business: string
  products: string[]
  scale: string
  confidence: number
}

export interface Standard {
  code: string
  name: string
  desc: string
}

export interface CountryStandard {
  country: string
  code: string
  standard_system: string[]
  standards: Standard[]
  certifications: string[]
}

export interface Icebreaker {
  text: string
  language: string
}

export interface AnalyzeResult {
  company: CompanyInfo
  standards: CountryStandard
  icebreaker: Icebreaker
}
