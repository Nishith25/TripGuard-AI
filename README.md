# TripGuard AI

**A memory-powered AI agent for policy-aware corporate travel planning and approval.**

TripGuard AI helps employees plan business travel while considering company policy, live flight and hotel inventory, weather, budget constraints, previous manager decisions, and approval requirements.

Unlike a stateless travel assistant, TripGuard learns from reviewed trips. Manager decisions are retained using **Hindsight persistent memory** and recalled during future relevant requests so the agent can adapt its recommendations while keeping company policy authoritative.

---

## Live Application

- **Frontend:** https://trip-guard-ai.vercel.app
- **Backend:** https://tripguard-ai-z34p.onrender.com
- **Production Health:** https://tripguard-ai-z34p.onrender.com/api/health
- **GitHub:** https://github.com/Nishith25/TripGuard-AI
- **Demo Video:** https://youtu.be/f5Ntd3-mG44?si=TxUHTgy10XDwAlBK

> The Render service may require a few seconds to wake after inactivity.

---

## The Problem

Corporate travel planning is more complicated than choosing the cheapest flight.

Employees may need to consider:

- company flight-price limits
- permitted travel class
- hotel price limits
- hotel distance from the workplace
- traveller budget
- required arrival time
- advance-booking rules
- manager-approval thresholds
- destination weather
- policy clauses that require human interpretation

Managers also encounter similar exceptions repeatedly, but traditional approval systems do not learn from earlier decisions.

For example, if a manager rejects a hotel because it is too far from a client's office and asks the employee to stay within 2 km, a stateless system may recommend another distant hotel next time.

TripGuard remembers that decision.

---

## The Solution

TripGuard combines deterministic policy enforcement, autonomous tool execution, persistent memory, an LLM explanation layer, and human approval.

```text
Employee Trip Request
        ↓
Requirement Planner
        ↓
Corporate Policy Retrieval
        ↓
Live Flight Search
        ↓
Live Hotel Search
        ↓
Weather Intelligence
        ↓
Policy Compliance Evaluation
        ↓
Hindsight Memory Recall
        ↓
Deterministic Recommendation
        ↓
GPT-OSS-120B Explanation
        ↓
Manager Review when required
        ↓
Manager Decision
        ↓
Hindsight Memory Retain
        ↓
Future trips can recall the decision
```

---

## Why TripGuard Is an AI Agent

TripGuard is a multi-step agent rather than a single chatbot request.

- **Stateful orchestration:** LangGraph carries the trip request and intermediate results through a structured workflow.
- **Autonomous tool usage:** The workflow invokes policy, flight, hotel, weather, compliance, memory, recommendation, and explanation steps.
- **Persistent memory:** Hindsight stores reviewed manager decisions and recalls relevant context during later trips.
- **Human-in-the-loop:** Exceptions and approval-required trips remain under manager control.
- **Persistent application state:** Supabase stores trip runs and approval records across backend restarts and deployments.

---

## Hindsight Persistent Memory

Persistent memory is a central part of TripGuard.

Manager feedback can be stored for a fictional traveller ID and recalled when a later trip has relevant context.

TripGuard supports reusable manager memory for:

- **Hotel-distance preferences**
- **Urgent short-notice travel context**
- **Cost-exception context**
- **General reusable manager preferences**

### Example

A manager rejects a hotel and records:

```text
Prefer hotels within 2 km of this workplace.
```

On a later relevant trip, TripGuard recalls that preference through Hindsight and considers it while ranking policy-compliant options.

### Memory Never Overrides Policy

Hindsight memory is contextual preference, not company policy.

TripGuard keeps policy and traveller constraints authoritative. A remembered preference can influence selection between otherwise valid options, but it cannot make a policy violation compliant.

For the repeatable memory walkthrough, see [Travel Decision Memory Demo](docs/travel-decision-memory-demo.md).

---

## LLM Integration

TripGuard uses:

```text
Provider: Groq
Model: openai/gpt-oss-120b
```

The LLM runs **after** deterministic recommendation logic.

It receives already-computed facts such as:

- selected flight
- selected hotel
- total trip cost
- compliance result
- policy violations
- manager-approval requirement
- relevant Hindsight memory
- weather context
- selection reasoning

The LLM converts those facts into a concise, user-facing explanation.

It does **not** decide:

- policy compliance
- which violations exist
- which flight or hotel wins
- whether manager approval is required

If Groq is unavailable, TripGuard keeps the deterministic explanation and continues operating.

---

## Example Agent Activity

```text
Requirement Planner
        ↓
Policy Retrieval Tool
        ↓
Flight Search Tool
        ↓
Hotel Search Tool
        ↓
Weather Intelligence Tool
        ↓
Policy Compliance Tool
        ↓
Hindsight Recall
        ↓
Decision Agent
        ↓
LLM Explanation
```

The frontend streams these stages while the workflow executes.

---

## Core Features

### Employee Travel Workspace

Employees can use TripGuard without signing in.

The employee workspace includes:

- Home
- Trip Request

Employees can provide:

- origin and destination
- destination city
- travel dates
- traveller budget
- required arrival time
- workplace
- business purpose
- traveller ID for memory-enabled demonstrations

Employee requests are evaluated through the same policy, inventory, weather, memory, recommendation, and approval workflow.

### Live Travel Search

TripGuard retrieves live Google Flights and Google Hotels inventory through **SerpApi**.

### Weather Intelligence

**Open-Meteo** provides destination weather context and travel-risk information.

### Corporate Policy Intelligence

TripGuard can process a text-based corporate travel-policy PDF and extract structured controls such as:

- permitted flight class
- maximum round-trip flight price
- maximum hotel price
- maximum workplace distance
- manager-approval threshold
- local transport allowance
- advance-booking recommendations

Clauses that cannot safely be evaluated automatically are preserved for human review.

### Explainable Recommendations

The final result can include:

- recommended flight
- recommended hotel
- estimated total cost
- traveller budget
- exception amount
- compliance result
- policy violations
- warnings
- selection reasoning
- recalled manager context
- manager-approval requirement
- LLM-generated explanation

### Manager Workspace

Manager operations are separated from the employee flow.

The manager workspace includes:

- Manager Overview
- Pending Reviews
- Decision Memory
- Policy
- Logout

Managers can:

- inspect employee travel recommendations
- review policy violations and exceptions
- approve or reject requests
- record a manager decision note
- classify reusable feedback
- store relevant feedback in Hindsight
- review saved decision memory
- manage the active travel policy

Manager routes are protected by a frontend session gate. This improves workflow separation for the current application, but it is not a substitute for production-grade backend authentication and authorization.

### Persistent History

Supabase stores trip runs and approval records so they survive backend restarts and deployments.

---

## Technology Stack

### Frontend

- React
- Vite
- JavaScript
- responsive custom CSS
- streamed backend events
- Vercel

### Backend

- Python
- FastAPI
- LangGraph
- Pydantic
- HTTPX
- PDF text extraction
- Render

### Memory

- Hindsight by Vectorize
- traveller-scoped memory banks
- retain
- recall

### LLM

- Groq API
- `openai/gpt-oss-120b`

### Persistence

- Supabase
- PostgreSQL
- `trip_runs`
- `approvals`

### Live Data

- SerpApi Google Flights
- SerpApi Google Hotels
- Open-Meteo

---

## System Architecture

```text
                    ┌──────────────────────┐
                    │     React / Vite     │
                    │       Frontend       │
                    └──────────┬───────────┘
                               │
             ┌─────────────────┴─────────────────┐
             │                                   │
             ▼                                   ▼
      Employee Workspace                  Manager Workspace
      No login required                   Frontend session gate
      Home / Trip Request                 Overview / Reviews
                                          Memory / Policy
             │                                   │
             └─────────────────┬─────────────────┘
                               │
                               │
                        REST + Streaming
                               │
                               ▼
                    ┌──────────────────────┐
                    │       FastAPI        │
                    │       Backend        │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      LangGraph       │
                    │    Agent Workflow    │
                    └──────────┬───────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
   ┌─────────┐           ┌───────────┐          ┌───────────┐
   │ SerpApi │           │ Open-Meteo│          │ Hindsight │
   │ Flights │           │  Weather  │          │  Memory   │
   │ Hotels  │           └───────────┘          └───────────┘
   └─────────┘
        │
        └──────────────────────┐
                               ▼
                    ┌──────────────────────┐
                    │ Deterministic Policy │
                    │ + Ranking Engine     │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ GPT-OSS-120B / Groq │
                    │ Explanation Layer    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Human Manager Review │
                    └──────────┬───────────┘
                               │
                  ┌────────────┴────────────┐
                  ▼                         ▼
            ┌────────────┐            ┌────────────┐
            │  Supabase  │            │ Hindsight  │
            │ Trips +    │            │  Retain    │
            │ Approvals  │            │  Memory    │
            └────────────┘            └────────────┘
```

---

## Data Persistence

TripGuard uses **Supabase as the server-side source of truth**.

### `trip_runs`

Stores the original request, final recommendation, execution trace, approval status, linked approval data, and timestamps.

### `approvals`

Stores trip information, selected flight and hotel, cost information, compliance result, review status, reviewer, decision note, reusable feedback category, and Hindsight memory status.

Browser storage is used only as a frontend cache/fallback. When server synchronization succeeds, server data is authoritative.

---

## Production Health Monitoring

TripGuard exposes:

```text
GET /api/health
```

A healthy response resembles:

```json
{
  "status": "healthy",
  "services": {
    "api": {"status": "healthy"},
    "supabase": {
      "status": "healthy",
      "backend": "supabase"
    },
    "hindsight": {"status": "healthy"}
  }
}
```

---

## API Endpoints

### Agent

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/plan` | Run the complete planning workflow |
| POST | `/api/plan/stream` | Stream workflow events and the final recommendation |

### Trips

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/trips` | Retrieve persisted trip runs |
| POST | `/api/trips` | Persist a trip run |
| GET | `/api/trips/{id}` | Retrieve one trip |
| PATCH | `/api/trips/{id}/approval` | Update linked approval status |

### Approvals

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/approvals` | Retrieve approval requests |
| POST | `/api/approvals` | Create an approval request |
| GET | `/api/approvals/{id}` | Retrieve one approval |
| PATCH | `/api/approvals/{id}/decision` | Approve or reject |

### Policy

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/policy/current` | Retrieve the active policy |
| POST | `/api/policy/upload` | Upload a policy PDF |

### Health

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check API, Supabase, and Hindsight health |

---

## Local Development

### Requirements

- Python 3.10+
- Node.js 18+
- npm
- Git

### Backend

```bash
git clone https://github.com/Nishith25/TripGuard-AI.git
cd TripGuard-AI
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Configure the backend environment:

```env
ALLOWED_ORIGINS=http://localhost:5173

SERPAPI_API_KEY=
TRAVEL_PROVIDER_MODE=serpapi
TRAVEL_FALLBACK_TO_LOCAL=true

HINDSIGHT_BASE_URL=https://api.hindsight.vectorize.io
HINDSIGHT_API_KEY=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
TRIPGUARD_STORAGE_BACKEND=supabase

GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b
```

Never commit real credentials.

Start the backend:

```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Set:

```env
VITE_API_URL=http://localhost:8000
```

---

## Testing

Run backend tests:

```bash
TRAVEL_PROVIDER_MODE=local PYTHONPATH=. pytest
```

Current test suite:

```text
18 passed
```

Build the frontend:

```bash
cd frontend
npm run build
```

---

## Failure Handling

TripGuard is designed to degrade safely.

- **Hindsight unavailable:** continue with normal policy-based recommendation logic.
- **Groq unavailable:** retain the deterministic explanation.
- **Weather unavailable:** continue and report that weather was unavailable.
- **Live travel search unavailable:** optional local fallback inventory can be enabled.
- **Policy exception:** escalate to human review instead of silently approving.

---

## Security Notes

- API keys remain backend-only.
- `.env` files must never be committed.
- `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the frontend.
- Hindsight and Groq keys remain server-side.
- Supabase tables use Row Level Security.
- Employee access does not require login in the current application.
- Manager routes are separated behind a frontend `sessionStorage` authentication gate.
- The current manager login is a workflow/demo access control mechanism, not production-grade security.
- Production deployment should replace the frontend-only manager gate with backend authentication, secure credential handling, authorization, and role-based access control.

---

## Known Limitations

- Manager access currently uses a frontend-only session gate rather than secure backend authentication.
- Production-grade authentication and role-based authorization are not yet implemented.
- Employee users currently do not authenticate.
- Demo traveller IDs are memory identifiers, not authentication.
- Uploaded policy files are not stored in durable object storage.
- Image-only/scanned policies require OCR support.
- Full ticket purchasing and hotel booking are outside the current scope.
- Live data quality depends on external provider availability.
- Some policy clauses require human interpretation.
- Production-scale concurrency can be improved with more targeted database operations.

---

## Project Status

The current production system includes:

- live flight search
- live hotel search
- live weather intelligence
- structured policy evaluation
- LangGraph orchestration
- Hindsight persistent memory
- manager retain/recall workflow
- Groq GPT-OSS-120B explanation layer
- Supabase persistent storage
- human manager approval
- separate employee and manager workspaces
- manager overview and protected manager routes
- decision-memory management
- frontend manager session login/logout flow
- production dependency health checks
- automated backend tests
- deployed frontend and backend

---

## Submission Links

- **GitHub:** https://github.com/Nishith25/TripGuard-AI
- **Live Application:** https://trip-guard-ai.vercel.app
- **Backend:** https://tripguard-ai-z34p.onrender.com
- **Health Check:** https://tripguard-ai-z34p.onrender.com/api/health
- **Public Demo Video:** https://youtu.be/f5Ntd3-mG44?si=TxUHTgy10XDwAlBK
