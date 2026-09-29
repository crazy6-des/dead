import React, { useState } from "react";
import { ArrowRight, LockKeyhole, Mail, ShieldCheck, Sparkles, WalletCards, X } from "lucide-react";
import { authService } from "../../services/authService.js";

const BENEFITS = [
  { icon: ShieldCheck, title: "A safer social space", text: "Share, discover and connect with clearer community boundaries. Block, mute, report and privacy controls are built into the experience." },
  { icon: Sparkles, title: "Make the feed yours", text: "Post words, images, backgrounds or music. Follow people and topics that actually interest you." },
  { icon: WalletCards, title: "Earn by choice", text: "S can make room for CPA opportunities. You decide whether to participate; no forced offers, no pretending that earnings are guaranteed." },
];

function Field({ label, id, hint, ...props }) {
  const hintId = hint ? id + "-hint" : undefined;
  return <label className="auth-field" htmlFor={id}><span>{label}</span><input id={id} aria-describedby={hintId} {...props}/>{hint && <small id={hintId}>{hint}</small>}</label>;
}

function AuthPanel({ initialMode = "signin", onClose, onAuthenticated }) {
  const [mode, setMode] = useState(() => initialMode === "reset" && new URLSearchParams(window.location.search).get("token") ? "reset-confirm" : initialMode);
  const [form, setForm] = useState({ username: "", displayName: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const result = mode === "signin"
        ? await authService.signIn({ identifier: form.email || form.username, password: form.password })
        : await authService.signUp({ username: form.username, displayName: form.displayName, email: form.email, password: form.password });
      if (result?.authenticated) onAuthenticated?.();
    } catch (cause) {
      setError(cause?.message || "We could not complete that request.");
    } finally { setBusy(false); }
  };

  const confirmReset = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try { const token = new URLSearchParams(window.location.search).get("token"); const result = await authService.resetPassword({ token, password: form.password }); setMessage(result?.message || "Password updated. You can now sign in."); setForm({ ...form, password: "" }); setMode("signin"); } catch (cause) { setError(cause?.message || "We could not update your password."); } finally { setBusy(false); }
  };

  const reset = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const result = await authService.requestPasswordReset({ email: form.email });
      setMessage(result?.message || "If an account exists for that email, a reset link has been sent.");
    } catch (cause) { setError(cause?.message || "We could not send the reset email."); }
    finally { setBusy(false); }
  };

  return <div className="landing-auth-layer"><button type="button" className="landing-auth-backdrop" onClick={onClose} aria-label="Close authentication dialog"/><section className="landing-auth" role="dialog" aria-modal="true" aria-labelledby="landing-auth-title">
    <button type="button" className="landing-auth-close" onClick={onClose} aria-label="Close authentication dialog"><X/></button>
    <div className="landing-auth-brand"><span>S</span><div><b id="landing-auth-title">{mode === "signup" ? "Join S" : mode.startsWith("reset") ? "Reset access" : "Welcome back"}</b><small>{mode === "signup" ? "Build your corner of the community." : mode.startsWith("reset") ? "A secure link will arrive by email." : "Your people, your interests, your space."}</small></div></div>
    {mode === "reset-confirm" ? <form onSubmit={confirmReset}><Field id="new-password" label="New password" type="password" autoComplete="new-password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength={10}/><p className="auth-helper">Use 10–128 characters. This secure link expires after 30 minutes.</p><button className="landing-primary" disabled={busy}>{busy ? "Updating…" : "Set new password"} <LockKeyhole size={16}/></button></form> : mode === "reset" ? <form onSubmit={reset}><Field id="reset-email" label="Email" type="email" autoComplete="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/><p className="auth-helper">We never reveal whether an email has an account.</p><button className="landing-primary" disabled={busy}>{busy ? "Sending…" : "Send reset link"} <Mail size={16}/></button></form> : <form onSubmit={submit}>
      {mode === "signup" && <><Field id="display-name" label="Display name" value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})} required/><Field id="username" label="Username" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} required minLength={3}/></>}
      <Field id={mode === "signin" ? "identifier" : "signup-email"} label={mode === "signin" ? "Email or username" : "Email"} type={mode === "signin" ? "text" : "email"} autoComplete={mode === "signin" ? "username" : "email"} value={mode === "signin" ? (form.email || form.username) : form.email} onChange={e=>setForm({...form,email:e.target.value,username:mode === "signin" ? e.target.value : form.username})} required/>
      <Field id="password" label="Password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength={10}/>
      {mode === "signin" && <button type="button" className="auth-link" onClick={()=>setMode("reset")}>Forgot password?</button>}
      <button className="landing-primary" disabled={busy}>{busy ? "Working…" : mode === "signup" ? "Create my S account" : "Sign in"} <ArrowRight size={16}/></button>
    </form>}
    {error && <div className="auth-error" role="alert">{error}</div>}
    {message && <div className="auth-success">{message}</div>}
    <div className="auth-switch">{mode.startsWith("reset") ? <button type="button" onClick={()=>setMode("signin")}>Back to sign in</button> : <button type="button" onClick={()=>setMode(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}</button>}</div>
  </section></div>;
}

export default function LandingRoute({ initialAuthMode = null, onAuthenticated }) {
  const [authMode, setAuthMode] = useState(initialAuthMode);
  const [darkMode, setDarkMode] = useState(false);
  return <div className={"landing " + (darkMode ? "landing--dark" : "landing--light")}>
    <header className="mobile-head">
      <button type="button" aria-label="Open navigation menu"><span aria-hidden="true">☰</span></button>
      <div className="brand"><div className="s-logo" aria-label="S"><span>S</span></div></div>
      <button type="button" aria-label="Theme" onClick={() => setDarkMode((value) => !value)}><Sparkles size={20}/></button>
    </header>
    <main className="landing-public-home">
      <div className="feed-tabs" role="tablist" aria-label="Timeline">
        <button type="button" className="selected" role="tab" aria-selected="true">For you</button>
        <button type="button" role="tab" aria-selected="false">Following</button>
        <button type="button" role="tab" aria-selected="false">Latest</button>
      </div>
      <button type="button" className="quick landing-login-prompt" onClick={() => setAuthMode("signin")}>
        <span className="avatar">S</span>
        <span><b>Log in to post</b></span>
      </button>
    </main>
    {authMode && <AuthPanel initialMode={authMode} onClose={() => setAuthMode(null)} onAuthenticated={() => { setAuthMode(null); onAuthenticated?.(); }} />}
  </div>;
}
