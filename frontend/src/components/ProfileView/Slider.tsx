import * as d3 from 'd3'
import { useEffect, useRef } from 'react'

interface SliderProps {
  width: number
  height: number
  vertical: boolean
  max: number
  min: number
  value: number
  titleId: string
  matrixId: string
  x: number
  y: number
}

export default function Slider(props: SliderProps) {
  const { width, height, vertical, max, min, value, titleId, matrixId, x, y } = props

  const slider = useRef(null)
  const sliderBar = useRef(null)

  useEffect(() => {
    const sliderBarDom = d3.select(sliderBar.current)
    const conceptViewTableDom = d3.select('#conceptViewTable')
    let y = +sliderBarDom.attr('y')
    y = Math.max(width, y)
    y = Math.min(width + height - +sliderBarDom.attr('height'), y)
    // 滚动条位置
    sliderBarDom.attr('y', height)
    y -= width
    const originconceptViewTableBox = conceptViewTableDom.attr('viewBox')
    const conceptViewTableBox = originconceptViewTableBox.split(' ')
    conceptViewTableBox[1] = `${(y * (max - min)) / height}`
    conceptViewTableDom.attr('viewBox', conceptViewTableBox.join(' '))
  }, [height, max, min, width])

  useEffect(() => {
    const sliderBarDom = d3.select(sliderBar.current)
    if (vertical) {
      const matrixSvgDom = d3.select('#' + matrixId)
      // const titleSvgDom = d3.select('#' + titleId)
      const drag = d3.drag().on('drag', function (d) {
        let x = +sliderBarDom.attr('x') + d.sourceEvent.movementX

        x = Math.max(0, x)
        x = Math.min(width - +sliderBarDom.attr('width'), x)
        // 滚动条位置
        sliderBarDom.attr('x', x)

        // 主图位置
        const originViewBox = matrixSvgDom.attr('viewBox')
        const viewBox = originViewBox.split(' ')
        viewBox[0] = `${(x * (max - min)) / width}`
        matrixSvgDom.attr('viewBox', viewBox.join(' '))
        // // 标题位置
        // const originTitleViewBox = titleSvgDom.attr('viewBox')
        // const titleViewBox = originTitleViewBox.split(' ')
        // titleViewBox[0] = `${(x * (max - min)) / width}`
        // titleSvgDom.attr('viewBox', titleViewBox.join(' '))
      })
      sliderBarDom.call(drag as any)
    } else {
      // const matrixSvgDom = d3.select('#matrixSvg')
      // const coverageSvgDom = d3.select('#coverageSvg')
      // const profileSvgDom = d3.select('#profileSvg')
      // const decisionMatrixSvgDom = d3.select('#decisionMatrixSvg')
      // const drag = d3.drag().on('drag', function (d) {
      //   let y = +sliderBarDom.attr('y') + d.sourceEvent.movementY
      //   y = Math.max(width, y)
      //   y = Math.min(width + height - +sliderBarDom.attr('height'), y)
      //   // 滚动条位置
      //   sliderBarDom.attr('y', y)
      //   y -= width
      //   // 规则矩阵位置
      //   const originViewBox = matrixSvgDom.attr('viewBox')
      //   const matrixViewBox = originViewBox.split(' ')
      //   matrixViewBox[1] = `${(y * (max - min)) / height}`
      //   matrixSvgDom.attr('viewBox', matrixViewBox.join(' '))
      //   // 覆盖率位置
      //   const originCoverageViewBox = coverageSvgDom.attr('viewBox')
      //   const coverageViewBox = originCoverageViewBox.split(' ')
      //   coverageViewBox[1] = `${(y * (max - min)) / height}`
      //   coverageSvgDom.attr('viewBox', coverageViewBox.join(' '))
      //   // 决策矩阵位置
      //   const originDecisionMatrixViewBox = decisionMatrixSvgDom.attr('viewBox')
      //   const decisionMatrixViewBox = originDecisionMatrixViewBox.split(' ')
      //   decisionMatrixViewBox[1] = `${(y * (max - min)) / height}`
      //   decisionMatrixSvgDom.attr('viewBox', decisionMatrixViewBox.join(' '))
      //   // 简介位置
      //   const originProfileViewBox = profileSvgDom.attr('viewBox')
      //   const profileViewBox = originProfileViewBox.split(' ')
      //   profileViewBox[1] = `${(y * (max - min)) / height}`
      //   profileSvgDom.attr('viewBox', profileViewBox.join(' '))
      // })
      const conceptViewTableDom = d3.select('#conceptViewTable')
      const drag = d3.drag().on('drag', function (d) {
        let y = +sliderBarDom.attr('y') + d.sourceEvent.movementY
        y = Math.max(width, y)
        y = Math.min(width + height - +sliderBarDom.attr('height'), y)
        // 滚动条位置
        sliderBarDom.attr('y', y)
        y -= width
        const originconceptViewTableBox = conceptViewTableDom.attr('viewBox')
        const conceptViewTableBox = originconceptViewTableBox.split(' ')
        conceptViewTableBox[1] = `${(y * (max - min)) / height}`
        conceptViewTableDom.attr('viewBox', conceptViewTableBox.join(' '))
      })
      sliderBarDom.call(drag as any)
    }
  }, [height, matrixId, max, min, titleId, vertical, width])

  return vertical ? (
    <g className="slider" transform={`translate(${x}, ${y})`}>
      <rect
        ref={slider}
        rx={3}
        width={width}
        height={6}
        x={0}
        y={height}
        fill="none"
        stroke="#ccc"
      ></rect>
      <rect
        ref={sliderBar}
        rx={3}
        width={(width / max) * width}
        height={6}
        x={(value * width) / (max - min)}
        y={height}
        fill="#ccc"
      ></rect>
    </g>
  ) : (
    <g className="slider" transform={`translate(${x}, ${y})`}>
      <rect
        ref={slider}
        rx={3}
        width={6}
        height={height}
        x={0}
        y={width}
        fill="none"
        stroke="#ccc"
      ></rect>
      <rect
        ref={sliderBar}
        rx={3}
        width={6}
        height={(height / max) * height}
        x={0}
        y={width}
        fill="#ccc"
      ></rect>
    </g>
  )
}
