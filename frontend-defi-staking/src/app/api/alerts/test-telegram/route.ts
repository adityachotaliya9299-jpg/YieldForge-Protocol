import { NextRequest, NextResponse } from "next/server";
 
export async function POST(req: NextRequest) {
  try {
    const { chatId } = await req.json();
    if (!chatId) return NextResponse.json({ error:"Missing chatId" }, { status:400 });
 
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return NextResponse.json({ error:"Bot not configured" }, { status:500 });
 
    const msg = `✅ YieldForge Alert Test\n\nYour Telegram alerts are working!\n\nYou will receive notifications before your STK lock expires.\n\n🔗 YieldForge Protocol`;
 
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ chat_id:chatId, text:msg, parse_mode:"HTML" }),
      }
    );
 
    const data = await res.json();
    if (!data.ok) {
      return NextResponse.json({ success:false, error:data.description }, { status:400 });
    }
 
    return NextResponse.json({ success:true });
  } catch(e: any) {
    return NextResponse.json({ success:false, error:e.message }, { status:500 });
  }
}
 