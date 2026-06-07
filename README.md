# SmartShift — Moving & Logistics App (React)

Animated React UI rebuilt from the Stitch design. Covers the full customer + mover journey across 20 screens.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle
```

Tap the floating **grid button** (bottom-right) to jump to any screen.

## Stack

- **Vite + React** (JS)
- **Tailwind CSS v4** (`@tailwindcss/vite`) — brand theme tokens in `src/index.css`
- **Framer Motion** — page transitions, staggered cards, animated map route, QR scan line, bar chart, online toggle
- **React Router** — full route map
- **lucide-react** — icons

## Screens

**Auth/Onboarding:** Onboarding (3 animated slides), Register, Role Select, Login
**Customer:** Dashboard, 5-step Book wizard (Locations -> Vehicle & Services -> Add Items -> Summary -> Payment), Moves, Live Tracking, Rating & Review, Profile, Alerts
**Mover:** Dashboard (online toggle), Available Jobs (swipe-reject), Active Job Detail, QR Scanner, Profile, Earnings Report, Vehicle Documents, Notifications

## Structure

```
src/
  components/   ui.jsx (PhoneFrame, Button, Card, MapView, Steps...), nav.jsx (TopBar, BottomNav)
  screens/      Auth.jsx, Customer.jsx, Book.jsx, Mover.jsx
  lib/data.js   mock data
  App.jsx       routes + page transitions + screen launcher
```
