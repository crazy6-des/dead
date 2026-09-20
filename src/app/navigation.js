import { Bell, Compass, Home, List, MessageCircle, Radio, Settings, UserRound, Zap, Bookmark } from "lucide-react";
import { APP_ROUTES } from "./routes.js";

export const PRIMARY_NAVIGATION = Object.freeze([
  { label: "Home", route: APP_ROUTES.HOME, icon: Home },
  { label: "Discover", route: APP_ROUTES.DISCOVER, icon: Compass },
  { label: "Notifications", route: APP_ROUTES.NOTIFICATIONS, icon: Bell },
  { label: "Messages", route: APP_ROUTES.MESSAGES, icon: MessageCircle },
  { label: "Spaces", route: APP_ROUTES.SPACES, icon: Radio },
  { label: "Saved", route: APP_ROUTES.SAVED, icon: Bookmark },
  { label: "Lists", route: APP_ROUTES.LISTS, icon: List },
  { label: "Profile", route: APP_ROUTES.PROFILE, icon: UserRound },
  { label: "Settings", route: APP_ROUTES.SETTINGS, icon: Settings },
  { label: "Earn", route: APP_ROUTES.EARN, icon: Zap },
]);

export const MOBILE_NAVIGATION = Object.freeze([
  PRIMARY_NAVIGATION[0],
  PRIMARY_NAVIGATION[1],
  { label: "Create", route: null, icon: null },
  PRIMARY_NAVIGATION[2],
  PRIMARY_NAVIGATION[7],
]);
