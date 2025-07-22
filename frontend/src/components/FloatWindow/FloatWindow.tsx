import './FloatWindow.scss'
import { Input, Slider, InputNumber, Button, Divider, Select } from 'antd'
import { BarChart, LineChart } from '../ProfileView/Matrix'
import { SliderMarks } from 'antd/es/slider'
import { useEffect, useRef, useState } from 'react'
import CheckableTag from 'antd/es/tag/CheckableTag'
import { useDispatch, useSelector } from 'react-redux'
import { DeleteOutlined, CloseOutlined } from '@ant-design/icons'

import * as d3 from 'd3'
import { setFloatWindowType, updateEditConcept } from '../../features/concept/conceptSlice'
import { AttributeProps, ConceptProps } from '../ConceptView/ConceptView'

interface FloatWindowProps {
  concept: ConceptProps | undefined
  attributeMap: Map<number, AttributeProps>
  updateConcept: (concept: ConceptProps) => void
  deleteConcept: (id: number) => void
  addConcept: (id: number) => void
  editConceptHandel: (id: number) => void
}

interface NumberFilterProps {
  min: number
  max: number
  range: any[]
  setRange: (range: any[]) => void
  deleteHandle: () => void
}

interface StringFilterProps {
  tagList: string[]
  range: any[]
  setRange: (range: any[]) => void
  deleteHandle: () => void
}

interface ChartDetailProps {
  range: any[]
  xData: any[]
  yData: number[]
}

export default function FloatWindow(props: FloatWindowProps) {
  const { concept, attributeMap, updateConcept, deleteConcept, editConceptHandel, addConcept } =
    props
  const dispatch = useDispatch()
  const floatWindowType = useSelector((state: any) => state.concept.floatWindowType)
  const selectSubgroups: number[] = useSelector((state: any) => state.concept.selectSubgroups)

  const [selectAttr, setSelectAttr] = useState<number>(
    +Object.keys(concept?.orginCharts || { 0: 0 })[0]
  )
  const [range, setRange] = useState<any[]>(concept?.orginCharts[selectAttr] || [0, 0])
  const [name, setName] = useState<string>(concept?.tag || '')

  const selectHandle = (id: number) => {
    setSelectAttr(id)
    if (Object.keys(concept?.orginCharts!).includes('' + id)) {
      setRange(concept?.orginCharts[id] || [0, 0])
    } else {
      if (attributeMap.get(id)?.type === 'string') {
        setRange([])
      } else {
        setRange([0, 0])
      }
    }

    if (!concept) return
    updateConcept(concept)
  }

  const deleteHandle = () => {
    setSelectAttr(0)
    delete concept?.orginCharts[selectAttr]
    if (attributeMap.get(selectAttr)?.type === 'string') {
      setRange([])
    } else {
      setRange([0, 0])
    }
  }

  const width = 90
  const height = 50

  useEffect(() => {
    if (!concept) return
    concept.tag = name
    if (range.length !== 0 && !(range[0] === 0 && range[1] === 0))
      concept.orginCharts[selectAttr] = range
    updateConcept(concept)
  }, [range, name])

  useEffect(() => {
    let selectAttr = +Object.keys(concept?.orginCharts || { 0: 0 })[0]
    setSelectAttr(selectAttr)
    setRange(concept?.orginCharts[selectAttr] || [0, 0])
    setName(concept?.name || '')
  }, [concept])

  if (!concept) return <></>
  return (
    <div id="float-window">
      <div className="float-window-head">
        <Select
          disabled={floatWindowType === 'add'}
          value={concept.id}
          options={
            floatWindowType === 'add'
              ? [
                  {
                    label: 'S' + concept.id,
                    value: concept.id
                  }
                ]
              : selectSubgroups.map((d) => {
                  return {
                    label: 'S' + d,
                    value: d
                  }
                })
          }
          onChange={(value) => {
            editConceptHandel(concept.id)
            dispatch(updateEditConcept(value))
          }}
        />
        <Input
          value={name}
          addonBefore={'tag:'}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const { value: inputValue } = e.target
            setName(inputValue)
          }}
        />
        {floatWindowType !== 'add' ? (
          <></>
        ) : (
          <Button
            type="primary"
            size={'middle'}
            onClick={() => {
              addConcept(concept.id)
              dispatch(updateEditConcept(-1))
            }}
          >
            Add Subgroup
          </Button>
        )}
      </div>
      <div className="float-window-content">
        <div className="float-window-left">
          <div className="float-window-left-bottom">
            <div className="attribute-list">
              {Object.keys(concept.orginCharts).map((d) => {
                const attribute = attributeMap.get(+d)
                if (!attribute) return <></>
                let miniChart = <></>
                if (attribute.type === 'string') {
                  miniChart = (
                    <BarChart
                      key={attribute.id}
                      id={attribute.id + ''}
                      attributeId={attribute.id}
                      width={width}
                      height={height}
                      range={concept.orginCharts[attribute.id]}
                      pos={[width / 2, 0]}
                      type={attribute.type}
                      yData={attribute.data}
                      xData={attribute.range}
                    />
                  )
                } else {
                  miniChart = (
                    <LineChart
                      key={attribute.id}
                      id={attribute.id + ''}
                      attributeId={attribute.id}
                      width={width}
                      height={height}
                      range={concept.orginCharts[attribute.id]}
                      pos={[width / 2, 0]}
                      type={attribute.type}
                      yData={attribute.data}
                      xData={attribute.range}
                    />
                  )
                }
                return (
                  <div
                    className={`attribute-item${selectAttr === attribute.id ? ' selected' : ''}`}
                    key={attribute.name}
                    onClick={() => {
                      selectHandle(attribute.id)
                    }}
                  >
                    <div className="attribute-item-name" title={attribute.name}>
                      {attribute.name}
                    </div>
                    <svg className="attribute-item-chart" viewBox="0 0 90 50">
                      {miniChart}
                    </svg>
                  </div>
                )
              })}
              {Array.from(attributeMap.keys()).map((d) => {
                if (Object.keys(concept.orginCharts).includes('' + d)) return <div key={d}></div>
                const attribute = attributeMap.get(+d)
                if (!attribute) return <div key={d}></div>
                let miniChart = <></>
                if (attribute.type === 'string') {
                  miniChart = (
                    <BarChart
                      key={attribute.id}
                      id={attribute.id + ''}
                      attributeId={attribute.id}
                      width={width}
                      height={height}
                      range={[]}
                      pos={[width / 2, 0]}
                      type={attribute.type}
                      yData={attribute.data}
                      xData={attribute.range}
                    />
                  )
                } else {
                  miniChart = (
                    <LineChart
                      key={attribute.id}
                      id={attribute.id + ''}
                      attributeId={attribute.id}
                      width={width}
                      height={height}
                      range={[0, 0]}
                      pos={[width / 2, 0]}
                      type={attribute.type}
                      yData={attribute.data}
                      xData={attribute.range}
                    />
                  )
                }
                return (
                  <div
                    className={`attribute-item${selectAttr === attribute.id ? ' selected' : ''}`}
                    key={attribute.name}
                    onClick={() => {
                      selectHandle(attribute.id)
                    }}
                  >
                    <div className="attribute-item-name" title={attribute.name}>
                      {attribute.name}
                    </div>
                    <svg className="attribute-item-chart" viewBox="0 0 90 50">
                      {miniChart}
                    </svg>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <div className="float-window-right">
          <div className="float-window-right-top">
            {attributeMap.get(selectAttr)?.type === 'number' ? (
              <NumberFilter
                min={attributeMap.get(selectAttr)?.range[0]}
                max={attributeMap.get(selectAttr)?.range[1]}
                range={range}
                setRange={setRange}
                deleteHandle={deleteHandle}
              ></NumberFilter>
            ) : (
              <StringFilter
                tagList={attributeMap.get(selectAttr)?.range || []}
                range={range}
                setRange={setRange}
                deleteHandle={deleteHandle}
              ></StringFilter>
            )}
          </div>
          <div className="float-window-right-bottom">
            {attributeMap.get(selectAttr)?.type === 'number' ? (
              <LineChartDetail
                range={range}
                xData={attributeMap.get(+selectAttr)?.range || []}
                yData={attributeMap.get(+selectAttr)?.data || []}
              ></LineChartDetail>
            ) : (
              <BarChartDetail
                range={range}
                xData={attributeMap.get(+selectAttr)?.range || []}
                yData={attributeMap.get(+selectAttr)?.data || []}
              ></BarChartDetail>
            )}
          </div>
        </div>
      </div>

      <div
        className="close-float-window"
        onClick={() => {
          if (floatWindowType === 'edit') {
            editConceptHandel(concept.id)
            dispatch(updateEditConcept(-1))
          } else {
            dispatch(updateEditConcept(-1))
          }
        }}
      >
        <CloseOutlined />
      </div>
    </div>
  )
}

function NumberFilter(props: NumberFilterProps) {
  const { range, setRange, min, max, deleteHandle } = props
  const marks: SliderMarks = {
    // 26: '26',
    // 37: '37'
  }
  return (
    <div className="number-filter">
      <Slider
        range
        value={[range[0], range[1]]}
        min={min}
        max={max}
        marks={marks}
        step={0.01}
        onChange={setRange}
      />
      <div className="input">
        <span>Range:</span>
        <InputNumber
          min={min}
          max={max}
          style={{ margin: '0 0.5rem' }}
          step={0.01}
          value={range[0]}
          controls={false}
          onChange={(value) => {
            range[0] = value || 0
            range.sort((a, b) => a - b)
            setRange([...range])
          }}
        />
        <span>~</span>
        <InputNumber
          min={min}
          max={max}
          style={{ margin: '0 0.5rem' }}
          step={0.01}
          value={range[1]}
          controls={false}
          onChange={(value) => {
            range[1] = value || 0
            range.sort((a, b) => a - b)
            setRange([...range])
          }}
        />
        <Button
          type="primary"
          shape="circle"
          icon={<DeleteOutlined />}
          onClick={() => deleteHandle()}
        />
      </div>
    </div>
  )
}

function StringFilter(props: StringFilterProps) {
  const { tagList, range, setRange, deleteHandle } = props
  const handleChange = (tag: string, checked: boolean) => {
    const nextSelectedTags = checked ? [...range, tag] : range.filter((t) => t !== tag)
    setRange(nextSelectedTags)
  }
  return (
    <div className="string-filter">
      <span style={{ marginRight: 8 }}>Categories:</span>
      {tagList.map((tag) => (
        <CheckableTag
          key={tag}
          checked={range.includes(tag)}
          onChange={(checked) => handleChange(tag, checked)}
        >
          {tag}
        </CheckableTag>
      ))}
      <Button
        type="primary"
        shape="circle"
        icon={<DeleteOutlined />}
        onClick={() => deleteHandle()}
      />
    </div>
  )
}

function BarChartDetail(porps: ChartDetailProps) {
  const { xData, yData, range } = porps
  const barChartRef = useRef<SVGSVGElement>(null)
  const width = 360
  const height = 180
  const margin = { top: 20, right: 20, bottom: 20, left: 60 }
  const xScale = d3
    .scaleBand()
    .domain(xData)
    .range([0, width - margin.left - margin.right])
  const yMax = Math.max(...yData) * 1.1
  const yScale = d3
    .scaleLinear()
    .domain([0, yMax])
    .range([height - margin.top - margin.bottom, 0])
  const xAxis = d3.axisBottom(xScale).tickSizeOuter(0)
  const yAxis = d3.axisLeft(yScale).ticks(5)

  useEffect(() => {
    const svg = d3.select(barChartRef.current)
    svg.select('.x-axis').selectAll('*').remove()
    svg.select('.y-axis').selectAll('*').remove()
    svg
      .select('.x-axis')
      .attr('transform', `translate(${margin.left},${height - margin.bottom})`)
      .call(xAxis as any)
      .attr('font-size', '15')
    svg
      .select('.y-axis')
      .attr('transform', `translate(${margin.left}, ${margin.bottom})`)
      .call(yAxis as any)
      .call((g) => g.select('.domain').remove())
      .call((g) =>
        g
          .selectAll('.tick line')
          .clone()
          .attr('x2', width - margin.left - margin.right)
          .attr('stroke-opacity', 0.1)
      )
      .call((g) =>
        g
          .append('text')
          .attr('x', -margin.left)
          .attr('y', -5)
          .attr('fill', 'currentColor')
          .attr('text-anchor', 'start')
          .text('Count')
      )
      .attr('font-size', '15')
  }, [xData, yData])

  return (
    <svg
      ref={barChartRef}
      // viewBox={`0 0 ${width} ${height}`}
    >
      <g className="x-axis"></g>
      <g className="y-axis"></g>
      <g className="bars">
        {xData.map((x, i) => {
          return (
            <rect
              className={`${range.includes(x) ? 'selected' : ''}`}
              key={x}
              x={(xScale(x) as number) + margin.left + xScale.bandwidth() * 0.1}
              y={(yScale(yData[i]) as number) + margin.top}
              width={xScale.bandwidth() * 0.8}
              height={(height - margin.top - margin.bottom - yScale(yData[i])) as number}
            ></rect>
          )
        })}
      </g>
    </svg>
  )
}

function LineChartDetail(porps: ChartDetailProps) {
  const { range, xData, yData } = porps
  const id = 1
  const lineChartRef = useRef<SVGSVGElement>(null)
  const width = 360
  const height = 180
  const margin = { top: 20, right: 20, bottom: 20, left: 60 }
  const xScale = d3
    .scaleLinear()
    .domain(xData)
    .range([margin.left, width - margin.right])
  const yMax = Math.max(...yData.map((d: any) => d[1])) * 1.1
  const yScale = d3
    .scaleLinear()
    .domain([0, yMax])
    .range([height - margin.bottom, margin.top])
  const xAxis = d3.axisBottom(xScale).ticks(height / 50)
  const yAxis = d3.axisLeft(yScale).ticks(5)

  useEffect(() => {
    const svg = d3.select(lineChartRef.current)
    svg.select('.x-axis').selectAll('*').remove()
    svg.select('.y-axis').selectAll('*').remove()
    svg
      .select('.x-axis')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(xAxis as any)
      .attr('font-size', '15')
    svg
      .select('.y-axis')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(yAxis as any)
      .call((g) => g.select('.domain').remove())
      .call((g) =>
        g
          .selectAll('.tick line')
          .clone()
          .attr('x2', width - margin.left - margin.right)
          .attr('stroke-opacity', 0.1)
      )
      .call((g) =>
        g
          .append('text')
          .attr('x', -margin.left)
          .attr('y', 12)
          .attr('fill', 'currentColor')
          .attr('text-anchor', 'start')
          .text('Count')
      )
      .attr('font-size', '15')
    const line = d3
      .line()
      .x((d) => xScale(d[0]))
      .y((d) => yScale(d[1]))
      // .curve(d3.curveCardinal.tension(0.5))
      .curve(d3.curveCatmullRom.alpha(0.5))
    let d = line(yData as any) || ''
    let firstPoint = d.split('C')[0].replace('M', '').split(',')
    let lastPoint = d.split(',').slice(-2)
    let lastPointX = lastPoint[0]
    if (lastPoint[0].includes('L')) {
      lastPointX = lastPoint[0].split('L')[1]
    } else if (lastPoint[0].includes('C')) {
      lastPointX = lastPoint[0].split('C')[1]
    }

    d = d.replace(
      'M',
      `M${firstPoint[0].replace('M', '').replace('L', '').replace('C', '')},${yScale(0)}L`
    )
    d += `L${lastPointX},${yScale(0)}Z`
    svg.select('.line').attr('d', d)
    svg.select('clipPath').select('path').attr('d', d)
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <svg
      ref={lineChartRef}
      // viewBox={`0 0 ${width} ${height}`}
    >
      <g className="x-axis"></g>
      <g className="y-axis"></g>
      <clipPath id={`detail-clip-${id}`}>
        <path></path>
      </clipPath>
      <path className="line"></path>
      <rect
        className="line-chart-shadow"
        width={xScale(range[1]) - xScale(range[0])}
        height={height - margin.top - margin.bottom}
        x={xScale(range[0])}
        y={yScale(0) - height + margin.top + margin.bottom}
        // opacity={0.5}
        clipPath={`url(#detail-clip-${id})`}
      />
    </svg>
  )
}
