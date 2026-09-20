export function createPoll({ id=null,question="",options=[],durationMinutes=null,multipleChoice=false }={}) {
  return Object.freeze({ id,question:String(question).trim(),options:Array.isArray(options)?options:[],durationMinutes,multipleChoice:Boolean(multipleChoice) });
}
