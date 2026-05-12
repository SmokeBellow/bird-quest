import { supabase } from './supabase'
import type { ObservedBird, PlantObservation, FungusObservation } from '../types'

// ─── Bird observations ────────────────────────────────────────────────────────

export async function fetchBirdObservations(userId: string): Promise<ObservedBird[]> {
  const { data, error } = await supabase
    .from('bird_observations')
    .select('*')
    .eq('user_id', userId)
    .order('observed_at', { ascending: true })
  if (error || !data) return []
  return data.map((r) => ({
    id: r.id,
    bird: r.bird,
    observedAt: r.observed_at,
    location: r.location ?? undefined,
    method: r.method,
    imageUrl: r.image_url ?? undefined,
    confidence: r.confidence ?? undefined,
    notes: r.notes ?? undefined,
  }))
}

export async function upsertBirdObservation(userId: string, obs: ObservedBird) {
  await supabase.from('bird_observations').upsert({
    id: obs.id,
    user_id: userId,
    bird: obs.bird,
    observed_at: obs.observedAt,
    location: obs.location ?? null,
    method: obs.method,
    image_url: obs.imageUrl ?? null,
    confidence: obs.confidence ?? null,
    notes: obs.notes ?? null,
  }, { onConflict: 'id' })
}

export async function deleteBirdObservation(id: string) {
  await supabase.from('bird_observations').delete().eq('id', id)
}

// ─── Plant observations ───────────────────────────────────────────────────────

export async function fetchPlantObservations(userId: string): Promise<PlantObservation[]> {
  const { data, error } = await supabase
    .from('plant_observations')
    .select('*')
    .eq('user_id', userId)
    .order('observed_at', { ascending: true })
  if (error || !data) return []
  return data.map((r) => ({
    id: r.id,
    plant: r.plant,
    observedAt: r.observed_at,
    location: r.location ?? undefined,
    imageUrl: r.image_url ?? undefined,
    confidence: r.confidence ?? undefined,
  }))
}

export async function upsertPlantObservation(userId: string, obs: PlantObservation) {
  await supabase.from('plant_observations').upsert({
    id: obs.id,
    user_id: userId,
    plant: obs.plant,
    observed_at: obs.observedAt,
    location: obs.location ?? null,
    image_url: obs.imageUrl ?? null,
    confidence: obs.confidence ?? null,
  }, { onConflict: 'id' })
}

export async function deletePlantObservation(id: string) {
  await supabase.from('plant_observations').delete().eq('id', id)
}

// ─── Fungus observations ──────────────────────────────────────────────────────

export async function fetchFungusObservations(userId: string): Promise<FungusObservation[]> {
  const { data, error } = await supabase
    .from('fungus_observations')
    .select('*')
    .eq('user_id', userId)
    .order('observed_at', { ascending: true })
  if (error || !data) return []
  return data.map((r) => ({
    id: r.id,
    fungus: r.fungus,
    observedAt: r.observed_at,
    location: r.location ?? undefined,
    imageUrl: r.image_url ?? undefined,
    confidence: r.confidence ?? undefined,
  }))
}

export async function upsertFungusObservation(userId: string, obs: FungusObservation) {
  await supabase.from('fungus_observations').upsert({
    id: obs.id,
    user_id: userId,
    fungus: obs.fungus,
    observed_at: obs.observedAt,
    location: obs.location ?? null,
    image_url: obs.imageUrl ?? null,
    confidence: obs.confidence ?? null,
  }, { onConflict: 'id' })
}

export async function deleteFungusObservation(id: string) {
  await supabase.from('fungus_observations').delete().eq('id', id)
}

// ─── Bulk upload (migration) ──────────────────────────────────────────────────

export async function uploadAllLocalData(
  userId: string,
  birds: ObservedBird[],
  plants: PlantObservation[],
  fungi: FungusObservation[],
) {
  await Promise.all([
    birds.length > 0
      ? supabase.from('bird_observations').upsert(
          birds.map((obs) => ({
            id: obs.id, user_id: userId, bird: obs.bird,
            observed_at: obs.observedAt, location: obs.location ?? null,
            method: obs.method, image_url: obs.imageUrl ?? null,
            confidence: obs.confidence ?? null, notes: obs.notes ?? null,
          })), { onConflict: 'id' })
      : Promise.resolve(),
    plants.length > 0
      ? supabase.from('plant_observations').upsert(
          plants.map((obs) => ({
            id: obs.id, user_id: userId, plant: obs.plant,
            observed_at: obs.observedAt, location: obs.location ?? null,
            image_url: obs.imageUrl ?? null, confidence: obs.confidence ?? null,
          })), { onConflict: 'id' })
      : Promise.resolve(),
    fungi.length > 0
      ? supabase.from('fungus_observations').upsert(
          fungi.map((obs) => ({
            id: obs.id, user_id: userId, fungus: obs.fungus,
            observed_at: obs.observedAt, location: obs.location ?? null,
            image_url: obs.imageUrl ?? null, confidence: obs.confidence ?? null,
          })), { onConflict: 'id' })
      : Promise.resolve(),
  ])
}
