import { useEffect } from "react";
import { useToast } from "../../hooks/useToast";

export function ApiEventBridge() {
  const { error, security } = useToast();

  useEffect(() => {
    const onForbidden = () => {
      security("You do not have permission to perform this action.", "Permission denied");
    };

    const onServerError = () => {
      error("Server error. Please try again.", "Server error");
    };

    window.addEventListener("api:forbidden", onForbidden);
    window.addEventListener("api:server-error", onServerError);

    return () => {
      window.removeEventListener("api:forbidden", onForbidden);
      window.removeEventListener("api:server-error", onServerError);
    };
  }, [error, security]);

  return null;
}
