import { startTransition, useCallback, useEffect, useState } from "react";
import { navigateTo, normalizeRoute } from "./routes.js";
export function useAppRouter() {
  const [route, setRoute] = useState(() => normalizeRoute());
  useEffect(() => {
    const onPopState = () => setRoute(normalizeRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const go = useCallback((nextRoute) => { const next = navigateTo(nextRoute); startTransition(() => setRoute(next)); }, []);
  return { route, go };
}
