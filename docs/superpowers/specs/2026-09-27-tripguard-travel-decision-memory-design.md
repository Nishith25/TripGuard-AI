# TripGuard Travel Decision Memory Design

## Purpose

Extend the existing TripGuard AI travel agent with Hindsight memory so a prior manager decision can improve a later trip recommendation for the same fictional traveller. The work should be independently demonstrable by 28 September 2026, ahead of the announced 29 September team submission deadline. The existing TripGuard repository is the base; the Hindsight integration and memory-sensitive decision flow are the new contribution. The organizers' supplied documents do not specify whether pre-existing bases are eligible, so disclose the starting point and verify this with the organizers.

## Success criteria

1. A manager rejects a policy-compliant hotel as unsuitable for an early meeting, with a structured reason and proximity preference. The backend retains the decision through Hindsight using a stable demo traveller identifier.
2. On a subsequent, independent planning request for the same traveller and destination/workplace, the agent recalls relevant decision memory before choosing from current flight and hotel inventory. A nearer compliant hotel is preferred when available, even if a slightly cheaper compliant choice exists. The returned explanation identifies the remembered reason and does not imply the past decision is a company rule.
3. The streamed activity timeline visibly shows recall and its effect. A different traveller or location does not inherit this preference. If Hindsight is unavailable, planning still runs and visibly states that memory was unavailable rather than pretending it was used.
4. Existing mandatory policy and traveller constraints are evaluated before remembered preferences. Recalled content never grants policy exceptions or overrides a current policy.

## Existing implementation and focused changes

The public `Nishith25/TripGuard-AI` repo has a FastAPI backend in `app/main.py`, a LangGraph pipeline in `app/graph.py`, JSON-backed trip and approval routes, and a React form and activity timeline in `frontend/src/components/workspace/NewTripWorkspace.jsx`. The graph currently ranks by fewest violations, unresolved inventory checks, cost and arrival time; the approval route records a manager decision without Hindsight.

- Add an optional, validated demo traveller ID to the planning request and frontend form. Use a separate Hindsight memory bank per demo traveller (or securely tagged equivalent) and make its demo-only identity limitation explicit.
- Add a small backend Hindsight adapter for `retain` and `recall`, configured through server-side environment variables. Never put its token in the frontend or repository.
- Add a recall stage before option selection. Retrieve prior relevant manager outcomes based on traveller, destination, and workplace. Parse/store a tightly defined structured preference such as maximum hotel distance; do not directly execute untrusted recalled instructions.
- Add a structured reason and distance threshold to the manager rejection flow; retain the reviewed decision after the backend saves it. Keep the user's free-form manager note for explanation but do not turn it into a hard policy rule.
- Rank only the options that pass the existing policy/constraint priorities using the remembered soft preference. Within otherwise comparable compliant options, prefer the one satisfying the remembered threshold; preserve the current ranking when no relevant memory is returned.
- Include `memory_used`, brief source context, and a plain-language explanation in the result and streamed trace. Provide a repeatable fictional scenario with local inventory and an initially empty bank.

## Out of scope

Real employee identities, confidential travel records, production authentication, payment or booking, permanent policy changes based on memory, and importing unpublished employer code or data. The existing app's demo-only role separation and ephemeral JSON storage remain limitations.

## Verification and demo

Test policy precedence, isolation between traveller IDs, relevant versus irrelevant recalled outcomes, no-memory fallback, memory-service errors, duplicate approval decisions, and the before/after ranking with deterministic sample inventory. Run backend tests and frontend build, then make two fresh planning requests with a saved manager decision between them. Record a 2–5 minute screen demo showing the retain/recall events and the changed recommendation. The team also needs one clean public code repository, a live demo, a Hindsight explanation, and each member's public article and social post as stated in the supplied challenge documents.
