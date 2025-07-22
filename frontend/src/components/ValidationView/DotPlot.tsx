import * as d3 from 'd3'
import {
  useState,
  useEffect,
  JSXElementConstructor,
  ReactElement,
  ReactFragment,
  ReactPortal
} from 'react'
// import Table from './Table'
import { Table, Typography } from 'antd'
import './DotPlot.scss'
import { useDispatch, useSelector } from 'react-redux'
import { setSelectPair } from '../../features/concept/conceptSlice'

export interface DotPlotProps {
  range: [number, number]
  pairs: {
    [key: string]: any[][]
  }
  mean: number
  confidence: [number, number]
  treatment: string
  outcome: string
  length: number
}

export default function DotPlot(props: { data: DotPlotProps }) {
  const [pairs, setPairs] = useState<Map<string, any>>(new Map<string, any>())
  const [ticks, setTicks] = useState<number[]>([])
  const selectPair: string = useSelector((state: any) => state.concept.selectPair)
  const dispatch = useDispatch()
  const { data } = props

  useEffect(() => {
    let pairs = new Map<string, any>()
    Object.keys(data.pairs).map((x, i) => {
      data.pairs[x].map((pair, j) => {
        pairs.set(x + '&' + j, pair)
      })
    })
    setPairs(pairs)
    const range = data.range
    const min = range[0]
    const max = range[1]
    const _ticks = [
      min,
      (max - min) / 4 + min,
      (max - min) / 2 + min,
      ((max - min) * 3) / 4 + min,
      max
    ]
    setTicks(_ticks)
  }, [data])

  const cr = 6
  const width = 450
  const height = 300
  const confidenceHeight = 40
  const padding = { left: 40, right: 100, top: 40, bottom: 35 }

  return (
    <>
      <svg width={width} height={height} id={'dot-plot'} viewBox={`0 0 ${width} ${height}`}>
        {(data.range[0] !== 0 || data.range[1] !== 0) && (
          <>
            <g transform="translate(60, 0)">
              <circle cx={300} cy={35} r={10}></circle>
              <text>
                <tspan x={320} y={30}>
                  Matched
                </tspan>
                <tspan x={320} y={50}>
                  unit pair
                </tspan>
              </text>
            </g>
            <g
              transform={`translate(${padding.left}, ${
                height - padding.bottom - confidenceHeight
              })`}
            >
              <path
                d={`M0,0 L${width - padding.left - padding.right},0`}
                stroke="#9d9d9d"
                strokeWidth={2}
              ></path>
              {ticks.map((x, i) => {
                const k = (width - padding.left - padding.right) / (data.range[1] - data.range[0])
                const start = (x - data.range[0]) * k
                return (
                  <g key={i}>
                    <path d={`M${start}, 0 L${start} 10`} stroke="#9d9d9d" strokeWidth={2}></path>
                    <text x={start} y={24}>
                      {x}
                    </text>
                  </g>
                )
              })}
            </g>
            <g className="pots">
              {Object.keys(data.pairs).map((x, i) => {
                const k = (width - padding.left - padding.right) / (data.range[1] - data.range[0])
                const start = (parseFloat(x) - data.range[0]) * k + padding.left
                const circlePerColumn = 14
                const column = Math.floor(data.pairs[x].length / circlePerColumn - 0.0000001)
                const avgColumnCount = Math.floor(data.pairs[x].length / (column + 1))
                const arr = Array(column + 1).fill(avgColumnCount)
                const numSpaces = Math.floor(
                  (column + 1 - (data.pairs[x].length % (column + 1))) / 2
                )
                for (let i = 0; i < data.pairs[x].length % (column + 1); i++) {
                  arr[numSpaces + i] += 1
                }
                for (let i = 1; i < column + 1; i++) {
                  arr[i] += arr[i - 1]
                }
                return (
                  <g key={i} transform={`translate(${start}, 0)`}>
                    {data.pairs[x].map((pair, j) => {
                      let idx = 0
                      for (; idx < column + 1; idx++) {
                        if (j < arr[idx]) {
                          break
                        }
                      }
                      return (
                        <circle
                          key={pair[0].id}
                          cx={idx * cr * 2 - column * cr}
                          cy={
                            height -
                            padding.bottom -
                            confidenceHeight -
                            (j - (arr[idx - 1] || 0)) * cr * 2 -
                            cr
                          }
                          r={cr}
                          className={selectPair === x + '&' + j ? 'selected' : ''}
                          onClick={() => {
                            if (selectPair === x + '&' + j) {
                              dispatch(setSelectPair('-1&-1'))
                            } else {
                              dispatch(setSelectPair(x + '&' + j))
                            }
                          }}
                        ></circle>
                      )
                    })}
                  </g>
                )
              })}
            </g>
            <g
              className="confidence"
              transform={`translate(${padding.left}, ${
                height - padding.bottom - confidenceHeight / 4 - 5
              })`}
            >
              <rect
                x={
                  ((data.confidence[0] - data.range[0]) * (width - padding.left - padding.right)) /
                  (data.range[1] - data.range[0])
                }
                y={0}
                width={
                  ((data.confidence[1] - data.confidence[0]) *
                    (width - padding.left - padding.right)) /
                  (data.range[1] - data.range[0])
                }
                height={confidenceHeight / 2}
              ></rect>
              <text
                x={
                  ((data.confidence[0] - data.range[0]) * (width - padding.left - padding.right)) /
                    (data.range[1] - data.range[0]) -
                  10
                }
                y={confidenceHeight / 4 + 5}
                textAnchor="end"
              >
                {data.confidence[0].toFixed(2)}
              </text>
              <text
                x={
                  ((data.confidence[0] - data.range[0]) * (width - padding.left - padding.right)) /
                    (data.range[1] - data.range[0]) +
                  ((data.confidence[1] - data.confidence[0]) *
                    (width - padding.left - padding.right)) /
                    (data.range[1] - data.range[0]) +
                  10
                }
                y={confidenceHeight / 4 + 5}
                textAnchor="start"
              >
                {data.confidence[1].toFixed(2)}
              </text>
            </g>
            <g className="mean" transform={`translate(${padding.left}, 0)`}>
              <rect
                x={
                  ((data.mean - data.range[0]) * (width - padding.left - padding.right)) /
                  (data.range[1] - data.range[0])
                }
                y={padding.top}
                width={2}
                height={height - padding.bottom - padding.top}
              ></rect>
              <text
                x={
                  ((data.mean - data.range[0]) * (width - padding.left - padding.right)) /
                  (data.range[1] - data.range[0])
                }
                y={padding.top + height - padding.bottom - padding.top + 20}
                textAnchor={'middle'}
              >
                {data.mean.toFixed(2)}
              </text>
            </g>
            <text textAnchor="end" x={width} y={300} fontSize={16}>
              Individual treatment effect
            </text>
          </>
        )}
      </svg>
      <Pair
        pairs={pairs}
        selectPair={selectPair}
        outcome={data.outcome}
        treatment={data.treatment}
      ></Pair>
    </>
  )
}

function Pair(props: {
  pairs: Map<string, any>
  selectPair: string
  outcome: string
  treatment: string
}) {
  const { pairs, selectPair, outcome, treatment } = props
  const [data, setData] = useState<any[]>([])

  const [visLen, setVisLen] = useState(10)
  useEffect(() => {
    let d: any[] = []
    if (pairs.size === 0) return
    if (selectPair !== '-1&-1') {
      const pair = pairs.get(selectPair)
      d.push(
        Object.assign({}, pair[0], {
          key: pair[0].id,
          propensity_score: pair[0].propensity_score.toFixed(2)
        })
      )
      d.push(
        Object.assign({}, pair[1], {
          key: pair[1].id,
          propensity_score: pair[1].propensity_score.toFixed(2)
        })
      )
    }
    for (let key of Array.from(pairs.keys())) {
      if (key === selectPair) continue
      const info = pairs.get(key)
      d.push(
        Object.assign({}, info[0], {
          key: info[0].id,
          propensity_score: info[0].propensity_score.toFixed(2)
        })
      )
      d.push(
        Object.assign({}, info[1], {
          key: info[1].id,
          propensity_score: info[1].propensity_score.toFixed(2)
        })
      )
    }
    setData(d)
    setVisLen(10)
    let node = d3.select('.ant-table-body').node() as any
    node.scrollTop = 0
  }, [pairs, selectPair])

  useEffect(() => {
    if (pairs.size === 0) return
    let node = d3.select('.ant-table-body').node() as any
    node.scrollTop = 0
  }, [selectPair])

  useEffect(() => {
    d3.select('.ant-table-body').on('scroll', (e) => {
      let scrollHeight = e.srcElement.scrollHeight
      let scrollTop = e.srcElement.scrollTop
      let clientHeight = e.srcElement.clientHeight
      if (scrollHeight - scrollTop - clientHeight < 10 && visLen < data.length) {
        setVisLen(visLen + 10)
      }
    })
    return () => {
      d3.select('.ant-table-body').on('scroll', null)
    }
  }, [data, visLen])

  if (pairs.size === 0) {
    return <></>
  }
  const tempNode = pairs.get(Array.from(pairs.keys())[0])[0]
  const left = ['id', 'propensity_score', treatment, outcome]
  const columnsOrder: string[] = [...left]
  const columnsMap: { [key: string]: number } = {}
  Object.keys(tempNode).forEach((key) => {
    if (left.indexOf(key) === -1) {
      columnsOrder.push(key)
      columnsMap[key] = columnsOrder.length - 1
    }
  })

  const arr: any[] = [null, null, null, null]
  for (let d of data) {
    // eslint-disable-next-line no-loop-func
    Object.keys(d).forEach((key) => {
      if (columnsMap[key]) {
        if (typeof d[key] === 'number') {
          if (!arr[columnsMap[key]]) {
            arr[columnsMap[key]] = [d[key], d[key]]
          }
          arr[columnsMap[key]][0] = Math.min(arr[columnsMap[key]][0], d[key])
          arr[columnsMap[key]][1] = Math.max(arr[columnsMap[key]][1], d[key])
        } else {
          if (!arr[columnsMap[key]]) {
            arr[columnsMap[key]] = new Map<string, number>()
          }
          if (!arr[columnsMap[key]].has(d[key])) {
            arr[columnsMap[key]].set(d[key], arr[columnsMap[key]].size)
          }
        }
      }
    })
  }
  const columns: any[] = []

  columnsOrder.map((key: string, i) => {
    let color = d3.interpolate(d3.rgb(250, 250, 250), d3.rgb(231, 231, 231))
    columns.push({
      title: key,
      dataIndex: key,
      key: '' + i,
      render: (text: any, record: any, index: number) => {
        if (arr[i] === null) {
          return (
            <div title={text}>
              <Typography.Paragraph ellipsis>{text}</Typography.Paragraph>
            </div>
          )
        }
        if (index % 2 === 0) {
          if (data[index][key] === data[index + 1][key]) {
            return (
              <div title={text}>
                <Typography.Paragraph ellipsis>{text}</Typography.Paragraph>
              </div>
            )
          } else {
            return (
              <div
                title={text}
                style={{
                  backgroundColor:
                    typeof text === 'number' ? '#fff' : color(arr[i].get(text) / arr[i].size)
                }}
              >
                {typeof text === 'number' ? (
                  <div
                    className="bg"
                    style={{
                      width: `${((text - arr[i][0]) / (arr[i][1] - arr[i][0])) * 100}%`
                    }}
                  ></div>
                ) : (
                  <></>
                )}{' '}
                <Typography.Paragraph ellipsis>{text}</Typography.Paragraph>
              </div>
            )
          }
        } else {
          if (data[index][key] === data[index - 1][key]) {
            return (
              <div title={text}>
                <Typography.Paragraph ellipsis>{text}</Typography.Paragraph>
              </div>
            )
          } else {
            return (
              <div
                title={text}
                style={{
                  backgroundColor:
                    typeof text === 'number' ? '#fff' : color(arr[i].get(text) / arr[i].size)
                }}
              >
                {typeof text === 'number' ? (
                  <div
                    className="bg"
                    style={{
                      width: `${((text - arr[i][0]) / (arr[i][1] - arr[i][0])) * 100}%`
                    }}
                  ></div>
                ) : (
                  <></>
                )}
                <Typography.Paragraph ellipsis>{text}</Typography.Paragraph>
              </div>
            )
          }
        }
      },
      fixed: (arr[i] === null ? 'left' : undefined) as any,
      // ellipsis: true,
      width:
        key === 'id'
          ? 45
          : key === outcome
          ? 90
          : key === 'propensity_score'
          ? 80
          : key === 'Treatment'
          ? 80
          : 82
      // minWidth: 300
    })
  })

  return (
    <div className="pair">
      {/* <Table columns={columns} dataSource={data}></Table> */}
      <Table
        columns={columns}
        dataSource={data.slice(0, visLen)}
        scroll={{ x: 82 * columns.length, y: 240 }}
        pagination={false}
        size={'small'}
        // tableLayout={''}
        className={selectPair !== '-1&-1' ? 'highlight' : ''}
      />
    </div>
  )
}
