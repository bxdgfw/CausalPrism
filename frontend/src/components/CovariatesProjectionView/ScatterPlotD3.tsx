import { Button, Col, ConfigProvider, Flex, Row, Switch, message } from 'antd'
import * as d3 from 'd3'
import { useEffect, useMemo, useState } from 'react'
import { Merge, Split } from '../../assets'
import useAxios from '../../hooks/useAxios'
import { useDispatch, useSelector } from 'react-redux'
import { ConceptProps } from '../ConceptView/ConceptView'
import { setConceptsOrder, setSelectSubgroups } from '../../features/concept/conceptSlice'

interface ScatterPlotD3Props {
  conceptsMap: Map<number, ConceptProps>
  setConceptsMap: (conceptsMap: Map<number, ConceptProps>) => void
  unitsInSubgroup: number[]
}

export default function ScatterPlotD3({
  conceptsMap,
  setConceptsMap,
  unitsInSubgroup
}: ScatterPlotD3Props) {
  const dispatch = useDispatch()
  const [switchValue, setSwitchValue] = useState(true)
  const selectTable = useSelector((state: any) => state.concept.selectTable)
  const conceptsOrder = useSelector((state: any) => state.concept.conceptsOrder)
  const selectSubgroups = useSelector((state: any) => state.concept.selectSubgroups)
  const { data: dataset, refetch } = useAxios(
    {
      url: '/api/get_dimension_reduction_results',
      method: 'get',
      params: { data_table: selectTable }
    },
    { trigger: false }
  )

  const { data: mergeData, refetch: mergeRefetch } = useAxios(
    {
      url: '/api/merge_subgroup',
      method: 'post',
      data: { id: selectSubgroups }
    },
    { trigger: false }
  )

  const { data: splitData, refetch: splitRefetch } = useAxios(
    {
      url: '/api/split_subgroup',
      method: 'post',
      data: { id: selectSubgroups[0] }
    },
    { trigger: false }
  )

  const width = 500
  const height = 500
  const margin = 50
  const rangeX = useMemo(() => {
    if (!dataset) return [0, 0]
    return [
      Math.floor(dataset.data.dataset_info.range.x[0]) < 0
        ? Math.floor(dataset.data.dataset_info.range.x[0]) * 1.2
        : Math.floor(dataset.data.dataset_info.range.x[0]) / 1.2,
      Math.ceil(dataset.data.dataset_info.range.x[1]) < 0
        ? Math.ceil(dataset.data.dataset_info.range.x[1]) / 1.2
        : Math.ceil(dataset.data.dataset_info.range.x[1]) * 1.2
    ]
  }, [dataset])
  const rangeY = useMemo(() => {
    if (!dataset) return [0, 0]
    return [
      Math.floor(dataset.data.dataset_info.range.y[0]) < 0
        ? Math.floor(dataset.data.dataset_info.range.y[0]) * 1.2
        : Math.floor(dataset.data.dataset_info.range.y[0]) / 1.2,
      Math.ceil(dataset.data.dataset_info.range.y[1]) < 0
        ? Math.ceil(dataset.data.dataset_info.range.y[1]) / 1.2
        : Math.ceil(dataset.data.dataset_info.range.y[1]) * 1.2
    ]
  }, [dataset])

  const xScale = useMemo(() => {
    return d3
      .scaleLinear()
      .domain(rangeX)
      .range([margin, width - margin])
  }, [rangeX])

  const yScale = useMemo(() => {
    return d3
      .scaleLinear()
      .domain(rangeY)
      .range([height - margin, margin])
  }, [rangeY])

  const selectIds = useMemo(() => {
    const ids = new Set<number>()
    for (let i = 0; i < selectSubgroups.length; i++) {
      const subgroup = conceptsMap.get(selectSubgroups[i])
      if (!subgroup) continue
      for (const id of subgroup['covered id']) {
        ids.add(id)
      }
    }
    return Array.from(ids)
  }, [selectSubgroups, conceptsMap])

  useEffect(() => {
    if (selectTable) {
      refetch()
    }
  }, [selectTable])

  useEffect(() => {
    if (!dataset) return
    console.log(dataset)
    // const rangeX = [
    //   Math.floor(dataset.data.dataset_info.range.x[0]),
    //   Math.ceil(dataset.data.dataset_info.range.x[1])
    // ]
    // const rangeY = [
    //   Math.floor(dataset.data.dataset_info.range.y[0]),
    //   Math.ceil(dataset.data.dataset_info.range.y[1])
    // ]

    // const xScale = d3
    //   .scaleLinear()
    //   .domain(rangeX)
    //   .range([margin, width - margin])
    // const yScale = d3
    //   .scaleLinear()
    //   .domain(rangeY)
    //   .range([height - margin, margin])
    const svg = d3.select('#scatter-plot')
    svg.select('.x').selectAll('*').remove()
    svg.select('.y').selectAll('*').remove()

    const xAxis = d3.axisBottom(xScale as any).ticks(8)
    const yAxis = d3.axisLeft(yScale as any).ticks(8)
    svg
      .select('.x')
      .attr('transform', `translate(0, ${height - margin})`)
      .call(xAxis as any)
    svg
      .select('.y')
      .attr('transform', `translate(${margin}, 0 )`)
      .call(yAxis as any)
  }, [dataset, xScale, yScale])

  useEffect(() => {
    if (!mergeData) return
    const subgroup = mergeData.data.subgroup[0]
    const _concepts = new Map<number, ConceptProps>(conceptsMap)
    _concepts.set(subgroup.id, {
      id: subgroup.id,
      orginCharts: subgroup.charts,
      charts: [],
      coverage: subgroup.coverage,
      pos: [0, 0],
      width: 0,
      height: 0,
      name: 'S' + subgroup.id,
      count: subgroup.count,
      metrics: subgroup.metrics,
      'covered id': subgroup['covered id'],
      tag: subgroup.tag || 'S' + subgroup.id
    })
    setConceptsMap(_concepts)
    dispatch(setConceptsOrder([...conceptsOrder, subgroup.id]))
    dispatch(setSelectSubgroups([subgroup.id]))
  }, [mergeData])

  useEffect(() => {
    if (!splitData) return
    const subgroups = splitData.data.subgroup
    const _concepts = new Map<number, ConceptProps>(conceptsMap)
    for (let i = 0; i < subgroups.length; i++) {
      const subgroup = subgroups[i]
      _concepts.set(subgroup.id, {
        id: subgroup.id,
        orginCharts: subgroup.charts,
        charts: [],
        coverage: subgroup.coverage,
        pos: [0, 0],
        width: 0,
        height: 0,
        name: 'S' + subgroup.id,
        count: subgroup.count,
        metrics: subgroup.metrics,
        'covered id': subgroup['covered id'],
        tag: subgroup.tag || 'S' + subgroup.id
      })
    }
    setConceptsMap(_concepts)
    dispatch(setConceptsOrder([...conceptsOrder, ...subgroups.map((subgroup: any) => subgroup.id)]))
    dispatch(setSelectSubgroups(subgroups.map((subgroup: any) => subgroup.id)))
  }, [splitData])

  const handleMerge = () => {
    if (selectSubgroups.length === 2) {
      mergeRefetch()
    } else {
      message.info('Please select two subgroups to merge')
    }
  }

  const handleSplit = () => {
    if (selectSubgroups.length === 1) {
      splitRefetch()
    } else {
      message.info('Please select one subgroup to split')
    }
  }

  return (
    <>
      {dataset && (
        <div style={{ position: 'relative' }}>
          <div className="buttons">
            <ConfigProvider
              theme={{
                components: {
                  Switch: {
                    handleSize: 26,
                    trackHeight: 30,
                    trackMinWidth: 140
                    // innerMinMargin: 0
                  }
                }
              }}
            >
              <Switch
                checkedChildren={
                  <div style={{ lineHeight: '30px' }}>Show subgroups</div>
                  // <div>
                  //   <span>Hide non-causal</span>
                  //   <br />
                  //   <span>subgroup units</span>
                  // </div>
                }
                unCheckedChildren={<div style={{ lineHeight: '30px' }}>Show population</div>}
                value={switchValue}
                onChange={(checked) => setSwitchValue(checked)}
                style={{ lineHeight: '20px', position: 'absolute', right: 15, top: 10 }}
              />
            </ConfigProvider>
            <div style={{ position: 'absolute', bottom: -10, left: '10%', width: '70%' }}>
              <Row>
                <Col span={12} style={{ display: 'flex', justifyContent: 'center' }}>
                  <Button style={{ display: 'flex', alignItems: 'center' }} onClick={handleMerge}>
                    <img src={Merge} alt="" style={{ width: 16, height: 16, marginRight: 5 }} />
                    Merge subgroups
                  </Button>
                </Col>
                <Col span={12} style={{ display: 'flex', justifyContent: 'center' }}>
                  <Button style={{ display: 'flex', alignItems: 'center' }} onClick={handleSplit}>
                    <img src={Split} alt="" style={{ width: 16, height: 16, marginRight: 5 }} />
                    Split subgroups
                  </Button>
                </Col>
              </Row>
            </div>
          </div>
          <svg id="scatter-plot" width={width} height={height}>
            <g className="x"></g>
            <g className="y"></g>
            <g className="legend">
              <circle cx={margin + 40} cy={margin - 25} r={10} fill="#afafaf" />
              <text x={margin + 60} y={margin - 20}>
                Unit
              </text>
              <text x={margin + 120} y={margin - 35}>
                #All units:{' '}
                <tspan style={{ textDecoration: 'underline' }}>
                  {dataset?.data?.dataset_info?.units_num || '-'}
                </tspan>
              </text>
              <text x={margin + 120} y={margin - 5}>
                #Units in subgroups:{' '}
                <tspan style={{ textDecoration: 'underline' }}>
                  {unitsInSubgroup.length || '-'}
                </tspan>
              </text>
            </g>
            <g className="points">
              {!switchValue && (
                <>
                  {dataset?.data?.units
                    ?.filter((item: any) => !selectIds.includes(item.id))
                    .map((d: any) => {
                      return (
                        <circle
                          key={d.id}
                          r={3}
                          fill={'#afafaf'}
                          cx={xScale?.(d.data[0])}
                          cy={yScale?.(d.data[1])}
                        />
                      )
                    })}
                  {dataset?.data?.units
                    ?.filter((item: any) => selectIds.includes(item.id))
                    .map((d: any) => {
                      return (
                        <circle
                          key={d.id}
                          r={3}
                          fill={'#f1a340'}
                          cx={xScale?.(d.data[0])}
                          cy={yScale?.(d.data[1])}
                        />
                      )
                    })}
                </>
              )}
              {switchValue && (
                <>
                  {dataset?.data?.units
                    ?.filter(
                      (item: any) =>
                        !selectIds.includes(item.id) && unitsInSubgroup.includes(item.id)
                    )
                    .map((d: any) => {
                      return (
                        <circle
                          key={d.id}
                          r={3}
                          fill={'#afafaf'}
                          cx={xScale?.(d.data[0])}
                          cy={yScale?.(d.data[1])}
                        />
                      )
                    })}
                  {dataset?.data?.units
                    ?.filter(
                      (item: any) =>
                        selectIds.includes(item.id) && unitsInSubgroup.includes(item.id)
                    )
                    .map((d: any) => {
                      return (
                        <circle
                          key={d.id}
                          r={3}
                          fill={'#f1a340'}
                          cx={xScale?.(d.data[0])}
                          cy={yScale?.(d.data[1])}
                        />
                      )
                    })}
                </>
              )}
            </g>
          </svg>
        </div>
      )}
    </>
  )
}
