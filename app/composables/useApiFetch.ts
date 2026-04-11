// app/composables/useApiFetch.ts
export const useApiFetch = () => {
  const { token } = useAuth();

  const apiFetch = async (url: string, options: any = {}) => {
    const headers = {
      ...options.headers,
      Authorization: token.value ? `Bearer ${token.value}` : "",
    };

    return $fetch(url, {
      ...options,
      headers,
    });
  };

  return { apiFetch };
};
