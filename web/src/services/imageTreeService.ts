import { apiClient } from '@/lib/api/client'

const BASE = '/images'

// ── Types ────────────────────────────────────────────────────────────────────

export interface FamilyImage {
  file_path:     string
  file_url:      string
  prompt_used:   string
  variant_index: number
}

export interface ImageFamily {
  family_id:     string
  family_name:   string
  style_variant: string
  description:   string
  images:        FamilyImage[]
  refined_from?: string | null
}

export interface ImageProject {
  id:            number
  title:         string | null
  status:        string
  input_type:    string
  input_prompt:  string | null   // JSON com direction
  credits_cost:  number
  error_message: string | null
  created_at:    string
  updated_at:    string
}

export interface ImageTreeStatus {
  project:  ImageProject
  phase:    string   // pending | generating | completed | failed
  families: ImageFamily[] | null
}

export interface CreateProjectResult {
  project_id:   number
  credits_cost: number
}

export interface CreateProjectOptions {
  description: string
  objective:   string
  style:       string
  tone:        string
  mode:        string
  title?:      string
  brandId?:    number
  references?: File[]
}

export interface ProjectDirection {
  description: string
  objective:   string
  style:       string
  tone:        string
  mode:        string
  ref_count:   number
}

// ── Service ───────────────────────────────────────────────────────────────────

export const imageTreeService = {
  create: (opts: CreateProjectOptions): Promise<CreateProjectResult> => {
    const form = new FormData()
    form.append('description', opts.description)
    form.append('objective',   opts.objective)
    form.append('style',       opts.style)
    form.append('tone',        opts.tone)
    form.append('mode',        opts.mode)
    if (opts.title)   form.append('title',    opts.title)
    if (opts.brandId) form.append('brand_id', String(opts.brandId))
    if (opts.references) {
      opts.references.forEach((f) => form.append('references', f))
    }
    return apiClient
      .post<CreateProjectResult>(`${BASE}/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  getStatus: (id: number): Promise<ImageTreeStatus> =>
    apiClient.get<ImageTreeStatus>(`${BASE}/${id}`).then((r) => r.data),

  refineFamily: (
    id: number,
    familyId: string,
    direction: string,
  ): Promise<ImageTreeStatus> =>
    apiClient
      .post<ImageTreeStatus>(`${BASE}/${id}/refine`, {
        family_id: familyId,
        direction,
      })
      .then((r) => r.data),

  deleteProject: (id: number): Promise<void> =>
    apiClient.delete(`${BASE}/${id}`).then(() => undefined),

  parseDirection: (inputPrompt: string | null): ProjectDirection | null => {
    if (!inputPrompt) return null
    try {
      return JSON.parse(inputPrompt) as ProjectDirection
    } catch {
      return null
    }
  },
}
