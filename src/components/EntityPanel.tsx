import { useState, useCallback } from 'react'
import type { OCRResult } from '../types'
import { mergeEntities, hasEntities } from '../services/entityExtractor'

interface EntityPanelProps {
  results: OCRResult[]
}

type EntityTab = 'emails' | 'dates' | 'phones' | 'numbers' | 'properNouns'

const TAB_LABELS: Record<EntityTab, string> = {
  emails: 'Emails',
  dates: 'Dates',
  phones: 'Phones',
  numbers: 'Numbers',
  properNouns: 'Names',
}

interface EntityWithSlides {
  value: string
  context?: string
  slides: number[]
}

function getEntitiesWithSlides(
  results: OCRResult[],
  tab: EntityTab
): EntityWithSlides[] {
  const entityMap = new Map<string, { context?: string; slides: Set<number> }>()

  for (const result of results) {
    const entities = result.entities
    let items: Array<{ value: string; context?: string }> = []

    switch (tab) {
      case 'emails':
        items = entities.emails.map(e => ({ value: e }))
        break
      case 'dates':
        items = entities.dates.map(d => ({ value: d.value }))
        break
      case 'phones':
        items = entities.phones.map(p => ({ value: p }))
        break
      case 'numbers':
        items = entities.numbers.map(n => ({ value: n.value, context: n.context }))
        break
      case 'properNouns':
        items = entities.properNouns.map(n => ({ value: n }))
        break
    }

    for (const item of items) {
      const key = item.value.toLowerCase()
      if (!entityMap.has(key)) {
        entityMap.set(key, { context: item.context, slides: new Set() })
      }
      entityMap.get(key)!.slides.add(result.slideNumber)
    }
  }

  return Array.from(entityMap.entries()).map(([key, data]) => ({
    value: key,
    context: data.context,
    slides: Array.from(data.slides).sort((a, b) => a - b),
  }))
}

export function EntityPanel({ results }: EntityPanelProps) {
  const [activeTab, setActiveTab] = useState<EntityTab>('emails')
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  const allEntities = mergeEntities(results.map(r => r.entities))
  const entitiesWithSlides = getEntitiesWithSlides(results, activeTab)

  const handleCopy = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedValue(value)
      setTimeout(() => setCopiedValue(null), 1500)
    } catch {
      // Clipboard API not available
    }
  }, [])

  if (!hasEntities(allEntities)) {
    return null
  }

  const counts: Record<EntityTab, number> = {
    emails: allEntities.emails.length,
    dates: allEntities.dates.length,
    phones: allEntities.phones.length,
    numbers: allEntities.numbers.length,
    properNouns: allEntities.properNouns.length,
  }

  return (
    <div className="entity-panel">
      <h3>Extracted Entities</h3>
      <div className="entity-tabs">
        {(Object.keys(TAB_LABELS) as EntityTab[]).map(tab => (
          <button
            key={tab}
            className={`entity-tab ${activeTab === tab ? 'active' : ''} ${counts[tab] === 0 ? 'empty' : ''}`}
            onClick={() => setActiveTab(tab)}
            disabled={counts[tab] === 0}
          >
            {TAB_LABELS[tab]}
            {counts[tab] > 0 && <span className="entity-count">{counts[tab]}</span>}
          </button>
        ))}
      </div>
      <div className="entity-list">
        {entitiesWithSlides.length === 0 ? (
          <div className="entity-empty">No {TAB_LABELS[activeTab].toLowerCase()} found</div>
        ) : (
          entitiesWithSlides.map((entity, i) => (
            <button
              key={i}
              className={`entity-item ${copiedValue === entity.value ? 'copied' : ''}`}
              onClick={() => handleCopy(entity.value)}
              title="Click to copy"
            >
              <span className="entity-value">
                {entity.value}
                {entity.context && <span className="entity-context">({entity.context})</span>}
              </span>
              <span className="entity-slides">
                {entity.slides.map(s => `S${s}`).join(', ')}
              </span>
              {copiedValue === entity.value && (
                <span className="entity-copied-badge">Copied!</span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
