import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Repeat2, ShieldCheck } from "lucide-react";
import { Brand, Footer, ToolIcon } from "./brand";
export function Landing({
  tools,
  setup = false,
  signIn,
}: {
  tools: { name: string; category: string }[];
  setup?: boolean;
  signIn?: ReactNode;
}) {
  return (
    <div id="top" className="site">
      <header className="topbar">
        <Brand />
        <nav>
          <a href="#how">How it works</a>
          {signIn ?? (
            <a className="button primary small" href="/demo">
              Explore the demo <ArrowUpRight size={16} />
            </a>
          )}
        </nav>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="live-dot" /> THE NEIGHBORHOOD TOOL LIBRARY
            </span>
            <h1>
              Big plans.
              <br />
              Small footprint.
            </h1>
            <p className="hero-description">
              Borrow what you need.
              <br />
              Lend what you don’t.
            </p>
            <p className="muted hero-detail">
              A drill for the weekend. A tent for the trail. The right tool might be just around the
              corner.
            </p>
            <div className="hero-actions">
              {signIn ?? (
                <a className="button primary" href="/demo">
                  Take a look around <ArrowRight size={18} />
                </a>
              )}
              <a className="text-link" href="#tools">
                Browse the shelf
              </a>
            </div>
            <div className="hero-footnote">
              <ShieldCheck size={17} /> Share a little. Make room for more.
            </div>
          </div>
          <div className="hero-art" aria-label="Illustration of tools ready to be shared">
            <span className="art-note">
              LESS BUYING.
              <br />
              MORE DOING.
            </span>
            <div className="art-tool drill">
              <ToolIcon category="Power tools" size={130} />
              <span>For your next big idea</span>
            </div>
            <div className="art-tool plant">
              <ToolIcon category="Garden" size={86} />
            </div>
            <div className="art-tool tent">
              <ToolIcon category="Camping" size={106} />
            </div>
            <div className="art-stamp">
              <Repeat2 size={25} />
              <span>
                Made to
                <br />
                be shared.
              </span>
            </div>
            <span className="art-caption">The best things go around.</span>
          </div>
        </section>
        {setup && (
          <aside className="setup-banner">
            <strong>Your local workspace is ready to connect.</strong>
            <span>
              Clerk and Convex aren’t configured yet. The demo uses sample data and resets when you
              leave.
            </span>
            <a href="/demo">
              Open demo <ArrowRight size={16} />
            </a>
          </aside>
        )}
        <section id="tools" className="shelf-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">A SHARED SHELF</span>
              <h2>Ready for your next project.</h2>
            </div>
            <span className="muted">Sign in to see details &amp; borrow</span>
          </div>
          {tools.length ? (
            <div className="public-grid">
              {tools.map((tool, i) => (
                <article className="public-tool" key={tool.name + i}>
                  <div className={"tool-art art-" + tool.category.split(" ")[0].toLowerCase()}>
                    <ToolIcon category={tool.category} />
                  </div>
                  <div>
                    <span className="eyebrow">{tool.category}</span>
                    <h3>{tool.name}</h3>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">
              <ToolIcon category="Hand tools" size={35} />
              <h3>
                {setup ? "Your neighborhood starts here." : "A fresh shelf, full of possibility."}
              </h3>
              <p>
                {setup
                  ? "Connect Convex to load real listings, or explore the sample workspace."
                  : "Be the first to lend something useful."}
              </p>
            </div>
          )}
        </section>
        <section id="how" className="how-section">
          <div>
            <span className="eyebrow">KEEP IT SIMPLE</span>
            <h2>
              Useful things.
              <br />
              Used more.
            </h2>
          </div>
          <div className="steps">
            {[
              ["01", "Find your tool", "Browse the shelf and choose the dates you need."],
              ["02", "Make a plan", "Your neighbor approves the request. You arrange the handoff."],
              ["03", "Bring it back", "Return it with care and mark the loan as returned."],
            ].map(([n, title, copy]) => (
              <article key={n}>
                <span>{n}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
