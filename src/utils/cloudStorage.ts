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

export async function upsertPlan(plan: HivePlan, userId: string): Promise<void> {
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
