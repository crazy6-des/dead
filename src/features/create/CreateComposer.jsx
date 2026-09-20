import React, { useMemo, useState } from "react";
import { Image, Music2, Palette, Send, Type } from "lucide-react";
import { createPostDraft, validatePostDraft } from "./postContract";
import "./createComposer.css";

const MODES = [
  { id: "text", label: "Text", icon: Type },
  { id: "image", label: "Image", icon: Image },
  { id: "music", label: "Music", icon: Music2 },
  { id: "background", label: "Background", icon: Palette },
];

export default function CreateComposer({ onPublish, onCancel, initialDraft }) {
  const [draft, setDraft] = useState(() => createPostDraft(initialDraft));
  const [error, setError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const validation = useMemo(() => validatePostDraft(draft), [draft]);

  function updateDraft(patch) {
    setDraft((current) => ({ ...current, ...patch }));
    setError("");
  }

  function toggleMode(mode) {
    const enabled = draft.contentKinds.includes(mode);
    const contentKinds = enabled
      ? draft.contentKinds.filter((kind) => kind !== mode)
      : [...draft.contentKinds, mode];
    updateDraft({ contentKinds });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validation.valid) {
      setError(validation.errors[0]);
      return;
    }

    setIsPublishing(true);
    setError("");
    try {
      await onPublish?.(draft);
    } catch (publishError) {
      setError(publishError?.message || "Unable to publish this post.");
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <form className="s-create-composer" onSubmit={handleSubmit}>
      <div className="s-create-composer__header">
        <div>
          <span className="s-create-composer__eyebrow">Create</span>
          <h2>Share something real.</h2>
        </div>
        {onCancel && (
          <button type="button" className="s-create-composer__cancel" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>

      <textarea
        value={draft.text}
        maxLength={5000}
        onChange={(event) => updateDraft({ text: event.target.value })}
        placeholder="What do you want people to see, hear, or feel?"
        aria-label="Post text"
      />

      <div className="s-create-composer__modes" aria-label="Post content types">
        {MODES.map(({ id, label, icon: Icon }) => {
          const selected = draft.contentKinds.includes(id);
          return (
            <button
              key={id}
              type="button"
              className={selected ? "is-selected" : ""}
              aria-pressed={selected}
              onClick={() => toggleMode(id)}
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      <div className="s-create-composer__controls">
        <label>
          Audience
          <select value={draft.audience} onChange={(event) => updateDraft({ audience: event.target.value })}>
            <option value="public">Everyone</option>
            <option value="followers">Followers</option>
            <option value="private">Only me</option>
          </select>
        </label>
        <label>
          Replies
          <select value={draft.replyPolicy} onChange={(event) => updateDraft({ replyPolicy: event.target.value })}>
            <option value="everyone">Everyone</option>
            <option value="followers">Followers</option>
            <option value="mentioned">Mentioned people</option>
          </select>
        </label>
      </div>

      {error && <p className="s-create-composer__error" role="alert">{error}</p>}

      <div className="s-create-composer__footer">
        <span>{draft.text.length}/5000</span>
        <button type="submit" disabled={isPublishing || !validation.valid}>
          <Send size={16} aria-hidden="true" />
          {isPublishing ? "Publishing…" : "Publish"}
        </button>
      </div>
    </form>
  );
}
