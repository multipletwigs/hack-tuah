'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

let externalShowToast: ((msg: string) => void) | null = null

export function showToast(msg: string) {
  if (externalShowToast) externalShowToast(msg)
}

export default function Toast() {
  const [state, setState] = useState({ message: '', visible: false })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setState({ message: msg, visible: true })
    timerRef.current = setTimeout(() => setState(s => ({ ...s, visible: false })), 3000)
  }, [])

  useEffect(() => {
    externalShowToast = show
    return () => {
      externalShowToast = null
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [show])

  return (
    <div className={`toast${state.visible ? '' : ' hidden'}`}>
      {state.message}
    </div>
  )
}
