import { FEED_TABS } from '../domain/models';

// Development fixtures only. Production components must consume services,
// not import these records directly.
export const devUsers = Object.freeze([
  { id: 's-team', displayName: 'S Team', username: 's', verified: true },
  { id: 'maya', displayName: 'Maya Okafor', username: 'maya' },
  { id: 'daniel', displayName: 'Daniel Cole', username: 'daniel' },
  { id: 'nia', displayName: 'Nia James', username: 'nia' },
]);

export const devTrends = Object.freeze([
  { category: 'Music', title: 'Late Night Notes', countLabel: '8.1K posts' },
  { category: 'Community', title: 'Creators of S', countLabel: '1.7K posts' },
  { category: 'Culture', title: '#NewBeginnings', countLabel: '2.4K posts' },
]);

export const devPeople = Object.freeze(devUsers.slice(1));
export const DEV_FEED_TABS = FEED_TABS;
