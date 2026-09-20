import React, { useEffect, useState } from "react";
import { Bell, Bookmark, Compass, Home as HomeIcon, List, Menu, MessageCircle, Plus, Search, Settings as SettingsIcon, Sparkles, UserRound, X, Zap, Radio as RadioIcon } from "lucide-react";
import { CreateRoute } from "./features/create/index.js";
import { toFeedPostFromCreatedPost } from "./features/index.js";
import { toggleLike, toggleSaved, toggleFollowUser, toggleRepost } from "./features/social/socialState.js";
import { useAppRouter } from "./app/useAppRouter.js";
import { APP_ROUTES, ROUTE_LABELS, isRouteActive } from "./app/routes.js";
import { PRODUCT_IDENTITY } from "./app/productIdentity.js";
import { PRIMARY_NAVIGATION, MOBILE_NAVIGATION } from "./app/navigation.js";
import { socialGraphService } from "./services/socialGraphService.js";
import { bookmarkService } from "./services/bookmarkService.js";
import { createFeedAdapter } from "./services/feedService.js";
import { SOCIAL_RELATIONSHIPS, normalizeUsername } from "./features/social/socialGraphContract.js";
import HomeRoute from "./features/home/HomeRoute.jsx";
import DiscoverRoute from "./features/discover/DiscoverRoute.jsx";
import ProfileRoute from "./features/profile/ProfileRoute.jsx";
import { NotificationsRoute, MessagesRoute, SavedRoute } from "./features/inbox/InboxRoutes.jsx";
import SettingsRoute from "./features/settings/SettingsRoute.jsx";
import EarnRoute from "./features/earn/EarnRoute.jsx";
import EntityRoute from "./features/explore/EntityRoute.jsx";
import SearchOverlay from "./features/search/SearchOverlay.jsx";
import { BookmarkFoldersRoute, ListsRoute } from "./features/library/LibraryRoutes.jsx";
import SpacesRoute from "./features/spaces/SpacesRoute.jsx";

const seed = [
 {id:1,a:"S Team",h:"@s",t:"2h",x:"Welcome to S — a place for ideas, images, music, and the people behind them.",l:128,r:18,p:9,b:31,liked:false,saved:false,following:false,topic:"Community",verified:true},
 {id:2,a:"Maya Okafor",h:"@maya",t:"34m",x:"A quiet thought: the best communities make you feel like your presence matters.",l:74,r:12,p:4,b:19,liked:true,saved:false,following:true,topic:"Culture"},
 {id:3,a:"Daniel Cole",h:"@daniel",t:"18m",x:"Building something small today that I hope makes someone's day a little easier.",l:46,r:7,p:3,b:8,liked:false,saved:true,following:false,topic:"Creators",media:true},
 {id:4,a:"Nia James",h:"@nia",t:"6m",x:"What are you listening to while you work? I need a new soundtrack.",l:91,r:21,p:6,b:14,liked:false,saved:false,following:true,topic:"Music",music:true}
];
const trends = [["Music","Late Night Notes","8.1K posts"],["Community","Creators of S","1.7K posts"],["Culture","#NewBeginnings","2.4K posts"]];

function PageHeader({ route, onSearch, onTheme, onMenu, mobileMenuOpen }) {
  const label = ROUTE_LABELS[route] || PRODUCT_IDENTITY.name;
  return <><header className="mobile-head"><button onClick={onMenu} aria-label="Open navigation menu" aria-expanded={mobileMenuOpen} aria-controls="s-mobile-menu"><Menu/></button><div className="brand"><b>S</b></div><button onClick={onTheme} aria-label="Theme"><Sparkles/></button></header>
  <header className="top"><div><h1>{label}</h1><small>{route === APP_ROUTES.HOME ? PRODUCT_IDENTITY.tagline : `Your ${PRODUCT_IDENTITY.name} space.`}</small></div><button onClick={onSearch} aria-label="Search"><Search/></button></header></>;
}
function Sidebar({ route, go, onCreate }) {
  const icons = { Home: HomeIcon, Discover: Compass, Notifications: Bell, Messages: MessageCircle, Spaces: RadioIcon, Saved: Bookmark, Lists: List, Profile: UserRound, Settings: SettingsIcon, Earn: Zap };
  return <aside className="sidebar"><button className="brand brand-button" onClick={() => go(APP_ROUTES.HOME)}><b>S</b><span>Social</span></button>{PRIMARY_NAVIGATION.map(({ label, route: path }) => { const Icon = icons[label]; return <button key={path} className={"nav " + (isRouteActive(route, path) ? "active" : "")} onClick={() => go(path)}><Icon/><span>{label}</span></button>; })}<button className="create-btn" onClick={onCreate}><Plus/>Create</button><button className="me" onClick={() => go(APP_ROUTES.PROFILE)}><span className="avatar avatar--small">D</span><span><b>David</b>@david</span></button></aside>;
}
function MobileMenu({ route, go, onCreate, onClose }) {
  const icons = { Home: HomeIcon, Discover: Compass, Notifications: Bell, Profile: UserRound };
  return <div className="mobile-menu-layer" role="presentation"><button className="mobile-menu-backdrop" aria-label="Close navigation menu" onClick={onClose}/><aside id="s-mobile-menu" className="mobile-menu" role="dialog" aria-modal="true" aria-label="Mobile navigation"><div className="mobile-menu-head"><b>S</b><button className="icon-btn" onClick={onClose} aria-label="Close navigation menu"><X/></button></div>{MOBILE_NAVIGATION.map(({ label, route: path, icon: ConfigIcon }) => { const Icon = label === "Create" ? Plus : icons[label] || ConfigIcon; return <button key={label} className={"nav " + (path && isRouteActive(route, path) ? "active" : "")} onClick={() => { onClose(); path ? go(path) : onCreate(); }}><Icon/><span>{label}</span></button>; })}<button className="nav" onClick={() => { onClose(); go(APP_ROUTES.SETTINGS); }}><SettingsIcon/><span>Settings</span></button></aside></div>;
}
function RightRail({ go, followingUsers, onFollowUser, onSearch }) {
  return <aside className="rail"><button className="rail-search" onClick={onSearch}><Search/><span>{PRODUCT_IDENTITY.searchPlaceholder}</span></button><section className="rail-card"><h3>{PRODUCT_IDENTITY.activityTitle}</h3>{trends.map(([a,b,c]) => <button className="trend" key={b} onClick={() => go("/topic/" + encodeURIComponent(b))}><small>{a}</small><b>{b}</b><small>{c}</small></button>)}</section><section className="rail-card"><h3>People to connect with</h3>{["Maya Okafor","Daniel Cole","Nia James"].map((n) => { const username = n.split(" ")[0].toLowerCase(); const following = followingUsers.has(username); return <div className="suggest" key={n}><button className="avatar avatar--small" onClick={() => go("/user/" + username)}>{n[0]}</button><button className="suggest__person" onClick={() => go("/user/" + username)}><b>{n}</b>@{username}</button><button className={following ? "is-following" : ""} onClick={() => onFollowUser(username)}>{following ? "Following" : "Follow"}</button></div>; })}</section></aside>;
}
export default function App() {
  const { route, go } = useAppRouter();
  const [posts,setPosts] = useState(seed);
  const [dark,setDark] = useState(true);
  const [creating,setCreating] = useState(false);
  const [mobileMenuOpen,setMobileMenuOpen] = useState(false);
  const [toast,setToast] = useState("");
  const [followingUsers,setFollowingUsers] = useState(() => new Set(["maya", "nia"]));
  const [searchOpen,setSearchOpen] = useState(false);
  const flash = (message) => { setToast(message); window.setTimeout(() => setToast(""), 1600); };
  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    let active = true;
    const feed = createFeedAdapter({ seedPosts: seed });
    feed.list().then((page) => {
      if (active && Array.isArray(page?.items)) setPosts(page.items);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  const like = (id) => setPosts((all) => toggleLike(all, id));
  const save = (id) => { const current = posts.find((post) => post.id === id); if (!current) return; const nextSaved = !current.saved; setPosts((all) => toggleSaved(all, id)); const request = nextSaved ? bookmarkService.save({ postId: id, folderId: null }) : bookmarkService.remove(id); request.catch(() => setPosts((all) => toggleSaved(all, id))); };
  const repost = (id) => setPosts((all) => toggleRepost(all, id));
  const followUser = (username) => { const target = normalizeUsername(username); const enabled = !followingUsers.has(target); setPosts((all) => toggleFollowUser(all, target)); setFollowingUsers((current) => { const next = new Set(current); if (next.has(target)) next.delete(target); else next.add(target); return next; }); socialGraphService.setRelationship({ username: target, relationship: SOCIAL_RELATIONSHIPS.FOLLOW, enabled }).catch(() => null); };
  const followPost = (id) => { const post = posts.find((item) => item.id === id); if (post) followUser(String(post.h || "").replace("@", "").toLowerCase()); };
  const publish = (value) => { const next = value?.kind ? toFeedPostFromCreatedPost(value) : {id:Date.now(),a:"David",h:"@david",t:"now",x:value.text,l:0,r:0,p:0,b:0,liked:false,saved:false,following:false,topic:"Your post",...value}; setPosts((all) => [next,...all]); setCreating(false); flash(PRODUCT_IDENTITY.postedMessage); go(APP_ROUTES.HOME); };
  const open = (path) => go(path);
  const openSearch = () => setSearchOpen(true);
  const render = () => { if (route === APP_ROUTES.HOME) return <HomeRoute posts={posts} onLike={like} onSave={save} onFollow={followPost} onRepost={repost} onCreate={() => setCreating(true)} onOpen={open} />; if (route === APP_ROUTES.DISCOVER) return <DiscoverRoute posts={posts} onLike={like} onSave={save} onRepost={repost} onOpen={open} followingUsers={followingUsers} onFollow={followUser}/>; if (route === APP_ROUTES.PROFILE) return <ProfileRoute posts={posts} onLike={like} onSave={save} onFollow={followPost} onRepost={repost} onFollowUser={followUser} followingUsers={followingUsers} onOpen={open}/>; if (route === APP_ROUTES.NOTIFICATIONS) return <NotificationsRoute onOpen={open}/>; if (route === APP_ROUTES.MESSAGES) return <MessagesRoute/>; if (route === APP_ROUTES.SPACES) return <SpacesRoute/>; if (route === APP_ROUTES.SAVED) return <SavedRoute posts={posts} onSave={save} onOpen={open}/>; if (route === APP_ROUTES.BOOKMARKS) return <BookmarkFoldersRoute posts={posts} onOpen={open}/>; if (route === APP_ROUTES.LISTS) return <ListsRoute/>; if (route === APP_ROUTES.SETTINGS) return <SettingsRoute/>; if (route === APP_ROUTES.EARN) return <EarnRoute onOpen={open}/>; if (route === APP_ROUTES.SEARCH) return <SearchOverlay posts={posts} onOpen={open} onClose={() => go(APP_ROUTES.HOME)}/>; return <EntityRoute path={route} posts={posts} onBack={() => go(APP_ROUTES.HOME)} onOpen={open} onSave={save} onLike={like} onRepost={repost} onFollowUser={followUser} followingUsers={followingUsers}/>; };
  return <div className={"app " + (dark ? "" : "light")}><Sidebar route={route} go={go} onCreate={() => setCreating(true)}/><main className="main"><PageHeader route={route} onSearch={openSearch} onTheme={() => setDark((v) => !v)} onMenu={() => setMobileMenuOpen(true)} mobileMenuOpen={mobileMenuOpen}/>{render()}</main><RightRail go={go} followingUsers={followingUsers} onFollowUser={followUser} onSearch={openSearch}/><nav className="mobile-nav">{MOBILE_NAVIGATION.map(({ label, route: path }) => { const Icon = label === "Create" ? Plus : label === "Home" ? HomeIcon : label === "Discover" ? Compass : label === "Notifications" ? Bell : UserRound; return <button key={label} onClick={() => path ? go(path) : setCreating(true)} className={path && isRouteActive(route, path) ? "active" : ""}><Icon/><small>{label}</small></button>; })}</nav>{mobileMenuOpen && <MobileMenu route={route} go={go} onCreate={() => setCreating(true)} onClose={() => setMobileMenuOpen(false)}/>} {searchOpen && <SearchOverlay posts={posts} onOpen={(path) => { setSearchOpen(false); open(path); }} onClose={() => setSearchOpen(false)}/>} {creating && <div className="modal"><div className="create"><CreateRoute onPublish={publish} onCancel={() => setCreating(false)}/></div><button className="modal-close" onClick={() => setCreating(false)} aria-label="Close create dialog"><X/></button></div>}{toast && <div className="toast">{toast}</div>}</div>;
}
