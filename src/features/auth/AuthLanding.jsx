import React, { useMemo, useState } from "react";
import { ArrowRight, Check, Compass, LockKeyhole, Mail, ShieldCheck, Sparkles, UserPlus, X, Zap } from "lucide-react";
import { authService } from "../../services/authService.js";
import { hasApiBaseUrl } from "../../services/apiClient.js";

function Field({ label, ...props }) {
  return <label className="s-auth-field"><span>{label}</span><input {...props} /></label>;
}

function Landing({ onAuth }) {
  const [panel, setPanel] = useState(null);
  const scrollToJoin = () => document.getElementById("s-join")?.scrollIntoView({ behavior: "smooth" });

  return <div className="s-landing">
    <nav className="s-landing-nav">
      <button className="s-brand-lockup" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><b>S</b><span>Where you are truly seen.</span></button>
      <div className="s-landing-nav-actions">
        <button className="s-landing-text-btn" onClick={() => setPanel("signin")}>Sign in</button>
        <button className="s-landing-join-btn" onClick={scrollToJoin}>Join S <ArrowRight size={16}/></button>
      </div>
    </nav>

    <main>
      <section className="s-hero">
        <div className="s-hero-glow s-hero-glow-a"/><div className="s-hero-glow s-hero-glow-b"/>
        <div className="s-hero-copy">
          <div className="s-eyebrow"><Sparkles size={14}/> A social space built around people</div>
          <h1>You don't have to be loud to be <em>seen.</em></h1>
          <p>S is a place to share what matters, discover people and ideas, build genuine connections, and take part in a community where safety comes before noise.</p>
          <div className="s-hero-actions">
            <button className="s-hero-primary" onClick={scrollToJoin}>Create your S <ArrowRight size={18}/></button>
            <button className="s-hero-secondary" onClick={() => document.getElementById("s-how")?.scrollIntoView({ behavior: "smooth" })}>See how S works</button>
          </div>
          <div className="s-trust-row"><span><ShieldCheck size={15}/> Community-first</span><span><LockKeyhole size={15}/> Your account, your choices</span><span><Zap size={15}/> Web app. Fast by design.</span></div>
        </div>
        <div className="s-hero-card">
          <div className="s-orbit s-orbit-one"/><div className="s-orbit s-orbit-two"/>
          <div className="s-hero-card-inner"><span className="s-mini-label">YOUR SPACE</span><div className="s-hero-avatar">S</div><strong>Where you are truly seen.</strong><span>Where you connect.</span><div className="s-signal"><i/><i/><i/><i/><i/></div><small>Real people. Real posts. No fake activity.</small></div>
        </div>
      </section>

      <section className="s-section s-intro" id="s-how">
        <div><span className="s-kicker">THE IDEA</span><h2>Social, without the social exhaustion.</h2></div>
        <p>Post a thought. Drop a photo. Share music. Find your niche. Reply, follow, message, save, and discover. S is designed to feel alive without making your screen feel chaotic.</p>
      </section>

      <section className="s-feature-grid">
        <article><div className="s-feature-icon"><Compass/></div><span>01</span><h3>Find your people</h3><p>Explore conversations across tech, comedy, finance, news, creativity and the interests you actually care about.</p></article>
        <article><div className="s-feature-icon"><ShieldCheck/></div><span>02</span><h3>Keep the community safe</h3><p>Respect people. Protect your space. Use the tools to mute, block and report when something crosses the line.</p></article>
        <article><div className="s-feature-icon"><Zap/></div><span>03</span><h3>Earn — on your terms</h3><p>When S introduces CPA opportunities, participation will be voluntary. You choose whether to take an offer; no one should be pressured into it.</p></article>
      </section>

      <section className="s-install">
        <div className="s-install-number">↗</div>
        <div><span className="s-kicker">MAKE S FEEL LIKE AN APP</span><h2>One tap away. No app-store detour.</h2><p>On Android Chrome, tap the <b>three dots ⋮</b> in the upper-right corner, choose <b>Add to Home screen</b>, confirm, and open S from your home screen. S is a web app, so updates arrive without a store download.</p></div>
      </section>

      <section className="s-join" id="s-join">
        <div className="s-join-copy"><span className="s-kicker">YOUR S STARTS HERE</span><h2>Come as you are. Build what you want to see.</h2><p>No performance required. Create an account, find your corner of S, and start with one genuine post.</p></div>
        <div className="s-join-card"><UserPlus size={22}/><strong>Ready when you are.</strong><p>Create your account in under a minute.</p><button onClick={() => setPanel("signup")}>Sign up for S <ArrowRight size={16}/></button><button className="s-card-link" onClick={() => setPanel("signin")}>Already have an account? Sign in</button></div>
      </section>

      <footer className="s-landing-footer"><b>S</b><span>Where you are truly seen. Where you connect.</span><button onClick={() => setPanel("signin")}>Sign in</button><button onClick={() => setPanel("signup")}>Sign up</button></footer>
    </main>
    {panel && <AuthPanel mode={panel} onClose={() => setPanel(null)} onAuthenticated={onAuth}/>}
  </div>;
}

function AuthPanel({ mode, onClose, onAuthenticated }) {
  const [current, setCurrent] = useState(mode);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(() => new URLSearchParams(window.location.search).get("token") || "");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const title = useMemo(() => ({ signin: "Welcome back.", signup: "Make your S.", forgot: "Reset access.", reset: "Choose a new password." }[current]), [current]);

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setStatus("");
    try {
      if (!hasApiBaseUrl()) throw new Error("S authentication is not connected to the Cloudflare backend yet.");
      if (current === "signin") {
        await authService.signIn({ identifier: email, password });
        onAuthenticated(); return;
      }
      if (current === "signup") {
        await authService.signUp({ username, email, password, displayName });
        onAuthenticated(); return;
      }
      if (current === "forgot") {
        const result = await authService.requestPasswordReset({ email });
        setStatus(result?.message || "If an account exists for that email, a reset link has been sent.");
        return;
      }
      const result = await authService.resetPassword({ token, password });
      setStatus(result?.message || "Password updated. You can now sign in.");
      setCurrent("signin"); setPassword("");
    } catch (error) { setStatus(error?.message || "Something went wrong. Please try again."); }
    finally { setBusy(false); }
  };

  return <div className="s-auth-overlay" role="dialog" aria-modal="true" aria-label={title}>
    <div className="s-auth-panel">
      <button className="s-auth-close" onClick={onClose} aria-label="Close"><X/></button>
      <div className="s-auth-mark">S</div><span className="s-kicker">S ACCOUNT</span><h2>{title}</h2>
      <p className="s-auth-sub">{current === "forgot" ? "Enter your email and we’ll send a secure reset link." : current === "reset" ? "Your reset link is single-use and expires after 30 minutes." : "Your account connects you to the real S community."}</p>
      <form onSubmit={submit}>
        {current === "signup" && <><Field label="Display name" value={displayName} onChange={e=>setDisplayName(e.target.value)} autoComplete="name" required/><Field label="Username" value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" required/></>}
        {current !== "reset" && <Field label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/>}
        {current === "reset" && <Field label="Reset token" value={token} onChange={e=>setToken(e.target.value)} required/>}
        {current !== "forgot" && <Field label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={current === "signin" ? "current-password" : "new-password"} minLength={10} required/>}
        {status && <div className="s-auth-status" role="status">{status}</div>}
        <button className="s-auth-submit" disabled={busy}>{busy ? "Working…" : current === "signin" ? "Sign in" : current === "signup" ? "Create account" : current === "forgot" ? "Email me the reset link" : "Update password"} <ArrowRight size={17}/></button>
      </form>
      <div className="s-auth-links">
        {current === "signin" && <><button onClick={()=>setCurrent("forgot")}>Forgot password?</button><button onClick={()=>setCurrent("signup")}>Create an account</button></>}
        {current === "signup" && <button onClick={()=>setCurrent("signin")}>Already on S? Sign in</button>}
        {current === "forgot" && <button onClick={()=>setCurrent("signin")}>Back to sign in</button>}
        {current === "reset" && <button onClick={()=>setCurrent("signin")}>Back to sign in</button>}
      </div>
      <small className="s-auth-note"><Mail size={13}/> Password reset emails are sent through S’s configured transactional email service.</small>
    </div>
  </div>;
}

export default function AuthLanding({ onAuthenticated }) {
  const isReset = window.location.pathname === "/reset-password";
  if (isReset) return <AuthPanel mode="reset" onClose={() => { window.history.replaceState({}, "", "/"); window.location.reload(); }} onAuthenticated={onAuthenticated}/>;
  return <Landing onAuth={onAuthenticated}/>;
}
