/**
 * Training is intentionally tab-local. Reloading or leaving training discards
 * its in-memory records; no practice state is persisted to the server.
 */
import { resetTrainingApi } from '~/utils/trainingApi'
import { useApplicationDocStore } from '~/stores/applicationDoc'

export function useTrainingMode() {
  const active = useState<boolean>('operational-training-active', () => false)

  function start() {
    if (!import.meta.client) return
    resetTrainingApi()
    active.value = true
    clearPracticeCaches()
  }

  function stop() {
    active.value = false
    if (import.meta.client) {
      resetTrainingApi()
      clearPracticeCaches()
    }
  }

  function clearPracticeCaches() {
    if (!import.meta.client) return
    try {
      useApplicationDocStore().clearCache()
    } catch {
      // Training must still start before Pinia has hydrated.
    }
    useState('examinationEssayResponse', () => null).value = null
    useState('examinationEssayMeta', () => null).value = null
    useState('examinationMultipleChoiceResponse', () => null).value = null
    useState('examinationMultipleChoiceMeta', () => null).value = null
    for (const key of ['examinationEssayMeta', 'examinationMultipleChoiceMeta', 'examinationSubmitResult']) {
      sessionStorage.removeItem(key)
    }
    clearNuxtData(key => key.includes('/api/examination') || key.includes('/api/applicationDocument') || key.includes('/__training_api__/'))
  }

  return { active, start, stop }
}
