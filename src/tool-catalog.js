const CATEGORIES = {
  Downloader: ['socialdownloader'],
  Maker: ['qr', 'photohd', 'mp4mp3', 'pdftoolkit', 'imageprivacy', 'ocr', 'color', 'markdown'],
  Tools: ['weather', 'currency', 'ip', 'dns', 'ssl', 'breach', 'lyricssearch', 'domainsecurity', 'json', 'apiworkbench', 'base64', 'url', 'hash', 'uuid', 'regex', 'html', 'text', 'words', 'timestamp', 'unit', 'percentage', 'jwt', 'urlscan'],
}

export function categoryFor(tool) {
  for (const [category, ids] of Object.entries(CATEGORIES)) {
    if (ids.includes(tool.id)) return category
  }
  if (tool.category === 'Downloader') return 'Downloader'
  if (tool.category === 'Image & Design' || tool.category === 'Maker') return 'Maker'
  return 'Tools'
}

export function filterAndSortTools(tools, { category = 'All', query = '', favorites = [], onlyFavorites = false, onlyRecent = false, recent = [], sort = 'default' } = {}) {
  const needle = query.trim().toLocaleLowerCase()
  const favoriteSet = new Set(favorites)
  const recentOrder = new Map(recent.map((id, index) => [id, index]))
  const filtered = tools.filter(tool =>
    (category === 'All' || categoryFor(tool) === category) &&
    (!onlyFavorites || favoriteSet.has(tool.id)) &&
    (!onlyRecent || recentOrder.has(tool.id)) &&
    (!needle || `${tool.name} ${tool.desc} ${tool.category} ${tool.tag || ''}`.toLocaleLowerCase().includes(needle)),
  )

  if (sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name, 'id'))
  else if (sort === 'favorites') filtered.sort((a, b) => Number(favoriteSet.has(b.id)) - Number(favoriteSet.has(a.id)) || a.name.localeCompare(b.name, 'id'))
  else if (sort === 'recent') filtered.sort((a, b) => (recentOrder.get(a.id) ?? Infinity) - (recentOrder.get(b.id) ?? Infinity) || a.name.localeCompare(b.name, 'id'))
  else if (sort === 'popular') filtered.sort((a, b) => Number(Boolean(b.tag === 'Popular')) - Number(Boolean(a.tag === 'Popular')) || a.name.localeCompare(b.name, 'id'))
  return filtered
}

export function pushRecentTool(recent, id, limit = 8) {
  return [id, ...recent.filter(item => item !== id)].slice(0, limit)
}

export function getToolStorage() {
  try {
    return globalThis.localStorage || null
  } catch {
    return null
  }
}

export function readToolIds(storage, key, allowedIds, limit = Infinity) {
  try {
    const parsed = JSON.parse(storage?.getItem(key) || '[]')
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.filter(id => typeof id === 'string' && allowedIds.has(id)))].slice(0, limit)
  } catch {
    return []
  }
}
