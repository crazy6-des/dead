import React from "react";
import { Image, Music2, Palette } from "lucide-react";

export default function MediaPicker({
  onImageChange,
  onMusicChange,
  pollEnabled,
  onTogglePoll,
  backgroundValue,
  onBackgroundChange,
}) {
  return (
    <div className="s-create-composer__media">
      <label className="s-create-composer__picker">
        <Image size={16} aria-hidden="true" />
        Add images
        <input type="file" accept="image/*" multiple onChange={onImageChange} />
      </label>
      <label className="s-create-composer__picker">
        <Music2 size={16} aria-hidden="true" />
        Add music
        <input type="file" accept="audio/*" onChange={onMusicChange} />
      </label>
      <button type="button" className={pollEnabled ? "is-selected" : ""} onClick={onTogglePoll}>
        Poll
      </button>
      <label className="s-create-composer__picker s-create-composer__color-picker">
        <Palette size={16} aria-hidden="true" />
        Background
        <input type="color" value={backgroundValue} onChange={onBackgroundChange} aria-label="Post background color" />
      </label>
    </div>
  );
}
