// app/composables/useApiFetch.ts
export const useApiFetch = () => {
  const { token } = useAuth();
  const apiBaseUrl = useApiBaseUrl()

  const apiFetch = async (url: string, options: any = {}) => {
    const headers = {
      ...options.headers,
      Authorization: token.value ? `Bearer ${token.value}` : "",
    };

    const requestUrl = /^https?:\/\//i.test(url)
      ? url
      : `${apiBaseUrl}${url.startsWith("/") ? url : `/${url}`}`;

    return $fetch(requestUrl, {
      ...options,
      headers,
    });
  };

  return { apiFetch };
};
