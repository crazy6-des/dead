import React, { useState } from "react";
import { Bell, Bookmark, Compass, Home as HomeIcon, Menu, MessageCircle, Plus, Search, Settings as SettingsIcon, Sparkles, UserRound, X, Zap } from "lucide-react";
import { CreateRoute } from "./features/create/index.js";
import { toFeedPostFromCreatedPost } from "./features/index.js";
import { useAppRouter } from "./app/useAppRouter.js";
import { APP_ROUTES, ROUTE_LABELS } from "./app/routes.js";
import HomeRoute from "./features/home/HomeRoute.jsx";
import DiscoverRoute from "./features/discover/DiscoverRoute.jsx";
import ProfileRoute from "./features/profile/ProfileRoute.jsx";
import { NotificationsRoute, MessagesRoute, SavedRoute } from "./features/inbox/InboxRoutes.jsx";
import SettingsRoute from "./features/settings/SettingsRoute.jsx";
import EarnRoute from "./features/earn/EarnRoute.jsx";
import EntityRoute from "./features/explore/EntityRoute.jsx";

const seed = [
 {id:1,a:"S Team",h:"@s",t:"2h",x:"Welcome to S — a place for ideas, images, music, and the people behind them.",l:128,r:18,p:9,b:31,liked:false,saved:false,following:false,topic:"Community",verified:true},
 {id:2,a:"Maya Okafor",h:"@maya",t:"34m",x:"A quiet thought: the best communities make you feel like your presence matters.",l:74,r:12,p:4,b:19,liked:true,saved:false,following:true,topic:"Culture"},
 {id:3,a:"Daniel Cole",h:"@daniel",t:"18m",x:"Building something small today that I hope makes someone's day a little easier.",l:46,r:7,p:3,b:8,liked:false,saved:true,following:false,topic:"Creators",media:true},
 {id:4,a:"Nia James",h:"@nia",t:"6m",x:"What are you listening to while you work? I need a new soundtrack.",l:91,r:21,p:6,b:14,liked:false,saved:false,following:true,topic:"Music",music:true}
];
const trends = [["Music","Late Night Notes","8.1K posts"],["Community","Creators of S","1.7K posts"],["Culture","#NewBeginnings","2.4K posts"]];

function PageHeader({ route, onSearch, onTheme }) {
  const label = ROUTE_LABELS[route] || "S";
  return <><header className="mobile-head"><button aria-label="Menu"><Menu/></button><div className="brand"><b>S</b></div><button onClick={onTheme} aria-label="Theme"><Sparkles/></button></header>
  <header className="top"><div><h1>{label}</h1><small>{route === APP_ROUTES.HOME ? "Good to see you." : "Your S space."}</small></div><button onClick={onSearch} aria-label="Search"><Search/></button></header></>;
}
function Sidebar({ route, go, onCreate }) {
  const items = [[HomeIcon,"Home",APP_ROUTES.HOME],[Compass,"Discover",APP_ROUTES.DISCOVER],[Bell,"Notifications",APP_ROUTES.NOTIFICATIONS],[MessageCircle,"Messages",APP_ROUTES.MESSAGES],[Bookmark,"Saved",APP_ROUTES.SAVED],[UserRound,"Profile",APP_ROUTES.PROFILE],[SettingsIcon,"Settings",APP_ROUTES.SETTINGS],[Zap,"Earn",APP_ROUTES.EARN]];
  return <aside className="sidebar"><button className="brand brand-button" onClick={() => go(APP_ROUTES.HOME)}><b>S</b><span>S</span></button>{items.map(([Icon,label,path]) => <button key={path} className={"nav " + (route === path ? "active" : "")} onClick={() => go(path)}><Icon/><span>{label}</span></button>)}<button className="create-btn" onClick={onCreate}><Plus/>Create</button><button className="me" onClick={() => go(APP_ROUTES.PROFILE)}><span className="avatar avatar--small">D</span><span><b>David</b>@david</span></button></aside>;
}
function RightRail({ go }) {
 return <aside className="rail"><button className="rail-search" onClick={() => go(APP_ROUTES.DISCOVER)}><Search/><span>Search S</span></button><section className="rail-card"><h3>What's happening</h3>{trends.map(([a,b,c]) => <button className="trend" key={b} onClick={() => go("/topic/" + encodeURIComponent(b))}><small>{a}</small><b>{b}</b><small>{c}</small></button>)}</section><section className="rail-card"><h3>Who to follow</h3>{["Maya Okafor","Daniel Cole","Nia James"].map((n) => <div className="suggest" key={n}><span className="avatar avatar--small">{n[0]}</span><span><b>{n}</b>@{n.split(" ")[0].toLowerCase()}</span><button>Follow</button></div>)}</section></aside>;
}
export default function App() {
  const { route, go } = useAppRouter();
  const [posts,setPosts] = useState(seed);
  const [dark,setDark] = useState(true);
  const [creating,setCreating] = useState(false);
  const [toast,setToast] = useState("");
  const flash = (message) => { setToast(message); window.setTimeout(() => setToast(""), 1600); };
  const like = (id) => setPosts((all) => all.map((p) => p.id === id ? {...p,liked:!p.liked,l:p.l+(p.liked?-1:1)} : p));
  const save = (id) => setPosts((all) => all.map((p) => p.id === id ? {...p,saved:!p.saved,b:p.b+(p.saved?-1:1)} : p));
  const follow = (id) => setPosts((all) => all.map((p) => p.id === id ? {...p,following:true} : p));
  const publish = (value) => { const next = value?.kind ? toFeedPostFromCreatedPost(value) : {id:Date.now(),a:"David",h:"@david",t:"now",x:value.text,l:0,r:0,p:0,b:0,liked:false,saved:false,following:false,topic:"Your post",...value}; setPosts((all) => [next,...all]); setCreating(false); flash("Posted to S"); go(APP_ROUTES.HOME); };
  const open = (path) => go(path);
  const render = () => {
    if (route === APP_ROUTES.HOME) return <HomeRoute posts={posts} onLike={like} onSave={save} onFollow={follow} onCreate={() => setCreating(true)} onOpen={open}/>;
    if (route === APP_ROUTES.DISCOVER) return <DiscoverRoute posts={posts} onOpen={open} onFollow={() => flash("Followed")}/>;
    if (route === APP_ROUTES.PROFILE) return <ProfileRoute posts={posts} onLike={like} onSave={save} onFollow={follow} onOpen={open}/>;
    if (route === APP_ROUTES.NOTIFICATIONS) return <NotificationsRoute onOpen={open}/>;
    if (route === APP_ROUTES.MESSAGES) return <MessagesRoute/>;
    if (route === APP_ROUTES.SAVED) return <SavedRoute posts={posts} onSave={save} onOpen={open}/>;
    if (route === APP_ROUTES.SETTINGS) return <SettingsRoute/>;
    if (route === APP_ROUTES.EARN) return <EarnRoute onOpen={open}/>;
    return <EntityRoute path={route} posts={posts} onBack={() => go(APP_ROUTES.HOME)} onOpen={open} onSave={save}/>;
  };
  return <div className={"app " + (dark ? "" : "light")}><Sidebar route={route} go={go} onCreate={() => setCreating(true)}/><main className="main"><PageHeader route={route} onSearch={() => go(APP_ROUTES.DISCOVER)} onTheme={() => setDark((v) => !v)}/>{render()}</main><RightRail go={go}/><nav className="mobile-nav">{[[HomeIcon,"Home",APP_ROUTES.HOME],[Compass,"Discover",APP_ROUTES.DISCOVER],[Plus,"Create",null],[Bell,"Notifications",APP_ROUTES.NOTIFICATIONS],[UserRound,"Profile",APP_ROUTES.PROFILE]].map(([Icon,label,path]) => <button key={label} onClick={() => path ? go(path) : setCreating(true)} className={route === path ? "active" : ""}><Icon/><small>{label}</small></button>)}</nav>{creating && <div className="modal"><div className="create"><CreateRoute onPublish={publish} onCancel={() => setCreating(false)}/></div><button className="modal-close" onClick={() => setCreating(false)}><X/></button></div>}{toast && <div className="toast">{toast}</div>}</div>;
}
