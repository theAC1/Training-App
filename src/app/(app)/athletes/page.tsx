'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  Plus,
  Users,
  Copy,
  UserPlus,
  X,
  Loader2,
  Link as LinkIcon,
  Check,
  Trash2,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface Athlete {
  id: string
  name: string
  email: string | null
  notes: string | null
  user_id: string | null
  invite_code: string | null
  invite_expires_at: string | null
  created_at: string
}

export default function AthletesPage() {
  const { toast } = useToast()
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [generatingInvite, setGeneratingInvite] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Form state
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newNotes, setNewNotes] = useState('')

  // Fetch athletes
  const fetchAthletes = async () => {
    try {
      const res = await fetch('/api/athletes')
      if (res.ok) {
        const data = await res.json()
        setAthletes(data)
      }
    } catch (error) {
      console.error('Error fetching athletes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAthletes()
  }, [])

  // Create athlete
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    setIsCreating(true)
    try {
      const res = await fetch('/api/athletes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          email: newEmail || null,
          notes: newNotes || null,
        }),
      })

      if (res.ok) {
        const athlete = await res.json()
        setAthletes((prev) => [...prev, athlete].sort((a, b) => a.name.localeCompare(b.name)))
        setShowCreateForm(false)
        setNewName('')
        setNewEmail('')
        setNewNotes('')
        toast({
          title: 'Athlet erstellt',
          description: `${athlete.name} wurde erfolgreich angelegt.`,
        })
      } else {
        const error = await res.json()
        toast({
          variant: 'destructive',
          title: 'Fehler',
          description: error.error || 'Konnte Athlet nicht erstellen',
        })
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Ein Fehler ist aufgetreten',
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Generate invite
  const handleGenerateInvite = async (athleteId: string) => {
    setGeneratingInvite(athleteId)
    try {
      const res = await fetch(`/api/athletes/${athleteId}/invite`, {
        method: 'POST',
      })

      if (res.ok) {
        const data = await res.json()
        setAthletes((prev) =>
          prev.map((a) => (a.id === athleteId ? data.athlete : a))
        )
        toast({
          title: 'Einladungscode erstellt',
          description: `Code: ${data.invite_code}`,
        })
      } else {
        const error = await res.json()
        toast({
          variant: 'destructive',
          title: 'Fehler',
          description: error.error || 'Konnte Code nicht erstellen',
        })
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Ein Fehler ist aufgetreten',
      })
    } finally {
      setGeneratingInvite(null)
    }
  }

  // Copy invite code
  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
      toast({
        title: 'Kopiert!',
        description: 'Einladungscode wurde in die Zwischenablage kopiert.',
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Konnte nicht kopieren',
      })
    }
  }

  // Delete athlete
  const handleDelete = async (athleteId: string, athleteName: string) => {
    if (!confirm(`Möchtest du "${athleteName}" wirklich löschen?`)) return

    try {
      const res = await fetch(`/api/athletes/${athleteId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setAthletes((prev) => prev.filter((a) => a.id !== athleteId))
        toast({
          title: 'Gelöscht',
          description: `${athleteName} wurde entfernt.`,
        })
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Konnte nicht löschen',
      })
    }
  }

  // Get status badge
  const getStatusBadge = (athlete: Athlete) => {
    if (athlete.user_id) {
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
          <Check className="mr-1 h-3 w-3" />
          Registriert
        </span>
      )
    }
    if (athlete.invite_code && athlete.invite_expires_at) {
      const isExpired = new Date(athlete.invite_expires_at) < new Date()
      if (isExpired) {
        return (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
            Code abgelaufen
          </span>
        )
      }
      return (
        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
          <LinkIcon className="mr-1 h-3 w-3" />
          Einladung offen
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
        Kein Zugang
      </span>
    )
  }

  if (isLoading) {
    return (
      <>
        <Header title="Athleten" />
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  return (
    <>
      <Header
        title="Athleten"
        rightAction={
          <Button size="sm" onClick={() => setShowCreateForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Neu
          </Button>
        }
      />
      <div className="space-y-6 p-4">
        {/* Create Form */}
        {showCreateForm && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Neuer Athlet</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCreateForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Max Mustermann"
                    required
                    minLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="max@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notizen (optional)</Label>
                  <Input
                    id="notes"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="z.B. Trainingsziel, Einschränkungen..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isCreating}>
                    {isCreating && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <UserPlus className="mr-2 h-4 w-4" />
                    Erstellen
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Abbrechen
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {athletes.length === 0 && !showCreateForm && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 text-center text-muted-foreground">
                Noch keine Athleten. Erstelle deinen ersten Athleten!
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Athlet erstellen
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Athletes List */}
        {athletes.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">
              Deine Athleten ({athletes.length})
            </h2>
            {athletes.map((athlete) => (
              <Card key={athlete.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{athlete.name}</h3>
                        {getStatusBadge(athlete)}
                      </div>
                      {athlete.email && (
                        <p className="text-sm text-muted-foreground">
                          {athlete.email}
                        </p>
                      )}
                      {athlete.notes && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {athlete.notes}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        Erstellt am {formatDate(athlete.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Show invite code if exists */}
                      {athlete.invite_code && !athlete.user_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyCode(athlete.invite_code!)}
                        >
                          {copiedCode === athlete.invite_code ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          <span className="ml-1 font-mono text-xs">
                            {athlete.invite_code}
                          </span>
                        </Button>
                      )}
                      {/* Generate invite button */}
                      {!athlete.user_id && !athlete.invite_code && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateInvite(athlete.id)}
                          disabled={generatingInvite === athlete.id}
                        >
                          {generatingInvite === athlete.id ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <LinkIcon className="mr-1 h-4 w-4" />
                          )}
                          Einladen
                        </Button>
                      )}
                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(athlete.id, athlete.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
