import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AttributeProps, SubgroupProps } from './CausalSubgroupView'

import * as d3 from 'd3'

import './SubgroupTable.scss'
import { setFloatWindowType, updateEditSubgroup } from '../../features/concept/conceptSlice'
import Slider from '../ProfileView/Slider'

interface SubgroupTableProps {
  attributesMap: Map<number, AttributeProps>
  subgroupMap: Map<number, SubgroupProps>
}

export default function SubgroupTable(props: SubgroupTableProps) {
  const table = useRef(null)
  const { attributesMap, subgroupMap } = props
  const subgroupOrder: number[] = useSelector((state: any) => state.subgroup.subgroupOrder)
  const attributesOrder: number[] = useSelector((state: any) => state.subgroup.attributesOrder)
  const selectSubgroup: number = useSelector((state: any) => state.subgroup.selectSubgroup)
  const titleHeight = 160
  const width = 600
  const height = 480
  const rectHeight = (height - titleHeight) / (subgroupOrder.length || 1)
  const [attributesOpenMap, setAttributesOpenMap] = useState(new Map<number, boolean>())
  const [maxWidth, setMaxWidth] = useState(0)
  let widthCount = 0
  const openedAttributeWidth = 130
  const closedAttributeWidth = 30
  const duration = 1000
  const xMargin = [15, 15]
  const dispatch = useDispatch()
  const yRange = [20, 100]
  const editSubgroup = useSelector((state: any) => state.subgroup.editSubgroup)
  const clickHandle = (id: number) => {
    dispatch(setFloatWindowType('all'))
    if (id === editSubgroup) {
      dispatch(updateEditSubgroup(-1))
    } else {
      dispatch(updateEditSubgroup(id))
    }
  }

  useEffect(() => {
    let attributesOpenMap = new Map<number, boolean>()
    attributesOpenMap.set(1, true)
    attributesOpenMap.set(2, true)
    setAttributesOpenMap(attributesOpenMap)
  }, [])

  const attributeClick = (id: number) => {
    const open = attributesOpenMap.get(id)
    attributesOpenMap.set(id, !open)
    setAttributesOpenMap(new Map(attributesOpenMap))
  }

  useEffect(() => {
    const tableSvg = d3.select(table.current)
    const xList: number[] = []
    const tableData: any[] = []
    const circleData: any[] = []
    const chartData: any[] = []
    const highlightData: any[] = []
    const yTextData: any[] = []
    const xTextData: any[] = []
    widthCount = 0
    attributesOrder.map((id: number) => {
      const attribute = attributesMap.get(id)
      if (!attribute) return null
      const xMin = widthCount
      if (attributesOpenMap.get(id)) {
        widthCount += openedAttributeWidth
      } else {
        widthCount += closedAttributeWidth
      }
      const xMax = widthCount
      xList.push(widthCount)

      // attribute图表的数据
      if (attributesOpenMap.get(id)) {
        if (attribute.type === 'number') {
          let xScale = d3
            .scaleLinear()
            .domain(attribute.range)
            .range([xMin + xMargin[0], xMax - xMargin[1]])
          let yMax = d3.max(attribute.data.map((v) => v[1])) * 1.2
          let yScale = d3.scaleLinear().domain([yMax, 0]).range(yRange)

          chartData.push({
            xScale,
            yScale,
            xData: attribute.range,
            yData: attribute.data,
            xRange: [xMin + xMargin[0], xMax - xMargin[1] / 2],
            yRange: [yRange[0], yRange[1] + xMargin[1] / 2],
            type: 'number',
            id
          })
          xTextData.push({
            x: xScale(attribute.range[0]) + 5,
            y: yScale(0) + 5,
            text: attribute.range[0]
          })
          xTextData.push({
            x: xScale(attribute.range[1]) + 5,
            y: yScale(0) + 5,
            text: attribute.range[1]
          })
          yTextData.push({
            x: xScale(attribute.range[0]) - 5,
            y: yScale(0),
            text: 0
          })
          yTextData.push({
            x: xScale(attribute.range[0]) - 5,
            y: yScale(yMax),
            text: yMax.toFixed(0)
          })
          yTextData.push({
            x: xScale(attribute.range[0]) - 8,
            y: yScale(yMax) - 5,
            text: 'Count'
          })
        } else {
          let xScale = d3
            .scaleBand()
            .domain(attribute.range)
            .range([xMin + xMargin[0], xMax - xMargin[1]])
          let yMax = d3.max([...attribute.data])
          let yScale = d3.scaleLinear().domain([yMax, 0]).range(yRange)
          chartData.push({
            xScale,
            yScale,
            xData: attribute.range,
            yData: attribute.data,
            xRange: [xMin + xMargin[0], xMax - xMargin[1] / 2],
            yRange: [yRange[0], yRange[1] + xMargin[1] / 2],
            type: 'string',
            id
          })
          attribute.range.map((v, i) => {
            xTextData.push({
              x: xScale(v)! + xScale.bandwidth() / 2 + 6,
              y: yScale(0) + 5,
              text: v
            })
          })
          yTextData.push({
            x: xScale(attribute.range[0])! - 5,
            y: yScale(0),
            text: 0
          })
          yTextData.push({
            x: xScale(attribute.range[0])! - 5,
            y: yScale(yMax),
            text: yMax.toFixed(0)
          })
          yTextData.push({
            x: xScale(attribute.range[0])! - 8,
            y: yScale(yMax) - 5,
            text: 'Count'
          })
        }
      }
      // 表格内的所有矩形数据
      for (let i = 0; i < subgroupOrder.length; i++) {
        const subgroup = subgroupMap.get(subgroupOrder[i])
        if (!subgroup) return null
        for (let key of Object.keys(subgroup.orginCharts)) {
          if (+key === id) {
            const range = subgroup.orginCharts[+key]
            if (attribute.type === 'number') {
              let xScale = d3.scaleLinear().domain(attribute.range).range([xMin, xMax])
              if (attributesOpenMap.get(id)) {
                xScale = d3
                  .scaleLinear()
                  .domain(attribute.range)
                  .range([xMin + xMargin[0], xMax - xMargin[1]])
              }
              tableData.push({
                x: xScale(range[0]),
                y: titleHeight + i * rectHeight + rectHeight / 3,
                height: rectHeight / 3,
                width: xScale(range[1]) - xScale(range[0]),
                class: selectSubgroup === subgroup.id ? 'selected' : ''
              })
            } else if (attribute.type === 'string') {
              let xScale = d3.scaleBand().domain(attribute.range).range([xMin, xMax])
              if (attributesOpenMap.get(id)) {
                xScale = d3
                  .scaleBand()
                  .domain(attribute.range)
                  .range([xMin + xMargin[0], xMax - xMargin[1]])
              }
              const r = Math.min(xScale.bandwidth() * 0.25, rectHeight / 2)
              for (let j = 0; j < range.length; j++) {
                circleData.push({
                  cy: titleHeight + i * rectHeight + (rectHeight - r * 2) / 2 + r,
                  cx: (xScale(range[j]) || 0) + xScale.bandwidth() / 2,
                  r: r,
                  class: selectSubgroup === subgroup.id ? 'selected' : ''
                })
              }
            }
          }
        }
      }
    })
    if (xList.length === 0) return
    const subgroup = subgroupMap.get(selectSubgroup)
    if (subgroup) {
      Object.keys(subgroup.orginCharts).map((key) => {
        if (attributesOpenMap.get(+key)) {
          const attributes = attributesMap.get(+key)
          if (attributes) {
            const range = subgroup.orginCharts[+key]
            let chart
            for (let i = 0; i < chartData.length; i++) {
              if (chartData[i].id === +key) {
                chart = chartData[i]
                break
              }
            }
            if (!chart) return null
            if (attributes.type === 'number') {
              highlightData.push({
                x: chart.xScale(range[0]),
                y: chart.yRange[0],
                width: chart.xScale(range[1]) - chart.xScale(range[0]),
                height: chart.yRange[1] - chart.yRange[0],
                clipPath: `url(#line-chart-clip-${key})`
              })
            } else if (attributes.type === 'string') {
              for (let i = 0; i < range.length; i++) {
                let name: string = range[i]
                highlightData.push({
                  x: chart.xScale(name) + chart.xScale.bandwidth() * 0.25,
                  y: chart.yRange[0],
                  width: chart.xScale.bandwidth() * 0.5,
                  height: chart.yRange[1] - chart.yRange[0],
                  clipPath: `url(#bar-chart-clip-${key})`
                })
              }
            }
          }
        }
      })
    }

    setMaxWidth(widthCount + 5)
    tableSvg
      .select('.table-bg')
      .selectAll('rect')
      .data(subgroupOrder)
      .join('rect')
      .on('click', (e, d) => {
        clickHandle(d)
      })
      .transition()
      .duration(duration)
      .attr('y', (d, i) => titleHeight + i * rectHeight)
      .attr('x', 0)
      .attr('width', widthCount)
      .attr('height', rectHeight)
      .attr('fill', '#fff')

    // 表格纵向线
    tableSvg
      .select('.table-lines')
      .select('.left-lines')
      .selectAll('line')
      .data(xList)
      .join('line')
      .transition()
      .duration(duration)
      .attr('x1', (d) => d)
      .attr('y1', 0)
      .attr('x2', (d) => d)
      .attr('y2', height)
    // 表格横向线
    tableSvg
      .select('.table-lines')
      .select('.under-lines')
      .selectAll('line')
      .data(subgroupOrder.concat([-1, -2]))
      .join('line')
      .transition()
      .duration(duration)
      .attr('y1', (d, i) => (titleHeight + i * rectHeight > height ? 0 : titleHeight + i * rectHeight))
      .attr('x1', 0)
      .attr('y2', (d, i) => (titleHeight + i * rectHeight > width ? 0 : titleHeight + i * rectHeight))
      .attr('x2', widthCount)

    // attribute文字显示
    tableSvg
      .select('.table-attributes')
      .selectAll('text')
      .data(attributesOrder)
      .join('text')
      .attr('class', 'table-attribute')
      // .attr('font-size', 16)
      .text(function (d) {
        // 判断文字是否过长
        const originText = attributesMap.get(d)?.name || ''
        let words = originText.split('').reverse()
        let tspan = d3.select(this).append('tspan')
        let line = []
        let word
        const wordWidth = titleHeight //需要修改
        while ((word = words.pop())) {
          line.push(word)
          tspan.text(line.join(''))
          if (tspan.node()!.getComputedTextLength() > wordWidth) {
            line.pop()
            line.splice(line.length - 2, 3, '.', '.', '.')
            tspan.text(line.join(''))
            break
          }
        }
        tspan.remove()
        let res = line.join('')
        if (res !== originText) {
          d3.select(this).attr('title', originText)
        }
        return line.join('')
      })
      .on('click', (e, d) => {
        attributeClick(d)
      })
      .attr('text-anchor', 'start')
      .transition()
      .duration(duration)
      .attr('y', 3)   //可能需要修改
      .attr('x', (d, i) => {
        return xList[i] - 7 - (attributesOpenMap.get(d) ? openedAttributeWidth - 20 : 0)
      })
    // 过长的attribute文字title
    tableSvg
      .selectAll('.table-attribute')
      .append('title')
      .text(function () {
        return d3.select(d3.select(this).node()?.parentNode as any).attr('title') || ''
      })
    // 表格信息
    tableSvg
      .select('.table-concepts')
      .selectAll('rect')
      .data(tableData)
      .join('rect')
      .transition()
      .duration(duration)
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .attr('width', (d) => d.width)
      .attr('height', (d) => d.height)
      .attr('class', (d) => d.class)
    tableSvg
      .select('.table-concepts')
      .selectAll('circle')
      .data(circleData)
      .join('circle')
      .transition()
      .duration(duration)
      .attr('cx', (d) => d.cx)
      .attr('cy', (d) => d.cy)
      .attr('r', (d) => d.r)
      .attr('class', (d) => d.class)
    // 展开的表格

    const yAxis = tableSvg.select('.attributes-detail').selectAll('line.y-axis').data(chartData)
    // 添加y轴
    const yAxisEnter = yAxis
      .enter()
      .append('line')
      .attr('class', 'y-axis')
      .attr('x1', (d) => d.xRange[0])
      .attr('y1', (d) => d.yRange[0])
      .attr('x2', (d) => d.xRange[0])
      .attr('y2', (d) => d.yRange[0])
      .attr('stroke', '#545454')
      .attr('marker-end', 'url(#arrow)')
    // 更新y轴
    const yAxisUpdate = yAxisEnter.merge(yAxis as any)
    yAxisUpdate
      .transition()
      .duration(duration)
      .attr('x1', (d) => d.xRange[0])
      .attr('y1', (d) => d.yRange[1])
      .attr('x2', (d) => d.xRange[0])
      .attr('y2', (d) => d.xRange[0])
      .attr('stroke', '#545454')
      .attr('marker-end', 'url(#arrow)')
    // 移除y轴
    yAxis
      .exit()
      .attr('marker-end', '')
      .transition()
      .duration(duration)
      .attr('x1', (d: any) => d.xRange[0])
      .attr('y1', (d: any) => d.yRange[1])
      .attr('x2', (d: any) => d.xRange[0])
      .attr('y2', (d: any) => d.yRange[0])
      .remove()

    const xAxis = tableSvg.select('.attributes-detail').selectAll('line.x-axis').data(chartData)
    // 添加x轴
    const xAxisEnter = xAxis
      .enter()
      .append('line')
      .attr('class', 'x-axis')
      .attr('x1', (d) => d.xRange[0])
      .attr('y1', (d) => d.yRange[1])
      .attr('x2', (d) => d.xRange[1])
      .attr('y2', (d) => d.yRange[1])
      .attr('stroke', '#545454')
      .attr('marker-end', 'url(#arrow)')
    // 更新x轴
    const xAxisUpdate = xAxisEnter.merge(xAxis as any)
    xAxisUpdate
      .transition()
      .duration(duration)
      .attr('x1', (d) => d.xRange[0])
      .attr('y1', (d) => d.yRange[1])
      .attr('x2', (d) => d.xRange[1])
      .attr('y2', (d) => d.xRange[1])
      .attr('stroke', '#545454')
      .attr('marker-end', 'url(#arrow)')
      .attr('stroke', '#000')
    // 移除x轴
    xAxis
      .exit()
      .attr('marker-end', '')
      .transition()
      .duration(duration)
      .attr('x1', (d: any) => d.xRange[0])
      .attr('y1', (d: any) => d.yRange[1])
      .attr('x2', (d: any) => d.xRange[1])
      .attr('y2', (d: any) => d.yRange[1])
      .remove()

    const xText = tableSvg.select('.attributes-detail').selectAll('text.x-text').data(xTextData)
    // 添加x轴文字
    xText
      .join('text')
      .attr('class', 'x-text')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .attr('text-anchor', 'end')
      .attr('font-size', 14)
      .attr('transform', 'rotate(-60)') // 添加这行代码以使文字从左下方向右上方显示
      .text((d) => d.text)
      .text(function (d) {
      // 判断文字是否过长
      const originText = '' + d.text || ''
      let words = originText.split('').reverse()
      let tspan = d3.select(this).append('tspan')
      let line = []
      let word
      const wordWidth = 1.154 * (titleHeight - yRange[1])
      while ((word = words.pop())) {
        line.push(word)
        tspan.text(line.join(''))
        if (tspan.node()!.getComputedTextLength() > wordWidth) {
        line.pop()
        line.splice(line.length - 2, 3, '.', '.', '.')
        tspan.text(line.join(''))
        break
        }
      }
      tspan.remove()
      return line.join('')
      })
      .append('title')
      .text((d: any) => {
      return d.text
      })

    const yText = tableSvg.select('.attributes-detail').selectAll('text.y-text').data(yTextData)
    // 添加y轴文字
    yText
      .join('text')
      .attr('class', 'y-text')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .attr('text-anchor', 'end')
      .attr('font-size', 12)
      .text((d) => d.text)

    const lineChart = tableSvg
      .select('.attributes-detail')
      .selectAll('g.line-chart')
      .data(chartData.filter((d) => d.type === 'number'))

    // 添加折线图
    const lineChartEnter = lineChart.enter().append('g').attr('class', 'line-chart')
    lineChartEnter
      .append('clipPath')
      .attr('id', (d) => 'line-chart-clip-' + d.id)
      .append('path')
      .attr('d', (chart) => {
        const line = d3
          .line()
          .x((d) => chart.xScale(d[0]))
          .y((d) => chart.yScale(d[1]))
          .curve(d3.curveCatmullRom.alpha(0.5))
        let d = line(chart.yData) || ''//可能需要修改
        let firstPoint = d.split('C')[0].replace('M', '').split(',')
        let lastPoint = d.split(',').slice(-2)
        d = d.replace('M', `M${chart.xScale(0)},${firstPoint[1]}L`)
        d += `L${chart.xScale(0)},${lastPoint[1]}Z`
        return d
      })
    lineChartEnter
      .append('rect')
      .attr('class', 'line-chart-rect')
      .attr('x', (d) => d.xRange[0])
      .attr('y', (d) => d.yRange[1])
      .attr('height', (d) => d.yRange[1] - d.yRange[0])
      .attr('width', 0)
      .attr('clip-path', (d) => `url(#line-chart-clip-${d.id})`)
    // 更新折线图
    const lineChartUpdate = lineChartEnter.merge(lineChart as any)
    lineChartUpdate
      .select('rect')
      .transition()
      .duration(duration)
      .attr('x', (d) => d.xRange[0])
      .attr('y', (d) => d.yRange[1])
      .attr('width', (d) => d.xRange[1] - d.xRange[0])

    lineChartUpdate
      .select('clipPath')
      .select('path')
      .attr('d', (chart) => {
        const line = d3
          .line()
          .x((d) => chart.xScale(d[0]))
          .y((d) => chart.yScale(d[1]))
          .curve(d3.curveCatmullRom.alpha(0.5))
        let d = line(chart.yData) || ''
        let firstPoint = d.split('C')[0].replace('M', '').split(',')
        let lastPoint = d.split(',').slice(-2)
        d = d.replace('M', `M${chart.xScale(0)},${firstPoint[1]}L`)
        d += `L${chart.xScale(0)},${lastPoint[1]}Z`
        return d
      })

    // 移除折线图
    const lineExit = lineChart.exit().transition().duration(duration).remove()
    lineExit.select('rect').attr('width', 0)

    const barChart = tableSvg
      .select('.attributes-detail')
      .selectAll('g.bar-chart')
      .data(chartData.filter((d) => d.type === 'string'))

    // 添加柱状图
    const barChartEnter = barChart.enter().append('g').attr('class', 'bar-chart')
    const barChartClip = barChartEnter
      .append('clipPath')
      .attr('id', (d) => 'bar-chart-clip-' + d.id)
    barChartClip
      .selectAll('rect')
      .data((d: any) => {
        let res = []
        for (let name of d.xData) {
          res.push({
            name,
            yScale: d.yScale,
            xScale: d.xScale,
            yData: d.yData
          })
        }
        return res
      })
      .join('rect')
      .attr('y', (d, i) => d.yScale(d.yData[i]))
      .attr('x', (d) => d.xScale(d.name) + d.xScale.bandwidth() * 0.25)
      .attr('height', (d, i) => yRange[1] - d.yScale(d.yData[i]))
      .attr('width', (d) => d.xScale.bandwidth() * 0.5)

    barChartEnter
      .append('rect')
      .attr('class', 'bar-chart-rect')
      .attr('x', (d) => d.xRange[0])
      .attr('y', (d) => d.yRange[0])
      .attr('height', (d) => d.yRange[1] - d.yRange[0])
      .attr('width', 0)
      .attr('clip-path', (d) => `url(#bar-chart-clip-${d.id})`)
    // 更新柱状图
    const barChartUpdate = barChartEnter.merge(barChart as any)
    barChartUpdate
      .select('rect.bar-chart-rect')
      .attr('clip-path', (d) => `url(#bar-chart-clip-${d.id})`)
      .transition()
      .duration(duration)
      .attr('x', (d) => d.xRange[0])
      .attr('y', (d) => d.yRange[0])
      .attr('width', (d) => d.xRange[1] - d.xRange[0])

    barChartUpdate
      .select('clipPath')
      .attr('id', (d) => 'bar-chart-clip-' + d.id)
      .selectAll('rect')
      .data((d: any) => {
        let res = []
        for (let name of d.xData) {
          res.push({
            name,
            yScale: d.yScale,
            xScale: d.xScale,
            yData: d.yData
          })
        }
        return res
      })
      .join('rect')
      .transition()
      .duration(duration)
      .attr('y', (d, i) => d.yScale(d.yData[i]))
      .attr('x', (d, i) => d.xScale(d.name) + d.xScale.bandwidth() * 0.25)
      .attr('height', (d, i) => yRange[1] - d.yScale(d.yData[i]))
      .attr('width', (d) => d.xScale.bandwidth() * 0.5)

    // 移除柱状图
    const barExit = barChart.exit().transition().duration(duration).remove()
    barExit.select('rect.bar-chart-rect').attr('width', 0)

    const highlightClip = tableSvg
      .select('.highlight')
      .selectAll('g.hightlight-clip')
      .data(highlightData)

    const highlightClipEnter = highlightClip.enter().append('g').attr('class', 'hightlight-clip')

    highlightClipEnter
      .append('rect')
      .attr('class', 'highlight-rect')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .attr('width', (d) => d.width)
      .attr('height', (d) => 0)
      .attr('clip-path', (d) => d.clipPath)
    const highlightClipUpdate = highlightClipEnter.merge(highlightClip as any)
    highlightClipUpdate
      .select('rect.highlight-rect')
      .attr('clip-path', (d) => d.clipPath)
      .transition()
      .duration(duration)
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .attr('width', (d) => d.width)
      .attr('height', (d) => d.height)
    const highlightClipExit = highlightClip.exit().remove()
    highlightClipExit.select('rect.highlight-rect').remove()
  }, [
    table,
    subgroupOrder,
    attributesOrder,
    attributesOpenMap,
    attributesMap,
    subgroupMap,
    clickHandle
  ])

  useEffect(() => {
    if (maxWidth <= width) {
      d3.select('#SubgroupTable').attr('viewBox', `0 0 ${width} ${height}`)
    }
  }, [maxWidth, width])

  return (
    <>
      <svg
        className="SubgroupTable"
        id="SubgroupTable"
        ref={table}
        x={30}
        y={35}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
      >
        <g className="table-bg"></g>
        <g className="table-lines" stroke="#000">
          <line x1={0} y1={0} x2={width} y2={0}></line>
          <g className="under-lines"></g>
          <g className="left-lines"></g>
        </g>
        <g className="table-attributes" fontSize={18}></g>
        <g className="table-subgroups"></g>
        <g className="attributes-detail"></g>
        <g className="highlight"></g>
      </svg>
      {maxWidth > width && (
        <Slider
          width={width}
          height={6}
          vertical={true}  //这里vertical定义有误，表示是否为横向滑块
          max={maxWidth}
          min={0}
          value={0}
          titleId=""
          matrixId=""
          x={30 - width}
          y={height + 35 + 5}
        ></Slider>
      )}
    </>
  )
}
