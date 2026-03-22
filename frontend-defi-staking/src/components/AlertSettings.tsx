"use client";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useToast } from "@/components/Toast";

interface AlertPrefs {
  email:          string;
  emailEnabled:   boolean;
  telegramChatId: string;
  telegramEnabled:boolean;
  daysBeforeAlert:number;
}
const DEFAULT: AlertPrefs = { email:"", emailEnabled:false, telegramChatId:"", telegramEnabled:false, daysBeforeAlert:3 };

export function AlertSettings({ lockEndTimestamp }: { lockEndTimestamp?: number }) {
  const { address } = useAccount();
  const { toast }   = useToast();
  const [prefs,  setPrefs]  = useState<AlertPrefs>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [open,   setOpen]   = useState(false);

  useEffect(() => {
    if (!address) return;
    const saved = localStorage.getItem(`yf-alerts-${address}`);
    if (saved) setPrefs(JSON.parse(saved));
  }, [address]);

  const save = async () => {
    if (!address) return;
    setSaving(true);
    try {
      localStorage.setItem(`yf-alerts-${address}`, JSON.stringify(prefs));
      if ((prefs.emailEnabled && prefs.email) || (prefs.telegramEnabled && prefs.telegramChatId)) {
        await fetch("/api/alerts/register", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ type: prefs.emailEnabled?"email":"telegram", address, contact: prefs.emailEnabled?prefs.email:prefs.telegramChatId, lockEnd: lockEndTimestamp, daysBefore: prefs.daysBeforeAlert }),
        });
      }
      toast("Alert preferences saved ✅","success");
    } catch { toast("Failed to save","error"); }
    finally { setSaving(false); }
  };

  const unlockDate = lockEndTimestamp
    ? new Date(lockEndTimestamp*1000).toLocaleDateString("en-US",{day:"numeric",month:"long",year:"numeric"})
    : null;

  return (
    <div className="yf-card" style={{ overflow:"hidden" }}>
      {/* Header */}
      <button onClick={() => setOpen(o=>!o)} style={{ width:"100%", padding:"1.1rem 1.5rem", background:"none", border:"none", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", fontFamily:"inherit" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.65rem" }}>
          <span style={{ fontSize:"1.1rem" }}>🔔</span>
          <div style={{ textAlign:"left" }}>
            <div style={{ fontFamily:"Syne,Georgia,serif", fontSize:"0.9rem", fontWeight:700, color:"var(--t1)" }}>Unlock Alerts</div>
            {unlockDate && <div style={{ fontSize:"0.7rem", color:"var(--t4)", marginTop:"0.1rem" }}>Expires {unlockDate}</div>}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
          {(prefs.emailEnabled || prefs.telegramEnabled) && (
            <span style={{ fontSize:"0.68rem", color:"var(--green)", background:"rgba(0,200,100,0.1)", border:"1px solid rgba(0,200,100,0.25)", borderRadius:"20px", padding:"0.15rem 0.55rem", fontWeight:600 }}>
              Active
            </span>
          )}
          <span style={{ color:"var(--t4)", fontSize:"0.85rem" }}>{open?"▲":"▼"}</span>
        </div>
      </button>

      {open && (
        <div style={{ padding:"0 1.5rem 1.5rem", borderTop:"1px solid var(--border)" }}>
          <p style={{ fontSize:"0.78rem", color:"var(--t3)", lineHeight:1.5, margin:"0.85rem 0 1rem" }}>
            Get notified before your lock expires so you can re-stake or withdraw without missing the window.
          </p>

          {/* Email */}
          <div style={{ marginBottom:"0.75rem", padding:"1rem", background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:"12px" }}>
            <label style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", marginBottom: prefs.emailEnabled?"0.75rem":"0" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"0.55rem" }}>
                <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:"rgba(0,201,255,0.1)", border:"1px solid rgba(0,201,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.95rem" }}>📧</div>
                <div>
                  <div style={{ fontSize:"0.85rem", fontWeight:600, color:"var(--t1)" }}>Email Alert</div>
                  <div style={{ fontSize:"0.7rem", color:"var(--t4)" }}>Receive email reminder</div>
                </div>
              </div>
              <div onClick={() => setPrefs(p=>({...p,emailEnabled:!p.emailEnabled}))}
                style={{ width:"40px", height:"22px", borderRadius:"11px", background:prefs.emailEnabled?"var(--green)":"var(--bg-card)", border:`1px solid ${prefs.emailEnabled?"var(--green)":"var(--border)"}`, position:"relative", cursor:"pointer", transition:"all 0.2s", flexShrink:0 }}>
                <div style={{ width:"16px", height:"16px", borderRadius:"50%", background:"white", position:"absolute", top:"2px", left: prefs.emailEnabled?"20px":"2px", transition:"left 0.2s" }} />
              </div>
            </label>
            {prefs.emailEnabled && (
              <input type="email" placeholder="your@email.com" value={prefs.email} onChange={e=>setPrefs(p=>({...p,email:e.target.value}))}
                className="yf-input" style={{ fontSize:"0.85rem" }}/>
            )}
          </div>

          {/* Telegram */}
          <div style={{ marginBottom:"1rem", padding:"1rem", background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:"12px" }}>
            <label style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", marginBottom: prefs.telegramEnabled?"0.75rem":"0" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"0.55rem" }}>
                <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:"rgba(0,136,204,0.1)", border:"1px solid rgba(0,136,204,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.95rem" }}>✈️</div>
                <div>
                  <div style={{ fontSize:"0.85rem", fontWeight:600, color:"var(--t1)" }}>Telegram Alert</div>
                  <div style={{ fontSize:"0.7rem", color:"var(--t4)" }}>Instant message on unlock</div>
                </div>
              </div>
              <div onClick={() => setPrefs(p=>({...p,telegramEnabled:!p.telegramEnabled}))}
                style={{ width:"40px", height:"22px", borderRadius:"11px", background:prefs.telegramEnabled?"var(--green)":"var(--bg-card)", border:`1px solid ${prefs.telegramEnabled?"var(--green)":"var(--border)"}`, position:"relative", cursor:"pointer", transition:"all 0.2s", flexShrink:0 }}>
                <div style={{ width:"16px", height:"16px", borderRadius:"50%", background:"white", position:"absolute", top:"2px", left: prefs.telegramEnabled?"20px":"2px", transition:"left 0.2s" }} />
              </div>
            </label>
            {prefs.telegramEnabled && (
              <div>
                <input type="text" placeholder="Your Telegram Chat ID" value={prefs.telegramChatId} onChange={e=>setPrefs(p=>({...p,telegramChatId:e.target.value}))}
                  className="yf-input" style={{ fontSize:"0.85rem", marginBottom:"0.4rem" }}/>
                <p style={{ fontSize:"0.71rem", color:"var(--t4)", lineHeight:1.5 }}>
                  Get your ID: message <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" style={{ color:"var(--blue)" }}>@userinfobot</a> on Telegram
                </p>
              </div>
            )}
          </div>

          {/* Days picker */}
          <div style={{ marginBottom:"1rem" }}>
            <div className="yf-label" style={{ marginBottom:"0.5rem" }}>Alert me how many days before unlock?</div>
            <div style={{ display:"flex", gap:"0.4rem" }}>
              {[1,2,3,7,14].map(d => (
                <button key={d} onClick={() => setPrefs(p=>({...p,daysBeforeAlert:d}))}
                  style={{ flex:1, padding:"0.5rem 0.25rem", background:prefs.daysBeforeAlert===d?"rgba(0,200,100,0.1)":"var(--bg-input)", border:prefs.daysBeforeAlert===d?"1px solid rgba(0,200,100,0.35)":"1px solid var(--border)", borderRadius:"8px", cursor:"pointer", fontSize:"0.8rem", color:prefs.daysBeforeAlert===d?"var(--green)":"var(--t3)", fontFamily:"inherit", fontWeight:prefs.daysBeforeAlert===d?700:400 }}>
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <button onClick={save} disabled={saving} className="btn-primary btn-full">
            {saving ? "⏳ Saving…" : "💾 Save Alert Preferences"}
          </button>
        </div>
      )}
    </div>
  );
}