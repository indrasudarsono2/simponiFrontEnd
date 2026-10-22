import { csrfFetch } from "~/utils/csrfFetch";
type RoleMenu = {
  menu: {
    menu: string;
  };
};

type RoleData = {
  roles: {
    role: string;
    rolesMenu: RoleMenu[];
  };
};

export type AuthUser = {
  nik: string;
  name: string;
  email: string;
  authenticationType: "AIRNAV_SSO" | "LOCAL" | null;
  roles?: RoleData[];
  roleNames?: string[];
  menuNames?: string[];
  roleModules?: Record<string, string[]>;
};

export type LoginSuccessResponse = {
  success: boolean;
  message: string;
  csrfToken: string;
  user: AuthUser;
};

export type UseAuthReturn = {
  token: ReturnType<typeof useCookie<string | null>>;
  authUser: ReturnType<typeof useState<AuthUser | null>>;
  isAuthenticated: Ref<boolean>;
  setAuthFromResponse: (payload: LoginSuccessResponse) => void;
  loginWithApi: (
    nik: string,
    password: string,
  ) => Promise<LoginSuccessResponse>;
  logout: () => Promise<void>;
  getRoleNames: () => string[];
  getRoleModules: (roleName: string) => string[];
  getAllModules: () => string[];
  checkSessionExpiration: () => boolean;
};

export const useAuth = (): UseAuthReturn => {
  const config = useRuntimeConfig();
  const apiBaseUrl = String(config.public.apiBaseUrl).replace(/\/+$/, "");
  const secureCookies = import.meta.env.PROD;

  const isSameOriginPath = apiBaseUrl.startsWith("/");
  if (import.meta.env.PROD && !isSameOriginPath && !apiBaseUrl.startsWith("https://")) {
    throw new Error("NUXT_PUBLIC_API_BASE_URL must be same-origin or use HTTPS in production");
  }

  // Token cookie - expires in 3 hours
  const token = useCookie<string | null>("auth_token", {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies,
    default: () => null,
    maxAge: 60 * 60 * 3, // 3 hours
  });

  // User data cookie - expires in 3 hours
  const userCookie = useCookie<AuthUser | null>("auth_user", {
    sameSite: "lax",
    secure: secureCookies,
    default: () => null,
    maxAge: 60 * 60 * 3, // 3 hours
  });

  // Store login timestamp for expiration check
  const loginTimestamp = useCookie<number | null>("auth_timestamp", {
    sameSite: "lax",
    secure: secureCookies,
    default: () => null,
    maxAge: 60 * 60 * 3, // 3 hours
  });

  // State for reactive updates within the app
  const authUser = useState<AuthUser | null>(
    "auth-user",
    () => userCookie.value,
  );
  if (import.meta.client && authUser.value && !authUser.value.roleModules) {
    try {
      const storedRoleModules = sessionStorage.getItem("performa_role_modules");
      if (storedRoleModules) {
        authUser.value = { ...authUser.value, roleModules: JSON.parse(storedRoleModules) };
      }
    } catch {
      sessionStorage.removeItem("performa_role_modules");
    }
  }
  // Sync cookie changes to state
  watch(
    () => userCookie.value,
    (newValue) => {
      if (!newValue) {
        authUser.value = null;
        return;
      }
      let roleModules = authUser.value?.roleModules;
      if (import.meta.client && !roleModules) {
        try {
          const storedRoleModules = sessionStorage.getItem("performa_role_modules");
          roleModules = storedRoleModules ? JSON.parse(storedRoleModules) : undefined;
        } catch {
          sessionStorage.removeItem("performa_role_modules");
        }
      }
      authUser.value = roleModules ? { ...newValue, roleModules } : newValue;
    },
    { immediate: true },
  );

  const isAuthenticated = computed(() => Boolean(authUser.value));

  const setAuthFromResponse = (payload: LoginSuccessResponse) => {
    const csrfToken = useCookie<string | null>("csrf_token", {
      sameSite: "lax",
      secure: secureCookies,
      maxAge: 60 * 60 * 3,
    });
    csrfToken.value = payload.csrfToken;
    const roleNames = payload.user.roles?.map((item) => item.roles.role).filter(Boolean)
      || payload.user.roleNames
      || [];
    const roleModules = payload.user.roles
      ? Object.fromEntries(payload.user.roles.map((item) => [
          item.roles.role,
          [...new Set(item.roles.rolesMenu.map((roleMenu) => roleMenu.menu.menu).filter(Boolean))],
        ]))
      : payload.user.roleModules || {};
    const menuNames = [...new Set(Object.values(roleModules).flat())];
    // Persist only the compact authorization projection. The backend reloads
    // authoritative roles and menus from the database for every API request.
    const compactUser: AuthUser = {
      nik: payload.user.nik,
      name: payload.user.name,
      email: payload.user.email,
      authenticationType: payload.user.authenticationType,
      roleNames,
      menuNames,
    };
    userCookie.value = compactUser;
    authUser.value = { ...compactUser, roleModules };
    if (import.meta.client) {
      sessionStorage.setItem("performa_role_modules", JSON.stringify(roleModules));
    }
    loginTimestamp.value = Date.now();
  };

  const loginWithApi = async (nik: string, password: string) => {
    const response = await csrfFetch<LoginSuccessResponse>(
      `${apiBaseUrl}/api/auth/login`,
      {
        method: "POST",
        credentials: "include",
        body: {
          nik,
          password,
        },
      },
    );

    if (!response?.success || !response?.user) {
      throw new Error(response?.message || "Login gagal");
    }

    setAuthFromResponse(response);
    return response;
  };

  const logout = async () => {
    const csrfToken = useCookie<string | null>("csrf_token");
    const selectedRole = useState<string>("selectedRole", () => "");

    await csrfFetch(`${apiBaseUrl}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: csrfToken.value
        ? { "X-CSRF-Token": csrfToken.value }
        : undefined,
    }).catch(() => {});

    userCookie.value = null;
    csrfToken.value = null;
    authUser.value = null;
    loginTimestamp.value = null;
    selectedRole.value = "";
    if (import.meta.client) sessionStorage.removeItem("performa_role_modules");
  };

  // Check if session has expired (3 hours = 10800000 ms)
  const checkSessionExpiration = () => {
    if (!loginTimestamp.value || !authUser.value) return false;

    const threeHours = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
    const elapsed = Date.now() - loginTimestamp.value;

    return elapsed >= threeHours;
  };

  // Helper to get role names from authUser
  const getRoleNames = () => {
    return authUser.value?.roleNames
      || authUser.value?.roles?.map((r) => r.roles.role)
      || [];
  };

  // Helper to get modules for a specific role
  const getRoleModules = (roleName: string) => {
    if (authUser.value?.roleModules) {
      return authUser.value.roleModules[roleName] || [];
    }
    const roleData = authUser.value?.roles?.find(
      (r) => r.roles.role === roleName,
    );
    return (
      roleData?.roles.rolesMenu?.map((rm) => rm.menu.menu.toLowerCase()) || []
    );
  };

  // Helper to get all unique modules across all roles
  const getAllModules = () => {
    const modules = new Set<string>();
    if (authUser.value?.menuNames) {
      authUser.value.menuNames.forEach((module) => modules.add(module.toLowerCase()));
      return Array.from(modules);
    }
    if (authUser.value?.roleModules) {
      Object.values(authUser.value.roleModules).forEach((roleModules) => {
        roleModules.forEach((module) => modules.add(module.toLowerCase()));
      });
      return Array.from(modules);
    }
    authUser.value?.roles?.forEach((role) => {
      role.roles.rolesMenu?.forEach((rm) => {
        modules.add(rm.menu.menu.toLowerCase());
      });
    });
    return Array.from(modules);
  };

  return {
    token,
    authUser,
    isAuthenticated,
    setAuthFromResponse,
    loginWithApi,
    logout,
    getRoleNames,
    getRoleModules,
    getAllModules,
    checkSessionExpiration,
  };
};
