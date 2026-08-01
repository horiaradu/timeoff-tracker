'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import SignaturePad from 'signature_pad'

const WIDTH = 600
const HEIGHT = 200

/** Ink is anything more than barely transparent. */
const INK = 8
const MARGIN = 6

/**
 * Cuts the empty space away from the drawing, so a small signature and a large
 * one end up the same size on the request instead of floating in a 600x200 box.
 */
function trimToInk(canvas: HTMLCanvasElement): string {
  const context = canvas.getContext('2d')
  if (!context) return ''

  const { width, height } = canvas
  const { data } = context.getImageData(0, 0, width, height)

  let left = width
  let right = -1
  let top = height
  let bottom = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] <= INK) continue
      if (x < left) left = x
      if (x > right) right = x
      if (y < top) top = y
      if (y > bottom) bottom = y
    }
  }

  if (right < left || bottom < top) return ''

  left = Math.max(0, left - MARGIN)
  top = Math.max(0, top - MARGIN)
  right = Math.min(width - 1, right + MARGIN)
  bottom = Math.min(height - 1, bottom + MARGIN)

  const cropped = document.createElement('canvas')
  cropped.width = right - left + 1
  cropped.height = bottom - top + 1
  cropped
    .getContext('2d')
    ?.drawImage(
      canvas,
      left,
      top,
      cropped.width,
      cropped.height,
      0,
      0,
      cropped.width,
      cropped.height
    )

  return cropped.toDataURL('image/png')
}

/**
 * Draws the signature that gets stamped on the request. Submits a PNG data URL
 * through a hidden field; an untouched pad submits nothing so the stored
 * signature survives an edit of the other details.
 */
export function SignatureField({ existing }: { existing: string | null }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const pad = useRef<SignaturePad | null>(null)
  const [drawing, setDrawing] = useState('')

  useEffect(() => {
    const element = canvas.current
    if (!element) return

    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    element.width = WIDTH * ratio
    element.height = HEIGHT * ratio
    element.getContext('2d')?.scale(ratio, ratio)

    const instance = new SignaturePad(element, { penColor: '#111111', minWidth: 0.8, maxWidth: 2 })
    instance.addEventListener('endStroke', () => setDrawing(trimToInk(element)))
    pad.current = instance

    return () => instance.off()
  }, [])

  const clear = () => {
    pad.current?.clear()
    setDrawing('')
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium">Signature</span>

      {existing && !drawing && (
        <div className="flex items-center gap-3">
          <Image
            src={existing}
            alt="Your saved signature"
            width={180}
            height={60}
            unoptimized
            className="border-line rounded border bg-white p-1"
          />
          <span className="text-muted text-xs">
            Saved. Draw below only if you want to replace it.
          </span>
        </div>
      )}

      <canvas
        ref={canvas}
        style={{ width: WIDTH, height: HEIGHT }}
        className="border-line w-full max-w-full touch-none rounded-lg border border-dashed bg-white"
      />
      <input type="hidden" name="signaturePng" value={drawing} />

      <div className="flex items-center gap-3 text-xs">
        <button type="button" onClick={clear} className="text-muted underline underline-offset-4">
          Clear
        </button>
        <span className="text-muted">
          {drawing ? 'New signature ready to save.' : 'Draw with your mouse, trackpad or finger.'}
        </span>
      </div>
    </div>
  )
}
