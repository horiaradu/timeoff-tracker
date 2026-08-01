'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import SignaturePad from 'signature_pad'

const WIDTH = 600
const HEIGHT = 200

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
    instance.addEventListener('endStroke', () => setDrawing(instance.toDataURL('image/png')))
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
            className="rounded border border-black/10 bg-white p-1 dark:border-white/15"
          />
          <span className="text-xs text-black/50 dark:text-white/50">
            Saved. Draw below only if you want to replace it.
          </span>
        </div>
      )}

      <canvas
        ref={canvas}
        style={{ width: WIDTH, height: HEIGHT }}
        className="w-full max-w-full touch-none rounded-lg border border-dashed border-black/25 bg-white dark:border-white/30"
      />
      <input type="hidden" name="signaturePng" value={drawing} />

      <div className="flex items-center gap-3 text-xs">
        <button
          type="button"
          onClick={clear}
          className="text-black/60 underline underline-offset-4 dark:text-white/60"
        >
          Clear
        </button>
        <span className="text-black/50 dark:text-white/50">
          {drawing ? 'New signature ready to save.' : 'Draw with your mouse, trackpad or finger.'}
        </span>
      </div>
    </div>
  )
}
