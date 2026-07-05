# TripGuard AI

TripGuard AI is an agentic corporate-travel decision system that converts a business-trip request into an explainable, policy-aware itinerary.

It retrieves company policy rules from an uploaded PDF, searches flight and hotel inventory, calls a live weather API, evaluates policy compliance, recommends the best option and routes qualifying trips through a human approval workflow.

## Agent Workflow

1. Requirement Planner
2. Policy Retrieval Tool
3. Flight Search Tool
4. Hotel Search Tool
5. Weather Intelligence Tool
6. Policy Compliance Tool
7. Decision Agent
8. Human Manager Approval

## Core Capabilities

- Upload and parse a corporate travel-policy PDF
- Convert policy text into structured rules
- Search flight and hotel inventory
- Retrieve live destination weather through Open-Meteo
- Evaluate multiple flight-hotel combinations
- Detect policy violations and approval requirements
- Stream agent execution live to the dashboard
- Generate explainable recommendations
- Approve or reject trips through a human-in-the-loop workflow
- Store approval decisions with unique audit IDs

## Technology Stack

### Backend

- Python
- FastAPI
- LangGraph
- Pydantic
- pypdf
- HTTPX
- Open-Meteo API

### Frontend

- React
- Vite
- JavaScript
- CSS

## Project Structure

```text
TripGuard-AI/
├── app/
│   ├── routes/
│   │   ├── approvals.py
│   │   └── policy.py
│   ├── tools/
│   │   ├── flight_tool.py
│   │   ├── hotel_tool.py
│   │   ├── pdf_policy_tool.py
│   │   ├── policy_tool.py
│   │   └── weather_tool.py
│   ├── graph.py
│   └── main.py
├── data/
│   ├── flights.json
│   ├── hotels.json
│   └── travel_policy.json
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ApprovalModal.jsx
│       │   ├── PolicyUploadCard.jsx
│       │   └── WeatherInsightCard.jsx
│       ├── App.jsx
│       └── index.css
└── requirements.txt