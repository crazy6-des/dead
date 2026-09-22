import React, { useEffect, useRef, useState } from "react";
import { Image, Music2, Palette, Send } from "lucide-react";
import { createEmptyDraft } from "./postContract";
import { createCatalogMusicAsset, createLocalMediaAsset } from "./mediaContract";
import { createMusicAdapter, hasMusicCatalog } from "../../services/musicService.js";
import { validatePostDraft } from "./postValidation";
import PostMediaPreview from "./PostMediaPreview";
import "./createComposer.css";

function toFileAsset(file) { return createLocalMediaAsset(file); }

export default function CreateComposer({ onPublish, onCancel, initialDraft }) {
  const [draft, setDraft] = useState(() => ({ ...createEmptyDraft(), ...initialDraft, poll: null }));
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
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
    return () => {
      fileUrls.current.forEach((url) => URL.revokeObjectURL(url));
      musicSearchController.current?.abort();
    };
  }, []);
  function updateDraft(patch) { setDraft((current) => ({ ...current, ...patch })); setError(""); setStatus(""); }
  function handleImageChange(event) {
    const assets = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/")).map(toFileAsset);
    assets.forEach((asset) => fileUrls.current.add(asset.url));
    updateDraft({ media: [...draft.media, ...assets] });
    event.target.value = "";
  }
  function handleMusicChange(event) {
    const file = Array.from(event.target.files || [])[0];
    if (!file || !file.type.startsWith("audio/")) return;
    const asset = toFileAsset(file);
    if (draft.audio?.url?.startsWith("blob:")) URL.revokeObjectURL(draft.audio.url);
    fileUrls.current.add(asset.url);
    updateDraft({ audio: asset });
    event.target.value = "";
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
    const asset = createCatalogMusicAsset({ ...track, musicId: track.musicId, url: track.url });
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
    <textarea value={draft.text} maxLength={5000} onChange={(event) => updateDraft({ text: event.target.value })} placeholder="Share something… #hashtag" aria-label="Post text" />
    <div className="s-create-composer__media" aria-label="Add to post">
      <label className="s-create-composer__picker" title="Add image"><Image size={16} aria-hidden="true" /><span>Image</span><input type="file" accept="image/*" multiple onChange={handleImageChange} /></label>
      <label className="s-create-composer__picker" title="Choose local music"><Music2 size={16} aria-hidden="true" /><span>Music</span><input type="file" accept="audio/*" onChange={handleMusicChange} /></label>
      {hasMusicCatalog() && <div className="s-create-composer__music-search">
        <input value={musicQuery} onChange={(event) => setMusicQuery(event.target.value)} placeholder="Search music" aria-label="Search music catalog" />
        <button type="button" onClick={handleMusicSearch} disabled={isSearchingMusic || isBrowsingMusic || !musicQuery.trim()}>{isSearchingMusic ? "Searching…" : "Find"}</button><button type="button" onClick={handleMusicBrowse} disabled={isSearchingMusic || isBrowsingMusic}>{isBrowsingMusic ? "Loading…" : "Browse"}</button>
      </div>}
      <label className="s-create-composer__picker s-create-composer__color-picker" title="Choose background"><Palette size={16} aria-hidden="true" /><span>Background</span><input type="color" value={draft.background?.value || "#151922"} onChange={handleBackgroundChange} aria-label="Post background color" /></label>
    </div>
    {hasMusicCatalog() && musicResults.length > 0 && <div className="s-create-composer__music-results" aria-label="Music search results">{musicResults.map((track) => <button type="button" key={track.musicId} className="s-create-composer__music-result" onClick={() => selectCatalogMusic(track)}><span>{track.title}</span><small>{track.artist || "Unknown artist"}{track.album ? ` · ${track.album}` : ""}</small></button>)}</div>}
    {musicError && <p className="s-create-composer__error" role="alert">{musicError}</p>}
    {hasMusicCatalog() && musicQuery.trim() && !isSearchingMusic && musicResults.length === 0 && !musicError && <p className="s-create-composer__hint">No catalog tracks found.</p>}
    {!hasMusicCatalog() && <p className="s-create-composer__hint">Local music is ready now. Online music selection becomes available when a catalog API is configured.</p>}
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