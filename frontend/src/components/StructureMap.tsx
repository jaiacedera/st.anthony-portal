import type { FolderSummary } from '../utils/siteContent'

export function StructureMap({ folders }: { folders: FolderSummary[] }) {
  return (
    <div className="structure-map">
      <span className="panel-label">Directory map</span>
      <div className="panel-heading">
        <h2>Project folders now match the full-stack layout</h2>
      </div>
      <ul>
        {folders.map((folder) => (
          <li key={folder.path}>
            <code>{folder.path}</code>
            <p>{folder.description}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
