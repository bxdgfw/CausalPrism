import * as d3 from 'd3'
import './DensityBar.scss'
import { useEffect } from 'react'

export interface DensityBarProps {
  range: [number, number]
  treatment: number[]
  control: number[]
}

export default function DensityBar(props: { barChartData: DensityBarProps }) {
  const { barChartData } = props
  const width = 405
  const height = 270
  const padding = { left: 60, right: 60, top: 40, bottom: 40 }
  const { range, treatment, control } = barChartData
  const dx = treatment.length !== 0 ? (range[1] - range[0]) / treatment.length : 0
  const barWidth = (width - padding.left - padding.right) / treatment.length
  const xScale = d3
    .scaleLinear()
    .domain(range)
    .range([0, width - padding.left - padding.right])
  const maxY = Math.max(d3.max(treatment) || 0, d3.max(control) || 0) * 1.3
  const yScale = d3
    .scaleLinear()
    .domain([0, maxY])
    .range([height - padding.top - padding.bottom, 0])
  const xAxis = d3.axisBottom(xScale)
  const yAxis = d3.axisLeft(yScale).ticks(8)

  useEffect(() => {
    if (!barChartData.treatment.length) return
    const svg = d3.select('#density-bar')
    svg.selectAll('*').remove()
    svg
      .append('g')
      .call(xAxis)
      .call((g) =>
        g
          .select('path.domain')
          .attr('d', `M0,0.5 L${width - padding.left - padding.right + 20}, 0.5`)
          .attr('marker-end', 'url(#arrow)')
      )
      .attr('transform', `translate(${padding.left}, ${height - padding.bottom})`)
    svg
      .append('g')
      .call(yAxis)
      .call((g) =>
        g
          .select('path.domain')
          .attr('d', `M0.5,${height - padding.top - padding.bottom} L0.5, -20`)
          .attr('marker-end', 'url(#arrow)')
      )
      .attr('transform', `translate(${padding.left}, ${padding.top})`)
    const bars = svg.append('g').attr('transform', `translate(${padding.left}, ${padding.top})`)
    bars
      .selectAll('rect.treatment')
      .data(treatment)
      .enter()
      .append('rect')
      .attr('class', 'treatment')
      .attr('x', (d, i) => xScale(i * dx + range[0]))
      .attr('y', (d) => yScale(d))
      .attr('width', barWidth)
      .attr('height', (d) => height - padding.top - padding.bottom - yScale(d))

    bars
      .selectAll('rect.control')
      .data(control)
      .enter()
      .append('rect')
      .attr('class', 'control')
      .attr('x', (d, i) => xScale(i * dx + range[0]))
      .attr('y', (d) => yScale(d))
      .attr('width', barWidth)
      .attr('height', (d) => height - padding.top - padding.bottom - yScale(d))

    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -100)
      .attr('y', 20)
      .text('Count')
      .attr('font-size', 18)

    svg
      .append('text')
      .attr('x', width - 20)
      .attr('y', height)
      .text('Propensity score')
      .attr('font-size', 18)
      .attr('text-anchor', 'end')

    svg
      .append('rect')
      .attr('x', width - padding.right - 40)
      .attr('y', padding.top - 10 - 20)
      .attr('width', 15)
      .attr('height', 15)
      .attr('class', 'treatment')

    svg
      .append('text')
      .attr('x', width - padding.right - 20)
      .attr('y', padding.top + 3 - 20)
      .text('Teatment')
      .attr('class', 'lable')

    svg
      .append('rect')
      .attr('x', width - padding.right - 40)
      .attr('y', padding.top - 10 + 20 - 20)
      .attr('width', 15)
      .attr('height', 15)
      .attr('class', 'control')

    svg
      .append('text')
      .attr('x', width - padding.right - 20)
      .attr('y', padding.top + 3 + 20 - 20)
      .text('Control')
      .attr('class', 'lable')

    svg
      .append('rect')
      .attr('x', width - padding.right - 40)
      .attr('y', padding.top - 10 + 40 - 20)
      .attr('width', 15)
      .attr('height', 15)
      .attr('class', 'matched')

    svg
      .append('text')
      .attr('x', width - padding.right - 20)
      .attr('y', padding.top + 3 + 40 - 20)
      .text('Matched')
      .attr('class', 'matched')
  }, [barChartData])

  return (
    <svg id="density-bar" width={width} height={height} viewBox={`0 0 ${width} ${height}`}></svg>
  )
}
