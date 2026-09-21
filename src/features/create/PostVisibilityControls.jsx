import React from "react";

export default function PostVisibilityControls({ audience, replyPolicy, onAudienceChange, onReplyPolicyChange }) {
  return (
    <div className="s-create-composer__controls">
      <label>
        Audience
        <select value={audience} onChange={(event) => onAudienceChange(event.target.value)}>
          <option value="public">Everyone</option>
          <option value="followers">Followers</option>
          <option value="private">Only me</option>
        </select>
      </label>
      <label>
        Replies
        <select value={replyPolicy} onChange={(event) => onReplyPolicyChange(event.target.value)}>
          <option value="everyone">Everyone</option>
          <option value="following">People you follow</option>
          <option value="mentioned">Mentioned people</option>
        </select>
      </label>
    </div>
  );
}
