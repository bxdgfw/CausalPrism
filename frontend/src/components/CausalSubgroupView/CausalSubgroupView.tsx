import { dispatch } from 'd3'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  setAttributesOrder,
  setConceptsOrder,
  setSubgroupsOrder,
  setConfirm,
  setFloatWindowType,
  updateEditSubgroup
} from '../../features/concept/conceptSlice'
import useAxios from '../../hooks/useAxios'
import FloatWindow from '../FloatWindow/FloatWindow'
import './CausalSubgroupView.scss'
import SubgroupTable from './SubgroupTable'
import LineUpComponent from './LineUpComponent'

export interface DatasetInfo {
  attributes_num: number
  subgroups_num: number
}

export interface SubgroupProps {
  id: number
  width: number
  height: number
  orginCharts: { [key: number]: any[] }
  charts: ChartProps[]
  pos: number[]
  name: string
  count: number
}

export interface AttributeProps {
  id: number
  name: string
  width: number
  percent: number
  keyPoints: number[]
  pos: number[]
  data: any[]
  type: string
  range: any[]
}

export interface ConceptProps {
  id: number
  coverage: number
  width: number
  height: number
  orginCharts: { [key: number]: any[] }
  charts: ChartProps[]
  pos: number[]
  name: string
  count: number
}

interface ChartProps {
  attributeId: number
  width: number
  height: number
  range: any[]
  pos: number[]
  type: string
  xData: any[]
  yData: any[]
  id: string
}

interface CausalSubgroupProps {
  attributesMap: Map<number, AttributeProps>
  subgroupMap: Map<number, SubgroupProps>
  // datasetInfo: DatasetInfo
  updateSubgroup: (subgroup: SubgroupProps) => void
  deleteSubgroup: (id: number) => void
  addSubgroup: (id: number) => void
  setSubgroupMap: React.Dispatch<React.SetStateAction<Map<number, SubgroupProps>>>
}

export default function CausalSubgroupView(props: CausalSubgroupProps) {
  const {
    attributesMap,
    subgroupMap: SubgroupMap,
    // datasetInfo,
    updateSubgroup,
    deleteSubgroup,
    addSubgroup,
    setSubgroupMap
  } = props
  const editSubgroup = useSelector((state: any) => state.subgroup.editSubgroup)
  const width = 1000
  const height = 560
  const dispatch = useDispatch()

  const addHandle = () => {
    let idx = Math.max(...Array.from(SubgroupMap.keys())) + 1
    SubgroupMap.set(idx, {
      id: idx,
      orginCharts: [],
      charts: [],
      pos: [0, 0],
      width: 0,
      height: 0,
      name: 'subgroup' + idx,
      count: 0
    })
    setSubgroupMap(new Map<number, SubgroupProps>(SubgroupMap))
    dispatch(updateEditSubgroup(idx))
    dispatch(setFloatWindowType('add'))
  }

  return (
    <>
      <svg viewBox={`0 0 ${width} ${height}`} id="CausalSubgroup-view">
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerUnits="strokeWidth"
            markerWidth="10"
            markerHeight="10"
            orient="auto"
          >
            <path d="M 0 10 L 10 5 L 0 0 L 3 5 z" fill="#545454" />
          </marker>
        </defs>
        {/* <SubgroupViewHeader
          info={datasetInfo}
          // attributesMap={attributesMap}
          subgroupMap={SubgroupMap}
        ></SubgroupViewHeader> */}
        <SubgroupTable attributesMap={attributesMap} subgroupMap={SubgroupMap}></SubgroupTable>
        <g style={{ cursor: 'pointer' }} onClick={addHandle} transform="translate(0,15)">
          <rect x={10} y={760} width={width - 20} height={30} fill="#fff"></rect>
          <path
            d={`M10 760 L10 790 L${width - 20} 790 L ${width - 20} 760Z`}
            fill="none"
            strokeDasharray={'6 6'}
            stroke="#656565"
          ></path>
          <g transform={`translate(${0.4 * width - 25}, 765)`} stroke="#656565">
            <path d="m9.23,18.46C4.13,18.46,0,14.33,0,9.23S4.13,0,9.23,0s9.23,4.13,9.23,9.23-4.13,9.23-9.23,9.23Zm0-1.23c4.42,0,8-3.58,8-8S13.65,1.23,9.23,1.23,1.23,4.81,1.23,9.23s3.58,8,8,8Z" />
            <path d="m4.31,9.85c-.34,0-.62-.28-.62-.62s.28-.62.62-.62h9.85c.34,0,.62.28.62.62s-.28.62-.62.62H4.31Z" />
            <path d="m8.62,4.31c0-.34.28-.62.62-.62s.62.28.62.62v9.85c0,.34-.28.62-.62.62s-.62-.28-.62-.62V4.31Z" />
          </g>
          <text x={width * 0.4} y={780} fontSize={18}>
            Add Subgroup
          </text>
        </g>
        <g
          style={{ cursor: 'pointer' }}
          onClick={() => dispatch(setConfirm(true))}
          transform="translate(0,20)"
        >
          <rect x={10} y={800} width={width - 20} height={30} fill="#fff"></rect>
          <path
            d={`M10 800 L10 830 L${width - 20} 830 L ${width - 20} 800Z`}
            fill="none"
            // strokeDasharray={'6 6'}
            stroke="#656565"
          ></path>
          <g transform={`translate(${0.4 * width - 25}, 805)`} stroke="#656565">
            <path d="m9.68,19.35C4.33,19.35,0,15.02,0,9.68S4.33,0,9.68,0s9.68,4.33,9.68,9.68-4.33,9.68-9.68,9.68Zm0-17.97C5.1,1.38,1.38,5.1,1.38,9.68s3.71,8.29,8.29,8.29,8.29-3.71,8.29-8.29S14.26,1.38,9.68,1.38Z" />
            <path d="m7.75,13.28c-.3,0-.58-.12-.79-.32l-2.07-2.07c-.29-.25-.32-.68-.08-.97s.68-.32.97-.08c.03.02.05.05.08.08l1.87,1.87,5.73-5.67c.27-.27.71-.27.98,0s.27.71,0,.98l-5.9,5.89c-.21.2-.5.31-.79.3h0Z" />
          </g>
          <text x={width * 0.4} y={820} fontSize={18}>
            Confirm
          </text>
        </g>
      </svg>
      {/* {editSubgroup !== -1 && (
        <FloatWindow
          subgroup={SubgroupMap.get(editSubgroup)}
          attributeMap={attributesMap}
          updateSubgroup={updateSubgroup}
          addSubgroup={addSubgroup}
          deleteSubgroup={deleteSubgroup}
        ></FloatWindow>
      )} */}
    </>
  )
}
