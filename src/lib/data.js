// Mock data powering the SmartShift demo

export const vehicles = [
  { id: 'van', name: 'Van', cap: 'Up to 500kg', price: 2500 },
  { id: 'mini', name: 'Mini Truck', cap: 'Up to 1000kg', price: 4000 },
  { id: 'large', name: 'Large Truck', cap: 'Up to 3000kg', price: 7500 },
  { id: 'pickup', name: 'Pickup', cap: 'Open bed, 800kg', price: 3000 },
]

export const services = [
  { id: 'packing', name: 'Packing Service', desc: 'Boxes and bubble wrap', price: 2000 },
  { id: 'labor', name: 'Loading / Unloading', desc: '2 Laborers included', price: 1500 },
  { id: 'insurance', name: 'Goods Insurance', desc: 'Coverage up to 100k', price: 500 },
]

export const bookingItems = [
  { id: 'ss-081', name: 'Living Room Sofa', tag: 'Furniture' },
  { id: 'ss-082', name: 'Kitchen Utensils', tag: 'Fragile' },
]

export const customerStats = [
  { label: 'Total Bookings', value: 12, icon: 'clipboard' },
  { label: 'Active', value: 1, icon: 'truck' },
  { label: 'Completed', value: 10, icon: 'check' },
  { label: 'Cancelled', value: 1, icon: 'x' },
]

export const recentMoves = [
  {
    id: 'SM-8492',
    when: 'Today, 09:00 AM',
    status: 'In Transit',
    tone: 'progress',
    pickup: '124 Maple Street, Springfield',
    drop: '890 Oak Avenue, Riverdale',
  },
  {
    id: 'SM-8501',
    when: 'Oct 24, 02:30 PM',
    status: 'Pending',
    tone: 'pending',
    pickup: '45 West Pine Blvd, Suite 200',
    drop: '77 Sunset Drive, Hilltop',
  },
]

export const moverStats = [
  { label: "Today's Jobs", value: '3' },
  { label: 'Total Trips', value: '150' },
  { label: 'Avg Rating', value: '4.9', star: true },
]

export const availableJobs = [
  {
    id: 'j1',
    vehicle: 'Mini Truck',
    distance: '12km away',
    price: 4500,
    pickup: 'Gulberg, Lahore',
    drop: 'DHA Phase 5',
    when: 'Today, 10:00 AM',
  },
  {
    id: 'j2',
    vehicle: 'Pickup',
    distance: '5km away',
    price: 3000,
    pickup: 'Model Town',
    drop: 'Johar Town',
    when: 'Oct 25, 09:00 AM',
  },
]

export const moveProgress = [
  { time: '08:00 AM', label: 'Job Confirmed', state: 'done' },
  { time: '08:30 AM', label: 'En Route to Pickup', state: 'done' },
  { time: '09:15 AM', label: 'At Pickup', state: 'done' },
  { time: '11:00 AM', label: 'Loading Items', state: 'done' },
  { time: 'In Progress', label: 'In Transit', state: 'active' },
  { time: 'Pending', label: 'At Drop-off', state: 'pending' },
  { time: 'Pending', label: 'Delivered', state: 'pending' },
]

export const scanItems = [
  { id: 'MOV-8472-A', name: 'Living Room Sofa', sub: 'ID: MOV-8472-A', done: true },
  { id: 'box12', name: 'Kitchen Utensils', sub: 'Box 12 · Fragile', done: true },
  { id: 'bed', name: 'Bed Frame', sub: 'Pending scan', done: false },
  { id: 'dining', name: 'Dining Table', sub: 'Pending scan', done: false },
]

export const reviews = [
  {
    name: 'Sarah J.',
    stars: 5,
    text: 'Ahmed was incredibly professional and handled all my fragile items with great care.',
  },
  {
    name: 'Michael R.',
    stars: 5,
    text: 'Smooth moving experience. The truck was clean and the process was highly organized.',
  },
]

export const transactions = [
  { id: 'SS-8821', when: 'Oct 5, 2023 · 2:30 PM', amount: 3100 },
  { id: 'SS-8819', when: 'Oct 4, 2023 · 10:00 AM', amount: 2400 },
  { id: 'SS-8790', when: 'Oct 2, 2023 · 4:15 PM', amount: 1200 },
]

export const documents = [
  { id: 'license', name: 'Driving License', desc: 'Front and back of valid license', status: 'none' },
  { id: 'reg', name: 'Vehicle Registration', desc: 'Official registration document (V5C)', status: 'review', file: 'registration_doc...' },
  { id: 'ins', name: 'Vehicle Insurance', desc: 'Active commercial insurance policy', status: 'verified' },
  { id: 'fit', name: 'Fitness Certificate', desc: 'MOT or equivalent inspection', status: 'uploading', file: 'mot_certificate.pdf', progress: 72 },
]

export const moverNotifications = [
  {
    group: 'Today',
    items: [
      { icon: 'truck', tone: 'brand', title: 'New Job Alert', accent: true, text: 'New Job Available! Mini Truck required for a move in Gulberg.', cta: 'View Job' },
      { icon: 'cash', tone: 'green', title: 'Payment Success', text: 'Payment Received: PKR 4,500 has been added to your wallet for Job #8492.', when: '2 hours ago' },
    ],
  },
  {
    group: 'Yesterday',
    items: [
      { icon: 'verified', tone: 'brand', title: 'Document Verified', text: "Vehicle Insurance verified. You're all set to take more jobs!", when: 'Yesterday, 4:30 PM' },
      { icon: 'star', tone: 'amber', title: 'Rating Update', text: 'New Review: Amna K. gave you 5 stars!', when: 'Yesterday, 10:15 AM' },
    ],
  },
]

export const ratingTags = ['Punctual', 'Professional', 'Careful with Items', 'Great Communication']
export const tipOptions = [200, 500, 1000]
