import React from "react";
import { Bell, UserRound } from "lucide-react";
import { APP_ROUTES, isRouteActive } from "./routes.js";

export default function HeaderActions({ route, go }) {
  return (
    <div className="header-actions" aria-label="Account actions">
      <button
        className={isRouteActive(route, APP_ROUTES.NOTIFICATIONS) ? "active" : ""}
        onClick={() => go(APP_ROUTES.NOTIFICATIONS)}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell aria-hidden="true" />
      </button>
      <button
        className={isRouteActive(route, APP_ROUTES.PROFILE) ? "active" : ""}
        onClick={() => go(APP_ROUTES.PROFILE)}
        aria-label="Profile"
        title="Profile"
      >
        <span className="avatar avatar--small" aria-hidden="true">D</span>
        <UserRound aria-hidden="true" />
      </button>
    </div>
  );
}
