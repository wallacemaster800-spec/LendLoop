"use client";
import { useEffect, useState } from "react";
import { ClerkProvider, SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Landing } from "./landing";
import { Dashboard } from "./dashboard";

export function LiveApp() {
  const [client] = useState(() => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!));
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={client} useAuth={useAuth}>
        <Session />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
function Session() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (isLoading)
    return (
      <div className="loading" role="status">
        Opening the neighborhood…
      </div>
    );
  return isAuthenticated ? <Workspace /> : <PublicShelf />;
}
function PublicShelf() {
  const tools = useQuery(api.tools.publicList, {});
  if (!tools)
    return (
      <div className="loading" role="status">
        Loading the shared shelf…
      </div>
    );
  return (
    <Landing
      tools={tools}
      signIn={
        <SignInButton mode="modal">
          <button className="button primary">Sign in to lend or borrow</button>
        </SignInButton>
      }
    />
  );
}
function Workspace() {
  const sync = useMutation(api.members.sync);
  const [syncError, setSyncError] = useState(false);
  useEffect(() => {
    sync({}).catch(() => setSyncError(true));
  }, [sync]);
  const me = useQuery(api.members.me, {});
  const tools = useQuery(api.tools.list, me ? {} : "skip");
  const loans = useQuery(api.loans.list, me ? {} : "skip");
  const all = useQuery(api.loans.all, me?.admin ? {} : "skip");
  const people = useQuery(api.members.list, me?.admin ? {} : "skip");
  const failures = useQuery(api.automation.failures, me?.admin ? {} : "skip");
  const save = useMutation(api.tools.save),
    remove = useMutation(api.tools.remove);
  const request = useMutation(api.loans.request),
    transition = useMutation(api.loans.transition);
  const trust = useMutation(api.members.setTrusted),
    retry = useMutation(api.automation.retry);
  if (syncError)
    return (
      <div className="error-page">
        <h1>We couldn’t open your workspace.</h1>
        <p>Please refresh. If this continues, check the Clerk integration in Convex.</p>
        <UserButton />
      </div>
    );
  if (!me || !tools || !loans)
    return (
      <div className="loading" role="status">
        Getting your shelf ready…
      </div>
    );
  return (
    <Dashboard
      me={me}
      tools={tools}
      loans={me.admin ? (all ?? loans) : loans}
      people={people}
      failures={failures}
      account={<UserButton />}
      actions={{
        save,
        remove: (id) => remove({ id }),
        request,
        transition: (id, action) => transition({ id, action }),
        trust: (id, trusted) => trust({ id, trusted }),
        retry: (id) => retry({ id }),
      }}
    />
  );
}
