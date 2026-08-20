import { useDeferredValue, useMemo, useState } from 'react'
import { InstructorShell } from '../../components/instructor-shell'

type SubjectRecord = {
  id: string
  code: string
  title: string
  schedule: string
  room: string
  students: number
  instructor: string
  semester: string
  schoolYear: string
  description: string
}

const subjectRecords: SubjectRecord[] = [
  {
    id: 'it101',
    code: 'IT101',
    title: 'Introduction to Computing',
    schedule: 'Mon 8:00 AM - 10:00 AM',
    room: 'IT Lab 1',
    students: 32,
    instructor: 'Prof. Reyes',
    semester: '1st Semester',
    schoolYear: '2025-2026',
    description:
      'This subject is currently active and open for student management and grade posting.',
  },
  {
    id: 'cs201',
    code: 'CS201',
    title: 'Data Structures',
    schedule: 'Wed 1:00 PM - 3:00 PM',
    room: 'IT Lab 1',
    students: 34,
    instructor: 'Prof. Reyes',
    semester: '1st Semester',
    schoolYear: '2025-2026',
    description:
      'This subject is currently active and open for student management and grade posting.',
  },
  {
    id: 'it205',
    code: 'IT205',
    title: 'Web Development',
    schedule: 'Fri 8:00 AM - 11:00 AM',
    room: 'IT Lab 2',
    students: 29,
    instructor: 'Prof. Reyes',
    semester: '1st Semester',
    schoolYear: '2025-2026',
    description:
      'This subject is currently active and open for student management and grade posting.',
  },
  {
    id: 'it103',
    code: 'IT103',
    title: 'Programming Fundamentals',
    schedule: 'Tue 10:00 AM - 12:00 PM',
    room: 'IT Lab 2',
    students: 31,
    instructor: 'Prof. Reyes',
    semester: '1st Semester',
    schoolYear: '2025-2026',
    description:
      'This subject is currently active and open for student management and grade posting.',
  },
]

function BookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.5 5.5A2.5 2.5 0 0 1 6 3h5.5v17H6a2.5 2.5 0 0 0-2.5 2" />
      <path d="M20.5 5.5A2.5 2.5 0 0 0 18 3h-6.5v17H18a2.5 2.5 0 0 1 2.5 2" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function UserPlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="2.5" />
      <path d="M4 18v-1a4 4 0 0 1 8 0v1" />
      <path d="M16 11a2.4 2.4 0 1 0 0-4.8" />
      <path d="M20 18v-1a4 4 0 0 0-3.2-3.9" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" />
    </svg>
  )
}

function PanelLead() {
  return (
    <span className="instructor-panel-lead" aria-hidden="true">
      <BookIcon />
      <span className="instructor-panel-underline"></span>
    </span>
  )
}

function DetailIcon({
  children,
}: {
  children: React.ReactNode
}) {
  return <span className="selected-subject-detail-icon">{children}</span>
}

function InstructorDetailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.8v4.7l3.1 1.7" />
    </svg>
  )
}

function RoomIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 20V7.5A1.5 1.5 0 0 1 6.5 6H18a1 1 0 0 1 1 1v13" />
      <path d="M3 20h18" />
      <path d="M8 9.5h3" />
      <path d="M8 13h3" />
      <path d="M15 16.5h.01" />
    </svg>
  )
}

function StudentsDetailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="2.5" />
      <path d="M4.2 18v-.6A4.3 4.3 0 0 1 8.5 13h1" />
      <circle cx="16.5" cy="9.5" r="2.1" />
      <path d="M13.6 18v-.3A3.7 3.7 0 0 1 17.3 14h.3" />
    </svg>
  )
}

function SemesterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3.5v3" />
      <path d="M16 3.5v3" />
      <path d="M4 9.5h16" />
    </svg>
  )
}

function ActionButton({
  icon,
  label,
  variant = 'outline',
}: {
  icon: React.ReactNode
  label: string
  variant?: 'solid' | 'outline'
}) {
  const className =
    variant === 'solid'
      ? 'subject-detail-action subject-detail-action--solid'
      : 'subject-detail-action'

  return (
    <button type="button" className={className}>
      <span className="subject-detail-action-icon" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  )
}

export default function SubjectsPage() {
  const [searchValue, setSearchValue] = useState('')
  const [selectedSemester, setSelectedSemester] = useState('1st Semester')
  const deferredSearchValue = useDeferredValue(searchValue)
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjectRecords[0]?.id ?? '')

  const filteredSubjects = useMemo(() => {
    const normalizedQuery = deferredSearchValue.trim().toLowerCase()

    return subjectRecords.filter((subject) => {
      const matchesQuery =
        !normalizedQuery ||
        [subject.code, subject.title, subject.schedule, subject.room]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)

      return matchesQuery && subject.semester === selectedSemester
    })
  }, [deferredSearchValue, selectedSemester])

  const selectedSubject =
    filteredSubjects.find((subject) => subject.id === selectedSubjectId) ??
    filteredSubjects[0] ??
    null

  return (
    <InstructorShell
      active="subjects"
      schoolYearLabel="2025-2026"
      semesterLabel="1st Semester"
    >
      <section className="subjects-page subjects-page-content subjects-layout">
        <article className="instructor-panel subjects-management-card subject-management-panel">
          <div className="instructor-panel-header subject-panel-heading panel-title-row">
            <PanelLead />
            <h2 className="panel-title">Subject Management</h2>
          </div>

          <div className="subjects-toolbar subject-toolbar">
            <label className="subjects-search-field subject-search">
              <span className="subjects-search-icon" aria-hidden="true">
                <SearchIcon />
              </span>
              <input
                type="search"
                name="subject-search"
                placeholder="Search subject..."
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
            </label>

            <div className="subjects-toolbar-actions">
              <label className="subjects-semester-field semester-filter">
                <select
                  name="subject-semester"
                  value={selectedSemester}
                  onChange={(event) => setSelectedSemester(event.target.value)}
                >
                  <option>1st Semester</option>
                  <option>2nd Semester</option>
                </select>
              </label>

              <button type="button" className="subjects-primary-button create-subject-button">
                <span className="subjects-primary-button-plus" aria-hidden="true">
                  +
                </span>
                <span>Create Subject</span>
              </button>
            </div>
          </div>

          <div className="subjects-table-shell">
            <div className="instructor-table-head subjects-table-layout subject-table-grid subject-table-header">
              <span>Subject Code</span>
              <span>Subject Title</span>
              <span>Schedule</span>
              <span>Room</span>
              <span>Students</span>
            </div>

            <div className="subjects-table-body">
              {filteredSubjects.length ? (
                filteredSubjects.map((subject) => {
                  const isSelected = subject.id === selectedSubject?.id

                  return (
                    <div
                      key={subject.id}
                      className={
                        isSelected
                          ? 'subjects-table-row subjects-table-layout subject-table-grid subject-row is-selected'
                          : 'subjects-table-row subjects-table-layout subject-table-grid subject-row'
                      }
                      onClick={() => setSelectedSubjectId(subject.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setSelectedSubjectId(subject.id)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="course-pill subject-code-pill subject-code">{subject.code}</span>
                      <span className="subjects-inline-title subject-title">{subject.title}</span>
                      <span className="subjects-inline-meta subject-meta">{subject.schedule}</span>
                      <span className="subjects-inline-meta subject-meta">{subject.room}</span>
                      <span className="table-stat student-count">{subject.students}</span>
                    </div>
                  )
                })
              ) : (
                <div className="subjects-empty-state">
                  No subjects matched your search.
                </div>
              )}
            </div>
          </div>
        </article>

        <aside className="instructor-panel selected-subject-card selected-subject-panel">
          <div className="instructor-panel-header subject-panel-heading panel-title-row">
            <PanelLead />
            <h2 className="panel-title">Selected Subject</h2>
          </div>

          <div className="selected-subject-body selected-subject-content">
            {selectedSubject ? (
              <>
                <div className="selected-subject-headline">
                  <span className="course-pill subject-code-pill subject-code-pill--detail selected-subject-code">
                    {selectedSubject.code}
                  </span>
                  <h3 className="selected-subject-name">{selectedSubject.title}</h3>
                </div>

                <div className="selected-subject-detail-list">
                  <div className="selected-subject-detail-row subject-detail-row">
                    <DetailIcon>
                      <InstructorDetailIcon />
                    </DetailIcon>
                    <span className="selected-subject-detail-label subject-detail-label">Instructor</span>
                    <span className="selected-subject-detail-value subject-detail-value">{selectedSubject.instructor}</span>
                  </div>

                  <div className="selected-subject-detail-row subject-detail-row">
                    <DetailIcon>
                      <ClockIcon />
                    </DetailIcon>
                    <span className="selected-subject-detail-label subject-detail-label">Schedule</span>
                    <span className="selected-subject-detail-value subject-detail-value">{selectedSubject.schedule}</span>
                  </div>

                  <div className="selected-subject-detail-row subject-detail-row">
                    <DetailIcon>
                      <RoomIcon />
                    </DetailIcon>
                    <span className="selected-subject-detail-label subject-detail-label">Room</span>
                    <span className="selected-subject-detail-value subject-detail-value">{selectedSubject.room}</span>
                  </div>

                  <div className="selected-subject-detail-row subject-detail-row">
                    <DetailIcon>
                      <StudentsDetailIcon />
                    </DetailIcon>
                    <span className="selected-subject-detail-label subject-detail-label">Students</span>
                    <span className="selected-subject-detail-value subject-detail-value">{selectedSubject.students}</span>
                  </div>

                  <div className="selected-subject-detail-row subject-detail-row">
                    <DetailIcon>
                      <SemesterIcon />
                    </DetailIcon>
                    <span className="selected-subject-detail-label subject-detail-label">Semester</span>
                    <span className="selected-subject-detail-value subject-detail-value">{selectedSubject.semester}</span>
                  </div>
                </div>

                <p className="selected-subject-description">{selectedSubject.description}</p>

                <div className="selected-subject-action-list selected-subject-actions">
                  <ActionButton icon={<UserPlusIcon />} label="Add Students" variant="solid" />
                  <ActionButton icon={<UsersIcon />} label="View Class List" />
                  <ActionButton icon={<EditIcon />} label="Edit Subject" />
                </div>
              </>
            ) : (
              <div className="subjects-empty-state subjects-empty-state--detail">
                Select a subject from the list to view its details.
              </div>
            )}
          </div>
        </aside>
      </section>
    </InstructorShell>
  )
}
