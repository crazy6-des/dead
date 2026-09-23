import React, { useState } from "react";
import { LogOut } from "lucide-react";
import { useAuthState } from "./authState.js";

const fieldStyle = { width: "100%", padding: "11px 12px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface2)", color: "var(--text)" };

export default function AuthPanel({ auth: providedAuth, onSignedOut }) {
  const fallbackAuth = useAuthState();
  const auth = providedAuth || fallbackAuth;
  const [mode, setMode] = useState("sign-in");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      if (mode === "sign-in") await auth.signIn({ identifier, password });
      else await auth.signUp({ email, username, displayName, password });
      setPassword("");
      setMessage("Authentication successful.");
    } catch (error) {
      setMessage(error?.message || "Authentication failed. Please try again.");
    }
  };

  const logout = async () => {
    setMessage("");
    try {
      await auth.signOut();
      onSignedOut?.();
    } catch (error) {
      setMessage(error?.message || "Could not log out. Please try again.");
    }
  };

  if (auth.isAuthenticated) {
    return <div className="setting-callout"><span><b>Signed in as @{auth.user?.username || "user"}</b><small>Your session is active on S.</small></span><button type="button" className="outline" onClick={() => void logout()} disabled={auth.isLoading}><LogOut size={16}/> {auth.isLoading ? "Logging out…" : "Log out"}</button>{message && <small role="status">{message}</small>}</div>;
  }

  return <form onSubmit={submit} className="account-auth-form">
    <div className="account-auth-tabs" role="tablist" aria-label="Account access">
      <button type="button" className={mode === "sign-in" ? "primary" : "outline"} onClick={() => setMode("sign-in")}>Sign in</button>
      <button type="button" className={mode === "sign-up" ? "primary" : "outline"} onClick={() => setMode("sign-up")}>Create account</button>
    </div>
    {mode === "sign-up" && <><input aria-label="Display name" placeholder="Display name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} style={fieldStyle} required /><input aria-label="Username" placeholder="Username" value={username} onChange={(event) => setUsername(event.target.value)} style={fieldStyle} required /><input aria-label="Email" type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} style={fieldStyle} required /></>}
    {mode === "sign-in" && <input aria-label="Username or email" placeholder="Username or email" value={identifier} onChange={(event) => setIdentifier(event.target.value)} style={fieldStyle} required />}
    <input aria-label="Password" type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} style={fieldStyle} minLength={8} required />
    <button type="submit" className="primary" disabled={auth.isLoading}>{auth.isLoading ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}</button>
    {message && <small role="status" style={{ color: "var(--muted)" }}>{message}</small>}
  </form>;
}
