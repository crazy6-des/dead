import React from "react";
import CreateComposer from "./CreateComposer";

/**
 * Safe migration boundary for the new Create composer.
 *
 * The legacy modal remains the production fallback until App.jsx is migrated
 * through a verified, small change. This component intentionally owns no
 * global state and receives all behavior through props.
 */
export default function CreateModalAdapter({
  enabled = false,
  onPublish,
  onCancel,
  initialDraft,
  fallback = null,
}) {
  if (!enabled) return fallback;

  return (
    <div className="s-create-modal-adapter" role="dialog" aria-modal="true" aria-label="Create post">
      <CreateComposer
        onPublish={onPublish}
        onCancel={onCancel}
        initialDraft={initialDraft}
      />
    </div>
  );
}
