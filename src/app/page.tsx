"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Source = { id?: string | null; title?: string | null; score?: number | null };
type Msg = { role: "user" | "assistant"; content: string; sources?: Source[] };

function getOrCreateSessionId() {
  if (typeof window === "undefined") return "default";
  let sid = localStorage.getItem("session_id");
  if (!sid) {
    // a stable random id for memory continuity
    sid = (crypto as any)?.randomUUID?.() || String(Date.now());
    localStorage.setItem("session_id", sid || "default");
  }
  return sid;
}

export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! Ask me something and I’ll query the knowledge base." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [backend, setBackend] = useState<string>("");
  const sessionId = useMemo(() => getOrCreateSessionId(), []);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`, { method: "POST", body: JSON.stringify({ message: "__ping__", session_id: sessionId }) })
      .catch(() => {}) // ignore 4xx if your backend rejects __ping__
      .finally(() => setBackend(`${process.env.NEXT_PUBLIC_BACKEND_URL}/`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(error || `HTTP ${res.status}`);
      }
      const data: { answer: string; sources?: Source[] } = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.answer ?? "", sources: data.sources ?? [] }]);
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `⚠️ Error talking to backend: ${err?.message || "unknown error"}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function newSession() {
    localStorage.removeItem("session_id");
    location.reload();
  }

  return (
    <main className="min-h-dvh px-4">
      <div className="mx-auto max-w-3xl py-6">
        <header className="mb-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-100">RAG Chat Client</h1>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-slate-700 px-2 py-1">
              Session: <code>{sessionId}</code>
            </span>
            <button onClick={newSession} className="rounded-md border border-slate-700 px-2 py-1 hover:bg-slate-800">
              New Session
            </button>
          </div>
        </header>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">

          <div className="flex max-h-[65vh] flex-col gap-3 overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div key={i} className="flex flex-col">
                <div
                  className={[
                    "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3",
                    m.role === "user"
                      ? "self-end bg-indigo-600/20 ring-1 ring-indigo-600/40"
                      : "self-start bg-slate-800 ring-1 ring-slate-700",
                  ].join(" ")}
                >
                  {m.content}
                </div>

                {m.role === "assistant" && m.sources?.length ? (
                  <div className="mt-2 self-start text-xs text-slate-300">
                    <div className="mb-1 font-medium text-slate-200">Sources</div>
                    <ul className="list-disc space-y-1 pl-5">
                      {m.sources.map((s, j) => (
                        <li key={j}>
                          {s.title || s.id || `Document ${j + 1}`}
                          {typeof s.score === "number" ? (
                            <span className="ml-1 text-slate-400">(score: {s.score.toFixed(3)})</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
            {busy && <div className="self-start animate-pulse text-slate-400">Thinking…</div>}
            <div ref={endRef} />
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) send();
              }}
              placeholder="Ask anything…"
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 outline-none focus:ring-2 focus:ring-indigo-600/40"
            />
            <button
              onClick={send}
              disabled={busy}
              className="rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
