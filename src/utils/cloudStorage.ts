import { supabase } from '../lib/supabase';
import type { HivePlan } from '../types';

interface PlanRow {
  data: HivePlan;
}

export async function listPlans(): Promise<HivePlan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('data')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[cloud] listPlans failed:', error);
    return [];
  }

  return ((data ?? []) as PlanRow[]).map((row) => row.data);
}

export async function getPlanById(planId: string): Promise<HivePlan | null> {
  const { data, error } = await supabase
    .from('plans')
    .select('data')
    .eq('id', planId)
    .maybeSingle();

  if (error) {
    console.error('[cloud] getPlanById failed:', error);
    return null;
  }

  return data ? (data as PlanRow).data : null;
}

export async function upsertPlan(plan: HivePlan, userId: string): Promise<void> {
  // owner_user_id is required for INSERT but the enforce_plans_owner trigger
  // overrides it on UPDATE so collaborators can safely upsert plans they
  // don't own.
  const { error } = await supabase
    .from('plans')
    .upsert(
      {
        id: plan.id,
        owner_user_id: userId,
        name: plan.name,
        data: plan,
      },
      { onConflict: 'id' }
    );

  if (error) {
    console.error('[cloud] upsertPlan failed:', error);
    throw error;
  }
}

export async function deletePlanRow(planId: string): Promise<void> {
  const { error } = await supabase.from('plans').delete().eq('id', planId);

  if (error) {
    console.error('[cloud] deletePlanRow failed:', error);
    throw error;
  }
}

export interface ShareTokens {
  share_token: string;
  view_token: string;
}

export async function getOrCreateShareTokens(planId: string): Promise<ShareTokens> {
  const { data, error } = await supabase.rpc('get_or_create_share_tokens', {
    plan_id_input: planId,
  });

  if (error) {
    console.error('[cloud] getOrCreateShareTokens failed:', error);
    throw error;
  }

  return data as ShareTokens;
}

export interface JoinResult {
  plan_id: string;
  role: 'viewer' | 'editor';
}

export async function joinPlanByToken(token: string): Promise<JoinResult> {
  const { data, error } = await supabase.rpc('join_plan_by_token', { token });

  if (error) {
    console.error('[cloud] joinPlanByToken failed:', error);
    throw error;
  }

  return data as JoinResult;
}
