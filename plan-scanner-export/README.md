# Plan Scanner - Key Files for Analysis

These are the 4 key files that power the Plan Scanner feature in Collectif Goat V2.

## File Overview

### 1. `1-planAnalyzer.ts` (1,361 lines)
**Location**: `src/lib/planAnalyzer.ts`

**Purpose**: Core AI analysis logic for single-drawing analysis

**Key Components**:
- `analyzeDrawing()` - Main entry point for AI analysis
- `EXTRACTION_PROMPT` - The prompt sent to Claude/Grok (lines 344-429)
- `tileCanvas()` / `mergeAndDeduplicate()` - Image tiling for high-res plans
- `detectSpaceBoundaries()` - AI boundary detection for room outlines
- `BOUNDARY_DETECTION_PROMPT` - Prompt for visual boundary detection
- `extractWithClaude()` / `extractWithGrok()` - API calls to AI providers

**Key Issues to Review**:
- The EXTRACTION_PROMPT may need improvement for residential floor formats
- Floor detection currently looks for "Level 3", "Floor 2", "L1" but misses "1ST FLOOR PROPOSED FLOOR PLAN"
- SF extraction relies on AI reading text correctly from room tags

---

### 2. `2-useScannerStore.ts` (442 lines)
**Location**: `src/store/useScannerStore.ts`

**Purpose**: Zustand state management for Plan Scanner data

**Key Interfaces**:
- `ExtractedSpace` - Shape of extracted room data (name, sf, confidence, boundingBox, etc.)
- `ScanProject` - Project container with drawings and spaces
- `ScanDrawing` - Individual drawing/page metadata

**Key State**:
- `scans[]` - All scan projects
- `currentScan` - Active scan being worked on
- `extractedSpaces[]` - Extracted rooms from AI

---

### 3. `3-xai.ts` (994 lines)
**Location**: `src/lib/xai.ts`

**Purpose**: Alternative extraction path for multi-page PDFs

**Key Functions**:
- `extractZonesFromPDF()` - Processes entire PDF page-by-page
- `extractZonesFromImage()` - Single image extraction
- `matchZoneTypesWithAI()` - Zone type matching

**Different from planAnalyzer.ts**:
- Uses a simpler EXTRACTION_PROMPT focused on tables and schedules
- No tiling support (always sends full page)
- Returns `ExtractedZone` instead of `ExtractedSpace`

---

### 4. `4-ScanWorkspace.tsx` (2,438 lines)
**Location**: `src/components/plan-scanner/ScanWorkspace.tsx`

**Purpose**: Main UI component for Plan Scanner

**Key Functions**:
- `handleAnalyze()` - Triggers single-page AI analysis (uses planAnalyzer.ts)
- `handleExtractAllPages()` - Triggers multi-page extraction (uses xai.ts)
- `handleAIAutoDetect()` - Boundary detection mode
- Manual drawing tools (rectangle, polygon)

**UI Flow**:
1. Upload PDF/images
2. Choose extraction method (Extract All or page-by-page)
3. Review extracted spaces in Spaces tab
4. Edit, correct, export

---

## Known Issues (As Reported)

### Floor Detection
- AI returns "L1" or "Unknown" instead of recognizing "1ST FLOOR PROPOSED FLOOR PLAN"
- The prompt needs to be updated to recognize residential floor formats:
  - "1ST FLOOR", "2ND FLOOR", "CELLAR"
  - "PROPOSED FLOOR PLAN" headers

### SF Extraction
- AI is estimating SF instead of reading exact values from room tags
- Many spaces show "estimated" confidence when SF should be explicit
- The prompt needs clearer instructions for inline room tag formats:
  ```
  ┌─────────────┐
  │   Kitchen   │
  │   298 SF    │
  └─────────────┘
  ```

### Visual Verification
- Users cannot see which area on the plan corresponds to each extracted space
- Need to add thumbnail crops of detected regions

---

## Suggested Improvements

1. **Update EXTRACTION_PROMPT** in `planAnalyzer.ts`:
   - Add residential floor format patterns
   - Emphasize reading exact SF from text
   - Add explicit inline room tag recognition

2. **Add Bounding Box to AI Output**:
   - Request coordinates for each detected space
   - Use for thumbnail generation

3. **Add Thumbnail UI**:
   - Generate cropped previews from bounding boxes
   - Display in spaces list for visual verification

---

## API Keys Required

- `VITE_ANTHROPIC_API_KEY` - Claude API (primary)
- `VITE_XAI_API_KEY` - Grok API (fallback)
