"use client";
import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved ? saved === "dark" : true;
    setDark(isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <button onClick={toggle} title="Toggle theme"
      style={{
        width:"38px", height:"38px",
        display:"flex", alignItems:"center", justifyContent:"center",
        background:"rgba(255,255,255,0.06)",
        border:"1px solid rgba(255,255,255,0.1)",
        borderRadius:"10px", fontSize:"1.1rem",
        cursor:"pointer", transition:"background 0.2s",
        flexShrink:0,
      }}>
      {dark ? "☀️" : "🌙"}
    </button>
  );
}