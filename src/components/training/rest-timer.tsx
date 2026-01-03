'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Play, Pause, X, RotateCcw } from 'lucide-react'

interface RestTimerProps {
  duration: number
  onComplete: () => void
  onSkip: () => void
}

export function RestTimer({ duration, onComplete, onSkip }: RestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const [isRunning, setIsRunning] = useState(true)

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      onComplete()
      // Vibrate if supported
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200])
      }
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, timeLeft, onComplete])

  const toggleTimer = () => {
    setIsRunning((prev) => !prev)
  }

  const resetTimer = () => {
    setTimeLeft(duration)
    setIsRunning(true)
  }

  const addTime = (seconds: number) => {
    setTimeLeft((prev) => Math.max(0, prev + seconds))
  }

  const progress = ((duration - timeLeft) / duration) * 100

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Pause</span>
          <Button size="icon" variant="ghost" onClick={onSkip}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Timer Display */}
        <div className="text-center mb-4">
          <div className="text-5xl font-mono font-bold text-primary">
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
          <div
            className="h-full bg-primary transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" onClick={() => addTime(-15)}>
            -15s
          </Button>
          <Button size="icon" onClick={toggleTimer}>
            {isRunning ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>
          <Button size="icon" variant="outline" onClick={resetTimer}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => addTime(15)}>
            +15s
          </Button>
        </div>

        {/* Quick time adjustments */}
        <div className="flex justify-center gap-2 mt-3">
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={() => setTimeLeft(60)}
          >
            1:00
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={() => setTimeLeft(90)}
          >
            1:30
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={() => setTimeLeft(120)}
          >
            2:00
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={() => setTimeLeft(180)}
          >
            3:00
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
