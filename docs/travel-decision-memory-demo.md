# Travel Decision Memory Demo

This extension adds Hindsight memory to the existing TripGuard AI project. Use fictional traveller `DEMO_01` and local inventory for a reproducible presentation. The original travel planner and manager approval workflow predate this extension; new work adds a reviewed hotel-distance memory, recall, selection influence and visible trace.

## Setup

In the backend `.env`, set `TRAVEL_PROVIDER_MODE=local`, `HINDSIGHT_BASE_URL=https://api.hindsight.vectorize.io` and your own `HINDSIGHT_API_KEY` from the Hindsight Cloud Connect page. Keep the key in the backend environment and outside Git. Install with `pip install -r requirements.txt`. For self-hosted Hindsight, set the base URL to its API endpoint instead. Check that the active policy is the checked-in `data/travel_policy.json` (hotel limit 5 km and INR 4,500 per night); a previously uploaded policy can change the demonstration.

Start backend with `uvicorn app.main:app --reload` and frontend with `cd frontend && npm install && npm run dev`. For a hosted demo set the same variables in Render, then redeploy the backend and frontend. `TRAVEL_PROVIDER_MODE=local` uses fictional inventory with stable prices and distances.

## Two-trip walkthrough

1. In **New Trip**, click **Load demo request**. Keep traveller `DEMO_01`, destination Bengaluru and workplace Embassy Tech Village; choose valid future dates. Run the agent. On the first trip, with an empty Hindsight bank, it should choose **Outer Ring Business Hotel (HT-204)**, at **4.2 km** from the workplace. This hotel complies with the demo company's **5 km** maximum and costs less than the nearby alternative.
2. Click **Request manager feedback**, then open **Manager approvals**. Open the pending request and enter a short note such as `Too far for our early client meeting`. Choose **Hotel too far from workplace**, set **Prefer hotels within** to `2` km, and **Reject trip**. In the completed approval record, check that it says Hindsight saved the decision. If it says the decision was not saved, fix the Hindsight connection before continuing.
3. Open **New Trip** again. Use `DEMO_01` and the same city/workplace with new future travel dates. The streamed activity should show **Hindsight Recall**. The recommendation should switch to **TechPark Inn (HT-201)** at **1.8 km**, with an explanation that earlier manager feedback influenced the choice. Both hotels comply with current company policy; memory only breaks the tie between acceptable options.
4. As a negative control, change the traveller ID to `DEMO_02` or the workplace to another location. The earlier preference should not affect this traveller or workplace. The application must still plan a trip if Hindsight is unavailable, but it will state that memory was unavailable.

Do not reset or replay the same ID with stale Cloud memory when recording the before/after. Use a fresh fictional ID each time. A manager rejection should be retained once, after the review is saved; a repeated decision attempt returns 409.

## Submission checklist

- Public, documented GitHub repo and live TripGuard demo with the new memory feature.
- 2–5 minute team YouTube video showing a genuine retain, recall and changed recommendation.
- Per-member technical article and social post links per the supplied content guide. Keep the word `hackathon` out of the article and social post content and hashtags.
- Explain that TripGuard existed before this challenge and identify the memory contribution. Ask the organizers whether extensions of existing projects qualify; their supplied documents did not specify.
- Only one final team submission by September 29; no cutoff time was stated in the announcement.

Official client guide: https://hindsight.vectorize.io/sdks/python
