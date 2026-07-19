"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, BookOpen, ShieldCheck, Database, Loader2, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CF_MODELS } from "@/lib/cloudflare-ai";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  rag_used?: boolean;
  source?: string;
  evidence_tier?: "Verified" | "Proxy" | "Partial";
}

interface AssistantResponse {
  response: string;
  rag_used: boolean;
  source: string;
  evidence_tier: "Verified" | "Proxy" | "Partial";
}

const SUGGESTED_QUESTIONS = [
  "How many voters in P134?",
  "Who won PRN15 Melaka?",
  "What was the GE15 result?",
  "Which DUN has the highest senior dependency?",
  "What's the DPT churn for Melaka in 2026?",
  "What is Melaka's median household income?",
];

function tierColor(tier?: string): string {
  if (tier === "Verified") return "border-emerald-500/40 text-emerald-600 dark:text-emerald-400";
  if (tier === "Proxy") return "border-amber-500/40 text-amber-600 dark:text-amber-400";
  return "border-muted-foreground/30 text-muted-foreground";
}

function AssistantBubble({ msg }: { msg: ChatMessage }) {
  return (
    <div className="flex flex-col gap-1 fade-in">
      <div
        className={`max-w-[88%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
          msg.role === "user"
            ? "self-end bg-mlk text-white rounded-br-sm"
            : "self-start bg-muted text-foreground rounded-bl-sm border border-mlk/20"
        }`}
      >
        {msg.content}
      </div>
      {msg.role === "assistant" && (
        <div className="self-start flex flex-wrap items-center gap-1">
          {msg.rag_used && (
            <Badge variant="outline" className="text-[9px] gap-0.5 py-0 px-1.5 h-4 border-mlk/40 text-mlk">
              <BookOpen className="h-2.5 w-2.5" /> RAG
            </Badge>
          )}
          {msg.evidence_tier && (
            <Badge variant="outline" className={`text-[9px] py-0 px-1.5 h-4 ${tierColor(msg.evidence_tier)}`}>
              <ShieldCheck className="h-2.5 w-2.5 me-0.5" />
              {msg.evidence_tier}
            </Badge>
          )}
          {msg.source && (
            <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4 gap-0.5 max-w-[200px] truncate">
              <Database className="h-2.5 w-2.5" />
              <span className="truncate">{msg.source}</span>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

export function AssistantPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [backend, setBackend] = useState<"zai" | "cf">("zai");
  const [cfModel, setCfModel] = useState(CF_MODELS[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Selamat datang. I'm the PIP-MLK AI Assistant — grounded in 12 verified Melaka facts with RAG over P134 engine data, elections, DPT, and DOSM. Ask me anything about Melaka political intelligence.",
      rag_used: false,
      evidence_tier: "Verified",
      source: "system-facts",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: q };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          backend,
          model: backend === "cf" ? cfModel : undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as AssistantResponse;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          rag_used: data.rag_used,
          source: data.source,
          evidence_tier: data.evidence_tier,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I couldn't reach the LLM endpoint (${e instanceof Error ? e.message : "unknown error"}). Please try again in a moment.`,
          rag_used: false,
          evidence_tier: "Partial",
          source: "error-fallback",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating "Ask AI" button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-mlk-gradient shadow-lg shadow-mlk/30 flex items-center justify-center text-white hover-lift"
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span key="spark" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Sparkles className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Assistant panel — 400x500 */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="assistant-panel"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed bottom-24 right-5 z-50 w-[400px] h-[500px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-8rem)] flex flex-col rounded-xl border border-mlk/30 bg-background/95 backdrop-blur-md shadow-2xl shadow-mlk/20 overflow-hidden"
            role="dialog"
            aria-label="PIP-MLK AI Assistant"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-mlk/20 bg-mlk-radial">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-4 w-4 text-mlk flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">PIP-MLK AI Assistant</div>
                  <div className="text-[9px] text-muted-foreground truncate">RAG-enhanced · Truth Above All</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-mlk"
                onClick={() => setOpen(false)}
                aria-label="Close panel"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Message history */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto scrollbar-mlk p-3 space-y-3 bg-background/50"
            >
              {messages.map((m, i) => (
                <AssistantBubble key={i} msg={m} />
              ))}
              {loading && (
                <div className="self-start flex items-center gap-2 text-xs text-muted-foreground px-3 py-2 bg-muted rounded-lg border border-mlk/20 w-fit">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-mlk" />
                  Querying RAG context…
                </div>
              )}
            </div>

            {/* Suggested questions */}
            {messages.length <= 1 && (
              <div className="px-3 py-2 border-t border-mlk/20 bg-background/80">
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-1.5">Suggested</div>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="text-[10px] px-2 py-1 rounded-full border border-mlk/30 text-foreground hover:bg-mlk/10 hover:text-mlk hover:border-mlk transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Backend selector + Input */}
            <div className="px-2 pt-1.5 pb-1 border-t border-mlk/20 bg-background/95 flex items-center gap-1.5">
              <Cpu className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <select
                value={backend}
                onChange={(e) => setBackend(e.target.value as "zai" | "cf")}
                className="text-[9px] h-6 px-1 rounded bg-background border border-mlk/20 focus:border-mlk focus:outline-none text-muted-foreground"
                aria-label="LLM backend"
                disabled={loading}
              >
                <option value="zai">Z.ai (GLM-4.6)</option>
                <option value="cf">CF Workers AI</option>
              </select>
              {backend === "cf" && (
                <select
                  value={cfModel}
                  onChange={(e) => setCfModel(e.target.value)}
                  className="text-[9px] h-6 px-1 rounded bg-background border border-mlk/20 focus:border-mlk focus:outline-none text-muted-foreground flex-1 min-w-0"
                  aria-label="CF model"
                  disabled={loading}
                >
                  {CF_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="p-2 border-t border-mlk/20 bg-background/95 flex items-center gap-1.5"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about P134, PRN15, DPT…"
                className="flex-1 h-9 px-3 text-xs rounded-md bg-background border border-mlk/20 focus:border-mlk focus:outline-none focus:ring-1 focus:ring-mlk/40 placeholder:text-muted-foreground"
                disabled={loading}
                aria-label="Ask the AI assistant"
              />
              <Button
                type="submit"
                size="icon"
                disabled={loading || !input.trim()}
                className="h-9 w-9 bg-mlk hover:bg-mlk/90 text-white"
                aria-label="Send message"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
