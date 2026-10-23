import { useState } from 'react'
import { InstructorShell } from '../../components/instructor-shell'
import { createGradeWorkbook, downloadGradeWorkbook, downloadWorkbook, type GradeFileField } from '../../utils/grade-files'
import './file-templates-page.css'

const fields: GradeFileField[] = [
  ...['Quiz 1', 'Quiz 2', 'Long Exam', 'Final Exam'].map(label => ({ id: label, category: 'knowledge' as const, label })),
  ...['FDAR', 'JOURNAL', 'PE', 'Case Study', 'SN/HS', 'Performance'].map(label => ({ id: label, category: 'skills' as const, label })),
  { id: 'attitude', category: 'attitude', label: 'Attitude' },
]
const templates = [
  ['Grade Entry Template', 'Enter raw student scores. Add or remove subgrades beneath their category headers.'],
  ['Grade Import Template', 'Import raw scores using Email or Student Name. No calculated columns are required.'],
  ['Grade Export Reference Template', 'Reference layout with system-calculated totals, final score, rating, and remarks.'],
  ['Student Enrollment Import Template', 'Prepare student names and emails for subject enrollment.'],
]

export default function FileTemplatesPage() {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  async function download(name: string, index: number) {
    if (busy) return
    setOpenMenu(null)
    setBusy(true); setMessage('')
    try {
      const scope = { instructor: '', subject: '', group: '' }
      if (index === 3) {
        const workbook = await createGradeWorkbook([], scope)
        const sheet = workbook.worksheets[0]
        sheet.name = 'Student Enrollment'
        sheet.getCell('A5').value = 'STUDENT ENROLLMENT — Enter one student per row. Copy emails into Create Student and select the subject.'
        sheet.getRow(5).height = 48
        await downloadWorkbook(name, workbook)
      } else {
        await downloadGradeWorkbook(name, fields, scope, [], index === 2 ? ['Knowledge Total', 'Skills Total', 'Attitude Total', 'Final Score', 'Final Rating', 'Remarks'] : [])
      }
    } catch { setMessage('Unable to download the template. Please try again.') }
    finally { setBusy(false) }
  }
  return <InstructorShell active="file-templates">
    <section className="grades-page file-templates-page">
      <header className="grades-page-heading"><h1>File Templates</h1></header>
      <p className="file-templates-description">Download Excel templates for grades and student enrollment.</p>
      {message && <p role="alert" className="dashboard-alert">{message}</p>}
      <div className="file-templates-grid" aria-busy={busy}>
        {templates.map(([name, description], index) => <article className="instructor-panel file-template-card" key={name}>
          <button className="file-template-download" disabled={busy} onClick={() => void download(name, index)} aria-label={`Download ${name}`}>
            <span className="file-template-icon" aria-hidden="true">
              <svg viewBox="0 0 48 56" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                <path d="M10 2h20l12 12v36a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4Z" />
                <path d="M30 2v12h12M15 24h18v18H15zM15 30h18M15 36h18M24 24v18" />
              </svg>
              <span>XLSX</span>
            </span>
            <span className="file-template-name">{name}</span>
            <span className="file-template-type">Excel · .xlsx</span>
            <span className="file-template-description">{description}</span>
          </button>
          <div className="file-template-menu" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpenMenu(null) }} onKeyDown={event => { if (event.key === 'Escape') { setOpenMenu(null); event.currentTarget.querySelector('button')?.focus() } }}>
            <button className="file-template-more" aria-label={`Actions for ${name}`} aria-expanded={openMenu === name} aria-controls={`template-actions-${index}`} disabled={busy} onClick={() => setOpenMenu(current => current === name ? null : name)}>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
            </button>
            {openMenu === name && <div className="file-template-actions" id={`template-actions-${index}`}><button disabled={busy} onClick={() => void download(name, index)}>Download</button></div>}
          </div>
        </article>)}
      </div>
    </section>
  </InstructorShell>
}
