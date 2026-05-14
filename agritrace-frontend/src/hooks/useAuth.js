import { useAuthStore } from "../store/authStore";

export function useAuth() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const setUser = useAuthStore((state) => state.setUser);

  return {
    isAuthenticated: Boolean(accessToken),
    accessToken,
    user,
    login,
    logout,
    setUser,
  };
}
