import React, { useMemo, useState } from "react";
import { Image, Music2, Palette, Send, Type } from "lucide-react";
import { createEmptyDraft, POST_KINDS } from "./postContract";
import { validatePostDraft } from "./postValidation";
import "./createComposer.css";

const MODES = [
  { id: POST_KINDS.TEXT, label: "Text", icon: Type },
  { id: POST_KINDS.IMAGE, label: "Image", icon: Image },
  { id: POST_KINDS.MUSIC, label: "Music", icon: Music2 },
  { id: POST_KINDS.BACKGROUND, label: "Background", icon: Palette },
];

export default function CreateComposer({ onPublish, onCancel, initialDraft }) {
  const [draft, setDraft] = useState(() => ({ ...createEmptyDraft(), ...initialDraft }));
  const [error, setError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const validation = useMemo(() => validatePostDraft(draft), [draft]);

  function updateDraft(patch) {
    setDraft((current) => ({ ...current, ...patch }));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validation.valid) {
      setError(Object.values(validation.errors)[0] || "Please review your post.");
      return;
    }

    setIsPublishing(true);
    setError("");
    try {
      await onPublish?.(validation.payload);
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
        {onCancel && <button type="button" className="s-create-composer__cancel" onClick={onCancel}>Cancel</button>}
      </div>

      <textarea
        value={draft.text}
        maxLength={5000}
        onChange={(event) => updateDraft({ text: event.target.value })}
        placeholder="What do you want people to see, hear, or feel?"
        aria-label="Post text"
      />

      <div className="s-create-composer__modes" aria-label="Post content type">
        {MODES.map(({ id, label, icon: Icon }) => {
          const selected = draft.kind === id;
          return (
            <button key={id} type="button" className={selected ? "is-selected" : ""} aria-pressed={selected} onClick={() => updateDraft({ kind: id })}>
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
            <option value="following">People you follow</option>
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
