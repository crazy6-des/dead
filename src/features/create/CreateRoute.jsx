import React, { useMemo } from "react";
import CreateComposer from "./CreateComposer";
import { createCreatePublishHandler } from "./createIntegration";

/**
 * Route-level Create boundary.
 * Keeps composer rendering and publish orchestration separate from App.jsx.
 */
export default function CreateRoute({ onPublish, onCancel, initialDraft }) {
  const publish = useMemo(
    () => createCreatePublishHandler({ onLocalPublish: onPublish }),
    [onPublish],
  );

  return (
    <CreateComposer
      initialDraft={initialDraft}
      onCancel={onCancel}
      onPublish={publish}
    />
  );
}
