import { apiClient } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import type {
  ConnectedAccount,
  IntegrationStatusResponse,
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
    return apiClient
      .get<OAuthRedirectResponse>(API.integrations.connect(provider) + params)
      .then((r: { data: OAuthRedirectResponse }) => r.data)
  },

  disconnect(accountId: number): Promise<void> {
    return apiClient.delete(API.integrations.disconnect(accountId)).then(() => undefined)
  },
}
