// =========================================== 
// HYDRONIC TAB
// Project tab wrapper for hydronic calculator
// Lives alongside Pool Calculations in ProjectWorkspace
// =========================================== 

import { HydronicCalculatorCore } from './HydronicCalculatorCore'

interface HydronicTabProps {
  projectId: string
}

export function HydronicTab({ projectId }: HydronicTabProps) {
  return (
    <div className="h-full">
      <HydronicCalculatorCore
        projectId={projectId}
        standalone={false}
      />
    </div>
  )
}
