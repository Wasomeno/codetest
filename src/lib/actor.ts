import type { UserBasic } from '~/api/user'

export interface ActorDisplay {
  label: string
  initials: string
}

export interface ActorDirectoryEntry {
  id: number
  name?: string
  username?: string
}

/**
 * Resolve an activity actor id against the signed-in user and an optional
 * members directory (issue-repo GitLab members). Backend activity only
 * stores numeric GitLab user ids.
 */
export function formatActor(
  actorId: number | string | undefined | null,
  currentUser?: Pick<UserBasic, 'id' | 'name' | 'username'> | null,
  directory?: ReadonlyArray<ActorDirectoryEntry> | null,
): ActorDisplay {
  if (actorId == null || actorId === '') {
    return { label: 'Someone', initials: '?' }
  }

  const idNum = typeof actorId === 'string' ? Number(actorId) : actorId
  const meId =
    currentUser?.id == null
      ? null
      : typeof currentUser.id === 'string'
        ? Number(currentUser.id)
        : currentUser.id

  if (meId != null && !Number.isNaN(meId) && meId === idNum) {
    const name = currentUser?.name || currentUser?.username || 'You'
    return {
      label: name === currentUser?.username ? 'You' : name,
      initials: initialsFrom(name),
    }
  }

  if (directory && directory.length > 0 && !Number.isNaN(idNum)) {
    const member = directory.find((m) => m.id === idNum)
    if (member) {
      const name = member.name?.trim() || member.username?.trim()
      if (name) {
        return { label: name, initials: initialsFrom(name) }
      }
      if (member.username) {
        return {
          label: `@${member.username}`,
          initials: initialsFrom(member.username),
        }
      }
    }
  }

  return {
    label: `User #${actorId}`,
    initials: '#',
  }
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
