import { apiClient } from '@/lib/api/client'

const BASE = '/video-subtitle'

export interface SubtitleSegment {
  index: number
  start: number
  end:   number
  text:  string
}

export interface VideoSubtitleStatus {
  project: {
    id:              number
    title:           string | null
    status:          string
    input_file_name: string | null
    input_file_size: number | null
    language:        string
    credits_cost:    number
    error_message:   string | null
    created_at:      string
  }
  phase:             string   // pending|transcribing|transcribed|rendering|completed|failed
  segments:          SubtitleSegment[] | null
  srt_url:           string | null
  video_url:         string | null
  ffmpeg_available:  boolean
}

export interface CreateProjectResult {
  project_id: number
  phase:      string
  message:    string
}

export interface CreateProjectOptions {
  file:       File
  language:   string
  title?:     string
  brandId?:   number
  onProgress?: (percent: number) => void
}

export const videoSubtitleService = {
  create: (opts: CreateProjectOptions): Promise<CreateProjectResult> => {
    const form = new FormData()
    form.append('file',     opts.file)
    form.append('language', opts.language)
    if (opts.title)   form.append('title',    opts.title)
    if (opts.brandId) form.append('brand_id', String(opts.brandId))

    return apiClient
      .post<CreateProjectResult>(`${BASE}/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: opts.onProgress
          ? (e) => opts.onProgress!(e.total ? Math.round((e.loaded / e.total) * 100) : 0)
          : undefined,
      })
      .then((r) => r.data)
  },

  getStatus: (id: number): Promise<VideoSubtitleStatus> =>
    apiClient.get<VideoSubtitleStatus>(`${BASE}/${id}`).then((r) => r.data),

  updateSegments: (id: number, segments: SubtitleSegment[]): Promise<VideoSubtitleStatus> =>
    apiClient
      .put<VideoSubtitleStatus>(`${BASE}/${id}/segments`, { segments })
      .then((r) => r.data),

  startRender: (id: number): Promise<void> =>
    apiClient.post(`${BASE}/${id}/render`).then(() => undefined),

  getSrtDownloadUrl: (id: number): string => {
    const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1')
    return `${base}${BASE}/${id}/srt`
  },
}
