import { apiClient } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import type { UploadedFile } from '@/types'

export interface UploadOptions {
  projectType: 'image' | 'video'
  projectId:   number
  onProgress?: (percent: number) => void
}

export const uploadService = {
  upload: (file: File, opts: UploadOptions): Promise<UploadedFile> => {
    const form = new FormData()
    form.append('file',         file)
    form.append('project_type', opts.projectType)
    form.append('project_id',   String(opts.projectId))

    return apiClient
      .post(API.upload.file, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: opts.onProgress
          ? (e) => {
              const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0
              opts.onProgress!(pct)
            }
          : undefined,
      })
      .then((r) => r.data)
  },
}
