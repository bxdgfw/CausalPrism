import { useSelector, useDispatch } from 'react-redux'
import { setSelectConcept, setSelectRules } from '../../features/concept/conceptSlice'
import './Concepts.scss'
import { ConceptProps } from './Matrix'

interface ConceptsProps {
  conceptsMap: Map<number, ConceptProps>
}

export default function Concepts(props: ConceptsProps) {
  const dispatch = useDispatch()
  const selectConcept: number = useSelector((state: any) => state.concept.selectConcept)
  const selectRules: number[] = useSelector((state: any) => state.concept.selectRules)
  const { conceptsMap } = props
  const conceptsOrder: number[] = useSelector((state: any) => state.concept.conceptsOrder)
  const x = 570
  const width = 100
  const height = 900
  const titleHeight = 120
  const margin = { left: 20, top: 20, right: 20, bottom: 20 }
  const dy = 50

  const clickHandle = (i: number) => {
    if (selectConcept === i) {
      dispatch(setSelectConcept(-1))
      dispatch(setSelectRules([]))
    } else {
      dispatch(setSelectConcept(i))
      dispatch(setSelectRules([1, 3]))
    }
  }

  return (
    <>
      <g transform={`translate(${x}, 0)`}>
        <text x={-120} y={40} transform="rotate(-90)" fontSize={24} fontWeight={600}>
          Concepts
        </text>
      </g>
      <svg
        id="profileSvg"
        x={x}
        y={titleHeight}
        viewBox={`0 0 ${width} ${height - titleHeight}`}
        height={height - titleHeight}
        width={width}
      >
        {conceptsOrder.map((d, i) => {
          return (
            <g
              transform={`translate(10, ${(dy + margin.top) * i + margin.top})`}
              key={i}
              onClick={() => clickHandle(i)}
            >
              <text x={0} y={20} fontSize={18}>
                {conceptsMap.get(d)?.name}
              </text>
            </g>
          )
        })}
      </svg>
    </>
  )
}
