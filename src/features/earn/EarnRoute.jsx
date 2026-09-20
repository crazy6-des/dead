import React from "react";
import { ArrowUpRight, Wallet, Zap } from "lucide-react";
export default function EarnRoute({ onOpen }) {
  return <div className="page"><div className="earn"><small>EARN</small><h2>Your creative work can have a future here.</h2><p>S is reserving a dedicated home for creator earnings, rewards and other opportunities. The UI is ready to connect to real monetization infrastructure later.</p><div className="earn-actions"><button className="primary" onClick={() => onOpen?.("/settings")}>Manage creator settings <ArrowUpRight size={15}/></button><button className="outline"><Wallet size={15}/>Wallet</button></div><Zap size={35}/></div><div className="earn-grid">{["Creator earnings","Rewards","Wallet"].map((x) => <div key={x}><small>{x}</small><b>{x === "Wallet" ? "Not active" : "Coming soon"}</b><span>Backend connection reserved</span></div>)}</div></div>;
}
