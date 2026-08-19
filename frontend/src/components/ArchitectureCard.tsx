import type { ArchitectureSection } from '../utils/siteContent'

export function ArchitectureCard({
  section,
}: {
  section: ArchitectureSection
}) {
  return (
    <article className={`module-card module-card--${section.tone}`}>
      <span className="panel-label">{section.tone}</span>
      <h2>{section.title}</h2>
      <p>{section.description}</p>
      <ul>
        {section.bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  )
}
