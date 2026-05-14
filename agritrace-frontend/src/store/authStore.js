import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { authService } from "../services/authService";
import { clearAuthStorage } from "../services/apiClient";

function normalizeRole(role) {
  if (!role) {
    return "";
  }
  return String(role).toUpperCase().replace(/^ROLE_/, "");
}

function parseJwtPayload(token) {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) {
      return null;
    }
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      user: null,

      async login({ email, password }) {
        const authPayload = await authService.login({
          username: email,
          password,
        });

        const accessToken = authPayload?.accessToken;
        if (!accessToken) {
          throw new Error("Login response does not contain access token.");
        }

        const claims = parseJwtPayload(accessToken);
        const derivedRole = normalizeRole(
          authPayload?.role ?? claims?.role ?? claims?.roles?.[0],
        );

        const nextUser = {
          id: claims?.userId ?? claims?.id ?? null,
          role: derivedRole,
          username: authPayload?.username ?? claims?.sub ?? email,
        };

        set({ accessToken, user: nextUser });
        return nextUser;
      },

      setUser(user) {
        set({ user });
      },

      logout() {
        clearAuthStorage();
        set({ accessToken: null, user: null });
      },
    }),
    {
      name: "agritrace-auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
    },
  ),
);
