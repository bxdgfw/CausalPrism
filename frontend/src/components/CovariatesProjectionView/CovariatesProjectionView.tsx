import { ConceptProps } from '../ConceptView/ConceptView'
import ScatterPlotD3 from './ScatterPlotD3'

interface CovariatesProjectionViewProps {
  conceptsMap: Map<number, ConceptProps>
  setConceptsMap: (conceptsMap: Map<number, ConceptProps>) => void
  unitsInSubgroup: number[]
}

export default function CovariatesProjectionView({
  conceptsMap,
  setConceptsMap,
  unitsInSubgroup
}: CovariatesProjectionViewProps) {
  return (
    <ScatterPlotD3
      conceptsMap={conceptsMap}
      setConceptsMap={setConceptsMap}
      unitsInSubgroup={unitsInSubgroup}
    />
  )
}
