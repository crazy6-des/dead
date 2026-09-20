import React, { useEffect, useState } from "react";
import { Headphones, Mic, Plus, Users, Radio } from "lucide-react";
import { spaceService } from "../../services/spaceService.js";
import { SPACE_STATUSES } from "../spaces/spaceContract.js";

function SpaceCard({ space, onJoin }) {
  const live = space.status === SPACE_STATUSES.LIVE;
  return <article className={"space-card " + (live ? "is-live" : "")}>
    <div className="space-card__icon">{live ? <Radio size={20}/> : <Headphones size={20}/>}</div>
    <div className="space-card__body">
      <span className="space-card__status">{live ? "LIVE NOW" : "SCHEDULED"}</span>
      <h3>{space.title}</h3>
      <p>Hosted by {space.host || "S creator"}{space.startAt ? " · " + space.startAt : ""}</p>
      <small><Users size={14}/> {(space.participants || []).length} participants</small>
    </div>
    <button className={live ? "primary" : "outline"} onClick={() => onJoin(space)}>{live ? "Join" : "Remind me"}</button>
  </article>;
}

export default function SpacesRoute() {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");

  const load = () => {
    setLoading(true);
    spaceService.list().then((page) => setSpaces(page.items || [])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const create = async () => {
    if (!title.trim()) return;
    await spaceService.create({ title, host: "David", startAt: "Later today" });
    setTitle("");
    setCreating(false);
    load();
  };

  const join = async (space) => {
    await spaceService.join(space.id);
  };

  return <div className="page">
    <div className="heading"><small>LIVE CONVERSATIONS</small><h2>Spaces</h2><p>Talk, listen and connect in real time on S.</p></div>
    <div className="page-actions"><button className="primary" onClick={() => setCreating((v) => !v)}><Plus size={16}/>Create a Space</button></div>
    {creating && <section className="card composer-panel"><div className="heading"><small>NEW SPACE</small><h3>Start a conversation</h3></div><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you want to talk about?" aria-label="Space title"/><div className="composer-panel__footer"><button className="outline" onClick={() => setCreating(false)}>Cancel</button><button className="primary" disabled={!title.trim()} onClick={create}><Mic size={16}/>Schedule Space</button></div></section>}
    <section className="space-list">{loading ? <div className="empty"><p>Loading Spaces…</p></div> : spaces.map((space) => <SpaceCard key={space.id} space={space} onJoin={join}/>)}</section>
  </div>;
}
