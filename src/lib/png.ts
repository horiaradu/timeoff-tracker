export const PNG_DATA_URL_PREFIX = 'data:image/png;base64,'

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/**
 * The width and height a PNG data URL declares in its header, or null when it
 * isn't a PNG. Reads only the header, so a huge image costs nothing to check.
 */
export function pngSize(dataUrl: string): { width: number; height: number } | null {
  if (!dataUrl.startsWith(PNG_DATA_URL_PREFIX)) return null
  // The signature (8 bytes) and the IHDR chunk up to its height (16 more) fit in 32 base64 chars.
  const header = Buffer.from(
    dataUrl.slice(PNG_DATA_URL_PREFIX.length, PNG_DATA_URL_PREFIX.length + 32),
    'base64'
  )
  if (header.length < 24) return null
  if (!header.subarray(0, 8).equals(PNG_SIGNATURE)) return null
  if (header.toString('ascii', 12, 16) !== 'IHDR') return null
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) }
}
