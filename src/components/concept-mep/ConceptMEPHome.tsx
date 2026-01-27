// This is a wrapper that imports the existing ProjectsGrid
// We're keeping it in the same location for now to avoid breaking changes
// The actual component lives at ../projects/ProjectsGrid.tsx

import ProjectsGrid from '../projects/ProjectsGrid'

export default function ConceptMEPHome() {
  return <ProjectsGrid moduleTitle="Concept MEP Design" />
}
