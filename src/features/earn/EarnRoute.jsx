import React from "react";
import { ArrowUpRight, Wallet, Zap } from "lucide-react";

const EARN_FEATURES = ["Creator earnings", "Rewards", "Wallet"];

export default function EarnRoute({ onOpen }) {
  return (
    <div className="page">
      <div className="earn">
        <small>EARN</small>
        <h2>Your creative work can have a future here.</h2>
        <p>
          S is reserving a dedicated home for creator earnings, rewards and
          other opportunities. The UI is ready to connect to real
          monetization infrastructure later.
        </p>
        <div className="earn-actions">
          <button className="primary" onClick={() => onOpen?.("/settings")}>
            Manage creator settings <ArrowUpRight size={15} />
          </button>
          <button className="outline" type="button" disabled aria-disabled="true">
            <Wallet size={15} /> Wallet unavailable
          </button>
        </div>
        <Zap size={35} aria-hidden="true" />
      </div>
      <div className="earn-grid">
        {EARN_FEATURES.map((feature) => (
          <div key={feature}>
            <small>{feature}</small>
            <b>{feature === "Wallet" ? "Not active" : "Coming soon"}</b>
            <span>Backend connection reserved</span>
          </div>
        ))}
      </div>
    </div>
  );
}
