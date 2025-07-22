import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AttributeProps, ConceptProps } from './ConceptView'

import * as d3 from 'd3'

import './ConceptViewTable.scss'
import { setFloatWindowType, updateEditConcept } from '../../features/concept/conceptSlice'
import Slider from '../ProfileView/Slider'

interface ConceptViewTableProps {
  attributesMap: Map<number, AttributeProps>
  conceptsMap: Map<number, ConceptProps>
}

const mergeRanges = (ranges: [number, number][]) => {
  if (ranges.length === 0) return []
  // 对ranges进行排序
  ranges.sort((a, b) => a[0] - b[0])

  // 初始化结果列表
  let result = [ranges[0]]

  for (let i = 1; i < ranges.length; i++) {
    let lastRange = result[result.length - 1]
    let currentRange = ranges[i]

    // 检查是否有重叠
    if (currentRange[0] <= lastRange[1]) {
      // 如果有重叠，合并范围
      lastRange[1] = Math.max(lastRange[1], currentRange[1])
    } else {
      // 如果没有重叠，将当前范围添加到结果列表中
      result.push(currentRange)
    }
  }

  return result
}

export default function ConceptViewTable(props: ConceptViewTableProps) {
  const table = useRef(null)
  const { attributesMap, conceptsMap } = props
  const conceptsOrder: number[] = useSelector((state: any) => state.concept.conceptsOrder)
  const attributesOrder: number[] = useSelector((state: any) => state.concept.attributesOrder)
  const selectConcept: number = useSelector((state: any) => state.concept.selectConcept)
  const selectSubgroups: number[] = useSelector((state: any) => state.concept.selectSubgroups)
  const titleWidth = 150
  const width = 678
  const height = 510
  // const rectWidth = (height - titleWidth) / (conceptsOrder.length || 1)
  const rectWidth = 30
  const [attributesOpenMap, setAttributesOpenMap] = useState(new Map<number, boolean>())
  const [maxHeight, setMaxHeight] = useState(0)
  let heightCount = 0
  const openedAttributeHeight = 150
  const closedAttributeHeight = 30
  const duration = 1000
  const xMargin = [25, 10]
  const dispatch = useDispatch()
  const yRange = [10, 60]
  const editConcept = useSelector((state: any) => state.concept.editConcept)
  const clickHandle = (id: number) => {
    dispatch(setFloatWindowType('all'))
    if (id === editConcept) {
      dispatch(updateEditConcept(-1))
    } else {
      dispatch(updateEditConcept(id))
    }
  }

  useEffect(() => {
    let attributesOpenMap = new Map<number, boolean>()
    attributesOpenMap.set(1, true)
    attributesOpenMap.set(2, true)
    attributesOpenMap.set(3, true)
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
    heightCount = 0
    xList.push(heightCount)
    attributesOrder.map((id: number) => {
      const attribute = attributesMap.get(id)
      if (!attribute) return null
      const xMin = heightCount
      if (attributesOpenMap.get(id)) {
        heightCount += openedAttributeHeight
      } else {
        heightCount += closedAttributeHeight
      }
      const xMax = heightCount
      xList.push(heightCount)

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
            yRange: [yRange[0] - xMargin[1] / 2, yRange[1]],
            type: 'number',
            id
          })
          xTextData.push({
            x: yScale(0) - 5,
            y: xScale(attribute.range[0]) + 5,
            text: attribute.range[0]
          })
          xTextData.push({
            x: yScale(0) - 5,
            y: xScale(attribute.range[1]) + 5,
            text: attribute.range[1]
          })
          yTextData.push({
            x: yScale(0),
            y: xScale(attribute.range[0]) - 5,
            text: 0
          })
          yTextData.push({
            x: yScale(yMax),
            y: xScale(attribute.range[0]) - 5,
            text: yMax < 1 ? yMax.toFixed(2) : yMax.toFixed(0)
          })
          yTextData.push({
            x: yScale(yMax),
            y: xScale(attribute.range[0])! - 15,
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
            yRange: [yRange[0] - xMargin[1] / 2, yRange[1]],
            type: 'string',
            id
          })
          attribute.range.map((v, i) => {
            xTextData.push({
              x: yScale(0) - 5,
              y: xScale(v)! + xScale.bandwidth() / 2 + 6,
              text: v
            })
          })
          yTextData.push({
            x: yScale(0),
            y: xScale(attribute.range[0])! - 5,
            text: 0
          })
          yTextData.push({
            x: yScale(yMax),
            y: xScale(attribute.range[0])! - 5,
            text: yMax < 1 ? yMax.toFixed(2) : yMax.toFixed(0)
          })
          yTextData.push({
            x: yScale(yMax),
            y: xScale(attribute.range[0])! - 15,
            text: 'Count'
          })
        }
      }
      // 表格内的所有矩形数据
      for (let i = 0; i < conceptsOrder.length; i++) {
        const concept = conceptsMap.get(conceptsOrder[i])
        if (!concept) return null
        for (let key of Object.keys(concept.orginCharts)) {
          if (+key === id) {
            const range = concept.orginCharts[+key]
            if (attribute.type === 'number') {
              let xScale = d3.scaleLinear().domain(attribute.range).range([xMin, xMax])
              if (attributesOpenMap.get(id)) {
                xScale = d3
                  .scaleLinear()
                  .domain(attribute.range)
                  .range([xMin + xMargin[0], xMax - xMargin[1]])
              }
              tableData.push({
                x: titleWidth + i * rectWidth + rectWidth / 3,
                y: xScale(range[0]),
                width: rectWidth / 3,
                height: xScale(range[1]) - xScale(range[0]),
                class: selectSubgroups.includes(concept.id) ? 'selected' : ''
              })
            } else if (attribute.type === 'string') {
              // console.log(attribute, range)

              let xScale = d3.scaleBand().domain(attribute.range).range([xMin, xMax])
              if (attributesOpenMap.get(id)) {
                xScale = d3
                  .scaleBand()
                  .domain(attribute.range)
                  .range([xMin + xMargin[0], xMax - xMargin[1]])
              }
              const r = Math.min(xScale.bandwidth() * 0.25, rectWidth / 2)
              for (let j = 0; j < range.length; j++) {
                circleData.push({
                  cx: titleWidth + i * rectWidth + (rectWidth - r * 2) / 2 + r,
                  cy: (xScale(range[j]) || 0) + xScale.bandwidth() / 2,
                  r: r,
                  class: selectSubgroups.includes(concept.id) ? 'selected' : ''
                })
              }
            }
          }
        }
      }
    })
    if (xList.length === 1) return
    if (selectSubgroups.length > 0) {
      attributesMap.forEach((attribute) => {
        // console.log(attribute)

        const range: any[] = []

        for (const subgroupId of selectSubgroups) {
          const concept = conceptsMap.get(subgroupId)
          if (concept && concept.orginCharts[+attribute.id]) {
            range.push([...concept.orginCharts[+attribute.id]])
          }
        }
        let chart
        for (let i = 0; i < chartData.length; i++) {
          if (chartData[i].id === +attribute.id) {
            chart = chartData[i]
            break
          }
        }
        if (!chart) {
          return
        }

        if (attribute.type === 'number') {
          const ranges = mergeRanges(range)
          for (const r of ranges) {
            highlightData.push({
              y: chart.yRange[0],
              x: chart.xScale(r[0]),
              height: chart.yRange[1] - chart.yRange[0],
              width: chart.xScale(r[1]) - chart.xScale(r[0]),
              clipPath: `url(#line-chart-clip-${attribute.id})`
            })
          }
        } else if (attribute.type === 'string') {
          const ranges = Array.from(new Set(range.flat()))
          for (let i = 0; i < ranges.length; i++) {
            let name: string = ranges[i]
            highlightData.push({
              y: chart.yRange[0],
              x: chart.xScale(name) + chart.xScale.bandwidth() * 0.25,
              height: chart.yRange[1] - chart.yRange[0],
              width: chart.xScale.bandwidth() * 0.5,
              clipPath: `url(#bar-chart-clip-${attribute.id})`
            })
          }
        }
      })
    }

    // const concept = conceptsMap.get(selectConcept)
    // if (concept) {
    //   Object.keys(concept.orginCharts).map((key) => {
    //     if (attributesOpenMap.get(+key)) {
    //       const attributes = attributesMap.get(+key)
    //       if (attributes) {
    //         const range = concept.orginCharts[+key]
    //         console.log(range)

    //         let chart
    //         for (let i = 0; i < chartData.length; i++) {
    //           if (chartData[i].id === +key) {
    //             chart = chartData[i]
    //             break
    //           }
    //         }
    //         if (!chart) return null
    //         if (attributes.type === 'number') {
    //           for (let i = 0; i < range.length; i++) {
    //             const _range = range[i]
    //             highlightData.push({
    //               y: chart.yRange[0],
    //               x: chart.xScale(_range[0]),
    //               height: chart.yRange[1] - chart.yRange[0],
    //               width: chart.xScale(_range[1]) - chart.xScale(_range[0]),
    //               clipPath: `url(#line-chart-clip-${key})`
    //             })
    //             // highlightData.push({
    //             //   x: chart.yRange[0],
    //             //   y: chart.xScale(range[0]),
    //             //   width: chart.yRange[1] - chart.yRange[0],
    //             //   height: chart.xScale(range[1]) - chart.xScale(range[0]),
    //             //   clipPath: `url(#line-chart-clip-${key})`
    //             // })
    //           }
    //         } else if (attributes.type === 'string') {
    //           for (let i = 0; i < range.length; i++) {
    //             let name: string = range[i]
    //             highlightData.push({
    //               x: chart.yRange[0],
    //               y: chart.xScale(name) + chart.xScale.bandwidth() * 0.25,
    //               width: chart.yRange[1] - chart.yRange[0],
    //               height: chart.xScale.bandwidth() * 0.5,
    //               clipPath: `url(#bar-chart-clip-${key})`
    //             })
    //           }
    //         }
    //       }
    //     }
    //   })
    // }

    setMaxHeight(heightCount + 5)
    tableSvg
      .select('.table-bg')
      .selectAll('rect')
      .data(conceptsOrder)
      .join('rect')
      // .on('click', (e, d) => {
      // clickHandle(d)
      // })
      .transition()
      .duration(duration)
      .attr('y', (d, i) => titleWidth + i * rectWidth)
      .attr('x', 0)
      .attr('height', rectWidth)
      .attr('width', heightCount)
      .attr('fill', '#fff')

    tableSvg
      .select('.attributes-bg')
      .selectAll('rect')
      .data(attributesOrder)
      .join('rect')
      .transition()
      .duration(duration)
      .attr('y', 0)
      .attr('x', (d, i) => xList[i])
      .attr('height', titleWidth)
      .attr('width', (d) =>
        attributesOpenMap.get(d) ? openedAttributeHeight : closedAttributeHeight
      )
      .attr('fill', '#fff')
      .attr('stroke', '#e3e2e7')
      .attr('stroke-width', 1)

    // 表格横向线
    tableSvg
      .select('.table-lines')
      .select('.under-lines')
      .selectAll('line')
      .data(conceptsOrder.concat([-1, -2]))
      .join('line')
      .transition()
      .duration(duration)
      .attr('y1', (d, i) => titleWidth + i * rectWidth)
      .attr('x1', 0)
      .attr('y2', (d, i) => titleWidth + i * rectWidth)
      .attr('x2', heightCount)
    // 表格纵向线
    tableSvg
      .select('.table-lines')
      .select('.left-lines')
      .selectAll('line')
      .data(xList)
      .join('line')
      .transition()
      .duration(duration)
      .attr('y1', 0)
      .attr('x1', (d) => d)
      .attr('y2', titleWidth + conceptsOrder.length * rectWidth)
      .attr('x2', (d) => d)

    // attribute文字显示
    tableSvg
      .select('.table-attributes')
      .selectAll('text')
      .data(attributesOrder)
      .join('text')
      .attr('class', 'table-attribute')
      .attr('font-size', 15)
      .text(function (d) {
        // 判断文字是否过长
        const originText = attributesMap.get(d)?.name || ''
        let words = originText.split('').reverse()
        let tspan = d3.select(this).append('tspan')
        let line = []
        let word
        const wordWidth = attributesOpenMap.get(d) ? openedAttributeHeight : titleWidth - 10
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
      .attr('y', titleWidth - 3)
      .attr('x', (d, i) => {
        return xList[i]
      })
      .attr('transform-origin', (d, i) => {
        if (attributesOpenMap.get(d)) {
          return ''
        } else {
          return `${xList[i] + 10} ${titleWidth - 15}`
        }
      })
      .attr('transform', (d) => {
        if (attributesOpenMap.get(d)) {
          return ''
        } else {
          return 'rotate(-90)'
        }
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
      .attr('y', (d) => d.x)
      .attr('x', (d) => d.y)
      .attr('height', (d) => d.width)
      .attr('width', (d) => d.height)
      .attr('class', (d) => d.class)
    tableSvg
      .select('.table-concepts')
      .selectAll('circle')
      .data(circleData)
      .join('circle')
      .transition()
      .duration(duration)
      .attr('cy', (d) => d.cx)
      .attr('cx', (d) => d.cy)
      .attr('r', (d) => d.r)
      .attr('class', (d) => d.class)
    // 展开的表格

    const xAxis = tableSvg.select('.attributes-detail').selectAll('line.x-axis').data(chartData)

    // 添加x轴
    const xAxisEnter = xAxis
      .enter()
      .append('line')
      .attr('class', 'x-axis')
      .attr('y2', (d) => d.yRange[0])
      .attr('x2', (d) => d.xRange[0])
      .attr('y1', (d) => d.yRange[0])
      .attr('x1', (d) => d.xRange[0])
      .attr('stroke', '#545454')
      .attr('marker-end', 'url(#arrow)')
    // 更新x轴
    const xAxisUpdate = xAxisEnter.merge(xAxis as any)
    xAxisUpdate
      .transition()
      .duration(duration)
      .attr('y2', (d) => d.yRange[0])
      .attr('x2', (d) => d.xRange[0])
      .attr('y1', (d) => d.yRange[1])
      .attr('x1', (d) => d.xRange[0])
      .attr('stroke', '#545454')
      .attr('marker-end', 'url(#arrow)')
    // 移除x轴
    xAxis
      .exit()
      .attr('marker-end', '')
      .transition()
      .duration(duration)
      .attr('y2', (d: any) => d.yRange[0])
      .attr('x2', (d: any) => d.xRange[0])
      .attr('y1', (d: any) => d.yRange[0])
      .attr('x1', (d: any) => d.xRange[0])
      .remove()

    const yAxis = tableSvg.select('.attributes-detail').selectAll('line.y-axis').data(chartData)
    // 添加y轴
    const yAxisEnter = yAxis
      .enter()
      .append('line')
      .attr('class', 'y-axis')
      .attr('y1', (d) => d.yRange[1])
      .attr('x1', (d) => d.xRange[0])
      .attr('y2', (d) => d.yRange[1])
      .attr('x2', (d) => d.xRange[0])
      .attr('stroke', '#545454')
      .attr('marker-end', 'url(#arrow)')
    // 更新y轴
    const yAxisUpdate = yAxisEnter.merge(yAxis as any)
    yAxisUpdate
      .transition()
      .duration(duration)
      .attr('y1', (d) => d.yRange[1])
      .attr('x1', (d) => d.xRange[0])
      .attr('y2', (d) => d.yRange[1])
      .attr('x2', (d) => d.xRange[1])
      .attr('stroke', '#545454')
      .attr('marker-end', 'url(#arrow)')
      .attr('stroke', '#000')
    // 移除y轴
    yAxis
      .exit()
      .attr('marker-end', '')
      .transition()
      .duration(duration)
      .attr('y1', (d: any) => d.yRange[1])
      .attr('x1', (d: any) => d.xRange[0])
      .attr('y2', (d: any) => d.yRange[1])
      .attr('x2', (d: any) => d.xRange[0])
      .remove()

    const xText = tableSvg.select('.attributes-detail').selectAll('text.x-text').data(xTextData)
    // 添加x轴文字
    xText
      .join('text')
      .attr('class', 'x-text')
      .attr('y', (d) => d.x)
      .attr('x', (d) => d.y)
      .attr('text-anchor', 'end')
      .attr('font-size', 12)
      .attr('transform-origin', (d) => d.y + 8 + ' ' + (d.x + 8))
      .attr('transform', 'rotate(-65)')
      .text((d) => d.text)
      .text(function (d) {
        // 判断文字是否过长
        const originText = '' + d.text || ''
        let words = originText.split('').reverse()
        let tspan = d3.select(this).append('tspan')
        let line = []
        let word
        const wordWidth = 70
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
      .attr('y', (d) => d.x)
      .attr('x', (d) => d.y)
      .attr('text-anchor', 'end')
      .attr('font-size', 10)
      .attr('transform-origin', (d) => d.y + ' ' + d.x)
      .attr('transform', 'rotate(-90)')
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
        let d = line(chart.yData) || ''
        let firstPoint = d.split('C')[0].replace('M', '').split(',')
        let lastPoint = d.split(',').slice(-2)
        d = d.replace('M', `M${firstPoint[0]},${chart.yScale(0)}L`)
        d += `L${lastPoint[0]},${chart.yScale(0)}Z`
        return d
      })
    lineChartEnter
      .append('rect')
      .attr('class', 'line-chart-rect')
      .attr('y', (d) => d.yRange[0])
      .attr('x', (d) => d.xRange[0])
      .attr('height', (d) => d.yRange[1] - d.yRange[0])
      .attr('weight', 0)
      .attr('clip-path', (d) => `url(#line-chart-clip-${d.id})`)
    // 更新折线图
    const lineChartUpdate = lineChartEnter.merge(lineChart as any)
    lineChartUpdate
      .select('rect')
      .transition()
      .duration(duration)
      .attr('y', (d) => d.yRange[0])
      .attr('x', (d) => d.xRange[0])
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
        d = d.replace('M', `M${firstPoint[0]},${chart.yScale(0)}L`)
        d += `L${lastPoint[0]},${chart.yScale(0)}Z`
        return d
      })

    // 移除折线图
    const lineExit = lineChart.exit().transition().duration(duration).remove()
    lineExit.select('rect').attr('height', 0)

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
      .attr('y', (d) => d.yScale(0))
      .attr('x', (d) => d.xScale(d.name) + d.xScale.bandwidth() * 0.25)
      .attr('height', (d, i) => d.yScale(d.yData[i]) - yRange[0])
      .attr('width', (d) => d.xScale.bandwidth() * 0.5)

    barChartEnter
      .append('rect')
      .attr('class', 'bar-chart-rect')
      .attr('y', (d) => d.yRange[0])
      .attr('x', (d) => d.xRange[0])
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
      .attr('y', (d) => d.yRange[0])
      .attr('x', (d) => d.xRange[0])
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
      .attr('x', (d) => d.xScale(d.name) + d.xScale.bandwidth() * 0.25)
      .attr('height', (d) => d.yScale(0))
      .attr('width', (d) => d.xScale.bandwidth() * 0.5)

    // 移除柱状图
    const barExit = barChart.exit().transition().duration(duration).remove()
    barExit.select('rect.bar-chart-rect').attr('height', 0)

    const subgroupNamse = tableSvg
      .select('.subgroup-name')
      .selectAll('text.subgroup-name')
      .data(conceptsOrder)

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
    conceptsOrder,
    attributesOrder,
    attributesOpenMap,
    attributesMap,
    conceptsMap,
    clickHandle
  ])

  useEffect(() => {
    if (maxHeight <= height) {
      d3.select('#conceptViewTable').attr('viewBox', `0 0 ${width} ${height}`)
    }
    console.log(maxHeight)
  }, [maxHeight, height])

  return (
    <>
      <svg
        className="conceptViewTable"
        id="conceptViewTable"
        ref={table}
        x={50}
        y={10}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
      >
        <svg
          id="conceptViewTableContent"
          x={0}
          y={0}
          viewBox={`0 0 ${maxHeight} ${titleWidth + rectWidth * conceptsOrder.length}`}
          width={maxHeight}
          height={titleWidth + rectWidth * conceptsOrder.length}
        >
          <g className="table-bg"></g>
          <g className="table-lines" stroke="#000">
            <g className="under-lines"></g>
            <g className="left-lines"></g>
          </g>

          <g className="table-concepts"></g>
        </svg>
        {conceptsOrder.length > 0 && <line x1={0} y1={0} x2={maxHeight - 5} y2={0}></line>}
        <g className="attributes-bg"></g>
        <g className="table-attributes" fontSize={18}></g>
        <g className="attributes-detail"></g>
        <g className="highlight"></g>
      </svg>
      {maxHeight > width && (
        <Slider
          width={678}
          height={510}
          vertical={true}
          max={maxHeight}
          min={0}
          value={0}
          titleId=""
          matrixId="conceptViewTable"
          x={50}
          y={15}
        ></Slider>
      )}
    </>
  )
}
