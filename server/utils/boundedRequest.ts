import type { IncomingMessage } from 'node:http'
import { createError } from 'h3'

export const MAX_REQUEST_BYTES = 32 * 1024 * 1024
const MAX_BUFFERED_BYTES = 64 * 1024 * 1024
let bufferedBytes = 0

/** Bound both declared and chunked bodies before proxying; cap worker memory. */
export function readBoundedRequest(req: IncomingMessage, limit = MAX_REQUEST_BYTES): Promise<{ body: Buffer, release: () => void }> {
  const declared = req.headers['content-length']
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > limit)) {
    return Promise.reject(createError({ statusCode: 413, statusMessage: 'Request exceeds the allowed total size.' }))
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    let released = false
    const release = () => {
      if (!released) { bufferedBytes -= size; released = true }
    }
    const cleanup = () => {
      clearTimeout(timer)
      req.off('data', data).off('end', end).off('error', fail).off('aborted', aborted)
    }
    const fail = (error: Error) => {
      req.pause(); cleanup(); release()
      // A disconnected HTTP request may emit error after aborted.
      req.once('error', () => {})
      reject(error)
    }
    const aborted = () => fail(createError({ statusCode: 400, statusMessage: 'Request was interrupted.' }))
    const data = (chunk: Buffer) => {
      if (size + chunk.length > limit) return fail(createError({ statusCode: 413, statusMessage: 'Request exceeds the allowed total size.' }))
      if (bufferedBytes + chunk.length > MAX_BUFFERED_BYTES) return fail(createError({ statusCode: 429, statusMessage: 'Upload capacity is busy. Please retry shortly.' }))
      size += chunk.length
      bufferedBytes += chunk.length
      chunks.push(chunk)
    }
    const end = () => { cleanup(); resolve({ body: Buffer.concat(chunks, size), release }) }
    const timer = setTimeout(() => fail(createError({ statusCode: 408, statusMessage: 'Request body timed out.' })), 120_000)
    req.on('data', data).once('end', end).once('error', fail).once('aborted', aborted)
  })
}
