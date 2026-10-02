// A tab-local practice data set. This module never reads or writes production data.
// The training adapter accepts several heterogeneous legacy API payloads.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RecordValue = Record<string, any>
type Collection = 'licenseUser' | 'logbookUser' | 'ielpUser' | 'medexUser' | 'competenceUser'

const sampleFiles: Record<Collection, string> = {
  licenseUser: '/training-samples/LICENSE.pdf',
  logbookUser: '/training-samples/LOGBOOK.pdf',
  ielpUser: '/training-samples/IELP.pdf',
  medexUser: '/training-samples/MEDEX.pdf',
  competenceUser: '/training-samples/COMPETENCE/APP.pdf'
}
const sampleUrl = (kind: Collection) => new URL(sampleFiles[kind], location.origin).href

const ratings = [
  { id: 1, professionId: 1, rating: 'TWR', description: 'Tower' },
  { id: 2, professionId: 1, rating: 'APP', description: 'Approach' },
  { id: 3, professionId: 1, rating: 'APS', description: 'Approach Surveillance' },
  { id: 4, professionId: 1, rating: 'ACP', description: 'Area Control Procedural' },
  { id: 5, professionId: 1, rating: 'ACS', description: 'Area Control Surveillance' }
]

interface TrainingState {
  nextId: number
  collections: Record<Collection, RecordValue[]>
  applications: RecordValue[]
  letterAssigned: boolean
  briefingDate: string | null
  essaySubmitted: boolean
  multipleChoiceSubmitted: boolean
  completedRatingIds: number[]
  completedAt: string | null
}

function initialState(): TrainingState {
  return {
    nextId: 1,
    collections: { licenseUser: [], logbookUser: [], ielpUser: [], medexUser: [], competenceUser: [] },
    applications: [],
    letterAssigned: false,
    briefingDate: null,
    essaySubmitted: false,
    multipleChoiceSubmitted: false,
    completedRatingIds: [],
    completedAt: null
  }
}

let state = initialState()
export function resetTrainingApi() {
  state = initialState()
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

async function fields(request: Request): Promise<RecordValue> {
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return await request.json() as RecordValue
  if (contentType.includes('multipart/form-data')) {
    const body: RecordValue = {}
    for (const [key, value] of (await request.formData()).entries()) {
      body[key] = value instanceof File ? value.name : value
    }
    return body
  }
  return {}
}

function credentialRows(kind: Collection) {
  return state.collections[kind]
}

function applicationResponse() {
  const now = new Date().toISOString()
  const trainingCheckerGroup = {
    id: 1,
    name: 'Training Checker',
    userChecker: {
      nik: 'TRAINING-CHECKER',
      name: 'Training Checker',
      checkerRatings: ratings.map(rating => ({ rating }))
    }
  }
  const event = {
    id: 1, event: 'Training Performance Check',
    remarkDoc: { remark: 'PERPANJANGAN' },
    startDate: now, finishDate: new Date(Date.now() + 86400000 * 30).toISOString(),
    briefingFile: '/training-samples/EVENT%20BRIEFING.pdf',
    passingGrade: 75, isPractical: true, isSimulator: false,
    eventUsers: [{ id: 1, userNik: 'TRAINING', event: { groups: [{ id: 1, group: 'Training Checker', groupMembers: [{ id: 1, member: 'TRAINING' }], checkerGroups: [trainingCheckerGroup] }] } }]
  }
  const user = {
    nik: 'TRAINING', name: 'TRAINING USER', licenseUserId: 'TRAINING',
    dateOfBirth: '1990-01-01', placeOfBirth: 'Training', personalAddress: 'Training',
    nationality: 'Indonesia', phoneNumber: '-', gender: { id: '1', gender: 'Male' },
    license: credentialRows('licenseUser'), logbookUsers: credentialRows('logbookUser'),
    ielp: credentialRows('ielpUser'), medex: credentialRows('medexUser'),
    competences: credentialRows('competenceUser')
  }
  return { event: [event], applicationDoc: state.applications, user, rating: ratings, ratingReal: ratings }
}

function examinationResponse() {
  if (!state.applications.length || !state.letterAssigned || !state.briefingDate) {
    return { event: null, status: 'NOT_ASSIGNED', message: 'Complete the training application, proposal letter, and briefing token first.', ratingStatuses: [] }
  }
  const now = Date.now()
  const appRatings = state.applications[0]!.appRatings.map((item: RecordValue) => ({
    ...item,
    statusId: state.multipleChoiceSubmitted ? 6 : state.essaySubmitted ? 4 : 1,
    examinationStatus: {
      status: state.multipleChoiceSubmitted ? 'COMPLETED' : state.essaySubmitted ? 'IN_PROGRESS' : 'NOT_STARTED',
      message: state.multipleChoiceSubmitted ? 'Training theory examination completed.' : state.essaySubmitted ? 'Continue with multiple choice.' : 'Start the essay examination.',
      canStart: !state.multipleChoiceSubmitted
    }
  }))
  return {
    status: state.multipleChoiceSubmitted ? 'COMPLETED' : state.essaySubmitted ? 'IN_PROGRESS' : 'NOT_STARTED',
    message: state.multipleChoiceSubmitted ? 'Training theory examination completed.' : 'Training examination is ready.',
    event: {
      id: 1, event: 'Training Performance Check', theoryMode: 'MODE_1', difficulty: 'EASY', passingGrade: 75,
      eventQuestions: [
        { id: 1, quantity: 3, persentage: 50, minutes: 30, kindOfQuestion: { question: 'ESSAY' } },
        { id: 2, quantity: 4, persentage: 50, minutes: 30, kindOfQuestion: { question: 'MULTIPLE CHOICE' } }
      ],
      eventUsers: [{ id: 1, applicationDocs: [{ id: state.applications[0]!.id, appRatings }],
        attendaces: { room: { startDate: new Date(now - 86400000).toISOString(), finishDate: new Date(now + 86400000).toISOString() } } }]
    },
    ratingStatuses: appRatings.map((item: RecordValue) => ({ ...item.examinationStatus, appRatingId: item.id, rating: item.rating?.rating }))
  }
}

function scoreHistory(practical: boolean) {
  if (!state.completedRatingIds.length) return []
  return state.applications.map(application => ({
    event: { event: application.eventUser?.event?.event || 'Training Performance Check' },
    applicationDocs: [{
      id: application.id,
      number: application.number,
      appRatings: application.appRatings
        .filter((item: RecordValue) => state.completedRatingIds.includes(Number(item.id)))
        .map((item: RecordValue) => ({
          id: item.id,
          rating: item.rating,
          status: { status: 'SUCCESS' },
          ...(practical
            ? { practicalTests: [{
                id: Number(item.id) * 100 + 2,
                score: 88,
                file: new URL('/training-samples/EVALUATION%20SHEET.pdf', location.origin).href,
                createdAt: state.completedAt,
                kindOfPractical: { kind: 'Live' },
                checkerGroup: { userChecker: { name: 'Training Checker (simulated)' } },
                recheckAttempts: []
              }] }
            : { finalScores: [{
                id: Number(item.id) * 100 + 1,
                essayScore: 85,
                multipleChoiceScore: 85,
                finalScore: 85,
                status: { status: 'SUCCESS' },
                userRatings: []
              }] })
        }))
    }]
  })).filter(item => item.applicationDocs[0]!.appRatings.length > 0)
}

export async function handleTrainingApi(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/__training_api__/, '').replace(/\/$/, '') || '/'
  const method = request.method.toUpperCase()

  if (path === '/api/credentialVerification/checkers' && method === 'GET') {
    return json([{ nik: 'TRAINING-CHECKER', name: 'Training Checker' }])
  }
  if (path === '/api/ojtiRecommendations/eligible' && method === 'GET') {
    return json([{ nik: 'TRAINING-OJTI', name: 'Training OJTI', licenseUserId: 'TRAINING-OJTI' }])
  }
  if (path === '/api/operationalGuide' && method === 'GET') {
    return json({ event: { id: 1, name: 'Training Performance Check', remark: 'PERPANJANGAN' }, applicationDocId: state.applications[0]?.id || null, checks: {
      license: !!state.collections.licenseUser.length,
      logbook: !!state.collections.logbookUser.length,
      ielp: !!state.collections.ielpUser.length,
      medex: !!state.collections.medexUser.length,
      competence: !!state.collections.competenceUser.length,
      application: !!state.applications.length,
      letter: state.letterAssigned,
      checker: state.applications.some(item => item.statusId === 2 && !!item.verifications),
      briefing: !!state.briefingDate
    } })
  }
  if (path === '/api/dashboardOperational' && method === 'GET') {
    return json({ name: 'Training User', currentRatingAuthorities: [],
      ielp: credentialRows('ielpUser'), medex: credentialRows('medexUser'),
      license: credentialRows('licenseUser'), logbookUsers: credentialRows('logbookUser'),
      eventUsers: [{ id: 1, event: { id: 1, event: 'Training Performance Check', briefingFile: '/training-samples/EVENT%20BRIEFING.pdf' },
        applicationDocs: state.applications.filter(item => item.statusId === 2) }] })
  }
  if (path === '/api/dashboardBriefings' && method === 'GET') {
    return json([{ id: 1, speaker: 'Training Lead', createdAt: new Date().toISOString(),
      contentOfBriefings: [{ id: 1, contentOfBriefing: 'Training briefing', file: '/training-samples/EVENT%20BRIEFING.pdf' }],
      briefingDestinations: [] }])
  }
  if (path === '/api/dashboardToken' && method === 'POST') {
    const body = await fields(request)
    const application = state.applications.find(item => item.id === Number(body.applicationDocId) && item.statusId === 2)
    if (!application) return json({ message: 'Application document is not verified yet' }, 409)
    state.briefingDate = new Date().toISOString()
    application.briefingDate = state.briefingDate
    application.updatedAt = state.briefingDate
    application.eventUser.event.briefingFile = '/training-samples/EVENT%20BRIEFING.pdf'
    return json({ message: 'ok' })
  }
  if (path === '/api/proposalLetters/supervisors' && method === 'GET') {
    return json([{ nik: 'TRAINING-SUPERVISOR', name: 'Training Supervisor' }])
  }
  const proposalMatch = /^\/api\/proposalLetters\/application\/(\d+)(\/assign)?$/.exec(path)
  if (proposalMatch) {
    const application = state.applications.find(item => item.id === Number(proposalMatch[1]))
    if (!application) return json({ message: 'Training application not found' }, 404)
    if (proposalMatch[2] && method === 'POST') {
      state.letterAssigned = true
      const now = new Date().toISOString()
      application.statusId = 2
      application.status = { id: 2, status: 'APPROVED' }
      application.updatedAt = now
      application.verifications = {
        id: state.nextId++, applicationDocId: application.id,
        verifiedBy: 'Training Checker (simulated)', verifiedAt: now,
        createdAt: now, updatedAt: now, deletedAt: null,
        notes: 'Automatically verified after simulated supervisor validation.'
      }
      return json({ success: true })
    }
    if (!proposalMatch[2] && method === 'GET') {
      return json({ ...application, appRatings: application.appRatings.map((item: RecordValue) => ({
        ...item, proposalLetter: state.letterAssigned
          ? {
              id: item.id, status: 'VALIDATED', revision: 0,
              supervisor: { nik: 'TRAINING-SUPERVISOR', name: 'Training Supervisor' },
              validatedAt: new Date().toISOString(), actions: []
            }
          : null
      })) })
    }
  }

  for (const kind of Object.keys(sampleFiles) as Collection[]) {
    if (!path.startsWith(`/api/${kind}`)) continue
    const suffix = path.slice(`/api/${kind}`.length)
    if (!suffix && method === 'GET') {
      return json(kind === 'competenceUser'
        ? { competence: credentialRows(kind), rating: ratings }
        : credentialRows(kind))
    }
    if (suffix === '/sync-echain' && method === 'POST') {
      return json({ success: true, data: { institution: 'Training Institution', note: 'Training sample',
        licenseExpiredDate: '2030-12-31', released: '2026-01-01', expired: '2030-12-31', level: '5',
        examiner: 'Training Examiner', rater: 'Training Rater', fileName: `${kind}.pdf`,
        fileUrl: sampleUrl(kind), fileMimeType: 'application/pdf' } })
    }
    if (!suffix && method === 'POST') {
      const body = await fields(request)
      const now = new Date().toISOString()
      const id = state.nextId++
      const ratingId = Number(body.ratingId || 2)
      const ratingName = ratings.find(rating => rating.id === ratingId)?.rating || 'APP'
      const file = kind === 'competenceUser'
        ? new URL(`/training-samples/COMPETENCE/${ratingName}.pdf`, location.origin).href
        : sampleUrl(kind)
      const record: RecordValue = { id, userNik: 'TRAINING', userId: 'TRAINING',
        ...body, createdAt: now, updatedAt: now, deletedAt: null,
        file, source: 'MANUAL', verificationStatus: 'APPROVED',
        isConfirm: true, isConfirmed: true, isCurrent: true,
        expiredDate: body.licenseExpiredDate || body.expiredDate,
        ratingId, rating: ratings.find(rating => rating.id === ratingId) || ratings[1] }
      credentialRows(kind).push(record)
      return json(record, 201)
    }
    const match = /^\/(\d+)$/.exec(suffix)
    if (match && ['PUT', 'PATCH', 'DELETE'].includes(method)) {
      const collection = credentialRows(kind)
      const index = collection.findIndex(item => item.id === Number(match[1]))
      if (index < 0) return json({ message: 'Training record not found' }, 404)
      if (method === 'DELETE') collection.splice(index, 1)
      else Object.assign(collection[index]!, await fields(request), { updatedAt: new Date().toISOString(), file: sampleUrl(kind) })
      return json({ success: true })
    }
  }

  if (path === '/api/applicationDocument' && method === 'GET') return json(applicationResponse())
  if (path === '/api/scoreUser' && method === 'GET') return json(scoreHistory(false))
  if (path === '/api/scoreUserPractical' && method === 'GET') return json(scoreHistory(true))
  if (path === '/api/applicationDocument' && method === 'POST') {
    const body = await fields(request)
    const now = new Date().toISOString()
    const medex = state.collections.medexUser.find(item => item.id === Number(body.medexId))
    const ielp = state.collections.ielpUser.find(item => item.id === Number(body.ielpId))
    const applicationId = state.nextId++
    const record = {
      ...body, id: applicationId, number: `TRAINING/${String(applicationId).padStart(3, '0')}`,
      createdAt: now, updatedAt: now, statusId: 1,
      status: { id: 1, status: 'REGISTERED' },
      medex: medex ? { ...medex } : null,
      ielp: ielp ? { ...ielp } : null,
      briefingDate: null,
      verifications: null,
      appRatings: Array.isArray(body.appRating)
        ? body.appRating.map((item: RecordValue, index: number) => ({
            id: index + 1, rating: ratings.find(rating => rating.id === Number(item.rating?.id)) || ratings[1],
            controlHour: item.controlHour, statusId: 1
          }))
        : [],
      eventUser: { id: 1, eventId: 1, userNik: 'TRAINING', event: applicationResponse().event[0] }
    }
    state.applications.push(record)
    return json(record, 201)
  }

  if (path === '/api/theorySessions/mine' && method === 'GET') return json([])
  if (path === '/api/examination' && method === 'GET') return json(examinationResponse())
  if (path === '/api/examinationEssay' && method === 'POST') {
    return json({ eventId: 1, eventUserId: 1, appRatingId: 1, groupMemberId: 1,
      eventShort: { id: 1, minutes: 30 }, eventQuestion: { id: 1, minutes: 30 }, monitorTime: { time: 0 },
      essay: [{ id: 1, group: 'Training Essay', quantity: 3, essay: [
        { essay: { id: 1, question: '<p>Describe the steps you would take before beginning an operational shift.</p>' } },
        { essay: { id: 2, question: '<p>How would you respond to an unexpected communications failure?</p>' } },
        { essay: { id: 3, question: '<p>Explain why coordination between sectors is important.</p>' } }
      ] }] })
  }
  if (path === '/api/examinationAnswer' && method === 'POST') {
    state.essaySubmitted = true
    return json({ message: 'success' })
  }
  if (path === '/api/examinationMultipleChoice' && method === 'POST') {
    return json({ eventId: 1, eventUserId: 1, appRatingId: 1, groupMemberId: 1,
      eventShort: { id: 2, minutes: 30 }, eventQuestion: { id: 2, minutes: 30 }, monitorTime: { time: 0 },
      multipleChoice: [{ id: 1, group: 'Training Multiple Choice', quantity: 4, multipleChoice: [
        { multipleChoice: { id: 11, question: '<p>What should you check before an operational shift?</p>', a: 'Briefing and equipment', b: 'Only the weather', c: 'Only the roster', d: 'Nothing' } },
        { multipleChoice: { id: 12, question: '<p>What is the correct action if equipment fails?</p>', a: 'Ignore it', b: 'Report and follow the procedure', c: 'Continue without coordination', d: 'End the shift silently' } },
        { multipleChoice: { id: 13, question: '<p>Why is a logbook maintained?</p>', a: 'To record operational information', b: 'For decoration', c: 'To replace the license', d: 'To avoid a briefing' } },
        { multipleChoice: { id: 14, question: '<p>Who should receive a handover?</p>', a: 'The next controller', b: 'No one', c: 'Only visitors', d: 'The applicant only' } }
      ] }] })
  }
  if (path === '/api/examinationMultipleChoiceAnswer' && method === 'POST') {
    const body = await fields(request)
    const ratingId = Number(body.appRatingId)
    if (Number.isInteger(ratingId) && !state.completedRatingIds.includes(ratingId)) {
      state.completedRatingIds.push(ratingId)
    }
    state.multipleChoiceSubmitted = true
    state.completedAt = new Date().toISOString()
    return json({ finalValue: 85, passingGrade: 75, awaitingPractical: true, falseAnswer: [],
      essayCorrection: [{ id: 1, score: 85, checkerUser: { name: 'Training Checker (simulated)' }, essay: { id: 1, question: 'Training essay', value: 100 } }] })
  }
  if ((path === '/api/postTime' || path === '/api/preview' || path === '/api/examinationDraft') && method === 'POST') return json({ success: true })

  // Unknown training endpoints must fail here. They must never fall through to
  // the real backend merely because a page was added later.
  return json({ message: `This action is not available in Training Mode: ${method} ${path}` }, 501)
}
