"use client";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  Plus,
  Search,
  X,
  Check,
  Clock3,
  ShieldCheck,
  ArrowUpRight,
  Pencil,
  Trash2,
  CalendarDays,
  Package,
  AlertCircle,
} from "lucide-react";
import { ConvexError } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { categories, conditions, day, type Category, type Condition } from "@/lib/domain";
import { Brand, Footer, ToolIcon } from "./brand";

export type Tool = FunctionReturnType<typeof api.tools.list>[number];
export type Loan = FunctionReturnType<typeof api.loans.list>[number];
export type Me = NonNullable<FunctionReturnType<typeof api.members.me>>;
export type Person = FunctionReturnType<typeof api.members.list>[number];
export type Failure = FunctionReturnType<typeof api.automation.failures>[number];
export type ListingInput = {
  id?: Id<"tools">;
  name: string;
  category: Category;
  condition: Condition;
  description: string;
};
export type Actions = {
  save: (data: ListingInput) => Promise<unknown>;
  remove: (id: Id<"tools">) => Promise<unknown>;
  request: (data: { tool: Id<"tools">; start: string; end: string }) => Promise<unknown>;
  transition: (
    id: Id<"loans">,
    action: "approve" | "decline" | "cancel" | "return",
  ) => Promise<unknown>;
  trust: (id: Id<"members">, trusted: boolean) => Promise<unknown>;
  retry: (id: Id<"events">) => Promise<unknown>;
};
type Tab = "Browse tools" | "My listings" | "My requests" | "Incoming requests" | "Admin";
function message(error: unknown) {
  return error instanceof ConvexError
    ? String(error.data)
    : error instanceof Error && error.message.length < 180
      ? error.message
      : "Something went wrong. Please try again.";
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    const d = dialog.current;
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="modal-title"
      className="modal"
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-body">
        <div className="modal-heading">
          <h2 id="modal-title">{title}</h2>
          <button className="icon-button" onClick={close} aria-label="Close dialog">
            <X />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
function ListingForm({
  tool,
  onSave,
  busy,
}: {
  tool?: Tool;
  onSave: (data: ListingInput) => void;
  busy: boolean;
}) {
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    onSave({
      id: tool?._id,
      name: String(data.get("name")),
      category: data.get("category") as Category,
      condition: data.get("condition") as Condition,
      description: String(data.get("description")),
    });
  }
  return (
    <form onSubmit={submit} className="form">
      <label>
        Tool name
        <input
          autoFocus
          name="name"
          required
          minLength={2}
          maxLength={80}
          defaultValue={tool?.name}
          placeholder="e.g. Cordless drill"
        />
      </label>
      <div className="form-row">
        <label>
          Category
          <select name="category" defaultValue={tool?.category}>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Condition
          <select name="condition" defaultValue={tool?.condition ?? "Good"}>
            {conditions.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        A little about the tool
        <textarea
          name="description"
          required
          minLength={10}
          maxLength={500}
          rows={4}
          defaultValue={tool?.description}
          placeholder="What’s included? Anything your neighbor should know?"
        />
      </label>
      <p className="form-hint">Keep addresses and contact information out of your listing.</p>
      <button className="button primary" disabled={busy}>
        {busy ? "Saving…" : tool ? "Save changes" : "Add to the shelf"}
        <ArrowRight size={17} />
      </button>
    </form>
  );
}
export function Dashboard({
  me,
  tools,
  loans,
  people = [],
  failures = [],
  actions,
  account,
  demo = false,
}: {
  me: Me;
  tools: Tool[];
  loans: Loan[];
  people?: Person[];
  failures?: Failure[];
  actions: Actions;
  account: ReactNode;
  demo?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("Browse tools");
  const [category, setCategory] = useState("All tools");
  const [search, setSearch] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<
    | { kind: "listing"; tool?: Tool }
    | { kind: "borrow"; tool: Tool }
    | { kind: "remove"; tool: Tool }
    | null
  >(null);
  useEffect(() => {
    setTab("Browse tools");
    setModal(null);
    setNotice(null);
  }, [me._id]);
  async function run(work: () => Promise<unknown>, success: string, close = false) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await work();
      setNotice({ text: success, error: false });
      if (close) setModal(null);
    } catch (error) {
      setNotice({ text: message(error), error: true });
    } finally {
      setBusy(false);
    }
  }
  const mine = tools.filter((t) => t.mine);
  const outgoing = loans.filter((l) => l.borrower === me._id);
  const incoming = loans.filter((l) => l.lender === me._id);
  const visible = tools.filter(
    (t) =>
      (tab !== "My listings" || t.mine) &&
      (category === "All tools" || t.category === category) &&
      (!onlyAvailable || t.available) &&
      t.name.toLowerCase().includes(search.toLowerCase()),
  );
  const currentLoans =
    tab === "My requests" ? outgoing : tab === "Incoming requests" ? incoming : loans;
  return (
    <div className="site" id="top">
      {demo && (
        <div className="demo-banner">
          <strong>Interactive demo</strong>
          <span>Sample data · changes stay in this tab until refresh · no real notifications</span>
          <a href="/">
            Exit demo <ArrowUpRight size={14} />
          </a>
        </div>
      )}
      <header className="topbar">
        <Brand />
        <div className="account">
          <span className="neighborhood-label">
            <span className="live-dot" /> Your neighborhood
          </span>
          {account}
        </div>
      </header>
      <main className="dashboard">
        <section className="dashboard-heading">
          <div>
            <span className="eyebrow">A LITTLE LESS BUYING. A LITTLE MORE SHARING.</span>
            <h1>
              Good to see you, {me.name.split(" ")[0]}
              <span className="brand-dot">.</span>
            </h1>
            <p className="muted">What are you working on next?</p>
          </div>
          <button className="button primary" onClick={() => setModal({ kind: "listing" })}>
            <Plus size={18} /> Lend a tool
          </button>
        </section>
        <section className="summary-strip" aria-label="Your sharing overview">
          <div>
            <Package size={20} />
            <span>
              <strong>{mine.length}</strong> tools on your shelf
            </span>
          </div>
          <div>
            <ArrowUpRight size={20} />
            <span>
              <strong>{outgoing.filter((l) => l.status === "approved").length}</strong> active
              borrowings
            </span>
          </div>
          <div>
            <Clock3 size={20} />
            <span>
              <strong>{incoming.filter((l) => l.status === "pending").length}</strong> requests to
              review
            </span>
          </div>
          <div className="sharing-note">
            <RepeatMark /> A good thing to pass on.
          </div>
        </section>
        <nav className="tabs" aria-label="Workspace views">
          {(
            [
              "Browse tools",
              "My listings",
              "My requests",
              "Incoming requests",
              ...(me.admin ? ["Admin"] : []),
            ] as Tab[]
          ).map((t) => (
            <button
              key={t}
              aria-current={tab === t ? "page" : undefined}
              onClick={() => {
                setTab(t);
                setCategory("All tools");
                setSearch("");
              }}
            >
              {t}
              {t === "Incoming requests" && incoming.some((l) => l.status === "pending") && (
                <span className="count">
                  {incoming.filter((l) => l.status === "pending").length}
                </span>
              )}
            </button>
          ))}
        </nav>
        {notice && !modal && (
          <div
            className={"notice " + (notice.error ? "error" : "")}
            role={notice.error ? "alert" : "status"}
          >
            {notice.error ? <AlertCircle size={18} /> : <Check size={18} />} {notice.text}
            <button aria-label="Dismiss message" onClick={() => setNotice(null)}>
              <X size={16} />
            </button>
          </div>
        )}
        {(tab === "Browse tools" || tab === "My listings") && (
          <>
            <div className="catalogue-heading">
              <div>
                <h2>{tab === "My listings" ? "Your shared shelf" : "Find something useful"}</h2>
                <p className="muted">
                  {tab === "My listings"
                    ? "Give your tools a life beyond the cupboard."
                    : "Borrow for a day, a weekend, or a little longer."}
                </p>
              </div>
              <label className="search">
                <Search size={18} />
                <input
                  aria-label="Search tools"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find a tool…"
                />
              </label>
            </div>
            <div className="filters">
              <div className="category-chips">
                {["All tools", ...categories].map((c) => (
                  <button key={c} onClick={() => setCategory(c)} aria-pressed={category === c}>
                    {c}
                  </button>
                ))}
              </div>
              <label className="availability-filter">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                />
                Available today
              </label>
            </div>
            <div className="results-label">
              {visible.length} {visible.length === 1 ? "tool" : "tools"} on the shelf{" "}
              <span>Borrowing dates are confirmed by the lender</span>
            </div>
            {visible.length ? (
              <div className="tool-grid">
                {visible.map((tool) => (
                  <article className="tool-card" key={tool._id}>
                    <div className={"tool-art art-" + tool.category.split(" ")[0].toLowerCase()}>
                      <span className={"availability " + (!tool.available ? "unavailable" : "")}>
                        <span />
                        {tool.available ? "Available today" : "Currently on loan"}
                      </span>
                      <ToolIcon category={tool.category} size={80} />
                      <span className="condition">{tool.condition}</span>
                    </div>
                    <div className="tool-content">
                      <span className="eyebrow">{tool.category}</span>
                      <h3>{tool.name}</h3>
                      <p className="tool-description">{tool.description}</p>
                      <div className="tool-owner">
                        <span className="avatar">{tool.ownerName.charAt(0)}</span>
                        <span>{tool.mine ? "Your listing" : tool.ownerName}</span>
                        {tool.trusted && (
                          <span className="trusted" title="Trusted Lender">
                            <ShieldCheck size={15} />
                            Trusted
                          </span>
                        )}
                      </div>
                      <div className="card-bottom">
                        {tool.mine ? (
                          <>
                            <button
                              className="button secondary small"
                              onClick={() => setModal({ kind: "listing", tool })}
                            >
                              <Pencil size={14} /> Edit listing
                            </button>
                            <button
                              className="icon-button"
                              aria-label={"Remove " + tool.name}
                              onClick={() => setModal({ kind: "remove", tool })}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="button secondary borrow-button"
                              onClick={() => setModal({ kind: "borrow", tool })}
                            >
                              Request to borrow <ArrowRight size={16} />
                            </button>
                            {me.admin && (
                              <button
                                className="icon-button"
                                aria-label={"Remove " + tool.name}
                                onClick={() => setModal({ kind: "remove", tool })}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty">
                <Search size={32} />
                <h3>
                  {tab === "My listings"
                    ? "Make a little room for sharing."
                    : "Nothing on this shelf yet."}
                </h3>
                <p>
                  {tab === "My listings"
                    ? "Add your first tool to get started."
                    : "Try another category or a different search."}
                </p>
                {tab === "My listings" && (
                  <button className="button primary" onClick={() => setModal({ kind: "listing" })}>
                    Lend a tool
                  </button>
                )}
              </div>
            )}
          </>
        )}
        {(tab === "My requests" || tab === "Incoming requests" || tab === "Admin") && (
          <section className="loan-section">
            <div className="section-heading">
              <div>
                <h2>
                  {tab === "Admin"
                    ? "All neighborhood loans"
                    : tab === "My requests"
                      ? "Your borrowing plans"
                      : "From your neighbors"}
                </h2>
                <p className="muted">
                  {tab === "Incoming requests"
                    ? "A small favor can make a big difference."
                    : "Dates are inclusive. Please return tools by the end of the last day (UTC)."}
                </p>
              </div>
            </div>
            {!currentLoans.length ? (
              <div className="empty">
                <CalendarDays size={35} />
                <h3>No requests yet.</h3>
                <p>When a request comes in, you’ll find it here.</p>
              </div>
            ) : (
              <div className="loan-list">
                {currentLoans.map((loan) => (
                  <article className="loan-card" key={loan._id}>
                    <div className="loan-top">
                      <div>
                        <span
                          className={"status status-" + (loan.overdue ? "overdue" : loan.status)}
                        >
                          {loan.overdue ? "Overdue" : loan.status}
                        </span>
                        <h3>{loan.toolName}</h3>
                        <p>
                          {loan.borrower === me._id
                            ? "From " + loan.lenderName
                            : loan.borrowerName + " → " + loan.lenderName}
                        </p>
                      </div>
                      <div className="loan-dates">
                        <CalendarDays size={17} />
                        <span>
                          {loan.start}
                          <br />
                          <span className="muted">through {loan.end}</span>
                        </span>
                      </div>
                    </div>
                    <div className="loan-actions">
                      {loan.status === "pending" && loan.lender === me._id && (
                        <>
                          <button
                            className="button primary small"
                            disabled={busy}
                            onClick={() =>
                              run(
                                () => actions.transition(loan._id, "approve"),
                                "Request approved.",
                              )
                            }
                          >
                            Approve <Check size={15} />
                          </button>
                          <button
                            className="button secondary small"
                            disabled={busy}
                            onClick={() =>
                              run(
                                () => actions.transition(loan._id, "decline"),
                                "Request declined.",
                              )
                            }
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {loan.status === "pending" && loan.borrower === me._id && (
                        <button
                          className="button secondary small"
                          disabled={busy}
                          onClick={() =>
                            run(() => actions.transition(loan._id, "cancel"), "Request cancelled.")
                          }
                        >
                          Cancel request
                        </button>
                      )}
                      {loan.status === "approved" &&
                        loan.start <= day() &&
                        (loan.lender === me._id || loan.borrower === me._id) && (
                          <button
                            className="button secondary small"
                            disabled={busy}
                            onClick={() =>
                              run(
                                () => actions.transition(loan._id, "return"),
                                "Loan marked as returned. Thank you!",
                              )
                            }
                          >
                            Mark returned <Check size={15} />
                          </button>
                        )}
                    </div>
                    <details className="activity">
                      <summary>
                        Automation activity{" "}
                        {loan.activity.some((a) => a.state === "failed") && "· attention needed"}
                      </summary>
                      {!loan.activity.length ? (
                        <p>No automation activity yet.</p>
                      ) : (
                        loan.activity.map((a) => (
                          <p key={a.id}>
                            <span className={"activity-dot " + a.state} />
                            <strong>
                              {a.kind === "overdue" ? "Overdue reminder" : a.kind}
                            </strong> ·{" "}
                            {a.state === "delivered"
                              ? "Mock notification recorded"
                              : a.state === "failed"
                                ? "Delivery failed — admin can retry"
                                : "Queued for delivery"}
                            <time>{new Date(a.at).toLocaleString()}</time>
                          </p>
                        ))
                      )}
                    </details>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
        {tab === "Admin" && (
          <section className="admin-grid">
            <div>
              <h2>Trusted lenders</h2>
              <p className="muted">A manual badge, awarded after a review.</p>
              {people.map((p) => (
                <div className="person-row" key={p._id}>
                  <span>{p.name}</span>
                  <button
                    className="button secondary small"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => actions.trust(p._id, !p.trusted),
                        p.trusted ? "Badge removed." : "Trusted Lender badge added.",
                      )
                    }
                  >
                    {p.trusted ? "Remove badge" : "Mark trusted"}
                  </button>
                </div>
              ))}
            </div>
            <div>
              <h2>Failed automations</h2>
              <p className="muted">
                Five attempts are made before a delivery needs your attention.
              </p>
              {!failures.length ? (
                <p className="healthy">
                  <Check size={16} /> No failed deliveries.
                </p>
              ) : (
                failures.map((f) => (
                  <div className="failure-row" key={f._id}>
                    <strong>{f.kind}</strong>
                    <p>{f.error}</p>
                    <button
                      className="button secondary small"
                      disabled={busy}
                      onClick={() => run(() => actions.retry(f._id), "Delivery queued for retry.")}
                    >
                      Retry delivery
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
        <aside className="community-note">
          <ShieldCheck size={22} />
          <div>
            <strong>A little care goes a long way.</strong>
            <span>
              Agree on the handoff, treat tools like your own, and bring them back on time.
            </span>
          </div>
        </aside>
      </main>
      <Footer />
      {modal && (
        <Modal
          title={
            modal.kind === "listing"
              ? modal.tool
                ? "Edit your listing"
                : "What can you lend?"
              : modal.kind === "borrow"
                ? "Make a borrowing plan"
                : "Remove this listing?"
          }
          close={() => {
            if (!busy) {
              setModal(null);
              setNotice(null);
            }
          }}
        >
          {notice?.error && (
            <div className="notice error" role="alert">
              {notice.text}
            </div>
          )}
          {modal.kind === "listing" && (
            <ListingForm
              tool={modal.tool}
              busy={busy}
              onSave={(data) => run(() => actions.save(data), "Your shelf has been updated.", true)}
            />
          )}
          {modal.kind === "borrow" && (
            <>
              <div className="borrow-summary">
                <ToolIcon category={modal.tool.category} size={38} />
                <div>
                  <h3>{modal.tool.name}</h3>
                  <p>
                    From {modal.tool.ownerName} · {modal.tool.condition}
                  </p>
                </div>
              </div>
              <p className="muted">{modal.tool.description}</p>
              {modal.tool.booked.length > 0 && (
                <div className="booked">
                  <strong>Already reserved</strong>
                  {modal.tool.booked.map((b, i) => (
                    <p key={i}>
                      {b.start} — {b.end}
                      {b.overdue ? " · awaiting return" : ""}
                    </p>
                  ))}
                </div>
              )}
              <form
                className="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  run(
                    () =>
                      actions.request({
                        tool: modal.tool._id,
                        start: String(data.get("start")),
                        end: String(data.get("end")),
                      }),
                    "Request sent. Your neighbor will review it.",
                    true,
                  );
                }}
              >
                <div className="form-row">
                  <label>
                    Pick up
                    <input autoFocus type="date" name="start" min={day()} required />
                  </label>
                  <label>
                    Return by
                    <input type="date" name="end" min={day()} required />
                  </label>
                </div>
                <p className="form-hint">
                  Up to 31 days. Your request reserves the tool only after the lender approves it.
                </p>
                <button className="button primary" disabled={busy}>
                  {busy ? "Sending…" : "Send request"}
                  <ArrowRight size={16} />
                </button>
              </form>
            </>
          )}
          {modal.kind === "remove" && (
            <>
              <p>
                <strong>{modal.tool.name}</strong> will disappear from the shelf. Pending requests
                will be declined. Loan history is kept.
              </p>
              <button
                className="button danger"
                disabled={busy}
                onClick={() => run(() => actions.remove(modal.tool._id), "Listing removed.", true)}
              >
                Remove listing
              </button>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
function RepeatMark() {
  return <span aria-hidden="true">↗↙</span>;
}
