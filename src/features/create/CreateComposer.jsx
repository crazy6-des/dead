import React, { useEffect, useRef, useState } from "react";
import { Image, Music2, Palette, Send } from "lucide-react";
import { createEmptyDraft } from "./postContract";
import { createPoll } from "../polls/pollContract.js";
import { createLocalMediaAsset } from "./mediaContract";
import { validatePostDraft } from "./postValidation";
import PollEditor from "./PollEditor";
import PostMediaPreview from "./PostMediaPreview";
import "./createComposer.css";

function toFileAsset(file) { return createLocalMediaAsset(file); }

export default function CreateComposer({ onPublish, onCancel, initialDraft }) {
  const [draft, setDraft] = useState(() => ({ ...createEmptyDraft(), ...initialDraft }));
  const [error, setError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [pollEnabled, setPollEnabled] = useState(Boolean(initialDraft?.poll));
  const [pollQuestion, setPollQuestion] = useState(initialDraft?.poll?.question || "");
  const [pollOptions, setPollOptions] = useState(initialDraft?.poll?.options?.length ? initialDraft.poll.options : ["", ""]);
  const fileUrls = useRef(new Set());
  const validation = validatePostDraft(draft);

  useEffect(() => () => fileUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);
  function updateDraft(patch) { setDraft((current) => ({ ...current, ...patch })); setError(""); }
  function handleImageChange(event) { const assets = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/")).map(toFileAsset); assets.forEach((asset) => fileUrls.current.add(asset.url)); updateDraft({ media: [...draft.media, ...assets] }); event.target.value = ""; }
  function handleMusicChange(event) { const file = Array.from(event.target.files || [])[0]; if (!file || !file.type.startsWith("audio/")) return; const asset = toFileAsset(file); if (draft.audio?.url) URL.revokeObjectURL(draft.audio.url); fileUrls.current.add(asset.url); updateDraft({ audio: asset }); event.target.value = ""; }
  function handleBackgroundChange(event) { updateDraft({ background: { type: "color", value: event.target.value } }); }
  function updatePoll(question, options) { updateDraft({ poll: createPoll({ question, options }) }); }
  function togglePoll() { const next = !pollEnabled; setPollEnabled(next); updateDraft({ poll: next ? createPoll({ question: pollQuestion, options: pollOptions }) : null }); }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validation.valid) { setError(Object.values(validation.errors)[0] || "Add something before publishing."); return; }
    setIsPublishing(true); setError("");
    try { await onPublish?.(validation.payload); } catch (publishError) { setError(publishError?.message || "Unable to publish this post."); } finally { setIsPublishing(false); }
  }

  return <form className="s-create-composer" onSubmit={handleSubmit}>
    <div className="s-create-composer__header"><strong>Create</strong>{onCancel && <button type="button" className="s-create-composer__cancel" onClick={onCancel}>Close</button>}</div>
    <textarea value={draft.text} maxLength={5000} onChange={(event) => updateDraft({ text: event.target.value })} placeholder="Share something… #hashtag" aria-label="Post text" />
    <div className="s-create-composer__media" aria-label="Add to post">
      <label className="s-create-composer__picker" title="Add image"><Image size={16} aria-hidden="true" /><input type="file" accept="image/*" multiple onChange={handleImageChange} /></label>
      <label className="s-create-composer__picker" title="Choose a song"><Music2 size={16} aria-hidden="true" /><input type="file" accept="audio/*" onChange={handleMusicChange} /></label>
      <label className="s-create-composer__picker s-create-composer__color-picker" title="Choose background"><Palette size={16} aria-hidden="true" /><input type="color" value={draft.background?.value || "#151922"} onChange={handleBackgroundChange} aria-label="Post background color" /></label>
      <button type="button" className={pollEnabled ? "is-selected" : ""} onClick={togglePoll} title="Add poll">Poll</button><span className="s-create-composer__hint">Songs: library coming soon</span>
    </div>
    {pollEnabled && <PollEditor question={pollQuestion} options={pollOptions} onQuestionChange={(value) => { setPollQuestion(value); updatePoll(value, pollOptions); }} onOptionChange={(index, value) => { const options = pollOptions.map((item, i) => i === index ? value : item); setPollOptions(options); updatePoll(pollQuestion, options); }} onAddOption={() => { const options = [...pollOptions, ""]; setPollOptions(options); updatePoll(pollQuestion, options); }} />}
    <PostMediaPreview media={draft.media} audio={draft.audio} background={draft.background} onRemoveImage={(index) => updateDraft({ media: draft.media.filter((_, i) => i !== index) })} />
    {error && <p className="s-create-composer__error" role="alert">{error}</p>}
    <div className="s-create-composer__footer"><span>{draft.text.length}/5000</span><button type="submit" disabled={isPublishing}><Send size={15} aria-hidden="true" />{isPublishing ? "Publishing…" : "Publish"}</button></div>
  </form>;
}
