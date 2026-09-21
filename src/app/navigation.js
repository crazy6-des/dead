import { Bookmark, Compass, Home, List, MessageCircle, Radio, Settings, Zap, Bell, UserRound } from "lucide-react";
import { APP_ROUTES } from "./routes.js";

// Keep the persistent navigation focused on primary destinations.
// Profile and Notifications belong in the upper account/action area.
export const PRIMARY_NAVIGATION = Object.freeze([
  { label: "Home", route: APP_ROUTES.HOME, icon: Home },
  { label: "Discover", route: APP_ROUTES.DISCOVER, icon: Compass },
  { label: "Messages", route: APP_ROUTES.MESSAGES, icon: MessageCircle },
  { label: "Spaces", route: APP_ROUTES.SPACES, icon: Radio },
  { label: "Saved", route: APP_ROUTES.SAVED, icon: Bookmark },
  { label: "Lists", route: APP_ROUTES.LISTS, icon: List },
  { label: "Settings", route: APP_ROUTES.SETTINGS, icon: Settings },
  { label: "Earn", route: APP_ROUTES.EARN, icon: Zap },
]);

export const HEADER_NAVIGATION = Object.freeze([
  { label: "Notifications", route: APP_ROUTES.NOTIFICATIONS, icon: Bell },
  { label: "Profile", route: APP_ROUTES.PROFILE, icon: UserRound },
]);

export const MOBILE_NAVIGATION = Object.freeze([
  { label: "Home", route: APP_ROUTES.HOME, icon: Home },
  { label: "Discover", route: APP_ROUTES.DISCOVER, icon: Compass },
  { label: "Create", route: null, icon: null },
  { label: "Messages", route: APP_ROUTES.MESSAGES, icon: MessageCircle },
  { label: "Earn", route: APP_ROUTES.EARN, icon: Zap },
]);

export const SECONDARY_NAVIGATION = Object.freeze([
  { label: "Spaces", route: APP_ROUTES.SPACES, icon: Radio },
  { label: "Saved", route: APP_ROUTES.SAVED, icon: Bookmark },
  { label: "Lists", route: APP_ROUTES.LISTS, icon: List },
  { label: "Settings", route: APP_ROUTES.SETTINGS, icon: Settings },
]);
