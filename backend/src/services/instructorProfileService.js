import {
  getInstructorAccountByUsername,
  setInstructorAccountPasswordByUsername,
  updateInstructorAccountByUsername,
  verifyInstructorPassword,
} from '../../database/authStore.js'
import { SHEET_ID_COLUMNS, SHEET_NAMES } from '../../database/sheetsSchema.js'
import {
  getAllRows,
  getInstructorSubjects,
  updateRowById,
} from '../../database/sheetsService.js'

function isActiveStatus(value) {
  return String(value ?? '').trim().toUpperCase() !== 'INACTIVE'
}

function normalizeValue(value) {
  return String(value ?? '').trim().toLowerCase()
}

function getEmailLocalPart(value) {
  const normalized = normalizeValue(value)
  const separatorIndex = normalized.indexOf('@')

  if (separatorIndex <= 0) {
    return ''
  }

  return normalized.slice(0, separatorIndex)
}

function getDisplayValue(value, fallback = 'Not set') {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

function getOptionalValue(value) {
  const normalized = String(value ?? '').trim()
  return normalized || ''
}

function getMostCommonValue(items) {
  const counts = new Map()

  for (const item of items) {
    const key = String(item ?? '').trim()

    if (!key) {
      continue
    }

    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? ''
}

function buildPersonName(person) {
  return [
    person?.first_name,
    person?.middle_name,
    person?.last_name,
  ]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ')
}

function resolveInstructorId(account, instructors) {
  const activeInstructors = instructors.filter((instructor) => isActiveStatus(instructor.status))
  const accountInstructorId = normalizeValue(account.instructor_id)
  const accountEmail = normalizeValue(account.email)
  const accountUsername = normalizeValue(account.username)
  const matchedInstructors = activeInstructors.filter((instructor) => {
    const instructorId = normalizeValue(instructor.instructor_id)
    const instructorEmail = normalizeValue(instructor.email)
    const instructorEmailLocalPart = getEmailLocalPart(instructor.email)

    return (
      (accountInstructorId && instructorId === accountInstructorId) ||
      (accountEmail && instructorEmail === accountEmail) ||
      (accountUsername &&
        (instructorId === accountUsername || instructorEmailLocalPart === accountUsername))
    )
  })

  if (matchedInstructors.length === 1) {
    return matchedInstructors[0].instructor_id
  }

  if (activeInstructors.length === 1) {
    return activeInstructors[0].instructor_id
  }

  return null
}

function formatRoleLabel() {
  return 'Instructor Portal Account'
}

function splitFullName(fullName) {
  const parts = String(fullName ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) {
    return {
      firstName: '',
      middleName: '',
      lastName: '',
    }
  }

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      middleName: '',
      lastName: '',
    }
  }

  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
  }
}

async function resolveInstructorContext(username) {
  const normalizedUsername = String(username ?? '').trim()
  const account = getInstructorAccountByUsername(normalizedUsername)

  if (!account) {
    const error = new Error('Instructor account was not found.')
    error.statusCode = 404
    throw error
  }

  const instructors = await getAllRows(SHEET_NAMES.INSTRUCTORS)
  const instructorId = resolveInstructorId(account, instructors)
  const instructorRecord = instructorId
    ? instructors.find(
        (instructor) => String(instructor.instructor_id ?? '').trim() === String(instructorId).trim(),
      ) ?? null
    : null

  const subjects = instructorId ? await getInstructorSubjects(instructorId) : []
  const activeSubjects = subjects.filter((subject) => isActiveStatus(subject.status))

  return {
    account,
    instructorId,
    instructorRecord,
    subjects: activeSubjects,
  }
}

function buildInstructorProfilePayload({
  account,
  instructorId,
  instructorRecord,
  subjects,
}) {
  return {
    success: true,
    connected: true,
    needsBinding: !instructorId,
    message: instructorId
      ? undefined
      : 'Instructor account is authenticated but not linked to a Google Sheets instructor record yet.',
    header: {
      schoolYear: getDisplayValue(
        getMostCommonValue(subjects.map((subject) => subject.school_year)),
      ),
      semester: getDisplayValue(
        getMostCommonValue(subjects.map((subject) => subject.semester)),
      ),
    },
    profile: {
      id: getOptionalValue(instructorRecord?.instructor_id || account.instructor_id),
      fullName: buildPersonName(instructorRecord) || 'Instructor profile incomplete',
      firstName: getOptionalValue(instructorRecord?.first_name),
      middleName: getOptionalValue(instructorRecord?.middle_name),
      lastName: getOptionalValue(instructorRecord?.last_name),
      email: getDisplayValue(instructorRecord?.email || account.email),
      employeeId: getDisplayValue(instructorRecord?.instructor_id || account.instructor_id),
      department: getDisplayValue(account.department),
      contactNumber: getOptionalValue(account.phone),
      dateOfBirth: getOptionalValue(account.date_of_birth),
      gender: getOptionalValue(account.gender),
      address: getOptionalValue(account.address),
      joinedAt: getOptionalValue(instructorRecord?.created_at || account.created_at),
      lastLogin: getOptionalValue(account.last_login),
      username: getDisplayValue(account.username),
      status: getDisplayValue(account.status || instructorRecord?.status, 'ACTIVE'),
      role: formatRoleLabel(),
      profilePhoto: getOptionalValue(account.profile_photo),
    },
  }
}

export async function getInstructorProfile(username) {
  const context = await resolveInstructorContext(username)

  return buildInstructorProfilePayload(context)
}

export async function updateInstructorProfile({
  username = '',
  fullName = '',
  phone = '',
  dateOfBirth = '',
  gender = '',
  address = '',
}) {
  const context = await resolveInstructorContext(username)
  const normalizedUsername = String(username ?? '').trim()

  if (!normalizedUsername) {
    const error = new Error('Instructor username is required.')
    error.statusCode = 400
    throw error
  }

  const nameParts = splitFullName(fullName)

  if (context.instructorId) {
    const updatedRecord = await updateRowById(
      SHEET_NAMES.INSTRUCTORS,
      SHEET_ID_COLUMNS[SHEET_NAMES.INSTRUCTORS],
      context.instructorId,
      {
        first_name: nameParts.firstName,
        middle_name: nameParts.middleName,
        last_name: nameParts.lastName,
        updated_at: new Date().toISOString(),
      },
    )

    if (!updatedRecord) {
      const error = new Error('Instructor record was not found.')
      error.statusCode = 404
      throw error
    }
  }

  updateInstructorAccountByUsername(normalizedUsername, {
    phone: getOptionalValue(phone),
    date_of_birth: getOptionalValue(dateOfBirth),
    gender: getOptionalValue(gender),
    address: getOptionalValue(address),
    updated_at: new Date().toISOString(),
  })

  const nextContext = await resolveInstructorContext(normalizedUsername)

  return {
    ...buildInstructorProfilePayload(nextContext),
    message: 'Instructor profile updated successfully.',
  }
}

export async function changeInstructorPassword({
  username = '',
  currentPassword = '',
  newPassword = '',
  confirmPassword = '',
}) {
  const normalizedUsername = String(username ?? '').trim()

  if (!normalizedUsername) {
    const error = new Error('Instructor username is required.')
    error.statusCode = 400
    throw error
  }

  if (!currentPassword || !newPassword || !confirmPassword) {
    const error = new Error('All password fields are required.')
    error.statusCode = 400
    throw error
  }

  if (newPassword !== confirmPassword) {
    const error = new Error('New password and confirm password do not match.')
    error.statusCode = 400
    throw error
  }

  if (newPassword.length < 8) {
    const error = new Error('New password must be at least 8 characters long.')
    error.statusCode = 400
    throw error
  }

  const account = getInstructorAccountByUsername(normalizedUsername)

  if (!account) {
    const error = new Error('Instructor account was not found.')
    error.statusCode = 404
    throw error
  }

  if (!verifyInstructorPassword(normalizedUsername, currentPassword)) {
    const error = new Error('Current password is incorrect.')
    error.statusCode = 401
    throw error
  }

  if (verifyInstructorPassword(normalizedUsername, newPassword)) {
    const error = new Error('New password must be different from the current password.')
    error.statusCode = 400
    throw error
  }

  const updatedAccount = setInstructorAccountPasswordByUsername(normalizedUsername, newPassword)

  if (!updatedAccount) {
    const error = new Error('Unable to update instructor password.')
    error.statusCode = 500
    throw error
  }

  return {
    success: true,
    message: 'Password changed successfully.',
  }
}
