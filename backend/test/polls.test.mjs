import assert from "node:assert/strict";
import { validatePoll, votePoll } from "../src/polls.js";

const state = { pollJson: JSON.stringify({ question:"Which one?", options:["Alpha","Beta"], multipleChoice:false, totalVotes:0, optionVotes:[0,0], votedOptionIndex:null }), votes:[], updates:0 };
const db = { prepare(query) { return { bind(...values) { return {
  async first() {
    if (query.includes("FROM sessions")) return { user_id:"user-1" };
    if (query.startsWith("SELECT id, author_id, deleted_at, poll_json FROM posts")) return { id:"poll-1", author_id:"author-1", deleted_at:null, poll_json:state.pollJson };
    if (query.startsWith("SELECT option_index FROM poll_votes")) { const v=state.votes.find(x=>x.user_id===values[1]); return v ? { option_index:v.option_index } : null; }
    return null;
  },
  async all() {
    if (query.includes("SELECT option_index, COUNT(*) AS count FROM poll_votes")) {
      const grouped=new Map(); for (const v of state.votes) grouped.set(v.option_index,(grouped.get(v.option_index)||0)+1);
      return { results:[...grouped.entries()].map(([option_index,count])=>({option_index,count})) };
    }
    return { results:[] };
  },
  async run() {
    if (query.startsWith("INSERT OR IGNORE INTO poll_votes")) {
      if (state.votes.some(v=>v.user_id===values[1])) return {meta:{changes:0}};
      state.votes.push({user_id:values[1],option_index:Number(values[2])}); return {meta:{changes:1}};
    }
    if (query.startsWith("UPDATE posts SET poll_json")) { state.pollJson=values[0]; state.updates+=1; }
    return {meta:{changes:1}};
  }
}; } } };
const created=validatePoll({question:"Which one?",options:["Alpha","Beta"]});
assert.equal(created.error,null);
assert.deepEqual(created.poll.options,["Alpha","Beta"]);
assert.deepEqual(created.poll.optionVotes,[0,0]);

const request=(optionIndex)=>new Request("https://example.test/api/polls/poll-1/votes",{method:"POST",headers:{Cookie:"s_session=test-session","content-type":"application/json"},body:JSON.stringify({optionIndex})});
const first=await votePoll(request(0),{DB:db},"poll-1");
assert.deepEqual(first.response.poll.options,["Alpha","Beta"]);
assert.deepEqual(first.response.poll.optionVotes,[1,0]);
assert.equal(first.response.poll.totalVotes,1);
assert.deepEqual(JSON.parse(state.pollJson).options,["Alpha","Beta"]);

const second=await votePoll(request(0),{DB:db},"poll-1");
assert.equal(second.response.alreadyVoted,true);
assert.deepEqual(second.response.poll.optionVotes,[1,0]);

state.pollJson=JSON.stringify({question:"Legacy?",options:[{text:"Yes",votes:9},{text:"No",votes:1}],multipleChoice:false,totalVotes:10});
state.votes=[{user_id:"user-2",option_index:0}];
const legacy=await votePoll(request(1),{DB:db},"poll-1");
assert.deepEqual(legacy.response.poll.options,["Yes","No"]);
assert.deepEqual(legacy.response.poll.optionVotes,[1,1]);
assert.equal(legacy.response.poll.totalVotes,2);
assert.deepEqual(JSON.parse(state.pollJson).options,["Yes","No"]);
console.log("Poll persistence and vote counts: PASS");
