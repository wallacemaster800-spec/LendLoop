"use client";
import { useState } from "react";
import { Dashboard, type Tool, type Loan, type Me, type Person, type Actions } from "./dashboard";
import type { Id } from "@/convex/_generated/dataModel";
import { day, overlaps, validateDates } from "@/lib/domain";
const mid = (id: string) => id as Id<"members">;
const tid = (id: string) => id as Id<"tools">;
const lid = (id: string) => id as Id<"loans">;
const date = (offset: number) => day(Date.now() + offset * 86400000);
const members: Me[] = [
  { _id: mid("sam"), name: "Sam Rivera", trusted: true, admin: false },
  { _id: mid("alex"), name: "Alex Chen", trusted: false, admin: false },
  { _id: mid("morgan"), name: "Morgan Ellis", trusted: true, admin: true },
];
function initialTools(): Tool[] {
  return [
    {
      id: "drill",
      name: "Cordless drill & bit set",
      category: "Power tools",
      condition: "Good",
      description:
        "An 18V drill with two charged batteries and a complete bit set. Ready for that shelf you’ve been meaning to put up.",
      owner: "sam",
    },
    {
      id: "tent",
      name: "A weekend under the stars",
      category: "Camping",
      condition: "Good",
      description:
        "A roomy two-person tent, with groundsheet and pegs. Packs small. Please let it dry before bringing it back.",
      owner: "alex",
    },
    {
      id: "garden",
      name: "The garden starter kit",
      category: "Garden",
      condition: "Like new",
      description:
        "Trowel, hand fork and a sturdy pair of pruners. Everything for a little Saturday gardening.",
      owner: "morgan",
    },
    {
      id: "mixer",
      name: "Stand mixer",
      category: "Kitchen",
      condition: "Good",
      description:
        "For birthday cakes and ambitious bread plans. Includes a dough hook, whisk and mixing bowl.",
      owner: "alex",
    },
    {
      id: "level",
      name: "Level & measuring kit",
      category: "Hand tools",
      condition: "Well used",
      description:
        "A spirit level, tape measure and a carpenter’s square. A few scratches, but still perfectly straight.",
      owner: "morgan",
    },
    {
      id: "sander",
      name: "Orbital sander",
      category: "Power tools",
      condition: "Good",
      description:
        "Bring old furniture back to life. Dust bag included; please bring your own sanding discs.",
      owner: "sam",
    },
  ].map((t) => ({
    _id: tid(t.id),
    _creationTime: Date.now(),
    owner: mid(t.owner),
    name: t.name,
    category: t.category as Tool["category"],
    condition: t.condition as Tool["condition"],
    description: t.description,
    archived: false,
    mine: false,
    ownerName: members.find((m) => m._id === t.owner)!.name,
    trusted: false,
    available: t.id !== "tent",
    booked: [],
  }));
}
function initialLoans(): Loan[] {
  return [
    {
      _id: lid("request-1"),
      _creationTime: Date.now(),
      tool: tid("drill"),
      lender: mid("sam"),
      borrower: mid("alex"),
      start: date(1),
      end: date(3),
      status: "pending",
      updatedAt: Date.now(),
      toolName: "Cordless drill & bit set",
      lenderName: "Sam Rivera",
      borrowerName: "Alex Chen",
      overdue: false,
      activity: [],
    },
    {
      _id: lid("request-2"),
      _creationTime: Date.now(),
      tool: tid("tent"),
      lender: mid("alex"),
      borrower: mid("sam"),
      start: date(-4),
      end: date(-1),
      status: "approved",
      updatedAt: Date.now(),
      toolName: "A weekend under the stars",
      lenderName: "Alex Chen",
      borrowerName: "Sam Rivera",
      overdue: true,
      activity: [
        {
          id: "demo-reminder" as Id<"notifications">,
          kind: "overdue",
          state: "delivered",
          at: Date.now(),
          attempts: 1,
        },
      ],
    },
  ];
}
export function DemoApp() {
  const [persona, setPersona] = useState("sam");
  const [tools, setTools] = useState(initialTools);
  const [loans, setLoans] = useState(initialLoans);
  const [people, setPeople] = useState<Person[]>(members);
  const me = members.find((m) => m._id === persona)!;
  const relevant = loans.filter((l) => me.admin || l.borrower === me._id || l.lender === me._id);
  const enriched = tools
    .filter((t) => !t.archived)
    .map((t) => ({
      ...t,
      mine: t.owner === me._id,
      trusted: people.find((p) => p._id === t.owner)?.trusted ?? false,
      booked: loans
        .filter((l) => l.tool === t._id && l.status === "approved")
        .map((l) => ({ start: l.start, end: l.end, overdue: l.end < day() })),
      available: !loans.some(
        (l) =>
          l.tool === t._id &&
          l.status === "approved" &&
          (l.end < day() || overlaps(day(), day(), l.start, l.end)),
      ),
    }));
  const actions: Actions = {
    save: async (data) => {
      if (data.id) {
        setTools((prev) => prev.map((t) => (t._id === data.id ? { ...t, ...data } : t)));
        return;
      }
      setTools((prev) => [
        ...prev,
        {
          ...data,
          _id: tid(crypto.randomUUID()),
          _creationTime: Date.now(),
          owner: me._id,
          ownerName: me.name,
          archived: false,
          mine: true,
          trusted: me.trusted,
          available: true,
          booked: [],
        },
      ]);
    },
    remove: async (id) => {
      if (!me.admin && loans.some((l) => l.tool === id && l.status === "approved"))
        throw new Error("Return the outstanding loan before removing this tool.");
      setTools((prev) => prev.map((t) => (t._id === id ? { ...t, archived: true } : t)));
      setLoans((prev) =>
        prev.map((l) =>
          l.tool === id && l.status === "pending" ? { ...l, status: "declined" } : l,
        ),
      );
    },
    request: async (data) => {
      validateDates(data.start, data.end);
      const tool = tools.find((t) => t._id === data.tool)!;
      if (
        loans.some(
          (l) =>
            l.tool === tool._id &&
            (l.status === "pending" || l.status === "approved") &&
            l.borrower === me._id,
        )
      )
        throw new Error("You already have an open request for this tool.");
      if (
        loans.some(
          (l) =>
            l.tool === tool._id &&
            l.status === "approved" &&
            (l.end < day() || overlaps(data.start, data.end, l.start, l.end)),
        )
      )
        throw new Error("This tool is unavailable for those dates.");
      setLoans((prev) => [
        ...prev,
        {
          ...data,
          _id: lid(crypto.randomUUID()),
          _creationTime: Date.now(),
          lender: tool.owner,
          borrower: me._id,
          status: "pending",
          updatedAt: Date.now(),
          toolName: tool.name,
          lenderName: tool.ownerName,
          borrowerName: me.name,
          overdue: false,
          activity: [],
        },
      ]);
    },
    transition: async (id, action) => {
      const loan = loans.find((l) => l._id === id)!;
      if (action === "approve") {
        validateDates(loan.start, loan.end);
        if (
          loans.some(
            (l) =>
              l._id !== id &&
              l.tool === loan.tool &&
              l.status === "approved" &&
              (l.end < day() || overlaps(loan.start, loan.end, l.start, l.end)),
          )
        )
          throw new Error("These dates are already reserved.");
      }
      setLoans((prev) =>
        prev.map((l) =>
          l._id === id
            ? {
                ...l,
                status: (
                  {
                    approve: "approved",
                    decline: "declined",
                    cancel: "cancelled",
                    return: "returned",
                  } as const
                )[action],
                overdue: false,
                updatedAt: Date.now(),
              }
            : l,
        ),
      );
    },
    trust: async (id, trusted) =>
      setPeople((prev) => prev.map((p) => (p._id === id ? { ...p, trusted } : p))),
    retry: async () => {},
  };
  return (
    <Dashboard
      demo
      me={me}
      tools={enriched}
      loans={relevant}
      people={people}
      actions={actions}
      account={
        <label className="demo-persona">
          <span>View as</span>
          <select
            aria-label="Demo persona"
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
          >
            {members.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name}
                {m.admin ? " (admin)" : ""}
              </option>
            ))}
          </select>
        </label>
      }
    />
  );
}
