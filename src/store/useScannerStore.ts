import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

// Types for extracted data
export interface ExtractedSpace {
  id: string
  name: string
  floor?: string
  sf: number
  zoneType?: string
  fixtures: Record<string, number>
  equipment: Array<{
    type: string
    name: string
    quantity: number
    value?: number
    unit?: string
  }>
  confidence: number // 0-100
  // Bounding box as percentages (0-100) of the image dimensions
  // This ensures regions display correctly regardless of image scaling
  boundingBox?: { 
    xPercent: number
    yPercent: number
    widthPercent: number
    heightPercent: number
  }
  // For polygon shapes - array of vertices as percentages
  polygonPoints?: Array<{ xPercent: number; yPercent: number }>
}

export interface SymbolDefinition {
  id: string
  name: string
  category: 'fixture' | 'equipment' | 'furniture' | 'other'
  fixtureType?: string // Maps to NYC_FIXTURE_DATABASE key
  description?: string
  imageData?: string // Base64 cropped image of the symbol
}

export interface SymbolLegend {
  id: string
  name: string
  projectId?: string
  symbols: SymbolDefinition[]
  uploadedAt: string
}

export interface TrainingExample {
  id: string
  scanId: string
  symbolId?: string
  originalPrediction: string
  correctedValue: string
  imageRegion?: string // Base64 of the region
  createdAt: string
}

export interface ScanProject {
  id: string
  userId: string
  name: string
  status: 'uploading' | 'processing' | 'calibrating' | 'reviewed' | 'exported'
  drawings: ScanDrawing[]
  extractedSpaces: ExtractedSpace[]
  legendId?: string
  scale?: {
    pixelsPerFoot: number
    calibratedBy: 'auto' | 'manual'
    referenceDistance?: number
  }
  createdAt: string
  updatedAt: string
}

export interface ScanDrawing {
  id: string
  fileName: string
  fileType: string
  fileUrl: string // URL or base64
  pageNumber?: number
  width?: number
  height?: number
  analyzedAt?: string
}

interface ScannerState {
  // Current scan being worked on
  currentScan: ScanProject | null
  
  // All scans
  scans: ScanProject[]
  
  // Symbol legends (can be reused across scans)
  legends: SymbolLegend[]
  
  // Training examples for AI improvement
  trainingExamples: TrainingExample[]
  
  // UI state
  selectedSpaceId: string | null
  calibrationMode: boolean
  calibrationPoints: { x: number; y: number }[]
  
  // Actions
  setCurrentScan: (scan: ScanProject | null) => void
  createScan: (userId: string, name: string) => ScanProject
  updateScan: (scanId: string, updates: Partial<ScanProject>) => void
  deleteScan: (scanId: string) => void
  
  addDrawing: (scanId: string, drawing: ScanDrawing) => void
  removeDrawing: (scanId: string, drawingId: string) => void
  
  setExtractedSpaces: (scanId: string, spaces: ExtractedSpace[]) => void
  updateExtractedSpace: (scanId: string, spaceId: string, updates: Partial<ExtractedSpace>) => void
  deleteExtractedSpace: (scanId: string, spaceId: string) => void
  
  addLegend: (legend: SymbolLegend) => void
  updateLegend: (legendId: string, updates: Partial<SymbolLegend>) => void
  deleteLegend: (legendId: string) => void
  
  addTrainingExample: (example: Omit<TrainingExample, 'id' | 'createdAt'>) => void
  
  setCalibrationMode: (mode: boolean) => void
  addCalibrationPoint: (point: { x: number; y: number }) => void
  clearCalibrationPoints: () => void
  setScale: (scanId: string, pixelsPerFoot: number, referenceDistance?: number) => void
  
  setSelectedSpaceId: (id: string | null) => void
}

export const useScannerStore = create<ScannerState>()(
  persist(
    (set, get) => ({
      currentScan: null,
      scans: [],
      legends: [],
      trainingExamples: [],
      selectedSpaceId: null,
      calibrationMode: false,
      calibrationPoints: [],
      
      setCurrentScan: (scan) => set({ currentScan: scan }),
      
      createScan: (userId, name) => {
        const newScan: ScanProject = {
          id: uuidv4(),
          userId,
          name,
          status: 'uploading',
          drawings: [],
          extractedSpaces: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((state) => ({
          scans: [newScan, ...state.scans],
          currentScan: newScan,
        }))
        return newScan
      },
      
      updateScan: (scanId, updates) => {
        set((state) => ({
          scans: state.scans.map((s) =>
            s.id === scanId ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
          ),
          currentScan:
            state.currentScan?.id === scanId
              ? { ...state.currentScan, ...updates, updatedAt: new Date().toISOString() }
              : state.currentScan,
        }))
      },
      
      deleteScan: (scanId) => {
        set((state) => ({
          scans: state.scans.filter((s) => s.id !== scanId),
          currentScan: state.currentScan?.id === scanId ? null : state.currentScan,
        }))
      },
      
      addDrawing: (scanId, drawing) => {
        set((state) => ({
          scans: state.scans.map((s) =>
            s.id === scanId
              ? { ...s, drawings: [...s.drawings, drawing], updatedAt: new Date().toISOString() }
              : s
          ),
          currentScan:
            state.currentScan?.id === scanId
              ? { ...state.currentScan, drawings: [...state.currentScan.drawings, drawing], updatedAt: new Date().toISOString() }
              : state.currentScan,
        }))
      },
      
      removeDrawing: (scanId, drawingId) => {
        set((state) => ({
          scans: state.scans.map((s) =>
            s.id === scanId
              ? { ...s, drawings: s.drawings.filter((d) => d.id !== drawingId), updatedAt: new Date().toISOString() }
              : s
          ),
          currentScan:
            state.currentScan?.id === scanId
              ? { ...state.currentScan, drawings: state.currentScan.drawings.filter((d) => d.id !== drawingId), updatedAt: new Date().toISOString() }
              : state.currentScan,
        }))
      },
      
      setExtractedSpaces: (scanId, spaces) => {
        set((state) => ({
          scans: state.scans.map((s) =>
            s.id === scanId ? { ...s, extractedSpaces: spaces, updatedAt: new Date().toISOString() } : s
          ),
          currentScan:
            state.currentScan?.id === scanId
              ? { ...state.currentScan, extractedSpaces: spaces, updatedAt: new Date().toISOString() }
              : state.currentScan,
        }))
      },
      
      updateExtractedSpace: (scanId, spaceId, updates) => {
        set((state) => ({
          scans: state.scans.map((s) =>
            s.id === scanId
              ? {
                  ...s,
                  extractedSpaces: s.extractedSpaces.map((sp) =>
                    sp.id === spaceId ? { ...sp, ...updates } : sp
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : s
          ),
          currentScan:
            state.currentScan?.id === scanId
              ? {
                  ...state.currentScan,
                  extractedSpaces: state.currentScan.extractedSpaces.map((sp) =>
                    sp.id === spaceId ? { ...sp, ...updates } : sp
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : state.currentScan,
        }))
      },
      
      deleteExtractedSpace: (scanId, spaceId) => {
        set((state) => ({
          scans: state.scans.map((s) =>
            s.id === scanId
              ? {
                  ...s,
                  extractedSpaces: s.extractedSpaces.filter((sp) => sp.id !== spaceId),
                  updatedAt: new Date().toISOString(),
                }
              : s
          ),
          currentScan:
            state.currentScan?.id === scanId
              ? {
                  ...state.currentScan,
                  extractedSpaces: state.currentScan.extractedSpaces.filter((sp) => sp.id !== spaceId),
                  updatedAt: new Date().toISOString(),
                }
              : state.currentScan,
        }))
      },
      
      addLegend: (legend) => {
        set((state) => ({ legends: [legend, ...state.legends] }))
      },
      
      updateLegend: (legendId, updates) => {
        set((state) => ({
          legends: state.legends.map((l) =>
            l.id === legendId ? { ...l, ...updates } : l
          ),
        }))
      },
      
      deleteLegend: (legendId) => {
        set((state) => ({
          legends: state.legends.filter((l) => l.id !== legendId),
        }))
      },
      
      addTrainingExample: (example) => {
        const newExample: TrainingExample = {
          ...example,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          trainingExamples: [newExample, ...state.trainingExamples],
        }))
      },
      
      setCalibrationMode: (mode) => {
        set({ calibrationMode: mode, calibrationPoints: mode ? [] : get().calibrationPoints })
      },
      
      addCalibrationPoint: (point) => {
        const points = get().calibrationPoints
        if (points.length < 2) {
          set({ calibrationPoints: [...points, point] })
        }
      },
      
      clearCalibrationPoints: () => {
        set({ calibrationPoints: [] })
      },
      
      setScale: (scanId, pixelsPerFoot, referenceDistance) => {
        const scale = {
          pixelsPerFoot,
          calibratedBy: 'manual' as const,
          referenceDistance,
        }
        get().updateScan(scanId, { scale })
      },
      
      setSelectedSpaceId: (id) => set({ selectedSpaceId: id }),
    }),
    {
      name: 'scanner-store',
      partialize: (state) => ({
        // Strip out heavy file data from scans before persisting
        // Only persist metadata - drawings are session-only until saved to Supabase
        scans: state.scans.map(scan => ({
          ...scan,
          drawings: scan.drawings.map(d => ({
            id: d.id,
            fileName: d.fileName,
            fileType: d.fileType,
            fileUrl: '', // Don't persist the actual file data
            pageNumber: d.pageNumber,
          })),
        })),
        legends: state.legends.map(legend => ({
          ...legend,
          // Strip any large image data from symbols
          symbols: legend.symbols.map(s => ({
            ...s,
            imageData: undefined,
          })),
        })),
        trainingExamples: state.trainingExamples.slice(0, 100).map(ex => ({
          ...ex,
          imageRegion: undefined, // Don't persist image regions
        })),
      }),
      // Handle storage errors gracefully
      storage: {
        getItem: (name) => {
          try {
            const value = localStorage.getItem(name)
            return value ? JSON.parse(value) : null
          } catch (e) {
            console.warn('Failed to load scanner store from localStorage:', e)
            return null
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value))
          } catch (e) {
            console.warn('Failed to save scanner store to localStorage:', e)
            // Clear and retry once
            try {
              localStorage.removeItem(name)
              localStorage.setItem(name, JSON.stringify(value))
            } catch {
              // Give up - localStorage is full or unavailable
            }
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name)
          } catch {
            // Ignore
          }
        },
      },
    }
  )
)

export default useScannerStore
