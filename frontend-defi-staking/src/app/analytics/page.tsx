"use client";
import { useState, useEffect } from "react";
import { useStaking } from "@/hooks/useStaking";
import { useProtocolDays } from "@/hooks/useSubgraph";

function fmtAPR(v: number) {
  if (v >= 1_000_000) return `${(v/1_000_000).toFixed(1)}M%`;
  if (v >= 1_000)     return `${(v/1_000).toFixed(1)}K%`;
  return `${v.toFixed(2)}%`;
}

// Fallback simulated data when subgraph isn't ready
function genFallback(tvl: number) {
  const pts = [];
  const base = Math.max(tvl, 0.01);
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const t = parseFloat((base*(0.6+0.4*((29-i)/29))+(Math.random()-0.4)*base*0.08).toFixed(6));
    pts.push({
      label:   d.toLocaleDateString("en-US",{month:"short",day:"numeric"}),
      tvl:     Math.max(t,0.001),
      rewards: parseFloat((t*86.4).toFixed(2)),
      apr:     parseFloat(Math.min((86400*0.001/t)*100,500000).toFixed(1)),
    });
  }
  return pts;
}

// ── SVG Area Chart ──────────────────────────────────────────────
function AreaChart({ data, dataKey, color, height=220 }: { data:any[], dataKey:string, color:string, height?:number }) {
  const W=800, H=height;
  const P={top:12,right:16,bottom:28,left:60};
  const iW=W-P.left-P.right, iH=H-P.top-P.bottom;
  const vals=data.map(d=>d[dataKey] as number);
  const minV=Math.min(...vals), maxV=Math.max(...vals);
  const range=maxV-minV||1;
  const px=(i:number)=> data.length < 2 ? P.left + iW/2 : P.left+(i/(data.length-1))*iW;
  const py=(v:number)=>P.top+iH-((v-minV)/range)*iH;
  const pts=data.map((d,i)=>`${px(i)},${py(d[dataKey])}`).join(" ");
  const area=`M${px(0)},${py(data[0][dataKey])} `+
    data.slice(1).map((d,i)=>`L${px(i+1)},${py(d[dataKey])}`).join(" ")+
    ` L${px(data.length-1)},${P.top+iH} L${px(0)},${P.top+iH} Z`;
  const [tip,setTip]=useState<{x:number,y:number,v:number,label:string}|null>(null);
  const yTicks=[0,0.25,0.5,0.75,1].map(f=>({v:minV+f*range,y:P.top+iH-f*iH}));
  return (
    <div style={{position:"relative",width:"100%"}}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto",display:"block",overflow:"visible"}} onMouseLeave={()=>setTip(null)}>
        <defs>
          <linearGradient id={`ag-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.35"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {yTicks.map(t=>(
          <g key={t.y}>
            <line x1={P.left} y1={t.y} x2={P.left+iW} y2={t.y} stroke="rgba(128,128,128,0.15)" strokeDasharray="4 4"/>
            <text x={P.left-6} y={t.y+4} textAnchor="end" fontSize="10" fill="var(--t3)">
              {t.v>=1000?`${(t.v/1000).toFixed(1)}K`:t.v.toFixed(3)}
            </text>
          </g>
        ))}
        <path d={area} fill={`url(#ag-${dataKey})`}/>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
        {data.filter((_,i)=>i%5===0||i===data.length-1).map((d,_)=>{
          const i=data.indexOf(d);
          return <text key={i} x={px(i)} y={H-6} textAnchor="middle" fontSize="9" fill="var(--t3)">{d.label}</text>;
        })}
        {data.map((d,i)=>(
          <circle key={i} cx={px(i)} cy={py(d[dataKey])} r="12" fill="transparent"
            onMouseEnter={()=>setTip({x:px(i),y:py(d[dataKey]),v:d[dataKey],label:d.label})}/>
        ))}
        {tip&&<>
          <line x1={tip.x} y1={P.top} x2={tip.x} y2={P.top+iH} stroke={color} strokeOpacity="0.4" strokeDasharray="4 4"/>
          <circle cx={tip.x} cy={tip.y} r="5" fill={color} stroke="white" strokeWidth="2"/>
        </>}
      </svg>
      {tip&&(
        <div style={{position:"absolute",top:"0.5rem",right:"0.5rem",background:"var(--bg-card)",border:"1px solid var(--border-green)",borderRadius:"8px",padding:"0.45rem 0.7rem",fontSize:"0.78rem",color:"var(--t1)",pointerEvents:"none",zIndex:10}}>
          <div style={{color:"var(--t4)",fontSize:"0.68rem",marginBottom:"0.15rem"}}>{tip.label}</div>
          <div style={{color,fontWeight:700,fontFamily:"IBM Plex Mono,monospace"}}>
            {tip.v>=1000?`${(tip.v/1000).toFixed(2)}K`:tip.v.toFixed(4)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SVG Bar Chart ───────────────────────────────────────────────
function BarChart({ data, dataKey, color, height=200 }: { data:any[], dataKey:string, color:string, height?:number }) {
  const W=700,H=height,P={top:12,right:16,bottom:28,left:52};
  const iW=W-P.left-P.right,iH=H-P.top-P.bottom;
  const vals=data.map(d=>d[dataKey] as number);
  const maxV=Math.max(...vals,1);
  const bW=(iW/data.length)*0.7;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto",display:"block"}}>
      {[0,0.25,0.5,0.75,1].map(f=>{
        const y=P.top+iH-f*iH;
        return <g key={f}>
          <line x1={P.left} y1={y} x2={P.left+iW} y2={y} stroke="rgba(128,128,128,0.15)" strokeDasharray="4 4"/>
          <text x={P.left-6} y={y+4} textAnchor="end" fontSize="10" fill="var(--t3)">{(f*maxV).toFixed(1)}</text>
        </g>;
      })}
      {data.map((d,i)=>{
        const x=P.left+(i/data.length)*iW+((iW/data.length)-bW)/2;
        const bH=Math.max((d[dataKey]/maxV)*iH,2);
        const y=P.top+iH-bH;
        return <g key={i}>
          <rect x={x} y={y} width={bW} height={bH} fill={color} rx="3" opacity="0.85"/>
          {i%3===0&&<text x={x+bW/2} y={H-6} textAnchor="middle" fontSize="8" fill="var(--t3)">{d.label}</text>}
        </g>;
      })}
    </svg>
  );
}

// ── SVG Line Chart ──────────────────────────────────────────────
function LineChart({ data, dataKey, color, height=200 }: { data:any[], dataKey:string, color:string, height?:number }) {
  const W=700,H=height,P={top:12,right:16,bottom:28,left:60};
  const iW=W-P.left-P.right,iH=H-P.top-P.bottom;
  const vals=data.map(d=>d[dataKey] as number);
  const maxV=Math.max(...vals,1),minV=Math.min(...vals,0),range=maxV-minV||1;
  const px=(i:number)=>P.left+(i/(data.length-1))*iW;
  const py=(v:number)=>P.top+iH-((v-minV)/range)*iH;
  const pts=data.map((d,i)=>`${px(i)},${py(d[dataKey])}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto",display:"block"}}>
      {[0,0.25,0.5,0.75,1].map(f=>{
        const v=minV+f*range,y=P.top+iH-f*iH;
        return <g key={f}>
          <line x1={P.left} y1={y} x2={P.left+iW} y2={y} stroke="rgba(128,128,128,0.15)" strokeDasharray="4 4"/>
          <text x={P.left-6} y={y+4} textAnchor="end" fontSize="9" fill="var(--t3)">{v>=1000?`${(v/1000).toFixed(0)}K`:v.toFixed(0)}</text>
        </g>;
      })}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
      {data.filter((_,i)=>i%3===0).map((d,_)=>{
        const i=data.indexOf(d);
        return <text key={i} x={px(i)} y={H-6} textAnchor="middle" fontSize="8" fill="var(--t3)">{d.label}</text>;
      })}
    </svg>
  );
}

// ── Main Page ───────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { totalStaked, aprPercent, pendingRewards, stakedAmount } = useStaking();
  const { data: graphDays, loading: graphLoading } = useProtocolDays(30);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // Use real Graph data if available, otherwise simulate
  const isLive   = graphDays.length > 0;
  const realDays = graphDays.map(d => ({
    label: (() => {
      try {
        const parts = d.date.split("-");
        const dt = new Date(Number(parts[0]), Number(parts[1])-1, Number(parts[2]));
        return dt.toLocaleDateString("en-US",{month:"short",day:"numeric"});
      } catch { return d.date; }
    })(),
    tvl:     Number(d.tvl),
    rewards: Number(d.dailyRewards),
    apr:     Number(d.tvl) > 0
      ? parseFloat(Math.min((86400*0.001/Number(d.tvl))*100,500000).toFixed(1))
      : 0,
  }));

  // Pad with simulated history if fewer than 7 real days
  const chartData = realDays.length >= 2
    ? realDays
    : (() => {
        const fallback = genFallback(Number(totalStaked)).slice(0, 29);
        // Replace last N entries with real data
        realDays.forEach((r, i) => { fallback[29 - realDays.length + i] = r; });
        return fallback;
      })();

  const aprDisplay = fmtAPR(aprPercent);
  const aprColor   = aprPercent > 999999 ? "var(--yellow)" : "var(--green)";

  return (
    <div className="yf-page">
      <div className="yf-page-header">
        <h1 className="yf-page-title">📊 Analytics</h1>
        <p className="yf-sub">Protocol performance metrics and historical data.</p>
      </div>

      {/* Data source badge */}
      <div style={{ marginBottom:"1.25rem", display:"flex", alignItems:"center", gap:"0.5rem" }}>
        {isLive ? (
          <span style={{ fontSize:"0.72rem", color:"var(--green)", background:"rgba(0,200,100,0.08)", border:"1px solid rgba(0,200,100,0.2)", borderRadius:"20px", padding:"0.22rem 0.75rem", fontWeight:600 }}>
            ✅ Live data from The Graph · {graphDays.length} days indexed
          </span>
        ) : (
          <span style={{ fontSize:"0.72rem", color:"var(--yellow)", background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:"20px", padding:"0.22rem 0.75rem", fontWeight:600 }}>
            {graphLoading ? "⏳ Syncing subgraph…" : "📊 Simulated data — subgraph not yet connected"}
          </span>
        )}
      </div>

      {aprPercent > 999999 && (
        <div style={{ marginBottom:"1.5rem", padding:"1rem 1.25rem", background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.18)", borderRadius:"12px" }}>
          <div style={{ fontSize:"0.85rem", color:"var(--yellow)", fontWeight:700, marginBottom:"0.35rem" }}>📢 About the Current APR</div>
          <p style={{ fontSize:"0.82rem", color:"var(--t2)", lineHeight:1.65 }}>
            APR is <strong style={{color:"var(--yellow)"}}>{aprDisplay}</strong> because the protocol is in early phase with low TVL.
            As more users stake, APR normalises. <strong style={{color:"var(--t1)"}}>Early stakers benefit most.</strong>
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid-4" style={{ marginBottom:"2rem" }}>
        {[
          { label:"Total Value Locked",   value:`${Number(totalStaked).toFixed(4)} STK`,   color:"var(--green)",  icon:"🏦" },
          { label:"Current APR",          value:aprDisplay,                                 color:aprColor,        icon:"📈", note:aprPercent>999999?"Early phase — low TVL":"Annual yield rate" },
          { label:"Your Pending Rewards", value:`${Number(pendingRewards).toFixed(4)} RWD`, color:"var(--purple)", icon:"💎" },
          { label:"Your Pool Share",      value:Number(totalStaked)===0?"0%":`${((Number(stakedAmount)/Number(totalStaked))*100).toFixed(2)}%`, color:"var(--blue)", icon:"🎯" },
        ].map(({ label, value, color, icon, note }:any) => (
          <div key={label} className="yf-card" style={{ padding:"1.25rem", borderTop:`2px solid ${color}` }}>
            <div style={{ fontSize:"1.2rem", marginBottom:"0.4rem" }}>{icon}</div>
            <div className="yf-label" style={{ marginBottom:"0.35rem" }}>{label}</div>
            <div className="yf-mono" style={{ fontSize:"1rem", fontWeight:700, color, wordBreak:"break-all" }}>{value}</div>
            {note && <div style={{ fontSize:"0.68rem", color:"var(--t4)", marginTop:"0.2rem" }}>{note}</div>}
          </div>
        ))}
      </div>

      {/* TVL Chart */}
      <div className="yf-card" style={{ padding:"1.75rem", marginBottom:"1.5rem" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" }}>
          <h3 className="yf-h3">Total Value Locked (30 Days)</h3>
          {isLive && <span style={{ fontSize:"0.7rem", color:"var(--green)", fontWeight:600 }}>● Live</span>}
        </div>
        {chartData.length > 0 && <AreaChart data={chartData} dataKey="tvl" color="#00ffa3" height={220}/>}
      </div>

      {/* Two charts */}
      <div className="grid-analytics" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem" }}>
        <div className="yf-card" style={{ padding:"1.75rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" }}>
            <h3 className="yf-h3">Daily Rewards Distributed</h3>
            {isLive && <span style={{ fontSize:"0.7rem", color:"var(--green)", fontWeight:600 }}>● Live</span>}
          </div>
          {chartData.length > 0 && <BarChart data={chartData.slice(-14)} dataKey="rewards" color="#a78bfa" height={190}/>}
        </div>
        <div className="yf-card" style={{ padding:"1.75rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.4rem" }}>
            <h3 className="yf-h3">APR Trend</h3>
            {isLive && <span style={{ fontSize:"0.7rem", color:"var(--green)", fontWeight:600 }}>● Live</span>}
          </div>
          <p style={{ fontSize:"0.72rem", color:"var(--t4)", marginBottom:"0.85rem" }}>Capped at 500K% for readability</p>
          {chartData.length > 0 && <LineChart data={chartData.slice(-14)} dataKey="apr" color="#00c9ff" height={190}/>}
        </div>
      </div>
    </div>
  );
}