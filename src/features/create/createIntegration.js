import { createPostAdapter } from "../../services";

/**
 * Creates the publish boundary used by the S composer.
 *
 * The UI can remain independent from whether publishing is handled by the
 * local development adapter or the configured API adapter.
 */
export function createCreatePublishHandler({
  onLocalPublish = null,
  serviceOptions = {},
} = {}) {
  const adapter = createPostAdapter({
    ...serviceOptions,
    ...(typeof onLocalPublish === "function"
      ? { onPublish: onLocalPublish }
      : {}),
  });

  return (draft) => adapter.publish(draft);
}
