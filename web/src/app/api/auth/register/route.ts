import { NextRequest, NextResponse } from 'next/server'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const apiRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: body.email ?? '',
        full_name: body.full_name ?? '',
        password: body.password ?? '',
      }),
    })

    const data = await apiRes.json()

    if (!apiRes.ok) {
      return NextResponse.json(
        { detail: data.detail ?? 'Não foi possível criar a conta.' },
        { status: apiRes.status },
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[auth/register]', err)
    return NextResponse.json(
      { detail: 'Erro de conexão. Tente novamente.' },
      { status: 502 },
    )
  }
}