import { useRef, useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { updateEditConcept } from '../../features/concept/conceptSlice'
import * as d3 from 'd3'
import Slider from './Slider'
import './Matrix.scss'

interface MatrixProps {
  attributesMap: Map<number, AttributeProps>
  conceptsMap: Map<number, ConceptProps>
}

interface AttributesProps {
  height: number
  attributesMap: Map<number, AttributeProps>
  attributesOrder: number[]
  margin: { left: number; top: number; right: number; bottom: number }
}

export interface AttributeProps {
  id: number
  name: string
  width: number
  percent: number
  keyPoints: number[]
  pos: number[]
  data: any[]
  type: string
  range: any[]
}

interface ConceptsProps {
  attributesMap: Map<number, AttributeProps>
  conceptsMap: Map<number, ConceptProps>
  conceptsOrder: number[]
  margin: { left: number; top: number; right: number; bottom: number }
}

export interface ConceptProps {
  id: number
  coverage: number
  width: number
  height: number
  orginCharts: { [key: number]: any[] }
  charts: ChartProps[]
  pos: number[]
  name: string
}

interface ChartProps {
  attributeId: number
  width: number
  height: number
  range: any[]
  pos: number[]
  type: string
  xData: any[]
  yData: any[]
  id: string
}

export default function Matrix(props: MatrixProps) {
  const { attributesMap, conceptsMap } = props
  const attributesOrder = useSelector((state: any) => state.concept.attributesOrder)
  const conceptsOrder = useSelector((state: any) => state.concept.conceptsOrder)

  const margin = { left: 20, top: 20, right: 20, bottom: 20 }
  const titleHeight = 120
  const height = 900
  const width = 480

  return (
    <>
      <svg
        id="attributeSvg"
        height={titleHeight}
        width={width}
        viewBox={`0 0 ${width} ${titleHeight}`}
        x={40}
      >
        <g>
          <Attributes
            height={titleHeight}
            attributesMap={attributesMap}
            attributesOrder={attributesOrder}
            margin={margin}
          ></Attributes>
        </g>
      </svg>
      <svg
        id="matrixSvg"
        height={height - titleHeight}
        width={width}
        viewBox={`0 0 ${width} ${height - titleHeight}`}
        x={40}
        y={titleHeight}
      >
        <g transform="translate(0, 0)">
          <Concepts
            attributesMap={attributesMap}
            conceptsMap={conceptsMap}
            conceptsOrder={conceptsOrder}
            margin={margin}
          ></Concepts>
        </g>
      </svg>
      {/* 滑动条 */}
      {attributesOrder.length * 100 + margin.left * 2 > width && (
        <Slider
          width={width}
          height={height}
          vertical={true}
          max={attributesOrder.length * 100 + margin.left * 2}
          min={0}
          value={0}
          titleId="attributeSvg"
          matrixId="matrixSvg"
          x={40}
          y={0}
        ></Slider>
      )}
    </>
  )
}

const Attributes = (props: AttributesProps) => {
  const { attributesMap, attributesOrder, height, margin } = props
  const attributes: AttributeProps[] = []
  for (let i = 0; i < attributesOrder.length; i++) {
    let id = attributesOrder[i]
    let attribute = attributesMap.get(id)
    if (attribute) {
      let temp = {
        id: attribute.id,
        name: attribute.name,
        width: attribute.width,
        percent: attribute.percent,
        keyPoints: attribute.keyPoints,
        pos: [margin.left + i * 100 + 50, height],
        data: attribute.data,
        type: attribute.type,
        range: attribute.range
      }
      attributes.push(temp)
      attributesMap.set(id, temp)
    }
  }

  return (
    <g className="title">
      {attributes.map((attribute) => {
        return (
          <Attribute
            id={attribute.id}
            key={attribute.name}
            name={attribute.name}
            width={attribute.width}
            percent={attribute.percent}
            keyPoints={attribute.keyPoints}
            pos={attribute.pos}
            data={attribute.data}
            type={attribute.type}
            range={attribute.range}
          ></Attribute>
        )
      })}
    </g>
  )
}

const Attribute = (props: AttributeProps) => {
  const { name, width, percent, keyPoints, pos } = props
  return (
    <g transform={`translate(${pos[0]}, ${pos[1]}) rotate(-50)`}>
      <text>{name}</text>
    </g>
  )
}

const Concepts = (props: ConceptsProps) => {
  const { attributesMap, conceptsMap, conceptsOrder, margin } = props
  const concepts: ConceptProps[] = []

  for (let i = 0; i < conceptsOrder.length; i++) {
    let id = conceptsOrder[i]
    const charts: ChartProps[] = []
    let concept = conceptsMap.get(id)
    if (!concept) {
      continue
    }

    for (let key of Object.keys(concept.orginCharts)) {
      charts.push({
        id: id + '-' + key,
        attributeId: +key,
        width: 90,
        height: 50,
        xData: attributesMap.get(+key)?.range || [],
        yData: attributesMap.get(+key)?.data || [],
        range: concept.orginCharts[+key],
        pos: [
          // 20 + Math.floor(Math.random() * attributesName.length) * 100,
          attributesMap.get(+key)?.pos[0] || 0,
          margin.top * (i + 1) + 50 * i
        ],
        type: attributesMap.get(+key)?.type || 'number'
      })
    }

    concepts.push({
      id: id,
      coverage: Math.random(),
      width: attributesMap.size * 100 + margin.left * 2,
      height: 50,
      orginCharts: concept.orginCharts,
      charts: charts,
      pos: [0, margin.top * (i + 1) + 50 * i],
      name: ''
    })
  }

  return (
    <g className="concepts">
      {concepts.map((concept, i) => {
        return (
          <Concept
            key={concept.id}
            id={concept.id}
            name={concept.name}
            coverage={concept.coverage}
            width={concept.width}
            height={concept.height}
            orginCharts={concept.orginCharts}
            charts={concept.charts}
            pos={concept.pos}
          ></Concept>
        )
      })}
    </g>
  )
}

const Concept = (props: ConceptProps) => {
  const { width, height, charts, pos, id } = props
  const dispath = useDispatch()
  const editConcept = useSelector((state: any) => state.concept.editConcept)
  const clickHandle = (id: number) => {
    if (id === editConcept) {
      dispath(updateEditConcept(-1))
    } else {
      dispath(updateEditConcept(id))
    }
  }
  return (
    <g transform="translate(0, 0)" onClick={() => clickHandle(id)}>
      <rect
        className="concept-bg"
        width={width}
        height={height}
        x={pos[0]}
        y={pos[1]}
        fill="#fff"
        stroke="#ccc"
      ></rect>
      {charts.map((chart, i) => {
        if (chart.type === 'string') {
          return (
            <BarChart
              key={chart.id}
              id={chart.id}
              attributeId={chart.attributeId}
              width={chart.width}
              height={chart.height}
              range={chart.range}
              pos={chart.pos}
              type={chart.type}
              yData={chart.yData}
              xData={chart.xData}
            />
          )
        } else {
          return (
            <LineChart
              key={chart.id}
              id={chart.id}
              attributeId={chart.attributeId}
              width={chart.width}
              height={chart.height}
              range={chart.range}
              pos={chart.pos}
              type={chart.type}
              yData={chart.yData}
              xData={chart.xData}
            />
          )
        }
      })}
    </g>
  )
}

export const BarChart = (props: ChartProps) => {
  const barchart = useRef(null)
  const { width, height, range, pos, xData, yData } = props

  useEffect(() => {
    const chart = d3.select(barchart.current)
    const maxData = d3.max(yData) * 1.2
    const xScale = d3.scaleBand().domain(xData).range([0, width])
    const yScale = d3
      .scaleLinear()
      .domain([0, maxData as number])
      .range([0, height])

    chart
      .select('.bar-chart-bars')
      .selectAll('rect')
      .data(xData)
      .join('rect')
      .attr('class', (d) => (range.includes(d) ? 'select' : ''))
      .attr('x', (d: string) => xScale(d) as number)
      .attr('y', (d: string, i) => height - yScale(yData[i]))
      .attr('width', width / xData.length)
      .attr('height', (d: string, i) => yScale(yData[i]))
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barchart, range])

  return (
    <g ref={barchart} transform={`translate(${pos[0] - width / 2}, ${pos[1]})`}>
      <rect
        className="bar-chart-bg"
        width={width}
        height={height}
        x={0}
        y={0}
        fill="none"
        stroke="#aaa"
      />
      <g className="bar-chart-bars"></g>
    </g>
  )
}

export const LineChart = (props: ChartProps) => {
  const linechart = useRef(null)
  const { id, width, height, range, pos, xData, yData } = props

  useEffect(() => {
    const chart = d3.select(linechart.current)
    const maxData = d3.max(yData.map((v) => v[1])) * 1.2
    const xScale = d3.scaleLinear().domain(xData).range([0, width])
    const yScale = d3
      .scaleLinear()
      .domain([0, maxData as number])
      .range([height, 0])
    const line = d3
      .line()
      .x((d) => xScale(d[0]))
      .y((d) => yScale(d[1]))
      .curve(d3.curveCatmullRom.alpha(0.5))
    let d = line(yData) || ''
    let firstPoint = d.split('C')[0].replace('M', '').split(',')
    let lastPoint = d.split(',').slice(-2)
    d = d.replace('M', `M${firstPoint[0]},${yScale(0)}L`)
    d += `L${lastPoint[0]},${yScale(0)}Z`

    chart.select('.line-chart-line').attr('d', d)
    chart.select('clipPath').select('path').attr('d', d)
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linechart])

  return (
    <g ref={linechart} transform={`translate(${pos[0] - width / 2}, ${pos[1]})`}>
      <rect
        className="line-chart-bg"
        width={width}
        height={height}
        x={0}
        y={0}
        fill="none"
        stroke="#aaa"
      />
      <clipPath id={`clip-${id}`}>
        <path></path>
      </clipPath>
      <path className="line-chart-line" fill="none"></path>
      <rect
        className="line-chart-shadow"
        width={((range[1] - range[0]) / (xData[1] - xData[0])) * width}
        height={height}
        x={((range[0] - xData[0]) / (xData[1] - xData[0])) * width}
        y={0}
        // opacity={0.5}
        clipPath={`url(#clip-${id})`}
      />
    </g>
  )
}
