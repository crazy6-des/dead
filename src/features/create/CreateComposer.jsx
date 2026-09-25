import React, { useEffect, useRef, useState } from "react";
import { Image, Music2, Palette, Send } from "lucide-react";
import { createEmptyDraft } from "./postContract";
import { createCatalogMusicAsset, createLocalMediaAsset } from "./mediaContract";
import { createMusicAdapter, hasMusicCatalog } from "../../services/musicService.js";
import { POST_MEDIA_LIMITS, validatePostDraft } from "./postValidation";
import PostMediaPreview from "./PostMediaPreview";
import PollEditor from "./PollEditor.jsx";
import "./createComposer.css";

function toFileAsset(file) { return createLocalMediaAsset(file); }

export default function CreateComposer({ onPublish, onCancel, initialDraft }) {
  const [draft, setDraft] = useState(() => ({ ...createEmptyDraft(), ...initialDraft, poll: null }));
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [pollOpen, setPollOpen] = useState(Boolean(initialDraft?.poll));
  const [musicQuery, setMusicQuery] = useState("");
  const [musicResults, setMusicResults] = useState([]);
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);
  const [musicError, setMusicError] = useState("");
  const [isBrowsingMusic, setIsBrowsingMusic] = useState(false);
  const musicAdapter = useRef(null);
  const musicSearchController = useRef(null);
  const fileUrls = useRef(new Set());
  const validation = validatePostDraft(draft);

  useEffect(() => {
    musicAdapter.current = createMusicAdapter();
    const urls = fileUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      musicSearchController.current?.abort();
    };
  }, []);
  function updateDraft(patch) { setDraft((current) => ({ ...current, ...(typeof patch === "function" ? patch(current) : patch) })); setError(""); setStatus(""); }
  function updatePoll(patch) { updateDraft({ poll: { ...(draft.poll || { question: "", options: ["", ""] }), ...patch } }); }
  function togglePoll() {
    if (pollOpen) { updateDraft({ poll: null }); setPollOpen(false); return; }
    updateDraft({ poll: { question: "", options: ["", ""] } }); setPollOpen(true);
  }
  function updatePollOption(index, value) {
    const options = Array.isArray(draft.poll?.options) ? [...draft.poll.options] : ["", ""];
    options[index] = value;
    updatePoll({ options });
  }
  function handleImageChange(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length) return;
    const remaining = Math.max(0, POST_MEDIA_LIMITS.MAX_IMAGES - draft.media.length);
    if (remaining === 0) {
      setError(`You can add up to ${POST_MEDIA_LIMITS.MAX_IMAGES} images.`);
      return;
    }
    const accepted = selected.slice(0, remaining);
    if (accepted.some((file) => !POST_MEDIA_LIMITS.IMAGE_TYPES.includes(file.type))) {
      setError("Choose JPG, PNG, WebP, or GIF images.");
      return;
    }
    if (accepted.some((file) => file.size <= 0 || file.size > POST_MEDIA_LIMITS.MAX_IMAGE_SIZE)) {
      setError("Each image must be 10 MB or smaller.");
      return;
    }
    const assets = accepted.map(toFileAsset);
    assets.forEach((asset) => fileUrls.current.add(asset.url));
    updateDraft((current) => ({ media: [...current.media, ...assets] }));
    if (selected.length > accepted.length) setError(`Only ${POST_MEDIA_LIMITS.MAX_IMAGES} images can be added to one post.`);
  }
  function handleMusicChange(event) {
    const file = Array.from(event.target.files || [])[0];
    event.target.value = "";
    if (!file) return;
    if (!POST_MEDIA_LIMITS.AUDIO_TYPES.includes(file.type)) {
      setError("Choose MP3, MP4/M4A, WAV, OGG, or WebM audio.");
      return;
    }
    if (file.size <= 0 || file.size > POST_MEDIA_LIMITS.MAX_AUDIO_SIZE) {
      setError("Audio must be 20 MB or smaller.");
      return;
    }
    const asset = toFileAsset(file);
    if (draft.audio?.url?.startsWith("blob:")) URL.revokeObjectURL(draft.audio.url);
    fileUrls.current.add(asset.url);
    updateDraft({ audio: asset });
  }
  function handleBackgroundChange(event) { updateDraft({ background: { type: "color", value: event.target.value } }); }

  async function handleMusicSearch(event) {
    event.preventDefault();
    const query = musicQuery.trim();
    if (!query || !hasMusicCatalog()) return;
    musicSearchController.current?.abort();
    const controller = new AbortController();
    musicSearchController.current = controller;
    setIsSearchingMusic(true);
    setMusicError("");
    try {
      const results = await musicAdapter.current.search(query, { signal: controller.signal });
      setMusicResults(results);
    } catch (searchError) {
      if (searchError?.name !== "AbortError") setMusicError(searchError?.message || "Unable to search the music catalog.");
    } finally {
      if (!controller.signal.aborted) setIsSearchingMusic(false);
    }
  }

  async function handleMusicBrowse() {
    if (!hasMusicCatalog()) return;
    musicSearchController.current?.abort();
    const controller = new AbortController();
    musicSearchController.current = controller;
    setIsBrowsingMusic(true);
    setMusicError("");
    setMusicQuery("");
    try {
      const results = await musicAdapter.current.browse({ limit: 12, signal: controller.signal });
      setMusicResults(results);
    } catch (browseError) {
      if (browseError?.name !== "AbortError") setMusicError(browseError?.message || "Unable to browse the music catalog.");
    } finally {
      if (!controller.signal.aborted) setIsBrowsingMusic(false);
    }
  }

  function selectCatalogMusic(track) {
    const asset = createCatalogMusicAsset({ ...track, musicId: track.musicId, url: track.url, provider: track.provider, licenseUrl: track.licenseUrl });
    updateDraft({ audio: asset });
    setMusicResults([]);
    setMusicQuery("");
    setMusicError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validation.valid) {
      setError(Object.values(validation.errors)[0] || "Add something before publishing.");
      return;
    }
    setIsPublishing(true);
    setStatus("Preparing your post…");
    setError("");
    try {
      setStatus("Uploading media if needed…");
      await onPublish?.(validation.payload);
      setStatus("");
    } catch (publishError) {
      setError(publishError?.message || "Unable to publish this post.");
      setStatus("");
    } finally {
      setIsPublishing(false);
    }
  }

  const removeAudio = () => {
    if (draft.audio?.url?.startsWith("blob:")) URL.revokeObjectURL(draft.audio.url);
    updateDraft({ audio: null });
  };

  return <form className="s-create-composer" onSubmit={handleSubmit}>
    <div className="s-create-composer__header"><strong>Create</strong>{onCancel && <button type="button" className="s-create-composer__cancel" onClick={onCancel}>Close</button>}</div>
    {draft.background ? <div className="s-create-composer__background-editor" style={{ background: draft.background.value }}>
      <textarea value={draft.text} maxLength={5000} onChange={(event) => updateDraft({ text: event.target.value })} placeholder="Write on your background…" aria-label="Post text on background" />
      {draft.text && <span>{draft.text.length}/5000</span>}
    </div> : <textarea value={draft.text} maxLength={5000} onChange={(event) => updateDraft({ text: event.target.value })} placeholder="Share something… #hashtag" aria-label="Post text" />}
    <div className="s-create-composer__media" aria-label="Add to post">
      <label className="s-create-composer__picker" title="Add image"><Image size={16} aria-hidden="true" /><span>Image</span><input type="file" accept="image/*" multiple onChange={handleImageChange} /></label>
      <label className="s-create-composer__picker" title="Choose local music"><Music2 size={16} aria-hidden="true" /><span>Music</span><input type="file" accept="audio/*" onChange={handleMusicChange} /></label>
      {hasMusicCatalog() && <div className="s-create-composer__music-search">
        <input value={musicQuery} onChange={(event) => setMusicQuery(event.target.value)} placeholder="Search music" aria-label="Search music catalog" />
        <button type="button" onClick={handleMusicSearch} disabled={isSearchingMusic || isBrowsingMusic || !musicQuery.trim()}>{isSearchingMusic ? "Searching…" : "Find"}</button><button type="button" onClick={handleMusicBrowse} disabled={isSearchingMusic || isBrowsingMusic}>{isBrowsingMusic ? "Loading…" : "Browse"}</button>
      </div>}
      <button type="button" className="s-create-composer__picker" onClick={togglePoll} aria-pressed={pollOpen}>Poll</button>\n      <label className="s-create-composer__picker s-create-composer__color-picker" title="Choose background"><Palette size={16} aria-hidden="true" /><span>Background</span><input type="color" value={draft.background?.value || "#151922"} onChange={handleBackgroundChange} aria-label="Post background color" /></label>
    </div>
    {hasMusicCatalog() && musicResults.length > 0 && <div className="s-create-composer__music-results" aria-label="Music search results">{musicResults.map((track) => <button type="button" key={track.musicId} className="s-create-composer__music-result" onClick={() => selectCatalogMusic(track)}><span>{track.title}</span><small>{track.artist || "Unknown artist"}{track.album ? ` · ${track.album}` : ""}{track.provider ? ` · ${track.provider}` : ""}</small></button>)}</div>}
    {musicError && <p className="s-create-composer__error" role="alert">{musicError}</p>}
    {hasMusicCatalog() && musicQuery.trim() && !isSearchingMusic && musicResults.length === 0 && !musicError && <p className="s-create-composer__hint">No catalog tracks found.</p>}
    {!hasMusicCatalog() && <p className="s-create-composer__hint">Local music is ready now. Online music selection becomes available when a catalog API is configured.</p>}\n    {pollOpen && <PollEditor question={draft.poll?.question || ""} options={draft.poll?.options || ["", ""]} onQuestionChange={(value) => updatePoll({ question: value })} onOptionChange={updatePollOption} onAddOption={() => updatePoll({ options: [...(draft.poll?.options || []), ""] })} />}
    <p className="s-create-composer__hint">Catalog music is provided under its provider license. <a href="https://api.freetouse.com/license" target="_blank" rel="noreferrer">Review Free To Use licensing</a>, especially before commercial use.</p>
    <p className="s-create-composer__hint">Choose any combination — text, image, music, background, or just one of them. Nothing posts until you press Publish.</p>
    <PostMediaPreview media={draft.media} audio={draft.audio} background={draft.background} onRemoveImage={(index) => {
      const asset = draft.media[index];
      if (asset?.url?.startsWith("blob:")) {
        URL.revokeObjectURL(asset.url);
        fileUrls.current.delete(asset.url);
      }
      updateDraft({ media: draft.media.filter((_, i) => i !== index) });
    }} onRemoveAudio={removeAudio} />
    {status && <p className="s-create-composer__status" role="status" aria-live="polite">{status}</p>}
    {error && <p className="s-create-composer__error" role="alert">{error}</p>}
    <div className="s-create-composer__footer"><span>{draft.text.length}/5000</span><button type="submit" disabled={isPublishing}><Send size={15} aria-hidden="true" />{isPublishing ? "Publishing…" : "Publish"}</button></div>
  </form>;
}