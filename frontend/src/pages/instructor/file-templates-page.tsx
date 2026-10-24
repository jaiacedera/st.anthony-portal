import { useState } from 'react'
import { InstructorShell } from '../../components/instructor-shell'
import './file-templates-page.css'

const templates = [
  ['Grade Entry Template', 'Excel template for entering student grades.'],
  ['Add Student Template', 'Import students using Email, Subject, Group, and Section.'],
]

export default function FileTemplatesPage() {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  function download(name: string) {
    setOpenMenu(null)
    const link = document.createElement('a')
    link.href = import.meta.env.BASE_URL + 'templates/' + encodeURIComponent(name + '.xlsx')
    link.download = name + '.xlsx'
    link.click()
  }
  return <InstructorShell active="file-templates">
    <section className="grades-page file-templates-page">
      <header className="grades-page-heading"><h1>File Templates</h1></header>
      <p className="file-templates-description">Download Excel templates for grades and student enrollment.</p>
      <div className="file-templates-grid">
        {templates.map(([name, description], index) => <article className="instructor-panel file-template-card" key={name}>
          <button className="file-template-download" onClick={() => download(name)} aria-label={`Download ${name}`}>
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
            <button className="file-template-more" aria-label={`Actions for ${name}`} aria-expanded={openMenu === name} aria-controls={`template-actions-${index}`} onClick={() => setOpenMenu(current => current === name ? null : name)}>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
            </button>
            {openMenu === name && <div className="file-template-actions" id={`template-actions-${index}`}><button onClick={() => download(name)}>Download</button></div>}
          </div>
        </article>)}
      </div>
    </section>
  </InstructorShell>
}
