// Sample frames from a video in the browser so the model can see the footage (from InstantCompose).
// ~1 frame per 3 seconds, min 4, max 12; 480px wide JPEGs as data URLs. Client-only.
// Frame count scales with duration (~1 per 3 seconds) so an evolving story is fully read.
export async function extractFrames(file: File): Promise<string[]> {
  return new Promise(resolve => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = URL.createObjectURL(file)
    const frames: string[] = []
    const canvas = document.createElement('canvas')
    const fail = setTimeout(() => resolve(frames), 45000)

    video.onloadedmetadata = () => {
      const duration = video.duration
      if (!duration || !isFinite(duration)) { clearTimeout(fail); resolve(frames); return }
      // ~1 frame per 3s: 30s video → 10 frames; min 4, cap 12 to keep the payload sane
      const count = Math.max(4, Math.min(12, Math.round(duration / 3)))
      const scale = Math.min(1, 480 / (video.videoWidth || 480))
      canvas.width = Math.round((video.videoWidth || 480) * scale)
      canvas.height = Math.round((video.videoHeight || 852) * scale)
      const times = Array.from({ length: count }, (_, i) => duration * (0.05 + (0.9 * i) / Math.max(count - 1, 1)))
      let idx = 0
      const seekNext = () => {
        if (idx >= times.length) { clearTimeout(fail); URL.revokeObjectURL(video.src); resolve(frames); return }
        video.currentTime = times[idx]
      }
      video.onseeked = () => {
        try {
          canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
          frames.push(canvas.toDataURL('image/jpeg', 0.6))
        } catch { /* frame skipped */ }
        idx++
        seekNext()
      }
      seekNext()
    }
    video.onerror = () => { clearTimeout(fail); resolve(frames) }
  })
}
