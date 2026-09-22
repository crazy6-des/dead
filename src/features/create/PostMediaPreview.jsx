import React from "react";
import { Music2, X } from "lucide-react";

export default function PostMediaPreview({ media = [], audio = null, background = null, onRemoveImage, onRemoveAudio }) {
  return (
    <>
      {media.length > 0 && (
        <div className="s-create-composer__assets" aria-label="Selected images">
          {media.map((asset, index) => (
            <div className="s-create-composer__asset" key={asset.url || asset.name + index}>
              <img src={asset.url} alt={asset.name || "Selected image"} />
              <button type="button" onClick={() => onRemoveImage(index)} aria-label={`Remove ${asset.name || "image"}`}>
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
      {audio && (
        <div className="s-create-composer__audio">
          <Music2 size={16} aria-hidden="true" />
          <span>{audio.name || "Selected audio"}</span>
          <audio controls src={audio.url} />
          {onRemoveAudio && <button type="button" onClick={onRemoveAudio} aria-label="Remove music"><X size={14} aria-hidden="true" /></button>}
        </div>
      )}
      {background && (
        <div className="s-create-composer__background-preview" style={{ background: background.value }} aria-label="Selected post background">
          Background preview
        </div>
      )}
    </>
  );
}