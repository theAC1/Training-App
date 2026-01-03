import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface SetLogWithExercise {
  id: string
  reps_completed: number
  weight_used: number | null
  logged_at: string
  planned_exercises: {
    exercise_id: string
    exercises: {
      id: string
      name: string
    }
  }
}

interface SessionWithCompletion {
  completed_at: string | null
}

// GET /api/stats - Get athlete stats (PBs, streak, etc.)
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Get all set logs for the athlete
    const { data: setLogs, error: logsError } = await supabase
      .from('set_logs')
      .select(
        `
        id,
        reps_completed,
        weight_used,
        logged_at,
        planned_exercises (
          exercise_id,
          exercises (id, name)
        )
      `
      )
      .eq('athlete_id', user.id)
      .order('logged_at', { ascending: false })

    if (logsError) {
      return NextResponse.json({ error: logsError.message }, { status: 500 })
    }

    const typedSetLogs = setLogs as unknown as SetLogWithExercise[]

    // Calculate Personal Bests (max weight per exercise where weight was used)
    const pbsByExercise: Record<
      string,
      { exerciseName: string; weight: number; reps: number; date: string }
    > = {}

    for (const log of typedSetLogs || []) {
      if (!log.weight_used || !log.planned_exercises?.exercises) continue

      const exerciseId = log.planned_exercises.exercise_id
      const exerciseName = log.planned_exercises.exercises.name
      const currentPB = pbsByExercise[exerciseId]

      // Simple PB: highest weight regardless of reps
      if (!currentPB || log.weight_used > currentPB.weight) {
        pbsByExercise[exerciseId] = {
          exerciseName,
          weight: log.weight_used,
          reps: log.reps_completed,
          date: log.logged_at,
        }
      }
    }

    const personalBests = Object.entries(pbsByExercise).map(
      ([exerciseId, data]) => ({
        exerciseId,
        ...data,
      })
    )

    // Get completed sessions for streak calculation
    const { data: completedSessions, error: sessionsError } = await supabase
      .from('sessions')
      .select(
        `
        completed_at,
        mesocycles!inner (athlete_id)
      `
      )
      .eq('mesocycles.athlete_id', user.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 })
    }

    // Calculate streak (consecutive days with completed sessions)
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (completedSessions && completedSessions.length > 0) {
      const typedSessions = completedSessions as unknown as SessionWithCompletion[]
      const completionDates = typedSessions
        .filter((s) => s.completed_at)
        .map((s) => {
          const date = new Date(s.completed_at!)
          date.setHours(0, 0, 0, 0)
          return date.getTime()
        })
        .filter((date, index, self) => self.indexOf(date) === index) // unique dates
        .sort((a, b) => b - a) // newest first

      // Check if today or yesterday has a session
      const todayTime = today.getTime()
      const yesterdayTime = todayTime - 24 * 60 * 60 * 1000

      if (completionDates.includes(todayTime)) {
        streak = 1
        let checkDate = yesterdayTime

        for (const date of completionDates.slice(1)) {
          if (date === checkDate) {
            streak++
            checkDate -= 24 * 60 * 60 * 1000
          } else if (date < checkDate) {
            break
          }
        }
      } else if (completionDates.includes(yesterdayTime)) {
        streak = 1
        let checkDate = yesterdayTime - 24 * 60 * 60 * 1000

        for (const date of completionDates.slice(1)) {
          if (date === checkDate) {
            streak++
            checkDate -= 24 * 60 * 60 * 1000
          } else if (date < checkDate) {
            break
          }
        }
      }
    }

    // Count total workouts
    const totalWorkouts = completedSessions?.length || 0

    // Recent PBs (from last 7 days)
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const recentPBs = personalBests.filter(
      (pb) => new Date(pb.date) >= oneWeekAgo
    )

    return NextResponse.json({
      personalBests: personalBests.slice(0, 10), // Top 10 PBs
      recentPBs,
      streak,
      totalWorkouts,
      totalPBs: personalBests.length,
    })
  } catch {
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
