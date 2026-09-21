import React, { useState } from "react";
import { Check, Lock, Shield } from "lucide-react";
import { PRODUCT_IDENTITY } from "../../app/productIdentity.js";
import AuthPanel from "../auth/AuthPanel.jsx";

const groups = [
  ["Account", ["Profile", "Username", "Sessions & devices"]],
  ["Privacy & safety", ["Privacy", "Blocked accounts", "Muted accounts", "Security"]],
  ["Experience", ["Notifications", "Content preferences", "Appearance", "Accessibility"]],
  ["Data & support", ["Data & privacy", "Help", "Legal"]],
];

const descriptions = {
  Profile: "Edit your name, bio, location, picture and website.",
  Username: "Manage your @username and profile address.",
  "Sessions & devices": "Review active sessions and sign out devices.",
  Privacy: "Preview account visibility and follower-count preferences. Server persistence is not connected yet.",
  "Blocked accounts": "Manage accounts you have blocked.",
  "Muted accounts": "Manage accounts you have muted.",
  Security: "Authentication, password and account protection.",
  Notifications: "Preview messaging preferences. Server persistence is not connected yet.",
  "Content preferences": "Manage topics and content shown to you.",
  Appearance: "Switch between light and dark appearance.",
  Accessibility: "Adjust motion, contrast and readable interaction.",
  "Data & privacy": "Manage your data and privacy choices.",
  Help: "Get help with your S account.",
  Legal: "Review S terms and policies.",
};

const getSectionId = (item) => `setting-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

export default function SettingsRoute({ onSettingsUpdate, onOpen }) {
  const [open, setOpen] = useState(() => typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("section") || null);
  const [settings, setSettings] = useState({ privateAccount: false, showFollowerCount: true, allowMessages: true, discoverable: true });

  const update = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    onSettingsUpdate?.(next);
  };

  return <div className="page">
    <div className="heading"><small>CONTROL CENTER</small><h2>Settings</h2><p>Control your account, privacy and {PRODUCT_IDENTITY.name} experience.</p><p className="muted">Preview mode: changes are local to this session and are not saved to the server.</p></div>
    {groups.map(([title, items]) => <section className="settings" key={title}>
      <h3>{title}</h3>
      {items.map((item) => {
        const expanded = open === item;
        const sectionId = getSectionId(item);
        return <div className="setting-row" key={item}>
          <button type="button" className={expanded ? "is-open" : ""} aria-expanded={expanded} aria-controls={sectionId} onClick={() => setOpen(expanded ? null : item)}><span><b>{item}</b><small>{expanded ? descriptions[item] : "Manage your S experience"}</small></span>{expanded ? <Check size={17} /> : <span aria-hidden="true">›</span>}</button>
          {expanded && <div id={sectionId} className="setting-panel">
            {item === "Profile" && <button type="button" className="outline" onClick={() => onOpen?.("/profile")}>Open profile editor</button>}
            {item === "Privacy" && <>
              <label className="setting-toggle"><input type="checkbox" checked={settings.privateAccount} onChange={(event) => update({ privateAccount: event.target.checked })} /><span><b>Private account</b><small>Preview only; this does not restrict server-side post visibility.</small></span></label>
              <label className="setting-toggle"><input type="checkbox" checked={settings.showFollowerCount} onChange={(event) => update({ showFollowerCount: event.target.checked })} /><span><b>Show follower count</b><small>Preview only; this is not saved to your account.</small></span></label>
              <label className="setting-toggle"><input type="checkbox" checked={settings.discoverable} onChange={(event) => update({ discoverable: event.target.checked })} /><span><b>Discoverable profile</b><small>Preview only; discovery rules are not connected yet.</small></span></label>
            </>}
            {item === "Blocked accounts" && <p>No blocked accounts loaded. This panel is ready for the blocked-account service.</p>}
            {item === "Muted accounts" && <p>No muted accounts loaded. This panel is ready for the mute service.</p>}
            {item === "Notifications" && <label className="setting-toggle"><input type="checkbox" checked={settings.allowMessages} onChange={(event) => update({ allowMessages: event.target.checked })} /><span><b>Allow messages</b><small>Preview only; messaging permissions are not saved or enforced yet.</small></span></label>}
            {item !== "Profile" && item !== "Privacy" && item !== "Blocked accounts" && item !== "Muted accounts" && item !== "Notifications" && <p>{descriptions[item]}</p>}
          </div>}
        </div>;
      })}
    </section>)}
    <section className="settings"><h3>Account access</h3><AuthPanel /></section>
    <section className="settings"><h3>Security</h3><div className="setting-callout"><Shield /><span><b>Your account protection</b><small>Authentication and session controls are isolated behind the server API.</small></span></div></section>
    <section className="settings"><h3>Privacy status</h3><div className="setting-callout"><Lock /><span><b>{settings.privateAccount ? "Private preview" : "Public preview"}</b><small>{settings.privateAccount ? "This local preview displays a private-account preference; server-side visibility is unchanged." : "This local preview displays a public-account preference; server-side discovery is unchanged."}</small></span></div></section>
  </div>;
}
