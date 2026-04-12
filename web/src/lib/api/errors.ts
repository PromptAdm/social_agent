import { AxiosError } from 'axios'

export interface ApiError {
  message: string
  status: number
}

/**
 * Converte qualquer erro do Axios em uma mensagem legível em português.
 */
export function parseApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data
    const status = error.response?.status

    // FastAPI retorna { detail: string | array }
    if (data?.detail) {
      if (typeof data.detail === 'string') return data.detail
      if (Array.isArray(data.detail)) {
        return data.detail.map((e: { msg: string }) => e.msg).join(', ')
      }
    }

    if (status === 401) return 'Sessão expirada. Faça login novamente.'
    if (status === 403) return 'Você não tem permissão para esta ação.'
    if (status === 404) return 'Recurso não encontrado.'
    if (status === 422) return 'Dados inválidos. Verifique os campos.'
    if (status === 500) return 'Erro interno do servidor. Tente novamente.'
    if (!error.response) return 'Sem conexão com o servidor.'
  }

  if (error instanceof Error) return error.message

  return 'Ocorreu um erro inesperado.'
}
