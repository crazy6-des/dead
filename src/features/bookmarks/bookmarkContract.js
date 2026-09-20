export function createBookmarkFolder({ id=null,name="",description="" }={}) {
  return Object.freeze({ id,name:String(name).trim(),description:String(description||"").trim() });
}
export function createBookmarkRequest({ postId, folderId=null }={}) {
  return Object.freeze({ postId:String(postId),folderId:folderId?String(folderId):null });
}
