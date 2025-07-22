import { dispatch } from 'd3'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  setAttributesOrder,
  setConceptsOrder,
  setConfirm,
  setFloatWindowType,
  setSelectSubgroups,
  updateEditConcept
} from '../../features/concept/conceptSlice'
import useAxios from '../../hooks/useAxios'
import FloatWindow from '../FloatWindow/FloatWindow'
import './ConceptView.scss'
import ConceptViewHeader from './ConceptViewHeader'
import ConceptViewTable from './ConceptViewTable'
import MyLineUpComponent from '../CausalSubgroupView/LineUpComponent'
import LineUpContent from './LineUpContent'
import * as d3 from 'd3'
import { Button, Descriptions, Tooltip, message } from 'antd'
import { Add, Delete, Edit } from '../../assets'

export interface DatasetInfo {
  attributes_num: number
  concepts_num: number
  records_num: number
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
  charts: { [key: number]: any[] }
  pos: number[]
  name: string
  count: number
  metrics: any
  ['covered id']: number[]
  tag: string
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

interface ConceptViewProps {
  attributesMap: Map<number, AttributeProps>
  conceptsMap: Map<number, ConceptProps>
  datasetInfo: DatasetInfo
  updateConcept: (concept: ConceptProps) => void
  deleteConcept: (id: number) => void
  addConcept: (id: number) => void
  editConceptHandel: (id: number) => void
  setConceptsMap: React.Dispatch<React.SetStateAction<Map<number, ConceptProps>>>
}

export default function ConceptView(props: ConceptViewProps) {
  const {
    attributesMap,
    conceptsMap,
    datasetInfo,
    updateConcept,
    deleteConcept,
    addConcept,
    editConceptHandel,
    setConceptsMap
  } = props
  const editConcept = useSelector((state: any) => state.concept.editConcept)
  const conceptsOrder: number[] = useSelector((state: any) => state.concept.conceptsOrder)
  const attributesOrder: number[] = useSelector((state: any) => state.concept.attributesOrder)
  const selectSubgroups = useSelector((state: any) => state.concept.selectSubgroups)
  const width = 728
  const height = 550
  const dispatch = useDispatch()

  const addHandle = () => {
    let idx = Math.max(...Array.from(conceptsMap.keys())) + 1
    conceptsMap.set(idx, {
      id: idx,
      orginCharts: {},
      charts: {},
      coverage: 0,
      pos: [0, 0],
      width: 0,
      height: 0,
      name: 'S' + idx,
      count: 0,
      metrics: {},
      'covered id': [],
      tag: 'subgroup' + idx
    })
    setConceptsMap(new Map<number, ConceptProps>(conceptsMap))
    dispatch(updateEditConcept(idx))
    dispatch(setFloatWindowType('add'))
  }

  const editHandle = () => {
    if (selectSubgroups.length > 0) {
      dispatch(setFloatWindowType('edit'))
      dispatch(updateEditConcept(selectSubgroups[0]))
    }
  }

  // const rectHeight = 390 / (conceptsOrder.length || 1)
  const rectHeight = 30

  return (
    <>
      <div className="buttons" style={{ position: 'absolute', top: 8, left: 380, display: 'flex' }}>
        <Button
          onClick={addHandle}
          style={{ marginRight: 15, display: 'flex', alignItems: 'center' }}
        >
          <img src={Add} alt="" style={{ width: 16, height: 16, marginRight: 5 }} />
          Add Subgroup
        </Button>
        <Button
          onClick={() => {
            if (selectSubgroups.length === 1) {
              deleteConcept(selectSubgroups[0])
            } else {
              message.error('Please select one subgroup to delete')
            }
          }}
          style={{ marginRight: 15, display: 'flex', alignItems: 'center' }}
        >
          <img src={Delete} alt="" style={{ width: 16, height: 16, marginRight: 5 }} />
          Delete Subgroups
        </Button>
        <Button
          onClick={editHandle}
          style={{ marginRight: 15, display: 'flex', alignItems: 'center' }}
        >
          <img src={Edit} alt="" style={{ width: 16, height: 16, marginRight: 5 }} />
          Edit Subgroup
        </Button>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} id="concept-view">
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
        <ConceptViewTable
          attributesMap={attributesMap}
          conceptsMap={conceptsMap}
        ></ConceptViewTable>

        <svg
          id="subgroup-names"
          x={0}
          y={0}
          viewBox={`0 0 50 ${conceptsOrder.length * rectHeight + 150}`}
          width={50}
          height={`${conceptsOrder.length * rectHeight + 150}`}
        >
          <g className="subgroup-name">
            {conceptsOrder.map((id, idx) => {
              const concept = conceptsMap.get(id)
              // console.log(concept)
              const items = [
                {
                  key: '1',
                  label: 'tag',
                  children: concept?.tag
                },
                ...(Object.keys(concept?.orginCharts || {}) || []).map((chart, idx) => {
                  return {
                    key: idx + 2,
                    label: attributesMap.get(Number(chart))?.name,
                    children:
                      attributesMap.get(Number(chart))?.type === 'number'
                        ? `${concept?.orginCharts[Number(chart)][0].toFixed(
                            2
                          )} ~ ${concept?.orginCharts[Number(chart)][1].toFixed(2)}`
                        : concept?.orginCharts[Number(chart)].join(', ')
                  }
                })
              ]
              return (
                <Tooltip
                  placement="rightTop"
                  color="#fff"
                  title={<Descriptions column={1} items={items} />}
                >
                  <text
                    textAnchor="end"
                    x={48}
                    y={idx * rectHeight + rectHeight + 150}
                    fontSize={13}
                    key={id}
                    fill={selectSubgroups.includes(id) ? '#f1a340' : '#afafaf'}
                    fontWeight={500}
                    onClick={() => {
                      if (selectSubgroups.includes(id)) {
                        dispatch(
                          setSelectSubgroups(
                            selectSubgroups.filter((subgroup: number) => subgroup !== id)
                          )
                        )
                      } else {
                        dispatch(setSelectSubgroups([...selectSubgroups, id]))
                      }
                    }}
                  >
                    {concept?.name}
                  </text>
                </Tooltip>
              )
            })}
          </g>
        </svg>
        <rect x={0} y={0} width={49} height={160} fill="#fff" />
        <rect x={0} y={510} width={49} height={60} fill="#fff" />
        <g>
          {attributesOrder.length > 0 && (
            <text
              x={15}
              y={120}
              fontSize={16}
              fontWeight={600}
              fill="#656565"
              transform="rotate(-90)"
              // @ts-ignore
              transform-origin="15 120"
              textAnchor="start"
            >
              Covariates(
              <tspan style={{ textDecoration: 'underline' }}>{attributesOrder.length}</tspan>)
            </text>
          )}
          {conceptsOrder.length > 0 && (
            <text
              x={15}
              y={250}
              fontSize={16}
              fontWeight={600}
              fill="#656565"
              transform="rotate(-90)"
              // @ts-ignore
              transform-origin="15 250"
              textAnchor="start"
            >
              Subgroups(
              <tspan style={{ textDecoration: 'underline' }}>{conceptsOrder.length}</tspan>)
            </text>
          )}
        </g>
      </svg>
      {conceptsMap.size > 0 && <LineUpContent conceptsMap={conceptsMap} />}
      {editConcept !== -1 && (
        <FloatWindow
          concept={conceptsMap.get(editConcept)}
          attributeMap={attributesMap}
          updateConcept={updateConcept}
          addConcept={addConcept}
          deleteConcept={deleteConcept}
          editConceptHandel={editConceptHandel}
        ></FloatWindow>
      )}
    </>
  )
}
