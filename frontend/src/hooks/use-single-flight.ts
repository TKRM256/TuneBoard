import * as React from "react"

export function useSingleFlight() {
  const inFlightRef = React.useRef<Promise<unknown> | null>(null)
  const [isRunning, setIsRunning] = React.useState(false)

  const run = React.useCallback(<T,>(action: () => Promise<T> | T): Promise<T> => {
    const inFlight = inFlightRef.current
    if (inFlight) {
      return inFlight as Promise<T>
    }

    setIsRunning(true)

    const wrappedPromise = Promise.resolve()
      .then(action)
      .finally(() => {
        if (inFlightRef.current === wrappedPromise) {
          inFlightRef.current = null
          setIsRunning(false)
        }
      })

    inFlightRef.current = wrappedPromise

    return wrappedPromise
  }, [])

  return { isRunning, run }
}

export function useKeyedSingleFlight<Key extends string | number>() {
  const inFlightRef = React.useRef(new Map<Key, Promise<unknown>>())
  const [runningKeys, setRunningKeys] = React.useState<Key[]>([])

  const run = React.useCallback(<T,>(key: Key, action: () => Promise<T> | T): Promise<T> => {
    const inFlight = inFlightRef.current.get(key)
    if (inFlight) {
      return inFlight as Promise<T>
    }

    setRunningKeys((prev) => (prev.includes(key) ? prev : [...prev, key]))

    const wrappedPromise = Promise.resolve()
      .then(action)
      .finally(() => {
        if (inFlightRef.current.get(key) === wrappedPromise) {
          inFlightRef.current.delete(key)
          setRunningKeys((prev) => prev.filter((entry) => entry !== key))
        }
      })

    inFlightRef.current.set(key, wrappedPromise)

    return wrappedPromise
  }, [])

  const isRunning = React.useCallback(
    (key: Key) => runningKeys.includes(key),
    [runningKeys],
  )

  return { isRunning, run, runningKeys }
}