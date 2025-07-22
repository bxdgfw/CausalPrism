import * as LineUpJs from 'lineupjs'
import { useEffect, useReducer, useRef, useState } from 'react'
import 'lineupjs/build/LineUpJS.css'
import './LineUpContent.scss'
import * as d3 from 'd3'
import { ConceptProps } from './ConceptView'
import { useDispatch, useSelector } from 'react-redux'
import {
  setConceptsOrder,
  setSelectSubgroups,
  updateSelectSubgroups
} from '../../features/concept/conceptSlice'
import * as LineUpJS from 'lineupjs'

interface LineUpContentProps {
  conceptsMap: Map<number, ConceptProps>
}

export default function LineUpContent(props: LineUpContentProps) {
  const { conceptsMap } = props
  const conceptsOrder: number[] = useSelector((state: any) => state.concept.conceptsOrder)
  const selectSubgroups = useSelector((state: any) => state.concept.selectSubgroups)
  const [linupData, setLinupData] = useState<any[]>([])
  const ref = useRef<any>(null)
  const dispatch = useDispatch()
  const myRef = useRef(null)
  const lineUpRef = useRef<any>(null)
  const builderRef = useRef<any>(null)
  const updateRef = useRef(0)
  const [, render] = useReducer((p) => !p, false)

  useEffect(() => {
    const sortButtons = d3.selectAll('.lu-toolbar').selectAll('i[title="Sort"]')
    console.log(sortButtons)

    const clickHandler = () => {
      // 异步更新，临时加个timeout
      // setTimeout(() => {
      //   const order = ref.current?.adapter.data.rankings[0].order
      //   dispatch(setConceptsOrder(Array.from(order) as number[]))
      // }, 100)
      console.log(lineUpRef.current)
      console.log(builderRef.current)
    }
    sortButtons.on('click', clickHandler)
    return () => {
      sortButtons.on('click', null)
    }
  }, [updateRef.current, lineUpRef.current])

  useEffect(() => {
    setLinupData(
      conceptsOrder.map((id) => {
        const concept = conceptsMap.get(id)
        console.log()

        return concept?.metrics
      })
    )
  }, [conceptsMap])

  useEffect(() => {
    if (linupData.length === 0) return
    d3.select(myRef.current).selectAll('*').remove()
    const builder = LineUpJS.builder(linupData)
    builder
      .column(LineUpJS.buildNumberColumn('treatment effect').colorMapping('#5ab4ac').width(105))
      .column(LineUpJS.buildNumberColumn('treated variance').colorMapping('#af8dc3').width(105))
      .column(LineUpJS.buildNumberColumn('control variance').colorMapping('#c67269').width(105))
      .column(LineUpJS.buildNumberColumn('covered units').colorMapping('#93b366').width(105))
      .column(
        LineUpJS.buildNumberColumn('rule antecedent length').colorMapping('#67a9cf').width(120)
      )

    builder.defaultRanking(false).sidePanel(false).rowHeight(30).multiSelection()
    console.log(builder)

    const lineup = builder.build(myRef.current!)
    lineup.on('dialogClosed', (dialog, _) => {
      console.log(dialog, _)
      updateRef.current++
      render()
    })
    lineup.on('selectionChanged', (selection) => {
      console.log(selection)

      dispatch(updateSelectSubgroups(selection))
    })
    lineUpRef.current = lineup
    builderRef.current = builder
    render()
  }, [linupData])

  useEffect(() => {
    if (!lineUpRef.current) return
    lineUpRef.current.setSelection(selectSubgroups)
  }, [selectSubgroups])

  return <div ref={myRef} style={{ height: 520, position: 'relative', top: 10, width: 630 }}></div>
}
