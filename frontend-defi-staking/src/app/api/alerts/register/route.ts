// src/app/api/alerts/register/route.ts
// Next.js App Router API endpoint

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// In production use a database (Postgres/Supabase/PlanetScale)
// For demo we use a local JSON file
const ALERTS_FILE = path.join(process.cwd(), "alerts.json");

interface AlertRecord {
  type:       "email" | "telegram";
  address:    string;
  contact:    string;
  lockEnd:    number;   // unix timestamp
  daysBefore: number;
  alertAt:    number;   // lockEnd - daysBefore*86400
  sent:       boolean;
  createdAt:  number;
}

function loadAlerts(): AlertRecord[] {
  if (!fs.existsSync(ALERTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(ALERTS_FILE, "utf8"));
}

function saveAlerts(alerts: AlertRecord[]) {
  fs.writeFileSync(ALERTS_FILE, JSON.stringify(alerts, null, 2));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, address, contact, lockEnd, daysBefore } = body;

    if (!type || !address || !contact || !lockEnd) {
      return NextResponse.json({ error:"Missing required fields" }, { status:400 });
    }

    const alertAt = lockEnd - (daysBefore * 86400);
    const alerts  = loadAlerts();

    // Remove existing alert for same address+type
    const filtered = alerts.filter(a => !(a.address === address && a.type === type));

    filtered.push({
      type, address, contact, lockEnd, daysBefore,
      alertAt, sent:false, createdAt: Math.floor(Date.now()/1000),
    });

    saveAlerts(filtered);

    return NextResponse.json({ success:true, alertAt });
  } catch(e) {
    return NextResponse.json({ error:"Server error" }, { status:500 });
  }
}

export async function GET() {
  const alerts = loadAlerts();
  // Only return count for security
  return NextResponse.json({ total: alerts.length, pending: alerts.filter(a=>!a.sent).length });
}