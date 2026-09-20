import { createPostAdapter } from "../../services";

/**
 * Creates the publish boundary used by the S composer.
 *
 * The service owns the actual publish operation. The optional local callback is
 * invoked only after that operation succeeds, so a future API adapter cannot
 * cause an optimistic feed update before the server accepts the post.
 */
export function createCreatePublishHandler({
  onLocalPublish = null,
  serviceOptions = {},
} = {}) {
  const adapter = createPostAdapter(serviceOptions);

  return async (draft) => {
    const result = await adapter.publish(draft);

    if (typeof onLocalPublish === "function") {
      const publishedPost =
        result?.post
        ?? result?.data?.post
        ?? result?.data
        ?? result
        ?? draft;

      await onLocalPublish(publishedPost);
    }

    return result;
  };
}
