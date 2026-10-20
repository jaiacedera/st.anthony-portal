import { useState } from 'react'
import { useSubjectGroups } from '../hooks/useSubjectGroups'
import './subject-groups.css'

type GroupState = ReturnType<typeof useSubjectGroups>
export function ManageGroups({ state, onClose }: { state: GroupState; onClose: () => void }) {
  const [name, setName] = useState('')
  return <div className="subject-modal-backdrop" onClick={onClose}>
    <section className="subject-modal group-management-modal" role="dialog" aria-modal="true" aria-label="Manage Groups" onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape') onClose() }}>
      <div className="subject-modal-header"><h2>Manage Groups</h2><button type="button" className="subject-modal-close" aria-label="Close groups" onClick={onClose}>×</button></div>
      {state.error && <p role="alert">{state.error}</p>}
      {!state.ready && <p>Loading groups…</p>}
      {state.groups.map(group => <form key={`${group.id}:${group.group_name}`} className="subject-group-row" onSubmit={event => {
        event.preventDefault()
        void state.change({ action: 'rename', groupId: group.id, groupName: String(new FormData(event.currentTarget).get('name')) })
      }}>
        <input aria-label={`Group name: ${group.group_name}`} name="name" defaultValue={group.group_name} required maxLength={100} />
        <button className="grades-toolbar-button" disabled={state.busy}>Rename</button>
        <button type="button" className="grades-toolbar-button" disabled={state.busy} onClick={() => void state.change({ action: 'delete', groupId: group.id })}>Delete</button>
      </form>)}
      <form className="subject-group-row" onSubmit={async event => { event.preventDefault(); if (await state.change({ action: 'create', groupName: name })) setName('') }}>
        <input aria-label="New group name" placeholder="Group name" value={name} onChange={event => setName(event.target.value)} required maxLength={100} />
        <button className="grades-toolbar-button" disabled={state.busy || !state.ready}>+ Add Group</button>
      </form>
      <p>Deleting a group moves its students to Unassigned and keeps their enrollment.</p>
      <div className="subject-modal-actions"><button type="button" className="grades-toolbar-button" onClick={onClose}>Done</button></div>
    </section>
  </div>
}

export function GroupFilter({ state, value, onChange }: { state: GroupState; value: string; onChange: (value: string) => void }) {
  return <label className="grades-filter-field"><span>Group</span><select aria-label="Filter by group" value={value} disabled={!state.ready} onChange={event => onChange(event.target.value)}>
    <option value="">All Groups</option>
    {state.groups.map(group => <option key={group.id} value={group.id}>{group.group_name}</option>)}
    <option value="unassigned">Unassigned</option>
  </select>{state.error && <span role="alert">{state.error}</span>}</label>
}
