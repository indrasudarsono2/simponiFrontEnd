export default defineNuxtPlugin(() => {
  // Only run on client side
  if (import.meta.server) return;

  const { checkSessionExpiration, logout } = useAuth();
  const toast = useToast();
  const router = useRouter();

  // Check session expiration every minute
  const checkInterval = setInterval(() => {
    if (checkSessionExpiration()) {
      // Session expired
      logout();
      toast.add({
        title: "Session Expired",
        description: "Your session has expired (3 hours). Please login again.",
        color: "error",
        duration: 0, // Don't auto-dismiss
        close: true,
      });
      router.push("/login");
    }
  }, 60000); // Check every minute

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    clearInterval(checkInterval);
  });
});
