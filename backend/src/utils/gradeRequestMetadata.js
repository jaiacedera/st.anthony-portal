export const GRADE_BREAKDOWN_REQUEST_TYPE = 'grade_breakdown'

const GRADE_REQUEST_METADATA_PREFIX = '[grade-request-meta]'

export function normalizeGradingPeriod(value) {
  const normalized = String(value ?? '').trim().toLowerCase()

  if (normalized === 'midterm' || normalized === 'final') {
    return normalized
  }

  return ''
}

export function normalizeGradeRequestType(value) {
  const normalized = String(value ?? '').trim().toLowerCase()

  if (normalized === GRADE_BREAKDOWN_REQUEST_TYPE) {
    return normalized
  }

  return ''
}

export function formatGradingPeriodLabel(value) {
  return normalizeGradingPeriod(value) === 'final' ? 'Final' : 'Midterm'
}

export function buildGradeBreakdownReason({
  gradingPeriod,
  message = '',
  subjectCode = '',
}) {
  const normalizedGradingPeriod = normalizeGradingPeriod(gradingPeriod)
  const trimmedSubjectCode = String(subjectCode ?? '').trim()
  const trimmedMessage = String(message ?? '').trim()
  const metadata = JSON.stringify({
    requestType: GRADE_BREAKDOWN_REQUEST_TYPE,
    gradingPeriod: normalizedGradingPeriod,
  })
  const fallbackMessage = `I would like to request a breakdown of my ${formatGradingPeriodLabel(
    normalizedGradingPeriod,
  )} grade${trimmedSubjectCode ? ` for ${trimmedSubjectCode}` : ''}.`

  return `${GRADE_REQUEST_METADATA_PREFIX}${metadata}\n${trimmedMessage || fallbackMessage}`
}

export function parseGradeRequestReason(value) {
  const normalizedValue = String(value ?? '')

  if (!normalizedValue.startsWith(GRADE_REQUEST_METADATA_PREFIX)) {
    return {
      requestType: GRADE_BREAKDOWN_REQUEST_TYPE,
      gradingPeriod: '',
      message: normalizedValue.trim(),
    }
  }

  const newlineIndex = normalizedValue.indexOf('\n')
  const metadataChunk =
    newlineIndex >= 0
      ? normalizedValue.slice(GRADE_REQUEST_METADATA_PREFIX.length, newlineIndex)
      : normalizedValue.slice(GRADE_REQUEST_METADATA_PREFIX.length)
  const message =
    newlineIndex >= 0 ? normalizedValue.slice(newlineIndex + 1).trim() : ''

  try {
    const metadata = JSON.parse(metadataChunk)

    return {
      requestType:
        normalizeGradeRequestType(metadata?.requestType) || GRADE_BREAKDOWN_REQUEST_TYPE,
      gradingPeriod: normalizeGradingPeriod(metadata?.gradingPeriod),
      message,
    }
  } catch {
    return {
      requestType: GRADE_BREAKDOWN_REQUEST_TYPE,
      gradingPeriod: '',
      message: normalizedValue.trim(),
    }
  }
}
