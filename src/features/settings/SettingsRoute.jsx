import React, { useEffect, useState } from "react";
import { Check, UserRound, Shield, Palette } from "lucide-react";
import AuthPanel from "../auth/AuthPanel.jsx";
import { hasApiBaseUrl } from "../../services/apiClient.js";
import { settingsService } from "../../services/settingsService.js";

const groups = [
  ["Account", ["Profile"]],
  ["Privacy & safety", ["Privacy", "Messages"]],
  ["Experience", ["Appearance", "Accessibility"]],
];

const descriptions = {
  Profile: "Edit your name, bio, location, picture and website.",
  Privacy: "Control who can see your account activity and follower count.",
  Messages: "Choose whether other users can start or continue conversations with you.",
  Appearance: "Choose the appearance used across S.",
  Accessibility: "Reduce motion for a calmer interface.",
};

export default function SettingsRoute({ onSettingsUpdate, onOpen, auth }) {
  const [open, setOpen] = useState("Privacy");
  const [settings, setSettings] = useState(settingsService.defaults);
  const [loading, setLoading] = useState(hasApiBaseUrl());
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasApiBaseUrl()) return undefined;
    let active = true;
    settingsService.get().then((next) => {
      if (!active) return;
      setSettings(next);
      onSettingsUpdate?.(next);
    }).catch((err) => {
      if (active) setError(err?.message || "Could not load your settings.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [onSettingsUpdate]);

  const update = async (patch) => {
    const previous = settings;
    const next = settingsService.normalize({ ...settings, ...patch });
    setSettings(next);
    onSettingsUpdate?.(next);
    if (!hasApiBaseUrl()) {
      try { window.localStorage.setItem("s.settings", JSON.stringify(next)); } catch (storageError) { void storageError; }
      return;
    }
    setSaving(Object.keys(patch)[0] || "settings");
    setError("");
    try {
      const persisted = await settingsService.update(patch);
      setSettings(persisted);
      onSettingsUpdate?.(persisted);
    } catch (err) {
      setSettings(previous);
      onSettingsUpdate?.(previous);
      setError(err?.message || "Could not save that setting.");
    } finally { setSaving(""); }
  };

  return <div className="page">
    <div className="heading">
      <small>CONTROL CENTER</small>
      <h2>Settings</h2>
      <p>Keep only the controls that have a real effect on your S account and experience.</p>
      {loading && <p className="muted">Loading your saved settings…</p>}
      {error && <p className="s-create-composer__error" role="alert">{error}</p>}
    </div>

    {groups.map(([title, items]) => <section className="settings" key={title}>
      <h3>{title}</h3>
      {items.map((item) => {
        const expanded = open === item;
        return <div className="setting-row" key={item}>
          <button type="button" className={expanded ? "is-open" : ""} aria-expanded={expanded} onClick={() => setOpen(expanded ? null : item)}>
            <span><b>{item}</b><small>{descriptions[item]}</small></span>
            {expanded ? <Check size={17} /> : <span aria-hidden="true">›</span>}
          </button>
          {expanded && <div className="setting-panel">
            {item === "Profile" && <button type="button" className="outline" onClick={() => onOpen?.("/profile")}><UserRound size={16}/> Open profile</button>}
            {item === "Privacy" && <>
              <label className="setting-toggle"><input type="checkbox" checked={settings.privateAccount} disabled={Boolean(saving)} onChange={(e) => void update({ privateAccount: e.target.checked })}/><span><b>Private account</b><small>Only you and approved followers can see your posts.</small></span></label>
              <label className="setting-toggle"><input type="checkbox" checked={settings.showFollowerCount} disabled={Boolean(saving)} onChange={(e) => void update({ showFollowerCount: e.target.checked })}/><span><b>Show follower count</b><small>Display your follower count on your profile.</small></span></label>
            </>}
            {item === "Messages" && <label className="setting-toggle"><input type="checkbox" checked={settings.allowMessages} disabled={Boolean(saving)} onChange={(e) => void update({ allowMessages: e.target.checked })}/><span><b>Allow messages</b><small>When off, other users cannot start or send messages to you.</small></span></label>}
            {item === "Appearance" && <div className="setting-choice-group" role="group" aria-label="Appearance"><button type="button" className={settings.theme === "dark" ? "primary" : "outline"} disabled={Boolean(saving)} onClick={() => void update({ theme: "dark" })}><Palette size={16}/> Dark</button><button type="button" className={settings.theme === "light" ? "primary" : "outline"} disabled={Boolean(saving)} onClick={() => void update({ theme: "light" })}><Palette size={16}/> Light</button></div>}
            {item === "Accessibility" && <label className="setting-toggle"><input type="checkbox" checked={settings.reduceMotion} disabled={Boolean(saving)} onChange={(e) => void update({ reduceMotion: e.target.checked })}/><span><b>Reduce motion</b><small>Reduce interface transitions and animation.</small></span></label>}
            {saving && <small className="muted">Saving…</small>}
          </div>}
        </div>;
      })}
    </section>)}

    <section className="settings"><h3>Account access</h3><AuthPanel auth={auth} onSignedOut={() => onOpen?.("/")} /></section>
    <section className="settings"><h3>Account protection</h3><div className="setting-callout"><Shield/><span><b>Privacy is enforced by the server</b><small>Account privacy and messaging choices are stored with your account, not just displayed in the UI.</small></span></div></section>
  </div>;
}
