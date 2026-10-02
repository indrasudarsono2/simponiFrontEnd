export interface CheckerHistoryEventItem {
  id: number
  event: string
  session?: {
    id: number
    session: string
  } | null
}

export interface CheckerHistoryRemarkItem {
  id: number
  remark: string
  events: CheckerHistoryEventItem[]
}

export interface CheckerHistoryPracticalTestItem {
  id?: number
  score?: number | null
  file?: string | null
  kindOfPractical?: {
    kind?: string | null
  } | null
  checkerGroup?: {
    userChecker?: {
      name?: string | null
    } | null
  } | null
}

export interface CheckerHistoryAppRatingItem {
  id?: number
  rating?: {
    id?: number
    rating?: string | null
  } | null
  status?: {
    status?: string | null
  } | null
  finalScores?: Array<{
    finalScore?: number | null
    essayStartedAt?: string | null
    essaySubmittedAt?: string | null
    multipleChoiceStartedAt?: string | null
    multipleChoiceSubmittedAt?: string | null
    cwpSnapshots?: Array<{
      cwpId: number
      cwpName?: string | null
      sectorName?: string | null
      frequencies?: Array<{
        id: number
        frequency?: string | null
        isPrimary?: boolean | null
      }> | null
    }> | null
    event?: {
      passingGrade?: number | null
      sector?: {
        sector?: string | null
        sectorCwps?: Array<{
          cwp?: {
            id: number
            cwp?: string | null
            ratingId?: number | null
            cwpFrequencies?: Array<{
              id: number
              frequency?: string | null
              isPrimary?: boolean | null
            }> | null
          } | null
        }> | null
      } | null
    } | null
    status?: {
      status?: string | null
    } | null
  }> | null
  practicalTests?: CheckerHistoryPracticalTestItem[] | null
}

export interface CheckerHistoryApplicationDocItem {
  id?: number
  number?: string | null
  license?: {
    file?: string | null
  } | null
  medex?: {
    file?: string | null
    expired?: string | null
  } | null
  ielp?: {
    file?: string | null
    expired?: string | null
  } | null
  logbook?: {
    file?: string | null
  } | null
  licenseNumber?: string | null
  appRatings?: CheckerHistoryAppRatingItem[] | null
}

export interface CheckerHistoryResultItem {
  id?: number
  event?: {
    passingGrade?: number | null
    practicalPassingGrade?: number | null
  } | null
  user?: {
    name?: string | null
    licenseUserId?: string | null
  } | null
  applicationDocs?: CheckerHistoryApplicationDocItem[] | null
}

export interface CheckerHistorySearchResponse {
  event?: {
    event?: string | null
    session?: {
      session?: string | null
    } | null
    remarkDoc?: {
      remark?: string | null
    } | null
  } | null
  sortEventUser?: CheckerHistoryResultItem[] | null
}

export interface CheckerHistoryRow {
  id: string
  no: number
  showNo: boolean
  noRowSpan: number
  name: string
  showName: boolean
  nameRowSpan: number
  applicationDocNumber: string
  showApplicationDocNumber: boolean
  applicationDocNumberRowSpan: number
  showFile: boolean
  fileRowSpan: number
  licenseFile: string | null
  medexFile: string | null
  ielpFile: string | null
  logbookFile: string | null
  rating: string
  authorityCwps: Array<{
    id: number
    name: string
    sector: string
    frequencies: Array<{ id: number, frequency: string, isPrimary: boolean }>
  }>
  showRating: boolean
  ratingRowSpan: number
  remark: string
  showRemark: boolean
  remarkRowSpan: number
  score: string
  practicalTestFile: string | null
  practicalTestLabel: string
  kind: string
  practicalScore: string
}

export interface CheckerHistoryAuthority {
  user: string
  applicationDoc: string
  rating: string
  cwps: CheckerHistoryRow['authorityCwps']
}
