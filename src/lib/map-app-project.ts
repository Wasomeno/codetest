import type { AppProject } from '~/types/project';

/**
 * Maps a backend `AppProject` to the lightweight shape the codetest
 * sidebar needs for rendering project rows.
 *
 * The sidebar only needs an id, a label, and a color. We pull the
 * label from `name` and derive a stable color from the project id
 * so the color doesn't change between renders.
 */
export interface SidebarProject {
  id: string;
  label: string;
  color: string;
}

const SIDEBAR_PALETTE = [
  'oklch(70% 0.14 255)',
  'oklch(70% 0.14 150)',
  'oklch(70% 0.14 25)',
  'oklch(70% 0.14 75)',
  'oklch(70% 0.14 320)',
  'oklch(70% 0.14 200)',
  'oklch(70% 0.14 60)',
  'oklch(70% 0.14 100)',
];

/** djb2-style string hash → 32-bit unsigned int. Stable across runs. */
function hashString(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function colorForName(name: string): string {
  return SIDEBAR_PALETTE[hashString(name) % SIDEBAR_PALETTE.length];
}

export function toSidebarProject(p: AppProject): SidebarProject {
  return {
    id: p.id,
    label: p.name,
    color: colorForName(p.name),
  };
}

export function toSidebarProjects(projects: AppProject[]): SidebarProject[] {
  return projects.map(toSidebarProject);
}
