import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Menu, Play, Plus, X } from "lucide-react";
import siteCranes from "../assets/site-cranes-4k.jpg";
import siteSlab from "../assets/site-slab-4k.jpg";
import siteSteel from "../assets/site-steel-4k.jpg";
import kineticDemo from "../assets/kinetic-demo.mp4";
import "../styles/landing.css";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kenetic" },
      {
        name: "description",
        content:
          "Bring projects, people, materials and finances together. Construction operations built for the way your team works.",
      },
    ],
  }),
  component: LandingPage,
});

const OPERATIONS = [
  {
    title: "Project control",
    label: "From the first plan to the final pour.",
    description:
      "Keep site progress, BOQs, inspections and issues connected to the project. Give your office and site teams a shared view of the work ahead.",
    tags: ["Projects & BOQ", "Daily progress", "Site inspections"],
    image: siteCranes,
    alt: "Tower cranes above an active construction site",
  },
  {
    title: "People & payroll",
    label: "Your people. Your most important resource.",
    description:
      "Manage workers, project allocations, attendance and payroll in one place. Follow daily wages and outstanding payments without losing the detail behind them.",
    tags: ["Worker allocation", "Attendance", "Payroll & wages"],
    image: siteSlab,
    alt: "Construction work on a concrete slab",
  },
  {
    title: "Materials & movement",
    label: "Keep the right resources moving.",
    description:
      "Connect material requests, warehouse stock, vendors and site logistics. Follow receipts and approvals so your team knows what is needed and what has arrived.",
    tags: ["Inventory", "Material approvals", "Transport & logistics"],
    image: siteSteel,
    alt: "Structural steel at a construction site",
  },
  {
    title: "Finance & approvals",
    label: "Every decision deserves a clear trail.",
    description:
      "Bring expenses, vendor bills, payments and documents into a shared workflow. Review project spending, manage approvals and trace changes through the audit history.",
    tags: ["Bills & payments", "Spending reports", "Document control"],
    image: siteCranes,
    alt: "Construction project with tower cranes",
  },
];
const QUESTIONS = [
  {
    question: "What can I manage with Kenetic?",
    answer:
      "Kenetic brings project tracking, BOQs, site activity, workers, attendance, materials, inventory, logistics, bills, payments and payroll into a shared construction workspace.",
  },
  {
    question: "Can our site and office teams work together?",
    answer:
      "Yes. Your team works within the same organization and project records. Access depends on the account's assigned role and project permissions.",
  },
  {
    question: "How do I get access to the platform?",
    answer:
      "Accounts are created by an authorized administrator. Once you receive your invitation, open the sign-in page and use your temporary password to activate your account.",
  },
  {
    question: "Can I use it from a phone on site?",
    answer:
      "The workspace supports mobile browsers. Location-based attendance requires location permission and a secure HTTPS connection.",
  },
];
function Brand() {
  return (
    <a href="#top" className="kl-brand" aria-label="Kenetic home">
      <img src="/logo.png" alt="" width={44} height={44} />
      <span>
        KENETIC<span className="kl-brand-caption">CONSTRUCTION OPERATIONS</span>
      </span>
    </a>
  );
}
function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeOperation, setActiveOperation] = useState(0);
  const pageRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const updateScroll = () => setScrolled(window.scrollY > 36);
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
      },
      { threshold: 0.08 },
    );
    pageRef.current?.querySelectorAll(".kl-reveal").forEach((element) => observer.observe(element));
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);
  const closeDemo = () => {
    videoRef.current?.pause();
    dialogRef.current?.close();
  };
  return (
    <div className="kinetic-landing" ref={pageRef} id="top">
      <a className="kl-skip" href="#main-content">
        Skip to content
      </a>
      <header className={`kl-header${scrolled || menuOpen ? " is-scrolled" : ""}`}>
        <div className="kl-container kl-nav">
          <Brand />
          <nav aria-label="Main navigation" className="kl-desktop-nav">
            <a href="#platform">The platform</a>
            <a href="#operations">What we do</a>
            <a href="#approach">Our approach</a>
            <Link to="/login" className="kl-nav-cta">
              Enter workspace <ArrowUpRight size={15} />
            </Link>
          </nav>
          <button
            className="kl-menu-toggle"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="kl-mobile-nav"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        <nav
          hidden={!menuOpen}
          className="kl-mobile-nav"
          id="kl-mobile-nav"
          aria-label="Mobile navigation"
        >
          <a href="#platform" onClick={() => setMenuOpen(false)}>
            The platform <ArrowUpRight />
          </a>
          <a href="#operations" onClick={() => setMenuOpen(false)}>
            What we do <ArrowUpRight />
          </a>
          <a href="#approach" onClick={() => setMenuOpen(false)}>
            Our approach <ArrowUpRight />
          </a>
          <Link to="/login" onClick={() => setMenuOpen(false)}>
            Enter workspace <ArrowUpRight />
          </Link>
        </nav>
      </header>
      <main id="main-content">
        <section className="kl-hero" aria-labelledby="hero-title">
          <img className="kl-hero-image" src={siteCranes} alt="" fetchPriority="high" />
          <div className="kl-hero-shade" />
          <div className="kl-container kl-hero-content">
            <div className="kl-hero-topline">
              <span>
                <i /> Built for the people who build.
              </span>
              <span>PLAN. CONNECT. BUILD.</span>
            </div>
            <div className="kl-hero-bottom">
              <p className="kl-eyebrow kl-hero-eyebrow">Construction, connected.</p>
              <h1 id="hero-title">
                EVERY SITE.
                <br />
                <span>IN SYNC.</span>
              </h1>
              <div className="kl-hero-detail">
                <p>
                  From the ground up.
                  <br />
                  From site to office.
                  <br />
                  <span>One connected workspace.</span>
                </p>
                <button
                  className="kl-play"
                  onClick={() => dialogRef.current?.showModal()}
                  aria-label="Watch the Kenetic platform film"
                >
                  <span>
                    <Play size={19} fill="currentColor" />
                  </span>
                  Watch the film
                </button>
              </div>
              <div className="kl-hero-baseline">
                <a href="#platform">
                  Explore Kenetic <ArrowDown size={16} />
                </a>
                <span>PROJECTS / PEOPLE / PROGRESS</span>
              </div>
            </div>
          </div>
        </section>
        <section
          className="kl-statement kl-container"
          id="platform"
          aria-labelledby="platform-title"
        >
          <div className="kl-section-label kl-reveal">
            <span className="kl-eyebrow">01 / The bigger picture</span>
            <span className="kl-eyebrow">Built around your work</span>
          </div>
          <h2 className="kl-statement-text kl-reveal" id="platform-title">
            GREAT BUILDS START
            <br />
            WITH <span>CLARITY.</span>
            <br />
            WE BRING IT TO
            <br />
            <span className="kl-outline">EVERY DETAIL.</span>
          </h2>
          <div className="kl-statement-bottom kl-reveal">
            <span className="kl-cross" aria-hidden="true">
              ✳
            </span>
            <p>
              Construction moves fast. Your information should keep up. Kenetic brings your
              projects, people, materials and finances together, so the whole team can move forward
              with a shared view.
            </p>
            <a href="#operations" className="kl-text-link">
              Meet your workspace <ArrowUpRight size={20} />
            </a>
          </div>
        </section>
        <div className="kl-ticker" aria-label="Plan. Connect. Build. Repeat.">
          <div aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i}>
                PLAN <b>✳</b> CONNECT <b>✳</b> BUILD <b>✳</b> REPEAT <b>✳</b>
              </span>
            ))}
          </div>
        </div>
        <section
          className="kl-operations kl-container"
          id="operations"
          aria-labelledby="operations-title"
        >
          <div className="kl-section-label kl-reveal">
            <span className="kl-eyebrow">02 / What we do</span>
            <span className="kl-eyebrow">One platform. Every moving part.</span>
          </div>
          <div className="kl-section-heading kl-reveal">
            <h2 id="operations-title">
              THE WORK.
              <br />
              <span>CONNECTED.</span>
            </h2>
            <p>
              A clear view of the big picture.
              <br />A closer look at what matters.
            </p>
          </div>
          <div className="kl-operation-layout kl-reveal">
            <div className="kl-operation-list">
              {OPERATIONS.map((operation, index) => (
                <div
                  key={operation.title}
                  className={`kl-operation${index === activeOperation ? " is-active" : ""}`}
                >
                  <h3>
                    <button
                      onClick={() => setActiveOperation(index)}
                      aria-expanded={index === activeOperation}
                      aria-controls={`operation-panel-${index}`}
                      id={`operation-button-${index}`}
                    >
                      <span className="kl-operation-number">0{index + 1} /</span>
                      <span>{operation.title}</span>
                      <Plus size={21} />
                    </button>
                  </h3>
                  <div
                    id={`operation-panel-${index}`}
                    role="region"
                    aria-labelledby={`operation-button-${index}`}
                    hidden={index !== activeOperation}
                    className="kl-operation-body"
                  >
                    <p>{operation.description}</p>
                    <div className="kl-tags">
                      {operation.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              <Link to="/login" className="kl-text-link kl-operation-link">
                Open your workspace <ArrowUpRight size={20} />
              </Link>
            </div>
            <div className="kl-operation-visual">
              <img
                key={activeOperation}
                src={OPERATIONS[activeOperation].image}
                alt={OPERATIONS[activeOperation].alt}
                loading="lazy"
              />
              <div className="kl-visual-caption">
                <span className="kl-eyebrow">KENETIC / 0{activeOperation + 1}</span>
                <p>{OPERATIONS[activeOperation].label}</p>
                <span className="kl-visual-mark" aria-hidden="true">
                  K.
                </span>
              </div>
            </div>
          </div>
        </section>
        <section className="kl-site-story" aria-labelledby="story-title">
          <img src={siteSlab} alt="Concrete slab construction in progress" loading="lazy" />
          <div className="kl-container kl-story-content kl-reveal">
            <span className="kl-eyebrow">Made for the real world</span>
            <h2 id="story-title">
              ON THE GROUND.
              <br />
              <span>ON THE SAME PAGE.</span>
            </h2>
            <p>
              From the morning attendance to the last material receipt.
              <br />
              Keep the day's work connected to the people making it happen.
            </p>
            <button className="kl-text-link" onClick={() => dialogRef.current?.showModal()}>
              See Kenetic in motion <Play size={16} />
            </button>
          </div>
        </section>
        <section
          className="kl-approach kl-container"
          id="approach"
          aria-labelledby="approach-title"
        >
          <div className="kl-section-label kl-reveal">
            <span className="kl-eyebrow">03 / Our approach</span>
            <span className="kl-eyebrow">Less friction. More focus.</span>
          </div>
          <div className="kl-section-heading kl-reveal">
            <h2 id="approach-title">
              GOOD SYSTEMS.
              <br />
              <span>BETTER BUILDS.</span>
            </h2>
            <p>
              Designed around the way
              <br />
              construction teams actually work.
            </p>
          </div>
          <div className="kl-principles kl-reveal">
            <article>
              <span className="kl-principle-number">01 /</span>
              <h3>ONE SHARED VIEW.</h3>
              <p>
                Bring site activity and office decisions into the same workspace. Keep project
                information together instead of scattered across conversations.
              </p>
              <ArrowUpRight aria-hidden="true" />
            </article>
            <article>
              <span className="kl-principle-number">02 /</span>
              <h3>CLEAR RESPONSIBILITY.</h3>
              <p>
                Give administrators and supervisors access for their role. Keep approvals, project
                assignments and account permissions explicit.
              </p>
              <ArrowUpRight aria-hidden="true" />
            </article>
            <article>
              <span className="kl-principle-number">03 /</span>
              <h3>DETAILS THAT MATTER.</h3>
              <p>
                Follow the records behind your spending, attendance and payments. Keep an audit
                history of changes as the work moves forward.
              </p>
              <ArrowUpRight aria-hidden="true" />
            </article>
          </div>
        </section>
        <section className="kl-faq kl-container" aria-labelledby="faq-title">
          <div className="kl-faq-heading kl-reveal">
            <span className="kl-eyebrow">04 / A little more clarity</span>
            <h2 id="faq-title">
              GOOD
              <br />
              <span>QUESTIONS.</span>
            </h2>
          </div>
          <div className="kl-faq-list kl-reveal">
            {QUESTIONS.map((item) => (
              <details key={item.question}>
                <summary>
                  {item.question}
                  <Plus size={20} aria-hidden="true" />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="kl-cta kl-container kl-reveal" aria-labelledby="cta-title">
          <span className="kl-eyebrow">Your next build starts here.</span>
          <Link to="/login" className="kl-cta-link">
            <h2 id="cta-title">
              LET'S GET
              <br />
              <span>TO WORK.</span>
            </h2>
            <span className="kl-cta-arrow">
              <ArrowUpRight strokeWidth={1} />
            </span>
          </Link>
          <div className="kl-cta-bottom">
            <p>Have an account? Step into your workspace.</p>
            <Link to="/login" className="kl-text-link">
              Sign in to Kenetic <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>
      <dialog
        ref={dialogRef}
        className="kl-film-dialog"
        aria-labelledby="film-title"
        onClose={() => videoRef.current?.pause()}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDemo();
        }}
      >
        <div className="kl-film-inner">
          <div className="kl-film-header">
            <h2 id="film-title">KENETIC / THE PLATFORM FILM</h2>
            <button onClick={closeDemo} aria-label="Close platform film" autoFocus>
              <X />
            </button>
          </div>
          <video
            ref={videoRef}
            src={kineticDemo}
            controls
            playsInline
            preload="none"
            aria-label="Kenetic platform overview video"
          />
          <p>Explore the platform. Sign in to access your organization's workspace.</p>
        </div>
      </dialog>
    </div>
  );
}
