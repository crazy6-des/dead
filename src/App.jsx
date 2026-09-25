import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Bell, Bookmark, Compass, Home as HomeIcon, List, Menu, MessageCircle, Plus, Search, Sparkles, UserRound, X, Zap, Radio as RadioIcon } from "lucide-react";
import { toFeedPostFromCreatedPost } from "./features/index.js";
import { CreateRoute } from "./features/create/index.js";
import { toggleLike, toggleSaved, setFollowUser, toggleRepost } from "./features/social/socialState.js";
import { useAppRouter } from "./app/useAppRouter.js";
import { APP_ROUTES, ROUTE_LABELS, isRouteActive } from "./app/routes.js";
import { PRODUCT_IDENTITY } from "./app/productIdentity.js";
import { PRIMARY_NAVIGATION, HEADER_NAVIGATION, MOBILE_NAVIGATION, SECONDARY_NAVIGATION } from "./app/navigation.js";
import { socialGraphService } from "./services/socialGraphService.js";
import { socialService } from "./services/socialService.js";
import { createFeedAdapter } from "./services/feedService.js";
import { SOCIAL_RELATIONSHIPS, normalizeUsername } from "./features/social/socialGraphContract.js";










import { useAuthState } from "./features/auth/authState.js";
import { getUserPresentation } from "./features/auth/userPresentation.js";
import { hasApiBaseUrl } from "./services/apiClient.js";
import { settingsService } from "./services/settingsService.js";
import AuthLanding from "./features/auth/AuthLanding.jsx";
import LandingRoute from "./features/landing/LandingRoute.jsx";

const HomeRoute = lazy(() => import("./features/home/HomeRoute.jsx"));
const DiscoverRoute = lazy(() => import("./features/discover/DiscoverRoute.jsx"));
const ProfileRoute = lazy(() => import("./features/profile/ProfileRoute.jsx"));
const NotificationsRoute = lazy(() => import("./features/inbox/InboxRoutes.jsx").then((module) => ({ default: module.NotificationsRoute })));
const MessagesRoute = lazy(() => import("./features/inbox/InboxRoutes.jsx").then((module) => ({ default: module.MessagesRoute })));
const SavedRoute = lazy(() => import("./features/inbox/InboxRoutes.jsx").then((module) => ({ default: module.SavedRoute })));
const SettingsRoute = lazy(() => import("./features/settings/SettingsRoute.jsx"));
const EarnRoute = lazy(() => import("./features/earn/EarnRoute.jsx"));
const EntityRoute = lazy(() => import("./features/explore/EntityRoute.jsx"));
const SearchOverlay = lazy(() => import("./features/search/SearchOverlay.jsx"));
const BookmarkFoldersRoute = lazy(() => import("./features/library/LibraryRoutes.jsx").then((module) => ({ default: module.BookmarkFoldersRoute })));
const ListsRoute = lazy(() => import("./features/library/LibraryRoutes.jsx").then((module) => ({ default: module.ListsRoute })));
const SpacesRoute = lazy(() => import("./features/spaces/SpacesRoute.jsx"));


function PageHeader({ route, onSearch, onTheme, onMenu, mobileMenuOpen, go }) {
  const label = ROUTE_LABELS[route] || PRODUCT_IDENTITY.name;
  return <><header className="mobile-head"><button onClick={onMenu} aria-label="Open navigation menu" aria-expanded={mobileMenuOpen} aria-controls="s-mobile-menu"><Menu/></button><div className="brand"><b>S</b></div><button onClick={onTheme} aria-label="Theme"><Sparkles/></button></header>
  <header className="top"><div><h1>{label}</h1><small>{route === APP_ROUTES.HOME ? PRODUCT_IDENTITY.tagline : `Your ${PRODUCT_IDENTITY.name} space.`}</small></div><div className="top-actions">{HEADER_NAVIGATION.map(({ label: actionLabel, route: path, icon: Icon }) => <button key={path} onClick={() => go(path)} aria-label={actionLabel} title={actionLabel}><Icon/></button>)}<button onClick={onSearch} aria-label="Search" title="Search"><Search/></button></div></header></>;
}
function Sidebar({ route, go, onCreate, user }) {
  const presentation = getUserPresentation(user);
  return <aside className="sidebar"><button className="brand brand-button" onClick={() => go(APP_ROUTES.HOME)}><b>S</b><span>Social</span></button>{PRIMARY_NAVIGATION.map(({ label, route: path, icon: Icon }) => <button key={path} className={"nav " + (isRouteActive(route, path) ? "active" : "")} onClick={() => go(path)}><Icon/><span>{label}</span></button>)}<div className="nav-secondary" aria-label="More destinations">{SECONDARY_NAVIGATION.map(({ label, route: path, icon: Icon }) => <button key={path} className={"nav " + (isRouteActive(route, path) ? "active" : "")} onClick={() => go(path)}><Icon/><span>{label}</span></button>)}</div><button className="create-btn" onClick={onCreate}><Plus/>Create</button><button className="me" onClick={() => go(APP_ROUTES.PROFILE)}><span className="avatar avatar--small">{presentation.avatarInitial}</span><span><b>{presentation.name}</b>{presentation.handle && <small>{presentation.handle}</small>}</span></button></aside>;
}
function MobileMenu({ route, go, onCreate, onClose }) {
  return <div className="mobile-menu-layer" role="presentation"><button className="mobile-menu-backdrop" aria-label="Close navigation menu" onClick={onClose}/><aside id="s-mobile-menu" className="mobile-menu" role="dialog" aria-modal="true" aria-label="Mobile navigation"><div className="mobile-menu-head"><b>S</b><button className="icon-btn" onClick={onClose} aria-label="Close navigation menu"><X/></button></div>{HEADER_NAVIGATION.map(({ label, route: path, icon: Icon }) => <button key={path} className={"nav " + (isRouteActive(route, path) ? "active" : "")} onClick={() => { onClose(); go(path); }}><Icon/><span>{label}</span></button>)}{MOBILE_NAVIGATION.map(({ label, route: path, icon: ConfigIcon }) => { const Icon = label === "Create" ? Plus : ConfigIcon; return <button key={label} className={"nav " + (path && isRouteActive(route, path) ? "active" : "")} onClick={() => { onClose(); path ? go(path) : onCreate(); }}><Icon/><span>{label}</span></button>; })}<div className="nav-secondary" aria-label="More destinations">{SECONDARY_NAVIGATION.map(({ label, route: path, icon: Icon }) => <button key={path} className={"nav " + (isRouteActive(route, path) ? "active" : "")} onClick={() => { onClose(); go(path); }}><Icon/><span>{label}</span></button>)}</div></aside></div>;
}
function RightRail({ go, posts = [], followingUsers, onFollowUser, onSearch }) {
  const topicCounts = posts.reduce((map, post) => { const topic = post.topic || post.h; if (topic) map.set(topic, (map.get(topic) || 0) + 1); return map; }, new Map());
  const people = [...new Map(posts.map((post) => [post.u || post.username, { name: post.a || post.displayName || post.username, username: post.u || post.username }]).filter(([username]) => username)).values()].slice(0, 4);
  return <aside className="rail"><button className="rail-search" onClick={onSearch}><Search/><span>{PRODUCT_IDENTITY.searchPlaceholder}</span></button>{topicCounts.size > 0 && <section className="rail-card"><h3>{PRODUCT_IDENTITY.activityTitle}</h3>{[...topicCounts.entries()].slice(0, 4).map(([topic, count]) => <button className="trend" key={topic} onClick={() => go("/topic/" + encodeURIComponent(topic))}><small>TOPIC</small><b>{topic}</b><small>{count} {count === 1 ? "post" : "posts"}</small></button>)}</section>}{people.length > 0 && <section className="rail-card"><h3>People to connect with</h3>{people.map(({ name, username }) => { const following = followingUsers.has(username); return <div className="suggest" key={username}><button className="avatar avatar--small" onClick={() => go("/user/" + encodeURIComponent(username))}>{String(name || username).charAt(0).toUpperCase()}</button><button className="suggest__person" onClick={() => go("/user/" + username)}><b>{name}</b>@{username}</button><button className={following ? "is-following" : ""} onClick={() => onFollowUser(username)}>{following ? "Following" : "Follow"}</button></div>; })}</section>}</aside>;
}
export default function App() {
  const { route, go } = useAppRouter();
  const auth = useAuthState({ enabled: hasApiBaseUrl() });
  const [posts,setPosts] = useState([]);
  const [userSettings,setUserSettings] = useState(() => { try { const stored = JSON.parse(window.localStorage.getItem("s.settings") || "null"); return stored ? settingsService.normalize(stored) : settingsService.defaults; } catch (error) { void error; return settingsService.defaults; } });
  const [creating,setCreating] = useState(false);
  const [mobileMenuOpen,setMobileMenuOpen] = useState(false);
  const [toast,setToast] = useState("");
  const [feedMode,setFeedMode] = useState("For You");
  const [feedLoading,setFeedLoading] = useState(false);
  const [feedError,setFeedError] = useState("");
  const [feedCursor,setFeedCursor] = useState(null);
  const [feedLoadingMore,setFeedLoadingMore] = useState(false);
  const [followingUsers,setFollowingUsers] = useState(() => new Set());
  const [searchOpen,setSearchOpen] = useState(false);
  const postActionBusyRef = useRef(new Set());
  const followBusyRef = useRef(new Set());
  const isResetRoute = typeof window !== "undefined" && window.location.pathname === "/reset-password";
  useEffect(() => { if (hasApiBaseUrl()) settingsService.get().then(setUserSettings).catch((error) => { void error; }); }, []);
  const flash = (message) => { setToast(message); window.setTimeout(() => setToast(""), 1600); };
  useEffect(() => { if (!creating) return undefined; const onKeyDown = (event) => { if (event.key === "Escape") setCreating(false); }; const previousOverflow = document.body.style.overflow; document.body.style.overflow = "hidden"; window.addEventListener("keydown", onKeyDown); return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); }; }, [creating]);
  useEffect(() => { if (!mobileMenuOpen) return undefined; const onKeyDown = (event) => { if (event.key === "Escape") setMobileMenuOpen(false); }; const previousOverflow = document.body.style.overflow; document.body.style.overflow = "hidden"; window.addEventListener("keydown", onKeyDown); return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); }; }, [mobileMenuOpen]);
  const refreshFeed = async (mode = feedMode) => {
    setFeedLoading(true);
    setFeedError("");
    setFeedCursor(null);
    try {
      const feed = createFeedAdapter({ seedPosts: [] });
      const page = await feed.list({ mode, cursor: null });
      if (Array.isArray(page?.items)) setPosts(page.items);
      setFeedCursor(page?.nextCursor || null);
    } catch (error) {
      setFeedError(error?.message || "Could not refresh the feed.");
      flash("Could not refresh the feed");
    } finally {
      setFeedLoading(false);
    }
  };
  const loadMoreFeed = async () => {
    if (!feedCursor || feedLoading || feedLoadingMore) return;
    setFeedLoadingMore(true);
    try {
      const feed = createFeedAdapter({ seedPosts: [] });
      const page = await feed.list({ mode: feedMode, cursor: feedCursor });
      if (Array.isArray(page?.items) && page.items.length) {
        setPosts((current) => {
          const seen = new Set(current.map((item) => item.id));
          return [...current, ...page.items.filter((item) => !seen.has(item.id))];
        });
      }
      setFeedCursor(page?.nextCursor || null);
    } catch (error) {
      flash(error?.message || "Could not load more posts.");
    } finally {
      setFeedLoadingMore(false);
    }
  };
  useEffect(() => {
    let active = true;
    const feed = createFeedAdapter({ seedPosts: [] });
    feed.list({ mode: feedMode, cursor: null }).then((page) => {
      if (!active) return;
      setFeedError("");
      if (Array.isArray(page?.items)) setPosts(page.items);
      setFeedCursor(page?.nextCursor || null);
    }).catch((error) => {
      if (active) setFeedError(error?.message || "Could not load the feed.");
    }).finally(() => {
      if (active) setFeedLoading(false);
    });
    return () => { active = false; };
  }, [feedMode]);
  const persistPostAction = async (id, action, enabled, rollback, reconcile) => {
    if (!hasApiBaseUrl()) return null;
    const key = id + ":" + action;
    if (postActionBusyRef.current.has(key)) return Promise.resolve();
    postActionBusyRef.current.add(key);
    try {
      const result = await socialService.setPostAction(id, action, enabled);
      if (typeof reconcile === "function") reconcile(result);
      return result;
    } catch (error) {
      rollback();
      flash(error?.message || "Could not save that change");
    } finally {
      postActionBusyRef.current.delete(key);
    }
  };
  const runPostAction = (id, action, readState, transition, countKey, overrideEnabled) => {
    const current = posts.find((post) => post.id === id);
    const key = id + ":" + action;
    if (!current) {
      if (!hasApiBaseUrl() || typeof overrideEnabled !== "boolean") return Promise.resolve();
      return persistPostAction(id, action, overrideEnabled, undefined, undefined);
    }
    if (!hasApiBaseUrl()) { setPosts((all) => transition(all, id)); return Promise.resolve(); }
    if (postActionBusyRef.current.has(key)) return;
    const enabled = !Boolean(readState(current));
    setPosts((all) => transition(all, id));
    void persistPostAction(
      id,
      action,
      enabled,
      () => setPosts((all) => transition(all, id)),
      (result) => {
        if (!Number.isFinite(Number(result?.count))) return;
        setPosts((all) => all.map((post) => post.id === id
          ? { ...post, [countKey]: Number(result.count) }
          : post));
      },
    );
  };
  const like = (id, enabled) => runPostAction(id, "like", (post) => post.liked, toggleLike, "l", enabled);
  const save = (id, enabled) => runPostAction(id, "bookmark", (post) => post.saved, toggleSaved, "b", enabled);
  const repost = (id, enabled) => runPostAction(id, "repost", (post) => post.reposted, toggleRepost, "p", enabled);
  const followUser = async (username) => {
    const target = normalizeUsername(username);
    if (!target || !hasApiBaseUrl() || followBusyRef.current.has(target)) return;
    followBusyRef.current.add(target);
    const wasFollowing = followingUsers.has(target);
    const enabled = !wasFollowing;
    setPosts((all) => setFollowUser(all, target, enabled));
    setFollowingUsers((current) => { const next = new Set(current); if (enabled) next.add(target); else next.delete(target); return next; });
    try {
      await socialGraphService.setRelationship({ username: target, relationship: SOCIAL_RELATIONSHIPS.FOLLOW, enabled });
    } catch (error) {
      setPosts((all) => setFollowUser(all, target, wasFollowing));
      setFollowingUsers((current) => { const next = new Set(current); if (wasFollowing) next.add(target); else next.delete(target); return next; });
      flash(error?.message || "Could not update follow status");
    } finally {
      followBusyRef.current.delete(target);
    }
  };
  const followPost = (id) => { const post = posts.find((item) => item.id === id); if (post) followUser(String(post.h || "").replace("@", "").toLowerCase()); };
  const publish = async (value) => {
    if (!value?.kind || !value?.id) throw new TypeError("Publishing requires a server-created post response.");
    setCreating(false);
    go(APP_ROUTES.HOME);
    flash(PRODUCT_IDENTITY.postedMessage);
    const next = toFeedPostFromCreatedPost(value);
    setPosts((all) => [next, ...all.filter((post) => post.id !== next.id)]);
    await refreshFeed(feedMode);
  };
  const sharePostWithFollowers = async (postId) => { if (!hasApiBaseUrl()) { flash("Follower sharing requires the Cloudflare backend."); return; } try { const result = await socialService.sharePostWithFollowers(postId); flash(`${Number(result?.recipientCount || 0)} follower${Number(result?.recipientCount || 0) === 1 ? "" : "s"} notified`); return result; } catch (error) { flash(error?.message || "Could not share with followers"); throw error; } };
  const quote = async (created) => {
    if (!created?.id) throw new TypeError("Quoting requires a server-created post response.");
    const next = toFeedPostFromCreatedPost(created);
    setPosts((all) => [next, ...all.filter((post) => post.id !== next.id)]);
    go(APP_ROUTES.HOME);
    flash(PRODUCT_IDENTITY.postedMessage);
    await refreshFeed(feedMode);
  };
  const toggleTheme = async () => {
    const previous = userSettings;
    const next = { ...previous, theme: previous.theme === "dark" ? "light" : "dark" };
    setUserSettings(next);
    if (!hasApiBaseUrl()) {
      try { window.localStorage.setItem("s.settings", JSON.stringify(next)); } catch (storageError) { void storageError; }
      return;
    }
    try {
      const persisted = await settingsService.update({ theme: next.theme });
      setUserSettings(persisted);
    } catch (error) {
      setUserSettings(previous);
      flash(error?.message || "Could not save the theme change");
    }
  };
  const enterApp = () => auth.refreshSession();
  if (hasApiBaseUrl() && !isResetRoute && auth.isLoading) {
    return <div className="app app-auth-loading" aria-busy="true"><main className="main"><div className="empty" role="status" aria-live="polite"><h3>Loading S…</h3><p>Restoring your session.</p></div></main></div>;
  }
  if (hasApiBaseUrl() && (auth.isAnonymous || isResetRoute)) {
    return <LandingRoute initialAuthMode={isResetRoute ? "reset" : null} onAuthenticated={enterApp}/>;
  }
  const open = (path) => go(path);
  const openSearch = () => setSearchOpen(true);
  const render = () => { if (route === APP_ROUTES.HOME) return <HomeRoute currentUser={auth.user} posts={posts} onLike={like} onSave={save} onFollow={followPost} onRepost={repost} onCreate={() => setCreating(true)} onOpen={open} onModeChange={setFeedMode} loading={feedLoading} loadingMore={feedLoadingMore} hasMore={Boolean(feedCursor)} error={feedError} onRetry={() => refreshFeed(feedMode)} onLoadMore={loadMoreFeed} />; if (route === APP_ROUTES.DISCOVER) return <DiscoverRoute posts={posts} onLike={like} onSave={save} onRepost={repost} onOpen={open} followingUsers={followingUsers} onFollow={followUser}/>; if (route === APP_ROUTES.PROFILE) return <ProfileRoute posts={posts} onLike={like} onSave={save} onFollow={followPost} onRepost={repost} onFollowUser={followUser} followingUsers={followingUsers} onOpen={open}/>; if (route === APP_ROUTES.NOTIFICATIONS) return <NotificationsRoute onOpen={open}/>; if (route === APP_ROUTES.MESSAGES) return <MessagesRoute currentUserId={auth.user?.id || auth.user?.user_id || auth.user?.userId || null}/>; if (route === APP_ROUTES.SPACES) return <SpacesRoute/>; if (route === APP_ROUTES.SAVED) return <SavedRoute posts={posts} onSave={save} onOpen={open}/>; if (route === APP_ROUTES.BOOKMARKS) return <BookmarkFoldersRoute posts={posts} onOpen={open}/>; if (route === APP_ROUTES.LISTS) return <ListsRoute/>; if (route === APP_ROUTES.SETTINGS || route.startsWith(`${APP_ROUTES.SETTINGS}/`)) return <SettingsRoute route={route} onOpen={open} onSettingsUpdate={setUserSettings} auth={auth}/>; if (route === APP_ROUTES.EARN) return <EarnRoute onOpen={open}/>; if (route === APP_ROUTES.SEARCH || route.startsWith(`${APP_ROUTES.SEARCH}/`)) return <SearchOverlay posts={posts} onOpen={open} onClose={() => go(APP_ROUTES.HOME)}/>; return <EntityRoute path={route} currentUser={auth.user} posts={posts} onBack={() => go(APP_ROUTES.HOME)} onOpen={open} onSave={save} onLike={like} onRepost={repost} onFollowUser={followUser} onQuote={quote} onShareFollowers={sharePostWithFollowers} followingUsers={followingUsers}/>; };
  if (route === APP_ROUTES.RESET_PASSWORD || !auth.isAuthenticated) return <AuthLanding onAuthenticated={enterApp}/>;
  return <div className={"app " + (userSettings.theme === "light" ? "light" : "") + (userSettings.reduceMotion ? " reduce-motion" : "")} aria-busy={auth.isLoading}><Sidebar route={route} go={go} onCreate={() => setCreating(true)} user={auth.user}/><main className="main"><PageHeader route={route} go={go} onSearch={openSearch} onTheme={toggleTheme} onMenu={() => setMobileMenuOpen(true)} mobileMenuOpen={mobileMenuOpen}/>{render()}</main><RightRail go={go} posts={posts} followingUsers={followingUsers} onFollowUser={followUser} onSearch={openSearch}/><nav className="mobile-nav">{MOBILE_NAVIGATION.map(({ label, route: path, icon: ConfigIcon }) => { const Icon = label === "Create" ? Plus : ConfigIcon; return <button key={label} onClick={() => path ? go(path) : setCreating(true)} className={path && isRouteActive(route, path) ? "active" : ""}><Icon/><small>{label}</small></button>; })}</nav>{mobileMenuOpen && <MobileMenu route={route} go={go} onCreate={() => setCreating(true)} onClose={() => setMobileMenuOpen(false)}/>} {searchOpen && <Suspense fallback={null}><SearchOverlay posts={posts} onOpen={(path) => { setSearchOpen(false); open(path); }} onClose={() => setSearchOpen(false)}/></Suspense>} {creating && <div className="modal" role="dialog" aria-modal="true" aria-labelledby="create-dialog-title"><div className="create"><CreateRoute onPublish={publish} onCancel={() => setCreating(false)}/></div><button className="modal-close" onClick={() => setCreating(false)} aria-label="Close create dialog"><X/></button></div>}{toast && <div className="toast">{toast}</div>}</div>;
}