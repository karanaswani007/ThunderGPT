import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FileText,
  Globe,
  Image as ImageIcon,
  Lock,
  MessageSquare,
  Sparkles,
  Zap,
  Shield,
} from "lucide-react";
import { Wordmark, BoltMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { PRODUCT } from "@/lib/product";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  return (
    <div className="thunder-grid min-h-dvh">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <Wordmark />
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <a href={PRODUCT.website} target="_blank" rel="noreferrer">
              HK SoftTech
            </a>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/chat">Start chatting</Link>
          </Button>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-16 pt-8 md:grid-cols-2 md:pt-16">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            ThunderGPT by HK SoftTech
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-6xl">
            AI that works at your speed.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            A premium assistant for chat, documents, images, and research — built as
            a real product, not a wrapper. Developed by HK SoftTech.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/chat">Start chatting</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Create an account</Link>
            </Button>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card">
          <img
            src="/brand/thundergpt-hero.png"
            alt="ThunderGPT — AI That Works at Your Speed, developed by HK SoftTech"
            className="aspect-[3/2] w-full object-cover"
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Feature icon={MessageSquare} title="AI chat" body="Streaming replies, conversation history, edit, regenerate, and beautiful markdown." />
          <Feature icon={FileText} title="Documents" body="Drop a PDF, DOCX, TXT, or CSV and ask ThunderGPT to summarize, extract, or analyze." />
          <Feature icon={Sparkles} title="Multimodal" body="Understand screenshots and photos. Ask what you are looking at." />
          <Feature icon={ImageIcon} title="Image generation" body="Create stills from a prompt, keep a gallery, download, and regenerate." />
          <Feature icon={Globe} title="Web search" body="Toggle live search when you need current sources and citations." />
          <Feature icon={Zap} title="Model selection" body="Auto picks the right engine. Or choose Fast, Pro, Vision, and Image yourself." />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <div className="grid gap-4 rounded-3xl border border-border bg-card p-8 md:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-semibold">Security first</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              API keys stay on the server. Conversations are private to your account.
              Files are validated before they are processed. Rate limits keep the engine healthy.
            </p>
          </div>
          <ul className="space-y-3 text-sm">
            <Li icon={Lock}>Server-side AI requests only</Li>
            <Li icon={Shield}>Per-user data isolation</Li>
            <Li icon={FileText}>File type and size checks</Li>
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20">
        <div className="rounded-3xl border border-border bg-sidebar px-6 py-10 text-center md:px-12">
          <BoltMark className="mx-auto h-10 w-8" />
          <h2 className="mt-4 font-display text-3xl font-semibold">Ready when you are</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Start as a guest, or sign in to keep every conversation, file, and generated image.
          </p>
          <Button size="lg" className="mt-6" asChild>
            <Link to="/chat">Start chatting</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            {PRODUCT.name} · {PRODUCT.tagline}
          </p>
          <p>
            Developed by{" "}
            <a className="text-primary underline-offset-4 hover:underline" href={PRODUCT.website}>
              {PRODUCT.company}
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof MessageSquare;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Icon className="size-5 text-primary" />
      <h3 className="mt-4 font-display text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function Li({ icon: Icon, children }: { icon: typeof Lock; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-xl bg-muted/60 px-3 py-3">
      <Icon className="mt-0.5 size-4 text-primary" />
      <span>{children}</span>
    </li>
  );
}
