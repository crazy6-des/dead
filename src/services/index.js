/**
 * Public service boundary for S.
 *
 * Feature modules should import services from this entry point rather than
 * reaching into individual implementation files. This keeps future backend
 * changes isolated from the UI.
 */
export { ApiError, apiClient, apiRequest, hasApiBaseUrl } from "./apiClient";
export { authService } from "./authService";
export {
  createFeedRequest,
  createFeedResponse,
  createDevFeedAdapter,
  createApiFeedAdapter,
  createFeedAdapter,
} from "./feedService";
export {
  createPostRequest,
  createApiPostAdapter,
  createDevPostAdapter,
  createPostAdapter,
} from "./postService";
