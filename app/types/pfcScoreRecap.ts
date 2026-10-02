export interface BranchOption {
  id: number
  branch?: string | null
}

export interface ScoreRecapRow {
  id: number
  appRatingId?: number | null
  hasEvidence?: boolean
  scoreDate: string
  branch?: BranchOption | null
  user?: { nik?: string | null, name?: string | null } | null
  event?: {
    event?: string | null
    theoryMode?: string | null
    difficulty?: string | null
    startDate?: string | null
    finishDate?: string | null
    passingGrade?: number | null
  } | null
  applicationDocument?: string | null
  relatedDocuments?: RelatedDocuments | null
  remarkDoc?: string | null
  rating?: string | null
  multipleChoiceScore?: number | null
  essayScore?: number | null
  theoryScore?: number | null
  practicalScores?: Array<{
    attempt: number
    kind?: string | null
    score?: number | null
    checker?: { nik?: string | null, name?: string | null } | null
  }> | null
  status?: string | null
}

export interface RelatedDocuments {
  applicationDocument: Record<string, unknown>
  userData: Record<string, unknown>
}

export interface EvidenceItem {
  id: number
  file?: string | null
  createdAt?: string | null
}

export interface ScoreRecapResponse {
  branches: BranchOption[]
  professions: ProfessionOption[]
  events: ScoreRecapEvent[]
  rows: ScoreRecapRow[]
}

export interface ProfessionOption {
  id: number
  profession?: { id?: number, profession?: string | null } | null
}

export interface ScoreRecapEvent {
  id: number
  event?: string | null
  createdAt?: string | null
}
