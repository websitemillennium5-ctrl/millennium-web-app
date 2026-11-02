"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Phone, Send, X } from "lucide-react";
import { pollChat, postChatMessages } from "@/app/actions/chat";
import type { ChatMode } from "@/lib/chats";
import { sendEnquiry } from "@/app/actions/enquiry";
import { WhatsAppIcon } from "@/components/icons";
import { courses, site, telHref, whatsappHref } from "@/lib/site";

const OPEN_EVENT = "millennium:open-chat";

/** Opens the contact chat from anywhere on the site (the floating button, the mobile dock). */
export function openContactChat() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type Step =
  | "name"
  | "intent"
  | "course"
  | "training"
  | "job"
  | "student"
  | "faq"
  | "phone"
  | "email"
  | "message"
  | "done";
type Msg = {
  id: number;
  from: "bot" | "you" | "staff" | "system";
  text: string;
  at: string;
  /** Staff member's name on their replies */
  by?: string;
  /** Already saved to (or received from) the server */
  synced?: boolean;
  /** Server id of a staff/system message received through polling, so the same one is never shown twice */
  remoteId?: number;
};
type Answers = {
  name: string;
  intent: string;
  course: string;
  phone: string;
  email: string;
  message: string;
};
/** A quick reply: either an answer fed back into the conversation or a link that leaves the chat. */
type Chip = { label: string; href?: string };

const INTENTS = {
  consult: "Free consultation",
  course: "Join a course",
  job: "Looking for a job",
  training: "Training & grooming",
  student: "I'm a Millennium student",
} as const;

const SKIP = "Skip";
const NOTHING = "No, that's all";
const CALL_ME = "Call me about jobs";
const ASK = "Ask a question";
const GUIDANCE = "Career guidance";
const PLACEMENT = "Placement help";
const FAQ = "Common questions";
const BACK = "Back";

/** Answers for current students, matching what the student portal offers. */
const STUDENT_FAQ = [
  {
    q: "How do I log in to the student portal?",
    a: "Open the Student portal and sign in with the email you registered at the institute and your password. You can also tap Continue with Google if that email is a Google account.",
  },
  {
    q: "I forgot my password",
    a: "Call the front office and they'll reset it for you right away. Once you're signed in, you can set a new one under Profile → Change password.",
  },
  {
    q: "How do I apply for airline jobs?",
    a: "Open Airline jobs, pick an opening and tap Apply now. Verify with your student ID or email and you'll be taken straight to the airline's application page.",
  },
  {
    q: "Where do I see my fees and payments?",
    a: "The Fees page in the student portal shows your fee plan, instalments and payment history. You can pay by cash, UPI, card or bank transfer at the front office.",
  },
  {
    q: "Where is the study material?",
    a: "The Study material page in the portal has notes, downloads and videos for your course, organised by subject.",
  },
  {
    q: "Where are notices and events?",
    a: "The Announcements and Events pages in the portal list every notice, placement drive and upcoming event. Important ones also show on your portal home.",
  },
  {
    q: "How does placement support work?",
    a: "Placement drives, mock interviews and resume help run through the academy. Tap Placement help and our team will call you about current openings.",
  },
];
const TRAININGS = [
  "Interview preparation",
  "Grooming & personality",
  "English & communication",
  "Something else",
];

const chipsFor: Partial<Record<Step, Chip[]>> = {
  intent: Object.values(INTENTS).map((label) => ({ label })),
  course: [
    ...courses.map((c) => ({ label: c.title })),
    { label: "Not sure yet" },
  ],
  training: TRAININGS.map((label) => ({ label })),
  job: [{ label: "Browse jobs", href: "/airline-jobs" }, { label: CALL_ME }],
  student: [
    { label: "Student portal", href: "/student/login" },
    { label: "Study material", href: "/student/study" },
    { label: "Fees & payments", href: "/student/fees" },
    { label: "Airline jobs", href: "/airline-jobs" },
    { label: GUIDANCE },
    { label: PLACEMENT },
    { label: FAQ },
    { label: ASK },
  ],
  faq: [
    ...STUDENT_FAQ.map((f) => ({ label: f.q })),
    { label: BACK },
    { label: ASK },
  ],
  email: [{ label: SKIP }],
  message: [{ label: NOTHING }],
};

const placeholders: Partial<Record<Step, string>> = {
  name: "Your name",
  phone: "+91 98765 43210",
  email: "you@example.com",
  message: "Type your question",
};

/** How the assistant resumes each step after a staff member hands the chat back. */
const reask: Partial<Record<Step, string>> = {
  intent: "What else can I help you with?",
  name: "May I have your name?",
  course: "Which course are you interested in?",
  training: "What kind of training are you looking for?",
  job: "Want to browse the openings now, or shall our placement team call you?",
  student: "What do you need today?",
  faq: "Pick a question, or ask your own:",
  phone: "What's your phone number? Our team will call you on it.",
  email: "What's your email? You can skip this.",
  message: "Is there anything else you'd like to ask us?",
};

const emptyAnswers: Answers = {
  name: "",
  intent: "",
  course: "",
  phone: "",
  email: "",
  message: "",
};
const firstName = (name: string) => name.split(/\s+/)[0];

/** The conversation is kept in the browser so a reload or a later visit (within a day) carries on where it left off. */
const STORE_KEY = "millennium:chat";
const STORE_TTL = 24 * 60 * 60 * 1000;
type Stored = {
  id: string;
  messages: Msg[];
  step: Step;
  answers: Answers;
  mode: ChatMode;
  agent: string | null;
  leadId: string | null;
  remoteCursor: number;
  nextId: number;
  savedAt: number;
};
function loadStored(): Stored | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Stored;
    if (
      !data.id ||
      Date.now() - data.savedAt > STORE_TTL ||
      data.mode === "ended"
    ) {
      localStorage.removeItem(STORE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
const storeChat = (data: Stored | null) => {
  try {
    if (data) localStorage.setItem(STORE_KEY, JSON.stringify(data));
    else localStorage.removeItem(STORE_KEY);
  } catch {}
};

/** Short two-note chime when a staff member joins or replies, so the visitor notices even if they looked away. */
function chime() {
  try {
    const ctx = new AudioContext();
    [
      [880, 0],
      [1175, 0.12],
    ].forEach(([freq, at]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + at + 0.25,
      );
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + at);
      osc.stop(ctx.currentTime + at + 0.3);
    });
    window.setTimeout(() => ctx.close(), 800);
  } catch {}
}

/**
 * Chat-style enquiry: the assistant asks who the visitor is and what they need, one question at a time,
 * then saves the answers as a lead and emails the academy, just like the enquiry form.
 */
export function ContactChat() {
  const pathname = usePathname();
  // A conversation saved by an earlier page load (null on the server and on a first visit)
  const [stored] = useState(loadStored);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(
    () => stored?.messages.map((m) => ({ ...m, synced: true })) ?? [],
  );
  const [step, setStep] = useState<Step>(stored?.step ?? "intent");
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>(
    stored?.answers ?? emptyAnswers,
  );
  // "staff" once someone at the academy takes the chat over from the admin portal
  const [mode, setMode] = useState<ChatMode>(stored?.mode ?? "bot");
  const [agent, setAgent] = useState<string | null>(stored?.agent ?? null);
  const nextId = useRef(stored?.nextId ?? 0);
  // One saved transcript per conversation; a fresh id after "Start over"
  const session = useRef(stored?.id ?? "");
  const leadId = useRef<string | null>(stored?.leadId ?? null);
  // Saves run one after another so bubbles reach the server in order; `saved` holds the ids already sent
  const saving = useRef(Promise.resolve());
  const saved = useRef(new Set<number>());
  // Id of the last staff/system message received, so polls only fetch what's new
  const remoteCursor = useRef(stored?.remoteCursor ?? 0);
  /** A poll is in flight; the next tick waits rather than asking again with the same cursor */
  const polling = useRef(false);
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLElement>(null);

  // Phones: the on-screen keyboard shrinks the visible area but not the page, so a bottom-pinned panel would
  // slide under it. Follow the visual viewport instead while the keyboard is up.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!open || !vv) return;
    const fit = () => {
      const el = panel.current;
      if (!el) return;
      const keyboard = window.innerHeight - vv.height - vv.offsetTop;
      if (window.innerWidth >= 1024 || keyboard < 100) {
        el.style.top = "";
        el.style.bottom = "";
        el.style.height = "";
        return;
      }
      const margin = 12;
      el.style.top = `${vv.offsetTop + margin}px`;
      el.style.bottom = "auto";
      el.style.height = `${vv.height - margin * 2}px`;
      // keep the newest bubble in view once the list has its new size
      requestAnimationFrame(() => {
        if (list.current) list.current.scrollTop = list.current.scrollHeight;
      });
    };
    fit();
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    return () => {
      vv.removeEventListener("resize", fit);
      vv.removeEventListener("scroll", fit);
    };
  }, [open]);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const push = (from: Msg["from"], text: string) =>
    setMessages((m) => [
      ...m,
      { id: nextId.current++, from, text, at: new Date().toISOString() },
    ]);

  // Bot replies arrive one bubble at a time, with a short "typing" pause before each
  const say = (texts: string[]) => {
    setTyping(true);
    texts.forEach((text, i) =>
      window.setTimeout(
        () => {
          push("bot", text);
          if (i === texts.length - 1) setTyping(false);
        },
        600 * (i + 1),
      ),
    );
  };

  // Remember the conversation across page loads
  useEffect(() => {
    if (!session.current || !messages.length) return;
    storeChat({
      id: session.current,
      messages,
      step,
      answers,
      mode,
      agent,
      leadId: leadId.current,
      remoteCursor: remoteCursor.current,
      nextId: nextId.current,
      savedAt: Date.now(),
    });
  }, [messages, step, answers, mode, agent]);

  // Greet on first open (a restored conversation was greeted already)
  const greeted = useRef(Boolean(stored));
  useEffect(() => {
    if (!open || greeted.current) return;
    greeted.current = true;
    session.current = crypto.randomUUID();
    say([
      `Hi! 👋 Welcome to ${site.shortName}.`,
      "I can help with courses, training, placements and airline jobs.",
    ]);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the newest message in view: after every new bubble, and whenever the list shrinks (e.g. the
  // on-screen keyboard opening on a phone)
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const toEnd = () => (el.scrollTop = el.scrollHeight);
    const frame = requestAnimationFrame(toEnd);
    const observer = new ResizeObserver(toEnd);
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [open, messages, typing, step]);

  useEffect(() => {
    if (open && !typing && (step !== "done" || mode === "staff"))
      input.current?.focus();
  }, [open, typing, step, mode]);

  // Once the visitor has said something, every new bubble (theirs and the bot's) is saved for the staff portal
  const started = messages.some((m) => m.from === "you");
  useEffect(() => {
    if (!session.current || !started) return;
    const pending = messages.filter(
      (m) =>
        !m.synced &&
        !saved.current.has(m.id) &&
        (m.from === "bot" || m.from === "you"),
    );
    if (!pending.length) return;
    pending.forEach((m) => saved.current.add(m.id));
    const payload = {
      id: session.current,
      page: pathname,
      name: answers.name,
      phone: answers.phone,
      leadId: leadId.current,
      messages: pending.map(({ from, text, at }) => ({
        from: from as "bot" | "you",
        text,
        at,
      })),
    };
    saving.current = saving.current
      .then(() => postChatMessages(payload))
      .catch(() => {});
  }, [messages, started, answers.name, answers.phone, pathname]);

  // Ask the server every few seconds whether staff have joined or replied
  useEffect(() => {
    if (!started || mode === "ended") return;
    let stopped = false;
    const tick = async () => {
      // One poll at a time: a slow reply must not let the next tick ask again with the same cursor
      if (
        document.visibilityState === "hidden" ||
        !session.current ||
        polling.current
      )
        return;
      const id = session.current;
      polling.current = true;
      const res = await pollChat(id, remoteCursor.current).catch(() => null);
      polling.current = false;
      if (!res || stopped || id !== session.current) return;
      if (res.messages.length) {
        remoteCursor.current = Math.max(
          remoteCursor.current,
          ...res.messages.map((m) => m.id),
        );
        // Skip anything already shown, so a message can never appear twice whatever the timing
        setMessages((list) => {
          const have = new Set(list.map((m) => m.remoteId));
          const fresh = res.messages.filter((m) => !have.has(m.id));
          return fresh.length
            ? [
                ...list,
                ...fresh.map((m) => ({
                  id: nextId.current++,
                  remoteId: m.id,
                  from: m.from,
                  text: m.text,
                  at: m.at,
                  by: m.by ?? undefined,
                  synced: true,
                })),
              ]
            : list;
        });
        // A staff member joined or replied: bring the chat up and make a sound
        setOpen(true);
        chime();
      }
      setAgent(res.by);
      if (res.mode !== mode) {
        setMode(res.mode);
        // Staff handed the chat back: the assistant picks up where it left off. Staff ended it: wrap up.
        if (res.mode === "bot" && mode === "staff" && step !== "done") {
          const prompt = reask[step];
          if (prompt) say([prompt]);
        } else if (res.mode === "ended") {
          setStep("done");
          setTyping(false);
        }
      }
    };
    // Every few seconds while the window is open; much less often once it is minimised (a staff reply still pops it open)
    const timer = window.setInterval(
      tick,
      open ? (mode === "staff" ? 2000 : 3000) : 12_000,
    );
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [started, mode, step, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every path ends up here: name, then phone
  const askName = (lead: string) => {
    setStep("name");
    say([lead, "May I have your name?"]);
  };

  // Anything typed instead of tapping a chip is kept as the visitor's question
  const keepQuestion = (text: string) => {
    push("you", text);
    setAnswers((a) => ({
      ...a,
      intent: a.intent || "Question",
      message: a.message ? `${a.message}\n${text}` : text,
    }));
    askName("Thanks! Our team can help with that.");
  };

  function answer(raw: string) {
    const value = raw.trim();
    if (!value || typing) return;
    setError(null);

    if (mode === "staff") {
      push("you", value);
      setDraft("");
      return;
    }

    if (step === "name") {
      if (value.length < 2) return setError("Please tell us your name.");
      push("you", value);
      setAnswers((a) => ({ ...a, name: value }));
      setStep("phone");
      say([
        `Thanks, ${firstName(value)}! What's your phone number? Our team will call you on it.`,
      ]);
    } else if (step === "intent") {
      if (
        !Object.values(INTENTS).includes(
          value as (typeof INTENTS)[keyof typeof INTENTS],
        )
      )
        return keepQuestion(value);
      push("you", value);
      setAnswers((a) => ({ ...a, intent: value }));
      if (value === INTENTS.consult) {
        askName(
          "Happy to! A counsellor will call you, understand your goals and suggest the right path. It's completely free.",
        );
      } else if (value === INTENTS.course) {
        setStep("course");
        say(["Great! Which course are you interested in?"]);
      } else if (value === INTENTS.training) {
        setStep("training");
        say([
          "We run short training programs alongside our courses. What kind of training are you looking for?",
        ]);
      } else if (value === INTENTS.job) {
        setStep("job");
        say([
          "We post new cabin crew, ground staff and hotel openings every day. Want to browse them now, or shall our placement team call you?",
        ]);
      } else {
        setStep("student");
        say(["Welcome back! What do you need today?"]);
      }
    } else if (step === "course") {
      push("you", value);
      setAnswers((a) => ({
        ...a,
        course: value === "Not sure yet" ? "" : value,
      }));
      askName(
        value === "Not sure yet"
          ? "No problem, our counsellor can help you choose."
          : "Great choice.",
      );
    } else if (step === "training") {
      push("you", value);
      setAnswers((a) => ({ ...a, course: `Training: ${value}` }));
      askName("Got it.");
    } else if (step === "job") {
      if (value !== CALL_ME) return keepQuestion(value);
      push("you", value);
      askName("Sure, our placement team will help you.");
    } else if (step === "student") {
      if (value === GUIDANCE || value === PLACEMENT) {
        push("you", value);
        setAnswers((a) => ({ ...a, message: value }));
        askName(
          value === GUIDANCE
            ? "Sure, a mentor will call you to talk through your career plans."
            : "Sure, our placement team will call you about current openings.",
        );
      } else if (value === FAQ) {
        push("you", value);
        setStep("faq");
        say(["Here's what students ask us most often. Pick a question:"]);
      } else if (value === ASK) {
        push("you", value);
        askName("Sure.");
      } else {
        keepQuestion(value);
      }
    } else if (step === "faq") {
      const faq = STUDENT_FAQ.find((f) => f.q === value);
      if (faq) {
        push("you", value);
        say([faq.a, "Anything else?"]);
      } else if (value === BACK) {
        push("you", value);
        setStep("student");
        say(["What else do you need?"]);
      } else if (value === ASK) {
        push("you", value);
        askName("Sure.");
      } else {
        keepQuestion(value);
      }
    } else if (step === "phone") {
      if (!/^[0-9+\s\-]{10,15}$/.test(value))
        return setError(
          "Please enter a valid phone number, like +91 98765 43210.",
        );
      push("you", value);
      setAnswers((a) => ({ ...a, phone: value }));
      setStep("email");
      say([
        "Got it. What's your email, so we can send you the details? You can skip this.",
      ]);
    } else if (step === "email") {
      const skipped = value === SKIP;
      if (!skipped && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        return setError(
          "That email doesn't look right. Check it, or tap Skip.",
        );
      push("you", value);
      setAnswers((a) => ({ ...a, email: skipped ? "" : value }));
      setStep("message");
      say(["Last one: is there anything you'd like to ask us?"]);
    } else if (step === "message") {
      push("you", value);
      const final = {
        ...answers,
        message: [answers.message, value === NOTHING ? "" : value]
          .filter(Boolean)
          .join("\n"),
      };
      setAnswers(final);
      setStep("done");
      sendEnquiry({
        name: final.name,
        phone: final.phone,
        email: final.email,
        course: final.course,
        message: [
          final.intent ? `Enquiry type: ${final.intent}` : null,
          final.message,
        ]
          .filter(Boolean)
          .join("\n"),
        page: pathname,
        source: "chat",
      })
        .then((id) => {
          leadId.current = id;
          say([
            `Thanks, ${firstName(final.name)}! Your enquiry is saved. Our team will call you on ${final.phone} within a few hours.`,
            "Until then, you can also reach us on WhatsApp or browse the courses.",
          ]);
        })
        .catch(() =>
          say([
            "Sorry, I couldn't save that just now. Please message us on WhatsApp and we'll get back to you right away.",
          ]),
        );
    }
    setDraft("");
  }

  function restart() {
    storeChat(null);
    session.current = crypto.randomUUID();
    leadId.current = null;
    remoteCursor.current = 0;
    saved.current.clear();
    setMode("bot");
    setAgent(null);
    setMessages([]);
    setAnswers(emptyAnswers);
    setStep("intent");
    setError(null);
    say(["Sure, let's start again."]);
  }

  const chips = chipsFor[step] ?? [];
  // Steps whose chips cover every answer hide the text box; email and message chips only offer a skip.
  const live = mode === "staff";
  const showInput =
    live || chips.length === 0 || step === "email" || step === "message";
  const summary = [
    `Hello ${site.name}, I'd like to enquire.`,
    `Name: ${answers.name}`,
    answers.intent ? `Looking for: ${answers.intent}` : null,
    `Phone: ${answers.phone}`,
    answers.email ? `Email: ${answers.email}` : null,
    answers.course ? `Course: ${answers.course}` : null,
    answers.message ? `Message: ${answers.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  if (!open) return null;

  const chipClass =
    "rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:border-ink hover:bg-mist/60 hover:text-ink";

  return (
    <>
      <div
        className="fixed inset-0 z-[80] bg-ink/40 backdrop-blur-[2px] lg:hidden"
        onClick={() => setOpen(false)}
      />
      <section
        ref={panel}
        role="dialog"
        aria-label="Chat with us"
        data-lenis-prevent
        className="fixed inset-x-3 bottom-3 z-[90] flex h-[min(34rem,85dvh)] animate-pop-in flex-col overflow-hidden rounded-3xl bg-white text-ink shadow-[0_32px_80px_-24px_rgba(11,18,32,0.5)] ring-1 ring-ink/10 lg:inset-x-auto lg:right-5 lg:bottom-5 lg:w-[23rem]"
      >
        <header className="flex items-center gap-3 bg-ink px-4 py-3.5 text-white">
          <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-brand ring-2 ring-white/20">
            <Image
              src="/images/chat-avatar.jpg"
              alt=""
              fill
              sizes="40px"
              className="object-cover"
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {live && agent ? agent : `${site.shortName} Admissions`}
            </p>
            <p
              className="flex items-center gap-1.5 text-xs text-white/70"
              aria-live="polite"
            >
              <span
                className={`size-1.5 rounded-full ${mode === "ended" ? "bg-white/40" : "bg-green-400"} ${typing ? "animate-pulse" : ""}`}
              />
              {mode === "ended"
                ? "Chat ended"
                : live
                  ? "Admissions executive · Online"
                  : typing
                    ? "Typing…"
                    : "Online"}
            </p>
          </div>
          <a
            href={telHref(site.phones[0])}
            aria-label={`Call us on ${site.phones[0]}`}
            className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <Phone className="size-4" />
          </a>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            className="flex size-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </header>

        <div
          ref={list}
          className="flex flex-1 flex-col gap-2 overflow-y-auto overscroll-contain bg-mist/70 p-4"
        >
          {messages.map((m) =>
            m.from === "system" ? (
              <p
                key={m.id}
                className="my-1 self-center rounded-full bg-white/80 px-3 py-1 text-center text-[11px] text-muted ring-1 ring-ink/5"
              >
                {m.text}
              </p>
            ) : (
              <div
                key={m.id}
                className={`flex max-w-[85%] flex-col ${m.from === "you" ? "self-end items-end" : "self-start items-start"}`}
              >
                {m.from === "staff" && (
                  <span className="mb-0.5 px-1 text-[10.5px] font-semibold text-brand">
                    {m.by ?? "Millennium"} · {site.shortName}
                  </span>
                )}
                <p
                  className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                    m.from === "you"
                      ? "rounded-br-md bg-ink text-white"
                      : m.from === "staff"
                        ? "rounded-bl-md bg-brand text-white"
                        : "rounded-bl-md bg-white ring-1 ring-ink/5"
                  }`}
                >
                  {m.text}
                </p>
              </div>
            ),
          )}
          {typing && (
            <p
              className="flex items-center gap-1 self-start rounded-2xl rounded-bl-md bg-white px-3.5 py-3 ring-1 ring-ink/5"
              aria-label="Typing"
            >
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="size-1.5 animate-bounce rounded-full bg-muted"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </p>
          )}
          {step === "done" && !live && !typing && (
            <div className="mt-1 flex flex-wrap gap-2">
              <a
                href={whatsappHref(summary)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 py-2 text-xs font-semibold text-white"
              >
                <WhatsAppIcon className="size-3.5" />
                Chat on WhatsApp
              </a>
              <Link
                href="/courses"
                onClick={() => setOpen(false)}
                className="rounded-full bg-white px-3.5 py-2 text-xs font-semibold ring-1 ring-ink/10"
              >
                Explore courses
              </Link>
              <button
                type="button"
                onClick={restart}
                className="rounded-full px-3.5 py-2 text-xs font-semibold text-muted hover:text-ink"
              >
                Start over
              </button>
            </div>
          )}
        </div>

        {(step !== "done" || live) && (
          <form
            onSubmit={(e) => (e.preventDefault(), answer(draft))}
            className="border-t border-line bg-white p-3"
          >
            {!live && chips.length > 0 && !typing && (
              <div className="mb-3 flex flex-wrap gap-2">
                {chips.map((chip) =>
                  chip.href ? (
                    <Link
                      key={chip.label}
                      href={chip.href}
                      onClick={() => setOpen(false)}
                      className={chipClass}
                    >
                      {chip.label}
                    </Link>
                  ) : (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => answer(chip.label)}
                      className={chipClass}
                    >
                      {chip.label}
                    </button>
                  ),
                )}
              </div>
            )}
            {error && <p className="mb-2 px-1 text-xs text-brand">{error}</p>}
            {showInput && (
              <div className="flex items-center gap-2">
                <input
                  ref={input}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  type={
                    step === "phone"
                      ? "tel"
                      : step === "email"
                        ? "email"
                        : "text"
                  }
                  inputMode={
                    step === "phone"
                      ? "tel"
                      : step === "email"
                        ? "email"
                        : "text"
                  }
                  autoComplete={
                    step === "name"
                      ? "name"
                      : step === "phone"
                        ? "tel"
                        : step === "email"
                          ? "email"
                          : "off"
                  }
                  placeholder={
                    live
                      ? `Message ${agent ? firstName(agent) : "us"}…`
                      : placeholders[step]
                  }
                  aria-label="Your answer"
                  className="min-w-0 flex-1 rounded-full bg-mist px-4 py-2.5 text-sm outline-none placeholder:text-muted/70 focus:ring-2 focus:ring-ink/10"
                />
                <button
                  type="submit"
                  aria-label="Send"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-white transition hover:bg-brand-dark disabled:opacity-50"
                  disabled={typing}
                >
                  <Send className="size-4" />
                </button>
              </div>
            )}
          </form>
        )}
      </section>
    </>
  );
}
