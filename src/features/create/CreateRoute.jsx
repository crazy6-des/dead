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
    <section className="s-create-page" aria-labelledby="s-create-title">
      <div className="s-create-page__intro">
        <small>CREATE ON S</small>
        <h1 id="s-create-title">Make something worth seeing.</h1>
        <p>Write it, add media, choose a sound or background, then publish when it feels ready.</p>
      </div>
      <CreateComposer
        initialDraft={initialDraft}
        onCancel={onCancel}
        onPublish={publish}
      />
    </section>
  );
}
