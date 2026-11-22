import Link from "next/link";

export default function NotFound() {
  return (
    <main className="reference-document">
      <h1>Page not found</h1>
      <p>The link may have moved or the address may be incomplete.</p>
      <p><Link href="/" prefetch={false}>Go to the YinYang EQ homepage</Link></p>
    </main>
  );
}
