export type ArchitectureSection = {
  title: string
  description: string
  tone: 'frontend' | 'backend' | 'database'
  bullets: string[]
}

export type FolderSummary = {
  name: string
  path: string
  description: string
}

export const architectureSections: ArchitectureSection[] = [
  {
    title: 'Frontend',
    description: 'React + Vite UI code, split into reusable feature folders.',
    tone: 'frontend',
    bullets: [
      'public/ for static assets and icons',
      'src/components and src/pages for UI composition',
      'src/services, src/hooks, src/context, and src/utils for app logic',
    ],
  },
  {
    title: 'Backend',
    description: 'A lightweight Node API starter with clear ownership by layer.',
    tone: 'backend',
    bullets: [
      'routes/ maps incoming requests to controllers',
      'services/ holds business logic and response shaping',
      'config/, middleware/, models/, and utils/ keep server concerns isolated',
    ],
  },
  {
    title: 'Database',
    description: 'SQL schema files are separated from app code for cleaner ownership.',
    tone: 'database',
    bullets: [
      'database/schema.sql holds the starter relational model',
      'module and content tables give the portal a practical base',
      'schema changes can evolve independently from frontend or backend code',
    ],
  },
]

export const folderSummaries: FolderSummary[] = [
  {
    name: 'Frontend source',
    path: 'frontend/src/components',
    description: 'Reusable visual building blocks for the portal.',
  },
  {
    name: 'Feature pages',
    path: 'frontend/src/pages',
    description: 'Page-level screens that compose components and hooks.',
  },
  {
    name: 'Client services',
    path: 'frontend/src/services',
    description: 'API calls and browser-side data access.',
  },
  {
    name: 'Server routes',
    path: 'backend/src/routes',
    description: 'HTTP entry points mapped to controllers.',
  },
  {
    name: 'Server services',
    path: 'backend/src/services',
    description: 'Business rules that power backend responses.',
  },
  {
    name: 'Schema files',
    path: 'database/schema.sql',
    description: 'SQL definitions for persistent portal data.',
  },
]

export const endpointSummaries = [
  'GET /api/health returns system status and discovered modules.',
  'GET /api/modules returns the backend view of the project folders.',
]
