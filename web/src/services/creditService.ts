import { apiClient } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import type { CreditBalance, CreditLogsPage } from '@/types'

export const creditService = {
  balance: (): Promise<CreditBalance> =>
    apiClient.get(API.credits.balance).then((r) => r.data),

  logs: (limit = 50, offset = 0): Promise<CreditLogsPage> =>
    apiClient
      .get(API.credits.logs, { params: { limit, offset } })
      .then((r) => r.data),
}
