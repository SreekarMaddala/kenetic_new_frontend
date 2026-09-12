import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type React from "react";
import type { RefObject } from "react";
import siteCranes from "../assets/site-cranes.jpg";
import siteSlab from "../assets/site-slab.jpg";
import siteSteel from "../assets/site-steel.jpg";
import invoiceScan from "../assets/invoice-scan.jpg";
import trackingCardSvg from "../assets/lanyard/tracking-card.svg";
import financeCardSvg from "../assets/lanyard/finance-card.svg";
import inventoryCardSvg from "../assets/lanyard/inventory-card.svg";
import approvalCardSvg from "../assets/lanyard/approval-card.svg";
import docsCardSvg from "../assets/lanyard/docs-card.svg";
import workforceCardSvg from "../assets/lanyard/workforce-card.svg";

const Threads = lazy(() => import("../components/Threads"));
const Lanyard = lazy(() => import("../components/Lanyard"));
const MultiBadgeLanyard = lazy(() => import("../components/MultiBadgeLanyard"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kinetic — Construction Operations Platform" },
      { name: "description", content: "AI-powered construction operations for Indian builders." },
    ],
  }),
  component: LandingPage,
});

/* ── hooks ── */
function useReveal(): [RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVis(true);
          obs.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, vis];
}

function AnimatedCounter({ value }: { value: string }) {
  const [display, setDisplay] = useState("0");
  const [ref, vis] = useReveal();
  const ran = useRef(false);
  useEffect(() => {
    if (!vis || ran.current) return;
    ran.current = true;
    const m = value.match(/^(₹?)([\d.]+)(.*)$/);
    if (!m) {
      setDisplay(value);
      return;
    }
    const [, pre, raw, suf] = m,
      num = parseFloat(raw),
      dec = raw.includes(".") ? raw.split(".")[1].length : 0;
    const dur = 1800,
      t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - t0) / dur, 1),
        e = p * (2 - p);
      setDisplay(`${pre}${(e * num).toFixed(dec)}${suf}`);
      if (p < 1) requestAnimationFrame(tick);
      else setDisplay(value);
    };
    requestAnimationFrame(tick);
  }, [vis, value]);
  return <span ref={ref}>{display}</span>;
}


/* ── data ── */
const FEATURES = [
  {
    icon: "◈",
    title: "Live Project Pipeline",
    desc: "Real-time visibility into every site's phase, budget utilization, and team performance.",
    color: "hsl(158,64%,40%)",
    glow: "rgba(0,185,120,0.2)",
    tag: "Tracking",
    img: siteCranes,
  },
  {
    icon: "⬡",
    title: "AI Bill Extraction",
    desc: "Upload vendor invoices — our AI parses GSTIN, line items, and amounts at 98%+ confidence.",
    color: "hsl(210,85%,58%)",
    glow: "rgba(30,145,220,0.2)",
    tag: "Finance",
    img: invoiceScan,
  },
  {
    icon: "◉",
    title: "Material Intelligence",
    desc: "Predictive reorder alerts so you never face a cement or steel shortage mid-pour again.",
    color: "hsl(40,90%,56%)",
    glow: "rgba(235,155,25,0.2)",
    tag: "Inventory",
    img: siteSteel,
  },
  {
    icon: "⬢",
    title: "Approval Center",
    desc: "Structured workflows for material requests, budget changes, and work sign-offs with audit trail.",
    color: "hsl(280,65%,65%)",
    glow: "rgba(150,70,210,0.2)",
    tag: "Workflow",
    img: siteSlab,
  },
  {
    icon: "⬟",
    title: "Document Repository",
    desc: "AI-searchable vault for contracts, drawings, invoices, and site reports — version tracked.",
    color: "hsl(0,70%,58%)",
    glow: "rgba(210,50,50,0.2)",
    tag: "Docs",
    img: invoiceScan,
  },
  {
    icon: "◇",
    title: "Workforce & Labour",
    desc: "Track attendance, assignments, and labour productivity across all active construction sites.",
    color: "hsl(185,70%,48%)",
    glow: "rgba(20,170,175,0.2)",
    tag: "HR",
    img: siteCranes,
  },
];





function FeatureCard({ f, delay }: { f: (typeof FEATURES)[number]; delay: number }) {
  const [ref, vis] = useReveal();
  const [hov, setHov] = useState(false);
  return (
    <div
      ref={ref}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? "translateY(0)" : "translateY(40px)",
        transition: `opacity .65s ease ${delay}ms, transform .65s ease ${delay}ms, border-color .25s, box-shadow .25s`,
        position: "relative",
        borderRadius: 22,
        overflow: "hidden",
        border: `1px solid ${hov ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.07)"}`,
        background: "#0e0e10",
        boxShadow: hov
          ? `0 20px 60px 0 ${f.glow}, 0 4px 16px rgba(0,0,0,0.5)`
          : "0 2px 8px rgba(0,0,0,0.3)",
        cursor: "default",
        display: "flex",
        flexDirection: "column" as const,
        minHeight: 380,
      }}
    >
      {/* Image area */}
      <div style={{ position: "relative", height: 220, overflow: "hidden", flexShrink: 0 }}>
        <img
          src={f.img}
          alt={f.title}
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "transform .6s ease",
            transform: hov ? "scale(1.06)" : "scale(1)",
            filter: "brightness(0.55) saturate(0.8)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(180deg, ${f.color}18 0%, rgba(0,0,0,0.55) 100%)`,
            transition: "opacity .3s",
            opacity: hov ? 1 : 0.7,
          }}
        />
        <span
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            fontSize: 9,
            fontFamily: "monospace",
            fontWeight: 700,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: f.color,
            background: `rgba(0,0,0,0.7)`,
            padding: "4px 10px",
            borderRadius: 999,
            border: `1px solid ${f.color}40`,
            backdropFilter: "blur(8px)",
          }}
        >
          {f.tag}
        </span>
        <div
          style={{
            position: "absolute",
            bottom: 14,
            left: 14,
            width: 40,
            height: 40,
            borderRadius: 12,
            background: `rgba(0,0,0,0.7)`,
            border: `1px solid ${f.color}50`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            color: f.color,
            backdropFilter: "blur(8px)",
            transition: "transform .3s",
            transform: hov ? "scale(1.1) rotate(-5deg)" : "scale(1)",
          }}
        >
          {f.icon}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            background: "linear-gradient(to top, #0e0e10, transparent)",
          }}
        />
      </div>

      {/* Text body */}
      <div
        style={{
          padding: "22px 24px 28px",
          flex: 1,
          display: "flex",
          flexDirection: "column" as const,
          justifyContent: "space-between",
        }}
      >
        <div>
          <h3
            style={{
              fontWeight: 700,
              fontSize: 17,
              marginBottom: 10,
              color: "white",
              letterSpacing: "-0.015em",
              lineHeight: 1.3,
            }}
          >
            {f.title}
          </h3>
          <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.44)", lineHeight: 1.72 }}>
            {f.desc}
          </p>
        </div>
        {/* Learn more link — fades in on hover */}
        <div
          style={{
            marginTop: 18,
            opacity: hov ? 1 : 0,
            transform: hov ? "translateY(0)" : "translateY(6px)",
            transition: "opacity .3s ease, transform .3s ease",
          }}
        >
          <a
            href="#features"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: f.color,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            Learn more <span>→</span>
          </a>
        </div>
      </div>

      {/* bottom accent line */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${f.color}, transparent)`,
          opacity: hov ? 0.6 : 0,
          transition: "opacity .4s",
        }}
      />
    </div>
  );
}



/* ── Video Player ── */
function VideoPlayer() {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    setPlaying(true);
    videoRef.current?.play();
  };

  return (
    <div
      style={{ position: "relative", background: "#000", cursor: playing ? "default" : "pointer" }}
      onClick={!playing ? handlePlay : undefined}
    >
      <video
        ref={videoRef}
        controls={playing}
        playsInline
        style={{ width: "100%", display: "block", maxHeight: 620, objectFit: "cover" }}
        onEnded={() => setPlaying(false)}
      >
        <source src="/src/assets/kinetic-demo.mp4" type="video/mp4" />
      </video>

      {!playing && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column" as const,
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(2px)",
            transition: "opacity .3s",
          }}
        >
          <div style={{ position: "relative", width: 80, height: 80 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.2)",
                animation: "spinSlow 8s linear infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "2px solid transparent",
                borderTopColor: "hsl(158,64%,44%)",
                animation: "spinSlow 3s linear infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 8,
                borderRadius: "50%",
                background: "linear-gradient(135deg, hsl(158,64%,40%), hsl(158,64%,26%))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 32px rgba(0,180,100,0.45)",
                transition: "transform .2s",
              }}
              className="hover:scale-110"
            >
              <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
                <polygon points="6,4 20,12 6,20" />
              </svg>
            </div>
          </div>
          <p
            style={{
              marginTop: 20,
              fontSize: 13,
              fontFamily: "monospace",
              color: "rgba(255,255,255,0.6)",
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
            }}
          >
            Watch Demo
          </p>
        </div>
      )}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 100,
          background: "linear-gradient(to top, #080809 0%, transparent 100%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

/* ── Bento Card (extracted to avoid hooks-in-map violation) ── */
function BentoCard({
  card,
  index,
}: {
  card: {
    label: string;
    headline: string;
    sub: string;
    value: string;
    color: string;
    icon: string;
  };
  index: number;
}) {
  const [ref, vis] = useRevealBento();
  return (
    <div
      ref={ref}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? "translateY(0)" : "translateY(32px)",
        transition: `opacity .6s ease ${index * 100}ms, transform .6s ease ${index * 100}ms`,
        padding: "28px",
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.025)",
        position: "relative",
        overflow: "hidden",
        minHeight: 160,
        display: "flex",
        flexDirection: "column" as const,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${card.color}25 0%, transparent 70%)`,
        }}
      />

      {/* label with animated pulsing dot */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
        <span style={{ position: "relative", width: 8, height: 8, flexShrink: 0 }}>
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: card.color,
              animation: "bentoP 2s ease-in-out infinite",
            }}
          />
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: card.color,
              opacity: 0.35,
              animation: "bentoPing 2s ease-in-out infinite",
            }}
          />
        </span>
        <span
          style={{
            fontSize: 10,
            fontFamily: "monospace",
            fontWeight: 700,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: card.color,
          }}
        >
          {card.label}
        </span>
      </div>

      <div style={{ fontSize: 22, fontWeight: 700, color: "white" }}>{card.headline}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 6, flex: 1 }}>
        {card.sub}
      </div>
      <div
        style={{
          marginTop: 20,
          padding: "10px 14px",
          borderRadius: 10,
          background: `${card.color}18`,
          border: `1px solid ${card.color}30`,
          display: "inline-block",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: card.color, fontFamily: "monospace" }}>
          {card.value}
        </span>
      </div>
      <div style={{ position: "absolute", top: 24, right: 24, fontSize: 28, opacity: 0.12 }}>
        {card.icon}
      </div>
    </div>
  );
}

const BENTO_CARDS = [
  {
    label: "AI EXTRACTION",
    headline: "98.2% confidence",
    sub: "Vendor: UltraTech Cement Ltd.",
    value: "₹12,42,000",
    color: "hsl(158,64%,36%)",
    icon: "⬡",
  },
  {
    label: "LIVE STOCK",
    headline: "Reorder Alert",
    sub: "Cement OPC 53G — Main Site",
    value: "240 / 500 Bags",
    color: "hsl(22,90%,44%)",
    icon: "◉",
  },
  {
    label: "APPROVALS",
    headline: "12 Pending",
    sub: "₹4.2Cr total exposure",
    value: "3 Critical",
    color: "hsl(280,65%,62%)",
    icon: "⬢",
  },
];

/* ── Demo Request Form iiii── */
function DemoRequestForm() {
  const [form, setForm] = useState({ name: "", company: "", phone: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.company || !form.phone) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1400);
  };

  const fieldStyle = {
    width: "100%",
    padding: "14px 18px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)",
    color: "white",
    fontSize: 14,
    outline: "none",
    transition: "border-color .2s, background .2s",
    boxSizing: "border-box" as const,
  };

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "linear-gradient(135deg, hsl(158,64%,38%), hsl(158,64%,24%))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: "0 8px 32px rgba(0,180,100,0.4)",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="32"
            height="32"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 12 }}>
          We'll be in touch!
        </h3>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.75 }}>
          Thanks <strong style={{ color: "rgba(255,255,255,0.75)" }}>{form.name}</strong>. Our team
          will contact you at{" "}
          <strong style={{ color: "rgba(255,255,255,0.75)" }}>{form.phone}</strong> to schedule your
          personalised Kinetic demo.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Name */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontFamily: "monospace",
              textTransform: "uppercase" as const,
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.4)",
              marginBottom: 8,
            }}
          >
            Full Name *
          </label>
          <input
            id="demo-name"
            name="name"
            required
            value={form.name}
            onChange={handle}
            placeholder="Rajesh Kumar"
            style={fieldStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "hsl(158,64%,44%)";
              e.currentTarget.style.background = "rgba(255,255,255,0.07)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            }}
          />
        </div>
        {/* Company */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontFamily: "monospace",
              textTransform: "uppercase" as const,
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.4)",
              marginBottom: 8,
            }}
          >
            Company *
          </label>
          <input
            id="demo-company"
            name="company"
            required
            value={form.company}
            onChange={handle}
            placeholder="Lodha Group"
            style={fieldStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "hsl(158,64%,44%)";
              e.currentTarget.style.background = "rgba(255,255,255,0.07)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            }}
          />
        </div>
      </div>

      {/* Phone */}
      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            display: "block",
            fontSize: 11,
            fontFamily: "monospace",
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.4)",
            marginBottom: 8,
          }}
        >
          Phone Number *
        </label>
        <input
          id="demo-phone"
          name="phone"
          required
          value={form.phone}
          onChange={handle}
          placeholder="+91 98765 43210"
          type="tel"
          style={fieldStyle}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "hsl(158,64%,44%)";
            e.currentTarget.style.background = "rgba(255,255,255,0.07)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          }}
        />
      </div>

      {/* Message */}
      <div style={{ marginBottom: 32 }}>
        <label
          style={{
            display: "block",
            fontSize: 11,
            fontFamily: "monospace",
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.4)",
            marginBottom: 8,
          }}
        >
          Tell us about your project <span style={{ opacity: 0.5 }}>(optional)</span>
        </label>
        <textarea
          id="demo-message"
          name="message"
          value={form.message}
          onChange={handle}
          rows={3}
          placeholder="e.g. We manage 8 active sites across Mumbai, looking for materials + billing automation..."
          style={{ ...fieldStyle, resize: "none" as const, lineHeight: 1.65 }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "hsl(158,64%,44%)";
            e.currentTarget.style.background = "rgba(255,255,255,0.07)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          }}
        />
      </div>

      {/* Submit */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap" as const,
          gap: 16,
        }}
      >
        <p
          style={{
            fontSize: 11.5,
            color: "rgba(255,255,255,0.28)",
            lineHeight: 1.6,
            maxWidth: 320,
          }}
        >
          🔒 Your details are confidential. We'll respond within 1 business day.
        </p>
        <button
          id="demo-submit"
          type="submit"
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "15px 40px",
            borderRadius: 14,
            background: loading
              ? "rgba(0,180,100,0.3)"
              : "linear-gradient(135deg, hsl(158,64%,42%), hsl(158,64%,26%))",
            color: "white",
            fontWeight: 700,
            fontSize: 14,
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: loading ? "none" : "0 0 48px rgba(0,180,100,0.28)",
            transition: "transform .2s, box-shadow .2s, background .3s",
            transform: loading ? "scale(1)" : undefined,
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.transform = "scale(1.04)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {loading ? (
            <>
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "white",
                  animation: "spinSlow 0.8s linear infinite",
                  display: "block",
                }}
              />
              Sending…
            </>
          ) : (
            <>
              Book My Demo <span style={{ opacity: 0.6 }}>→</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

/* ── main page ── */
function LandingPage() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#080809", color: "white", overflowX: "hidden" }}>
      <style>{`
        @keyframes hFadeUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes mLeft   { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes mRight  { 0%{transform:translateX(-50%)} 100%{transform:translateX(0)} }
        @keyframes gridPulse { 0%,100%{opacity:.025} 50%{opacity:.055} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }
        @keyframes spinSlow { to{transform:rotate(360deg)} }
        @keyframes bentoP { 0%,100%{transform:scale(1)} 50%{transform:scale(0.85)} }
        @keyframes bentoPing { 0%{transform:scale(1);opacity:.35} 100%{transform:scale(2.4);opacity:0} }
        .marquee-l { animation: mLeft  34s linear infinite; }
        .marquee-r { animation: mRight 38s linear infinite; }
        .marquee-l:hover, .marquee-r:hover { animation-play-state:paused; }
      `}</style>

      {/* NAV */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 40px",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(8,8,9,0.85)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: "linear-gradient(135deg, hsl(158,64%,38%), hsl(158,64%,24%))",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 2px 12px rgba(0,180,100,0.35)",
            }}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="white">
              <rect x="2" y="2" width="5" height="5" rx="1" />
              <rect x="9" y="2" width="5" height="5" rx="1" opacity=".5" />
              <rect x="2" y="9" width="5" height="5" rx="1" opacity=".5" />
              <rect x="9" y="9" width="5" height="5" rx="1" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, letterSpacing: "-0.025em", fontSize: 15 }}>KINETIC</span>
        </div>
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            fontSize: 13,
            color: "rgba(255,255,255,0.48)",
          }}
          className="hidden md:flex"
        >
          {["#features", "#proof", "#demo", "#testimonials", "#request-demo"].map((h, i) => (
            <a key={i} href={h} style={{ transition: "color .2s" }} className="hover:text-white">
              {["Features", "Platform", "Demo", "Testimonials", "Request Demo"][i]}
            </a>
          ))}
          <Link
            to="/dashboard"
            style={{
              marginLeft: 8,
              padding: "8px 22px",
              borderRadius: 10,
              background: "linear-gradient(135deg, hsl(158,64%,38%), hsl(158,64%,26%))",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 4px 16px rgba(0,180,100,0.35)",
              transition: "transform .2s, box-shadow .2s",
            }}
            className="hover:scale-[1.04] hover:shadow-[0_6px_24px_rgba(0,180,100,0.45)]"
          >
            Open Dashboard →
          </Link>
        </nav>
        <Link
          to="/dashboard"
          className="md:hidden"
          style={{
            padding: "8px 16px",
            borderRadius: 10,
            background: "hsl(158,64%,32%)",
            color: "white",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Dashboard →
        </Link>
      </header>

      {/* HERO */}
      <section
        style={{
          position: "relative",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* animated grid bg */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.04,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            animation: "gridPulse 4s ease-in-out infinite",
          }}
        />
        {/* subtle noise/grain texture overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
            opacity: 0.35,
            pointerEvents: "none",
            mixBlendMode: "overlay" as const,
          }}
        />
        <div style={{ position: "absolute", inset: 0 }}>
          {isMounted && (
            <Suspense fallback={null}>
              <Threads
                amplitude={1.5}
                distance={0.35}
                enableMouseInteraction
                color={[0.1, 0.78, 0.48]}
              />
            </Suspense>
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to bottom, rgba(8,8,9,.5) 0%, transparent 35%, #080809 100%)",
            }}
          />
        </div>
        {/* ambient orbs */}
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "15%",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,180,100,0.07) 0%, transparent 70%)",
            pointerEvents: "none",
            animation: "float 6s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "25%",
            right: "12%",
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(22,130,230,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
            animation: "float 8s ease-in-out infinite 2s",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 10,
            textAlign: "center",
            padding: "0 24px",
            maxWidth: 960,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 16px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              backdropFilter: "blur(12px)",
              fontSize: 11,
              fontFamily: "monospace",
              textTransform: "uppercase" as const,
              letterSpacing: "0.12em",
              color: "rgba(255,255,255,0.55)",
              marginBottom: 36,
              animation: "hFadeUp .8s ease .1s both",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "hsl(158,64%,44%)",
                display: "block",
                boxShadow: "0 0 6px hsl(158,64%,44%)",
              }}
            />
            AI-Powered Construction Intelligence
          </div>
          <h1
            style={{
              fontSize: "clamp(44px,7.5vw,86px)",
              fontWeight: 800,
              letterSpacing: "-0.045em",
              lineHeight: 1.03,
              marginBottom: 28,
              animation: "hFadeUp .8s ease .2s both",
            }}
          >
            Build Faster.
            <br />
            <span
              style={{
                backgroundImage:
                  "linear-gradient(135deg, hsl(158,64%,60%) 0%, hsl(158,64%,38%) 50%, hsl(158,50%,28%) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Know Everything.
            </span>
          </h1>
          <p
            style={{
              fontSize: 17,
              color: "rgba(255,255,255,0.46)",
              maxWidth: 540,
              margin: "0 auto 44px",
              lineHeight: 1.72,
              animation: "hFadeUp .8s ease .35s both",
            }}
          >
            Kinetic gives Indian construction teams a single command centre for projects, materials,
            vendor bills, and approvals — with AI doing the heavy lifting.
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap" as const,
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              animation: "hFadeUp .8s ease .5s both",
            }}
          >
            <Link
              to="/dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "15px 36px",
                borderRadius: 14,
                background: "linear-gradient(135deg, hsl(158,64%,42%), hsl(158,64%,28%))",
                color: "white",
                fontWeight: 700,
                fontSize: 14,
                boxShadow: "0 0 48px rgba(0,180,100,0.3)",
                transition: "transform .25s, box-shadow .25s",
              }}
              className="hover:scale-[1.04]"
            >
              Open Dashboard <span style={{ opacity: 0.6 }}>→</span>
            </Link>
            <a
              href="#features"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "15px 32px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.14)",
                color: "rgba(255,255,255,0.7)",
                fontWeight: 500,
                fontSize: 14,
                backdropFilter: "blur(12px)",
                transition: "border-color .2s, color .2s",
              }}
              className="hover:border-white/30 hover:text-white"
            >
              See Features
            </a>
          </div>


        </div>
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column" as const,
            alignItems: "center",
            gap: 8,
            color: "rgba(255,255,255,0.24)",
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontFamily: "monospace",
              textTransform: "uppercase" as const,
              letterSpacing: "0.14em",
            }}
          >
            Scroll
          </span>
          <div
            style={{
              width: 1,
              height: 36,
              background: "linear-gradient(to bottom, rgba(255,255,255,.24), transparent)",
            }}
          />
        </div>
      </section>



      {/* FEATURES — all 6 badges in one combined lanyard showcase */}
      <section id="features" style={{ padding: "100px 40px 0" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", textAlign: "center" }}>
          <p
            style={{
              fontSize: 10,
              fontFamily: "monospace",
              textTransform: "uppercase" as const,
              letterSpacing: "0.16em",
              color: "hsl(158,64%,44%)",
              marginBottom: 14,
            }}
          >
            Platform Capabilities
          </p>
          <h2
            style={{
              fontSize: "clamp(34px,5vw,60px)",
              fontWeight: 800,
              letterSpacing: "-0.045em",
              lineHeight: 1.08,
            }}
          >
            Everything your site needs
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.4)",
              maxWidth: 480,
              margin: "18px auto 0",
              lineHeight: 1.7,
            }}
          >
            From breaking ground to handover — one platform covers it all.
          </p>
          <p
            style={{
              fontSize: 12,
              fontFamily: "monospace",
              color: "rgba(255,255,255,0.22)",
              marginTop: 14,
              letterSpacing: "0.06em",
            }}
          >
            Drag any badge to swing it ↓
          </p>
        </div>
      </section>

      {/* Single canvas — all 6 feature badges together */}
      <section
        style={{ height: "820px", background: "#080809", position: "relative", overflow: "hidden" }}
      >
        {isMounted && (
          <Suspense
            fallback={
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    border: "2px solid transparent",
                    borderTopColor: "hsl(158,64%,44%)",
                    animation: "spinSlow 1s linear infinite",
                  }}
                />
              </div>
            }
          >
            <MultiBadgeLanyard
              position={[0, 0, 28]}
              gravity={[0, -40, 0]}
              fov={30}
              badges={[
                { frontImage: trackingCardSvg, lanyardColor: "#00c87a", offsetX: -8.25 },
                { frontImage: financeCardSvg, lanyardColor: "#3b9ef5", offsetX: -4.95 },
                { frontImage: inventoryCardSvg, lanyardColor: "#f59e0b", offsetX: -1.65 },
                { frontImage: approvalCardSvg, lanyardColor: "#9c5af5", offsetX: 1.65 },
                { frontImage: docsCardSvg, lanyardColor: "#3b82f6", offsetX: 4.95 },
                { frontImage: workforceCardSvg, lanyardColor: "#f43f6e", offsetX: 8.25 },
              ]}
            />
          </Suspense>
        )}

        {/* All 6 label chips */}
        <div
          style={{
            position: "absolute",
            bottom: 36,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 28,
            flexWrap: "wrap" as const,
            pointerEvents: "none",
            padding: "0 24px",
          }}
        >
          {[
            { label: "Live Project Pipeline", tag: "TRACKING", color: "hsl(158,64%,44%)" },
            { label: "AI Bill Extraction", tag: "FINANCE", color: "hsl(210,85%,62%)" },
            { label: "Material Intelligence", tag: "INVENTORY", color: "hsl(40,90%,56%)" },
            { label: "Approval Center", tag: "WORKFLOW", color: "hsl(280,65%,62%)" },
            { label: "Document Repository", tag: "DOCS", color: "hsl(210,80%,58%)" },
            { label: "Workforce & Labour", tag: "HR", color: "hsl(340,70%,58%)" },
          ].map((item) => (
            <div key={item.tag} style={{ textAlign: "center" }}>
              <span
                style={{
                  display: "inline-block",
                  fontSize: 9,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                  color: item.color,
                  background: `${item.color}18`,
                  border: `1px solid ${item.color}40`,
                  padding: "3px 10px",
                  borderRadius: 999,
                  marginBottom: 5,
                }}
              >
                {item.tag}
              </span>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.55)",
                  margin: 0,
                }}
              >
                {item.label}
              </p>
            </div>
          ))}
        </div>

        {/* bottom fade */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            background: "linear-gradient(to top, #080809, transparent)",
            pointerEvents: "none",
          }}
        />
      </section>

      {/* BENTO PREVIEW */}
      <section style={{ padding: "0 40px 130px" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <div style={{ marginBottom: 56, textAlign: "center" }}>
            <p
              style={{
                fontSize: 10,
                fontFamily: "monospace",
                textTransform: "uppercase" as const,
                letterSpacing: "0.16em",
                color: "hsl(158,64%,44%)",
                marginBottom: 14,
              }}
            >
              Live Platform Preview
            </p>
            <h2
              style={{
                fontSize: "clamp(28px,4vw,48px)",
                fontWeight: 800,
                letterSpacing: "-0.04em",
              }}
            >
              See it in action
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {BENTO_CARDS.map((card, i) => (
              <BentoCard key={card.label} card={card} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* VIDEO SHOWCASE */}
      <section id="demo" style={{ padding: "0 40px 130px" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <div style={{ marginBottom: 56, textAlign: "center" }}>
            <p
              style={{
                fontSize: 10,
                fontFamily: "monospace",
                textTransform: "uppercase" as const,
                letterSpacing: "0.16em",
                color: "hsl(158,64%,44%)",
                marginBottom: 14,
              }}
            >
              Platform in Action
            </p>
            <h2
              style={{
                fontSize: "clamp(28px,4vw,48px)",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                lineHeight: 1.1,
              }}
            >
              Watch Kinetic work
            </h2>
            <p
              style={{
                fontSize: 15,
                color: "rgba(255,255,255,0.4)",
                maxWidth: 460,
                margin: "14px auto 0",
                lineHeight: 1.7,
              }}
            >
              See how AI extracts vendor invoices, tracks materials, and routes approvals in real
              time.
            </p>
          </div>

          <div
            style={{
              position: "relative",
              borderRadius: 24,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
              background: "#000",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 18px",
                background: "rgba(255,255,255,0.04)",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
              <div
                style={{
                  marginLeft: 12,
                  flex: 1,
                  height: 20,
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.3)" }}
                >
                  kinetic.app/dashboard
                </span>
              </div>
            </div>
            <VideoPlayer />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 32,
              marginTop: 32,
              flexWrap: "wrap" as const,
            }}
          >
            {[
              { label: "AI Invoice Parsing", color: "hsl(158,64%,44%)" },
              { label: "Live Stock Ledger", color: "hsl(22,90%,52%)" },
              { label: "Approval Workflows", color: "hsl(210,80%,58%)" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: item.color,
                    display: "block",
                    boxShadow: `0 0 6px ${item.color}`,
                  }}
                />
                <span
                  style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: "monospace" }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* REQUEST A DEMO */}
      <section id="request-demo" style={{ padding: "0 40px 140px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", position: "relative" }}>
          {/* ambient glow */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: 700,
              height: 400,
              borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(0,180,100,0.08) 0%, transparent 70%)",
              pointerEvents: "none",
              filter: "blur(40px)",
              zIndex: 0,
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 1,
              borderRadius: 28,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.028)",
              backdropFilter: "blur(24px)",
              overflow: "hidden",
              boxShadow: "0 40px 100px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)",
            }}
          >
            {/* top accent stripe */}
            <div
              style={{
                height: 3,
                background:
                  "linear-gradient(90deg, hsl(158,64%,38%), hsl(158,64%,56%), hsl(210,85%,60%), transparent)",
              }}
            />

            <div style={{ padding: "56px 64px 64px" }}>
              {/* header */}
              <div style={{ textAlign: "center", marginBottom: 48 }}>
                <p
                  style={{
                    fontSize: 10,
                    fontFamily: "monospace",
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.16em",
                    color: "hsl(158,64%,44%)",
                    marginBottom: 14,
                  }}
                >
                  Get Started
                </p>
                <h2
                  style={{
                    fontSize: "clamp(28px,4.5vw,52px)",
                    fontWeight: 800,
                    letterSpacing: "-0.045em",
                    lineHeight: 1.1,
                    marginBottom: 16,
                  }}
                >
                  Request a Demo
                </h2>
                <p
                  style={{
                    fontSize: 15,
                    color: "rgba(255,255,255,0.38)",
                    maxWidth: 440,
                    margin: "0 auto",
                    lineHeight: 1.75,
                  }}
                >
                  See Kinetic live on your construction workflows. Our team will set up a
                  personalised walkthrough for you.
                </p>
              </div>

              {/* form */}
              <DemoRequestForm />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "0 40px 140px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: -1,
              filter: "blur(90px)",
              opacity: 0.2,
              background: "radial-gradient(ellipse, hsl(158,64%,32%) 0%, transparent 70%)",
              borderRadius: "50%",
            }}
          />
          <p
            style={{
              fontSize: 10,
              fontFamily: "monospace",
              textTransform: "uppercase" as const,
              letterSpacing: "0.16em",
              color: "hsl(158,64%,44%)",
              marginBottom: 20,
            }}
          >
            Ready to start
          </p>
          <h2
            style={{
              fontSize: "clamp(32px,5.5vw,64px)",
              fontWeight: 800,
              letterSpacing: "-0.048em",
              marginBottom: 22,
              lineHeight: 1.07,
            }}
          >
            Your entire operation,
            <br />
            in one place.
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "rgba(255,255,255,0.38)",
              lineHeight: 1.75,
              maxWidth: 500,
              margin: "0 auto 44px",
            }}
          >
            Trusted by senior project heads managing India's largest residential and commercial
            builds.
          </p>
          <Link
            to="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "17px 44px",
              borderRadius: 16,
              background: "linear-gradient(135deg, hsl(158,64%,42%), hsl(158,64%,26%))",
              color: "white",
              fontWeight: 800,
              fontSize: 15,
              boxShadow: "0 0 64px rgba(0,180,100,0.25)",
              transition: "transform .25s, box-shadow .25s",
            }}
            className="hover:scale-[1.04]"
          >
            Open Dashboard <span style={{ opacity: 0.6 }}>→</span>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(0,0,0,0.3)",
          padding: "64px 40px 40px",
        }}
      >
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          {/* top grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr",
              gap: 48,
              marginBottom: 56,
            }}
            className="grid-cols-1 md:grid-cols-[2fr_1fr_1fr]"
          >
            {/* brand col */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 9,
                    background: "linear-gradient(135deg, hsl(158,64%,38%), hsl(158,64%,24%))",
                    display: "grid",
                    placeItems: "center",
                    boxShadow: "0 2px 10px rgba(0,180,100,0.3)",
                  }}
                >
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="white">
                    <rect x="2" y="2" width="5" height="5" rx="1" />
                    <rect x="9" y="2" width="5" height="5" rx="1" opacity=".5" />
                    <rect x="2" y="9" width="5" height="5" rx="1" opacity=".5" />
                    <rect x="9" y="9" width="5" height="5" rx="1" />
                  </svg>
                </div>
                <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.015em" }}>
                  KINETIC
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.36)",
                  lineHeight: 1.78,
                  maxWidth: 280,
                }}
              >
                AI-powered construction operations for Indian builders. One platform for projects,
                materials, vendors, and approvals.
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                {["Twitter / X", "LinkedIn", "GitHub"].map((s) => (
                  <span
                    key={s}
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.3)",
                      fontFamily: "monospace",
                      cursor: "pointer",
                      transition: "color .2s",
                    }}
                    className="hover:text-white"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Product links */}
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                  color: "rgba(255,255,255,0.35)",
                  marginBottom: 18,
                }}
              >
                Product
              </p>
              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  display: "flex",
                  flexDirection: "column" as const,
                  gap: 12,
                }}
              >
                {[
                  { label: "Features", href: "#features" },
                  { label: "Live Platform", href: "#proof" },
                  { label: "Watch Demo", href: "#demo" },
                  { label: "Testimonials", href: "#testimonials" },
                  { label: "Dashboard →", href: "/dashboard" },
                ].map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      style={{
                        fontSize: 13,
                        color: "rgba(255,255,255,0.44)",
                        textDecoration: "none",
                        transition: "color .2s",
                      }}
                      className="hover:text-white"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company links */}
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                  color: "rgba(255,255,255,0.35)",
                  marginBottom: 18,
                }}
              >
                Company
              </p>
              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  display: "flex",
                  flexDirection: "column" as const,
                  gap: 12,
                }}
              >
                {[
                  { label: "About Us" },
                  { label: "Careers" },
                  { label: "Press Kit" },
                  { label: "Privacy Policy" },
                  { label: "Terms of Service" },
                  { label: "Contact" },
                ].map((l) => (
                  <li key={l.label}>
                    <a
                      href="#"
                      style={{
                        fontSize: 13,
                        color: "rgba(255,255,255,0.44)",
                        textDecoration: "none",
                        transition: "color .2s",
                      }}
                      className="hover:text-white"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 28 }} />

          {/* bottom row */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap" as const,
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", fontFamily: "monospace" }}>
              © 2025 Kinetic Operations Pvt. Ltd. All rights reserved.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "hsl(158,64%,44%)",
                  display: "block",
                  boxShadow: "0 0 6px hsl(158,64%,44%)",
                }}
              />
              <span
                style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontFamily: "monospace" }}
              >
                All systems operational
              </span>
            </div>
            <Link
              to="/dashboard"
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.38)",
                fontFamily: "monospace",
                textTransform: "uppercase" as const,
                letterSpacing: "0.1em",
                transition: "color .2s",
                textDecoration: "none",
              }}
              className="hover:text-white"
            >
              Enter Platform →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* extra hook for bento cards (avoids call-order issues with .map) */
function useRevealBento(): [RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVis(true);
          obs.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, vis];
}
