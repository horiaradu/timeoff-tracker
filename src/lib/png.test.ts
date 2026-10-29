import { describe, expect, it } from 'vitest'
import { PNG_DATA_URL_PREFIX, pngSize } from './png'

/** A PNG header declaring the given size; the pixel data never matters here. */
function pngHeader(width: number, height: number): string {
  const bytes = Buffer.alloc(33)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes, 0)
  bytes.writeUInt32BE(13, 8)
  bytes.write('IHDR', 12, 'ascii')
  bytes.writeUInt32BE(width, 16)
  bytes.writeUInt32BE(height, 20)
  return PNG_DATA_URL_PREFIX + bytes.toString('base64')
}

describe('pngSize', () => {
  it('reads the declared width and height', () => {
    expect(pngSize(pngHeader(1200, 400))).toEqual({ width: 1200, height: 400 })
  })

  it('reads sizes far larger than the data itself', () => {
    expect(pngSize(pngHeader(100_000, 100_000))).toEqual({ width: 100_000, height: 100_000 })
  })

  it('rejects data that is not a PNG', () => {
    expect(
      pngSize(PNG_DATA_URL_PREFIX + Buffer.from('not a png at all, really').toString('base64'))
    ).toBeNull()
    expect(pngSize('data:image/jpeg;base64,AAAA')).toBeNull()
    expect(pngSize(PNG_DATA_URL_PREFIX)).toBeNull()
  })
})
