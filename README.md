# TripGuard AI

**Agentic, policy-aware corporate travel planning with live inventory, explainable decisions, and human approval.**

TripGuard AI converts an employee’s business-travel request into a policy-aware itinerary by retrieving company rules, searching live flight and hotel inventory, checking destination weather, evaluating alternatives, explaining its recommendation, and escalating qualifying requests to a human manager.

---

## Live Application

- **Frontend:** https://trip-guard-ai.vercel.app
- **Backend:** https://tripguard-ai-z34p.onrender.com
- **API Health:** https://tripguard-ai-z34p.onrender.com/health
- **GitHub Repository:** https://github.com/Nishith25/TripGuard-AI
- **90–120 Second Live Demo:** (https://drive.google.com/file/d/1EHl809Baa1_ZlDoYC6_puLJskI-p-whU/view?usp=drivesdk)

> The Render backend may take a few seconds to wake up after inactivity.

---

## Project Overview

Corporate business-travel planning involves more than selecting the cheapest flight and hotel.

A valid recommendation may need to consider:

- Employee budget
- Flight timing
- Required arrival time
- Company travel class
- Maximum flight price
- Maximum hotel price per night
- Hotel distance from the workplace
- Advance-booking guidance
- Local transport allowance
- Manager-approval thresholds
- Destination weather
- Policy clauses requiring human interpretation

TripGuard AI handles these factors through a stateful, multi-step agent workflow instead of returning a simple search result.

The platform separates employee actions, policy administration, autonomous agent execution, and manager approval into clear workspaces.

---

## Problem Statement

Employees often spend significant time comparing travel options while manually checking company-policy documents.

This creates several problems:

- Policy violations may be discovered only after booking.
- Employees may select the cheapest option even when it fails timing or location requirements.
- Managers receive incomplete approval requests without supporting evidence.
- Policy interpretation may vary between employees.
- Travel decisions are difficult to audit.
- Weather and operational risks are often considered too late.

TripGuard AI addresses these problems by combining live travel data, structured policy controls, transparent reasoning, and human-in-the-loop approval.

---

## Solution

TripGuard AI accepts a business-travel request containing details such as:

- Origin and destination
- Travel dates
- Traveller budget
- Required arrival time
- Workplace location
- Business purpose

The agent then:

1. Structures the employee’s requirements.
2. Retrieves the active corporate travel policy.
3. Searches live flight inventory.
4. Searches live hotel inventory.
5. retrieves destination weather.
6. Evaluates possible flight-and-hotel combinations.
7. Ranks valid options.
8. Explains why the selected option was preferred.
9. Identifies policy violations or clauses requiring human review.
10. Sends qualifying requests to a manager approval queue.
11. Stores the manager’s approval or rejection as an auditable record.

---

## Why This Is an Agentic AI System

TripGuard AI is not only a conversational interface or a static recommendation engine.

It demonstrates agentic behaviour through:

- **Stateful orchestration:** LangGraph carries trip data and tool results through multiple workflow nodes.
- **Autonomous tool use:** The agent calls policy, flight, hotel, weather, mapping, compliance, and approval tools.
- **Multi-step decision-making:** It searches, compares, evaluates, ranks, and explains options.
- **Constraint reasoning:** Traveller requirements and company-policy rules are evaluated together.
- **Dynamic escalation:** The workflow decides whether manager review is required.
- **Human-in-the-loop control:** A manager retains authority over exceptions and approval-required trips.
- **Auditability:** Agent runs and manager decisions are stored for later review.

---

## Core Features

### Employee Travel Workspace

- Enter origin and destination
- Select travel dates
- Set traveller budget
- Specify required arrival time
- Add workplace location
- Add business purpose
- Load a demonstration request
- Run the autonomous agent
- Submit qualifying recommendations for manager review

### Live Travel Search

- Live Google Flights results through SerpApi
- Live Google Hotels results through SerpApi
- Location and distance intelligence
- Airline, flight number, timing, price, and provider information
- Hotel price, rating, distance, and provider information

### Corporate Policy Intelligence

- Upload a text-based travel-policy PDF
- Extract structured policy rules
- Detect maximum flight-price limits
- Detect maximum hotel-price limits
- Detect permitted travel class
- Detect workplace-distance limits
- Detect manager-approval thresholds
- Detect transport allowances
- Identify clauses requiring human interpretation
- Keep unspecified fields unset instead of inventing policy rules

### Weather Intelligence

- Live weather data through Open-Meteo
- Destination weather summary
- Weather-risk assessment
- Weather information included in the final recommendation

### Explainable Recommendation

- Recommended flight
- Recommended hotel
- Total estimated trip cost
- Budget remaining or exception amount
- Policy-compliance outcome
- Selection reasoning
- Comparison with cheaper alternatives
- Reasons why lower-priced options were not selected
- Automatically enforced policy fields
- Policy fields not specified in the uploaded document
- Manual-review clauses

### Human Approval Workflow

- Employee submits a completed recommendation
- Pending request appears in the manager workspace
- Manager inspects route, cost, inventory, policy exceptions, and manual checks
- Manager approves or rejects the request
- Reviewer name and decision note are recorded
- Completed decisions appear in audit history
- Associated trip-run status is updated

### Operational Dashboard

- Backend availability
- Number of agent runs
- Approved-trip count
- Pending-approval count
- Active policy summary
- Most recent agent decision

---

## User Workflows

### Employee Workflow

```text
New Trip
   ↓
Enter travel requirements
   ↓
Run autonomous agent
   ↓
Review live recommendation
   ↓
Submit for manager review when required
Policy Administrator Workflow
Policies
   ↓
Upload corporate travel-policy PDF
   ↓
Review extracted policy controls
   ↓
Policy becomes active for future agent runs
Manager Workflow
Approvals
   ↓
View pending employee requests
   ↓
Open a request
   ↓
Review policy, inventory, cost, and exceptions
   ↓
Approve or reject
   ↓
Decision moves to completed history

The current demonstration separates these workflows by application page. Authentication and role-based access control are planned as a production enhancement.

Agent Workflow
Decision Process

TripGuard evaluates travel options using multiple factors rather than selecting only the lowest price.

The agent considers:

Mandatory traveller constraints
Mandatory company-policy rules
Live inventory-verification quality
Arrival-time suitability
Flight price
Hotel price
Hotel distance from the workplace
Total trip cost
Traveller budget
Destination weather risk
Manager-approval thresholds
Clauses requiring manual interpretation

A cheaper flight may not be selected when it:

Arrives after the required time
Violates the allowed travel class
Causes the complete itinerary to exceed the traveller’s budget
Produces a less suitable hotel combination
Has incomplete inventory details
Fails a mandatory company-policy rule
Policy Interpretation

TripGuard separates policy clauses into three categories.

Automatically Enforced

Structured rules that can be evaluated directly, such as:

Maximum flight price
Maximum hotel price per night
Permitted travel class
Maximum hotel distance
Manager-approval threshold
Local transport allowance
Advisory Rules

Guidance that creates a warning but does not automatically invalidate a trip.

For example:

Domestic travel should be booked at least five days in advance.

The word “should” is treated as a recommendation rather than a mandatory violation.

Manual-Review Clauses

Rules that require human interpretation or external evidence.

Examples include:

Original receipts must be submitted.
A department head must validate a particular expense.
Reimbursement documents must be submitted within a specified period.

TripGuard displays these clauses for manager review rather than pretending that they were automatically verified.

Technology Stack
Frontend
React
Vite
JavaScript
Responsive CSS
Custom hash-based routing
Fetch API
Local browser persistence
Backend
Python
FastAPI
LangGraph
Pydantic
Streaming API responses
PDF text extraction
JSON-based demonstration persistence
External Services
SerpApi Google Flights
SerpApi Google Hotels
SerpApi location and mapping data
Open-Meteo weather API
Vercel frontend hosting
Render backend hosting
System Architecture
┌──────────────────────────────────────┐
│             React Frontend           │
│                                      │
│  Dashboard                           │
│  New Trip                            │
│  Policies                            │
│  Approvals                           │
│  Activity                            │
│  Architecture                        │
└──────────────────┬───────────────────┘
                   │
                   │ REST + Streaming
                   ▼
┌──────────────────────────────────────┐
│             FastAPI Backend          │
│                                      │
│  Planning API                        │
│  Policy API                          │
│  Approval API                        │
│  Persistent Run History              │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│          LangGraph Workflow          │
│                                      │
│  Requirement Planner                 │
│  Policy Retrieval                    │
│  Flight Search                       │
│  Hotel Search                        │
│  Weather Analysis                    │
│  Compliance Evaluation               │
│  Selection and Explanation           │
│  Human Approval Handoff              │
└──────────┬──────────┬──────────┬─────┘
           │          │          │
           ▼          ▼          ▼
       SerpApi    Open-Meteo   Policy PDF
Project Structure
TripGuard-AI/
├── app/
│   ├── main.py
│   ├── graph.py
│   ├── routes/
│   │   ├── policy.py
│   │   └── approvals.py
│   ├── tools/
│   │   ├── policy_tool.py
│   │   ├── flight_tool.py
│   │   ├── hotel_tool.py
│   │   └── weather_tool.py
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── workspace/
│   │   │   ├── approval/
│   │   │   └── policy/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
│
├── data/
│   └── travel_policy.json
│
├── docs/
│   ├── demo-policies/
│   │   ├── test_policy.pdf
│   │   └── sample_travel_policy.pdf
│   └── screenshots/
│
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md

The exact structure may include additional supporting modules.

API Endpoints
System
Method	Endpoint	Description
GET	/health	Check backend availability
Agent Planning
Method	Endpoint	Description
POST	/api/plan	Run the complete planning workflow
POST	/api/plan/stream	Stream agent execution events and the final result
Policy
Method	Endpoint	Description
GET	/api/policy/current	Retrieve the active structured policy
POST	/api/policy/upload	Upload and process a policy PDF
Approvals
Method	Endpoint	Description
GET	/api/approvals	Retrieve approval requests
POST	/api/approvals	Create a pending approval request
PATCH	/api/approvals/{approval_id}/decision	Approve or reject an existing request
Local Development
Prerequisites

Install:

Python 3.10 or newer
Node.js 18 or newer
npm
Git

You also need a SerpApi API key for live travel search.

Backend Setup

Clone the repository:

git clone https://github.com/Nishith25/TripGuard-AI
cd TripGuard-AI

Create and activate a Python virtual environment:

macOS or Linux
python3 -m venv .venv
source .venv/bin/activate
Windows PowerShell
python -m venv .venv
.venv\Scripts\Activate.ps1

Install backend dependencies:

pip install -r requirements.txt

Create the backend environment file:

cp .env.example .env

Add the required values:

SERPAPI_API_KEY=your_serpapi_key
ALLOWED_ORIGINS=http://localhost:5173

Start FastAPI:

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

The backend will run at:

http://localhost:8000

API documentation will be available at:

http://localhost:8000/docs
Frontend Setup

Open another terminal:

cd TripGuard-AI/frontend
npm install

Create the frontend environment file:

cp .env.example .env

Set the backend URL:

VITE_API_URL=http://localhost:8000

Start the frontend:

npm run dev

The frontend will normally run at:

http://localhost:5173
Environment Variables
Backend .env
SERPAPI_API_KEY=
ALLOWED_ORIGINS=http://localhost:5173

Do not commit the real .env file.

Frontend frontend/.env
VITE_API_URL=http://localhost:8000

For the deployed frontend:

VITE_API_URL=https://tripguard-ai-z34p.onrender.com
Demo Policies

The repository includes two demonstration policy documents under:

docs/demo-policies/
Test Policy

Demonstrates:

Economy-class requirement
Maximum flight cost of INR 8,000
Maximum hotel price of INR 3,500 per night
Receipt-submission clause requiring manual review
Sample Corporate Travel Policy

Demonstrates:

Economy-class requirement
Maximum round-trip flight cost of INR 9,500
Maximum hotel price of INR 4,000 per night
Maximum hotel distance of four kilometres
Manager approval above INR 16,000
Five-day advance-booking recommendation
INR 1,000 local transport allowance
Recommended Demo Scenario

Use a Hyderabad-to-Bengaluru business trip.

Origin: HYD
Destination: BLR
Destination city: Bengaluru
Traveller budget: INR 18,000
Required arrival time: 10:00 AM
Workplace: Embassy Tech Village
Purpose: Important client meeting

Select valid future departure and return dates.

Expected Demonstration Flow
Upload policy
   ↓
Open New Trip
   ↓
Enter employee requirements
   ↓
Run autonomous agent
   ↓
Watch tool calls execute
   ↓
Review live flight, hotel, weather, and policy result
   ↓
Inspect recommendation reasoning
   ↓
Submit for manager review
   ↓
Open Approvals
   ↓
Approve or reject
   ↓
Verify completed decision and activity status
Live Demo Video

The submission video demonstrates the agent:

Receiving a real employee travel request
Calling live travel and weather tools
Retrieving the active company policy
Evaluating available options
Returning an explainable recommendation
Sending a qualifying request to a manager
Recording a human approval decision

Watch the 90–120 second live demonstration:

https://drive.google.com/file/d/1EHl809Baa1_ZlDoYC6_puLJskI-p-whU/view?usp=drivesdk

Testing the Application
Frontend Build
cd frontend
npm run build
Python Syntax Check

From the project root:

python -m py_compile \
app/main.py \
app/graph.py \
app/tools/policy_tool.py \
app/tools/flight_tool.py \
app/tools/hotel_tool.py \
app/routes/policy.py
Production Workflow Check

Test the deployed application in this order:

Open the live frontend.
Allow the Render backend to wake up.
Upload a demonstration policy.
Open New Trip.
Enter a valid future trip.
Run the autonomous agent.
Confirm that tool activity appears.
Confirm that a live recommendation is returned.
Submit the result for manager review.
Open Approvals.
Review and approve or reject the request.
Confirm that the decision appears under completed approvals.
Confirm that the Activity page reflects the decision.
Deployment
Frontend

The React application is deployed on Vercel:

https://trip-guard-ai.vercel.app
Backend

The FastAPI application is deployed on Render:

https://tripguard-ai-z34p.onrender.com

The frontend communicates with the backend using:

VITE_API_URL=https://tripguard-ai-z34p.onrender.com
Known Limitations
Authentication is not included in the current demonstration.
Employee, administrator, and manager workflows are separated by pages rather than protected user roles.
Render’s filesystem is ephemeral, so an uploaded policy may need to be uploaded again after a restart or redeployment.
The backend may take several seconds to wake up on the free Render hosting tier.
Live travel results depend on SerpApi availability and API quota.
Text-based policy PDFs are supported; scanned image-only PDFs require OCR.
Some policy clauses require human interpretation and cannot be automatically verified.
Browser and JSON persistence are designed for demonstration rather than production-scale use.
Full booking and payment execution are outside the current project scope.
The system recommends inventory but does not purchase tickets or reserve rooms.
Approval-history deletion currently clears the local browser view and is not intended as production record management.
Production Enhancements

Future development can include:

Employee and manager authentication
Role-based access control
PostgreSQL or MongoDB persistence
Organisation and department support
Email and Slack approval notifications
Calendar integration
Direct travel-booking integrations
Expense-management integration
Receipt OCR and validation
Policy versioning
Approval chains
Multi-manager escalation
Cancellation and rebooking workflows
Historical price analysis
More detailed return-flight selection
Automated testing and CI/CD
Persistent file storage for uploaded policies
Enterprise audit logs
Analytics for travel spending and policy violations
Design Principles

TripGuard AI follows these principles:

Policy First

Recommendations must consider company rules before price optimisation.

Explainability

Every selected itinerary should include a clear reason.

No Invented Rules

Policy fields not present in the uploaded document remain unspecified.

Human Authority

The manager retains control when exceptions or approvals are required.

Live Evidence

Recommendations use live travel and weather tools whenever available.

Auditability

Agent activity and human decisions are recorded for later review.

Security Notes
Never commit real API keys.
Keep .env files outside Git.
Use restricted production CORS origins.
Replace JSON and browser persistence with a secured database before production.
Add authentication before processing real employee travel data.
Validate and scan uploaded documents in a production deployment.
Add rate limiting and monitoring to public APIs.
Submission Links
GitHub: https://github.com/Nishith25/TripGuard-AI
Live Application: https://trip-guard-ai.vercel.app
Backend: https://tripguard-ai-z34p.onrender.com
Demo Video: https://drive.google.com/file/d/1EHl809Baa1_ZlDoYC6_puLJskI-p-whU/view?usp=drivesdk
Author

Nishith Reddy Makireddy

B.Tech Computer Science and Engineering
Woxsen University

Email: nishithreddyyyy@gmail.com
GitHub: https://github.com/Nishith25
LinkedIn: https://www.linkedin.com/in/nishith-reddy-91b72525a/
Acknowledgements

TripGuard AI uses:

LangGraph for stateful agent orchestration
FastAPI for backend APIs
React and Vite for the frontend
SerpApi for live travel-search data
Open-Meteo for weather intelligence
Vercel and Render for deployment
Disclaimer

TripGuard AI is a demonstration project.

Travel prices, schedules, hotel availability, weather conditions, and policy interpretations should be independently verified before making real reservations or financial decisions.
