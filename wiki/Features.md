# ✨ Features Guide

Comprehensive guide to all features in the Family Logistics Dashboard.

---

## Overview

The Family Logistics Dashboard provides a complete trip planning and management solution with the following features:

1. **Trip Management** - Create, edit, and organize trips
2. **Packing Lists** - Categorized packing items with progress tracking
3. **Budget Tracking** - Expense management and budget planning
4. **Document Storage** - Upload and organize trip documents
5. **Timeline/Itinerary** - Schedule events and activities
6. **Trip Sharing** - Collaborate with family members
7. **Packing Templates** - Reusable packing lists

---

## 1. Trip Management

### Features

- Create new trips
- Edit trip details (name, dates, status)
- Delete trips
- Duplicate trips (with all related data)
- Track trip status (planning → booked → ready → done)
- Dashboard view with trip cards

### Trip Status Flow

```
Planning ──→ Booked ──→ Ready ──→ Done
   ↓            ↓         ↓        ↓
  Idea     Reserved    Packed  Completed
```

**Status Definitions:**
- **Planning** - Researching and brainstorming
- **Booked** - Flights/hotels reserved
- **Ready** - Packed and prepared
- **Done** - Trip completed

### Usage

**Create a Trip:**
1. Navigate to Dashboard
2. Click "New Trip" button
3. Fill in trip details:
   - Name (required)
   - Start date (optional)
   - End date (optional)
   - Status (default: planning)
4. Click "Create"

**Edit a Trip:**
1. Click on trip card
2. Update fields
3. Click "Save"

**Duplicate a Trip:**
1. Click "Duplicate" on trip card
2. System copies:
   - Trip details
   - Packing items
   - Budget entries
   - Timeline events
3. New trip created with "(Copy)" suffix

**Delete a Trip:**
1. Click "Delete" on trip card
2. Confirm deletion
3. All related data deleted (CASCADE)

### Technical Details

**Database Table:** `trips`

**Fields:**
- `id` (UUID) - Primary key
- `name` (text) - Trip name
- `start_date` (date) - Start date
- `end_date` (date) - End date
- `status` (enum) - Trip status
- `created_by` (UUID) - Owner user ID
- `created_at` (timestamp) - Creation time

**Repository:** `TripRepository`
**Service:** `TripService`
**Store:** `useTripStore`

---

## 2. Packing Lists

### Features

- Add packing items to trips
- Categorize items (adult, kid, baby, roadtrip, custom)
- Toggle packed/unpacked status
- View progress (X of Y items packed)
- Delete items
- Reorder items (planned)

### Categories

- **Adult** - Clothing, toiletries, etc.
- **Kid** - Children's items
- **Baby** - Baby/infant essentials
- **Roadtrip** - Car travel items
- **Custom** - User-defined

### Usage

**Add Packing Item:**
1. Open trip details
2. Navigate to "Packing" tab
3. Click "Add Item"
4. Enter:
   - Item title (e.g., "Passport")
   - Category
5. Click "Add"

**Mark as Packed:**
1. Click checkbox next to item
2. Item marked as packed
3. Progress bar updates

**Progress Tracking:**
- Shows "X of Y items packed"
- Progress bar visualization
- Percentage complete

### Technical Details

**Database Table:** `packing_items`

**Fields:**
- `id` (UUID) - Primary key
- `trip_id` (UUID) - Foreign key to trips
- `title` (text) - Item name
- `category` (enum) - Item category
- `is_packed` (boolean) - Packed status

**Repository:** `PackingRepository`
**Composable:** `usePackingProgress`

**Progress Calculation:**
```typescript
const packedCount = items.filter(i => i.isPacked).length
const totalCount = items.length
const percentage = (packedCount / totalCount) * 100
```

---

## 3. Budget Tracking

### Features

- Add expense entries
- Categorize expenses
- Track planned vs. actual spending
- Calculate totals by category
- Multi-currency support
- Budget summary view

### Expense Categories

Common categories:
- Accommodation
- Transportation
- Food & Dining
- Activities & Tours
- Shopping
- Emergency Fund
- Miscellaneous

### Usage

**Add Budget Entry:**
1. Open trip details
2. Navigate to "Budget" tab
3. Click "Add Entry"
4. Fill in:
   - Category
   - Amount
   - Currency (default: USD)
   - Planned/Actual
5. Click "Save"

**View Budget Summary:**
- Total spent
- Total planned
- Breakdown by category
- Remaining budget

### Technical Details

**Database Table:** `budget_entries`

**Fields:**
- `id` (UUID) - Primary key
- `trip_id` (UUID) - Foreign key to trips
- `category` (text) - Expense category
- `amount` (numeric) - Amount
- `currency` (text) - Currency code (ISO 4217)
- `is_planned` (boolean) - Planned vs. actual
- `created_at` (timestamp) - Entry time

**Calculations:**
```typescript
// Total budget
const total = entries.reduce((sum, e) => sum + e.amount, 0)

// By category
const byCategory = entries.reduce((acc, e) => {
  acc[e.category] = (acc[e.category] || 0) + e.amount
  return acc
}, {})

// Planned vs. actual
const planned = entries.filter(e => e.isPlanned).reduce((sum, e) => sum + e.amount, 0)
const actual = entries.filter(e => !e.isPlanned).reduce((sum, e) => sum + e.amount, 0)
```

---

## 4. Document Storage

### Features

- Upload files (PDFs, images, etc.)
- Store in Supabase Storage
- Organize by trip
- Add title and description
- View/download documents
- Delete documents

### Supported File Types

- PDFs (bookings, tickets, insurance)
- Images (passport scans, maps)
- Word documents
- Excel spreadsheets

### Usage

**Upload Document:**
1. Open trip details
2. Navigate to "Documents" tab
3. Click "Upload"
4. Select file
5. Add:
   - Title
   - Description (optional)
6. Click "Upload"

**View Document:**
1. Click on document card
2. Opens in new tab

**Delete Document:**
1. Click "Delete" on document card
2. Confirm deletion
3. File removed from storage

### Technical Details

**Database Table:** `documents`

**Fields:**
- `id` (UUID) - Primary key
- `trip_id` (UUID) - Foreign key to trips
- `title` (text) - Document title
- `description` (text) - Optional description
- `file_url` (text) - URL to file in storage
- `created_at` (timestamp) - Upload time

**Storage Bucket:** `documents`

**Storage Path:**
```
{user_id}/{trip_id}/{file_name}
```

**Upload Process:**
```typescript
// 1. Upload to storage
const path = `${userId}/${tripId}/${fileName}`
const { data, error } = await supabase.storage
  .from('documents')
  .upload(path, file)

// 2. Get public URL
const url = supabase.storage.from('documents').getPublicUrl(path)

// 3. Save metadata to database
await documentRepository.create({
  tripId,
  title,
  description,
  fileUrl: url
})
```

---

## 5. Timeline / Itinerary

### Features

- Add timeline events
- Schedule with date and time
- Add notes for each event
- Sort by date/time
- Edit/delete events
- View chronological itinerary

### Event Types

- Flight departure/arrival
- Hotel check-in/check-out
- Restaurant reservations
- Activity bookings
- Transportation
- Meeting points

### Usage

**Add Timeline Event:**
1. Open trip details
2. Navigate to "Timeline" tab
3. Click "Add Event"
4. Fill in:
   - Event title
   - Date and time
   - Notes (optional)
5. Click "Save"

**View Timeline:**
- Events sorted chronologically
- Shows date, time, title
- Click to expand notes

### Technical Details

**Database Table:** `timeline_events`

**Fields:**
- `id` (UUID) - Primary key
- `trip_id` (UUID) - Foreign key to trips
- `title` (text) - Event name
- `date_time` (timestamp with time zone) - Scheduled time
- `notes` (text) - Additional details

**Sorting:**
```typescript
const sortedEvents = events.sort((a, b) => 
  new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
)
```

---

## 6. Trip Sharing

### Features

- Invite members by email
- Role-based access control
- Owner, editor, viewer roles
- Manage memberships
- Secure user lookup

### Roles

**Owner:**
- Full control over trip
- Can delete trip
- Can manage members
- Automatically assigned to creator

**Editor:**
- Can modify trip data
- Can add/edit packing items, budget, documents, timeline
- Cannot delete trip
- Cannot manage members

**Viewer:**
- Read-only access
- Can view all trip data
- Cannot modify anything

### Usage

**Invite Member:**
1. Open trip details
2. Navigate to "Members" tab
3. Click "Invite"
4. Enter:
   - Email address
   - Role (editor or viewer)
5. Click "Send Invite"

**Remove Member:**
1. Find member in list
2. Click "Remove"
3. Confirm removal

### Technical Details

**Database Table:** `trip_members`

**Fields:**
- `id` (UUID) - Primary key
- `trip_id` (UUID) - Foreign key to trips
- `user_id` (UUID) - Foreign key to auth.users
- `role` (enum) - owner, editor, viewer
- `created_at` (timestamp) - Invitation time
- **Constraint:** `unique (trip_id, user_id)` - No duplicates

**User Lookup Function:**
```sql
CREATE FUNCTION get_user_id_by_email(lookup_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT id FROM auth.users WHERE email = lookup_email);
END;
$$;
```

**Access Control:**
- Enforced via Row Level Security (RLS)
- Helper functions: `user_has_trip_access()`, `user_can_edit_trip()`
- Policies check ownership and membership

---

## 7. Packing Templates

### Features

- Create reusable packing lists
- Categorize templates
- Add template items
- Apply template to trip
- Edit/delete templates

### Usage

**Create Template:**
1. Navigate to "Templates" page
2. Click "New Template"
3. Enter:
   - Template name (e.g., "Summer Beach Trip")
   - Category
4. Add items to template
5. Click "Save"

**Apply Template to Trip:**
1. Open trip packing list
2. Click "Apply Template"
3. Select template
4. Items copied to trip

### Technical Details

**Database Tables:**
- `packing_templates` - Template metadata
- `packing_template_items` - Items in template

**Template Application:**
```typescript
async function applyTemplate(tripId: string, templateId: string) {
  // 1. Get template items
  const items = await templateItemRepository.findByTemplateId(templateId)
  
  // 2. Copy to trip packing list
  for (const item of items) {
    await packingItemRepository.create({
      tripId,
      title: item.title,
      category: item.category,
      isPacked: false
    })
  }
}
```

---

## Feature Roadmap

### Completed ✅
- ✅ Trip CRUD operations
- ✅ Packing lists with categories
- ✅ Budget tracking
- ✅ Document upload
- ✅ Timeline/itinerary
- ✅ Trip sharing with roles
- ✅ Packing templates

### In Progress 🚧
- 🚧 Multi-language support
- 🚧 Dark mode
- 🚧 Mobile responsive design

### Planned 📋
- 📋 Google Calendar sync
- 📋 Offline mode (PWA)
- 📋 Expense charts and analytics
- 📋 Smart packing templates with AI
- 📋 Export to PDF
- 📋 Multi-currency conversion
- 📋 Weather integration
- 📋 Flight tracking

---

## Integration Examples

### Trip Duplication

```typescript
// Duplicates trip with ALL related data
async function duplicateTrip(tripId: string) {
  const trip = await tripRepository.findById(tripId)
  
  // 1. Duplicate trip
  const newTrip = await tripRepository.duplicate(trip)
  
  // 2. Copy packing items
  const packingItems = await packingItemRepository.findByTripId(tripId)
  for (const item of packingItems) {
    await packingItemRepository.create({
      tripId: newTrip.id,
      title: item.title,
      category: item.category,
      isPacked: false
    })
  }
  
  // 3. Copy budget entries
  const budgetEntries = await budgetRepository.findByTripId(tripId)
  for (const entry of budgetEntries) {
    await budgetRepository.create({
      tripId: newTrip.id,
      category: entry.category,
      amount: entry.amount,
      currency: entry.currency,
      isPlanned: entry.isPlanned
    })
  }
  
  // 4. Copy timeline events
  const events = await timelineRepository.findByTripId(tripId)
  for (const event of events) {
    await timelineRepository.create({
      tripId: newTrip.id,
      title: event.title,
      dateTime: event.dateTime,
      notes: event.notes
    })
  }
  
  return newTrip
}
```

---

## Additional Resources

- [Database Schema](Database-Schema.md) - Table structures
- [Architecture](Architecture.md) - Code organization
- [Testing](Testing.md) - Feature testing

---

**Last Updated:** February 2026
