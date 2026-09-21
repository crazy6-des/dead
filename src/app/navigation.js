import { Compass, Home, MessageCircle, Zap, Bell, UserRound, Radio, Bookmark, List, Settings } from "lucide-react";
import { APP_ROUTES } from "./routes.js";

// Keep the persistent navigation focused on the destinations used most often.
// Account actions stay in the header; secondary destinations stay in the menu.
export const PRIMARY_NAVIGATION = Object.freeze([
  { label: "Home", route: APP_ROUTES.HOME, icon: Home },
  { label: "Discover", route: APP_ROUTES.DISCOVER, icon: Compass },
  { label: "Messages", route: APP_ROUTES.MESSAGES, icon: MessageCircle },
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
