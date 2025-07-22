import './ForestPlot.scss'

export interface ForestPlotProps {
  range: [number, number]
  relationships: realationship[]
}

interface realationship {
  id: number
  mean: number
  name: string
  weight: number
  subgroups: number[]
  confidence: [number, number]
}

export default function ForestPlot(props: ForestPlotProps) {
  const { range, relationships } = props
  const rowHeight = 40
  const rowWidth = 350
  const padding = { left: 50, right: 20, top: 20, bottom: 20 }
  return (
    <svg width={450} height={350}>
      <defs>
        <marker
          id="left-triangle"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerUnits="strokeWidth"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M 10 0 L 0 5 L 10 10 z" fill="#9d9d9d" />
        </marker>
        <marker
          id="right-triangle"
          viewBox="0 0 10 10"
          refX="0"
          refY="5"
          markerUnits="strokeWidth"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M 0 10 L 10 5 L 0 0 z" fill="#9d9d9d" />
        </marker>
        <marker
          id="left-line"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerUnits="strokeWidth"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M 10 0 L 10 10z" stroke="#9d9d9d" strokeWidth={3} />
        </marker>
        <marker
          id="right-line"
          viewBox="0 0 10 10"
          refX="0"
          refY="5"
          markerUnits="strokeWidth"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M 0 0 L 0 10" stroke="#9d9d9d" strokeWidth={3} />
        </marker>
      </defs>
      {relationships.map((row, i) => {
        const k = rowWidth / (range[1] - range[0])
        const start =
          (row.confidence[0] > range[0] ? (row.confidence[0] - range[0]) * k : 0) + padding.left
        const end =
          (row.confidence[1] < range[1] ? (row.confidence[1] - range[0]) * k : rowWidth) +
          padding.left
        const boxHeight = row.weight * rowHeight * 0.4
        const boxX = (row.mean - range[0]) * k + padding.left - boxHeight / 2
        return (
          <g key={row.id} transform={`translate(20, ${(i + 1) * rowHeight})`}>
            <text x={0} y={10}>
              {row.name}
            </text>
            <path
              d={`M${start},5 L${end},5`}
              stroke="#9d9d9d"
              strokeWidth={2}
              markerStart={range[0] > row.confidence[0] ? 'url(#left-triangle)' : 'url(#left-line)'}
              markerEnd={range[1] < row.confidence[1] ? 'url(#right-triangle)' : 'url(#right-line)'}
            ></path>
            <rect
              className="box"
              x={boxX}
              y={5 - boxHeight / 2}
              width={boxHeight}
              height={boxHeight}
            ></rect>
          </g>
        )
      })}
      <g transform={`translate(20, ${(relationships.length + 1) * rowHeight})`}>
        <path
          d={`M${padding.left} 0 L${padding.left + rowWidth} 0`}
          stroke="#9d9d9d"
          strokeWidth={2}
        ></path>
        {[
          range[0].toFixed(2),
          ((range[1] - range[0]) * 0.25 + range[0]).toFixed(2),
          ((range[1] - range[0]) * 0.5 + range[0]).toFixed(2),
          ((range[1] - range[0]) * 0.75 + range[0]).toFixed(2),
          range[1].toFixed(2)
        ].map((x, i) => {
          if (range[0] === range[1]) return null
          const k = rowWidth / (range[1] - range[0])
          const start = (+x - range[0]) * k + padding.left
          return (
            <g key={i}>
              <path d={`M${start}, 1 L${start} -8`} stroke="#9d9d9d" strokeWidth={2}></path>
              <text x={start} y={15}>
                {x}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
