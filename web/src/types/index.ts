// ── Enums ──────────────────────────────────────────────────────────────────────

export type PostStatus = 'rascunho' | 'aprovado' | 'agendado' | 'publicado' | 'arquivado'
export type PostFormato =
  | 'carrossel'
  | 'reels'
  | 'imagem_unica'
  | 'stories'
  | 'texto'
  | 'video'
  | 'live'
export type PostPrioridade = 'baixa' | 'media' | 'alta' | 'urgente'
export type SocialPlatform = 'instagram' | 'linkedin' | 'twitter' | 'facebook' | 'tiktok'

export type IdeaStatus = 'ideia' | 'rascunho' | 'arquivado'
export type IdeaPrioridade = 'baixa' | 'media' | 'alta'
export type IdeaFormatoSugerido =
  | 'carrossel'
  | 'reels'
  | 'imagem_unica'
  | 'stories'
  | 'texto'
  | 'video'
  | 'live'
  | 'indefinido'

export type LeadStatus = 'novo' | 'contatado' | 'qualificado' | 'convertido' | 'perdido'
export type LeadSource =
  | 'comentario'
  | 'mensagem_direta'
  | 'mencao'
  | 'resposta_story'
  | 'manual'

// ── Models ─────────────────────────────────────────────────────────────────────

export interface User {
  id: number
  full_name: string | null
  email: string
  role: 'admin' | 'editor' | 'viewer'
  is_active: boolean
  is_superuser: boolean
  created_at: string
}

export interface Brand {
  id: number
  name: string
  niche: string | null
  description: string | null
  logo_url: string | null
  tone_of_voice: string | null
  owner_id: number
  post_count?: number
  idea_count?: number
  created_at: string
  updated_at: string
}

export interface ContentPillar {
  id: number
  brand_id: number
  name: string
  description: string | null
  color: string | null
  post_count?: number
  idea_count?: number
}

export interface Post {
  id: number
  brand_id: number
  pillar_id: number | null
  idea_id: number | null
  caption: string
  hashtags: string | null
  cta: string | null
  platform: SocialPlatform
  formato: PostFormato
  prioridade: PostPrioridade
  status: PostStatus
  scheduled_at: string | null
  published_at: string | null
  approved_by_id: number | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface Idea {
  id: number
  brand_id: number
  pillar_id: number | null
  title: string
  description: string | null
  source: string | null
  prioridade: IdeaPrioridade
  formato_sugerido: IdeaFormatoSugerido
  plataforma: SocialPlatform | null
  status: IdeaStatus
  tags: string[] | null
  created_at: string
  updated_at: string
}

export interface Lead {
  id: number
  brand_id: number
  username: string
  full_name: string | null
  platform: SocialPlatform
  source: LeadSource
  status: LeadStatus
  notes: string | null
  created_at: string
  updated_at: string
}

// ── Billing / Planos ───────────────────────────────────────────────────────────

export type PlanCode = 'starter' | 'professional' | 'premium' | 'legacy' | 'free' | 'basic'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled'
export type BillingCycle = 'monthly' | 'yearly'

export interface PlanLimits {
  brands: number           // -1 = ilimitado
  posts_per_month: number  // -1 = ilimitado
}

export interface PlanUsage {
  brands: number
  posts_per_month: number
}

export interface PlanFeatures {
  scheduling: boolean
  analytics: boolean
  approval: boolean
  priority_support: boolean
}

export interface PlanDetail {
  code: PlanCode
  display_name: string
  price_monthly_cents: number
  price_yearly_cents: number
  limits: PlanLimits
  features: PlanFeatures
  is_current: boolean
}

export interface BillingSummary {
  plan_code: PlanCode
  plan_name: string
  status: SubscriptionStatus
  billing_cycle: BillingCycle
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  limits: PlanLimits
  usage: PlanUsage
  features: PlanFeatures
  monetization_enabled: boolean
  stripe_enabled: boolean
}
