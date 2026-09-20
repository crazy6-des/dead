export const APP_ROUTES = Object.freeze({
  HOME: "/",
  DISCOVER: "/discover",
  NOTIFICATIONS: "/notifications",
  MESSAGES: "/messages",
  SAVED: "/saved",
  PROFILE: "/david",
  SETTINGS: "/settings",
  EARN: "/earn",
});
export const ROUTE_LABELS = Object.freeze({
  [APP_ROUTES.HOME]: "Home",
  [APP_ROUTES.DISCOVER]: "Discover",
  [APP_ROUTES.NOTIFICATIONS]: "Notifications",
  [APP_ROUTES.MESSAGES]: "Messages",
  [APP_ROUTES.SAVED]: "Saved",
  [APP_ROUTES.PROFILE]: "Profile",
  [APP_ROUTES.SETTINGS]: "Settings",
  [APP_ROUTES.EARN]: "Earn",
});
export function normalizeRoute(pathname = window.location.pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/profile") return APP_ROUTES.PROFILE;
  if (Object.values(APP_ROUTES).includes(path)) return path;
  if (/^\/(post|share|user|topic|followers|following)(\/|$)/.test(path)) return path;
  return APP_ROUTES.HOME;
}
export function navigateTo(route) {
  const next = normalizeRoute(route);
  if (window.location.pathname !== next) {
    window.history.pushState({}, "", next);
    window.dispatchEvent(new window.Event("popstate"));
  }
  return next;
}
