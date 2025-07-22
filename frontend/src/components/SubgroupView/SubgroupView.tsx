import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setConfirm, setRulesOrder } from '../../features/concept/conceptSlice'
import useAxios from '../../hooks/useAxios'
import { ConceptProps } from '../ConceptView/ConceptView'
import DecisionRules from './DecisionRules'
import './SubgroupView.scss'

interface DecisionRuleData {
  id: number
  name: string
  count: number
  data: { no: number[]; yes: number[] }
  outcome: { [key: string]: number }
}

interface SubgroupViewProps {
  conceptsMap: Map<number, ConceptProps>
}

export default function SubgroupView(props: SubgroupViewProps) {
  const { conceptsMap } = props
  const selectTable = useSelector((state: any) => state.concept.selectTable)
  const selectOutcome = useSelector((state: any) => state.concept.selectOutcome)
  const confirm = useSelector((state: any) => state.concept.confirm)
  const dispatch = useDispatch()
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

  const [decisionRuleMap, setDecisionRuleMap] = useState<Map<number, DecisionRuleData>>(
    new Map<number, DecisionRuleData>()
  )

  useEffect(() => {
    if (!selectOutcome || !confirm) return
    dispatch(setConfirm(false))
    decisionRefetch()
  }, [selectOutcome, confirm])

  useEffect(() => {
    if (!decisionData) return
    const decisionTree = decisionData.data
    const order: number[] = [2, 19, 12, 27]
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
    setDecisionRuleMap(decisionRuleMap)
    dispatch(setRulesOrder(order))
  }, [decisionData])

  return <DecisionRules decisionRuleMap={decisionRuleMap} conceptsMap={conceptsMap}></DecisionRules>
}
