export interface ScoreCheckerEventItem {
  id: number
  event: string
  theoryMode?: string | null
  difficulty?: string | null
}

export interface ScoreCheckerRemarkItem {
  id: number
  remark: string
  events: ScoreCheckerEventItem[]
}

export interface ScoreCheckerFinalScoreItem {
  id?: number
  finalScore?: number | null
  status?: {
    status?: string | null
  } | null
}

export interface ScoreCheckerAppRatingItem {
  id?: number
  rating?: {
    rating?: string | null
  } | null
  finalScores?: ScoreCheckerFinalScoreItem[] | null
  previews?: Array<{
    id?: number
  }> | null
  examinationInvalidations?: Array<{
    id?: number
    reason?: string | null
    fraudCategory?: string | null
    createdAt?: string | null
  }> | null
}

export interface ScoreCheckerApplicationDocItem {
  id?: number
  number?: string | null
  appRatings?: ScoreCheckerAppRatingItem[] | null
}

export interface ScoreCheckerResultItem {
  id?: number
  event?: { event?: string | null, theoryMode?: string | null, difficulty?: string | null } | null
  user?: {
    name?: string | null
  } | null
  applicationDocs?: ScoreCheckerApplicationDocItem[] | null
}

export interface ScoreCheckerEvidenceItem {
  id?: number
  file?: string | null
  createdAt?: string | null
}

export interface CheckerTheoryReview {
  finalScoreId: number
  finalScore: number | null
  multipleChoiceScore: number | null
  essayScore: number | null
  applicationNumber: string | null
  name: string | null
  event: string | null
  rating: string | null
  multipleChoice: Array<{
    id: number
    question: string
    image: string | null
    options: Array<{ label: string, text: string, selected: boolean }>
    answered: boolean
    optionOrderRecorded: boolean
  }>
  essay: Array<{ id: number, question: string, image: string | null, answer: string, score: number | null, checkerName: string | null }>
}

export interface ReExaminationInvalidationItem {
  id?: number
  invalidatedBy?: string | null
  invalidatedByName?: string | null
  reason?: string | null
  fraudCategory?: string | null
  previousStatusId?: number | null
  previousScore?: number | null
  invalidatedAt?: string | null
}

export interface ReExaminationAttemptItem {
  attemptNumber: number
  finalScoreId: number
  status?: string | null
  essayScore?: number | null
  multipleChoiceScore?: number | null
  finalScore?: number | null
  isInvalidated: boolean
  startedAt?: string | null
  completedAt?: string | null
  checkers?: Array<{ nik: string, name: string }>
  invalidation?: ReExaminationInvalidationItem | null
}

export interface ReExaminationHistoryResponse {
  appRatingId: number
  user?: { nik?: string | null, name?: string | null } | null
  applicationDocument?: string | null
  event?: { id?: number, event?: string | null } | null
  rating?: string | null
  currentStatus?: string | null
  attempts: ReExaminationAttemptItem[]
  checkerResets?: Array<{
    id: number
    attemptNumber: number
    checkerNik: string
    checkerName?: string | null
    reason: string
    createdAt: string
    voidedFinalScoreId?: number | null
  }>
  pendingReExamination: boolean
}

export interface ScoreCheckerRow {
  id: string
  eventName: string
  theoryMode: string | null
  difficulty: string | null
  no: number
  showNo: boolean
  noRowSpan: number
  name: string
  showName: boolean
  nameRowSpan: number
  applicationDoc: string
  showApplicationDoc: boolean
  applicationDocRowSpan: number
  rating: string
  showRating: boolean
  ratingRowSpan: number
  finalScore: string
  status: string
  showEvidence: boolean
  evidenceRowSpan: number
  appRatingId: number | null
  hasEvidence: boolean
  hasTheoryResult: boolean
}
