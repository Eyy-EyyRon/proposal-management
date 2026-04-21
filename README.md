# Hyacinth Proposal Management System

A full-stack proposal management platform built for **Hyacinth Industries LLC**. Create, send, track, and e-sign proposals with a role-based multi-tier workspace, real-time task pipeline, and a live 3D security UI engine.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Auth | Firebase Authentication |
| Database | Cloud Firestore |
| Storage | Firebase Storage *(Blaze plan required)* |
| Email | Resend |
| 3D Engine | Three.js · React Three Fiber · @react-three/drei |
| Animations | GSAP · Framer Motion |
| Charts | Recharts |
| PDF | jsPDF · html2canvas-pro |
| DOCX Parsing | Mammoth |

---

## Role-Based Access

| Role | Theme | Description |
|---|---|---|
| **CEO** | Gold / Amber | Full system access, task creation, Nuclear Brake, JIT oversight |
| **Super Admin** | Indigo / Violet | User management, role changes (staff/admin only), audit logs |
| **Admin / Dept Admin** | Teal / Indigo | Task assignment, proposal verification, dept scoping |
| **Staff** | Slate / Red | Draft proposals, submit for review, view assigned tasks |

---

## Task Pipeline

```
CEO creates task
  → Admin assigns Dept Admin
    → Dept Admin assigns Staff
      → Staff drafts & submits        (status: verifying)
        → Dept Admin verifies         (status: ready_to_send)
          → CEO Talking Inbox
            → CEO marks sent          (status: sent)
              → Optional: CEO requests revision → loop restarts
```

Urgency can be escalated inline at any stage. Escalating to **P1** notifies the CEO immediately.

---

## Features

### Proposals
- Upload **DOCX** or link a **Google Doc** as a reusable proposal template
- Dynamic fields: Name, Email, Phone, and custom template variables
- Auto-generates a **shareable signing link** (`/p/[shareToken]`)
- Client portal: view PDF, **e-sign** (draw or upload image), or reject
- Status tracking: `Draft → Sent → Viewed → Accepted / Rejected`
- CEO push-back with revision notes after a proposal is sent

### Security Architecture
- **JIT Elevation** — temporary operational/critical elevation with countdown timer
- **Nuclear Brake** — CEO Cloud Function that revokes all elevations and force-logs every active session
- **Peer Immunity** — Firestore rules prevent Super Admins from modifying CEO or other Super Admin accounts
- **Append-only Audit Logs** — every role change and elevation recorded to `/logs`
- **Sentry Bridge** — React component bridging auth state to global emergency status

### 3D Visual Engine
- **Login — Vault Background**: dual-layer constellation (gold + indigo particles), dynamic constellation lines, counter-rotating wireframe icosahedra, mouse repulsion, warp-speed implosion on successful login
- **CEO Sidebar — Security Core**: `MeshDistortMaterial` icosahedron pulsing at exact BPM (60 active / 120 elevated / 180 P1 critical), clickable glassmorphism Quick Actions overlay, 52-fragment nuclear shatter via GSAP
- **Staff Tasks — Urgency Shard**: octahedron with heartbeat BPM formula `f = BPM/60`, GSAP vertical shoot-up on task submission, GSAP shatter on Nuclear Brake
- **Performance Mode**: toggle in Settings replaces all 3D canvases with lightweight CSS fallbacks

### Analytics
- Proposal funnel (sent → viewed → signed)
- Task pipeline counts (drafting / review / revision / ready / sent)
- Urgency distribution (P1 / P2 / P3)
- Optimized with client-side aggregation to minimize Firestore reads

---

## Project Structure

```
app/
├── page.tsx                    # Login page (Vault Background 3D)
├── onboarding/                 # First-time account setup
├── dashboard/                  # Admin, Dept Admin, Staff workspace
│   ├── tasks/
│   ├── proposals/
│   ├── settings/               # Profile, org branding, performance mode
│   └── analytics/
├── ceo-dashboard/              # CEO-only workspace
│   ├── tasks/                  # Talking Inbox, Sent, In Progress
│   ├── security/               # JIT elevation + audit logs
│   └── analytics/
├── super-admin/                # Team management, roles, departments
└── p/[shareToken]/             # Public client signing portal

components/
├── three/
│   ├── particle-field.tsx      # Login Vault Background
│   ├── security-core.tsx       # CEO Security Core (MeshDistortMaterial)
│   ├── urgency-shard.tsx       # Staff P1 Urgency Shard (GSAP)
│   └── lazy-three.tsx          # Performance-aware dynamic wrappers
├── sidebar.tsx                 # Role-filtered navigation
├── task-card.tsx               # Pipeline bar + inline urgency editor
├── create-task-modal.tsx       # Multi-step task creation
└── sentry-bridge.tsx           # Auth to system status bridge

contexts/
├── auth-context.tsx            # Firebase auth + role + JIT elevation state
└── system-status-context.tsx   # Global emergency/nominal state

hooks/
└── use-performance-mode.ts     # localStorage-persisted 3D toggle

lib/
├── firebase.ts
├── firestore.ts                # All Firestore read/write functions
├── auth.ts
└── storage.ts
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Firebase project on the **Blaze plan** (required for Storage and Cloud Functions)
- Resend account for transactional email

### 1. Clone & Install

```bash
git clone https://github.com/DefinitelyNotAhmid/proposalms.git
cd proposalms
npm install --legacy-peer-deps
```

### 2. Environment Variables

Create `.env.local` in the project root:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=proposals@yourdomain.com

# App URL (for shareable proposal links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 4. Create Initial CEO Account

Create the account in **Firebase Console → Authentication**, then set its Firestore document at `/users/{uid}`:

```json
{
  "role": "ceo",
  "firstName": "Your",
  "lastName": "Name",
  "email": "you@company.com"
}
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Production Build

```bash
npm run build
npm start
```

---

## Firestore Collections

| Collection | Purpose |
|---|---|
| `/users` | User profiles and roles |
| `/tasks` | Task pipeline documents |
| `/proposals` | Proposal data and signing state |
| `/elevations` | Active JIT elevation sessions |
| `/logs` | Append-only audit trail |
| `/system_purge_logs` | Nuclear Brake activation records |
| `/org_settings` | Organization branding (logo, name, email signature) |

---

## Urgency Levels

| Level | SLA | Visual |
|---|---|---|
| P3 — Normal | 72 hours | Slate badge |
| P2 — High | 24 hours | Amber badge, 40 BPM shard pulse |
| P1 — Critical | 4 hours | Red badge, 180 BPM strobe, CEO notified instantly |

---

## Email Notifications

| Route | Trigger |
|---|---|
| `POST /api/notify-task` | New task assigned to admin |
| `POST /api/notify-delegation` | Task delegated to staff |
| `POST /api/send-proposal` | Proposal link sent to client |
| `POST /api/notify-viewed` | Client opened the signing portal |
| `POST /api/notify-status` | Proposal accepted or rejected |
| `POST /api/send-signed-document` | Signed PDF delivered to all parties |
| `POST /api/send-ceo-reply-notification` | CEO revision request sent to staff |

---

## License

Private — Hyacinth Industries LLC. All rights reserved.
