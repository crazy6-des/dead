import { FEED_TABS } from '../domain/models';

// Development fixtures only. They are intentionally unavailable in production
// so a missing backend cannot silently become fabricated application state.
const DEV_MODE = import.meta.env?.DEV === true;

const FIXTURE_USERS = [
  { id: 's-team', displayName: 'S Team', username: 's', verified: true },
  { id: 'maya', displayName: 'Maya Okafor', username: 'maya' },
  { id: 'daniel', displayName: 'Daniel Cole', username: 'daniel' },
  { id: 'nia', displayName: 'Nia James', username: 'nia' },
];

const FIXTURE_TRENDS = [
  { category: 'Music', title: 'Late Night Notes', countLabel: '8.1K posts' },
  { category: 'Community', title: 'Creators of S', countLabel: '1.7K posts' },
  { category: 'Culture', title: '#NewBeginnings', countLabel: '2.4K posts' },
];

export const devUsers = Object.freeze(DEV_MODE ? FIXTURE_USERS : []);
export const devTrends = Object.freeze(DEV_MODE ? FIXTURE_TRENDS : []);
export const devPeople = Object.freeze(devUsers.slice(1));
export const DEV_FEED_TABS = FEED_TABS;
