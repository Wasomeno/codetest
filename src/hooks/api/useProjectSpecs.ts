import { useQuery } from '@tanstack/react-query'
import { getSpecsTree } from '~/api/specs'
import { listAppProjects } from '~/api/project'
import type { AppProject } from '~/types/project'
import type { FileTreeNode } from '~/api/specs'

export interface LiveSpec {
  id: string
  projectId: string
  projectName: string
  path: string
  name: string
  /** Best-available date: file last commit, else project updated. */
  updatedAt: string
  description: string
  source: string
  authorName?: string
  authorInitials?: string
  matchPreview?: string
}

function isSpecFile(node: FileTreeNode) {
  return node.type === 'blob' && /\.(md|feature|gherkin)$/i.test(node.path)
}

function flatten(nodes: FileTreeNode[]): FileTreeNode[] {
  return nodes.flatMap((node) => [node, ...(node.children ? flatten(node.children) : [])])
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function liveSpecFromNode(project: AppProject, node: FileTreeNode): LiveSpec {
  const id = `${project.id}|${node.path}`
  const name = node.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
  const authorName = node.lastCommit?.authorName?.trim() || undefined
  return {
    id,
    projectId: project.id,
    projectName: project.name,
    path: node.path,
    name: name.replace(/\b\w/g, (letter) => letter.toUpperCase()),
    updatedAt:
      node.lastCommit?.committedDate || project.updatedAt || project.createdAt,
    description: node.path,
    source: authorName ? 'Git commit' : 'Repository',
    authorName,
    authorInitials: authorName ? initialsFrom(authorName) : 'R',
  }
}

function toLiveSpecs(project: AppProject, tree: FileTreeNode[]): LiveSpec[] {
  return flatten(tree)
    .filter(isSpecFile)
    .map((node) => liveSpecFromNode(project, node))
}

export function decodeSpecId(id: string) {
  const separator = id.indexOf('|')
  if (separator < 1) return null
  return { projectId: id.slice(0, separator), path: id.slice(separator + 1) }
}

export function useProjectSpecs(projectId?: string) {
  return useQuery<LiveSpec[]>({
    queryKey: ['live-specs', projectId ?? 'all'],
    queryFn: async () => {
      const projectsResponse = await listAppProjects()
      if (!projectsResponse.success || !projectsResponse.data) {
        throw new Error(projectsResponse.error || 'Failed to load projects')
      }

      const projects = projectsResponse.data.projects.filter(
        (project) => !projectId || project.id === projectId,
      )
      const results = await Promise.all(
        projects.map(async (project) => {
          const response = await getSpecsTree(project.id, '', undefined, true, true)
          if (!response.success || !response.data) {
            throw new Error(response.error || `Failed to load specs for ${project.name}`)
          }
          return toLiveSpecs(project, response.data.tree ?? [])
        }),
      )
      return results.flat()
    },
  })
}
