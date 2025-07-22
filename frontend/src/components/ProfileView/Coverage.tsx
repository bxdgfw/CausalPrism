import { useSelector, useDispatch } from 'react-redux'
import './Coverage.scss'
import * as d3 from 'd3'
import { ConceptProps } from './Matrix'

interface CoverageProps {
  conceptsMap: Map<number, ConceptProps>
}

export default function Coverage(props: CoverageProps) {
  const { conceptsMap } = props
  const conceptsOrder: number[] = useSelector((state: any) => state.concept.conceptsOrder)
  const x = 520
  const width = 50
  const height = 900
  const titleHeight = 120
  const margin = { left: 20, top: 20, right: 20, bottom: 20 }
  const dy = 50
  const innerRadius = 15
  const outterRadius = 20
  const arcPath = d3.arc()

  return (
    <>
      <g transform={`translate(${x}, 0)`}>
        <text x={-120} y={40} transform="rotate(-90)" fontSize={24} fontWeight={600}>
          Coverage
        </text>
      </g>
      <svg
        id="coverageSvg"
        x={x}
        y={titleHeight}
        viewBox={`0 0 ${width} ${height - titleHeight}`}
        height={height - titleHeight}
        width={width}
      >
        <g>
          {conceptsOrder.map((d, i) => {
            return (
              <g
                transform={`translate(${width - outterRadius}, ${
                  (dy + margin.top) * i + margin.top + (dy - outterRadius * 2) / 2 + outterRadius
                })`}
                key={i}
              >
                <path
                  d={
                    arcPath({
                      startAngle: 0,
                      endAngle: (conceptsMap.get(d)?.coverage || 0) * Math.PI * 2,
                      innerRadius: innerRadius,
                      outerRadius: outterRadius
                    }) as string
                  }
                  fill="orange"
                ></path>
                <text x={-10} y={6} fontSize={16} fill="orange">
                  {(conceptsMap.get(d)?.coverage || 0) * 100}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </>
  )
}
