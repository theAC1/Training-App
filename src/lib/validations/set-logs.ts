import { z } from 'zod'

// Set Log Create Schema
export const setLogCreateSchema = z.object({
  planned_exercise_id: z.string().uuid('Ungültige Übungs-ID'),
  set_number: z.number().int().min(1, 'Set-Nummer muss mindestens 1 sein').max(50),
  reps_completed: z.number().int().min(0, 'Wiederholungen können nicht negativ sein').max(999),
  weight_used: z.number().min(0).max(9999).nullable().optional(),
  pain_flag: z.boolean().default(false),
  notes: z.string().max(500).nullable().optional(),
  client_uuid: z.string().uuid('Ungültige Client-UUID'),
  logged_at: z.string().datetime().optional(),
})

// Set Log Batch Create Schema (for syncing multiple logs)
export const setLogBatchCreateSchema = z.object({
  logs: z.array(setLogCreateSchema).min(1).max(100),
})

// Set Log Query Schema
export const setLogQuerySchema = z.object({
  planned_exercise_id: z.string().uuid().optional(),
  athlete_id: z.string().uuid().optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
})

export type SetLogCreateInput = z.infer<typeof setLogCreateSchema>
export type SetLogBatchCreateInput = z.infer<typeof setLogBatchCreateSchema>
export type SetLogQueryInput = z.infer<typeof setLogQuerySchema>
