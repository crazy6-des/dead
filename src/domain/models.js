/**
 * S domain contracts.
 * These lightweight JSDoc models keep the current JSX implementation stable
 * while giving the future API and TypeScript migration a single vocabulary.
 *
 * Post-creation vocabulary is canonical in features/create/postContract.js.
 * This module re-exports those values so older domain consumers stay compatible.
 */

import {
  POST_AUDIENCES,
  REPLY_POLICIES,
} from "../features/create/postContract.js";

/** @typedef {{ id: string|number, displayName: string, username: string, avatarUrl?: string, bio?: string, website?: string, verified?: boolean }} User */
/** @typedef {{ id: string|number, author: User, text: string, createdAt: string, media?: PostMedia[], audio?: AudioTrack, background?: string, topic?: string, stats: { replies: number, reposts: number, likes: number, bookmarks: number }, viewer: { liked: boolean, reposted: boolean, bookmarked: boolean, following: boolean } }} Post */
/** @typedef {{ id: string|number, kind: 'image'|'audio'|'video', url: string, alt?: string, width?: number, height?: number, durationMs?: number }} PostMedia */
/** @typedef {{ id: string|number, title: string, artist?: string, url?: string, durationMs?: number, coverUrl?: string }} AudioTrack */
/** @typedef {{ id: string|number, type: 'like'|'reply'|'follow'|'repost'|'mention'|'quote'|'system', actor?: User, postId?: string|number, read: boolean, createdAt: string }} NotificationItem */
/** @typedef {{ id: string|number, members: User[], lastMessage?: Message, unreadCount: number }} Conversation */
/** @typedef {{ id: string|number, conversationId: string|number, senderId: string|number, body: string, createdAt: string, status: 'sending'|'sent'|'failed' }} Message */
/** @typedef {{ id?: string|number, text: string, kind: 'text'|'image'|'music'|'background', media: PostMedia[], audio?: AudioTrack|null, background?: string|null, audience: 'public'|'followers'|'private', replyPolicy: 'everyone'|'following'|'mentioned', status: 'draft'|'ready'|'publishing' }} CreateDraft */

export const FEED_TABS = Object.freeze(["For You", "Following", "Latest"]);
export const DISCOVER_TABS = Object.freeze(["For you", "People", "Posts", "Topics", "Music"]);

// Compatibility aliases: these now resolve to the canonical create contract.
export const AUDIENCES = Object.freeze(Object.values(POST_AUDIENCES));
export { POST_AUDIENCES, REPLY_POLICIES };
