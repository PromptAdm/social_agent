// Types for the integrations OAuth system

export type Provider = 'instagram' | 'facebook' | 'whatsapp' | 'twitter'

export interface ProviderStatus {
  provider:            Provider
  connected:           boolean
  account_id?:         number
  account_name?:       string
  account_picture_url?: string
  external_account_id?: string
  expires_at?:         string
  scopes?:             string
  connected_at?:       string
  updated_at?:         string
}

export interface IntegrationStatusResponse {
  providers: ProviderStatus[]
}

export interface ConnectedAccount {
  id:                  number
  provider:            Provider
  external_account_id: string | null
  account_name:        string | null
  account_picture_url: string | null
  scopes:              string | null
  is_active:           boolean
  expires_at:          string | null
  created_at:          string
  updated_at:          string
}

export interface OAuthRedirectResponse {
  redirect_url: string
}

// Static metadata for each supported provider
export interface ProviderMeta {
  id:          Provider
  label:       string
  description: string
  color:       string          // brand primary color (hex)
  phase:       1 | 2
  enabled:     boolean
}

export const PROVIDER_META: Record<Provider, ProviderMeta> = {
  instagram: {
    id:          'instagram',
    label:       'Instagram',
    description: 'Publique posts, Reels e Stories. Acesse métricas e comentários via API Oficial.',
    color:       '#C13584',
    phase:       1,
    enabled:     true,
  },
  facebook: {
    id:          'facebook',
    label:       'Facebook',
    description: 'Gerencie sua Página do Facebook. Publique posts e responda comentários.',
    color:       '#1877F2',
    phase:       1,
    enabled:     true,
  },
  whatsapp: {
    id:          'whatsapp',
    label:       'WhatsApp',
    description: 'Conecte sua conta WhatsApp Business para mensagens e notificações automatizadas.',
    color:       '#25D366',
    phase:       2,
    enabled:     false,
  },
  twitter: {
    id:          'twitter',
    label:       'X (Twitter)',
    description: 'Publique tweets e gerencie sua presença no X com OAuth 2.0 seguro.',
    color:       '#000000',
    phase:       1,
    enabled:     true,
  },
}
