import { POST_KINDS, POST_AUDIENCES, REPLY_POLICIES, createPublishPayload } from "./postContract.js";
import { isCatalogMusicAsset } from "./mediaContract.js";

const MAX_TEXT_LENGTH = 5000;
const MAX_IMAGES = 4;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const AUDIO_TYPES = new Set(["audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/webm"]);

function validateAsset(asset, { kind, index, maxSize, allowedTypes }) {
  const errors = [];
  if (!asset || typeof asset !== "object") return ["Media item is invalid."];

  if (!asset.name || typeof asset.name !== "string") errors.push("Media item is missing a file name.");
  if (!asset.type || typeof asset.type !== "string" || !allowedTypes.has(asset.type)) {
    errors.push(kind === "image" ? "Unsupported image type." : "Unsupported audio type.");
  }
  if (!Number.isFinite(asset.size) || asset.size <= 0) errors.push("Media item has an invalid file size.");
  if (Number.isFinite(asset.size) && asset.size > maxSize) {
    errors.push(kind === "image"
      ? `Image ${index + 1} exceeds the 10 MB limit.`
      : "Audio exceeds the 25 MB limit.");
  }

  return errors;
}

function validateAudioAsset(asset) {
  if (isCatalogMusicAsset(asset)) {
    const errors = [];
    if (!asset.name || typeof asset.name !== "string") errors.push("Catalog track is missing a title.");
    if (!asset.type || !AUDIO_TYPES.has(asset.type)) errors.push("Unsupported audio type.");
    return errors;
  }

  return validateAsset(asset, {
    kind: "audio",
    index: 0,
    maxSize: MAX_AUDIO_SIZE,
    allowedTypes: AUDIO_TYPES,
  });
}

export function validatePostDraft(draft) {
  const payload = createPublishPayload(draft);
  const errors = {};

  if (!payload.text && payload.media.length === 0 && !payload.audio && !payload.background && !payload.poll) {
    errors.content = "Add text or media before publishing.";
  }

  if (payload.text.length > MAX_TEXT_LENGTH) {
    errors.text = `Text must be ${MAX_TEXT_LENGTH} characters or fewer.`;
  }

  if (!Array.isArray(payload.media)) {
    errors.media = "Images must be provided as a list.";
  } else if (payload.media.length > MAX_IMAGES) {
    errors.media = `You can add up to ${MAX_IMAGES} images.`;
  } else {
    const mediaErrors = payload.media.flatMap((asset, index) =>
      validateAsset(asset, { kind: "image", index, maxSize: MAX_IMAGE_SIZE, allowedTypes: IMAGE_TYPES })
    );
    if (mediaErrors.length) errors.media = mediaErrors[0];
  }

  if (payload.audio) {
    const audioErrors = validateAudioAsset(payload.audio);
    if (audioErrors.length) errors.audio = audioErrors[0];
  }

  if (payload.poll !== null) {
    if (!payload.poll || typeof payload.poll.question !== "string" || payload.poll.question.trim().length < 3) errors.poll = "Poll question must be at least 3 characters.";
    const options = Array.isArray(payload.poll?.options) ? payload.poll.options.map((option) => String(option || "").trim()).filter(Boolean) : [];
    if (options.length < 2 || options.length > 4) errors.poll = "A poll needs 2 to 4 options.";
  }

  if (payload.background !== null) {
    if (typeof payload.background !== "object"
      || payload.background.type !== "color"
      || typeof payload.background.value !== "string"
      || !/^#[0-9a-fA-F]{6}$/.test(payload.background.value)) {
      errors.background = "Background must be a valid color.";
    }
  }

  if (!Object.values(POST_KINDS).includes(payload.kind)) errors.kind = "Unsupported post type.";
  if (!Object.values(POST_AUDIENCES).includes(payload.audience)) errors.audience = "Unsupported audience.";
  if (!Object.values(REPLY_POLICIES).includes(payload.replyPolicy)) errors.replyPolicy = "Unsupported reply policy.";

  return { valid: Object.keys(errors).length === 0, errors, payload };
}

export const POST_MEDIA_LIMITS = Object.freeze({
  MAX_IMAGES,
  MAX_IMAGE_SIZE,
  MAX_AUDIO_SIZE,
  IMAGE_TYPES: Object.freeze([...IMAGE_TYPES]),
  AUDIO_TYPES: Object.freeze([...AUDIO_TYPES]),
});
