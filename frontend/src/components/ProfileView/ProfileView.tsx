import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import useAxios from '../../hooks/useAxios'
import {
  setAttributesOrder,
  setConceptsOrder,
  setRulesOrder
} from '../../features/concept/conceptSlice'

import Matrix, { AttributeProps, ConceptProps } from './Matrix'
import Coverage from './Coverage'
import Concepts from './Concepts'
import Decision, { DecisionRuleData } from './Decision'

import './ProfileView.scss'
import FloatWindow from '../FloatWindow/FloatWindow'

export default function ProfileView() {
  const selectTable = useSelector((state: any) => state.concept.selectTable)
  const selectOutcome = useSelector((state: any) => state.concept.selectOutcome)
  const editConcept = useSelector((state: any) => state.concept.editConcept)
  const dispatch = useDispatch()
  const {
    data: conceptData,
    error: conceptError,
    refetch: conceptRefetch
  } = useAxios(
    {
      url: '/api/get_concepts',
      method: 'get',
      params: { data_table: selectTable, outcome: selectOutcome }
    },
    { trigger: false }
  )
  const {
    data: decisionData,
    error: decisionError,
    refetch: decisionRefetch
  } = useAxios(
    {
      url: '/api/get_decision_tree',
      method: 'get',
      params: { data_table: selectTable, outcome: selectOutcome }
    },
    { trigger: false }
  )

  const [attributesMap, setAttributesMap] = useState<Map<number, AttributeProps>>(
    new Map<number, AttributeProps>()
  )
  const [conceptsMap, setConceptsMap] = useState<Map<number, ConceptProps>>(
    new Map<number, ConceptProps>()
  )

  const [decisionRuleMap, setDecisionRuleMap] = useState<Map<number, DecisionRuleData>>(
    new Map<number, DecisionRuleData>()
  )

  useEffect(() => {
    if (!selectOutcome) return
    conceptRefetch()
    decisionRefetch()
  }, [selectOutcome])

  useEffect(() => {
    if (!conceptData) return
    const attributes = conceptData.data.attributes
    const concepts = conceptData.data.concepts
    const attributesMap = new Map<number, AttributeProps>()
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i]
      attributesMap.set(attr.id, {
        id: attr.id,
        name: attr.name,
        type: attr.type,
        data: attr.data,
        range: attr.range,
        width: 0,
        percent: 0,
        keyPoints: [],
        pos: [0, 0]
      })
    }
    const conceptsMap = new Map<number, ConceptProps>()
    for (let i = 0; i < concepts.length; i++) {
      const concept = concepts[i]
      conceptsMap.set(concept.id, {
        id: concept.id,
        orginCharts: concept.charts,
        charts: [],
        coverage: concept.coverage,
        pos: [0, 0],
        width: 0,
        height: 0,
        name: 'concept' + concept.id
      })
    }
    setAttributesMap(attributesMap)
    setConceptsMap(conceptsMap)
    dispatch(setAttributesOrder(attributes.map((attr: any) => attr.id)))
    dispatch(setConceptsOrder(concepts.map((concept: any) => concept.id)))
  }, [conceptData])

  useEffect(() => {
    if (!decisionData) return
    const decisionTree = decisionData.data
    const order: number[] = [2, 19, 8, 18, 3, 9, 5, 14, 25, 6, 16, 28, 7, 12, 27]
    const decisionRuleMap = new Map<number, DecisionRuleData>()
    for (let rule of decisionTree.rules) {
      // order.push(rule.id)
      decisionRuleMap.set(rule.id, {
        id: rule.id,
        name: rule.name,
        count: rule.count,
        data: rule.data,
        outcome: rule.outcome
      })
    }
    // order[3] = order[13]
    // order[13] = 4
    setDecisionRuleMap(decisionRuleMap)
    dispatch(setRulesOrder(order))
  }, [decisionData])

  return (
    <div id="profile-view">
      {/* <svg viewBox="0 0 1468 920" width="77.98rem" height="55.7rem"> */}
      <svg viewBox="520 0 1468 920">
        {/* <text x={-120} y={40} transform="rotate(-90)" fontSize={24} fontWeight={600}>
          Attributes
        </text>
        <Matrix attributesMap={attributesMap} conceptsMap={conceptsMap}></Matrix> */}
        <Coverage conceptsMap={conceptsMap}></Coverage>
        <Concepts conceptsMap={conceptsMap}></Concepts>
        {/* <Decision ruleMap={decisionRuleMap}></Decision> */}
      </svg>
    </div>
  )
}
