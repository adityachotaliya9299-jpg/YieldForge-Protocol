"use client";
import { useState } from "react";


export function TelegramChatIdHelper({ onFound }: { onFound?: (id: string) => void }) {
  const [chatId,   setChatId]   = useState("");
  const [step,     setStep]     = useState(1);
  const [testing,  setTesting]  = useState(false);
  const [testOk,   setTestOk]   = useState(false);

  const testBot = async () => {
    if (!chatId) return;
    setTesting(true);
    try {
      const res = await fetch("/api/alerts/test-telegram", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ chatId }),
      });
      const data = await res.json();
      if (data.success) {
        setTestOk(true);
        onFound?.(chatId);
      }
    } catch {}
    setTesting(false);
  };

  const STEPS = [
    {
      n: 1,
      title: "Open Telegram",
      desc:  "Open the Telegram app on your phone or desktop.",
      action: null,
    },
    {
      n: 2,
      title: "Message @userinfobot",
      desc:  "Search for @userinfobot in Telegram and send any message (e.g. /start).",
      action: (
        <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer"
          style={{ display:"inline-flex", alignItems:"center", gap:"0.4rem", padding:"0.45rem 0.9rem", background:"rgba(0,136,204,0.1)", border:"1px solid rgba(0,136,204,0.3)", borderRadius:"8px", color:"#0088cc", textDecoration:"none", fontSize:"0.82rem", fontWeight:600, marginTop:"0.5rem" }}>
          ✈️ Open @userinfobot →
        </a>
      ),
    },
    {
      n: 3,
      title: "Copy your ID",
      desc:  'The bot replies with your info. Copy the number next to "Id:"',
      action: (
        <div style={{ marginTop:"0.5rem", padding:"0.65rem 0.85rem", background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:"8px", fontSize:"0.8rem", fontFamily:"IBM Plex Mono,monospace", color:"var(--t2)" }}>
          Your user ID: <span style={{ color:"var(--green)", fontWeight:700 }}>123456789</span> ← Copy this
        </div>
      ),
    },
    {
      n: 4,
      title: "Paste your ID below",
      desc:  "Paste your Chat ID and test to confirm it works.",
      action: (
        <div style={{ marginTop:"0.5rem", display:"flex", flexDirection:"column", gap:"0.5rem" }}>
          <div style={{ display:"flex", gap:"0.5rem" }}>
            <input
              type="text"
              placeholder="e.g. 123456789"
              value={chatId}
              onChange={e => setChatId(e.target.value.replace(/\D/g, ""))}
              className="yf-input"
              style={{ flex:1, fontSize:"0.9rem" }}
            />
            <button
              onClick={testBot}
              disabled={!chatId || testing}
              style={{ padding:"0.5rem 1rem", background: testOk ? "rgba(0,200,100,0.1)" : "linear-gradient(135deg,#0088cc,#00c9ff)", border: testOk ? "1px solid rgba(0,200,100,0.3)" : "none", borderRadius:"9px", color: testOk ? "var(--green)" : "#fff", fontFamily:"inherit", fontSize:"0.82rem", fontWeight:700, cursor: !chatId||testing ? "not-allowed" : "pointer", whiteSpace:"nowrap" }}>
              {testing ? "⏳" : testOk ? "✅ Works!" : "Test"}
            </button>
          </div>
          {testOk && (
            <div style={{ fontSize:"0.78rem", color:"var(--green)", fontWeight:600 }}>
              ✅ Bot sent you a test message! Your Chat ID is confirmed.
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding:"1rem", background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:"12px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"1rem" }}>
        <span style={{ fontSize:"1.1rem" }}>✈️</span>
        <div style={{ fontSize:"0.85rem", fontWeight:700, color:"var(--t1)" }}>Find Your Telegram Chat ID</div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
        {STEPS.map(s => (
          <div key={s.n}
            style={{ padding:"0.75rem", background: step >= s.n ? "var(--bg-card)" : "transparent", border:`1px solid ${step >= s.n ? "var(--border-green)" : "var(--border)"}`, borderRadius:"10px", opacity: step < s.n ? 0.5 : 1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom: s.action ? "0.35rem" : 0 }}>
              <div style={{ width:"22px", height:"22px", flexShrink:0, borderRadius:"50%", background: step > s.n ? "var(--green)" : step === s.n ? "rgba(0,136,204,0.15)" : "var(--bg-input)", border:`1px solid ${step > s.n ? "var(--green)" : "var(--border)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.7rem", fontWeight:700, color: step > s.n ? "#fff" : "var(--t3)" }}>
                {step > s.n ? "✓" : s.n}
              </div>
              <div>
                <div style={{ fontSize:"0.82rem", fontWeight:600, color:"var(--t1)" }}>{s.title}</div>
                <div style={{ fontSize:"0.75rem", color:"var(--t3)" }}>{s.desc}</div>
              </div>
            </div>
            {s.action && step >= s.n && s.action}
            {step === s.n && s.n < 4 && (
              <button onClick={() => setStep(s.n + 1)}
                style={{ marginTop:"0.6rem", padding:"0.35rem 0.85rem", background:"rgba(0,136,204,0.1)", border:"1px solid rgba(0,136,204,0.3)", borderRadius:"7px", color:"#0088cc", fontFamily:"inherit", fontSize:"0.78rem", fontWeight:600, cursor:"pointer" }}>
                Next →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}