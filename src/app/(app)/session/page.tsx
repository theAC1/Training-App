import { redirect } from 'next/navigation'

// This page redirects to dashboard - sessions are accessed via /session/[id]
export default function SessionPage() {
  redirect('/dashboard')
}
