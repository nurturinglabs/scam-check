import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FinalVerdict, Signals } from "./detection/types";

export interface StoredVerdict {
  id: string;
  category: string;
  verdict: string;
  severity: string;
  red_flags: string[];
  next_steps: string[];
  reasoning: string;
  created_at: string;
  expires_at: string;
}

export interface InteractionRecord {
  session_id: string;
  user_text: string;
  category: string | null;
  signals: Signals;
  verdict_id: string | null;
}

interface Storage {
  saveVerdict(v: FinalVerdict): Promise<string>;
  getVerdict(id: string): Promise<StoredVerdict | null>;
  recordInteraction(i: InteractionRecord): Promise<void>;
}

const SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function makeSlug(len = 6): string {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += SLUG_ALPHABET[Math.floor(Math.random() * SLUG_ALPHABET.length)];
  }
  return s;
}

class MemoryStorage implements Storage {
  private verdicts = new Map<string, StoredVerdict>();

  async saveVerdict(v: FinalVerdict): Promise<string> {
    let id = makeSlug();
    while (this.verdicts.has(id)) id = makeSlug();
    const now = new Date();
    const expires = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    this.verdicts.set(id, {
      id,
      category: v.category,
      verdict: v.verdict,
      severity: v.severity,
      red_flags: v.red_flags,
      next_steps: v.next_steps,
      reasoning: v.reasoning,
      created_at: now.toISOString(),
      expires_at: expires.toISOString()
    });
    return id;
  }

  async getVerdict(id: string): Promise<StoredVerdict | null> {
    return this.verdicts.get(id) ?? null;
  }

  async recordInteraction(_i: InteractionRecord): Promise<void> {}
}

class SupabaseStorage implements Storage {
  constructor(private client: SupabaseClient) {}

  async saveVerdict(v: FinalVerdict): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const id = makeSlug();
      const { error } = await this.client.from("verdicts").insert({
        id,
        category: v.category,
        verdict: v.verdict,
        severity: v.severity,
        red_flags: v.red_flags,
        next_steps: v.next_steps,
        reasoning: v.reasoning
      });
      if (!error) return id;
      if (!error.message.includes("duplicate")) throw error;
    }
    throw new Error("Could not generate unique verdict id");
  }

  async getVerdict(id: string): Promise<StoredVerdict | null> {
    const { data, error } = await this.client
      .from("verdicts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as StoredVerdict | null) ?? null;
  }

  async recordInteraction(i: InteractionRecord): Promise<void> {
    await this.client.from("interactions").insert({
      session_id: i.session_id,
      user_text: i.user_text,
      category: i.category,
      signals: i.signals,
      verdict_id: i.verdict_id
    });
  }
}

let cached: Storage | null = null;

export function getStorage(): Storage {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    cached = new SupabaseStorage(createClient(url, key, { auth: { persistSession: false } }));
  } else {
    cached = new MemoryStorage();
  }
  return cached;
}
