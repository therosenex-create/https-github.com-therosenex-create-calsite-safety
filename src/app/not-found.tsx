import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-serif text-3xl text-navy">Not found</h1>
      <p className="mt-2 text-sm text-muted">That record is not in this company, or the page does not exist.</p>
      <Link className="btn mt-6" href="/app">Back</Link>
    </main>
  );
}
