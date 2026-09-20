import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Music2, Palette, Send, Type, X } from "lucide-react";
import { createEmptyDraft, POST_KINDS } from "./postContract";
import { createPoll } from "../polls/pollContract.js";
import { createLocalMediaAsset } from "./mediaContract";
import { validatePostDraft } from "./postValidation";
import "./createComposer.css";

const MODES = [
  { id: POST_KINDS.TEXT, label: "Text", icon: Type },
  { id: POST_KINDS.IMAGE, label: "Image", icon: Image },
  { id: POST_KINDS.MUSIC, label: "Music", icon: Music2 },
  { id: POST_KINDS.BACKGROUND, label: "Background", icon: Palette },
];

function toFileAsset(file) {
  return createLocalMediaAsset(file);
}

export default function CreateComposer({ onPublish, onCancel, initialDraft }) {
  const [draft, setDraft] = useState(() => ({ ...createEmptyDraft(), ...initialDraft }));
  const [error, setError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [pollEnabled, setPollEnabled] = useState(Boolean(initialDraft?.poll));
  const [pollQuestion, setPollQuestion] = useState(initialDraft?.poll?.question || "");
  const [pollOptions, setPollOptions] = useState(initialDraft?.poll?.options?.length ? initialDraft.poll.options : ["", ""]);
  const fileUrls = useRef(new Set());
  const validation = useMemo(() => validatePostDraft(draft), [draft]);

  useEffect(() => () => {
    fileUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function updateDraft(patch) {
    setDraft((current) => ({ ...current, ...patch }));
    setError("");
  }

  function handleImageChange(event) {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
    const assets = files.map(toFileAsset);
    assets.forEach((asset) => fileUrls.current.add(asset.url));
    updateDraft({ media: [...draft.media, ...assets], kind: POST_KINDS.IMAGE });
    event.target.value = "";
  }

  function handleMusicChange(event) {
    const file = Array.from(event.target.files || [])[0];
    if (!file || !file.type.startsWith("audio/")) return;
    const asset = toFileAsset(file);
    fileUrls.current.add(asset.url);
    if (draft.audio?.url) URL.revokeObjectURL(draft.audio.url);
    updateDraft({ audio: asset, kind: POST_KINDS.MUSIC });
    event.target.value = "";
  }

  function removeImage(index) {
    const asset = draft.media[index];
    if (asset?.url) {
      URL.revokeObjectURL(asset.url);
      fileUrls.current.delete(asset.url);
    }
    updateDraft({ media: draft.media.filter((_, assetIndex) => assetIndex !== index) });
  }

  function handleBackgroundChange(event) {
    updateDraft({
      background: { type: "color", value: event.target.value },
      kind: POST_KINDS.BACKGROUND,
    });
  }

  function updatePollQuestion(value) { setPollQuestion(value); updateDraft({ poll: createPoll({ question: value, options: pollOptions }) }); }
  function updatePollOption(index, value) { const options = pollOptions.map((item, i) => i === index ? value : item); setPollOptions(options); updateDraft({ poll: createPoll({ question: pollQuestion, options }) }); }
  function togglePoll() { const next = !pollEnabled; setPollEnabled(next); updateDraft({ poll: next ? createPoll({ question: pollQuestion, options: pollOptions }) : null }); }

  function addPollOption() {
    const options = [...pollOptions, ""];
    setPollOptions(options);
    updateDraft({ poll: createPoll({ question: pollQuestion, options }) });
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

      <div className="s-create-composer__media">
        <label className="s-create-composer__picker">
          <Image size={16} aria-hidden="true" />
          Add images
          <input type="file" accept="image/*" multiple onChange={handleImageChange} />
        </label>

        <label className="s-create-composer__picker">
          <Music2 size={16} aria-hidden="true" />
          Add music
          <input type="file" accept="audio/*" onChange={handleMusicChange} />
        </label>

        <button type="button" className={pollEnabled ? "is-selected" : ""} onClick={togglePoll}>Poll</button>
        <label className="s-create-composer__picker s-create-composer__color-picker">
          <Palette size={16} aria-hidden="true" />
          Background
          <input type="color" value={draft.background?.value || "#151922"} onChange={handleBackgroundChange} aria-label="Post background color" />
        </label>
      </div>

      {pollEnabled && <div className="s-create-composer__poll"><input value={pollQuestion} onChange={(e) => updatePollQuestion(e.target.value)} placeholder="Ask a question" aria-label="Poll question" />{pollOptions.map((option, index) => <input key={index} value={option} onChange={(e) => updatePollOption(index, e.target.value)} placeholder={"Option " + (index + 1)} aria-label={"Poll option " + (index + 1)} />)}{pollOptions.length < 4 && <button type="button" onClick={addPollOption}>Add option</button>}</div>}

      {draft.media.length > 0 && (
        <div className="s-create-composer__assets" aria-label="Selected images">
          {draft.media.map((asset, index) => (
            <div className="s-create-composer__asset" key={asset.url || asset.name + index}>
              <img src={asset.url} alt={asset.name} />
              <button type="button" onClick={() => removeImage(index)} aria-label={`Remove ${asset.name}`}>
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {draft.audio && (
        <div className="s-create-composer__audio">
          <Music2 size={16} aria-hidden="true" />
          <span>{draft.audio.name}</span>
          <audio controls src={draft.audio.url} />
        </div>
      )}

      {draft.background && (
        <div
          className="s-create-composer__background-preview"
          style={{ background: draft.background.value }}
          aria-label="Selected post background"
        >
          Background preview
        </div>
      )}

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
