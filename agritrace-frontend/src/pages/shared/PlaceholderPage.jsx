import { Card } from "../../components/ui/Card";

export function PlaceholderPage({ title, description }) {
  return (
    <Card className="max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Phase 1 Placeholder</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
      <p className="mt-3 text-slate-600">{description}</p>
    </Card>
  );
}
