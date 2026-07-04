<script setup lang="ts">
import ip from "../../utils/config.json";

const { token } = useAuth();
const toast = useToast();

interface EscalationActorUser {
  nik: string;
  name: string | null;
  licenseUserId: string | null;
}

interface EscalationActor {
  id: number;
  actor: string | null;
  remark: string | null;
  escalationActor: EscalationActorUser | null;
}

interface EscalationLevel {
  id: number;
  level: string;
  time: number | null;
  escalationActors: EscalationActor[];
}

const searchQuery = ref("");
const selectedEscalationLevel = ref<EscalationLevel | null>(null);

const { data, status, refresh } = await useFetch<EscalationLevel[]>(
  `http://${ip.ipBackEnd}/api/escalationActors`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const filteredEscalationLevels = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  const levels = data.value || [];

  if (!query) return levels;

  return levels.filter((level) => {
    const levelText = `level ${level.level}`.toLowerCase();
    const actorsText = level.escalationActors
      .map((item) =>
        [
          item.escalationActor?.name,
          item.actor,
          item.remark,
          item.escalationActor?.licenseUserId,
        ]
          .filter(Boolean)
          .join(" "),
      )
      .join(" ")
      .toLowerCase();

    return levelText.includes(query) || actorsText.includes(query);
  });
});

function getActorName(actor: EscalationActor) {
  return actor.escalationActor?.name || actor.actor || "-";
}

function getActorNik(actor: EscalationActor) {
  return actor.actor ? `NIK ${actor.actor}` : "";
}

function handleManageActors(escalationLevel: EscalationLevel) {
  selectedEscalationLevel.value = escalationLevel;
}

function handleActorsUpdated() {
  selectedEscalationLevel.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Escalation actor list has been refreshed",
    color: "success",
  });
}

function handleModalClose() {
  selectedEscalationLevel.value = null;
}
</script>

<template>
  <UDashboardPanel id="escalation-actor">
    <template #header>
      <UDashboardNavbar title="Escalation Actor">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5 mb-4">
        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Search levels or actors..."
        />

        <UButton
          label="Refresh"
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          @click="() => refresh()"
        />
      </div>

      <div class="overflow-x-auto rounded-lg border border-default">
        <table class="w-full table-fixed border-collapse">
          <thead class="bg-elevated/50">
            <tr>
              <th
                class="w-16 border border-default bg-elevated/50 p-3 text-left text-sm"
              >
                No
              </th>
              <th class="border border-default bg-elevated/50 p-3 text-left text-sm">
                Escalation Level
              </th>
              <th class="border border-default bg-elevated/50 p-3 text-left text-sm">
                Actor
              </th>
              <th class="border border-default bg-elevated/50 p-3 text-left text-sm">
                Remark
              </th>
              <th
                class="w-32 border border-default bg-elevated/50 p-3 text-left text-sm"
              >
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            <template
              v-for="(level, levelIndex) in filteredEscalationLevels"
              :key="level.id"
            >
              <template v-if="level.escalationActors.length > 0">
                <tr
                  v-for="(actor, actorIndex) in level.escalationActors"
                  :key="actor.id"
                >
                  <td
                    v-if="actorIndex === 0"
                    :rowspan="level.escalationActors.length"
                    class="align-top border border-default bg-elevated/20 p-3 text-sm text-muted"
                  >
                    {{ levelIndex + 1 }}
                  </td>
                  <td
                    v-if="actorIndex === 0"
                    :rowspan="level.escalationActors.length"
                    class="align-top border border-default bg-elevated/20 p-3"
                  >
                    <div class="font-medium text-highlighted">
                      Level {{ level.level }}
                    </div>
                    <div class="text-xs text-muted">
                      {{ level.time || "-" }} minutes
                    </div>
                  </td>
                  <td class="border border-default p-3">
                    <div class="font-medium text-highlighted">
                      {{ getActorName(actor) }}
                    </div>
                    <div class="text-xs text-muted">
                      {{ getActorNik(actor) }}
                    </div>
                  </td>
                  <td class="border border-default p-3 text-sm text-muted">
                    {{ actor.remark || "-" }}
                  </td>
                  <td
                    v-if="actorIndex === 0"
                    :rowspan="level.escalationActors.length"
                    class="align-top border border-default bg-elevated/20 p-3"
                  >
                    <UButton
                      label="Manage"
                      icon="i-lucide-users"
                      color="primary"
                      variant="soft"
                      size="sm"
                      @click="handleManageActors(level)"
                    />
                  </td>
                </tr>
              </template>

              <tr v-else>
                <td class="border border-default bg-elevated/20 p-3 text-sm text-muted">
                  {{ levelIndex + 1 }}
                </td>
                <td class="border border-default bg-elevated/20 p-3">
                  <div class="font-medium text-highlighted">
                    Level {{ level.level }}
                  </div>
                  <div class="text-xs text-muted">
                    {{ level.time || "-" }} minutes
                  </div>
                </td>
                <td class="border border-default p-3 text-sm text-muted">
                  -
                </td>
                <td class="border border-default p-3 text-sm text-muted">
                  -
                </td>
                <td class="border border-default bg-elevated/20 p-3">
                  <UButton
                    label="Manage"
                    icon="i-lucide-users"
                    color="primary"
                    variant="soft"
                    size="sm"
                    @click="handleManageActors(level)"
                  />
                </td>
              </tr>
            </template>

            <tr v-if="status !== 'pending' && filteredEscalationLevels.length === 0">
              <td colspan="5" class="p-6 text-center text-sm text-muted">
                No escalation actor data found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="status === 'pending'" class="p-6 text-center text-sm text-muted">
        Loading escalation actors...
      </div>

      <EscalationActorManageActorsModal
        :escalation-level="selectedEscalationLevel"
        @escalation-actors-updated="handleActorsUpdated"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
