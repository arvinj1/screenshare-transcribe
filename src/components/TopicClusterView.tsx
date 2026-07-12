import type { SlideSummary } from '../types'

interface TopicClusterViewProps {
  clusters: string[][]
  slides: SlideSummary[]
}

interface ClusterWithSlides {
  keywords: string[]
  slideNumbers: number[]
  prominence: number // 0-1 based on keyword count and slide coverage
}

function getClusterSlides(cluster: string[], slides: SlideSummary[]): number[] {
  const slideSet = new Set<number>()
  for (const keyword of cluster) {
    for (const slide of slides) {
      if (slide.keywords.includes(keyword) || slide.text.toLowerCase().includes(keyword.toLowerCase())) {
        slideSet.add(slide.slideNumber)
      }
    }
  }
  return Array.from(slideSet).sort((a, b) => a - b)
}

export function TopicClusterView({ clusters, slides }: TopicClusterViewProps) {
  if (clusters.length === 0) return null

  const totalKeywords = clusters.reduce((sum, c) => sum + c.length, 0)
  const maxSlides = slides.length

  const clustersWithData: ClusterWithSlides[] = clusters
    .map(cluster => {
      const slideNumbers = getClusterSlides(cluster, slides)
      const prominence = (
        (cluster.length / Math.max(totalKeywords, 1)) * 0.5 +
        (slideNumbers.length / Math.max(maxSlides, 1)) * 0.5
      )
      return { keywords: cluster, slideNumbers, prominence }
    })
    .sort((a, b) => b.prominence - a.prominence)

  return (
    <div className="topic-cluster-view">
      {clustersWithData.map((cluster, i) => {
        const sizeClass = cluster.prominence > 0.3
          ? 'cluster-large'
          : cluster.prominence > 0.15
            ? 'cluster-medium'
            : 'cluster-small'

        return (
          <div key={i} className={`topic-cluster-card ${sizeClass}`}>
            <div className="cluster-keywords">
              {cluster.keywords.map((kw, j) => (
                <span key={j} className="cluster-keyword">{kw}</span>
              ))}
            </div>
            {cluster.slideNumbers.length > 0 && (
              <div className="cluster-slides">
                Slides: {cluster.slideNumbers.join(', ')}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
