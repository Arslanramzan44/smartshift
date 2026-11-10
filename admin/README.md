# SmartShift · Executive Admin Panel & Fleet Command

A high-performance administrative command dashboard for SmartShift. Built with **React 19**, **Tailwind CSS**, **Framer Motion**, and **Supabase**, with full **Google Maps** live fleet tracking.

---

## Key Features

### 1. Driver Approval & Compliance Desk (`/approvals`)
- **Strict Driver Verification Enforcement**: No mover/driver can pick or accept customer move requests until their driving license, CNIC, and police clearance certificate are reviewed and approved by an administrator.
- **Document Dossier & High-Res Inspection Canvas**:
  - Pakistani Driving License (LTV / HTV)
  - Police Clearance Certificate (Character certificate)
  - CNIC Front and Reverse
  - Zoom (50% to 300%), 90-degree rotation, and high-res lightbox view.
- **1-Click Approvals**: Instantly grants the driver verified status and unlocks the ability to accept customer ride requests.
- **Rejection Workflow**: Specify custom feedback (e.g. "Expired police clearance", "Unreadable license") sent directly to the driver's app.
- **Driver Suspension**: Instantly revoke job access if a safety complaint or violation occurs.

### 2. Live Fleet & Ride Telemetry Radar (`/live-map`)
- **Interactive Google Maps Radar**: Real-time map tracking all active drivers across the metropolitan region.
- **Dual Perspective Tracking**: "Admin can view the ride location as driver can see and can track driver as well".
- **Turn-by-Turn Route Polylines**: Visualizes exact driving route from customer pickup to destination.
- **Interactive Route Simulator**: Admin can click "Live Route Movement" to simulate real-time driver movement along the route with dynamic speed, heading, distance, and ETA calculations.
- **Active Ride Selector**: Switch between fleet overview and individual ride telemetry with one click.

### 3. Rides & Bookings Dispatch (`/rides`)
- Complete ledger of all moves across statuses: `pending`, `accepted`, `en_route`, `loading`, `in_transit`, `at_dropoff`, `delivered`, `cancelled`.
- **Driver Reassignment**: Reassign any job to any verified driver.
- **Status Override**: Administrative status override (e.g. mark delivered or reset).
- **Inventory & QR Tracking**: View scanned vs pending item inventory list.
- **Administrative Cancellation**: Cancel with logged reason.

### 4. Customers & Drivers Registry (`/users` & `/drivers`)
- Directory of all customer and driver accounts.
- Account ban / re-activation controls.
- Search by phone, email, name, vehicle plate.

### 5. Pricing & Operational Controls (`/settings`)
- Configure vehicle base fares (Mini Pickup, Cargo Van, Mazda 3-Ton).
- Configure distance rate per kilometer (PKR/km) and labor rate per mover.
- Master toggle for "Driver Verification Enforcement".
- System-wide broadcast announcement bar.

---

## How to Run

### Method 1: Run from Root Directory
From the project root:
```bash
npm run admin
```
This will launch the dedicated admin server on `http://localhost:5174`.

### Method 2: Embedded in Main Web App
If you are already running the main SmartShift app (`npm run dev`), the Admin Panel is also built right into the app routing at:
```
http://localhost:5173/admin
```
You can also open the **Screen Launcher** (grid icon in bottom-right corner) and tap **"Admin Control Panel"**.

---

## Database Migration
Execute `supabase/admin_and_verification.sql` in your Supabase SQL Editor to ensure all tables, columns, and RLS policies are up-to-date.
