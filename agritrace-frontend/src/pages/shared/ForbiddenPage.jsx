import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";

export function ForbiddenPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-rose-600">403</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Permission denied</h1>
        <p className="mt-3 text-slate-600">
          Your account role does not have permission to access this resource.
        </p>
      </div>

      <Link to="/">
        <Button variant="secondary">Back to home</Button>
      </Link>
    </div>
  );
}
