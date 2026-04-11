import ip from "../utils/config.json";

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
  roles: RoleData[];
};

export type LoginSuccessResponse = {
  success: boolean;
  message: string;
  token: string;
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
  logout: () => void;
  getRoleNames: () => string[];
  getRoleModules: (roleName: string) => string[];
  getAllModules: () => string[];
  checkSessionExpiration: () => boolean;
};

export const useAuth = (): UseAuthReturn => {
  // Token cookie - expires in 3 hours
  const token = useCookie<string | null>("auth_token", {
    sameSite: "lax",
    secure: false,
    default: () => null,
    maxAge: 60 * 60 * 3, // 3 hours
  });

  // User data cookie - expires in 3 hours
  const userCookie = useCookie<AuthUser | null>("auth_user", {
    sameSite: "lax",
    secure: false,
    default: () => null,
    maxAge: 60 * 60 * 3, // 3 hours
  });

  // Store login timestamp for expiration check
  const loginTimestamp = useCookie<number | null>("auth_timestamp", {
    sameSite: "lax",
    secure: false,
    default: () => null,
    maxAge: 60 * 60 * 3, // 3 hours
  });

  // State for reactive updates within the app
  const authUser = useState<AuthUser | null>(
    "auth-user",
    () => userCookie.value,
  );
  // Sync cookie changes to state
  watch(
    () => userCookie.value,
    (newValue) => {
      authUser.value = newValue;
    },
    { immediate: true },
  );

  const isAuthenticated = computed(() => Boolean(token.value));

  const setAuthFromResponse = (payload: LoginSuccessResponse) => {
    token.value = payload.token;
    userCookie.value = payload.user;
    authUser.value = payload.user;
    loginTimestamp.value = Date.now();
  };

  const loginWithApi = async (nik: string, password: string) => {
    const response = await $fetch<LoginSuccessResponse>(
      `http://${ip.ipBackEnd}/api/auth/login`,
      {
        method: "POST",
        body: {
          nik,
          password,
        },
      },
    );

    if (!response?.success || !response?.token) {
      throw new Error(response?.message || "Login gagal");
    }

    setAuthFromResponse(response);
    return response;
  };

  const logout = () => {
    token.value = null;
    userCookie.value = null;
    authUser.value = null;
    loginTimestamp.value = null;
  };

  // Check if session has expired (3 hours = 10800000 ms)
  const checkSessionExpiration = () => {
    if (!loginTimestamp.value || !token.value) return false;

    const threeHours = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
    const elapsed = Date.now() - loginTimestamp.value;

    return elapsed >= threeHours;
  };

  // Helper to get role names from authUser
  const getRoleNames = () => {
    return authUser.value?.roles?.map((r) => r.roles.role) || [];
  };

  // Helper to get modules for a specific role
  const getRoleModules = (roleName: string) => {
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
