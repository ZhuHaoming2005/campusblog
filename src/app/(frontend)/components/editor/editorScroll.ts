export type OutlineScrollMetrics = {
  containerTop: number
  currentScrollTop: number
  headingTop: number
  offset?: number
  toolbarHeight?: number
}

export function getOutlineScrollTop({
  containerTop,
  currentScrollTop,
  headingTop,
  offset = 12,
  toolbarHeight = 0,
}: OutlineScrollMetrics): number {
  return Math.max(0, currentScrollTop + headingTop - containerTop - toolbarHeight - offset)
}
