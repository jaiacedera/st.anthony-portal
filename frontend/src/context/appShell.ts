import { createContext } from 'react'
import {
  architectureSections,
  folderSummaries,
  type ArchitectureSection,
  type FolderSummary,
} from '../utils/siteContent'

export type AppShellContextValue = {
  appName: string
  architecture: ArchitectureSection[]
  folders: FolderSummary[]
}

export const appShellValue: AppShellContextValue = {
  appName: 'St. Anthony Portal',
  architecture: architectureSections,
  folders: folderSummaries,
}

export const AppShellContext = createContext<AppShellContextValue | null>(null)
