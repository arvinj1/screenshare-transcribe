# V2 Screenshare Transcription Enhancement - Execution Plan

## Overview

**Project:** Screenshare Transcription Web App V2
**Goal:** Increase user trust, comprehension, and actionability of imperfect client-side OCR transcripts
**Stack:** React + Vite + TypeScript (client-side only, privacy-first)

## Problem Statement

V1 provides functional OCR transcription but users struggle with:
- Assessing transcript reliability (which parts are accurate vs noisy)
- Navigating through content (flat chronological list)
- Extracting actionable information (entities buried in text)
- Understanding semantic structure (raw keywords, not topics)

## V2 Features

### Feature 1: Confidence-Weighted Transcript Display

**Problem:** Users cannot quickly distinguish reliable OCR output from noise.

**Solution:** Visual confidence weighting using existing Tesseract confidence scores (0-100).

**Implementation:**
1. Apply opacity scaling to capture text based on confidence (low confidence = more transparent)
2. Add confidence filter slider in OCR panel to hide captures below threshold
3. Maintain existing color-coded badges (green >=80%, yellow 50-79%, red <50%)
4. Add confidence distribution histogram to session summary

**Files:**
- Modify: `src/components/OCRResultItem.tsx`
- Modify: `src/components/OCRPanel.tsx`
- Modify: `src/components/SummaryView.tsx`
- Modify: `src/App.css`

**Acceptance Criteria:**
- [ ] Low-confidence text visually de-emphasized (reduced opacity)
- [ ] Confidence filter slider filters captures in real-time
- [ ] Histogram shows confidence distribution across session
- [ ] Filter state persists within session

---

### Feature 2: Temporal Grouping by Time/Slide

**Problem:** Flat chronological list makes navigation difficult for multi-slide sessions.

**Solution:** Group captures by detected slide with collapsible sections and timeline.

**Implementation:**
1. Create SlideGroup component wrapping captures per slide
2. Show slide metadata: capture count, time range, average confidence
3. Collapsible sections defaulting to expanded
4. Horizontal slide timeline with confidence heatmap

**Files:**
- Modify: `src/types/index.ts` (add SlideGroup type)
- Modify: `src/components/OCRResultList.tsx` (group by slide)
- Create: `src/components/SlideGroup.tsx`
- Create: `src/components/SlideTimeline.tsx`

**Acceptance Criteria:**
- [ ] Captures grouped by slideNumber with clear visual separation
- [ ] Each group shows slide number, capture count, time range
- [ ] Groups are collapsible/expandable
- [ ] Timeline provides slide-level navigation

---

### Feature 3: Entity Extraction Panel

**Problem:** Actionable entities (emails, dates, phone numbers) are buried in noisy OCR text.

**Solution:** Dedicated panel extracting and displaying structured entities.

**Implementation:**
1. Create entityExtractor.ts service with regex patterns:
   - Emails: standard email format
   - Dates: ISO, US (MM/DD/YYYY), EU (DD/MM/YYYY), relative
   - Phone numbers: international and US formats
   - Numbers: prices ($), percentages (%), dimensions
   - Proper nouns: capitalized multi-word sequences
2. Extract entities during OCR processing
3. Display in tabbed panel with type filters
4. Show source slide reference, enable one-click copy

**Files:**
- Create: `src/services/entityExtractor.ts`
- Modify: `src/types/index.ts` (add ExtractedEntities type)
- Modify: `src/hooks/useOCR.ts` (call entity extraction)
- Create: `src/components/EntityPanel.tsx`

**Acceptance Criteria:**
- [ ] Emails, dates, phones, numbers, proper nouns extracted
- [ ] Entities deduplicated across captures
- [ ] Each entity shows source slide reference
- [ ] One-click copy to clipboard works
- [ ] Tabbed interface for filtering by type

---

### Feature 4: Semantic Summaries (Topic Clusters)

**Problem:** Current summary shows flat keyword list without semantic grouping.

**Solution:** Enhanced topic clustering with visual representation.

**Implementation:**
1. Improve clusterTopics algorithm for better semantic grouping
2. Create visual topic cluster display (grouped chips/cards)
3. Add keyword-to-slide mapping
4. Show topic frequency distribution across slides

**Files:**
- Modify: `src/services/textInference.ts` (improve clusterTopics)
- Modify: `src/components/SummaryView.tsx`
- Create: `src/components/TopicClusterView.tsx`

**Acceptance Criteria:**
- [ ] Keywords grouped into semantic clusters
- [ ] Visual cluster display with clear groupings
- [ ] Each cluster shows associated slides
- [ ] Topic prominence indicated by size/color

---

## Technical Constraints

| Constraint | Rationale |
|------------|-----------|
| Client-side only | Privacy-first, no data leaves browser |
| No external APIs | Offline capability, no network dependency |
| Minimal UI additions | Enhance existing panels, not new pages |
| TypeScript strict | Maintain type safety |

## Architecture Notes

- **State Management:** React hooks + props drilling (no external state library)
- **Existing Infrastructure:**
  - Tesseract.js OCR with confidence scores
  - Slide detection via text similarity
  - Text cleaning and inference services
  - Dark-themed responsive UI

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Entity regex false positives | Conservative patterns, validate format |
| Performance with many captures | Memoization, virtualized lists if needed |
| Topic clustering quality | Fallback to flat keywords if clusters poor |

## Out of Scope

- OCR accuracy improvements (not V2 goal)
- Multi-language entity patterns (English-focused)
- Export/import functionality
- Settings persistence across sessions
- Backend integration

## Dependencies

No new npm dependencies required. All features use existing browser APIs and current libraries.
