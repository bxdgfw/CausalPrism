import { InputNumber, Radio, Select, Slider } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import useAxios from '../../hooks/useAxios'
import { DecisionRuleData } from '../ProfileView/Decision'
import * as d3 from 'd3'
import {
  setSelectConcept,
  setSelectSubgroups,
  setSelectRelationship,
  setSelectPair
} from '../../features/concept/conceptSlice'
import { ConceptProps } from '../ConceptView/ConceptView'

interface DecisionRulesProps {
  decisionRuleMap: Map<number, DecisionRuleData>
  conceptsMap: Map<number, ConceptProps>
}

interface ForestPlotProps {
  range: [number, number]
  relationships: realationship[]
  subgroup: { yes: number[]; no: number[]; id: number; count: number }[]
  treatment: number[]
}

interface realationship {
  id: number
  mean: number
  name: string
  subgroup: number
  confidence: [number, number]
  treatment: number
  treated: number
  count: number
  matchedDR: [number, number]
}

export default function DecisionRules(props: DecisionRulesProps) {
  const { decisionRuleMap, conceptsMap } = props

  // redux
  const dispatch = useDispatch()
  const conceptsOrder: number[] = useSelector((state: any) => state.concept.conceptsOrder)
  const rulesOrder: number[] = useSelector((state: any) => state.concept.rulesOrder)
  const selectConcept = useSelector((state: any) => state.concept.selectConcept)
  const selectSubgroup = useSelector((state: any) => state.concept.selectSubgroup)
  const selectOutcome = useSelector((state: any) => state.concept.selectOutcome)
  const selectRelationship = useSelector((state: any) => state.concept.selectRelationship)

  // axios
  const {
    data: forestData,
    error: forestError,
    refetch: forestRefetch
  } = useAxios(
    {
      url: '/api/get_subgroups',
      method: 'get',
      params: { concept_id: selectConcept }
    },
    { trigger: false }
  )
  const [forestDetails, setForestDetails] = useState<ForestPlotProps>({
    range: [0, 0],
    relationships: [],
    subgroup: [],
    treatment: []
  })

  // 一些用到的常量
  const width = 750
  const height = 840
  // Decision rules视图上 矩形的padding
  const margin = { left: 20, top: 5, right: 20, bottom: 10 }
  // Decision rules视图上 名称的宽度
  const decisionRuleNameWidth = 50
  // Decision rules视图上 矩形内Concept代表的正方形的宽高
  const conceptWidth = 14
  // Decision rules视图上 矩形内Concept代表的正方形的padding
  const conceptPadding = [5, 22]
  // Decision rules视图上 矩形的宽度
  const decisionRuleWidth =
    (conceptWidth + conceptPadding[1]) * conceptsOrder.length + conceptPadding[1]
  // Decision rules视图上 矩形的高度
  const decisionRuleHeight = 24
  // Decision rules视图上 柱状图的宽度
  const decisionRuleCountBarWidth = 140
  // Decision rules视图上 柱状图的高度
  const decisionRuleCountBarHeight = 20
  // Decision rules视图上 饼图的半径
  const decisionRulePieRadius = 13
  // Concepts到Subgroups的连线的高度
  const pathHeight = 140
  // Concepts文字到顶部的距离
  const conceptY = 10 * (decisionRuleHeight + margin.top) + 40 + decisionRuleHeight
  // subgroup部分柱状图的高度
  const subgroupCountHeight = 80
  // subgroup View 部分矩阵内正方形的宽高
  const treatmentWidth = 25
  // subgroup View 部分矩阵内正方形的padding
  const treatmentPadding = [5, 0]
  // subgroup View 部分矩阵内正方形裁切的最小宽度
  const minClipWidth = 5
  // subgroup View 部分矩阵内正方形裁切的最大宽度
  const maxClipWidth = 20
  //  Treatment部分柱状图的宽度
  const treatmentCountBarWidth = 100

  // Concepts到Subgroups的连线
  const line = d3
    .line()
    .x((d) => d[0])
    .y((d) => d[1])
    // .curve(d3.curveBasis)
    .curve(d3.curveBundle.beta(1))
  // .curve(d3.curveCatmullRom)

  // decistion rule Outcome颜色
  const outcomeBlue = d3.rgb(103, 169, 207)
  // treatment effect Negative颜色
  const red = d3.rgb(198, 114, 105)
  // treatment effect Positive颜色
  const green = d3.rgb(147, 179, 102)
  // treatment effect Neutral颜色
  const white = d3.rgb(255, 255, 255)
  const outcomeWhite = d3.rgb(240, 240, 240)
  // 渐近色
  const positive = d3.interpolate(d3.rgb(209, 216, 195), green)
  const negative = d3.interpolate(d3.rgb(220, 194, 190), red)
  const outcomeInterpolate = d3.interpolate(outcomeWhite, outcomeBlue)

  // treatment 选中的矩形
  let highlightRect = <></>

  // hooks
  // 区分有无积极影响的决策规则
  const [orderedDecisionRule, setOrderedDecisionRule] = useState<DecisionRuleData[]>([])
  const [matchedDecisionRule, setMatchedDecisionRule] = useState<DecisionRuleData[]>([])
  const [orderedMatchedDecisionRule, setOrderedMatchedDecisionRule] = useState<DecisionRuleData[]>(
    []
  )
  const [showType, setShowType] = useState<string>('all')

  // 统计这些subgroups用到的treatments
  const [treatments, setTreatments] = useState<number[]>([])
  // 计算每一个subgroup的宽度
  const [relationshipWidth, setRelationshipWidth] = useState<number>(0)
  // DecisionRules部分柱状图的最大值
  const [maxDecisionRuleCount, setMaxDecisionRuleCount] = useState<number>(0)
  // Subgroups部分柱状图的最大值
  const [maxSubgroupsCount, setSubgroupsMaxCount] = useState<number>(0)
  // Treatment部分柱状图的最大值
  const [maxTreatmentCount, setMaxTreatmentCount] = useState<number>(0)
  // 置信区间距离的最大值和最小值
  const [maxConfidence, setMaxConfidence] = useState<number>(0)
  const [minConfidence, setMinConfidence] = useState<number>(0)

  // 筛选条件
  const [countFilter, setCountFilter] = useState<number>(0)
  const [outcomeFilter, setOutcomeFilter] = useState<number>(0.5)
  const [conceptFilter, setConceptFilter] = useState<number[]>([])

  // 用于存储relationshi的数据
  const [relationshipMap, setRelationshipMap] = useState<Map<string, number>>(
    new Map<string, number>()
  )
  const [relationshipDetailMap, setRelationshipDetailMap] = useState<Map<number, realationship>>(
    new Map<number, realationship>()
  )

  const [highlightDecisionRule, setHighlightDecisionRule] = useState<[number, number]>([-1, -1])

  const slider = useRef(null)
  const sliderBar = useRef(null)

  // 计算DecisionRules部分柱状图的最大值
  useEffect(() => {
    let needed = (v: DecisionRuleData) => {
      let flag = true
      if (conceptFilter.length > 0) {
        let count = 0
        for (let i = 0; i < conceptFilter.length; i++) {
          for (let id of v.data.yes) {
            if (conceptFilter[i] === id) {
              count++
            }
          }
          for (let id of v.data.no) {
            if (conceptFilter[i] === id) {
              count++
            }
          }
        }
        flag = count === conceptFilter.length
      }

      return (
        flag && Math.max(v.outcome['0'], v.outcome['1']) >= outcomeFilter && v.count >= countFilter
      )
    }
    let arr = Array.from(decisionRuleMap.values())
      .sort((a, b) => a.outcome['0'] - b.outcome['0'])
      .filter(needed)
    let maxDecisionRuleCount = arr.reduce((acc, pre) => Math.max(acc, pre.count), 0)
    setMaxDecisionRuleCount(maxDecisionRuleCount)
    setOrderedDecisionRule(arr)
    let orderedMatchedDecisionRule = []
    for (let i = 0; i < matchedDecisionRule.length / 2; i++) {
      if (needed(matchedDecisionRule[2 * i]) && needed(matchedDecisionRule[2 * i + 1])) {
        orderedMatchedDecisionRule.push(matchedDecisionRule[2 * i])
        orderedMatchedDecisionRule.push(matchedDecisionRule[2 * i + 1])
      }
    }
    setOrderedMatchedDecisionRule(orderedMatchedDecisionRule)
  }, [decisionRuleMap, countFilter, outcomeFilter, conceptFilter, matchedDecisionRule])

  useEffect(() => {
    if (selectOutcome === '') return
    if (conceptsMap.size === 0) return
    forestRefetch()
  }, [selectOutcome, conceptsMap])

  useEffect(() => {
    if (!forestData) return
    setForestDetails(forestData.data)

    let maxConfidence = 0
    let minConfidence = 999
    let maxSubgroupsCount = 0
    let maxTreatmentCount = 0
    let relationshipMap = new Map<string, number>()
    let relationshipDetailMap = new Map<number, realationship>()
    let matchedDecisionRule: DecisionRuleData[] = []
    for (let i = 0; i < forestData.data.relationships.length; i++) {
      const relationship: realationship = forestData.data.relationships[i]
      relationshipMap.set(relationship.treatment + '&' + relationship.subgroup, relationship.id)
      relationshipDetailMap.set(relationship.id, relationship)
      if (decisionRuleMap.get(relationship.matchedDR[0]))
        matchedDecisionRule.push(decisionRuleMap.get(relationship.matchedDR[0])!)
      if (decisionRuleMap.get(relationship.matchedDR[1]))
        matchedDecisionRule.push(decisionRuleMap.get(relationship.matchedDR[1])!)
      maxConfidence = Math.max(
        maxConfidence,
        +(relationship.confidence[1] - relationship.confidence[0]).toFixed(2)
      )
      minConfidence = Math.min(
        minConfidence,
        +(relationship.confidence[1] - relationship.confidence[0]).toFixed(2)
      )
    }
    for (let i = 0; i < forestData.data.subgroup.length; i++) {
      const subgroup = forestData.data.subgroup[i]
      if (subgroup.id === 0) continue
      maxSubgroupsCount = Math.max(maxSubgroupsCount, subgroup.count)
    }
    maxSubgroupsCount = Math.max(maxSubgroupsCount, 1)

    let treatments = forestData.data.treatment
    for (let i = 0; i < treatments.length; i++) {
      const concept = conceptsMap.get(treatments[i])
      if (concept) {
        maxTreatmentCount = Math.max(maxTreatmentCount, concept.count)
      }
    }
    if (minConfidence === maxConfidence) {
      maxConfidence = 2 * minConfidence
    }
    setMatchedDecisionRule(matchedDecisionRule)
    setOrderedMatchedDecisionRule(matchedDecisionRule)
    setRelationshipMap(relationshipMap)
    setRelationshipDetailMap(relationshipDetailMap)
    setMaxConfidence(maxConfidence)
    setMinConfidence(minConfidence)
    setSubgroupsMaxCount(maxSubgroupsCount)
    setMaxTreatmentCount(maxTreatmentCount)
    setTreatments(treatments)
    setRelationshipWidth((750 - 150) / forestData.data.relationships.length)
  }, [conceptsMap, decisionRuleMap, forestData])

  // 滑动条
  useEffect(() => {
    const sliderBarDom = d3.select(sliderBar.current)
    const decisionRuleSvgDom = d3.select('#sync1')
    const height = 10 * (decisionRuleHeight + margin.top)
    const drag1 = d3.drag().on('drag', function (d) {
      let y = +sliderBarDom.attr('y') + d.sourceEvent.movementY
      y = Math.max(0, y)
      let maxY = height - +sliderBarDom.attr('height')
      y = Math.min(maxY, y)

      // 滚动条位置
      sliderBarDom.attr('y', y)
      const originBox = decisionRuleSvgDom.attr('viewBox')
      const newBox = originBox.split(' ')
      newBox[1] = `${
        (y / maxY) *
        ((showType === 'all' ? orderedDecisionRule.length : orderedMatchedDecisionRule.length) *
          (decisionRuleHeight + margin.top) -
          height +
          2)
      }`
      decisionRuleSvgDom.attr('viewBox', newBox.join(' '))
    })
    sliderBarDom.call(drag1 as any)
  })

  const selectRelationshipHandler = (treatment: number, subgroup: number) => {
    if (selectRelationship === relationshipMap.get(treatment + '&' + subgroup)) {
      dispatch(setSelectRelationship(-1))
      dispatch(setSelectSubgroups(-1))
      setHighlightDecisionRule([-1, -1])
    } else {
      let temp = treatment + '&' + subgroup
      if (relationshipMap.has(temp)) {
        let relationship = relationshipDetailMap.get(relationshipMap.get(temp)!)
        dispatch(setSelectRelationship(relationshipMap.get(temp)))
        dispatch(setSelectSubgroups(subgroup))
        setHighlightDecisionRule(relationship?.matchedDR || [-1, -1])
      }
    }
  }
  if (decisionRuleMap.size === 0) return <></>

  return (
    <>
      <svg id="subgroup-view" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="positive">
            <stop offset="0%" stopColor="rgb(209, 216, 195)"></stop>
            <stop offset="100%" stopColor="rgb(147, 179, 102)"></stop>
          </linearGradient>
          <linearGradient id="negative">
            <stop offset="0%" stopColor="rgb(198, 114, 105)"></stop>
            <stop offset="100%" stopColor="rgb(220, 194, 190)"></stop>
          </linearGradient>
        </defs>
        <g>
          {/* 标题 包含outcome的图例 */}
          <g className="title">
            <text x={175} y={25} fontSize={20} fontWeight={600}>
              <tspan>Decision</tspan>
              <tspan x={175} dy={20}>
                rules
              </tspan>
            </text>
            <g transform="translate(460, -20)">
              <rect x={5} y={30} width={15} height={15} className="include"></rect>
              <text fontSize={20} className="label legend">
                <tspan x={35} y={42.5}>
                  Include concepts
                </tspan>
              </text>
              <g transform="translate(0,20)">
                <rect x={5} y={30} width={15} height={15} className="exclude"></rect>
                <text fontSize={20} className="label legend">
                  <tspan x={35} y={42.5}>
                    Exclude concepts
                  </tspan>
                </text>
              </g>
            </g>
            {/* 二值图例 */}
            <g transform="translate(630, 15)">
              <path d="M0 0 L28 0"></path>
              <path d="M0 20 L28 20"></path>
              <circle cx={0} cy={10} r={15} className="label legend"></circle>
              <path d="M 0 -5 A 15 15  0 0 1 15 10 L0 10Z" fill="#F0F0F0" />
              <text x={30} y={6} className="label legend">
                Survival=0
              </text>
              <text x={30} y={24} className="label legend">
                Survival=1
              </text>
            </g>
          </g>
          {/* 决策树 */}
          <g>
            {/* 柱状图y轴 */}
            <g transform={`translate(${40}, ${decisionRuleNameWidth - 10})`}>
              <line
                x1={decisionRuleCountBarWidth - 20}
                x2={0}
                y1={0}
                y2={0}
                stroke={'#000'}
                strokeWidth={1}
                markerEnd="url(#arrow)"
              ></line>
              <text x={decisionRuleCountBarWidth - 20} textAnchor="middle" fontSize={12} y={-2}>
                0
              </text>
              <text x={30} textAnchor="end" fontSize={12} y={-2}>
                {maxDecisionRuleCount}
              </text>
              <text x={30} textAnchor="end" fontSize={16} y={-16}>
                Count
              </text>
            </g>
            <svg
              width={750}
              height={10 * (decisionRuleHeight + margin.top) + margin.top}
              viewBox={`0 0 750 ${10 * (decisionRuleHeight + margin.top) + margin.top}`}
              y={decisionRuleNameWidth}
              id={'sync1'}
            >
              {(showType === 'all' ? orderedDecisionRule : orderedMatchedDecisionRule).map(
                (rule, i) => {
                  // 决策树矩形
                  const conceptRects: JSX.Element[] = []
                  conceptsOrder.map((conceptId, j) => {
                    if (rule.data.yes.includes(conceptId)) {
                      conceptRects.push(
                        <rect
                          className="include"
                          key={rule.id + '-' + conceptId}
                          x={j * (conceptWidth + conceptPadding[1]) + conceptPadding[1]}
                          y={
                            i * (decisionRuleHeight + margin.top) +
                            decisionRuleHeight / 2 -
                            margin.top / 2 +
                            conceptPadding[0]
                          }
                          height={conceptWidth}
                          width={conceptWidth}
                          strokeWidth={2}
                        ></rect>
                      )
                    } else if (rule.data.no.includes(conceptId)) {
                      conceptRects.push(
                        <rect
                          className="exclude"
                          key={rule.id + '-' + conceptId}
                          x={j * (conceptWidth + conceptPadding[1]) + conceptPadding[1]}
                          y={
                            i * (decisionRuleHeight + margin.top) +
                            decisionRuleHeight / 2 -
                            margin.top / 2 +
                            conceptPadding[0]
                          }
                          height={conceptWidth}
                          width={conceptWidth}
                          strokeWidth={2}
                        ></rect>
                      )
                    }
                  })
                  const N = d3.map(Object.keys(rule.outcome), (d) => d)
                  const V = d3.map(Object.values(rule.outcome), (d) => d)
                  const I = d3.range(V.length).filter((i) => !isNaN(V[i]))
                  const arcs = d3
                    .pie()
                    .sort(null)
                    .value((i) => V[i as number])(I)
                  const arc = d3.arc().innerRadius(0).outerRadius(decisionRulePieRadius)

                  return (
                    <g key={rule.id} transform={`translate(${decisionRuleCountBarWidth + 40}, 0)`}>
                      <text
                        x={-5}
                        y={i * (decisionRuleHeight + margin.top) + decisionRuleHeight}
                        fontSize={20}
                        fontWeight={600}
                      >
                        DR{rule.id}
                      </text>
                      {/* decistion Rule 矩阵背景 */}
                      <rect
                        x={50}
                        y={
                          i * (decisionRuleHeight + margin.top) +
                          decisionRuleHeight / 2 -
                          margin.top / 2
                        }
                        height={decisionRuleHeight}
                        width={decisionRuleWidth}
                        fill="#fff"
                        stroke="#e3e2e7"
                        strokeWidth={3}
                        className={`${highlightDecisionRule.includes(rule.id) ? 'highlight' : ''}`}
                      ></rect>
                      {/* Concept正方形 */}
                      <g transform={`translate(${decisionRuleNameWidth},0)`}>
                        {conceptRects.map((rect) => {
                          return rect
                        })}
                      </g>
                      {/* count柱状图 */}
                      {maxDecisionRuleCount !== 0 && (
                        <rect
                          className="bar"
                          y={i * (decisionRuleHeight + margin.top) + decisionRuleHeight - 17}
                          x={-20 - (decisionRuleCountBarWidth * rule.count) / maxDecisionRuleCount}
                          width={(decisionRuleCountBarWidth * rule.count) / maxDecisionRuleCount}
                          height={decisionRuleCountBarHeight}
                        >
                          <title>{rule.count}</title>
                        </rect>
                      )}
                      {/* outcome饼图 */}
                      <g
                        transform={`translate(${
                          decisionRuleWidth +
                          decisionRuleNameWidth +
                          decisionRulePieRadius +
                          margin.right
                        }, ${
                          i * (decisionRuleHeight + margin.top) +
                          decisionRuleHeight -
                          margin.top / 2
                        })`}
                      >
                        {arcs.map((arcData, j) => {
                          return (
                            <path
                              key={rule.id + '-' + N[j]}
                              d={arc(arcData as any) || ''}
                              fill={outcomeInterpolate(+N[j])}
                            ></path>
                          )
                        })}
                      </g>
                    </g>
                  )
                }
              )}
            </svg>
            {((showType === 'all' && orderedDecisionRule.length >= 10) ||
              (showType === 'matched' && orderedMatchedDecisionRule.length >= 10)) && (
              <g
                className="slider"
                transform={`translate(${
                  conceptsOrder.length * (conceptWidth + conceptPadding[1]) +
                  conceptPadding[1] +
                  conceptWidth / 2 +
                  280
                }, ${decisionRuleNameWidth + 10})`}
              >
                <rect
                  ref={slider}
                  rx={3}
                  width={6}
                  height={10 * (decisionRuleHeight + margin.top)}
                  x={0}
                  y={0}
                  fill="none"
                  stroke="#ccc"
                ></rect>
                <rect
                  ref={sliderBar}
                  rx={3}
                  width={6}
                  height={
                    (10 /
                      ((showType === 'all'
                        ? orderedDecisionRule.length
                        : orderedMatchedDecisionRule.length) +
                        10)) *
                    (decisionRuleHeight + margin.top) *
                    10
                  }
                  x={0}
                  y={0}
                  fill="#ccc"
                ></rect>
              </g>
            )}
          </g>
          {/* Concept名称罗列 */}
          <g transform={`translate(230, ${conceptY})`}>
            <text x={0} y={15} textAnchor="end" fontSize={20} fontWeight={600}>
              Concepts
            </text>
            {conceptsOrder.map((conceptId, i) => {
              return (
                <text
                  key={conceptId}
                  x={i * (conceptWidth + conceptPadding[1]) + conceptPadding[1] + conceptWidth / 2}
                  y={15}
                  textAnchor="middle"
                  fontWeight={600}
                  fontSize={20}
                  id={'concept-' + conceptId}
                  onClick={() => {
                    if (selectConcept === conceptId) {
                      dispatch(setSelectConcept(-1))
                    } else {
                      dispatch(setSelectConcept(conceptId))
                      dispatch(setSelectSubgroups(-1))
                    }
                  }}
                >
                  C{conceptId}
                </text>
              )
            })}
          </g>
          {/* Subgroups详细信息 */}

          {forestDetails.relationships.length && (
            <g transform={`translate(240, ${conceptY + pathHeight})`}>
              <text y={-10} x={-30} textAnchor={'end'} fontWeight="600" fontSize={20}>
                Subgroups
              </text>
              <line
                x1={-relationshipWidth / 2}
                y1={subgroupCountHeight + margin.top}
                x2={-relationshipWidth / 2}
                y2={margin.top}
                strokeWidth={1}
                markerEnd="url(#arrow)"
              ></line>
              <text
                x={-relationshipWidth / 2 - margin.left / 2}
                y={margin.top * 3}
                textAnchor="end"
              >
                Size
              </text>
              <text
                x={-relationshipWidth / 2 - margin.left / 2}
                y={margin.top * 3 + 15}
                textAnchor="end"
                fontSize={12}
              >
                {maxSubgroupsCount}
              </text>
              <text
                x={-relationshipWidth / 2 - margin.left}
                y={subgroupCountHeight + margin.top}
                textAnchor="end"
                fontSize={12}
              >
                0
              </text>
              {forestDetails.subgroup.map((subgroup, i) => {
                const paths: JSX.Element[] = []
                const bgs: JSX.Element[] = []
                const bars: JSX.Element[] = []
                let treatInSubgroup = <></>
                // Concept 和 Subgroup之间的连线
                for (let conceptid of subgroup.yes) {
                  const concept = d3.select('#concept-' + conceptid)
                  try {
                    const start: [number, number] = [
                      +concept.attr('x') - 10,
                      +concept.attr('y') - pathHeight + 5
                    ]
                    const target: [number, number] = [relationshipWidth * i, -20]
                    paths.push(
                      <path
                        className="include"
                        key={conceptid + '-' + subgroup.id}
                        d={
                          line([
                            start,
                            [
                              start[0] + (target[0] - start[0]) / 16,
                              start[1] + (target[1] - start[1]) / 4
                            ],
                            [
                              start[0] + (target[0] - start[0]) / 2,
                              start[1] + (target[1] - start[1]) / 2
                            ],
                            [
                              target[0] - (target[0] - start[0]) / 16,
                              target[1] - (target[1] - start[1]) / 4
                            ],
                            target
                          ]) as string
                        }
                        fill="none"
                        strokeWidth={4}
                        opacity={
                          subgroup.id === selectSubgroup || selectConcept === conceptid ? 1 : 0.15
                        }
                      ></path>
                    )
                  } catch (e) {}
                }
                // Concept 和 Subgroup之间的连线
                for (let conceptid of subgroup.no) {
                  const concept = d3.select('#concept-' + conceptid)
                  try {
                    const start: [number, number] = [
                      +concept.attr('x') - 10,
                      +concept.attr('y') - pathHeight + 5
                    ]
                    const target: [number, number] = [relationshipWidth * i, -20]
                    paths.push(
                      <path
                        className="exclude"
                        key={conceptid + '-' + subgroup.id}
                        d={
                          line([
                            start,
                            [
                              start[0] + (target[0] - start[0]) / 16,
                              start[1] + (target[1] - start[1]) / 4
                            ],
                            [
                              start[0] + (target[0] - start[0]) / 2,
                              start[1] + (target[1] - start[1]) / 2
                            ],
                            [
                              target[0] - (target[0] - start[0]) / 16,
                              target[1] - (target[1] - start[1]) / 4
                            ],
                            target
                          ]) as string
                        }
                        fill="none"
                        strokeWidth={4}
                        opacity={
                          subgroup.id === selectSubgroup || selectConcept === conceptid ? 1 : 0.15
                        }
                      ></path>
                    )
                  } catch (e) {}
                }
                treatments.map((treatment, j) => {
                  let rect = <></>
                  // 表格内正方形内容
                  let temp = treatment + '&' + subgroup.id
                  if (relationshipMap.has(temp)) {
                    let relationship: realationship = relationshipDetailMap.get(
                      relationshipMap.get(temp)!
                    )!
                    if (
                      orderedDecisionRule
                        .map((rule) => rule.id)
                        .filter((id) => relationship.matchedDR.includes(id)).length === 2 ||
                      relationship.subgroup === 0
                    ) {
                      const confidence = relationship.confidence[1] - relationship.confidence[0]
                      const k = (maxClipWidth - minClipWidth) / (maxConfidence - minConfidence)
                      const width = k * (confidence - minConfidence) + minClipWidth
                      rect = (
                        <g key={'rect' + treatment + '-' + relationship.id}>
                          <rect
                            x={relationshipWidth * i - treatmentWidth / 2}
                            y={
                              subgroupCountHeight +
                              j * (treatmentWidth + treatmentPadding[0] * 2) +
                              treatmentPadding[0] +
                              margin.top
                            }
                            width={treatmentWidth}
                            height={treatmentWidth}
                            fill={
                              relationship.mean > 0
                                ? positive(relationship.mean / forestDetails.range[1])
                                : negative(relationship.mean / forestDetails.range[0])
                            }
                          ></rect>
                          <rect
                            x={relationshipWidth * i - width / 2}
                            y={
                              subgroupCountHeight +
                              j * (treatmentWidth + treatmentPadding[0] * 2) +
                              treatmentPadding[0] +
                              (treatmentWidth - width) / 2 +
                              margin.top
                            }
                            width={width}
                            height={width}
                            fill={'#fff'}
                          ></rect>
                        </g>
                      )
                    }
                  }

                  if (selectRelationship === relationshipMap.get(treatment + '&' + subgroup.id)) {
                    highlightRect = (
                      <rect
                        className="selected"
                        x={relationshipWidth * i - relationshipWidth / 2}
                        y={
                          subgroupCountHeight +
                          j * (treatmentWidth + treatmentPadding[0] * 2) +
                          margin.top
                        }
                        width={relationshipWidth}
                        height={treatmentWidth + treatmentPadding[0] * 2}
                        fill="none"
                      ></rect>
                    )
                  }
                  // 表格背景格
                  bgs.push(
                    <g
                      key={'bg' + treatment + '-' + subgroup.id}
                      onClick={() => {
                        selectRelationshipHandler(treatment, subgroup.id)
                        dispatch(setSelectPair('-1&-1'))
                      }}
                    >
                      <title>
                        Effect:{' '}
                        {relationshipDetailMap.get(relationshipMap.get(temp)!)?.mean.toFixed(2)}
                        {'\n'}Confidence:{' '}
                        {relationshipDetailMap
                          .get(relationshipMap.get(temp)!)
                          ?.confidence[0].toFixed(2)}
                        ~
                        {relationshipDetailMap
                          .get(relationshipMap.get(temp)!)
                          ?.confidence[1].toFixed(2)}
                      </title>
                      <rect
                        x={relationshipWidth * i - relationshipWidth / 2}
                        y={
                          subgroupCountHeight +
                          j * (treatmentWidth + treatmentPadding[0] * 2) +
                          margin.top
                        }
                        width={relationshipWidth}
                        height={treatmentWidth + treatmentPadding[0] * 2}
                        stroke="#E3E2E7"
                        strokeWidth={2}
                        fill="#fff"
                      ></rect>
                      {rect}
                    </g>
                  )
                })

                if (relationshipDetailMap.get(selectRelationship)?.subgroup === subgroup.id) {
                  let relationship = relationshipDetailMap.get(selectRelationship)!
                  treatInSubgroup = (
                    <rect
                      className="treated"
                      x={relationshipWidth * i - treatmentWidth / 2}
                      y={
                        subgroupCountHeight -
                        (relationship.treated / maxSubgroupsCount) * subgroupCountHeight +
                        margin.top
                      }
                      width={treatmentWidth}
                      height={(relationship.treated / maxSubgroupsCount) * subgroupCountHeight}
                    ></rect>
                  )
                }
                // 添加柱状图并排除overall
                if (subgroup.id !== 0) {
                  bars.push(
                    <g key={'bar' + subgroup.id}>
                      <rect
                        x={relationshipWidth * i - treatmentWidth / 2}
                        y={
                          subgroupCountHeight -
                          (subgroup.count / maxSubgroupsCount) * subgroupCountHeight +
                          margin.top
                        }
                        width={treatmentWidth}
                        height={(subgroup.count / maxSubgroupsCount) * subgroupCountHeight}
                        className="bar"
                      ></rect>
                      <title>
                        Totol count: {subgroup.count}
                        {'\n'}
                        {relationshipDetailMap.get(selectRelationship)?.subgroup === subgroup.id
                          ? 'Treated count:' +
                            relationshipDetailMap.get(selectRelationship)?.treated
                          : ''}
                      </title>
                      {treatInSubgroup}
                    </g>
                  )
                }

                return (
                  <g key={subgroup.id}>
                    <text
                      x={
                        subgroup.id === 0
                          ? relationshipWidth * i - relationshipWidth / 2
                          : relationshipWidth * i
                      }
                      textAnchor={subgroup.id === 0 ? 'start' : 'middle'}
                      y={subgroup.id === 0 ? subgroupCountHeight : 0}
                      fontSize={20}
                      fontWeight={600}
                      onClick={() => {
                        if (selectSubgroup === subgroup.id) {
                          dispatch(setSelectSubgroups(-1))
                        } else {
                          dispatch(setSelectSubgroups(subgroup.id))
                          dispatch(setSelectConcept(-1))
                        }
                      }}
                    >
                      {subgroup.id === 0 ? 'Overall' : 'S' + subgroup.id}
                    </text>
                    {paths.map((path) => {
                      return path
                    })}
                    {bars.map((bar) => {
                      return bar
                    })}
                    {bgs.map((rect) => {
                      return rect
                    })}
                  </g>
                )
              })}
              {highlightRect}
            </g>
          )}

          {treatments.map((treatment, i) => {
            let treatInTeatment = <></>
            if (relationshipDetailMap.get(selectRelationship)?.treatment === treatment) {
              let treat = relationshipDetailMap.get(selectRelationship)!.treated
              treatInTeatment = (
                <rect
                  x={
                    treatmentCountBarWidth -
                    (treatmentCountBarWidth / maxTreatmentCount) * treat +
                    margin.left +
                    40
                  }
                  y={
                    conceptY +
                    pathHeight +
                    subgroupCountHeight +
                    i * (treatmentWidth + treatmentPadding[0] * 2) +
                    treatmentPadding[0] +
                    treatmentWidth / 2
                  }
                  width={(treatmentCountBarWidth / maxTreatmentCount) * treat}
                  height={treatmentWidth}
                  className="treated"
                ></rect>
              )
            }
            return (
              <g key={treatment}>
                <text
                  x={190}
                  y={
                    conceptY +
                    pathHeight +
                    subgroupCountHeight +
                    i * (treatmentWidth + treatmentPadding[0] * 2) +
                    treatmentPadding[0] +
                    treatmentWidth +
                    8
                  }
                  textAnchor={'end'}
                  fontWeight={600}
                >
                  C{treatment}
                </text>
                <g>
                  <rect
                    key={'treatment-bar-' + treatment}
                    x={
                      treatmentCountBarWidth -
                      (treatmentCountBarWidth / maxTreatmentCount) *
                        conceptsMap.get(treatment)?.count! +
                      margin.left +
                      40
                    }
                    y={
                      conceptY +
                      pathHeight +
                      subgroupCountHeight +
                      i * (treatmentWidth + treatmentPadding[0] * 2) +
                      treatmentPadding[0] +
                      treatmentWidth / 2
                    }
                    width={
                      (treatmentCountBarWidth / maxTreatmentCount) *
                      conceptsMap.get(treatment)?.count!
                    }
                    height={treatmentWidth}
                    className="bar"
                  ></rect>
                  <title>
                    Totol count: {conceptsMap.get(treatment)?.count}
                    {'\n'}
                    {relationshipDetailMap.get(selectRelationship)?.treatment === treatment
                      ? 'Treated count:' + relationshipDetailMap.get(selectRelationship)?.treated
                      : ''}
                  </title>
                  {treatInTeatment}
                </g>
              </g>
            )
          })}
          {/* treatment柱状图y轴 */}
          {treatments.length && (
            <g transform={`translate(40,${conceptY + pathHeight + subgroupCountHeight + 8})`}>
              <line
                x1={treatmentCountBarWidth + margin.left}
                y1={0}
                x2={margin.left / 2}
                y2={0}
                strokeWidth={1}
                markerEnd="url(#arrow)"
              ></line>
              <text x={0} y={-20} fontSize={16}>
                Count
              </text>
              <text x={20} y={-5} fontSize={12}>
                {maxTreatmentCount}
              </text>
              <text x={treatmentCountBarWidth + margin.left - 6} y={-5} fontSize={12}>
                0
              </text>
            </g>
          )}
          {/* 底部图例 */}
          <g transform={`translate(${margin.left},${780})`}>
            <rect x={10} y={25} width={25} height={25} fill="#6b727c"></rect>
            <text className="label legend" fontSize={20}>
              <tspan x={45} y={35}>
                #Teated in
              </tspan>
              <tspan x={45} dy={20}>
                the subgroup
              </tspan>
            </text>
            <g transform="translate(205, 20)">
              <rect height="24" width="60" style={{ fill: 'url(#negative)' }}></rect>
              <rect x="60" height="24" width="60" style={{ fill: 'url(#positive)' }}></rect>
            </g>
            <text x={200} y={60} className="label legend">
              Negative
            </text>
            <text x={280} y={60} className="label legend">
              Positive
            </text>
            <text className="label legend" fontSize={20}>
              <tspan x={340} y={30}>
                Treatment
              </tspan>
              <tspan x={340} dy={20}>
                effect
              </tspan>
            </text>
            <rect x={480} y={28} width={12} height={12} fill="#fff" stroke="#000"></rect>
            <rect x={502} y={22} width={18} height={18} fill="#fff" stroke="#000"></rect>
            <rect x={530} y={10} width={30} height={30} fill="#fff" stroke="#000"></rect>
            <text x={460} y={55} className="label legend">
              Small
            </text>
            <text x={540} y={55} className="label legend">
              Large
            </text>
            <text className="label legend" fontSize={20}>
              <tspan x={580} y={25}>
                Confidence
              </tspan>
              <tspan x={580} dy={25}>
                interval
              </tspan>
            </text>
          </g>
        </g>
      </svg>
      <div className="type">
        <Radio.Group
          value={showType}
          onChange={(value) => {
            if (typeof value === 'string') setShowType(value)
            else setShowType(value.target.value)
          }}
        >
          <Radio.Button value="all">All({orderedDecisionRule.length})</Radio.Button>
          <Radio.Button value="matched">Matched({orderedMatchedDecisionRule.length})</Radio.Button>
        </Radio.Group>
      </div>
      <div className="filter">
        <div className="filter-row">
          <span>Support</span>
          <Slider
            min={0}
            max={maxDecisionRuleCount * 0.8}
            onChange={(newValue) => {
              setCountFilter(newValue)
            }}
            value={countFilter}
            disabled={showType === 'matched'}
          ></Slider>
          <InputNumber
            onChange={(newValue) => {
              if (newValue) setCountFilter(newValue)
            }}
            value={countFilter}
            disabled={showType === 'matched'}
            controls={false}
          ></InputNumber>
        </div>
        <div className="filter-row">
          <span>Accuracy</span>
          <Slider
            min={0.5}
            max={1}
            step={0.01}
            onChange={(newValue) => {
              setOutcomeFilter(newValue)
            }}
            value={outcomeFilter}
            disabled={showType === 'matched'}
          ></Slider>
          <InputNumber
            onChange={(newValue) => {
              if (newValue) setOutcomeFilter(newValue)
            }}
            value={outcomeFilter}
            disabled={showType === 'matched'}
            controls={false}
          ></InputNumber>
        </div>
        <div className="filter-row" style={{ width: '7.5rem' }}>
          <span>Filter</span>
          <Select
            mode="multiple"
            allowClear
            // style={{ width: '100%' }}
            value={conceptFilter}
            onChange={setConceptFilter}
            options={conceptsOrder.map((id) => ({ label: 'C' + id, value: id }))}
          />
        </div>
      </div>
    </>
  )
}
