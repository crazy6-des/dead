// Demo data is intentionally limited to local development builds.
// Production must receive content from service-backed APIs instead of fixtures.
export const isDemoDataEnabled = import.meta.env?.DEV === true;

export function demoOnly(value, fallback = []) {
  return isDemoDataEnabled ? value : fallback;
}
