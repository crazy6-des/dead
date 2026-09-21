import React from "react";
import { Music2, X } from "lucide-react";

export default function PostMediaPreview({ media, audio, background, onRemoveImage }) {
  return (
    <>
      {media.length > 0 && (
        <div className="s-create-composer__assets" aria-label="Selected images">
          {media.map((asset, index) => (
            <div className="s-create-composer__asset" key={asset.url || asset.name + index}>
              <img src={asset.url} alt={asset.name} />
              <button type="button" onClick={() => onRemoveImage(index)} aria-label={`Remove ${asset.name}`}>
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
      {audio && (
        <div className="s-create-composer__audio">
          <Music2 size={16} aria-hidden="true" />
          <span>{audio.name}</span>
          <audio controls src={audio.url} />
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
