import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { AttributeProps, ConceptProps, DatasetInfo } from './ConceptView'
import { useDispatch, useSelector } from 'react-redux'
import { setSelectConcept } from '../../features/concept/conceptSlice'
import './ConceptViewHeader.scss'

interface ConceptViewHeaderProps {
  info: DatasetInfo
  // attributesMap: Map<number, AttributeProps>
  conceptsMap: Map<number, ConceptProps>
}

export default function ConceptViewHeader(props: ConceptViewHeaderProps) {
  const { info, conceptsMap } = props
  const selectConcept = useSelector((state: any) => state.concept.selectConcept)
  const dispatch = useDispatch()
  const infoWidth = 150
  const barchart = useRef(null)
  const conceptsOrder = useSelector((state: any) => state.concept.conceptsOrder)
  const width = 350
  const height = 90
  const xData: string[] = conceptsOrder.map((id: number) => 'C' + id)
  const yData: number[] = conceptsOrder.map((id: number) => conceptsMap.get(id)?.coverage || 0)
  const margin = { top: 10, right: 10, bottom: 10, left: 10 }
  const yMax = Math.max(...yData)
  const maxData = yMax * 1.2
  const xScale = d3
    .scaleBand()
    .domain(xData)
    .range([margin.left, width - margin.left - margin.right])
  const yScale = d3
    .scaleLinear()
    .domain([0, maxData as number])
    .range([height - margin.top - margin.bottom, margin.bottom])
  const xAxis = d3.axisBottom(xScale).ticks(height / 50)
  const yAxis = d3.axisLeft(yScale).ticks(0)

  useEffect(() => {
    if (!barchart.current) return
    if (yData.length === 0) return
    const chart = d3.select(barchart.current)
    chart.select('.x-axis').selectAll('*').remove()
    chart.select('.y-axis').selectAll('*').remove()
    chart.select('.bar-chart-bars').selectAll('*').remove()
    chart
      .select('.x-axis')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(xAxis as any)
      .call((g) => {
        g.select('.domain')
          .attr('d', `M${margin.left},0 L${width - margin.left}, 0`)
          .attr('stroke', '#545454')
          .attr('marker-end', 'url(#arrow)')
      })
      .call((g) =>
        g.selectAll('.tick').on('click', (e, d: any) => {
          if (selectConcept === +d.split('C')[1]) {
            dispatch(setSelectConcept(-1))
          } else {
            dispatch(setSelectConcept(+d.split('C')[1]))
          }
        })
      )
    chart
      .select('.y-axis')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(yAxis as any)
      .call((g) => g.select('.domain').remove())
      .call((g) =>
        g
          .append('line')
          .attr('x1', 0)
          .attr('x2', 0)
          .attr('y2', 2)
          .attr('y1', height - margin.bottom)
          .attr('stroke', '#545454')
          .attr('stroke-width', 1)
          .attr('marker-end', 'url(#arrow)')
      )
      .call((g) =>
        g
          .append('text')
          .attr('x', 10)
          .attr('y', 14)
          // .attr('x', -margin.left)
          // .attr('transform', 'rotate(-90)')
          // .attr('y', -28)
          // .attr('font-size', 15)
          .attr('font-size', 15)
          .attr('fill', 'currentColor')
          .attr('text-anchor', 'start')
          // .attr('text-anchor', 'end')
          .text('Coverage')
      )
      .call((g) =>
        g
          .append('text')
          .attr('x', -3)
          .attr('y', yScale(0) + margin.top + 5)
          .attr('font-size', 10)
          .attr('fill', 'currentColor')
          .attr('text-anchor', 'end')
          .text('0')
      )
      .call((g) =>
        g
          .append('text')
          .attr('x', -3)
          .attr('y', yScale(yMax) + margin.top - 5)
          .attr('font-size', 10)
          .attr('fill', 'currentColor')
          .attr('text-anchor', 'end')
          .text(yMax * 100 + '%')
      )
    const barWidth = (width / xData.length) * 0.6
    chart
      .select('.bar-chart-bars')
      .selectAll('rect')
      .data(xData)
      .join('rect')
      .attr('class', (d: string, i) => {
        if (selectConcept === conceptsOrder[i]) return 'selected'
        return ''
      })
      .attr('x', (d: string) => (xScale(d) as number) + (width / xData.length) * 0.2)
      .attr('y', (d: string, i) => yScale(yData[i]))
      .attr('width', barWidth)
      .attr('height', (d: string, i) => (-yScale(yData[i]) as number) + height - margin.bottom)
      .on('click', (e, d) => {
        if (selectConcept === +d.split('C')[1]) {
          dispatch(setSelectConcept(-1))
        } else {
          dispatch(setSelectConcept(+d.split('C')[1]))
        }
      })
      .append('title')
      .text((d, i) => yData[i])

    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barchart, conceptsOrder, selectConcept, conceptsMap])

  return (
    <g className="concept-view-header">
      <g className="info" fontWeight={500}>
        <text x="0" y="20" fill="#656565">
          #Records: {info.records_num}
        </text>
        <text x="0" y="40" fill="#656565">
          #Attributes: {info.attributes_num}
        </text>
        <text x="0" y="60" fill="#656565">
          #Concepts: {info.concepts_num}
        </text>
        <text x="0" y="115" fontSize={20}>
          Attributes
        </text>
        <text x="65" y="95" fontSize={20}>
          Concepts
        </text>
      </g>
      <g className="bar-chart" ref={barchart} transform={`translate(${infoWidth}, 0)`}>
        <g className="x-axis" />
        <g className="y-axis" />
        <g className="bar-chart-bars" />
      </g>
    </g>
  )
}
