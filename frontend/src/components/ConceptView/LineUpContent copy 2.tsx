import * as LineUpJs from 'lineupjs'
import { useEffect, useReducer, useRef, useState } from 'react'
// import 'lineupjs/build/LineUpJS.css'
import './LineUpContent.copy.scss'
import { LineUp, LineUpNumberColumnDesc } from 'lineupjsx'
import * as d3 from 'd3'
import { ConceptProps } from './ConceptView'
import { useDispatch, useSelector } from 'react-redux'
import {
  setConceptsOrder,
  setSelectSubgroups,
  updateSelectSubgroups
} from '../../features/concept/conceptSlice'

interface LineUpContentProps {
  conceptsMap: Map<number, ConceptProps>
}

export default function LineUpContent(props: LineUpContentProps) {
  const { conceptsMap } = props
  const conceptsOrder: number[] = useSelector((state: any) => state.concept.conceptsOrder)
  const selectSubgroups: number[] = useSelector((state: any) => state.concept.selectSubgroups)
  const [linupData, setLinupData] = useState<any[]>([])
  const ref = useRef<any>(null)
  const dispatch = useDispatch()
  const dialogOpenRef = useRef(false)
  // const [, render] = useReducer((p) => !p, false)
  // const updateRef = useRef(0)

  const addSortListener = () => {
    const order = Array.from(d3.selectAll('.le-tr')).map((d: any) => +d3.select(d).attr('data-i'))
    console.log(order)

    dispatch(setConceptsOrder(Array.from(order) as number[]))
    // const sortButtons = d3.selectAll('.lu-toolbar').selectAll('i[title="Sort"]')
    // const order = Array.from(d3.selectAll('.le-tr')).map((d: any) => +d3.select(d).attr('data-i'))
    // const clickHandler = () => {
    //   console.log(order)

    //   dispatch(setConceptsOrder(Array.from(order) as number[]))
    // }
    // sortButtons.on('click', clickHandler)
  }

  const addSelectListener = () => {
    const rows = d3.selectAll('.le-tr')
    console.log(rows)

    rows.on('click', function () {
      const id = +d3.select(this).attr('data-i')
      dispatch(updateSelectSubgroups(id))
    })
  }

  useEffect(() => {
    // addWatch(d3.select('article.le-thead').node() as HTMLElement, addSortListener)
    addWatch(d3.select('article.le-tbody').node() as HTMLElement, () => {
      // console.log(dialogOpenRef.current)

      if (!dialogOpenRef.current) {
        addSelectListener()
        addSortListener()
      }

      // console.log(selectSubgroups)
      // for (const id of selectSubgroups) {
      //   d3.select('.le-tr[data-i="' + id + '"]').classed('lu-selected', true)
      // }
      // ref.current.adapter.instance.setSelection(selectSubgroups)
      // addSortListener()
    })

    // ref.current.adapter.instance.on('dialogOpened', () => {
    //   dialogOpenRef.current = true
    // })
    ref.current.adapter.instance.on('dialogClosed', () => {
      // render()
      // setTimeout(() => {
      const order = ref.current?.adapter.data.rankings[0].order
      dispatch(setConceptsOrder(Array.from(order) as number[]))
      // dialogOpenRef.current = false
      // }, 100)
    })

    // const selectHandler = (selection: number[]) => {
    //   dispatch(updateSelectSubgroups(selection))
    // }
    ref.current.adapter.instance.listeners['_'].selectionChanged = []
    // ref.current.adapter.instance.on('selectionChanged', selectHandler)

    console.log(ref.current)
    // addSortListener()
  }, [linupData])

  useEffect(() => {
    if (!ref.current?.adapter) return
    if (
      JSON.stringify(ref.current.adapter.instance.getSelection()) !==
      JSON.stringify(selectSubgroups)
    ) {
      ref.current.adapter.instance.setSelection(selectSubgroups)
    }
  }, [selectSubgroups])

  useEffect(() => {
    setLinupData(
      conceptsOrder.map((id) => {
        const concept = conceptsMap.get(id)
        return concept?.metrics
      })
    )
  }, [conceptsMap])

  return (
    <div style={{ display: 'flex', position: 'relative', top: 10 }}>
      <LineUp
        ref={ref}
        data={linupData}
        sidePanel={false}
        style={{ flex: '1 1 auto' }}
        summaryHeader={true}
        rowHeight={390 / (conceptsOrder.length || 1) - 2}
        rowPadding={2}
        groupHeight={40}
        groupPadding={5}
        singleSelection={false}
        defaultRanking={'noSupportTypes'}
      >
        <LineUpNumberColumnDesc column="treatment effect" width={105} colorMapping="#5ab4ac" />
        <LineUpNumberColumnDesc column="treated variance" width={105} colorMapping="#af8dc3" />
        <LineUpNumberColumnDesc column="control variance" width={105} colorMapping="#c67269" />
        <LineUpNumberColumnDesc column="covered units" width={105} colorMapping="#93b366" />
        <LineUpNumberColumnDesc
          column="rule antecedent length"
          width={140}
          colorMapping="#67a9cf"
        />
      </LineUp>
    </div>
  )
}

function addWatch(element: HTMLElement, onChange: () => void) {
  // 选择需要观察变动的节点
  let targetNode: any = element
  // 观察器的配置（需要观察什么变动）
  let config = {
    // attributes: true
    childList: true
    // subtree: true
  }

  // 当观察到变动时执行的回调函数
  const mutationCallback = (mutations: any) => {
    for (let mutation of mutations) {
      let type = mutation.type
      switch (type) {
        case 'childList':
          onChange()
          break
        default:
          break
      }
    }
  }

  // 创建一个观察器实例并传入回调函数
  let observer = new MutationObserver(mutationCallback)
  // 以上述配置开始观察目标节点
  observer.observe(targetNode, config)

  // observer.disconnect();
}
