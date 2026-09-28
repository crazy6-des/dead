import React from "react";
import { ArrowUpRight, Wallet, Zap } from "lucide-react";

const EARN_FEATURES = ["Creator earnings", "Rewards", "Wallet"];

export default function EarnRoute({ onOpen }) {
  return (
    <div className="page">
      <div className="earn">
        <small>EARN</small>
        <h2>No earnings yet</h2>
        <p>Creator earnings will appear here when your account has eligible earnings.</p>
        <div className="earn-actions">
          <button className="primary" onClick={() => onOpen?.("/settings")}>
            Creator settings <ArrowUpRight size={15} />
          </button>
          <button className="outline" type="button" onClick={() => onOpen?.("/settings")}>
            <Wallet size={15} /> Wallet
          </button>
        </div>
        <Zap size={35} aria-hidden="true" />
      </div>
      <div className="earn-grid">
        {EARN_FEATURES.map((feature) => (
          <div key={feature}>
            <small>{feature}</small>
            <b>{feature === "Wallet" ? "No balance" : "No earnings yet"}</b>
            <span>Nothing to show yet</span>
          </div>
        ))}
      </div>
    </div>
  );
}
