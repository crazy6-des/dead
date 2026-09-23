import React, { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, Link2, MapPin, MoreHorizontal, X } from "lucide-react";
import PostCard from "../post/PostCard.jsx";
import { toFeedPostFromCreatedPost } from "../feed/feedPostAdapter.js";
import { profileService } from "../../services/profileService.js";
import { apiClient, hasApiBaseUrl } from "../../services/apiClient.js";
import { settingsService } from "../../services/settingsService.js";

const DEFAULT_PROFILE = Object.freeze({
  displayName: "David",
  username: "david",
  bio: "Building S — a place to be seen, connect, create and belong.",
  location: "",
  website: "s.social",
  avatarUrl: "",
  privateAccount: false,
  showFollowerCount: true,
});

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const MAX_LENGTHS = Object.freeze({ displayName: 60, bio: 160, location: 100, website: 200 });

function normalizeDraft(draft) {
  return {
    ...draft,
    displayName: draft.displayName.trim(),
    username: draft.username.trim().replace(/^@/, "").toLowerCase(),
    bio: draft.bio.trim(),
    location: draft.location.trim(),
    website: draft.website.trim(),
  };
}

export default function ProfileRoute({ posts = [], onLike, onSave, onFollow, onRepost, onOpen, onProfileUpdate }) {
  const [tab, setTab] = useState("Posts");
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [draft, setDraft] = useState(DEFAULT_PROFILE);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(hasApiBaseUrl());
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [activityPosts, setActivityPosts] = useState([]);
  const [activityLoading, setActivityLoading] = useState(hasApiBaseUrl());
  const [activityError, setActivityError] = useState("");
  const fileRef = useRef(null);
  const avatarObjectUrlsRef = useRef(new Set());
  const tabs = ["Posts", "Replies", "Media", "Likes"];

  const revokeAvatarObjectUrl = (value) => {
    if (typeof value !== "string" || !value.startsWith("blob:")) return;
    URL.revokeObjectURL(value);
    avatarObjectUrlsRef.current.delete(value);
  };

  useEffect(() => () => {
    avatarObjectUrlsRef.current.forEach((value) => URL.revokeObjectURL(value));
    avatarObjectUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    if (!hasApiBaseUrl()) return undefined;
    let active = true;
    profileService.getMe().then((result) => {
      const next = result?.profile || result;
      if (!active || !next?.username) return;
      const normalized = { ...DEFAULT_PROFILE, ...next, privateAccount: Boolean(next.privacy?.privateAccount), showFollowerCount: next.privacy?.showFollowerCount !== false };
      setProfile(normalized);
      setDraft(normalized);
      setError("");
    }).catch((cause) => {
      if (active && cause?.status !== 401) setError(cause?.message || "Could not load your profile.");
    }).finally(() => {
      if (active) setLoadingProfile(false);
    });
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => {
    if (tab === "Media") return posts.filter((post) => Array.isArray(post.media) && post.media.length > 0);
    if (tab === "Likes") return posts.filter((post) => post.liked);
    if (tab === "Replies") return posts.filter((post) => Number(post.r ?? 0) > 0);
    return posts;
  }, [posts, tab]);

  const visiblePosts = hasApiBaseUrl() ? activityPosts : visible;

  useEffect(() => {
    if (!hasApiBaseUrl() || !profile.username) return undefined;
    let active = true;
    profileService.listPosts(profile.username, tab.toLowerCase()).then((result) => {
      if (!active) return;
      setActivityPosts(Array.isArray(result?.items) ? result.items.map((item) => toFeedPostFromCreatedPost(item)) : []);
    }).catch((cause) => {
      if (active) setActivityError(cause?.message || "Could not load profile activity.");
    }).finally(() => { if (active) setActivityLoading(false); });
    return () => { active = false; };
  }, [profile.username, tab]);

  const openEditor = () => {
    setDraft({ ...profile });
    setError("");
    setEditing(true);
  };

  const updateDraft = (patch) => {
    setDraft((current) => ({ ...current, ...patch }));
    setError("");
  };

  const chooseAvatar = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Profile picture must be 10 MB or smaller.");
      return;
    }
    const previous = draft.avatarUrl;
    const nextUrl = URL.createObjectURL(file);
    avatarObjectUrlsRef.current.add(nextUrl);
    if (previous && previous !== profile.avatarUrl) revokeAvatarObjectUrl(previous);
    setAvatarFile(file);
    updateDraft({ avatarUrl: nextUrl });
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    const next = normalizeDraft(draft);

    if (!next.displayName) return setError("Name is required.");
    if (next.displayName.length > MAX_LENGTHS.displayName) return setError("Name must be 60 characters or fewer.");
    if (!USERNAME_PATTERN.test(next.username)) return setError("Username must contain 3–30 lowercase letters, numbers, or underscores.");
    if (next.bio.length > MAX_LENGTHS.bio) return setError("Bio must be 160 characters or fewer.");
    if (next.location.length > MAX_LENGTHS.location) return setError("Location must be 100 characters or fewer.");
    if (next.website.length > MAX_LENGTHS.website) return setError("Website must be 200 characters or fewer.");

    setSavingProfile(true);
    try {
      const { privateAccount, ...profilePatch } = next;
      let uploadedMediaId = null;
      if (hasApiBaseUrl() && avatarFile) {
        const form = new FormData();
        form.append("file", avatarFile, avatarFile.name);
        const upload = await apiClient.post("/api/media/upload", form);
        uploadedMediaId = upload?.media?.mediaId || null;
        const uploadedUrl = upload?.media?.url || "";
        if (!uploadedMediaId || !uploadedUrl) throw new Error("Profile picture upload did not return a usable media URL.");
        profilePatch.avatarUrl = uploadedUrl;
      }
      const result = hasApiBaseUrl() ? await profileService.updateMe(profilePatch) : next;
      if (hasApiBaseUrl()) await settingsService.update({ privateAccount });
      const saved = result?.profile || result || next;
      const normalizedSaved = { ...DEFAULT_PROFILE, ...saved };
      if (profile.avatarUrl && profile.avatarUrl !== normalizedSaved.avatarUrl) revokeAvatarObjectUrl(profile.avatarUrl);
      if (draft.avatarUrl && draft.avatarUrl !== normalizedSaved.avatarUrl) revokeAvatarObjectUrl(draft.avatarUrl);
      setProfile(normalizedSaved);
      setDraft(normalizedSaved);
      setAvatarFile(null);
      onProfileUpdate?.(normalizedSaved);
      setEditing(false);
    } catch (cause) {
      setError(cause?.message || "Could not save your profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const initials = profile.displayName.charAt(0).toUpperCase() || "D";
  const websiteHref = (() => { const value = String(profile.website || "").trim(); if (!value) return ""; try { const parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`); return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : ""; } catch { return ""; } })();
  const followerCount = profile.counts?.followers == null ? null : Number(profile.counts.followers);
  const followingCount = Number(profile.counts?.following ?? 0);
  const joinedLabel = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "";

  return (
    <div className="profile">
      <div className="cover"><div /></div>
      <div className="identity">
        <div className="profile-avatar avatar">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt={`${profile.displayName} profile`} /> : initials}
        </div>
        <div className="profile-actions">
          <button className="icon-btn" onClick={() => onOpen?.("/settings")} aria-label="Profile options"><MoreHorizontal /></button>
          <button className="outline" onClick={openEditor}>Edit profile</button>
        </div>
      </div>

      {loadingProfile ? <div className="empty" role="status"><p>Loading profile…</p></div> : null}
      <div className="profile-info">
        <h2>{profile.displayName} <span className="verified"><Check size={10} /></span></h2>
        <span>@{profile.username}</span>
        <p>{profile.bio || "No bio yet."}</p>
        <div className="links">
          {profile.location && <span><MapPin />{profile.location}</span>}
          {profile.website && (websiteHref ? <a href={websiteHref} target="_blank" rel="noreferrer"><Link2 />{profile.website}</a> : <span><Link2 />{profile.website}</span>)}
          {joinedLabel && <span>Joined {joinedLabel}</span>}
        </div>
        <div className="stats">
          <button onClick={() => onOpen?.(`/following/${profile.username}`)}><b>{followingCount}</b> Following</button>
          {profile.showFollowerCount && followerCount != null && <button onClick={() => onOpen?.(`/followers/${profile.username}`)}><b>{followerCount}</b> Followers</button>}
        </div>
      </div>

      <div className="tabs4">
        {tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => { if (item === tab) return; setActivityLoading(true); setActivityError(""); setTab(item); }}>{item}</button>)}
      </div>

      {activityLoading ? <div className="empty" role="status"><p>Loading activity…</p></div> : activityError ? <div className="empty"><h3>Could not load activity</h3><p>{activityError}</p></div> : visiblePosts.length > 0
        ? visiblePosts.slice(0, 8).map((post) => <PostCard key={post.id} post={post} onLike={onLike} onSave={onSave} onFollow={onFollow} onRepost={onRepost} onOpen={onOpen} />)
        : <div className="empty"><h3>No {tab.toLowerCase()} yet</h3><p>This space will fill as your activity grows.</p></div>}

      {editing && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
          <form className="create s-profile-editor" onSubmit={saveProfile}>
            <header>
              <div><small>YOUR IDENTITY · LOCAL PREVIEW</small><h2 id="edit-profile-title">Edit profile</h2></div>
              <button type="button" className="icon-btn" onClick={() => setEditing(false)} aria-label="Close"><X /></button>
            </header>
            <div className="s-profile-editor__body">
              <p className="s-create-composer__hint" role="note">{hasApiBaseUrl() ? "Changes are saved to your S profile." : "Preview mode: changes stay in this session until the profile API is configured."}</p>
              <div className="s-profile-editor__avatar">
                <div className="profile-avatar avatar">{draft.avatarUrl ? <img src={draft.avatarUrl} alt="Selected profile" /> : draft.displayName.charAt(0).toUpperCase() || "D"}</div>
                <button type="button" className="outline" onClick={() => fileRef.current?.click()}><Camera size={15} /> Choose picture</button>
                <input ref={fileRef} hidden type="file" accept="image/*" onChange={chooseAvatar} />
              </div>
              <label>Name<input value={draft.displayName} maxLength={MAX_LENGTHS.displayName} onChange={(event) => updateDraft({ displayName: event.target.value })} /></label>
              <label>Username<input value={draft.username} maxLength={30} onChange={(event) => updateDraft({ username: event.target.value })} /></label>
              <label>Bio<textarea value={draft.bio} maxLength={MAX_LENGTHS.bio} rows={3} onChange={(event) => updateDraft({ bio: event.target.value })} /></label>
              <label>Location<input value={draft.location} maxLength={MAX_LENGTHS.location} placeholder="Your city or region" onChange={(event) => updateDraft({ location: event.target.value })} /></label>
              <label>Website or social link<input value={draft.website} maxLength={MAX_LENGTHS.website} placeholder="https://…" onChange={(event) => updateDraft({ website: event.target.value })} /></label>
              <label className="s-profile-editor__check"><input type="checkbox" checked={draft.privateAccount} onChange={(event) => updateDraft({ privateAccount: event.target.checked })} /> Private account</label>
              {error && <p className="s-create-composer__error" role="alert">{error}</p>}
            </div>
            <footer><button type="button" className="outline" onClick={() => { if (draft.avatarUrl !== profile.avatarUrl) revokeAvatarObjectUrl(draft.avatarUrl); setAvatarFile(null); setEditing(false); }} disabled={savingProfile}>Cancel</button><button className="primary" type="submit" disabled={savingProfile}>{savingProfile ? "Saving…" : hasApiBaseUrl() ? "Save profile" : "Save locally"}</button></footer>
          </form>
        </div>
      )}
    </div>
  );
}
