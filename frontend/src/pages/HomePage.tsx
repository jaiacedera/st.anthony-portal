import heroImage from '../assets/hero.png'
import { ArchitectureCard } from '../components/ArchitectureCard'
import { StatusPanel } from '../components/StatusPanel'
import { StructureMap } from '../components/StructureMap'
import { useAppShell } from '../hooks/useAppShell'

export function HomePage() {
  const { appName, architecture, folders } = useAppShell()

  return (
    <main className="app-shell">
      <section className="hero-shell">
        <div className="hero-copy">
          <span className="eyebrow">Full stack system structure</span>
          <h1>{appName}</h1>
          <p>
            The repo is now organized into dedicated frontend, backend, and
            database layers so the project scales cleanly instead of mixing app
            code, server code, and schema files in one place.
          </p>
          <div className="hero-actions">
            <a href="#structure">Review structure</a>
            <a href="#status">Check API wiring</a>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="hero-orbit hero-orbit--frontend">
            <span></span>
            <span>Frontend</span>
          </div>
          <div className="hero-orbit hero-orbit--backend">
            <span></span>
            <span>Backend</span>
          </div>
          <div className="hero-orbit hero-orbit--database">
            <span></span>
            <span>Database</span>
          </div>
          <img src={heroImage} alt="" />
        </div>
      </section>

      <section className="modules-grid" id="structure">
        {architecture.map((section) => (
          <ArchitectureCard key={section.title} section={section} />
        ))}
      </section>

      <section className="structure-grid" id="status">
        <div className="workspace-panel">
          <StructureMap folders={folders} />
        </div>
        <StatusPanel />
      </section>
    </main>
  )
}
