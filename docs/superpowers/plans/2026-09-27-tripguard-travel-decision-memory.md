# TripGuard Travel Decision Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a prior manager hotel decision improve a later TripGuard recommendation for the same demo traveller through Hindsight memory.

**Architecture:** FastAPI stores a structured manager outcome in a per-traveller Hindsight bank and LangGraph recalls it before selecting current inventory. Policy and traveller constraints retain priority. The React form supplies a demo traveller ID and shows memory retrieval and the reason for any changed selection.

**Tech Stack:** Python 3.10+, FastAPI, LangGraph, `hindsight-client`, React/Vite, pytest.

**Spec:** `docs/superpowers/specs/2026-09-27-tripguard-travel-decision-memory-design.md`

## Global Constraints

- Use fictional traveller IDs and decisions; the existing app has no production authentication.
- Existing company policy and explicit trip constraints always beat historical preferences.
- A Hindsight outage must not block a standard planning request; it must be visible in the trace.
- Only the backend reads Hindsight URL/token; secrets never go in React or Git.
- The contribution must be disclosed as an extension of pre-existing TripGuard code until organizers clarify eligibility.
- Do not store an implicit policy exception from a manager approval.

## Review Focus

1. Missing or malformed traveller ID: reject unsupported IDs or use no-memory mode explicitly; never read a shared bank accidentally (Task 1).
2. Same traveller but different workplace: ignore unrelated hotel-distance memories (Task 2).
3. Hindsight `retain` or `recall` fails: preserve a normal trip result with a warning and no fabricated memory trace (Tasks 1 and 2).
4. Rejected option is policy compliant but cheaper: current policy priority remains first and the recalled soft preference only reorders otherwise comparable options (Task 2).
5. Repeated manager approval PATCH: return 409 and retain only the first final decision (Task 1).

---

### Task 1: Capture decisions in Hindsight

**Files:**
- Create: `app/integrations/travel_memory.py` — Hindsight adapter and per-traveller bank ID.
- Modify: `app/routes/approvals.py` — structured rejected-hotel feedback and retain after persisted decision.
- Modify: `app/main.py` — validate an optional `traveller_id` of 3–32 ASCII letters, digits, underscore or hyphen.
- Modify: `requirements.txt`, `.env.example` — add client dependency and `HINDSIGHT_BASE_URL`, optional `HINDSIGHT_API_KEY`.
- Create: `tests/test_travel_memory.py` — adapter, validation and decision-route tests with fake client.

**Interfaces:**
- `bank_id_for(traveller_id: str) -> str`: `tripguard-traveller-<lowercase ID>`; reject invalid ID.
- `retain_hotel_decision(traveller_id: str, destination_city: str, work_location: str, decision: str, max_hotel_distance_km: float | None, note: str, approval_id: str) -> bool`: synchronous retain with `retain_async=False` and `document_id="approval-" + approval_id`; return False on memory-service failure.
- `recall_hotel_preference(traveller_id: str, destination_city: str, work_location: str) -> dict | None`: consumed by Task 2; return a validated threshold, source and reason only when the recalled text matches the destination/workplace; return None otherwise.
- Route addition: optional `feedback_reason: Literal["hotel_too_far", "other"]`, optional `max_hotel_distance_km: float` in range 0.5–20. Require the number for `hotel_too_far`; retain only a completed decision; preserve existing approval response fields plus `memory_saved: bool`.

- [ ] **Step 1: Write failing tests** for ID validation/isolation, exact retain content and document ID, missing feedback, repeat decision 409 without duplicate retain, and service failure returning `memory_saved: false`.
- [ ] **Step 2: Run** `python -m pytest tests/test_travel_memory.py -q`; confirm targeted failures.
- [ ] **Step 3: Implement** the adapter, route changes, request field and environment configuration using the documented `Hindsight(base_url=..., api_key=..., timeout=...)` Python client and `client.retain(bank_id=..., content=..., document_id=..., retain_async=False)`.
- [ ] **Step 4: Re-run** the targeted tests and `python -m py_compile app/main.py app/routes/approvals.py app/integrations/travel_memory.py`.
- [ ] **Step 5: Commit** `git add app/integrations/travel_memory.py app/routes/approvals.py app/main.py requirements.txt .env.example tests/test_travel_memory.py && git commit -m "feat: retain reviewed travel decisions with Hindsight"` in the user's isolated branch.

### Task 2: Recall memory and explain its selection effect

**Files:**
- Modify: `app/graph.py` — `recall_decision_memory` node, candidate ranking, result metadata and trace.
- Extend: `tests/test_travel_memory.py` — simulated Hindsight recall and deterministic policy-compliant candidate sets.

**Interfaces:**
- `recall_decision_memory_node(state: TripGuardState) -> dict[str, Any]`: sets `decision_memory` and adds `Hindsight Recall` trace before `select_recommendation`.
- `preference_rank(option: dict[str, Any], threshold_km: float | None) -> int`: zero for a known distance at/below threshold, one for above/unknown; only used after current policy and inventory priorities.
- The result adds `decision_memory: {status: "used" | "none" | "unavailable", reason: str | None, max_hotel_distance_km: float | None}` and a selection reason when memory changed the selected hotel.

- [ ] **Step 1: Write failing tests** for no-memory unchanged ranking, a remembered `2 km` threshold preferring a closer compliant hotel over a cheaper farther compliant hotel, a violating closer hotel staying disqualified, different workplace ignored, and Hindsight outage yielding a normal result plus warning.
- [ ] **Step 2: Run** `python -m pytest tests/test_travel_memory.py -q`; confirm targeted failures.
- [ ] **Step 3: Implement** the graph node and soft priority after policy and manual-review priority but before cost. Store only validated parsed data from recall; never treat free-form memory as instructions or company policy.
- [ ] **Step 4: Re-run** tests, add a test of `/api/plan/stream` emitting `Hindsight Recall` and `final` events, and verify both plan endpoints agree on selected hotel.
- [ ] **Step 5: Commit** `git add app/graph.py tests/test_travel_memory.py && git commit -m "feat: rank comparable trips using Hindsight recall"`.

### Task 3: Demo flow and documentation

**Files:**
- Modify: `frontend/src/components/workspace/NewTripWorkspace.jsx` — traveller ID, memory panel in recommendation, updated demo sample.
- Modify: existing manager approval component under `frontend/src/components/approval/` — structured distance reason and threshold fields for rejection.
- Modify: `frontend/src/hooks/useTripAgent.js` — send ID and surface trace/result metadata.
- Modify: `README.md` — setup, exact before/after demo script and disclosure of original versus new contribution.
- Create: `docs/travel-decision-memory-demo.md` — repeatable fictional two-trip scenario with expected trace and result.

**Interfaces:**
- Keep existing request keys and existing storage/approval behavior. Add only `traveller_id`, `feedback_reason`, `max_hotel_distance_km`, `decision_memory`, and `memory_saved` through the API.

- [ ] **Step 1: Add a failing frontend check** (if existing test runner is configured) or a small API contract test for form payload and manager feedback; include an invalid ID and absent-memory UI case.
- [ ] **Step 2: Run** the relevant test command to verify the failure.
- [ ] **Step 3: Implement** the fields and clear memory trace/explanation; avoid showing a memory success when `memory_saved` is false.
- [ ] **Step 4: Run** `python -m pytest -q`, `python -m py_compile app/main.py app/graph.py app/routes/approvals.py`, and `cd frontend && npm run build`; run the two-trip demo with configured Hindsight and verify an actual retain/recall changes the selected hotel.
- [ ] **Step 5: Commit** the UI/docs/tests and deploy only after the working memory demo has been confirmed. Prepare the team video and per-member article/social URLs for the single final form submission.

## Handoff

The managed GitHub integration returned HTTP 403 on branch creation, so the original repository has not been changed. Execute in a separate checkout/branch in VS Code after the user's review; provide a patch or exact commands if direct repo access remains unavailable. Review the organizers' policy on use of a pre-existing codebase before submitting, and disclose the existing TripGuard base either way.
