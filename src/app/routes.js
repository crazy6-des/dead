export const APP_ROUTES = Object.freeze({
  HOME: "/",
  DISCOVER: "/discover",
  NOTIFICATIONS: "/notifications",
  MESSAGES: "/messages",
  SPACES: "/spaces",
  SAVED: "/saved",
  BOOKMARKS: "/bookmarks",
  LISTS: "/lists",
  PROFILE: "/david",
  SETTINGS: "/settings",
  EARN: "/earn",
  SEARCH: "/search",
});

export const ROUTE_LABELS = Object.freeze({
  [APP_ROUTES.HOME]: "Home",
  [APP_ROUTES.DISCOVER]: "Discover",
  [APP_ROUTES.NOTIFICATIONS]: "Notifications",
  [APP_ROUTES.MESSAGES]: "Messages",
  [APP_ROUTES.SPACES]: "Spaces",
  [APP_ROUTES.SAVED]: "Saved",
  [APP_ROUTES.BOOKMARKS]: "Bookmarks",
  [APP_ROUTES.LISTS]: "Lists",
  [APP_ROUTES.PROFILE]: "Profile",
  [APP_ROUTES.SETTINGS]: "Settings",
  [APP_ROUTES.EARN]: "Earn",
  [APP_ROUTES.SEARCH]: "Search",
});

function getPathname(value) {
  return String(value || "/").split(/[?#]/)[0].replace(/\/+$/, "") || "/";
}

export function normalizeRoute(pathname = typeof window === "undefined" ? "/" : window.location.pathname) {
  const path = getPathname(pathname);
  if (path === "/profile") return APP_ROUTES.PROFILE;
  if (Object.values(APP_ROUTES).includes(path)) return path;
  if (/^\/(post|share|user|topic|followers|following|search|settings)(\/|$)/.test(path)) return path;
  return APP_ROUTES.HOME;
}

export function navigateTo(route) {
  const raw = String(route || "/");
  const [location, hash = ""] = raw.split("#", 2);
  const [pathname, search = ""] = location.split("?", 2);
  const next = normalizeRoute(pathname);
  const suffix = search ? "?" + search : "";
  const fragment = hash ? "#" + hash : "";
  const current = window.location.pathname + window.location.search + window.location.hash;
  const target = next + suffix + fragment;
  if (current !== target) {
    window.history.pushState({}, "", target);
    window.dispatchEvent(new window.Event("popstate"));
  }
  return next;
}
