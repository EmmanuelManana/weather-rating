# Weather Rating — Overview for Non-Technical Readers

This document explains **what this project does**, **how it answers the original assignment**, and **what principles guided the work**—in plain language, without technical jargon. For developers and deployment details, see the main [README.md](README.md).

---

## What Was the Assignment? (The “Question” from the PDF)

The brief asked to build a **web application** that:

1. **Accepts** a city or town name from the user.
2. **Returns a ranking** of how desirable that place will be to visit for **four activities** over the **next 7 days**, using **weather data**.

The **four activities** to rank were:

- **Skiing**
- **Surfing**
- **Outdoor sightseeing**
- **Indoor sightseeing**

The assignment specified that **Open-Meteo** provides all the APIs needed (no other weather source required). It also set expectations on **time** (about 2–3 hours), **quality over quantity**, and **what would be evaluated**: code quality, architectural decisions, user experience, use of the requested tech stack (React, Node.js, GraphQL), clear communication, and thoughtful use of AI tools.

---

## How This Project Answers That Question

### The product

- **User experience:** A single web page where you type a city or town name and click a button. The app then shows:
  - **Overall scores (0–100)** for each of the four activities for the next 7 days combined.
  - **Day-by-day scores** for each activity so you can see which days are best for skiing, surfing, outdoor sightseeing, or indoor sightseeing.

- **Data source:** All weather data comes from **Open-Meteo** (geocoding to find the place, then a 7-day forecast). No API key is required for the usage described in the assignment.

- **Activities and logic:**  
  - **Skiing** is favoured when it’s cold and snowy.  
  - **Surfing** is favoured when there’s enough wind for waves but it’s not freezing and not pouring rain.  
  - **Outdoor sightseeing** is favoured when it’s clear or partly cloudy, comfortable temperature, and little rain.  
  - **Indoor sightseeing** is favoured when the weather is less ideal outdoors (e.g. rain or overcast), so the app treats “bad weather” as good for indoor plans.

So the app **directly answers the question**: given a city, it returns a **ranking of how desirable it is to visit** for each of the four activities over the next 7 days, based on weather.

---

## How the Deliverables Were Met

The assignment asked for specific **deliverables**. Here is how they were met and where to find them.

### 1. Codebase (backend and frontend in TypeScript)

- **Backend (API):** A small server that: finds the city’s location using Open-Meteo, fetches the 7-day forecast, runs the ranking logic, and exposes one main operation: “get ranking for this city.” It is written in **TypeScript** and uses **Node.js** and **GraphQL**, as requested.
- **Frontend:** A web interface where users enter a city and see the overall and daily rankings. It is built with **React** and **TypeScript**, as requested.
- All of this lives in this repository; the main [README.md](README.md) describes how to run it (locally, with Docker, or on Kubernetes).

### 2. README: architecture and technical choices

- The main README includes:
  - An **architecture overview** (how the frontend, backend, and Open-Meteo fit together).
  - **Technical choices** (e.g. why GraphQL, how data vs. logic vs. UI are kept separate, how the app is packaged and deployed).
  - **Kubernetes / Rancher** layout and local deployment steps (aligned with KodeCloud/Rancher principles: clear structure, health checks, resource limits, one namespace, config separate from code).

So the “architecture and technical choices” requested in the PDF are documented in [README.md](README.md).

### 3. How AI assisted in the process

- The main README has a section **“How AI assisted”** that describes:
  - How AI was used for **scaffolding** (project layout, API usage, GraphQL shape).
  - How AI helped with **ranking rules** (e.g. which weather factors matter for each activity), with human judgment on priorities and limits.
  - How AI helped with **Kubernetes** structure and documentation.
- It also states where **human judgment** was applied (e.g. not adding a database for a short exercise, keeping the ranking logic in one testable place).

This directly answers the requirement to explain how AI was used and how its output was applied.

### 4. Omissions and trade-offs

- The main README has an **“Omissions & trade-offs”** section that:
  - Lists what was **omitted** on purpose (e.g. no database or cache, no login, no city disambiguation, no automated tests in this repo, no detailed error messages for every failure).
  - Explains **why** those were skipped (time, scope, prioritisation).
  - Lists **shortcuts** and how they could be fixed later (e.g. “no retries to Open-Meteo” → add retries; “images not in a registry” → push to a registry for production).

So the requirement for a “brief list of omitted features or polish, and why they were skipped,” plus “any shortcuts taken and how you would fix them,” is addressed there.

---

## Principles That Guided the Work (Reflected in the Project)

The assignment emphasised **quality, structure, and clear reasoning**. The same ideas are reflected in this project in the following ways.

### 1. One clear “question,” one clear answer

- **Principle:** The app has one main job: “Give me a city → tell me how good the next 7 days are for these four activities.”
- **In the project:** One main user action (enter city, get ranking), one main API operation (get city ranking), and one place where ranking rules live. No extra features that blur that focus.

### 2. Separation of concerns (data, logic, presentation)

- **Principle:** Keep “where data comes from,” “how we decide the scores,” and “how we show it” in separate, well-defined layers. That makes the system easier to understand, change, and test.
- **In the project:**  
  - **Data:** All talk to Open-Meteo (finding the city, getting the forecast) is isolated in a dedicated layer.  
  - **Logic:** The rules that turn weather into scores (e.g. “cold + snow = good for skiing”) live in one module, with no direct dependency on the network or the UI.  
  - **Presentation:** The React app only displays what the API returns; it doesn’t implement ranking rules.  
  So the project is built so that data, logic, and UI can evolve somewhat independently.

### 3. Extensibility and scaling in mind

- **Principle:** Design so that adding activities, changing scoring, or moving to a bigger environment is feasible without rewriting everything.
- **In the project:**  
  - Adding a new activity would mean updating the ranking logic and the UI in a few clear places, not scattering changes everywhere.  
  - The API is built so that caching or a database could be added later without changing the core ranking logic.  
  - The app is containerised and has Kubernetes/Rancher manifests (with health checks and resource limits), so the same design can run locally or in a more scalable environment.

### 4. Honest communication about scope and shortcuts

- **Principle:** Be clear about what was done, what was skipped, and why—so reviewers can judge prioritisation and judgment, not just feature count.
- **In the project:**  
  - The main README states omissions (no DB, no auth, no tests in repo, etc.) and why they were acceptable for the exercise.  
  - It lists shortcuts (e.g. no retries, single city result) and how to fix them.  
  - That reflects the assignment’s emphasis on “communication” and “prioritisation judgment.”

### 5. Use of the requested stack and deployment practices

- **Principle:** Use React, Node.js, and GraphQL as specified; consider deployment and operations (e.g. Rancher/Kubernetes) in line with common best practices.
- **In the project:**  
  - **Frontend:** React + TypeScript.  
  - **Backend:** Node.js + GraphQL (Apollo) + TypeScript.  
  - **Deployment:** Dockerfiles and Kubernetes manifests (namespace, deployments, services, config, optional ingress), with health checks and resource limits, consistent with KodeCloud/Rancher-style practices.  
  So the stack and deployment approach match what was asked and the principles “defined herein” (in the main README and the assignment).

### 6. Quality over quantity

- **Principle:** Prefer a small set of well-designed, understandable pieces over many half-finished features.
- **In the project:**  
  - One main flow (city → ranking).  
  - One main API operation.  
  - Clear structure (data / logic / API / UI).  
  - Documented trade-offs and omissions.  
  That aligns with “quality over quantity” and “strong architectural foundations” from the assignment.

---

## Summary Table: Assignment vs. This Project

| What the assignment asked for | How this project answers it |
|------------------------------|-----------------------------|
| Web app: city → ranking for 4 activities, next 7 days, based on weather | ✅ Single page: enter city → see overall and daily scores for Skiing, Surfing, Outdoor sightseeing, Indoor sightseeing, using Open-Meteo weather |
| Use Open-Meteo for APIs | ✅ Geocoding and 7-day forecast from Open-Meteo only |
| Backend + frontend in TypeScript | ✅ Node.js/GraphQL backend and React frontend, both TypeScript |
| React, Node.js, GraphQL | ✅ Used throughout |
| README: architecture and technical choices | ✅ In [README.md](README.md): architecture diagram, technical choices, Kubernetes layout |
| How AI assisted | ✅ In [README.md](README.md): “How AI assisted” section and judgment used |
| Omissions and trade-offs; shortcuts and how to fix them | ✅ In [README.md](README.md): “Omissions & trade-offs” and “Shortcuts and how to fix them” |
| Strong foundations, quality over quantity, clear communication | ✅ Reflected in structure (data / logic / UI), one clear “question,” documented trade-offs, and deployment approach (containers, K8s, health checks) |

---

## Where to Go Next

- **To run or deploy the app:** Use the main [README.md](README.md). It has quick start (npm), Docker, and full Kubernetes (Rancher Desktop) instructions.
- **To understand technical details:** See the “Architecture overview,” “Technical choices,” and “Kubernetes local deployment” sections in [README.md](README.md).
- **To see what was left out and why:** See “Omissions & trade-offs” in [README.md](README.md).

This document (README-NON-TECHNICAL.md) is the **non-technical summary**: it explains the assignment (“the question in the PDF”), how the project answers it, and how the principles defined in the main README and the brief are reflected in the solution.
