import { useEffect } from 'react'
import { useBirdStore } from '../store'

export function useGeolocation() {
  const setLocation = useBirdStore((s) => s.setLocation)
  const location = useBirdStore((s) => s.location)

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [setLocation])

  return location
}
