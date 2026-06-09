# SmartShift — Complete UI Design Prompt for Stitch AI

Design a **mobile-first moving/shifting service app** called **SmartShift**. It is a two-sided marketplace: **Customers** book house/office moves, and **Movers** (drivers) accept and fulfill those jobs. Every screen is a mobile phone screen (max width ~430px, centered on larger viewports). Generate all 22 screens listed below.

---

## 1. BRAND & GLOBAL DESIGN SYSTEM

**App name:** SmartShift
**Tagline:** "Book Your Move"
**Logo:** A rounded-square (rounded-2xl) tile with a blue gradient (top-left lighter `#3b63f2` → bottom-right darker `#1d36ce`), containing a white **truck icon**, with a subtle blue glow shadow. Next to it, the word **"SmartShift"** in extra-bold tight tracking. On light backgrounds the word is blue (`#1d36ce`); on dark backgrounds it is white. Sizes: small (icon 28px), medium (36px), large (56px with larger 20px text).

**Typography:** Font family **"Plus Jakarta Sans"** (fallback Inter, system-ui). Weights used: 400, 500, 600, 700, 800. Headings are extra-bold (800). Antialiased.

**Color palette:**
- **Brand blue scale:** 50 `#eff4ff`, 100 `#dbe6fe`, 200 `#bccffd`, 300 `#93b0fc`, 400 `#6087f8`, 500 `#3b63f2`, 600 `#2546e6`, 700 `#1d36ce`, 800 `#1e30a6`, 900 `#1e2f83`. Primary brand color = **600 `#2546e6`**.
- **Ink (text):** `#0f172a` (near-black slate).
- **Muted text:** `#64748b` (slate-500).
- **Canvas/background:** `#f1f5f9` (slate-100). The body behind the phone frame is `#e2e8f0` (slate-200).
- **Accent / status colors:** emerald/green `#22c55e`–`#10b981` (success, completed, online), rose/red `#ef4444`–`#f43f5e` (error, drop-off, cancel), amber `#f59e0b` (pending, warning), fuchsia `#d946ef` (in-progress).

**Shadows:**
- Card shadow: soft, subtle — `0 1px 3px rgba(15,23,42,0.06), 0 8px 24px -8px rgba(15,23,42,0.08)`.
- Float shadow (hero/CTA): deep blue glow — `0 20px 50px -20px rgba(37,70,230,0.45)`.

**Border radius:** Cards and tiles are `rounded-2xl` (16px) to `rounded-3xl` (24px). Inputs are `rounded-xl` (12px). Pills/badges are fully rounded. Buttons are `rounded-2xl`.

**Core reusable components (use consistently across all screens):**

1. **Button** — full-width by default, rounded-2xl, bold text, py-3.5. Variants:
   - *primary*: vertical blue gradient (brand-500→600), white text, blue glow shadow.
   - *ghost*: white background, ink text, thin slate ring/border.
   - *soft*: light blue background (brand-50), blue text (brand-700).
   - *dark*: slate-900 background, white text.
   - Buttons may contain a leading/trailing lucide icon. Tapping slightly scales down (active state).

2. **Field (text input)** — label above in small semibold slate-500. Input is white, rounded-xl, slate-200 border, py-3, small text. Optional leading icon (slate-400) inset left; optional trailing element (e.g., eye toggle, crosshair) inset right. Focus state: brand-400 border + brand-100 focus ring.

3. **FileUpload** — dashed-border drop zone (rounded-xl). Empty state: slate dashed border, white bg, grey upload-cloud icon in a square tile, text "Tap to upload" + optional hint. Filled state: emerald dashed border, emerald-50 bg, emerald check-circle icon, shows file name. Optional red asterisk for required.

4. **Card** — white, rounded-2xl, soft card shadow.

5. **Badge (pill)** — small rounded-full pill, bold 11px text, with color tones: brand (blue-50/blue-700), progress (fuchsia), pending (amber), green (emerald), red (rose), slate, amber.

6. **TopBar** — sticky top, ~36px top padding (status bar space). Layout: optional left back-button (white circle, slate ring, left-arrow icon) OR hamburger menu icon; centered title (bold ink text) OR centered SmartShift logo when "brand" mode; optional right slot (notification bell, avatar) or kebab (3-dot vertical) menu. Has a translucent backdrop-blur slate-50 background. A dark variant exists for map screens.

7. **NotifBell** — white circle button with slate ring, bell icon, optional red count badge top-right.

8. **BottomNav (tab bar)** — fixed bottom, white translucent backdrop-blur, top border. 5 tabs, each a stacked icon + 10px label. Active tab: icon sits in a brand-600 filled rounded-xl tile with white icon + blue glow, label is brand-700; inactive: slate-400 icon and label.
   - **Customer tabs:** Home (house icon), Book (truck), Moves (map-pin), Alerts (bell), Profile (user).
   - **Mover tabs:** Home (layout-grid), Available (truck), My Jobs (clipboard-list), Alerts (bell), Profile (user).

9. **MapView** — a faux map: light grid lines (`#d3def0` on `#e8eef7`), an animated dashed blue route curve, a green circle pin (start) and red circle pin (destination), and a small blue dot that travels along the route. A **dark variant** uses slate-800 bg with slate-700 grid lines (for tracking/job screens).

10. **Steps / progress bar** — a row of thin equal segments (rounded-full, slate-200 track) that fill with brand-600 as steps complete.

11. **Route component** — a vertical connector showing Pickup→Drop-off: a small brand-blue dot at top, a thin vertical line, a rose-red dot at bottom; labels "Pickup" / "Drop-off" in tiny slate caps with the address below each.

12. **Timeline** — vertical step tracker: each step has a circular node (filled brand-600 with white check = done; brand ring with inner dot = active/in-progress; grey outline = pending) connected by vertical lines; label bold + tiny sub-status ("Done"/"In progress"/"Pending"); pending steps are dimmed.

**Currency format:** Pakistani Rupees, shown as `PKR 4,500` (comma-grouped).

**Motion:** Use gentle entrance animations — fade-up stagger of cards on load, page cross-fades, spring transitions, floating icons. A floating-bottom **grid launcher button** (slate-900 rounded square with a grid icon, fixed bottom-right) opens a right-side drawer listing all screens (developer navigation aid — optional in final design).

**Layout frame:** Entire app constrained to a centered column, max-width ~430px (max-w-md → max-w-lg), white/slate-50 card-like background with a subtle shadow on desktop.

---

## 2. SCREENS

### A. AUTHENTICATION & ONBOARDING

#### Screen 1 — Onboarding (`/`)
Full-screen carousel, 3 slides, light background. Top-right "Skip" text button (slate-500). Center: a large circular illustration zone (256px) — concentric circle: gradient brand-100→50 filled circle, a dashed brand-200 ring inset, and a floating white rounded-3xl tile (128px) in the center holding a big icon. Three small floating blue dots animate around it.
- Slide 1: **"Book Your Move"** — "Schedule house or office shifting in minutes." — icon: **package**.
- Slide 2: **"Track in Real Time"** — "Follow your mover live and scan every item with QR codes." — icon: **truck**.
- Slide 3: **"Pay Securely"** — "Transparent pricing with SSL-encrypted checkout." — icon: green **check**.
Title is 3xl extra-bold ink; subtitle small slate-500 centered max-width.
Bottom row: left = dot pagination (active dot is a wide 28px brand-600 pill, others 8px slate-300); right = a primary button "Next" (with right-arrow), which becomes "Get Started" on the last slide.

#### Screen 2 — Role Select (`/role`)
Light screen. Centered heading **"Join as"** (3xl extra-bold) + subtitle "Select your role to get started with SmartShift."
Two large selectable cards (stacked, full width, rounded-2xl, 2px border, white):
- **Customer** — house icon, title "Customer", subtitle "I want to move".
- **Mover** — truck icon, title "Mover", subtitle "I provide moving services".
Selected card: brand-600 border + card shadow, its icon tile turns brand-600 with white icon, and a brand-600 circular **check** badge appears top-right. Unselected: slate-100 border, slate icon tile.
Bottom: full-width primary **"Continue"** button.

#### Screen 3 — Register / Create Account (`/register`)
TopBar with back button, title "Create Account". A white card:
- Centered heading "Join SmartShift" (blue), subtitle that changes by role — Customer: "Streamline your moving experience today." / Mover: "Register as a Mover — documents required."
- Form fields: **Full Name**, **Email Address**, **Phone Number**, **Password** (with show/hide eye toggle), **Confirm Password**.
- **Profile Photo** FileUpload (required for movers, hint "JPG or PNG").
- **If Mover:** an extra grey rounded panel titled "VERIFICATION DOCUMENTS" (tiny caps) containing 4 required FileUploads: **Driving License**, **CNIC — Front Side**, **CNIC — Back Side**, **Police Clearance Certificate** (accepts image or PDF).
- Inline error message component (rose-50 box, alert icon) when validation fails.
- Primary **"Create Account"** button (shows spinner when loading).
- Footer text: "Already have an account? **Login**" (Login is a blue link).

#### Screen 4 — Login (`/login`)
Light screen, no top bar. Centered large SmartShift logo, heading **"Welcome Back"** (3xl), subtitle "Sign in as Customer" / "Sign in as Mover".
Form: **Email Address** (with mail icon) and **Password** (with lock icon + show/hide eye). Above the password field, right-aligned "**Forgot Password?**" blue link.
Inline error box. Primary **"Login"** button with right-arrow (spinner when loading).
Bottom (pushed to bottom): "Don't have an account? **Register**".

#### Screen 5 — Forgot Password (`/forgot`)
TopBar back + title "Reset Password". Two states:
- **Default:** Centered brand-50 circle with lock icon, heading **"Forgot Password?"**, text "Enter the email tied to your account and we'll send a reset link." Then an **Email Address** field (mail icon), inline error, primary **"Send Reset Link"** button (right-arrow). Bottom: "Remembered it? **Back to Login**".
- **Sent (success):** Centered emerald circle with check icon (springs in), heading **"Check Your Email"**, text "We sent a password reset link to your inbox. Follow it to set a new password.", and a primary **"Back to Login"** button.

#### Screen 6 — Reset Password (`/reset`)
TopBar title "New Password". Two states:
- **Form:** Centered brand-50 lock circle, heading **"Set New Password"**, subtitle "Choose a strong password for your account." Fields: **New Password** (lock icon + eye toggle) and **Confirm Password** (lock icon). Inline error. Primary **"Update Password"** button. (If no recovery session, show an error notice instead of the form.)
- **Done (success):** Emerald check circle, heading **"Password Updated"**, subtitle "Sign in with your new password.", primary **"Back to Login"** button.

#### Screen 7 — Edit Profile (`/profile/edit`)
TopBar back + title "Edit Profile". White card with form:
- Centered round avatar preview (80px, ring).
- **Profile Photo** FileUpload (hint "JPG or PNG").
- **Full Name** field.
- **Email Address** field — disabled/read-only (greyed).
- **Phone Number** field.
- **If Mover:** grey panel "DOCUMENTS (RE-UPLOAD TO REPLACE)" with 4 FileUploads (Driving License, CNIC Front, CNIC Back, Police Clearance) each showing hint "Uploaded" / "Not uploaded".
- Inline error box; on success a green "Profile saved." confirmation box (check icon).
- Two buttons side by side: ghost **"Cancel"** and primary **"Save Changes"** (spinner when saving).

---

### B. CUSTOMER SCREENS

#### Screen 8 — Customer Dashboard / Home (`/customer`)
No top bar; header row: left = "Welcome back" tiny grey + **"Hi, {FirstName} 👋"** (xl extra-bold); right = NotifBell (links to alerts).
- **Hero card:** rounded-3xl blue gradient (brand-600→800), white text, deep blue float shadow, a faint white circle decoration top-right. Title "Ready to Move?", subtext "Book your next seamless shift today.", a ghost **"Book Now"** button (right-arrow). A large floating semi-transparent **truck** illustration bottom-right.
- **Stats grid (2×2):** four white cards each with a label (tiny grey caps) + big number + a brand-50 icon tile: **Total Bookings** (clipboard), **Active** (truck), **Completed** (check), **Cancelled** (x).
- **"Recent Moves"** section header with "View All" blue link (→ Moves).
- List of up to 3 recent booking cards. Each card: booking id `#xxxxxxxx` bold + schedule/vehicle label grey; a status **Badge** (tone by status); a **Route** (pickup→drop-off); then either a primary **"Track Move"** button (navigation icon) if active, or a ghost **"View Details"** button if completed/cancelled.
- Empty state: card with inbox icon + "No bookings yet". Loading: centered spinner.
- BottomNav (customer).

#### Screen 9 — Book a Move Wizard (`/customer/book`)
A 5-step wizard. TopBar shows SmartShift logo (steps 1–4) / "Checkout" title (step 5), with a left back-arrow that goes to the previous step. Below TopBar: a progress header "Step X of 5" (tiny caps left) + current step name (brand-600 right), and the segmented **Steps** progress bar. Steps slide left/right when changing. A sticky bottom bar holds the advance button (label changes per step) and shows inline errors above it.

Step labels: **Locations · Vehicle & Services · Add Items · Summary · Payment**.

- **Step 1 — Locations:** Heading "Where are you moving?". Card with **Pickup Location** field (blue dot label, crosshair trailing icon) and **Drop-off Location** field (red dot label). A MapView (light, rounded). A card "When do you need to move?" with a 2-column grid of selectable time chips (clock icon): "As soon as possible", "Today", "Tomorrow", "This weekend" — selected chip = brand-600 border + brand-50 bg + blue text. Bottom button: **"Next"** (right-arrow).
- **Step 2 — Vehicle & Services:** Heading "Choose Vehicle" + subtitle "Select the transport that fits your load." A 2-column grid of vehicle cards (truck icon, name, capacity, price), selectable (brand-600 border + shadow when active). Vehicles: **Van** (Up to 500kg, PKR 2,500), **Mini Truck** (Up to 1000kg, PKR 4,000), **Large Truck** (Up to 3000kg, PKR 7,500), **Pickup** (Open bed 800kg, PKR 3,000). Then "Optional Services" — a card list with custom checkbox rows: **Packing Service** ("Boxes and bubble wrap", +PKR 2,000), **Loading / Unloading** ("2 Laborers included", +PKR 1,500), **Goods Insurance** ("Coverage up to 100k", +PKR 500). Then a blue-tinted **Summary** card: Vehicle Base Fare, Additional Services, and bold **Estimated Total**. Bottom button: **"Continue to Details"**.
- **Step 3 — Add Items:** Heading "Add Your Items" + subtitle about QR-code tracking. A big dashed "Add Item +" button (plus icon in a circle). Then a list of item cards — each: a square icon tile (sofa/box/package), item name bold, a tag pill ("Furniture" grey / "Fragile" rose), and an X remove button; a divider then a row with "QR Assigned" (brand, qr icon) and an "ID: SS-0xx" code. Default items: **Living Room Sofa** (Furniture), **Kitchen Utensils** (Fragile). Items animate in/out. Bottom button: **"Next Step"**.
- **Step 4 — Summary:** Heading "Review Your Booking". A Route card (pickup→drop-off). A 2-column info card with icon rows: **Schedule**, **Vehicle**, **Items** (count), **Status** ("Pending mover"). A **Price Breakdown** card: Vehicle (name), Additional Services, bold **Total Amount** (blue). Bottom button: **"Confirm & Pay"** (right-arrow).
- **Step 5 — Payment / Checkout:** A brand-50→white gradient card: "Total Amount Due", a huge 4xl blue total, and an emerald "🛡 Secure SSL Encrypted Payment" line. Heading "Payment Method". A card with **Cardholder Name**, **Card Number** (credit-card icon), and a 2-column row of **Expiry Date** (MM/YY) + **CVV** (lock icon). Footer "Powered by **stripe**". Bottom button: **"Pay PKR {total}"** (spinner when processing).

#### Screen 10 — My Moves (`/customer/moves`)
TopBar title "My Moves". A vertical list of booking cards (same card shape as dashboard recent moves: id, schedule/vehicle, status badge, Route, and a ghost "Track Move" / "View Details" button). Empty state: inbox icon + "No moves yet" + "Book your first move" blue link. Loading spinner. BottomNav (customer).

#### Screen 11 — Live Tracking (`/customer/track`)
Dark screen (slate-900). A dark TopBar overlaid on top ("Track My Move", back + kebab). Top ~360px is a **dark MapView** with an animated pulsing brand ring + dot marking the mover's live position. A white rounded-top sheet slides up from the bottom (drag-handle pill at top) containing:
- Big status title (e.g., "In Transit") + sub line "{Vehicle} · PKR {price}" (blue), and a status Badge with a dot ("Mover assigned" / "Finding mover").
- A Route card (pickup→drop-off, with slate ring).
- "Tracking Details" heading + a vertical **Timeline** of the status flow (statuses below) showing done/active/pending nodes.
- States: loading spinner; "No move to track" empty (inbox icon + "Book a move" link).

#### Screen 12 — Rating & Review (`/customer/rating`)
TopBar with SmartShift logo (back + kebab). Centered emerald check circle (springs in), heading **"Move Completed!"**, subtitle "Your items have reached their destination."
- A mover card: round avatar, name "Ahmed Khan", "🚚 Mini Truck", and right side "Job #" / "8492-AX".
- A "Rate Your Experience" card: row of 5 large star buttons (filled amber when selected, slate-300 otherwise, bounce on tap). Below, wrap of selectable tag chips: **Punctual, Professional, Careful with Items, Great Communication** (selected = brand border + brand-50 bg).
- "Write a review (optional)" textarea.
- A tip section: gift icon + "Add a tip for Ahmed?" then a row of tip buttons: **PKR 200, PKR 500, PKR 1,000, Custom** (selected = brand-50 + brand border).
- Primary **"Submit Review"** button (→ dashboard).

#### Screen 13 — Customer Alerts / Notifications (`/customer/alerts`)
TopBar SmartShift logo + back. Heading "Notifications". Notifications grouped by day ("Today", "Yesterday") with tiny caps group labels. Each notification is a card: a colored rounded icon tile (brand/green/amber), bold title (blue + a blue unread dot if accent), grey body text, optional CTA button, optional timestamp. Example items:
- *Today:* "Mover On The Way" (truck, accent) — "Ahmed Khan is en route to your pickup for Move #SM-8492." + **"Track Move"** button. / "Payment Confirmed" (cash, green) — "Your payment of PKR 4,500 for Move #SM-8492 was successful." (2 hours ago).
- *Yesterday:* "Booking Confirmed" (verified) — "Your move on Oct 24 has been confirmed. A mover will be assigned soon." / "Rate Your Move" (star, amber) — "How was your last move? Leave a review for Ahmed Khan."
BottomNav (customer).

#### Screen 14 — Customer Profile (`/customer/profile`)
TopBar SmartShift logo + kebab. Centered round avatar (80px ring), name (xl extra-bold), and a brand Badge "⭐ Premium Member". A 3-column stat card (divided): **12 Moves**, **4.9 Rating**, **2 yr Member**. Then a settings list card (divided rows, each: brand-50 icon tile + label + chevron): **Edit Profile**, **Payment Methods**, **Saved Addresses**, **Privacy & Security**, **Settings**. Final row: red **"Logout"** (rose icon tile, logout icon). BottomNav (customer).

#### Screen 15 — Settings (`/settings`)
TopBar "Settings" back + a brand help (?) icon right. 
- A profile card: rounded brand-50 user-cog tile, name "Alex Johnson", email "alex.j@example.com", an "Edit" blue text button.
- Section **"Account"** (card, divided rows): **Profile details** (user-cog), **Change Password** (key).
- Section **"Preferences"**: **Push Notifications** (bell) with a toggle (on=brand-600), **Dark Mode** (moon) with a toggle, **Language** (globe) showing "English" + chevron.
- Section **"Support"**: **Help Center** (life-buoy), **Terms of Service** (file), **Privacy Policy** (shield-check).
- A full-width white outlined **"Log Out"** button (rose text, logout icon), and below it tiny grey "App Version 2.4.1".
- A 4-tab bottom nav specific to settings: **Moves** (truck), **Tracking** (map-pin), **Chat** (message), **Settings** (active). Section titles are tiny grey caps.

---

### C. MOVER SCREENS

#### Screen 16 — Mover Dashboard / Home (`/mover`)
TopBar SmartShift logo, right = NotifBell + round avatar.
- **Online toggle banner:** a big full-width pill button. When online: emerald gradient, "⚡ You are Online" + a white sliding toggle knob (right). When offline: slate-400, "You are Offline" (knob left). Tapping flips it.
- **3-column stat cards:** **Active** (count), **Completed** (count), **Rating 4.9** (with amber star).
- "Active Job" section header + "Find Jobs" blue link (→ Available).
- **Active job card** (if any): round initial avatar, "Customer" label + name, status Badge; a Route (pickup→drop-off); a primary **"View Job Details"** button (navigation icon).
- Empty state: card with inbox icon + "No active job" + a soft **"Browse Available Jobs"** button.
- Loading spinner. BottomNav (mover).

#### Screen 17 — Available Jobs (`/mover/available`)
TopBar SmartShift logo + a refresh icon button (right). A thin amber status strip: pulsing amber dot + "Online · Looking for jobs near you". A list of job cards, each:
- Top row: brand-50 truck tile + vehicle name + customer name; right = a brand Badge with the price (PKR).
- A Route (pickup→drop-off).
- A calendar line with the schedule label ("Today, 10:00 AM" / "Flexible").
- Two buttons side by side: ghost **"Reject"** (removes the card, swipes left) and primary **"Accept"** (spinner while accepting; on success → job detail).
- Empty: "No jobs available right now. Pull to refresh." BottomNav (mover).

#### Screen 18 — My Jobs (`/mover/jobs`)
TopBar "My Jobs". A list of the mover's job cards: customer name bold, "{vehicle} · PKR {price}" grey, status Badge, and a Route. Each card links to job detail. Empty: inbox + "No jobs yet" + "Find available jobs" link. Loading spinner. BottomNav (mover).

#### Screen 19 — Job Detail / Active Job (`/mover/job/:id`)
TopBar back + title "Job · {Status}". 
- **Customer card:** round initial avatar, customer name, phone (or "No phone"); a brand-600 round **call** button (phone icon) if a phone exists.
- **Addresses card:** Pickup (slate map-pin) + address, Drop-off (rose map-pin) + address; a divider row with vehicle (truck) and bold blue price.
- A **dark MapView** (rounded).
- **Items card:** header "Items (X/Y scanned)" and, if scanning is allowed, a "Scan" link (qr icon → scanner). List of items each with a check-circle (emerald if scanned) / empty circle, item name, and tag.
- **Move Progress card:** a vertical progress Timeline of the status flow (done/active/pending nodes with connectors).
- Footer: if delivered → an emerald "Delivery Completed" confirmation card (package-check icon); else a primary action button whose label is the **next action** for the current status (navigation icon, spinner while updating).

#### Screen 20 — QR Scanner (`/mover/scan/:id`)
Dark full screen (slate-900). Header row: white X close button (→ back to job), title "Scan Item QR Codes", spacer.
- A **camera viewport** (~224px, slate gradient rounded box) with a centered 160px square frame having brand-400 corner brackets and an animated horizontal **scan line** (glowing brand) sweeping up and down. A faint qr icon top-right.
- A white rounded-top sheet: drag handle; row "Scanning Progress" + "X / Y items scanned" (blue); a thin progress bar (brand fill). Then a list of item rows (rounded bordered; scanned ones get brand-50 tint + brand check-circle, others a grey empty circle), each with item name and qr code / tag / "Pending scan".
- Bottom button: **"Scan Next Item"** (soft variant) which becomes primary **"Done"** when all scanned (spinner while scanning).

#### Screen 21 — Mover Profile (`/mover/profile`)
TopBar SmartShift logo + avatar right. Centered avatar (80px ring) with an **emerald online dot** badge, name (xl extra-bold), brand Badge "✔ Verified Mover". 
- A 3-column stat card: **150 Trips** (navigation icon), **4.9 Rating** (star), **45.5k Earnings** (wallet) — each with a small brand icon on top.
- "My Vehicle" card: brand truck tile, "Mini Truck", plate "LED-1234", a slate Badge "Standard".
- "Recent Reviews" header + "View All". Review cards: reviewer name + amber star row + italic quote. Examples: *Sarah J.* (5★) "Ahmed was incredibly professional and handled all my fragile items with great care." / *Michael R.* (5★) "Smooth moving experience. The truck was clean and the process was highly organized."
- A menu list card (divided): **Edit Profile** (user-pen), **Earnings Report** (banknote), **Vehicle Documents** (file), **Support** (help). Final red **"Logout"** row.
- BottomNav (mover).

#### Screen 22 — Earnings Report (`/mover/earnings`)
TopBar SmartShift logo + back + a round avatar initial "A". 
- Heading "Earnings Report" + subtitle "Review your performance and payouts."
- A date-range selector button (calendar icon, "Oct 1 - Oct 7, 2023").
- A brand-50→white gradient card: "TOTAL EARNINGS" caps, big "PKR 12,450", and a primary **"Withdraw"** button (wallet icon).
- "Daily Breakdown" card: header + range; a **bar chart** of 7 days (Mon–Sun), bars grow up with spring animation; one highlighted bar in brand-600 (others brand-200), day labels below (highlighted day bold blue).
- "Recent Transactions" header + "View All". Transaction rows (cards): brand truck tile, "Move ID: #SS-xxxx" + datetime, right = green "+ PKR {amount}" + "Completed". Examples: #SS-8821 (Oct 5, 2:30 PM, +PKR 3,100), #SS-8819 (Oct 4, 10:00 AM, +PKR 2,400), #SS-8790 (Oct 2, 4:15 PM, +PKR 1,200).
- BottomNav (mover).

#### Screen 23 — Vehicle Documents (`/mover/documents`)
TopBar back + title "Vehicle Documents". 
- A brand info banner card: brand-600 shield tile + "Verification Required" + "Please upload clear photos or scans of your vehicle documents to verify your eligibility as a SmartShift Mover."
- A list of document cards, each: brand-50 icon tile + name + description, plus a status Badge / state:
  - **Driving License** (id-card icon) — status *Not Uploaded* (red badge): shows a dashed brand upload zone "Tap to upload or take a photo" / "JPG, PNG or PDF (Max 5MB)".
  - **Vehicle Registration** (file icon) — status *Reviewing* (amber badge): shows an uploaded file row "registration_doc..." with an "Edit" link.
  - **Vehicle Insurance** (shield icon) — status *Verified* (green badge).
  - **Fitness Certificate** (shield icon) — status *Uploading*: "Uploading..." text + uploaded file row "mot_certificate.pdf" with an X, and an animated progress bar (~72%).
- Bottom: a soft **"Submit for Verification"** button.

#### Screen 24 — Mover Notifications (`/mover/notifications`)
Same layout as customer alerts. TopBar SmartShift logo + back + avatar initial "A". Heading "Notifications". Grouped by "Today"/"Yesterday". Items:
- *Today:* "New Job Alert" (truck, accent blue + dot) — "New Job Available! Mini Truck required for a move in Gulberg." + **"View Job"** button. / "Payment Success" (cash, green) — "Payment Received: PKR 4,500 has been added to your wallet for Job #8492." (2 hours ago).
- *Yesterday:* "Document Verified" (verified, brand) — "Vehicle Insurance verified. You're all set to take more jobs!" (Yesterday, 4:30 PM). / "Rating Update" (star, amber) — "New Review: Amna K. gave you 5 stars!" (Yesterday, 10:15 AM).
BottomNav (mover).

---

## 3. STATUS SYSTEM (shared by tracking, job cards, timelines)

Booking/job lifecycle flows in this order, each with a label and a badge tone:
1. **Pending** (amber) — "Pending"
2. **Accepted / Confirmed** (brand) — mover assigned
3. **En Route to Pickup** (brand/fuchsia in-progress)
4. **At Pickup** (in-progress)
5. **Loading Items** (in-progress)
6. **In Transit** (fuchsia in-progress)
7. **At Drop-off** (in-progress)
8. **Delivered** (green) — terminal success
- **Cancelled** (red) — terminal.
"Active" = any status that is not Delivered or Cancelled. Timelines mark earlier statuses as done (filled brand check), the current as active (brand ring + dot), and later as pending (grey, dimmed). The mover's job-detail action button advances to the next status (e.g., "Start Trip", "Mark Loaded", "Mark Delivered" — the next-action label for the current step). QR scanning becomes available once the job reaches the "Loading" stage.

---

## 4. OVERALL STYLE SUMMARY (for the AI)
Clean, modern, friendly fintech/logistics aesthetic. Lots of white space, soft rounded cards on a light slate canvas, a confident blue (#2546e6) as the single primary accent with emerald/amber/rose used only for status semantics. Bold extra-heavy headings, small muted secondary text, pill badges, generous rounding, soft layered shadows, and a deep blue glow on primary CTAs and the hero. Everything is mobile-portrait, with a sticky top bar and a 5-tab bottom navigation. Subtle, springy micro-animations throughout (fade-up stagger, sliding wizard steps, pulsing live-tracking marker, sweeping QR scan line, growing earnings bars).
