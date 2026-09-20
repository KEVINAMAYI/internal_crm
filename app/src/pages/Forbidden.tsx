import { ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function Forbidden() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <ShieldAlert className="size-10 text-muted-foreground" />
      <h1 className="text-lg font-semibold">You don't have access</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Your role doesn't have permission to view this page. If you think this is a mistake, reach
        out to an admin.
      </p>
      <Button asChild size="sm">
        <Link to="/merchants">Back to Merchants</Link>
      </Button>
    </div>
  )
}
