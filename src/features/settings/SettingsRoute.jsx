import React, { useState } from "react";
import { MoreHorizontal, Shield, Check } from "lucide-react";
import { PRODUCT_IDENTITY } from "../../app/productIdentity.js";
import AuthPanel from "../auth/AuthPanel.jsx";

const groups = [
  ["Account", ["Profile", "Username", "Sessions & devices"]],
  ["Privacy & safety", ["Privacy", "Blocked accounts", "Muted accounts", "Security"]],
  ["Experience", ["Notifications", "Content preferences", "Appearance", "Accessibility"]],
  ["Data & support", ["Data & privacy", "Help", "Legal"]],
];

const descriptions = {
  Profile: "Edit your name, bio and profile details.", Username: "Manage your @username and profile address.", "Sessions & devices": "Review active sessions and sign out devices.", Privacy: "Control who can see and interact with you.", "Blocked accounts": "Manage accounts you have blocked.", "Muted accounts": "Manage accounts you have muted.", Security: "Authentication, password and account protection.", Notifications: "Choose which activity reaches you.", "Content preferences": "Manage topics and content shown to you.", Appearance: "Switch between light and dark appearance.", Accessibility: "Adjust motion, contrast and readable interaction.", "Data & privacy": "Manage your data and privacy choices.", Help: "Get help with your S account.", Legal: "Review S terms and policies.",
};
const getSectionId = (item) => `setting-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

export default function SettingsRoute() {
  const [open, setOpen] = useState(() => typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("section") || null);
  return <div className="page">
    <div className="heading"><small>CONTROL CENTER</small><h2>Settings</h2><p>Control your account, privacy and {PRODUCT_IDENTITY.name} experience.</p></div>
    {groups.map(([title, items]) => <section className="settings" key={title}><h3>{title}</h3>{items.map((item) => { const expanded = open === item; const sectionId = getSectionId(item); return <button key={item} type="button" className={expanded ? "is-open" : ""} aria-expanded={expanded} aria-controls={sectionId} onClick={() => setOpen(expanded ? null : item)}><span><b>{item}</b><small id={sectionId}>{expanded ? descriptions[item] : "Manage your S experience"}</small></span>{expanded ? <Check size={17} aria-hidden="true" /> : <MoreHorizontal aria-hidden="true" />}</button>; })}</section>)}
    <section className="settings"><h3>Account access</h3><AuthPanel /></section>
    <section className="settings"><h3>Security</h3><div className="setting-callout"><Shield aria-hidden="true"/><span><b>Your account protection</b><small>Authentication and session controls are isolated behind the server API.</small></span></div></section>
  </div>;
}
