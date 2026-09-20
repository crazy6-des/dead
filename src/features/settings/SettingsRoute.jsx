import React, { useState } from "react";
import { MoreHorizontal, Shield, SlidersHorizontal } from "lucide-react";
import { PRODUCT_IDENTITY } from "../../app/productIdentity.js";
const groups = [
 ["Account",["Profile","Username","Sessions & devices"]],
 ["Privacy & safety",["Privacy","Blocked accounts","Muted accounts","Security"]],
 ["Experience",["Notifications","Content preferences","Appearance","Accessibility"]],
 ["Data & support",["Data & privacy","Help","Legal"]]
];
export default function SettingsRoute() {
  const [open, setOpen] = useState(null);
  return <div className="page"><div className="heading"><small>CONTROL CENTER</small><h2>Settings</h2><p>Control your account, privacy and {PRODUCT_IDENTITY.name} experience.</p></div>{groups.map(([title, items]) => <section className="settings" key={title}><h3>{title}</h3>{items.map((item) => <button key={item} onClick={() => setOpen(open === item ? null : item)}><span><b>{item}</b><small>{open === item ? "This setting is ready for its dedicated control surface." : "Manage your S experience"}</small></span><MoreHorizontal/></button>)}</section>)}<section className="settings"><h3>Security</h3><div className="setting-callout"><Shield/><span><b>Your account protection</b><small>Authentication and session controls will connect to the backend contract later.</small></span></div></section></div>;
}
