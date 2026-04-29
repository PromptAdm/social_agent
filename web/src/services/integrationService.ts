import { apiClient } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import type {
  ConnectedAccount,
  IntegrationStatusResponse,
  MetaStatus,
  OAuthRedirectResponse,
  Provider,
} from '@/types/integrations'

export const integrationService = {
  getStatus(brandId?: number): Promise<IntegrationStatusResponse> {
    const params = brandId ? `?brand_id=${brandId}` : ''
    return apiClient.get<IntegrationStatusResponse>(API.integrations.status + params).then((r: { data: IntegrationStatusResponse }) => r.data)
  },

  listAccounts(brandId?: number): Promise<ConnectedAccount[]> {
    const params = brandId ? `?brand_id=${brandId}` : ''
    return apiClient.get<ConnectedAccount[]>(API.integrations.accounts + params).then((r: { data: ConnectedAccount[] }) => r.data)
  },

  getConnectUrl(provider: Provider, brandId?: number): Promise<OAuthRedirectResponse> {
    const params = brandId ? `?brand_id=${brandId}` : ''
    const path   = API.integrations.connect(provider) + params
    console.log('[integrationService] getConnectUrl →', (apiClient.defaults.baseURL ?? '') + path)
    return apiClient
      .get<OAuthRedirectResponse>(path)
      .then((r: { data: OAuthRedirectResponse }) => r.data)
  },

  disconnect(accountId: number): Promise<void> {
    return apiClient.delete(API.integrations.disconnect(accountId)).then(() => undefined)
  },

  getMetaStatus(): Promise<MetaStatus> {
    return apiClient.get<MetaStatus>(API.integrations.metaStatus).then((r: { data: MetaStatus }) => r.data)
  },

  getMetaConnectUrl(): Promise<OAuthRedirectResponse> {
    return apiClient.get<OAuthRedirectResponse>(API.integrations.metaConnect).then((r: { data: OAuthRedirectResponse }) => r.data)
  },
}
