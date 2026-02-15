> **NOTE:** Project key not specified. Replace `[PROJECT]` with actual Jira project key before import.

---

# V2 Screenshare Transcription - Jira Import Summary

## Epic

**[PROJECT]-XXX: V2: Enhance Transcript Usability for Imperfect OCR**

Improve user trust, comprehension, and actionability of client-side OCR transcripts. Focus is on UX enhancements, not OCR accuracy improvements.

---

## Stories

### 1. Confidence-Weighted Transcript Display
| Field | Value |
|-------|-------|
| Type | Story |
| Priority | P1 |
| Points | 5 |
| Labels | `ui`, `confidence` |

**Summary:** Visual confidence weighting using Tesseract scores. Opacity scaling, filter slider, histogram.

**Key Acceptance Criteria:**
- Low-confidence text has reduced opacity
- Filter slider hides captures below threshold
- Confidence histogram in summary view

---

### 2. Temporal Grouping by Time/Slide
| Field | Value |
|-------|-------|
| Type | Story |
| Priority | P1 |
| Points | 5 |
| Labels | `ui`, `navigation`, `timeline` |

**Summary:** Group captures by slide with collapsible sections and timeline navigation.

**Key Acceptance Criteria:**
- Captures grouped by slideNumber
- Collapsible groups with metadata (count, time range)
- Timeline enables slide-level navigation

---

### 3. Entity Extraction Panel
| Field | Value |
|-------|-------|
| Type | Story |
| Priority | P1 |
| Points | 8 |
| Labels | `extraction`, `entities`, `service` |

**Summary:** Extract and display emails, dates, phones, numbers, proper nouns in dedicated panel.

**Key Acceptance Criteria:**
- Regex-based extraction during OCR pipeline
- Deduplication with slide source tracking
- Tabbed interface with copy-to-clipboard

---

### 4. Semantic Topic Cluster Visualization
| Field | Value |
|-------|-------|
| Type | Story |
| Priority | P2 |
| Points | 3 |
| Labels | `summary`, `clustering`, `visualization` |

**Summary:** Enhanced topic clustering with visual display and slide mapping.

**Key Acceptance Criteria:**
- Keywords grouped into semantic clusters
- Visual chip/card groupings
- Cluster-to-slide mapping visible

---

## Total Estimation

| Priority | Stories | Points |
|----------|---------|--------|
| P1 | 3 | 18 |
| P2 | 1 | 3 |
| **Total** | **4** | **21** |

---

## Scope Summary

### In Scope
- Confidence visual weighting + filtering
- Slide-based grouping + timeline
- Entity extraction (5 types) + panel
- Topic clustering visualization

### Out of Scope
- OCR accuracy improvements
- Multi-language entity patterns
- Export/import
- Settings persistence
- Backend integration

---

## Technical Constraints

- **Client-side only** - No backend, privacy-first
- **No new dependencies** - Uses existing stack
- **TypeScript strict** - Maintain type safety
- **Minimal UI additions** - Enhance existing panels

---

## Files Changed

| Feature | New Files | Modified Files |
|---------|-----------|----------------|
| Confidence Display | - | `OCRResultItem.tsx`, `OCRPanel.tsx`, `SummaryView.tsx`, `App.css` |
| Temporal Grouping | `SlideGroup.tsx`, `SlideTimeline.tsx` | `types/index.ts`, `OCRResultList.tsx` |
| Entity Extraction | `entityExtractor.ts`, `EntityPanel.tsx` | `types/index.ts`, `useOCR.ts` |
| Topic Clusters | `TopicClusterView.tsx` | `textInference.ts`, `SummaryView.tsx` |
