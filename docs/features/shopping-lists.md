# 🛒 Shopping Lists

Feature documentation for shared shopping lists.

**Last Updated**: March 2026

---

## What Is a Shopping List?

A **shopping list** is a shared list of items that household members collaboratively manage. Multiple shopping lists can exist per household (e.g., "Weekly Groceries", "Hardware Store", "Party Supplies").

Shopping lists belong to the **household**, not an individual — any eligible member can add items, mark purchases, or archive the list.

---

## Feature Overview

| Sub-Feature | Description | Who Can Use |
| ----------- | ----------- | ----------- |
| View lists | See all household shopping lists | All members |
| Create list | Create a new shopping list | Owner, Admin, Member |
| Edit list | Update title or description | Owner, Admin, Member |
| Archive list | Mark list as completed/archived | Owner, Admin, Member |
| Delete list | Permanently delete a list | Owner, Admin (any); Member (own) |
| Add item | Add an item to a list | Owner, Admin, Member, Child |
| Edit item | Update item details | Owner, Admin, Member (any); Child (own) |
| Mark purchased | Toggle item as bought | Owner, Admin, Member, Child |
| Delete item | Remove an item | Owner, Admin (any); Member, Child (own) |

---

## Shopping Lists

### Creating a List

1. Navigate to **Shopping Lists**.
2. Click **New List**.
3. Enter:
   - **Title** (required, 1–200 characters)
   - **Description** (optional)
4. Click **Create**.

The list is created with status `active` and is immediately visible to all household members.

### List Statuses

| Status | Description |
| ------ | ----------- |
| `active` | Currently in use; shown in main list view |
| `archived` | Completed; hidden from main view; accessible via "Archived" filter |

### Archiving vs Deleting

- **Archive**: Non-destructive. List and items are preserved. Use after completing a shopping trip.
- **Delete**: Permanent. All items are removed. Cannot be undone.

---

## Shopping Items

### Adding Items

Any eligible member (including Child) can add items:

1. Open a shopping list.
2. Click **Add Item** or use the quick-add input.
3. Enter:

| Field | Description | Required |
| ----- | ----------- | -------- |
| Name | Item name | ✅ |
| Quantity | Amount to buy (e.g., "2", "1 kg") | No |
| Category | Grouping (e.g., "Produce", "Dairy") | No |
| Notes | Extra details | No |

### Marking as Purchased

Click the checkbox next to an item to toggle its purchased state.

When marked purchased:
- Item is visually crossed out
- The purchasing member's name is recorded
- A `purchased_at` timestamp is set

When unmarked:
- `purchased_by` and `purchased_at` are cleared

### Item State Diagram

```
[Added] ──checkbox──► [Purchased (by member X)]
                            │
                     checkbox again
                            │
                            ▼
                       [Unpurchased]
```

---

## Purchase Tracking

Each item records who bought it:

```typescript
interface ShoppingItem {
  id: string;
  list_id: string;
  title: string;
  quantity: string | null;
  category: string | null;
  is_purchased: boolean;
  added_by: string;       // member who added the item
  purchased_by: string | null;  // member who marked it bought
  purchased_at: string | null;
  created_at: string;
}
```

This allows the household to see:
- Who still needs to buy what
- Who completed each purchase
- Shopping contribution stats on the Dashboard

---

## Multi-Member Collaboration

Shopping lists are designed for concurrent use:

- Any member can add items while others are shopping
- Purchased items are visible to all in real time (with Supabase backend)
- No locking — items cannot be "reserved" for exclusive purchase

---

## Edge Cases

| Scenario | Behaviour |
| -------- | --------- |
| Two members mark same item purchased simultaneously | Last write wins; no conflict detection |
| Member removed from household | Their items remain on the list; `added_by` still references them |
| List deleted with purchased items | All items are permanently deleted (no confirmation prompt for items) |
| Viewer marks item purchased | Denied — Viewer role cannot modify items |
| Child creates a list | Denied — Child role cannot create lists (only add items) |

---

## Data Model

```typescript
interface ShoppingList {
  id: string;
  household_id: string;
  title: string;
  description: string | null;
  status: 'active' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ShoppingItem {
  id: string;
  list_id: string;
  title: string;
  quantity: string | null;
  category: string | null;
  notes: string | null;
  is_purchased: boolean;
  added_by: string;
  purchased_by: string | null;
  purchased_at: string | null;
  created_at: string;
  updated_at: string;
}
```

---

## See Also

- [RBAC Permissions](../architecture/rbac-permissions.md) — Full permission matrix for shopping
- [Household Management](household-management.md) — Household and member management
- [User Guide — Shopping Lists](../user-guide.md#6-shopping-lists) — End-user guide
