# Weather Rating

A web application that accepts a city or town and returns a **ranking of how desirable it is to visit** for four activities over the next 7 days, based on weather data from [Open-Meteo](https://open-meteo.com/).

**Activities:** Skiing · Surfing · Outdoor sightseeing · Indoor sightseeing

**Stack:** TypeScript, Node.js, GraphQL (Apollo), React (Vite), Docker, Kubernetes.

> **Non-technical overview:** For a plain-language summary of what the app does, how it answers the assignment (the “question” from the test PDF), and what principles guided the work, see [README-NON-TECHNICAL.md](README-NON-TECHNICAL.md).

---

## Quick start

```bash
# Install and run (backend + frontend)
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
npm run dev
```

- **Frontend:** http://localhost:3000  
- **GraphQL:** http://localhost:4000/graphql  

Or with Docker:

```bash
docker-compose up --build
# Frontend: http://localhost:3000
```

Or on **local Kubernetes (Rancher Desktop)**: see [Kubernetes local deployment (Rancher Desktop)](#kubernetes-local-deployment-rancher-desktop) for the full step-by-step (build with nerdctl → load into k8s.io → `kubectl apply -k kubernetes` → port-forward).

---

## Architecture overview

### High-level

```
┌─────────────┐     GraphQL      ┌─────────────────┐     HTTP      ┌──────────────┐
│   React     │ ───────────────► │  Node.js API    │ ─────────────► │  Open-Meteo  │
│   (Vite)    │   /graphql       │  (Apollo)       │  geocode +    │  (no key)    │
└─────────────┘                  └─────────────────┘   forecast    └──────────────┘
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │  Ranking    │  Score 0–100 per activity
                                 │  (daily +   │  from temp, precip, wind,
                                 │   overall)  │  snow, weather code
                                 └─────────────┘
```

- **Frontend:** Single page; user enters a city name, calls GraphQL `getCityRanking(city)`, displays overall scores and per-day breakdown.
- **Backend:** Express + Apollo Server. Resolves `getCityRanking` by: (1) geocoding the city via Open-Meteo Geocoding API, (2) fetching 7-day forecast via Open-Meteo Forecast API, (3) scoring each day for each activity, (4) returning location, overall averages, and daily scores.
- **Ranking:** Pure functions in `backend/src/ranking/scorers.ts`. Input: daily aggregates (min/max temp, precipitation, snowfall, wind, weather code). Output: 0–100 per activity per day; overall = average over 7 days.

### Technical choices

- **GraphQL:** Single query `getCityRanking(city)` keeps the contract simple and allows the frontend to request only what it needs; easy to extend with more fields or activities later.
- **Separation of concerns:**  
  - **Data:** Open-Meteo client and types in `openMeteo/`.  
  - **Logic:** Ranking logic in `ranking/scorers.ts` (no I/O).  
  - **API:** GraphQL schema + resolvers only orchestrate and shape data.
- **No API key:** Open-Meteo is used without authentication as per their non-commercial usage.
- **Containers:** Backend and frontend each have their own Dockerfile (multi-stage for backend, build + nginx for frontend). Frontend nginx proxies `/graphql` and `/health` to the backend so the UI works with one origin in production.
- **Kubernetes / Rancher (KodeCloud-style):**
  - One **Namespace** (`weather-rating`) for the app.
  - **Deployments** for API and Web with explicit **resource requests/limits**, **liveness** and **readiness** probes (HTTP on `/health` for API, `/` for Web).
  - **Services** (ClusterIP) for API and Web; optional **Ingress** for external access.
  - **ConfigMap** for non-sensitive config (e.g. `PORT`).
  - No Secrets required for this app.

### Kubernetes layout

| Resource            | Purpose                                      |
|---------------------|----------------------------------------------|
| `namespace.yaml`    | Isolate app in `weather-rating`              |
| `configmap.yaml`    | API port etc.                                |
| `backend-deployment.yaml`  | API pods (2 replicas), probes, resources   |
| `backend-service.yaml`     | ClusterIP for API (port 4000)               |
| `frontend-deployment.yaml` | Web pods, probes, resources                |
| `frontend-service.yaml`    | ClusterIP for Web (port 80)                 |
| `ingress.yaml`      | Optional; single host, path `/` → Web        |

Apply (after building and loading images into your cluster):

```bash
kubectl apply -f kubernetes/
# Or apply in order: namespace → configmap → backend-* → frontend-* → ingress
```

### Deploying with Rancher

Rancher runs your workload on a Kubernetes cluster; it doesn’t use your local Docker engine. So images must be in a **registry** the cluster can pull from (Docker Hub, GitHub Container Registry, or a private registry).

**1. Build and push images** (from a machine with Docker and registry access):

```bash
# Example: Docker Hub. Replace YOUR_USER with your username.
docker build -t YOUR_USER/weather-rating-api:latest ./backend
docker build -t YOUR_USER/weather-rating-web:latest ./frontend
docker push YOUR_USER/weather-rating-api:latest
docker push YOUR_USER/weather-rating-web:latest
```

**2. Point manifests at your registry**

Either use **Kustomize** (from the `kubernetes/` directory):

```bash
cd kubernetes
kustomize edit set image weather-rating-api:latest=YOUR_USER/weather-rating-api:latest
kustomize edit set image weather-rating-web:latest=YOUR_USER/weather-rating-web:latest
kubectl apply -k .
```

Or edit the Deployments in `backend-deployment.yaml` and `frontend-deployment.yaml`: set `image` to e.g. `YOUR_USER/weather-rating-api:latest` and `YOUR_USER/weather-rating-web:latest`, then apply with `kubectl apply -f kubernetes/`.

**3. Deploy via Rancher UI**

- In Rancher, open your cluster and **Namespaces** (or **Workloads**).
- Use **Import YAML**: paste or upload the contents of the `kubernetes/` files (namespace, ConfigMap, both Deployments and Services, and optionally Ingress). Ensure the **image** in both Deployments uses your registry (e.g. `YOUR_USER/weather-rating-api:latest`).
- Or create the namespace first, then **Deploy** each app and choose “Image from registry”, then point to your pushed images.

**4. Expose the app**

- Use the optional **Ingress** in `kubernetes/ingress.yaml` and set `spec.rules[0].host` to a hostname that resolves in your environment (or use Rancher’s Ingress UI).
- Or create a **Load Balancer** / **NodePort** Service in Rancher for `weather-rating-web` (port 80) and open the app via the provided URL.

---

## Kubernetes local deployment (Rancher Desktop)

This section documents in detail how to run the app on a **local** Kubernetes cluster managed by **Rancher Desktop**. No Docker daemon or external image registry is required: you build images with **nerdctl** and load them into the cluster’s image store.

### Overview

| Step | Action | Purpose |
|------|--------|---------|
| 1 | Prerequisites | Rancher Desktop, kubectl, nerdctl |
| 2 | Build images | Create `weather-rating-api:latest` and `weather-rating-web:latest` with nerdctl |
| 3 | Load images into `k8s.io` | Make images visible to the Kubernetes cluster |
| 4 | Deploy | Apply manifests with `kubectl apply -k kubernetes` |
| 5 | Access | Port-forward `weather-rating-web` to localhost and open the app |

Flow: **Build (nerdctl) → Save to tarball → Load into k8s.io → kubectl apply -k → port-forward.**

---

### Prerequisites

1. **Rancher Desktop**
   - Install from [rancherdesktop.io](https://rancherdesktop.io/).
   - Start Rancher Desktop and ensure **Kubernetes** is enabled (Settings → Kubernetes).
   - Wait until the cluster is ready (green indicator in the tray).

2. **Container runtime in Rancher Desktop**
   - Use the **containerd** runtime (Settings → Container Engine). This gives you **nerdctl**; the steps below assume containerd (not “dockerd (moby)”).

3. **kubectl**
   - Rancher Desktop installs and configures `kubectl`. Ensure your context points at the local cluster:
   - **Windows (PowerShell):**
     ```powershell
     kubectl config current-context
     # Should show: rancher-desktop
     ```
   - **macOS/Linux:**
     ```bash
     kubectl config current-context   # e.g. rancher-desktop
     ```

4. **nerdctl**
   - Available from the same shell you use for `kubectl` (Rancher Desktop adds it to the path).
   - **Windows:** Use “Rancher Desktop” or “wsl” terminal from the tray, or ensure nerdctl is on PATH.
   - Check:
     ```powershell
     nerdctl version
     ```
     You should see both Client and Server (containerd) versions.

---

### Why nerdctl and image loading?

- Rancher Desktop’s cluster uses **containerd**, not the Docker daemon. So `docker build` (if you had Docker installed) would not put images where the cluster can see them.
- **nerdctl** builds images in containerd. By default they go into the **default** namespace. The Kubernetes cluster uses the **k8s.io** namespace. So images must be **loaded** into `k8s.io` (e.g. via `nerdctl save` and `nerdctl -n k8s.io load`).
- The manifests use **imagePullPolicy: Never** so the kubelet does not try to pull from a registry and only uses the images you loaded locally.

---

### Step 1: Build the images

From the **repository root** (`weather-rating/`):

**PowerShell (Windows):**
```powershell
cd c:\Users\emana\Documents\code\weather-rating   # or your path

nerdctl build -t weather-rating-api:latest ./backend
nerdctl build -t weather-rating-web:latest ./frontend
```

**Bash (macOS/Linux or WSL):**
```bash
cd /path/to/weather-rating

nerdctl build -t weather-rating-api:latest ./backend
nerdctl build -t weather-rating-web:latest ./frontend
```

- **Backend:** Multi-stage Dockerfile; builds Node app and runs it in a minimal image (port 4000).
- **Frontend:** Builds React app with Vite, then serves it with nginx (port 80); nginx proxies `/graphql` and `/health` to the backend service.

Confirm images exist:
```powershell
nerdctl images | findstr weather-rating
# or (Bash): nerdctl images | grep weather-rating
```

---

### Step 2: Load images into the Kubernetes image namespace

The cluster only sees images in the **k8s.io** namespace. Export each image to a tarball, then load it into that namespace.

**PowerShell (Windows):**
```powershell
# From repo root
nerdctl save weather-rating-api:latest -o api.tar
nerdctl save weather-rating-web:latest -o web.tar

nerdctl -n k8s.io load -i api.tar
nerdctl -n k8s.io load -i web.tar
```

**Bash:**
```bash
nerdctl save weather-rating-api:latest -o api.tar
nerdctl save weather-rating-web:latest -o web.tar

nerdctl -n k8s.io load -i api.tar
nerdctl -n k8s.io load -i web.tar
```

Expected output:
```
Loaded image: weather-rating-api:latest
Loaded image: weather-rating-web:latest
```

Optional: remove tarballs after a successful load.
- PowerShell: `Remove-Item api.tar, web.tar`
- Bash: `rm api.tar web.tar`

Optional: list images in the k8s namespace (to confirm):
```powershell
nerdctl -n k8s.io images | findstr weather-rating
```

---

### Step 3: Ensure manifests use local-only images

For **local** deployment, the cluster must not try to pull from a registry. The repo is set up for that:

- **kubernetes/backend-deployment.yaml:** `image: weather-rating-api:latest`, `imagePullPolicy: Never`
- **kubernetes/frontend-deployment.yaml:** `image: weather-rating-web:latest`, `imagePullPolicy: Never`

If you have changed these to `IfNotPresent` (e.g. for a remote registry), set them back to **Never** for local runs, then re-apply in Step 4.

---

### Step 4: Deploy to the cluster

From the **repository root**:

```powershell
kubectl apply -k kubernetes
```

This creates or updates:

- Namespace: `weather-rating`
- ConfigMap: `weather-rating-config` (e.g. `PORT` for the API)
- Deployments: `weather-rating-api` (2 replicas), `weather-rating-web` (1 replica)
- Services: `weather-rating-api` (ClusterIP 4000), `weather-rating-web` (ClusterIP 80)
- Ingress: `weather-rating` (optional; see below)

To apply only specific files:
```powershell
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/backend-deployment.yaml
kubectl apply -f kubernetes/backend-service.yaml
kubectl apply -f kubernetes/frontend-deployment.yaml
kubectl apply -f kubernetes/frontend-service.yaml
# Optional: kubectl apply -f kubernetes/ingress.yaml
```

---

### Step 5: Wait for pods to be ready

```powershell
kubectl get pods -n weather-rating
```

Wait until you see something like:

```
NAME                                  READY   STATUS    RESTARTS   AGE
weather-rating-api-xxxxxxxxxx-xxxxx    1/1     Running   0          1m
weather-rating-api-xxxxxxxxxx-xxxxx    1/1     Running   0          1m
weather-rating-web-xxxxxxxxxx-xxxxx    1/1     Running   0          1m
```

- **READY** should be `1/1` (or `2/2` for the API). **STATUS** should be **Running**.
- First time may take 30–60 seconds while the kubelet starts containers and readiness probes pass.

**If pods stay in ImagePullBackOff or ErrImagePull:**

- The cluster is trying to pull the image from a registry and failing. For local deployment it should use the image you loaded into `k8s.io`.
- Ensure Step 2 completed without errors and that `imagePullPolicy: Never` is set (Step 3).
- Reload images and restart pods:
  ```powershell
  nerdctl -n k8s.io load -i api.tar
  nerdctl -n k8s.io load -i web.tar
  kubectl delete pods -n weather-rating --all
  ```
- New pods will be created and should come up **Running**.

**Check pod logs if a pod is not ready:**
```powershell
kubectl logs -n weather-rating -l app=weather-rating-api --tail=50
kubectl logs -n weather-rating -l app=weather-rating-web --tail=50
```

---

### Step 6: Access the app

The Services are **ClusterIP**, so they are not exposed outside the cluster. Use **port-forward** to reach the web UI from your machine.

**Start port-forward (leave this terminal open):**
```powershell
kubectl port-forward -n weather-rating svc/weather-rating-web 3000:80
```

You should see:
```
Forwarding from 127.0.0.1:3000 -> 80
Forwarding from [::1]:3000 -> 80
```

**Open in a browser:** **http://localhost:3000**

- Enter a city or town name and click **Get ranking**.
- The UI calls the backend via `/graphql` (proxied by the frontend pod to the API service).

To stop the port-forward: press **Ctrl+C** in the terminal where it is running.

**Optional: port-forward the API directly** (e.g. to hit health or GraphQL from another tool):
```powershell
kubectl port-forward -n weather-rating svc/weather-rating-api 4000:4000
```
Then: http://localhost:4000/health → `{"status":"ok"}`, http://localhost:4000/graphql → GraphQL playground if enabled.

---

### Optional: Ingress (if you have an Ingress controller)

If your Rancher Desktop cluster has an Ingress controller (e.g. NGINX Ingress installed via Helm or Rancher):

1. Edit **kubernetes/ingress.yaml** and set `spec.rules[0].host` to a hostname (e.g. `weather-rating.local`).
2. Make that hostname resolve to your cluster (e.g. **Windows:** add to `C:\Windows\System32\drivers\etc\hosts`: `127.0.0.1 weather-rating.local`).
3. Apply: `kubectl apply -f kubernetes/ingress.yaml`.
4. Open **http://weather-rating.local** (or the host you set). No port-forward needed if the Ingress controller is bound to localhost.

---

### Verifying the deployment

| Check | Command |
|-------|--------|
| Pods | `kubectl get pods -n weather-rating` |
| Services | `kubectl get svc -n weather-rating` |
| API health | `kubectl port-forward -n weather-rating svc/weather-rating-api 4000:4000` then open http://localhost:4000/health |
| Describe pod (events) | `kubectl describe pod -n weather-rating -l app=weather-rating-api` |

---

### Redeploying after code or image changes

1. **Rebuild** the images (Step 1).
2. **Reload** into `k8s.io` (Step 2: save to tarballs, then `nerdctl -n k8s.io load -i api.tar` and same for `web.tar`).
3. **Restart** workloads so new pods use the updated images:
   ```powershell
   kubectl delete pods -n weather-rating --all
   ```
   The Deployments will create new pods; no need to run `kubectl apply -k kubernetes` again unless you changed YAML.

---

### Tear down (remove the deployment)

To delete all resources in the `weather-rating` namespace:

```powershell
kubectl delete namespace weather-rating
```

Or delete only the app resources and keep the namespace:

```powershell
kubectl delete -k kubernetes
```

---

### Quick reference (copy-paste)

**Full local run (PowerShell, from repo root):**
```powershell
# Build
nerdctl build -t weather-rating-api:latest ./backend
nerdctl build -t weather-rating-web:latest ./frontend

# Load into cluster image store
nerdctl save weather-rating-api:latest -o api.tar
nerdctl save weather-rating-web:latest -o web.tar
nerdctl -n k8s.io load -i api.tar
nerdctl -n k8s.io load -i web.tar

# Deploy
kubectl apply -k kubernetes

# Wait for pods (then run port-forward)
kubectl get pods -n weather-rating -w
# When READY 1/1, in another terminal:
kubectl port-forward -n weather-rating svc/weather-rating-web 3000:80
# Open http://localhost:3000
```

---

### Switching back to a registry (remote cluster)

When you deploy to a **remote** cluster or want the cluster to pull from a registry:

1. Build and push images to your registry (see [Deploying with Rancher](#deploying-with-rancher)).
2. In **kubernetes/backend-deployment.yaml** and **kubernetes/frontend-deployment.yaml**:
   - Set `image` to your registry URL (e.g. `YOUR_USER/weather-rating-api:latest`).
   - Set `imagePullPolicy: IfNotPresent` (or remove the field; it defaults to `IfNotPresent`).
3. Apply the manifests to the target cluster.

---

## How AI assisted

- **Scaffolding:** AI suggested the initial project layout (backend/frontend split, GraphQL schema shape, React + Apollo setup) and Open-Meteo API usage (geocoding + forecast endpoints and parameters).
- **Ranking rules:** The scoring formulas in `scorers.ts` were designed with AI input (e.g. skiing ↔ cold/snow, surfing ↔ wind band, outdoor ↔ clear/dry, indoor ↔ bad-weather-friendly), then adjusted for numeric bounds and edge cases.
- **Kubernetes manifests:** Structure (Deployments, Services, probes, resources, ConfigMap) followed KodeCloud/Rancher-style practices; AI helped keep manifests consistent and avoid typos.
- **Copy and docs:** README sections (architecture, trade-offs) were drafted with AI and then edited for accuracy and brevity.

Judgment used: choosing which activity factors to prioritize, keeping the ranking logic in one place and testable, and not over-engineering (e.g. no DB or cache for a 2–3 hour scope).

---

## Omissions & trade-offs

### Omissions

- **No database or cache:** Every request hits Open-Meteo. For a take-home, this keeps the system simple. For production you’d add caching (e.g. short TTL per location) or a small store for recent results.
- **No auth:** No login or API keys. Acceptable for a demo; production would add auth and rate limiting.
- **Single result for “city”:** Geocoding returns the first match only. No disambiguation UI (e.g. “Berlin, DE” vs “Berlin, US”). Adding a location picker or `limit` + display of multiple matches would fix this.
- **No automated tests:** No unit tests for scorers or integration tests for GraphQL. In production, tests for the ranking logic and the main query would be added first.
- **No error taxonomy:** API returns generic errors. Better UX would map Open-Meteo/network errors to user-friendly messages and possibly retries.
- **No loading/skeleton UX:** Only a “Loading…” state; no skeleton or progressive display.
- **Ingress not wired for TLS:** Ingress is commented for TLS; in production you’d configure cert-manager or cluster-specific TLS.

### Shortcuts and how to fix them

| Shortcut | Fix |
|----------|-----|
| Frontend assumes backend at same origin (proxy) | Use env (e.g. `VITE_GRAPHQL_URI`) for API URL so dev and prod can differ. |
| Ranking formulas are heuristic | Add tests with fixed inputs; consider making weights configurable (e.g. via ConfigMap). |
| No retries to Open-Meteo | Add a small retry/backoff in the Open-Meteo client for transient failures. |
| Images `weather-rating-api:latest` / `weather-rating-web:latest` | Build and push to a real registry; use image tags and pull policy appropriate for the cluster. |

---

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Run backend + frontend (concurrently) |
| `npm run dev:backend` | Run API only (port 4000) |
| `npm run dev:frontend` | Run Vite only (port 3000, proxies /graphql to 4000) |
| `npm run build` | Build backend and frontend |
| `docker-compose up --build` | Run API + Web in Docker |
| `kubectl apply -k kubernetes` | Deploy to Kubernetes (after building/loading images; see [Kubernetes local deployment](#kubernetes-local-deployment-rancher-desktop)) |

---

## License

MIT. Weather data from Open-Meteo (see [Open-Meteo terms](https://open-meteo.com/en/terms)).
