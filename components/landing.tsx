"use client";
import { useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Search, ShieldCheck, CalendarDays, Repeat2 } from "lucide-react";
import { Brand, Footer, ToolIcon } from "./brand";
import { ToolVisual } from "./tool-visual";
import { categories } from "@/lib/domain";
export function Landing({
  tools,
  setup = false,
  signIn,
  demo = false,
}: {
  tools: { name: string; category: string }[];
  setup?: boolean;
  signIn?: ReactNode;
  demo?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All tools");
  const visible = tools.filter(
    (t) =>
      (category === "All tools" || t.category === category) &&
      t.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div id="top" className="site landing">
      {demo && (
        <div className="demo-banner">
          <strong>Public-page preview</strong>
          <span>Sample tools · portfolio demonstration</span>
          <a href="/demo">
            Open workspace <ArrowUpRight size={14} />
          </a>
        </div>
      )}
      <div className="market-announcement">A little borrowing. A lot more possibility.</div>
      <header className="topbar">
        <Brand />
        <nav>
          <a href="#tools">Browse tools</a>
          <a href="#how">How it works</a>
          {signIn ?? (
            <a className="button primary small" href="/demo">
              Join the neighborhood <ArrowRight size={16} />
            </a>
          )}
        </nav>
      </header>
      <main>
        <section className="market-hero">
          <div>
            <span className="eyebrow">THE NEIGHBORHOOD TOOL LIBRARY</span>
            <h1>
              Your next project.
              <br />
              <em>Already on someone’s shelf.</em>
            </h1>
            <p>
              Find the tools you need, borrow from your neighbors, and make room for more
              possibilities.
            </p>
            <a className="button primary" href="#tools">
              Explore the tools <ArrowRight size={18} />
            </a>
            <span className="hero-footnote">Borrow. Create. Return. Repeat.</span>
          </div>
          <div className="hero-products">
            <div className="hero-product">
              <ToolVisual category="Power tools" />
              <div>
                <strong>Big ideas. Small toolbox.</strong>
                <span>The right equipment, for just the time you need.</span>
              </div>
            </div>
            <div className="hero-product-mini">
              <ToolVisual category="Camping" />
              <span>For the weekend, too.</span>
            </div>
          </div>
        </section>
        <div className="market-benefits">
          <span>
            <CalendarDays size={19} />
            Choose your dates
          </span>
          <span>
            <ShieldCheck size={19} />
            Owner-approved requests
          </span>
          <span>
            <Repeat2 size={19} />
            Share more. Store less.
          </span>
        </div>
        {setup && (
          <aside className="setup-banner">
            <strong>Workspace connection pending.</strong>
            <span>Explore the sample catalog while account setup is completed.</span>
            <a href="/demo">Open demo →</a>
          </aside>
        )}
        <section id="tools" className="shelf-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">FIND SOMETHING USEFUL</span>
              <h2>Browse the neighborhood</h2>
            </div>
            <label className="search">
              <Search size={18} />
              <input
                aria-label="Search public tools"
                placeholder="What are you working on?"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>
          <div className="category-chips public-categories">
            {["All tools", ...categories].map((c) => (
              <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>
                {c !== "All tools" && <ToolIcon category={c} size={18} />} {c}
              </button>
            ))}
          </div>
          <div className="results-label">
            {visible.length} tools available today
            <span>Sign in for details and borrowing dates · category illustrations</span>
          </div>
          {visible.length ? (
            <div className="public-grid">
              {visible.map((t, i) => (
                <article className="public-tool" key={t.name + i}>
                  <div className={"public-art art-" + t.category.split(" ")[0].toLowerCase()}>
                    <ToolVisual category={t.category} />
                  </div>
                  <div className="public-tool-info">
                    <span className="eyebrow">{t.category}</span>
                    <h3>{t.name}</h3>
                    <span className="public-caption">Sign in to request dates</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">
              <Search size={32} />
              <h3>{tools.length ? "No matching tools" : "The first listing could be yours."}</h3>
              <p>
                {tools.length
                  ? "Try a different name or category."
                  : "Sign in and share a tool with the neighborhood."}
              </p>
            </div>
          )}
        </section>
        <section id="how" className="how-section">
          <div>
            <span className="eyebrow">GOOD TOOLS DESERVE MORE USE</span>
            <h2>
              From their shelf
              <br />
              to your next project.
            </h2>
            <p>Simple arrangements, with a person on the other side.</p>
          </div>
          <div className="steps">
            {[
              ["01", "Find your tool", "Browse the catalog and request the dates you need."],
              [
                "02",
                "Plan your pickup",
                "Wait for the owner’s approval, then arrange your handoff together.",
              ],
              [
                "03",
                "Return with care",
                "Mark the loan as returned and make room for the next project.",
              ],
            ].map(([n, title, copy]) => (
              <article key={n}>
                <span>{n}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
