import { useState } from 'react'
import { InstructorShell } from '../../components/instructor-shell'
import { downloadGradeWorkbook, type GradeFileField } from '../../utils/grade-files'

const fields: GradeFileField[] = [
  ...['Quiz 1', 'Quiz 2', 'Long Exam', 'Final Exam'].map(label => ({ id: label, category: 'knowledge' as const, label })),
  ...['FDAR', 'JOURNAL', 'PE', 'Case Study', 'SN/HS', 'Performance'].map(label => ({ id: label, category: 'skills' as const, label })),
  { id: 'attitude', category: 'attitude', label: 'Attitude' },
]
const templates = [
  ['Grade Entry Template', 'Enter raw student scores. Add or remove subgrades beneath their category headers.'],
  ['Grade Import Template', 'Import raw scores using Email or Student Name. No calculated columns are required.'],
  ['Grade Export Reference Template', 'Reference layout with system-calculated totals, final score, rating, and remarks.'],
]

export default function FileTemplatesPage() {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function download(name: string, reference: boolean) {
    setBusy(true); setMessage('')
    try {
      await downloadGradeWorkbook(name, fields, { instructor: '', subject: '', group: '' }, [], reference ? ['Knowledge Total', 'Skills Total', 'Attitude Total', 'Final Score', 'Final Rating', 'Remarks'] : [])
    } catch { setMessage('Unable to download the template. Please try again.') }
    finally { setBusy(false) }
  }
  return <InstructorShell active="file-templates">
    <section className="grades-page">
      <header className="grades-page-heading"><h1>File Templates</h1></header>
      <p>Use the category headers provided. For a sheet matching your current subject and group configuration, use Export to Excel on Grades.</p>
      {message && <p role="alert" className="dashboard-alert">{message}</p>}
      {templates.map(([name, description], index) => <article className="instructor-panel" key={name}>
        <h2>{name}</h2><p>{description}</p><p>Excel (.xlsx)</p>
        <button className="subject-detail-action subject-detail-action--solid" disabled={busy} onClick={() => void download(name, index === 2)}>Download</button>
      </article>)}
    </section>
  </InstructorShell>
}
