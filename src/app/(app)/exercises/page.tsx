'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  Plus,
  Dumbbell,
  Loader2,
  Upload,
  ChevronRight,
  X,
  FileText,
} from 'lucide-react'
import Link from 'next/link'

interface Exercise {
  id: string
  name: string
  grundform: string | null
  image_url: string | null
  muscle_groups: string[]
}

interface Grundform {
  name: string
  count: number
}

export default function ExercisesPage() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [exercises, setExercises] = useState<Exercise[]>([])
  const [grundformen, setGrundformen] = useState<Grundform[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('alle')
  const [selectedGrundform, setSelectedGrundform] = useState<string | null>(null)
  const [isTrainer, setIsTrainer] = useState(false)

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false)
  const [csvData, setCsvData] = useState<string>('')
  const [isImporting, setIsImporting] = useState(false)

  const loadExercises = useCallback(async (grundform?: string) => {
    try {
      let url = '/api/exercises'
      if (grundform) {
        url += `?grundform=${encodeURIComponent(grundform)}`
      }
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setExercises(data)
      }
    } catch {
      console.error('Fehler beim Laden der Übungen')
    }
  }, [])

  const loadGrundformen = useCallback(async () => {
    try {
      const res = await fetch('/api/exercises/grundformen')
      if (res.ok) {
        const data = await res.json()
        setGrundformen(data)
      }
    } catch {
      console.error('Fehler beim Laden der Grundformen')
    }
  }, [])

  const checkRole = useCallback(async () => {
    try {
      const res = await fetch('/api/athletes')
      // If athletes API works without error, user is trainer
      setIsTrainer(res.ok)
    } catch {
      setIsTrainer(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      await Promise.all([loadExercises(), loadGrundformen(), checkRole()])
      setIsLoading(false)
    }
    init()
  }, [loadExercises, loadGrundformen, checkRole])

  const handleGrundformClick = async (name: string) => {
    setSelectedGrundform(name)
    await loadExercises(name)
  }

  const handleBackToGrundformen = async () => {
    setSelectedGrundform(null)
    await loadExercises()
  }

  const parseCSV = (csv: string): Array<Record<string, string>> => {
    const lines = csv.trim().split('\n')
    if (lines.length < 2) return []

    const headers = lines[0].split(';').map((h) => h.trim().toLowerCase())
    const data: Array<Record<string, string>> = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';')
      const row: Record<string, string> = {}
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim() || ''
      })
      data.push(row)
    }

    return data
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvData(text)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!csvData.trim()) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Bitte CSV-Daten eingeben oder Datei hochladen',
      })
      return
    }

    setIsImporting(true)
    try {
      const parsed = parseCSV(csvData)
      if (parsed.length === 0) {
        throw new Error('Keine gültigen Daten gefunden')
      }

      // Map CSV fields to API fields
      const exercises = parsed.map((row) => ({
        name: row.name || row.übung || row.exercise || '',
        grundform: row.grundform || row.base_form || '',
        image_url: row.image_url || row.bild || '',
        video_url: row.video_url || row.video || '',
        categories: row.categories || row.kategorien || '',
        muscle_groups: row.muscle_groups || row.muskelgruppen || row.muskeln || '',
        equipment: row.equipment || row.geräte || row.ausrüstung || '',
        description: row.description || row.beschreibung || '',
      }))

      const res = await fetch('/api/exercises/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercises }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Import fehlgeschlagen')
      }

      toast({
        title: 'Erfolg',
        description: result.message,
      })

      setShowImportModal(false)
      setCsvData('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Reload data
      await Promise.all([loadExercises(), loadGrundformen()])
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Import fehlgeschlagen',
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
      })
    } finally {
      setIsImporting(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <Header title="Übungen" />
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  return (
    <>
      <Header
        title="Übungen"
        rightAction={
          isTrainer && (
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowImportModal(true)}
              >
                <Upload className="h-5 w-5" />
                <span className="sr-only">Import</span>
              </Button>
              <Button asChild size="icon" variant="ghost">
                <Link href="/exercises/new">
                  <Plus className="h-5 w-5" />
                  <span className="sr-only">Neue Übung</span>
                </Link>
              </Button>
            </div>
          )
        }
      />

      <div className="p-4 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="alle" className="flex-1">
              Alle
            </TabsTrigger>
            <TabsTrigger value="grundformen" className="flex-1">
              Nach Grundformen
            </TabsTrigger>
          </TabsList>

          {/* Alle Übungen */}
          <TabsContent value="alle" className="mt-4">
            {exercises.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Dumbbell className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-center text-muted-foreground">
                    {isTrainer
                      ? 'Noch keine Übungen vorhanden.'
                      : 'Noch keine Übungen verfügbar.'}
                  </p>
                  {isTrainer && (
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" onClick={() => setShowImportModal(true)}>
                        <Upload className="mr-2 h-4 w-4" />
                        CSV Import
                      </Button>
                      <Button asChild>
                        <Link href="/exercises/new">
                          <Plus className="mr-2 h-4 w-4" />
                          Neue Übung
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {exercises.map((exercise) => (
                  <Link key={exercise.id} href={`/exercises/${exercise.id}`}>
                    <Card className="transition-colors hover:bg-accent">
                      <CardContent className="flex items-center gap-4 p-3">
                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                          {exercise.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={exercise.image_url}
                              alt={exercise.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Dumbbell className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <h3 className="font-medium">{exercise.name}</h3>
                          <p className="truncate text-sm text-muted-foreground">
                            {exercise.grundform || 'Keine Grundform'}
                            {exercise.muscle_groups?.length > 0 &&
                              ` • ${exercise.muscle_groups.join(', ')}`}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Nach Grundformen */}
          <TabsContent value="grundformen" className="mt-4">
            {selectedGrundform ? (
              // Show exercises for selected grundform
              <div className="space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToGrundformen}
                  className="mb-2"
                >
                  ← Zurück zu Grundformen
                </Button>
                <h2 className="text-lg font-semibold">{selectedGrundform}</h2>
                <div className="space-y-2">
                  {exercises.map((exercise) => (
                    <Link key={exercise.id} href={`/exercises/${exercise.id}`}>
                      <Card className="transition-colors hover:bg-accent">
                        <CardContent className="flex items-center gap-4 p-3">
                          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                            {exercise.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={exercise.image_url}
                                alt={exercise.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Dumbbell className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium">{exercise.name}</h3>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              // Show list of grundformen
              <div className="space-y-2">
                {grundformen.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      Keine Grundformen vorhanden
                    </CardContent>
                  </Card>
                ) : (
                  grundformen.map((gf) => (
                    <Card
                      key={gf.name}
                      className="cursor-pointer transition-colors hover:bg-accent"
                      onClick={() => handleGrundformClick(gf.name)}
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <h3 className="font-medium">{gf.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {gf.count} {gf.count === 1 ? 'Übung' : 'Übungen'}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">CSV Import</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowImportModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border-2 border-dashed p-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="flex flex-col items-center cursor-pointer"
                  >
                    <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      CSV-Datei auswählen
                    </span>
                  </label>
                </div>

                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">CSV-Format (Semikolon-getrennt):</p>
                  <code className="block bg-muted p-2 rounded text-xs overflow-x-auto">
                    name;grundform;muscle_groups;equipment;description
                  </code>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    CSV-Daten (oder direkt einfügen):
                  </label>
                  <textarea
                    className="w-full h-32 p-2 text-sm border rounded-lg font-mono"
                    placeholder="name;grundform;muscle_groups;equipment;description&#10;Back Squat;Squat;Quadrizeps, Gluteus;Langhantel;Grundübung für Beine"
                    value={csvData}
                    onChange={(e) => setCsvData(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowImportModal(false)
                      setCsvData('')
                    }}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleImport}
                    disabled={isImporting || !csvData.trim()}
                  >
                    {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Importieren
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
