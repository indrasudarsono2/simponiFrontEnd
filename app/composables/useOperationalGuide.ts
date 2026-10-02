export type OperationalGuideCheck = "license" | "logbook" | "ielp" | "medex" | "competence" | "application" | "letter" | "checker" | "briefing";

export interface OperationalGuideData {
  event: { id: number; name: string | null; remark: string } | null;
  applicationDocId: number | null;
  checks: Record<OperationalGuideCheck, boolean>;
}

export const operationalGuideSteps: { key: OperationalGuideCheck | "examination"; label: string; description: string; to: string }[] = [
  { key: "license", label: "License", description: "Upload a current license and check its expiry date.", to: "/document/license" },
  { key: "logbook", label: "Logbook", description: "Upload your current personal logbook.", to: "/document/logbook" },
  { key: "ielp", label: "IELP", description: "A confirmed, approved IELP must be valid. Level 6 is lifetime; otherwise check its expiry.", to: "/document/ielpUser" },
  { key: "medex", label: "MEDEX", description: "A confirmed, approved MEDEX must be unexpired.", to: "/document/medexUser" },
  { key: "competence", label: "Competency", description: "Check competency data for the proposed rating. PENERBITAN also needs its file.", to: "/document/competenceUser" },
  { key: "application", label: "Application Document", description: "Create the application for your assigned event and select the required documents.", to: "/applicationDoc" },
  { key: "letter", label: "Proposal Letter", description: "Send each rating letter to the assigned Supervisor or OJTI and wait for validation.", to: "/applicationDoc" },
  { key: "checker", label: "Checker Verification", description: "Wait until the checker verifies your application and supporting files.", to: "/applicationDoc" },
  { key: "briefing", label: "Briefing Token", description: "On your Operational dashboard, enter the briefing token in the Application Doc card and press Send Token.", to: "/dashboard/dashboardOperational#briefing-token" },
  { key: "examination", label: "Examination", description: "After briefing verification, open the real Examination page and follow your event's mode.", to: "/examination/examination" },
];

export function useOperationalGuide() {
  const active = useState<boolean>("operational-guide-active", () => false);
  const data = useState<OperationalGuideData | null>("operational-guide-data", () => null);
  const loading = useState<boolean>("operational-guide-loading", () => false);
  const error = useState<string | null>("operational-guide-error", () => null);
  const { token } = useAuth();

  const nextStep = computed(() => operationalGuideSteps.find((step) =>
    step.key === "examination" || !data.value?.checks[step.key],
  ) || operationalGuideSteps[operationalGuideSteps.length - 1]!);

  async function refresh() {
    if (!import.meta.client || loading.value) return;
    loading.value = true;
    error.value = null;
    try {
      data.value = await $fetch<OperationalGuideData>(`${useApiBaseUrl()}/api/operationalGuide`, {
        credentials: "include",
        headers: { Authorization: token.value ? `Bearer ${token.value}` : "" },
      });
    } catch (cause: any) {
      error.value = cause?.data?.message || "Could not check your examination requirements.";
    } finally {
      loading.value = false;
    }
  }

  function stop() {
    active.value = false;
    data.value = null;
    error.value = null;
  }

  return { active, data, loading, error, nextStep, refresh, stop };
}
