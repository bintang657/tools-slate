const audioFiles = import.meta.glob('./music/albums/**/*.{mp3,m4a,ogg,wav,aac}', {
  eager: true,
  query: '?url',
  import: 'default',
})

const imageFiles = import.meta.glob('./music/albums/**/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
})

function displayName(filename) {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/^\d{1,3}[\s._-]+/, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const musicAlbums = Object.values(
  Object.entries(audioFiles).reduce((albums, [path, src]) => {
    const segments = path.split('/')
    const albumsIndex = segments.indexOf('albums')
    const album = segments[albumsIndex + 1]
    const filename = segments.at(-1)
    if (!album || !filename) return albums
    const track = {
      id: path,
      title: displayName(filename),
      artist: 'Tools Slate',
      album,
      src,
    }
    albums[album] ||= { name: album, tracks: [] }
    albums[album].tracks.push(track)
    return albums
  }, {})
).map(album => {
  const cover = Object.entries(imageFiles).find(([path]) => {
    const segments = path.split('/')
    const albumsIndex = segments.indexOf('albums')
    return segments[albumsIndex + 1] === album.name && /^cover\.(png|jpe?g|webp|avif)$/i.test(segments.at(-1))
  })?.[1]
  return {
    ...album,
    cover,
    tracks: album.tracks.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })),
  }
}).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
