import { useSelector, useDispatch } from 'react-redux'

import Slider from './Slider'

import './Decision.scss'
import { useState } from 'react'
import { setSelectConcept, setSelectRules } from '../../features/concept/conceptSlice'

export interface DecisionRuleData {
  id: number
  name: string
  count: number
  data: { no: number[]; yes: number[] }
  outcome: { [key: string]: number }
}

interface DecisionProps {
  ruleMap: Map<number, DecisionRuleData>
}

interface DecisionRulesProps {
  rulesOrder: number[]
  ruleMap: Map<number, DecisionRuleData>
  titleHeight: number
  decisionRuleWidth: number
}

interface DecisionRuleProps {
  id: number
  count: number
  maxCount: number
  pos: number[]
}

interface DecisionMatrixProps {
  rulesOrder: number[]
  conceptsOrder: number[]
  ruleMap: Map<number, DecisionRuleData>
  margin: { left: number; top: number; right: number; bottom: number }
  decisionRuleWidth: number
}

export default function Decision(props: DecisionProps) {
  const { ruleMap } = props
  const conceptsOrder: number[] = useSelector((state: any) => state.concept.conceptsOrder)
  const rulesOrder: number[] = useSelector((state: any) => state.concept.rulesOrder)

  const x = 670
  const titleHeight = 120
  const margin = { left: 20, top: 20, right: 20, bottom: 20 }
  const height = 900
  const width = 780
  const decisionRuleWidth = 80

  return (
    <>
      <svg
        id="decisionRulesSvg"
        height={titleHeight}
        width={width}
        viewBox={`0 0 ${width} ${titleHeight}`}
        x={x}
      >
        {/* <DecisionRules
          rulesOrder={rulesOrder}
          ruleMap={ruleMap}
          titleHeight={titleHeight}
          decisionRuleWidth={decisionRuleWidth}
        ></DecisionRules> */}
      </svg>
      <svg
        id="decisionMatrixSvg"
        height={height - titleHeight}
        width={width}
        viewBox={`0 0 ${width} ${height - titleHeight}`}
        x={x}
        y={titleHeight}
      >
        <g className="decision" transform="translate(0, 0)">
          <DecisionMatrix
            rulesOrder={rulesOrder}
            conceptsOrder={conceptsOrder}
            ruleMap={ruleMap}
            margin={margin}
            decisionRuleWidth={decisionRuleWidth}
          ></DecisionMatrix>
        </g>
      </svg>
      {/* 底部滚动条 */}
      {rulesOrder.length * decisionRuleWidth + margin.left * 2 > width && (
        <Slider
          width={width}
          height={height}
          vertical={true}
          max={rulesOrder.length * decisionRuleWidth + margin.left * 2}
          min={0}
          value={0}
          titleId="decisionRulesSvg"
          matrixId="decisionMatrixSvg"
          x={x}
          y={0}
        ></Slider>
      )}
      {/* 右侧滚动条 */}
      {conceptsOrder.length * (50 + margin.top) - margin.top > height - titleHeight && (
        <Slider
          width={height}
          height={height - titleHeight}
          vertical={false}
          max={conceptsOrder.length * (50 + margin.top) - margin.top}
          min={0}
          value={0}
          titleId=""
          matrixId=""
          x={x + width + margin.right}
          y={-height + titleHeight}
        ></Slider>
      )}
    </>
  )
}

const DecisionRules = (props: DecisionRulesProps) => {
  const { ruleMap, rulesOrder, titleHeight, decisionRuleWidth } = props
  const decisionRules: DecisionRuleProps[] = []
  let maxCount = Math.max(...Array.from(ruleMap.values()).map((rule) => rule.count))

  for (let i = 0; i < rulesOrder.length; i++) {
    let rule = ruleMap.get(rulesOrder[i])
    if (rule === undefined) continue
    decisionRules.push({
      id: rule.id,
      count: rule.count,
      maxCount: maxCount,
      pos: [i * decisionRuleWidth + 50, titleHeight]
    })
  }

  return (
    <g className="decision-rules">
      {decisionRules.map((decisionRule) => {
        return (
          <DecisionRule
            key={decisionRule.id}
            id={decisionRule.id}
            count={decisionRule.count}
            maxCount={decisionRule.maxCount}
            pos={decisionRule.pos}
          ></DecisionRule>
        )
      })}
    </g>
  )
}

const DecisionRule = (props: DecisionRuleProps) => {
  const { id, count, maxCount, pos } = props
  const x = -15
  const maxBarHeight = 80
  const minBarHeight = 5
  const k = (maxBarHeight - minBarHeight) / maxCount
  const barHeight = minBarHeight + k * count
  const y = -20 - barHeight
  const barWidth = 30
  return (
    <g transform={`translate(${pos[0]}, ${pos[1]})`} className="decision-rule">
      <text className="decision-rule-name" textAnchor="middle">
        R{id}
      </text>
      <rect className="decision-rule-bar" x={x} y={y} width={barWidth} height={barHeight}></rect>
      <text className="decision-rule-count" textAnchor="middle" y={-25 - barHeight}>
        {count}
      </text>
    </g>
  )
}

const DecisionMatrix = (props: DecisionMatrixProps) => {
  const dispatch = useDispatch()
  const { rulesOrder, conceptsOrder, ruleMap, margin, decisionRuleWidth } = props
  const selectConcept: number = useSelector((state: any) => state.concept.selectConcept)
  const selectRules: number[] = useSelector((state: any) => state.concept.selectRules)

  const positive: [number, number][] = []
  const negative: [number, number][] = []
  const conceptOrderMap = new Map<number, number>()
  for (let i = 0; i < conceptsOrder.length; i++) {
    conceptOrderMap.set(conceptsOrder[i], i)
  }

  for (let y = 0; y < rulesOrder.length; y++) {
    let rule = ruleMap.get(rulesOrder[y])
    if (rule === undefined) continue
    for (let i of rule.data.yes) {
      if (conceptOrderMap.get(i) === undefined) continue
      positive.push([y, conceptOrderMap.get(i) || 0])
    }
    for (let i of rule.data.no) {
      if (conceptOrderMap.get(i) === undefined) continue
      negative.push([y, conceptOrderMap.get(i) || 0])
    }
  }

  const circleClickHandle = (pos: [number, number]) => {
    if (selectConcept === pos[1]) {
      dispatch(setSelectConcept(-1))
      dispatch(setSelectRules([]))
    } else {
      dispatch(setSelectConcept(pos[1]))
      dispatch(setSelectRules([1, 3]))
    }
  }

  return (
    <g transform="translate(0, 0)">
      {selectConcept !== -1 && (
        <>
          <g className="selectColumn">
            <rect
              x={selectRules[0] * decisionRuleWidth + 25}
              y={margin.top}
              width={50}
              height={conceptsOrder.length * (50 + margin.top) - margin.top}
              fill={'#FBE7C7'}
              rx={5}
            ></rect>
            <rect
              x={selectRules[1] * decisionRuleWidth + 25}
              y={margin.top}
              width={50}
              height={conceptsOrder.length * (50 + margin.top) - margin.top}
              fill={'#FBE7C7'}
              rx={5}
            ></rect>
          </g>
          <g className="selectRow">
            <rect
              x={20}
              y={selectConcept * 50 + margin.top * (selectConcept + 1)}
              width={rulesOrder.length * decisionRuleWidth - 20}
              height={50}
              fill={'none'}
              stroke={'#555'}
              rx={5}
            ></rect>
          </g>
        </>
      )}
      <g className="positive">
        {positive.map((pos, index) => {
          return (
            <circle
              key={index}
              cx={pos[0] * decisionRuleWidth + 50}
              cy={pos[1] * 50 + margin.top * (pos[1] + 1) + 25}
              r={20}
              fill="#404040"
              onClick={() => circleClickHandle(pos)}
            ></circle>
          )
        })}
      </g>
      <g className="negative">
        {negative.map((pos, index) => {
          return (
            <circle
              key={index}
              cx={pos[0] * decisionRuleWidth + 50}
              cy={pos[1] * 50 + margin.top * (pos[1] + 1) + 25}
              r={20}
              fill="#fff"
              stroke="#000"
              onClick={() => circleClickHandle(pos)}
            ></circle>
          )
        })}
      </g>
    </g>
  )
}
