export function movePlaceToStart(routePlaces, placeId) {
  const index = routePlaces.findIndex((place) => place.id === placeId)
  if (index <= 0) return routePlaces

  const next = [...routePlaces]
  const [place] = next.splice(index, 1)
  next.unshift(place)
  return next
}

export function movePlaceToEnd(routePlaces, placeId) {
  let index = -1

  for (let i = routePlaces.length - 1; i >= 0; i -= 1) {
    if (routePlaces[i].id === placeId) {
      index = i
      break
    }
  }

  if (index === -1 || index === routePlaces.length - 1) return routePlaces

  const next = [...routePlaces]
  const [place] = next.splice(index, 1)
  next.push(place)
  return next
}

export function pinPlaceAtBothEnds(routePlaces, placeId) {
  const place = routePlaces.find((item) => item.id === placeId)

  if (!place) return routePlaces

  const middlePlaces = routePlaces.filter((item, index) => {
    if (item.id !== placeId) return true
    return index !== 0 && index !== routePlaces.length - 1
  })

  return [place, ...middlePlaces, place]
}
