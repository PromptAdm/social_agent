// Gerencia o access token em memória (nunca persiste em localStorage).
// O refresh token fica em cookie httpOnly setado pelo servidor Next.js.

let _accessToken: string | null = null

export const tokens = {
  get(): string | null {
    return _accessToken
  },
  set(token: string): void {
    _accessToken = token
  },
  clear(): void {
    _accessToken = null
  },
}
