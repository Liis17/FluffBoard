const cachePrefix = 'fluffboard.board-cache.v2'

function key(userId) {
  return `${cachePrefix}:${userId}`
}

export function readBoardCache(userId) {
  try {
    const cached = JSON.parse(window.localStorage.getItem(key(userId)) || 'null')
    if (!cached
      || !Array.isArray(cached.issues)
      || !Array.isArray(cached.statuses)
      || !Array.isArray(cached.labels)
      || !Array.isArray(cached.users)
      || !Array.isArray(cached.assignable)) {
      return null
    }
    return cached
  } catch {
    return null
  }
}

export function writeBoardCache(userId, board) {
  try {
    // Временные карточки существуют только до ответа GitHub и не должны переживать перезагрузку.
    window.localStorage.setItem(key(userId), JSON.stringify({
      ...board,
      issues: board.issues.filter((issue) => issue.number > 0),
    }))
  } catch {
    // Приватный режим и переполненное хранилище не должны мешать доске работать.
  }
}

export function clearBoardCache(userId) {
  try {
    window.localStorage.removeItem(key(userId))
  } catch {
    // Logout всегда должен завершаться, даже если localStorage недоступен.
  }
}
