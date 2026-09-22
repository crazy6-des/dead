import React, { useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown, Download, LockKeyhole, Mail, ShieldCheck, Sparkles, Users, WalletCards, X } from "lucide-react";
import { authService } from "../../services/authService.js";

const BENEFITS = [
  { icon: ShieldCheck, title: "A safer social space", text: "Share, discover and connect with clearer community boundaries. Block, mute, report and privacy controls are built into the experience." },
  { icon: Sparkles, title: "Make the feed yours", text: "Post words, images, backgrounds or music. Follow people and topics that actually interest you." },
  { icon: WalletCards, title: "Earn by choice", text: "S can make room for CPA opportunities. You decide whether to participate; no forced offers, no pretending that earnings are guaranteed." },
];

function Field({ label, ...props }) {
  return <label className="auth-field"><span>{label}</span><input {...props}/></label>;
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

  const confirmReset = async (event) => {\n    event.preventDefault(); setBusy(true); setError(""); setMessage("");\n    try { const token = new URLSearchParams(window.location.search).get("token"); const result = await authService.resetPassword({ token, password: form.password }); setMessage(result?.message || "Password updated. You can now sign in."); setForm({ ...form, password: "" }); setMode("signin"); } catch (cause) { setError(cause?.message || "We could not update your password."); } finally { setBusy(false); }\n  };\n\n  const reset = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const result = await authService.requestPasswordReset({ email: form.email });
      setMessage(result?.message || "If an account exists for that email, a reset link has been sent.");
    } catch (cause) { setError(cause?.message || "We could not send the reset email."); }
    finally { setBusy(false); }
  };

  return <div className="landing-auth-layer"><button className="landing-auth-backdrop" onClick={onClose} aria-label="Close"/><section className="landing-auth" role="dialog" aria-modal="true">
    <button className="landing-auth-close" onClick={onClose} aria-label="Close"><X/></button>
    <div className="landing-auth-brand"><span>S</span><div><b>{mode === "signup" ? "Join S" : mode.startsWith("reset") ? "Reset access" : "Welcome back"}</b><small>{mode === "signup" ? "Build your corner of the community." : mode.startsWith("reset") ? "A secure link will arrive by email." : "Your people, your interests, your space."}</small></div></div>
    {mode === "reset-confirm" ? <form onSubmit={confirmReset}><Field label="New password" type="password" autoComplete="new-password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength={10}/><p className="auth-helper">Use 10–128 characters. This secure link expires after 30 minutes.</p><button className="landing-primary" disabled={busy}>{busy ? "Updating…" : "Set new password"} <LockKeyhole size={16}/></button></form> : mode === "reset" ? <form onSubmit={reset}><Field label="Email" type="email" autoComplete="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/><p className="auth-helper">We never reveal whether an email has an account.</p><button className="landing-primary" disabled={busy}>{busy ? "Sending…" : "Send reset link"} <Mail size={16}/></button></form> : <form onSubmit={submit}>
      {mode === "signup" && <><Field label="Display name" value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})} required/><Field label="Username" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} required minLength={3}/></>}
      <Field label={mode === "signin" ? "Email or username" : "Email"} type={mode === "signin" ? "text" : "email"} autoComplete={mode === "signin" ? "username" : "email"} value={mode === "signin" ? (form.email || form.username) : form.email} onChange={e=>setForm({...form,email:e.target.value,username:mode === "signin" ? e.target.value : form.username})} required/>
      <Field label="Password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength={10}/>
      {mode === "signin" && <button type="button" className="auth-link" onClick={()=>setMode("reset")}>Forgot password?</button>}
      <button className="landing-primary" disabled={busy}>{busy ? "Working…" : mode === "signup" ? "Create my S account" : "Sign in"} <ArrowRight size={16}/></button>
    </form>}
    {error && <div className="auth-error" role="alert">{error}</div>}
    {message && <div className="auth-success">{message}</div>}
    <div className="auth-switch">{mode.startsWith("reset") ? <button onClick={()=>setMode("signin")}>Back to sign in</button> : <button onClick={()=>setMode(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}</button>}</div>
  </section></div>;
}

export default function LandingRoute({ onAuthenticated }) {
  const [authMode, setAuthMode] = useState(null);
  const steps = useMemo(() => ["Open your browser menu", "Tap Add to Home screen / Add to Home page", "Open S from your home screen"], []);
  return <div className="landing">
    <header className="landing-nav"><button className="landing-logo" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}><span>S</span><b>S</b></button><nav><a href="#why">Why S</a><a href="#community">Community</a><a href="#home-screen">Home screen</a></nav><div className="landing-nav-actions"><button className="landing-ghost" onClick={()=>setAuthMode("signin")}>Sign in</button><button className="landing-primary landing-primary--small" onClick={()=>setAuthMode("signup")}>Join S <ArrowRight size={15}/></button></div></header>
    <main>
      <section className="landing-hero">
        <div className="landing-orbit landing-orbit--one"/><div className="landing-orbit landing-orbit--two"/>
        <div className="landing-hero-copy"><p className="eyebrow"><Sparkles size={14}/> SOCIAL, WITHOUT THE NOISE</p><h1>Be seen.<br/><em>Stay connected.</em></h1><p className="landing-lead">S is a place for people who want real conversation, good content and a community that feels human. Post what matters. Find your people. Move at your own pace.</p><div className="landing-hero-actions"><button className="landing-primary landing-primary--hero" onClick={()=>setAuthMode("signup")}>Create your S <ArrowRight/></button><button className="landing-text-btn" onClick={()=>setAuthMode("signin")}>I already have an account</button></div><div className="landing-proof"><span><Check/> Your content, your choice</span><span><Check/> Privacy controls</span><span><Check/> Optional earning opportunities</span></div></div>
        <div className="landing-hero-card"><div className="hero-card-top"><span className="pulse-dot"/> LIVE IN YOUR SPACE <span>•••</span></div><div className="hero-post"><div className="hero-avatar">S</div><div><b>Someone worth following</b><small>@yourcommunity · now</small><p>There is room on the internet for a social space that feels a little more intentional.</p><div className="hero-post-media"><span>✦</span><small>your feed, your rhythm</small></div><div className="hero-actions">♡ <span>Connect</span><span>Reply</span><span>Share</span></div></div></div></div>
      </section>
      <section className="landing-marquee"><span>SAFE COMMUNITY</span><i>✦</i><span>CREATIVE POSTS</span><i>✦</i><span>DISCOVER YOUR PEOPLE</span><i>✦</i><span>OPTIONAL CPA EARNINGS</span></section>
      <section id="why" className="landing-section"><div className="section-kicker">WHY S</div><h2>A social home with room to breathe.</h2><p className="section-intro">Designed to feel alive without feeling chaotic. S gives you the familiar social tools, then gets out of your way.</p><div className="benefit-grid">{BENEFITS.map(({icon:Icon,title,text})=><article key={title}><div className="benefit-icon"><Icon/></div><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      <section id="community" className="landing-community"><div><div className="section-kicker">THE IDEA</div><h2>Good communities are built by people who care.</h2><p>Follow thoughtfully. Speak respectfully. Use the controls when something crosses a line. S is built around the idea that being social should not mean giving up your sense of safety.</p><div className="community-points"><span><ShieldCheck/> Block, mute and report when needed.</span><span><Users/> Connect around interests, not noise.</span><span><LockKeyhole/> Keep useful privacy choices close.</span></div></div><div className="community-art"><div className="community-ring ring-one"/><div className="community-ring ring-two"/><div className="community-core">S<small>YOU BELONG HERE</small></div></div></section>
      <section className="landing-earn"><div className="earn-panel"><div><div className="section-kicker">EARN, YOUR WAY</div><h2>Opportunities, never pressure.</h2><p>Some people want to earn from online activities. S can surface CPA opportunities clearly so you can choose whether a particular offer is worth your time. Participation is voluntary. Read the terms. Complete only what you genuinely want to do.</p><button className="landing-outline" onClick={()=>setAuthMode("signup")}>Join and explore later <ArrowRight size={15}/></button></div><div className="earn-stamp"><WalletCards/><b>OPTIONAL</b><span>Choose what you participate in.</span></div></div></section>
      <section id="home-screen" className="landing-install"><div className="install-copy"><div className="section-kicker">MAKE S FEEL LIKE AN APP</div><h2>One tap away, without an app-store detour.</h2><p>S is a web app. On your phone, open S in your browser, tap the <strong>three dots ⋮ in the upper-right corner</strong>, then choose <strong>Add to Home screen</strong> (wording can vary by browser). Confirm it, and S gets a home-screen icon you can open like an app.</p><div className="install-steps">{steps.map((step,index)=><div key={step}><b>0{index+1}</b><span>{step}</span>{index<2&&<ChevronDown/>}</div>)}</div></div><div className="phone-mock"><div className="phone-notch"/><div className="phone-screen"><div className="phone-top"><b>S</b><span>⋮</span></div><div className="phone-glow"/><div className="phone-icon">S</div><b>Add S to your home screen</b><small>Open S faster, whenever you want.</small><button onClick={()=>setAuthMode("signup")}>Get started</button></div></div></section>
      <section className="landing-final"><p className="eyebrow"><Sparkles size={14}/> YOUR SPACE IS WAITING</p><h2>Ready to be truly seen?</h2><p>Start with a free account. Explore at your pace.</p><button className="landing-primary landing-primary--hero" onClick={()=>setAuthMode("signup")}>Enter S <ArrowRight/></button></section>
    </main>
    <footer className="landing-footer"><b>S</b><span>Where you are truly seen. Where you connect.</span><button onClick={()=>setAuthMode("signin")}>Sign in</button><button onClick={()=>setAuthMode("signup")}>Sign up</button></footer>
    {authMode && <AuthPanel initialMode={authMode} onClose={()=>setAuthMode(null)} onAuthenticated={()=>{setAuthMode(null); onAuthenticated?.();}}/>}
  </div>;
}
