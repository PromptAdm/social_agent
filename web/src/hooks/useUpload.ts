'use client'

import { useCallback, useRef, useState } from 'react'
import { uploadService, type UploadOptions } from '@/services/uploadService'
import type { UploadedFile } from '@/types'

interface UseUploadState {
  isUploading: boolean
  progress:    number      // 0–100
  result:      UploadedFile | null
  error:       string | null
}

interface UseUploadReturn extends UseUploadState {
  upload: (file: File, opts: UploadOptions) => Promise<UploadedFile | null>
  reset:  () => void
}

export function useUpload(): UseUploadReturn {
  const [state, setState] = useState<UseUploadState>({
    isUploading: false,
    progress:    0,
    result:      null,
    error:       null,
  })

  const abortRef = useRef<AbortController | null>(null)

  const upload = useCallback(async (file: File, opts: UploadOptions): Promise<UploadedFile | null> => {
    setState({ isUploading: true, progress: 0, result: null, error: null })
    try {
      const result = await uploadService.upload(file, {
        ...opts,
        onProgress: (pct) => setState((s) => ({ ...s, progress: pct })),
      })
      setState({ isUploading: false, progress: 100, result, error: null })
      return result
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? 'Erro ao enviar arquivo.'
      setState({ isUploading: false, progress: 0, result: null, error: msg })
      return null
    }
  }, [])

  const reset = useCallback(() => {
    setState({ isUploading: false, progress: 0, result: null, error: null })
  }, [])

  return { ...state, upload, reset }
}
