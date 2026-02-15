# Scalability & Performance Considerations

## 1. Overview

This document outlines scalability, performance, and operational considerations for the multi-tenant SaaS family planning platform.

---

## 2. Database Scalability

### 2.1 Multi-Tenancy Isolation

**Strategy: Row-Level Security (RLS)**

Every query is automatically filtered by `household_id`, ensuring complete tenant isolation:

```sql
-- All queries automatically filtered
SELECT * FROM shopping_lists
WHERE household_id = 'current-household-id'  -- Enforced by RLS
```

**Benefits:**

- ✅ Simple application code (no manual filtering)
- ✅ Zero risk of cross-tenant data leakage
- ✅ Consistent security model
- ✅ Works with ORMs and query builders

**Performance Considerations:**

- All RLS policies use indexed columns (`household_id`, `user_id`)
- Supabase/PostgreSQL query planner optimizes RLS filters
- Connection pooling prevents per-request connection overhead

### 2.2 Indexing Strategy

**Critical Indexes:**

```sql
-- Tenant isolation (most important)
create index idx_shopping_lists_household_id on shopping_lists(household_id);
create index idx_members_household_id on members(household_id);
create index idx_wishlists_household_id on wishlists(household_id);
create index idx_activity_logs_household_id on activity_logs(household_id);

-- User lookups (authentication)
create index idx_members_user_id on members(user_id) where user_id is not null;

-- Common queries
create index idx_shopping_items_list_id on shopping_items(list_id);
create index idx_wishlist_items_wishlist_id on wishlist_items(wishlist_id);
create index idx_shopping_items_is_purchased on shopping_items(is_purchased);

-- Activity feed (time-series)
create index idx_activity_logs_created_at on activity_logs(created_at desc);

-- Public wishlists (no auth required)
create index idx_wishlists_share_slug on wishlists(share_slug);
```

**Index Maintenance:**

- Monitor slow queries with `pg_stat_statements`
- Add composite indexes for common multi-column queries
- Remove unused indexes to reduce write overhead

### 2.3 Connection Pooling

**Supabase Built-in Pooling:**

- Supavisor connection pooler (PgBouncer)
- Default pool size: 15-20 connections
- Transaction mode for optimal performance
- Automatic scaling based on load

**Application-Side Pooling:**

```typescript
// supabase.client.ts
const supabase = createClient(url, key, {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      // Add request tracing headers
    },
  },
});
```

### 2.4 Query Optimization

**N+1 Query Prevention:**

```typescript
// ❌ Bad: N+1 queries
const lists = await supabase.from('shopping_lists').select('*');
for (const list of lists.data) {
  const items = await supabase.from('shopping_items').select('*').eq('list_id', list.id);
}

// ✅ Good: Single query with join
const lists = await supabase.from('shopping_lists').select(`
    *,
    shopping_items(*)
  `);
```

**Pagination:**

```typescript
// Always paginate large result sets
const { data, count } = await supabase
  .from('activity_logs')
  .select('*', { count: 'exact' })
  .eq('household_id', householdId)
  .order('created_at', { ascending: false })
  .range(0, 49) // First 50 results
  .limit(50);
```

---

## 3. Public Wishlist Performance

### 3.1 High Read Volume Challenge

Public wishlists receive traffic from unauthenticated users (grandparents, friends):

- No rate limiting by user
- Potential viral sharing
- Cache-friendly content

### 3.2 Caching Strategy

**CDN Caching (Recommended):**

```typescript
// Add cache headers for public wishlists
export async function GET_PublicWishlist(shareSlug: string) {
  const { data } = await supabase
    .from('wishlists')
    .select('*, wishlist_items(*)')
    .eq('share_slug', shareSlug)
    .eq('visibility', 'public')
    .single();

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300, s-maxage=600', // 5min client, 10min CDN
      Vary: 'Accept-Encoding',
    },
  });
}
```

**Stale-While-Revalidate:**

```
Cache-Control: public, max-age=60, stale-while-revalidate=300
```

- Serve cached version immediately
- Fetch fresh data in background
- Update cache for next request

**Edge Caching (Vercel/Cloudflare):**

- Deploy static assets to CDN
- Cache API responses at edge
- Automatic geographic distribution

### 3.3 Read Replicas (Future)

For extreme scale:

- Supabase supports read replicas
- Route public wishlist reads to replica
- Keep writes on primary
- Eventual consistency acceptable for public views

---

## 4. Activity Logs Scalability

### 4.1 High Write Volume

Activity logs grow continuously:

- Every shopping list action logged
- Every member change logged
- Every wishlist update logged

**Projected Growth:**

- 100 households × 20 actions/day = 2,000 rows/day
- 1,000 households × 20 actions/day = 20,000 rows/day
- 10,000 households × 20 actions/day = 200,000 rows/day

### 4.2 Table Partitioning

**Monthly Partitions (Recommended):**

```sql
-- Create partitioned table
create table activity_logs (
  id               uuid default uuid_generate_v4(),
  household_id     uuid not null,
  member_id        uuid,
  action           text not null,
  entity_type      text not null,
  entity_id        uuid,
  metadata         jsonb default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  primary key (id, created_at)  -- Include partition key
) partition by range (created_at);

-- Create monthly partitions
create table activity_logs_2024_01 partition of activity_logs
  for values from ('2024-01-01') to ('2024-02-01');

create table activity_logs_2024_02 partition of activity_logs
  for values from ('2024-02-01') to ('2024-03-01');

-- Indexes on each partition
create index on activity_logs_2024_01 (household_id);
create index on activity_logs_2024_01 (created_at desc);
```

**Benefits:**

- Faster queries (only scan relevant partition)
- Easier archival (drop old partitions)
- Better vacuum performance
- Index size stays manageable

**Automated Partition Management:**

```sql
-- Function to create next month's partition
create or replace function create_next_activity_partition()
returns void
language plpgsql
as $$
declare
  next_month date := date_trunc('month', now()) + interval '1 month';
  following_month date := next_month + interval '1 month';
  partition_name text := 'activity_logs_' || to_char(next_month, 'YYYY_MM');
begin
  execute format(
    'create table if not exists %I partition of activity_logs for values from (%L) to (%L)',
    partition_name,
    next_month,
    following_month
  );

  execute format('create index on %I (household_id)', partition_name);
  execute format('create index on %I (created_at desc)', partition_name);
end;
$$;

-- Schedule via cron (pg_cron extension)
select cron.schedule('create-activity-partition', '0 0 25 * *', 'select create_next_activity_partition()');
```

### 4.3 Archival Strategy

**Archive Old Data:**

```sql
-- After 12 months, archive to cold storage
-- Option 1: Export to S3/GCS
copy (
  select * from activity_logs
  where created_at < now() - interval '12 months'
) to program 'aws s3 cp - s3://backups/activity_logs_archive.csv'
with (format csv, header);

-- Option 2: Move to archive table (cheaper storage tier)
create table activity_logs_archive (like activity_logs);
insert into activity_logs_archive
  select * from activity_logs
  where created_at < now() - interval '12 months';

-- Drop old partitions
drop table activity_logs_2023_01;
```

---

## 5. RLS Performance

### 5.1 RLS Policy Optimization

**Use Indexes in Policies:**

```sql
-- ✅ Good: Uses indexed column
create policy "shopping_lists_select"
  on shopping_lists for select
  using (
    household_id in (
      select household_id from members
      where user_id = auth.uid()
        and is_active = true
    )
  );

-- ❌ Slower: Function call overhead
create policy "shopping_lists_select"
  on shopping_lists for select
  using (user_is_household_member(household_id, auth.uid()));
```

**Prefer Subqueries Over Functions:**

- Subqueries can be optimized by query planner
- Functions are black boxes (unless marked STABLE/IMMUTABLE)
- Supabase caches function results per transaction

### 5.2 RLS Policy Bypass for Analytics

**Service Role Key (Backend Only):**

For admin dashboards or batch operations:

```typescript
// Use service role key (bypasses RLS)
const supabaseAdmin = createClient(url, serviceRoleKey);

// Run analytics across all households
const stats = await supabaseAdmin
  .from('households')
  .select('id, name, created_at')
  .gte('created_at', '2024-01-01');
```

**Security:**

- ⚠️ Service role key NEVER sent to client
- Only used in server-side code
- Environment variable protection
- Audit all service role queries

---

## 6. Soft Delete vs Hard Delete

### 6.1 Strategy: Soft Delete with Hard Delete Option

**Soft Delete (Default):**

```sql
-- Add is_active flag to tables
alter table households add column is_active boolean default true;
alter table members add column is_active boolean default true;

-- Filter inactive records in RLS policies
create policy "members_select"
  on members for select
  using (
    household_id in (
      select household_id from members
      where user_id = auth.uid()
        and is_active = true  -- Only active members
    )
  );
```

**Benefits:**

- Easy recovery from accidental deletions
- Maintain referential integrity
- Historical data preservation
- Audit trail intact

**Drawbacks:**

- Disk space grows indefinitely
- Need cleanup strategy
- Indexes include inactive records

**Hard Delete (Periodic Cleanup):**

```sql
-- After 90 days, hard delete inactive records
delete from members
where is_active = false
  and updated_at < now() - interval '90 days';
```

### 6.2 GDPR/Right to be Forgotten

**Immediate Hard Delete:**

```typescript
// User requests account deletion
async function deleteUserAccount(userId: string) {
  // 1. Remove from all households (cascades to shopping items, etc.)
  await supabase.from('members').delete().eq('user_id', userId);

  // 2. Anonymize activity logs
  await supabase
    .from('activity_logs')
    .update({
      member_id: null,
      metadata: jsonb_set(metadata, '{anonymized}', 'true'),
    })
    .eq('member_id', userId);

  // 3. Delete user profile
  await supabase.from('user_profiles').delete().eq('id', userId);

  // 4. Delete auth account
  await supabaseAdmin.auth.admin.deleteUser(userId);
}
```

---

## 7. Billing Integration

### 7.1 Subscription Model

**Household-Based Billing:**

```sql
-- Add billing columns to households
alter table households add column subscription_plan text default 'free';
alter table households add column subscription_status text default 'active';
alter table households add column stripe_customer_id text;
alter table households add column stripe_subscription_id text;
alter table households add column subscription_expires_at timestamptz;

-- Plan limits
create table plan_limits (
  plan text primary key,
  max_members integer,
  max_shopping_lists integer,
  max_wishlists_per_member integer,
  max_storage_mb integer,
  features jsonb default '{}'::jsonb
);

insert into plan_limits values
  ('free', 5, 10, 3, 100, '{"public_wishlists": true}'),
  ('premium', 15, 50, 10, 1000, '{"public_wishlists": true, "activity_logs": true, "priority_support": true}'),
  ('family', 30, 100, 20, 5000, '{"public_wishlists": true, "activity_logs": true, "priority_support": true, "custom_branding": true}');
```

**Enforce Limits:**

```sql
-- Prevent exceeding member limit
create or replace function check_member_limit()
returns trigger
language plpgsql
as $$
declare
  current_count integer;
  max_allowed integer;
begin
  select count(*) into current_count
  from members
  where household_id = new.household_id
    and is_active = true;

  select max_members into max_allowed
  from plan_limits pl
  join households h on h.subscription_plan = pl.plan
  where h.id = new.household_id;

  if current_count >= max_allowed then
    raise exception 'Member limit reached for your plan';
  end if;

  return new;
end;
$$;

create trigger enforce_member_limit
  before insert on members
  for each row
  execute function check_member_limit();
```

### 7.2 Usage Tracking

**Track Usage for Billing:**

```sql
create table usage_metrics (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households,
  metric_type text not null,
  metric_value integer not null,
  period_start date not null,
  period_end date not null,
  created_at timestamptz default now(),
  unique (household_id, metric_type, period_start)
);

-- Aggregate daily usage
insert into usage_metrics (household_id, metric_type, metric_value, period_start, period_end)
select
  household_id,
  'shopping_items_created',
  count(*),
  current_date,
  current_date + interval '1 day'
from shopping_items
where created_at >= current_date
  and created_at < current_date + interval '1 day'
group by household_id;
```

---

## 8. Monitoring & Observability

### 8.1 Database Metrics

**Key Metrics to Monitor:**

- Query performance (`pg_stat_statements`)
- Index usage (`pg_stat_user_indexes`)
- Table bloat (`pg_stat_user_tables`)
- Connection count (`pg_stat_activity`)
- Cache hit ratio
- Replication lag (if using replicas)

**Supabase Dashboard:**

- Built-in query performance monitoring
- Slow query alerts
- Connection pool usage
- Database size trends

### 8.2 Application Metrics

**Track in Application:**

```typescript
// Performance monitoring
const startTime = performance.now();
const result = await supabase.from('shopping_lists').select('*');
const duration = performance.now() - startTime;

// Log to monitoring service
logger.info('database_query', {
  table: 'shopping_lists',
  duration_ms: duration,
  row_count: result.data?.length,
  household_id: currentHousehold.id,
});
```

**Key Application Metrics:**

- Request latency (p50, p95, p99)
- Error rate by endpoint
- User session duration
- Feature adoption (wishlists created, items added)
- Public wishlist views

### 8.3 Alerting

**Set Up Alerts:**

- High database CPU (> 80%)
- Slow queries (> 1 second)
- High error rate (> 1%)
- Connection pool exhaustion
- Disk space low (< 20%)

---

## 9. Horizontal Scaling Path

### 9.1 Current Architecture (Single Database)

```
┌──────────┐       ┌──────────────┐
│  Client  │──────▶│   Supabase   │
│ (Vue App)│       │  PostgreSQL  │
└──────────┘       └──────────────┘
```

**Suitable for:**

- 1-10,000 households
- 10,000-100,000 users
- Millions of items/wishlists

### 9.2 Read Replicas (10K+ Households)

```
┌──────────┐       ┌──────────────┐
│  Client  │──────▶│   Primary    │
│          │       │  PostgreSQL  │
└──────────┘       └──────┬───────┘
                          │
                   ┌──────┴───────┐
                   │              │
              ┌────▼────┐   ┌─────▼────┐
              │ Replica │   │ Replica  │
              │  (Read) │   │  (Read)  │
              └─────────┘   └──────────┘
```

**Routing Strategy:**

- Writes → Primary
- Shopping list reads → Replicas
- Public wishlist reads → Replicas (with caching)
- Member management → Primary

### 9.3 Database Sharding (100K+ Households)

**Shard by Household:**

```
┌──────────┐       ┌──────────────┐
│  Client  │──────▶│   Router     │
└──────────┘       └──────┬───────┘
                          │
                   ┌──────┴────────────┐
                   │                   │
              ┌────▼────┐        ┌─────▼────┐
              │ Shard 1 │        │ Shard 2  │
              │ 0-50K   │        │ 50-100K  │
              └─────────┘        └──────────┘
```

**Sharding Key:** `household_id`

- Consistent hashing for even distribution
- Cross-shard queries avoided (household isolation)
- Tenant co-location (all household data on same shard)

**Challenges:**

- Global queries (admin dashboards)
- User with multiple households
- Invitation across shards

---

## 10. Cost Optimization

### 10.1 Database Storage

**Compress Old Data:**

```sql
-- Use TOAST compression for JSONB columns
alter table households alter column settings set storage extended;
alter table activity_logs alter column metadata set storage extended;

-- Vacuum to reclaim space
vacuum full activity_logs;
```

**Archive Cold Data:**

- Move old activity logs to S3 (10% of database cost)
- Keep recent 12 months in hot storage
- On-demand restore for older data

### 10.2 Supabase Pricing Tiers

| Tier       | Database Size | Bandwidth    | Suitable For                |
| ---------- | ------------- | ------------ | --------------------------- |
| Free       | 500 MB        | 5 GB/month   | Development, hobby projects |
| Pro        | 8 GB          | 250 GB/month | 1-1,000 households          |
| Team       | 100 GB        | 500 GB/month | 1,000-10,000 households     |
| Enterprise | Custom        | Custom       | 10,000+ households          |

**Optimization Tips:**

- Enable connection pooling (included)
- Use CDN for static assets
- Compress images before upload
- Clean up old file uploads

---

## 11. Security at Scale

### 11.1 Rate Limiting

**API Rate Limits:**

```typescript
// Supabase Edge Functions or API Gateway
const rateLimiter = new RateLimiter({
  points: 100, // 100 requests
  duration: 60, // per 60 seconds
});

await rateLimiter.consume(userId);
```

**Per-Household Limits:**

- 1000 shopping items per household
- 100 wishlists per member
- 50 members per household (free tier)

### 11.2 DDoS Protection

**Cloudflare/Vercel Protection:**

- Automatic DDoS mitigation
- Bot detection
- Geographic filtering
- Rate limiting by IP

**Database Protection:**

- Connection limits enforced
- Query timeout (30 seconds)
- Statement timeout (10 seconds)
- Lock timeout (2 seconds)

---

## 12. Disaster Recovery

### 12.1 Backup Strategy

**Supabase Automated Backups:**

- Daily full backups (retained 7 days on Pro)
- Point-in-time recovery (PITR) available
- Cross-region replication (Enterprise)

**Manual Backup:**

```bash
# Export entire database
pg_dump -h db.supabase.co -U postgres -d postgres > backup.sql

# Export specific household (for support)
pg_dump -h db.supabase.co -U postgres -d postgres \
  --table=households \
  --table=members \
  --where="household_id = 'household-uuid'" \
  > household_backup.sql
```

### 12.2 Recovery Time Objective (RTO)

**Target RTO:** < 1 hour for critical incidents

**Recovery Procedures:**

1. Restore from automated backup (15 minutes)
2. Verify data integrity (15 minutes)
3. Update DNS/application config (5 minutes)
4. Monitor for issues (25 minutes)

---

## 13. Future Scalability Roadmap

### Phase 1: Current (0-1K households)

- ✅ Single PostgreSQL database
- ✅ Supabase Pro tier
- ✅ Row Level Security
- ✅ Basic indexing

### Phase 2: Growth (1K-10K households)

- 🔄 Add read replicas
- 🔄 Implement CDN caching
- 🔄 Partition activity logs
- 🔄 Advanced monitoring

### Phase 3: Scale (10K-100K households)

- ⏳ Database sharding
- ⏳ Microservices architecture
- ⏳ Dedicated search (Elasticsearch)
- ⏳ Message queue (for async operations)

### Phase 4: Enterprise (100K+ households)

- ⏳ Multi-region deployment
- ⏳ Active-active replication
- ⏳ Custom infrastructure
- ⏳ Dedicated account management

---

## 14. Performance Testing

### 14.1 Load Testing

**Tools:**

- k6 for API load testing
- Artillery for stress testing
- pgbench for database benchmarking

**Test Scenarios:**

```javascript
// k6 load test
import http from 'k6/http';

export default function () {
  // Simulate 100 concurrent users
  http.get('https://api.example.com/shopping-lists');
  http.post('https://api.example.com/shopping-items', {
    title: 'Milk',
    quantity: 1,
  });
}
```

### 14.2 Performance Targets

| Metric               | Target      | Measurement |
| -------------------- | ----------- | ----------- |
| Page Load Time       | < 2 seconds | p95         |
| API Response Time    | < 200ms     | p95         |
| Database Query       | < 100ms     | p95         |
| Public Wishlist Load | < 1 second  | p95         |

---

## Summary

This scalability design ensures the platform can:

- ✅ Handle 10,000+ households on current architecture
- ✅ Scale to 100,000+ with read replicas
- ✅ Optimize costs through smart caching and archival
- ✅ Maintain security and compliance at scale
- ✅ Provide clear growth path to enterprise scale
