function toEmbed(url: string): string {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtube.com' && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`
    }
    if (host === 'youtu.be') {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`
    }
    if (host === 'vimeo.com') {
      // vimeo.com/{id}              → player.vimeo.com/video/{id}
      // vimeo.com/{id}/{hash}       → player.vimeo.com/video/{id}?h={hash}
      //   (the hash is required for unlisted/private videos, or the player 403s)
      const parts = u.pathname.split('/').filter(Boolean)
      const id = parts[0]
      const hash = parts[1]
      return hash
        ? `https://player.vimeo.com/video/${id}?h=${hash}`
        : `https://player.vimeo.com/video/${id}`
    }
    // Already an embed URL (player.vimeo.com/…, youtube.com/embed/…) — pass through.
    return url
  } catch {
    return url
  }
}

export default function VideoEmbed({ url, title }: { url: string; title?: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-gray-900" style={{ paddingTop: '56.25%' }}>
      <iframe
        src={toEmbed(url)}
        title={title ?? 'Webinar replay'}
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}
