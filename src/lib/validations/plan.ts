import { z } from 'zod'

// Mesocycle Schemas
export const mesocycleCreateSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(100, 'Name zu lang'),
  athlete_id: z.string().uuid('Ungültige Athleten-ID'),
  duration_weeks: z.number().int().min(1).max(52).default(4),
  phase: z.string().max(50).nullable().optional(),
  start_date: z.string().nullable().optional(),
  status: z.enum(['draft', 'active', 'completed']).default('draft'),
})

export const mesocycleUpdateSchema = mesocycleCreateSchema.partial().extend({
  id: z.string().uuid(),
})

export type MesocycleCreateInput = z.infer<typeof mesocycleCreateSchema>
export type MesocycleUpdateInput = z.infer<typeof mesocycleUpdateSchema>

// Session Schemas
export const sessionCreateSchema = z.object({
  mesocycle_id: z.string().uuid('Ungültige Mesozyklus-ID'),
  week_number: z.number().int().min(1).max(52),
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  name: z.string().max(100).nullable().optional(),
  order_index: z.number().int().min(0),
  notes: z.string().max(1000).nullable().optional(),
})

export const sessionUpdateSchema = sessionCreateSchema.partial().extend({
  id: z.string().uuid(),
})

export type SessionCreateInput = z.infer<typeof sessionCreateSchema>
export type SessionUpdateInput = z.infer<typeof sessionUpdateSchema>

// Session Block Schemas
export const blockCreateSchema = z.object({
  session_id: z.string().uuid('Ungültige Session-ID'),
  block_type: z.enum(['single', 'superset', 'cluster']),
  order_index: z.number().int().min(0),
  rest_between_rounds: z.number().int().min(0).max(600).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})

export const blockUpdateSchema = blockCreateSchema.partial().extend({
  id: z.string().uuid(),
})

export type BlockCreateInput = z.infer<typeof blockCreateSchema>
export type BlockUpdateInput = z.infer<typeof blockUpdateSchema>

// Planned Exercise Schemas
export const plannedExerciseCreateSchema = z.object({
  block_id: z.string().uuid('Ungültige Block-ID'),
  exercise_id: z.string().uuid('Ungültige Übungs-ID'),
  order_in_block: z.number().int().min(0),
  sets_target: z.number().int().min(1).max(20),
  reps_target: z.string().min(1, 'Wiederholungen erforderlich').max(20),
  weight_prescribed: z.number().min(0).max(1000).nullable().optional(),
  rir: z.number().int().min(0).max(10).nullable().optional(),
  rest_time_default: z.number().int().min(0).max(600).default(120),
  notes: z.string().max(500).nullable().optional(),
  // Cluster-specific fields
  cluster_reps: z.number().int().min(1).max(10).nullable().optional(),
  cluster_count: z.number().int().min(1).max(10).nullable().optional(),
  intra_cluster_rest: z.number().int().min(0).max(120).nullable().optional(),
})

export const plannedExerciseUpdateSchema = plannedExerciseCreateSchema
  .partial()
  .extend({
    id: z.string().uuid(),
  })

export type PlannedExerciseCreateInput = z.infer<
  typeof plannedExerciseCreateSchema
>
export type PlannedExerciseUpdateInput = z.infer<
  typeof plannedExerciseUpdateSchema
>

// Helper for day of week labels (German)
export const dayOfWeekLabels: Record<number, string> = {
  0: 'Sonntag',
  1: 'Montag',
  2: 'Dienstag',
  3: 'Mittwoch',
  4: 'Donnerstag',
  5: 'Freitag',
  6: 'Samstag',
}

// Block type labels (German)
export const blockTypeLabels: Record<string, string> = {
  single: 'Einzelübung',
  superset: 'Supersatz',
  cluster: 'Cluster-Satz',
}

// Status labels (German)
export const statusLabels: Record<string, string> = {
  draft: 'Entwurf',
  active: 'Aktiv',
  completed: 'Abgeschlossen',
}
