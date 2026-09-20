/**
 * Shared UI measurements for S.
 * Keep product surfaces aligned to these values instead of inventing local spacing.
 */
export const layoutStandards = Object.freeze({
  contentColumn: 600,
  desktopLeftRail: 240,
  desktopRightRail: 320,
  desktopColumnGap: 24,
  mobileHorizontalPadding: 16,
  desktopHorizontalPadding: 20,
  postVerticalPadding: 16,
  avatar: { regular: 42, small: 34, profile: 78 },
  radius: { control: 10, card: 15, modal: 20 },
  type: { body: 15, metadata: 13, label: 11, heading: 20 },
  touchTarget: 44,
});

export const feedTabs = Object.freeze(["For You", "Following", "Latest"]);
export const discoverTabs = Object.freeze(["For you", "People", "Posts", "Topics", "Music"]);
