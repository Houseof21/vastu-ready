import Link from "next/link";
import { Container } from "@/components/ui/primitives";
import { brand } from "@/config/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <Container className="flex h-16 items-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-forest text-sm font-bold text-white">V</span>
            <span className="font-display text-lg font-semibold text-ink">{brand.name}</span>
          </Link>
        </Container>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">{children}</main>
    </div>
  );
}
