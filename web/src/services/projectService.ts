import { apiClient } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import type { ImageProject, ProjectHistory, VideoProject } from '@/types'

export const projectService = {
  history: (limit = 20, offset = 0): Promise<ProjectHistory> =>
    apiClient
      .get(API.projects.history, { params: { limit, offset } })
      .then((r) => r.data),

  getImage: (id: number): Promise<ImageProject> =>
    apiClient.get(API.projects.image(id)).then((r) => r.data),

  getVideo: (id: number): Promise<VideoProject> =>
    apiClient.get(API.projects.video(id)).then((r) => r.data),

  deleteImage: (id: number): Promise<void> =>
    apiClient.delete(API.projects.deleteImage(id)).then(() => undefined),

  deleteVideo: (id: number): Promise<void> =>
    apiClient.delete(API.projects.deleteVideo(id)).then(() => undefined),
}
