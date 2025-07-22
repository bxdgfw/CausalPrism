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
  const maxLength: number = useSelector((state: any) => state.concept.maxLength)
  const [linupData, setLinupData] = useState<any[]>([])
  const ref = useRef<any>(null)
  const dispatch = useDispatch()
  const dialogOpenRef = useRef(false)
  const orderRef = useRef<number[]>([])
  const [, render] = useReducer((p) => !p, false)
  const [a, setA] = useState(0)
  // const updateRef = useRef(0)

  const updateOrder = () => {
    const adapterData = ref.current?.adapter.data
    // console.log(adapterData._dataRows)

    const order = adapterData.rankings[0].order
    const trueOrder = Array.from(
      order.map((id: number) => {
        return adapterData.mapToDataRow(id).v.id
      })
    ) as number[]
    dispatch(setConceptsOrder(trueOrder))
    dispatch(setSelectSubgroups(orderRef.current.slice()))
  }

  const addSortListener = () => {
    const sortButtons = d3.selectAll('.lu-toolbar').selectAll('i[title="Sort"]')
    const clickHandler = () => {
      // 异步更新，临时加个timeout
      setTimeout(() => {
        updateOrder()
      }, 100)
    }
    sortButtons.on('click', clickHandler)
  }

  const addSelectListener = () => {
    const rows = d3.selectAll('.le-tr')
    addSortListener()
    const adapterData = ref.current?.adapter.data
    rows.on('click', function () {
      const id = +d3.select(this).attr('data-i')
      dispatch(updateSelectSubgroups(adapterData.mapToDataRow(id).v.id))
    })
  }

  const setSelectionFromLeft = (selectSubgroups: any) => {
    const lineupOrder = selectSubgroups.map((id: any) => {
      return ref.current.adapter.data._dataRows.filter((row: any) => row.v.id === id)?.[0]?.i
    })
    ref.current.adapter.instance.setSelection(lineupOrder)
    orderRef.current = selectSubgroups
  }

  useEffect(() => {
    addWatch(d3.select('article.le-thead').node() as HTMLElement, addSortListener)
    addWatch(d3.select('article.le-tbody').node() as HTMLElement, () => {
      addSelectListener()
      if (!dialogOpenRef.current) {
        updateOrder()
      }
    })

    ref.current.adapter.instance.on('dialogClosed', () => {
      console.log('dialog closed')
      dialogOpenRef.current = false
      d3.select('article.le-tbody').append('div').attr('style', 'display: none')
    })

    ref.current.adapter.instance.on('dialogOpened', () => {
      console.log('dialog opened')
      dialogOpenRef.current = true
    })

    ref.current.adapter.instance.listeners['_'].selectionChanged = []

    d3.select('main.le-body').on('scroll', function () {
      const scrollDistance = (d3.select(this).node() as HTMLElement).scrollTop
      d3.select('svg#conceptViewTableContent').attr('y', -scrollDistance)
      d3.select('svg#subgroup-names').attr('y', -scrollDistance)
    })

    addSortListener()
  }, [linupData])

  useEffect(() => {
    if (!ref.current?.adapter) return
    // if (
    //   JSON.stringify(ref.current.adapter.instance.getSelection()) !==
    //   JSON.stringify(selectSubgroups)
    // ) {
    setSelectionFromLeft(selectSubgroups)
    // }
  }, [selectSubgroups])

  useEffect(() => {
    setLinupData(
      conceptsOrder.map((id) => {
        const concept = conceptsMap.get(id)
        return { ...concept?.metrics, id }
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
        // rowHeight={390 / (conceptsOrder.length || 1) - 2}
        rowHeight={28}
        rowPadding={2}
        groupHeight={40}
        groupPadding={5}
        singleSelection={false}
        defaultRanking={'noSupportTypes'}
      >
        <LineUpNumberColumnDesc column="treatment effect" width={115} colorMapping="#5ab4ac" />
        <LineUpNumberColumnDesc column="treated variance" width={115} colorMapping="#af8dc3" />
        <LineUpNumberColumnDesc column="control variance" width={115} colorMapping="#c67269" />
        <LineUpNumberColumnDesc column="covered units" width={115} colorMapping="#93b366" />
        <LineUpNumberColumnDesc
          label="Antecedent length"
          column="rule antecedent length"
          width={115}
          colorMapping="#67a9cf"
          domain={[0, maxLength]}
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
