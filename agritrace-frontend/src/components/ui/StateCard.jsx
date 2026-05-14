import { Link } from "react-router-dom";
import { Button } from "./Button";
import { Card } from "./Card";

const toneMap = {
  neutral: {
    title: "text-slate-900",
    message: "text-slate-600",
  },
  error: {
    title: "text-rose-700",
    message: "text-slate-600",
  },
  warning: {
    title: "text-amber-700",
    message: "text-slate-600",
  },
  success: {
    title: "text-emerald-800",
    message: "text-slate-600",
  },
};

export function StateCard({
  title,
  message,
  tone = "neutral",
  centered = false,
  action,
  className = "",
}) {
  const palette = toneMap[tone] ?? toneMap.neutral;

  return (
    <Card className={`${centered ? "text-center" : ""} ${className}`.trim()}>
      <h2 className={`text-lg font-semibold ${palette.title}`}>{title}</h2>
      {message ? <p className={`mt-2 text-sm ${palette.message}`}>{message}</p> : null}

      {action ? (
        <div className={`mt-4 ${centered ? "flex justify-center" : ""}`.trim()}>
          {action.to ? (
            <Link to={action.to}>
              <Button variant={action.variant || "secondary"}>{action.label}</Button>
            </Link>
          ) : (
            <Button variant={action.variant || "secondary"} onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      ) : null}
    </Card>
  );
}
