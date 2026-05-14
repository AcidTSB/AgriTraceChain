import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Page not found</h1>
        <p className="mt-3 text-slate-600">
          The page you are looking for does not exist or has moved.
        </p>
      </div>

      <Link to="/">
        <Button variant="secondary">Go to home</Button>
      </Link>
    </div>
  );
}
