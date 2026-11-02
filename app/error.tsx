"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <h1>Something interrupted your visit.</h1>
      <p>Please try again. Your saved loans are still in your account.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
      <a href="/">Back to LendLoop</a>
    </main>
  );
}
