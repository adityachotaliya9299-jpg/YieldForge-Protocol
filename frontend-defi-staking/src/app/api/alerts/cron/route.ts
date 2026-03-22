// src/app/api/alerts/cron/route.ts
// Call this endpoint from a cron job every hour
// e.g. Vercel Cron: https://vercel.com/docs/cron-jobs
// or set up a cron job: curl https://yourapp.com/api/alerts/cron

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ALERTS_FILE = path.join(process.cwd(), "alerts.json");
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const SENDGRID_API_KEY   = process.env.SENDGRID_API_KEY   ?? "";
const FROM_EMAIL         = process.env.FROM_EMAIL         ?? "alerts@yieldforge.io";

interface AlertRecord {
  type:"email"|"telegram"; address:string; contact:string;
  lockEnd:number; daysBefore:number; alertAt:number; sent:boolean; createdAt:number;
}

function loadAlerts(): AlertRecord[] {
  if (!fs.existsSync(ALERTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(ALERTS_FILE,"utf8"));
}
function saveAlerts(a: AlertRecord[]) { fs.writeFileSync(ALERTS_FILE, JSON.stringify(a,null,2)); }

async function sendTelegram(chatId: string, message: string) {
  if (!TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not set");
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ chat_id:chatId, text:message, parse_mode:"HTML" }),
  });
}

async function sendEmail(to: string, address: string, lockEnd: number) {
  if (!SENDGRID_API_KEY) throw new Error("SENDGRID_API_KEY not set");
  const unlockDate = new Date(lockEnd*1000).toLocaleDateString("en-US",{day:"numeric",month:"long",year:"numeric"});
  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method:"POST",
    headers:{ "Authorization":`Bearer ${SENDGRID_API_KEY}`, "Content-Type":"application/json" },
    body: JSON.stringify({
      personalizations:[{ to:[{email:to}] }],
      from:{ email:FROM_EMAIL, name:"YieldForge Protocol" },
      subject:"⏰ Your STK lock is expiring soon",
      content:[{ type:"text/html", value:`
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem;background:#040b14;color:#f0f6ff;border-radius:12px">
          <h2 style="color:#00ffa3">⏰ STK Lock Expiring Soon</h2>
          <p>Your STK tokens in <strong>YieldForge Protocol</strong> are unlocking on <strong style="color:#00ffa3">${unlockDate}</strong>.</p>
          <p style="color:#94a3b8">Wallet: <code>${address.slice(0,6)}…${address.slice(-4)}</code></p>
          <div style="margin:1.5rem 0">
            <a href="https://yieldforge.io/vestk" style="background:linear-gradient(135deg,#00ffa3,#00c9ff);color:#040b14;padding:0.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:700">
              Unlock & Re-stake →
            </a>
          </div>
          <p style="color:#475569;font-size:0.8rem">You can re-stake for another term or withdraw. Don't miss the window!</p>
        </div>
      `}],
    }),
  });
}

// Vercel cron config (add to vercel.json):
// { "crons": [{ "path": "/api/alerts/cron", "schedule": "0 * * * *" }] }
export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  }

  const now    = Math.floor(Date.now()/1000);
  const alerts = loadAlerts();
  const results: string[] = [];
  let sent = 0;

  for (const alert of alerts) {
    if (alert.sent) continue;
    if (now < alert.alertAt) continue; // Not time yet

    try {
      if (alert.type === "telegram") {
        const unlockDate = new Date(alert.lockEnd*1000).toLocaleDateString("en-US",{day:"numeric",month:"long"});
        const msg = `⏰ <b>YieldForge Alert</b>\n\nYour STK lock expires on <b>${unlockDate}</b>.\n\nWallet: <code>${alert.address.slice(0,6)}...${alert.address.slice(-4)}</code>\n\n👉 <a href="https://yieldforge.io/vestk">Unlock & Re-stake</a>`;
        await sendTelegram(alert.contact, msg);
      } else {
        await sendEmail(alert.contact, alert.address, alert.lockEnd);
      }
      alert.sent = true;
      sent++;
      results.push(`✅ Sent ${alert.type} to ${alert.contact}`);
    } catch(e: any) {
      results.push(`❌ Failed ${alert.type} to ${alert.contact}: ${e.message}`);
    }
  }

  saveAlerts(alerts);
  return NextResponse.json({ processed:alerts.length, sent, results });
}