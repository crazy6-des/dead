/**
 * S domain contracts.
 * These lightweight JSDoc models keep the current JSX implementation stable
 * while giving the future API and TypeScript migration a single vocabulary.
 */

/** @typedef {{ id: string|number, displayName: string, username: string, avatarUrl?: string, bio?: string, website?: string, verified?: boolean }} User */
/** @typedef {{ id: string|number, author: User, text: string, createdAt: string, media?: PostMedia[], audio?: AudioTrack, background?: string, topic?: string, stats: { replies: number, reposts: number, likes: number, bookmarks: number }, viewer: { liked: boolean, reposted: boolean, bookmarked: boolean, following: boolean } }} Post */
/** @typedef {{ id: string|number, kind: 'image'|'audio'|'video', url: string, alt?: string, width?: number, height?: number, durationMs?: number }} PostMedia */
/** @typedef {{ id: string|number, title: string, artist?: string, url?: string, durationMs?: number, coverUrl?: string }} AudioTrack */
/** @typedef {{ id: string|number, type: 'like'|'reply'|'follow'|'repost'|'mention'|'quote'|'system', actor?: User, postId?: string|number, read: boolean, createdAt: string }} NotificationItem */
/** @typedef {{ id: string|number, members: User[], lastMessage?: Message, unreadCount: number }} Conversation */
/** @typedef {{ id: string|number, conversationId: string|number, senderId: string|number, body: string, createdAt: string, status: 'sending'|'sent'|'failed' }} Message */
/** @typedef {{ id?: string|number, text: string, media: PostMedia[], audio?: AudioTrack, background?: string, audience: 'everyone'|'followers'|'only_me', replyPolicy: 'everyone'|'followers'|'mentioned', status: 'draft'|'ready'|'publishing' }} CreateDraft */

export const FEED_TABS = Object.freeze(['For You', 'Following', 'Latest']);
export const DISCOVER_TABS = Object.freeze(['For you', 'People', 'Posts', 'Topics', 'Music']);
export const AUDIENCES = Object.freeze(['everyone', 'followers', 'only_me']);
export const REPLY_POLICIES = Object.freeze(['everyone', 'followers', 'mentioned']);
