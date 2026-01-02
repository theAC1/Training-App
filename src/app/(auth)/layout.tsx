export const dynamic = 'force-dynamic'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Training App</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Krafttraining für Leichtathletik
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
