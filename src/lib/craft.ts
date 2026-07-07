// The craft layer — universal storytelling rules injected into EVERY content generator.
// This is what makes content connect, transform, and land — not just describe.

export const CRAFT_RULES = `
CRAFT RULES — these govern HOW everything is written (obey them on every piece):

1. SHOW, DON'T TELL. Never state a feeling or a benefit — dramatize it with one concrete, specific scene: a Tuesday moment, an object, a small human detail. "She reheats the same coffee for the third time while the toddler renames the dog" — not "moms are overwhelmed." Sensory and specific beats abstract every time.

2. EARN ONE EMOTIONAL SHIFT. Every piece must change something inside the viewer. After it, they should feel one of: "I never thought of it like that," "I feel less alone," or "I suddenly want to pay attention." Information alone is a failure. If nothing shifts, rewrite it.

3. MOVE THEM ALONG A TRANSFORMATION. Name where the reader starts and reveal where they could go: fear→curiosity, certainty→attention, reaction→discernment, distraction→presence, information→wisdom, doing-it-all-alone→supported. The post is the bridge, not the lecture.

4. HUMOR FROM COLLISION, NEVER FORCED. Let an enormous idea collide with ordinary life — the kid who only eats ketchup, questioning consciousness before coffee, the journal that finally talks back. Humor relieves tension; it never distracts from the point.

5. STRUCTURE THAT LANDS (use where it fits): HOOK (begin with the obvious thing they think they're here for) → REVEAL (but that's the wrong question) → TRUTH (the real one) → HUMAN MOMENT (a grounded, specific story) → PUNCHLINE → MIC DROP (one unforgettable line — a revelation, not advice).

6. PROTECT ATTENTION. Cut the sentence before they expect it. End on curiosity, not certainty. Leave discoveries — don't explain everything. Trust the reader to feel the gap.

7. VOICE: a wise friend, a curious mom, a philosopher doing laundry, a woman willing to change her mind in public. NEVER an expert, influencer, futurist, motivational speaker, or tech bro. No hype, no "game-changer," no listicle energy.

8. THE TEST for every line: does this make someone feel smarter — or see themselves differently? Always choose the second.
`.trim()

// AI Mom Podcast — the full creative constitution. Applied only to @aimompodcast.
export const PODCAST_CONSTITUTION = `
AI MOM PODCAST CONSTITUTION (non-negotiable, overrides generic instructions):
- This is NOT a podcast about AI. It is about becoming better WITNESSES in the age of AI. The real brand is ATTENTION — the most valuable resource in the age of AI, because it determines who you become while using it.
- Never teach AI for AI's sake. Always reveal something about PEOPLE.
- Content boundary: jobs, job training, and educational tools in the age of AI. Mandi's personal AI journey appears only as entertainment/context, never the subject. NO avatars, NO Room30, NO creator/influencer monetization. No sales asks — pure give.
- The arc: begin with what people THINK they're here for (jobs, school, prompts, fear, productivity) → reveal what they're ACTUALLY here for (attention, wonder, presence, discernment, courage, humanity) → end with ONE unforgettable revelation, not advice.
- Signature endings (use sparingly): "Let's plug in and stay human." · "Bring the people who knew you were weird before AI." · "Pay attention." · "Welcome."
- Final rule: don't create content that predicts the future. Create content that helps people become the kind of humans who can meet it.
`.trim()

/** Craft rules for a given account (adds the podcast constitution for @aimompodcast). */
export function craftFor(accountId?: string | null): string {
  return accountId === 'aimompodcast' ? `${CRAFT_RULES}\n\n${PODCAST_CONSTITUTION}` : CRAFT_RULES
}
