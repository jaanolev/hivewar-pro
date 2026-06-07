import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local'
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

// Pass --since=YYYY-MM-DD to override the cohort cutoff. Default tracks the
// most recent product change we want to read post-deploy results for.
const DEFAULT_SINCE = '2026-05-31T21:03:00.000Z'; // template-apply fix deploy
const argSince = process.argv.find((a) => a.startsWith('--since='))?.slice(8);
const SINCE = argSince ? new Date(argSince).toISOString() : DEFAULT_SINCE;

const BUCKETS = ['0 (empty)', '1-2', '3-9', '10-29', '30+'];

function pct(num, den) {
  if (!den) return '0.0%';
  return ((100 * num) / den).toFixed(1) + '%';
}

function bucketOf(n) {
  if (n === 0) return '0 (empty)';
  if (n <= 2) return '1-2';
  if (n <= 9) return '3-9';
  if (n <= 29) return '10-29';
  return '30+';
}

async function fetchAllUsers() {
  const all = [];
  let page = 1;
  // listUsers returns up to 1000/page; loop until short page.
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    all.push(...data.users);
    if (data.users.length < 1000) break;
    page++;
  }
  return all;
}

async function fetchAllPlans() {
  const { data, error } = await supabase
    .from('plans')
    .select('owner_user_id, data');
  if (error) throw error;
  return data ?? [];
}

function plansByBucket(plans) {
  const counts = Object.fromEntries(BUCKETS.map((b) => [b, 0]));
  for (const p of plans) {
    counts[bucketOf((p.data?.buildings ?? []).length)]++;
  }
  return counts;
}

function activatedUserIds(plans) {
  const set = new Set();
  for (const p of plans) {
    if ((p.data?.buildings ?? []).length > 0) set.add(p.owner_user_id);
  }
  return set;
}

const [users, plans] = await Promise.all([fetchAllUsers(), fetchAllPlans()]);

const total = users.length;
const registered = users.filter((u) => !u.is_anonymous).length;
const anonymous = total - registered;

const allActivated = activatedUserIds(plans);

const sinceDate = new Date(SINCE);
const cohort = users.filter((u) => new Date(u.created_at) >= sinceDate);
const cohortIds = new Set(cohort.map((u) => u.id));
const cohortPlans = plans.filter((p) => cohortIds.has(p.owner_user_id));
const cohortActivated = activatedUserIds(cohortPlans);

const distAll = plansByBucket(plans);
const distCohort = plansByBucket(cohortPlans);

const providers = {};
for (const u of users) {
  if (u.is_anonymous) continue;
  const provider =
    u.app_metadata?.provider || u.identities?.[0]?.provider || 'unknown';
  providers[provider] = (providers[provider] || 0) + 1;
}

const out = [];
out.push(`Supabase stats — cohort since ${SINCE}`);
out.push('='.repeat(56));
out.push('');
out.push('Users');
out.push('-----');
out.push(`  total:       ${total}`);
out.push(`  registered:  ${registered}  (${pct(registered, total)})`);
out.push(`  anonymous:   ${anonymous}`);
if (registered > 0) {
  out.push('  by provider:');
  for (const [p, n] of Object.entries(providers)) {
    out.push(`    ${p}: ${n}`);
  }
}
out.push('');
out.push('Activation (users who placed >=1 building)');
out.push('------------------------------------------');
out.push(
  `  all-time:    ${allActivated.size}/${total}  (${pct(allActivated.size, total)})`
);
out.push(
  `  cohort:      ${cohortActivated.size}/${cohort.length}  (${pct(cohortActivated.size, cohort.length)})`
);
out.push('');
out.push('Plan-size distribution');
out.push('----------------------');
out.push('  bucket         all-time   cohort');
for (const b of BUCKETS) {
  out.push(
    `  ${b.padEnd(13)}  ${String(distAll[b]).padStart(7)}   ${String(distCohort[b]).padStart(6)}`
  );
}

console.log(out.join('\n'));
