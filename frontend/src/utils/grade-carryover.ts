function finalComponentId(id: string) {
  return id === 'knowledge-midterm-exam' ? 'knowledge-major-exam-midterm' : id
}

export function inheritMidtermScores(
  midterm: Record<string, number>,
  final: Record<string, number>,
) {
  const inherited: Record<string, number> = {}
  for (const [key, value] of Object.entries(midterm)) {
    const [studentId, subjectId, period, componentId] = key.split('::')
    if (period !== 'midterm' || !componentId || !Number.isFinite(value)) continue
    inherited[[studentId, subjectId, 'final', finalComponentId(componentId)].join('::')] = value
  }
  // An explicitly entered Final score, including zero, always takes priority.
  return { ...inherited, ...final }
}

export function inheritMidtermConfig<
  S extends { id: string; isActive: boolean },
  C extends { id: string; sectionId: string; isActive: boolean },
>(final: { sections: S[]; components: C[] }, midterm: { sections: S[]; components: C[] }) {
  const sections = [...final.sections]
  const components = [...final.components]
  for (const section of midterm.sections) {
    if (section.isActive && section.id !== 'knowledge-midterm-exam' && !sections.some(item => item.id === section.id)) {
      sections.push({ ...section })
    }
  }
  for (const component of midterm.components) {
    const id = finalComponentId(component.id)
    const sectionId = component.sectionId === 'knowledge-midterm-exam' ? 'knowledge-major-exam' : component.sectionId
    if (component.isActive && sections.some(section => section.id === sectionId && section.isActive) && !components.some(item => item.id === id)) {
      components.push({ ...component, id, sectionId })
    }
  }
  return { sections, components }
}

type GradeStudentName = { firstName: string; lastName: string; email: string }

export function getGradeStudentDisplayName(student: GradeStudentName) {
  const name = [student.lastName, student.firstName]
    .map(part => (part ?? '').trim())
    .filter(part => part && !['not set', 'unnamed student'].includes(part.toLowerCase()))
    .join(', ')
  return name || student.email.trim()
}

export function compareGradeStudentNames(
  left: GradeStudentName & { studentId: string },
  right: GradeStudentName & { studentId: string },
) {
  return getGradeStudentDisplayName(left).localeCompare(getGradeStudentDisplayName(right), undefined, { sensitivity: 'base' })
    || left.studentId.localeCompare(right.studentId)
}
