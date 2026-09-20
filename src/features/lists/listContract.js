export const LIST_VISIBILITY = Object.freeze({ PUBLIC:"public", PRIVATE:"private" });
export function createList({ id=null,name="",description="",visibility=LIST_VISIBILITY.PUBLIC,members=[] }={}) {
  return Object.freeze({ id,name:String(name).trim(),description:String(description||"").trim(),visibility,members:Array.isArray(members)?members:[] });
}
export function createListPage(items=[],nextCursor=null){ return Object.freeze({items:Array.isArray(items)?items:[],nextCursor,hasMore:Boolean(nextCursor)}); }
