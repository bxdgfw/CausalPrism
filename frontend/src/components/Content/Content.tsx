import './Content.scss'
import ValidationView from '../ValidationView/ValidationView'
import {
  ConceptViewIcon,
  SubgroupViewIcon,
  CovariatesIcon,
  TreatmentEffectValidationViewIcon
} from '../../assets/index'
import ConceptView, { AttributeProps, ConceptProps, DatasetInfo } from '../ConceptView/ConceptView'
import SubgroupView from '../SubgroupView/SubgroupView'
import { useEffect, useState } from 'react'
import {
  setAttributesOrder,
  setConceptsOrder,
  setSelectSubgroups,
  updateEditConcept
} from '../../features/concept/conceptSlice'
import { useDispatch, useSelector } from 'react-redux'
import useAxios from '../../hooks/useAxios'
import CausalSubgroupView, { SubgroupProps } from '../CausalSubgroupView/CausalSubgroupView'
import CovariatesProjectionView from '../CovariatesProjectionView/CovariatesProjectionView'
import { updateData } from 'lineupjs'

export default function Content() {
  const selectTable = useSelector((state: any) => state.concept.selectTable)
  const selectOutcome = useSelector((state: any) => state.concept.selectOutcome)
  const conceptsOrder = useSelector((state: any) => state.concept.conceptsOrder)
  const selectTreatment = useSelector((state: any) => state.concept.selectTreatment)
  const minCoverage = useSelector((state: any) => state.concept.minCoverage)
  const maxLenght = useSelector((state: any) => state.concept.maxLenght)

  const dispatch = useDispatch()
  const {
    data: conceptData,
    error: conceptError,
    refetch: conceptRefetch
  } = useAxios(
    {
      url: '/api/get_subgroups',
      method: 'get',
      params: { data_table: selectTable }
    },
    { trigger: false }
  )

  const { data: addData, refetch: addRefetch } = useAxios(
    {
      url: '/api/add_subgroup',
      method: 'post'
    },
    { trigger: false }
  )

  const { data: editData, refetch: editRefetch } = useAxios(
    {
      url: '/api/edit_subgroup',
      method: 'post'
    },
    { trigger: false }
  )

  const { data: deleteData, refetch: deleteRefetch } = useAxios(
    {
      url: '/api/delete_subgroup',
      method: 'post'
    },
    { trigger: false }
  )

  const [attributesMap, setAttributesMap] = useState<Map<number, AttributeProps>>(
    new Map<number, AttributeProps>()
  )
  const [conceptsMap, setConceptsMap] = useState<Map<number, ConceptProps>>(
    new Map<number, ConceptProps>()
  )
  const [datasetInfo, setDatasetInfo] = useState<DatasetInfo>({
    attributes_num: 0,
    concepts_num: 0,
    records_num: 0
  })
  const [unitsInSubgroup, setUnitsInSubgroup] = useState<number[]>([])

  useEffect(() => {
    if (!selectOutcome) return
    conceptRefetch({
      data: {
        data_table: selectTable,
        treatment: selectTreatment,
        outcome: selectOutcome,
        min_coverage: minCoverage,
        max_length: maxLenght
      }
    })
  }, [selectOutcome, minCoverage, maxLenght])

  useEffect(() => {
    if (!conceptData) return
    const attributes = conceptData.data.attributes
    const concepts = conceptData.data.subgroup
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
        name: 'S' + concept.id,
        count: concept.count,
        metrics: concept.metrics,
        'covered id': concept['covered id'],
        tag: concept.tag || 'S' + concept.id
      })
    }
    setUnitsInSubgroup(conceptData.data.causal_units_id)
    setAttributesMap(attributesMap)
    setConceptsMap(conceptsMap)
    setDatasetInfo(conceptData.data.dataset_info)
    dispatch(setAttributesOrder(attributes.map((attr: any) => attr.id)))
    dispatch(setConceptsOrder(concepts.map((concept: any) => concept.id)))
  }, [conceptData])

  const updateConcept = (concept: ConceptProps) => {
    if (concept) conceptsMap.set(concept.id, concept)
    setConceptsMap(new Map<number, ConceptProps>(conceptsMap))
  }

  const editConceptHandel = (id: number) => {
    const concept = conceptsMap.get(id)
    if (!concept) return
    editRefetch({ data: { id: concept.id, tag: concept.tag, charts: concept.orginCharts } })
  }

  const deleteConcept = (id: number) => {
    conceptsMap.delete(id)
    dispatch(setConceptsOrder(conceptsOrder.filter((attrId: number) => attrId !== id)))
    dispatch(setSelectSubgroups([]))
    setConceptsMap(new Map<number, ConceptProps>(conceptsMap))
    deleteRefetch({ data: { id: id } })
  }

  const addConcept = (id: number) => {
    let temp = [...conceptsOrder]
    temp.push(id)
    const concept = conceptsMap.get(id)
    if (!concept) return
    addRefetch({ data: { id: id, tag: concept.tag, charts: concept.orginCharts } })
    dispatch(setConceptsOrder(temp))
  }

  useEffect(() => {
    if (!addData) return
    // console.log(addData.data)

    const subgroup = addData.data.subgroup[0]
    const concept = conceptsMap.get(subgroup.id)
    if (!concept) return
    conceptsMap.set(subgroup.id, {
      id: subgroup.id,
      charts: subgroup.charts,
      metrics: subgroup.metrics,
      'covered id': subgroup['covered id'],
      orginCharts: subgroup.charts,
      coverage: concept.coverage,
      pos: [0, 0],
      width: 0,
      height: 0,
      name: 'S' + concept.id,
      count: concept.count,
      tag: subgroup.tag || 'S' + concept.id
    })
    setConceptsMap(new Map<number, ConceptProps>(conceptsMap))
    setUnitsInSubgroup(addData.data.causal_units_id)
  }, [addData])

  useEffect(() => {
    if (!editData) return
    const subgroup = editData.data.subgroup[0]
    const concept = conceptsMap.get(subgroup.id)
    if (!concept) return
    conceptsMap.set(subgroup.id, {
      id: subgroup.id,
      charts: subgroup.charts,
      metrics: subgroup.metrics,
      'covered id': subgroup['covered id'],
      orginCharts: subgroup.charts,
      coverage: concept.coverage,
      pos: [0, 0],
      width: 0,
      height: 0,
      name: 'S' + concept.id,
      count: concept.count,
      tag: subgroup.tag || 'S' + concept.id
    })
    setConceptsMap(new Map<number, ConceptProps>(conceptsMap))
    setUnitsInSubgroup(editData.data.causal_units_id)
  }, [editData])

  useEffect(() => {
    if (!deleteData) return
    setUnitsInSubgroup(deleteData.data.causal_units_id)
  }, [deleteData])

  return (
    <div className="content">
      <div className="top">
        <div className="left">
          <div className="card1">
            <div className="card-title">
              <div className="title">
                <img className="title-icon" src={SubgroupViewIcon} alt="" />
                Causal Subgroup View
              </div>
              <div className="under-line"></div>
            </div>
            <div className="card-content concept-view">
              <div className="grid">
                <ConceptView
                  conceptsMap={conceptsMap}
                  datasetInfo={datasetInfo}
                  attributesMap={attributesMap}
                  updateConcept={updateConcept}
                  deleteConcept={deleteConcept}
                  addConcept={addConcept}
                  editConceptHandel={editConceptHandel}
                  setConceptsMap={setConceptsMap}
                ></ConceptView>
              </div>
              {/* <CausalSubgroupView
                attributesMap={attributesMap}
                subgroupMap={subgroupsMap}
                updateSubgroup={() => {}}
                deleteSubgroup={() => {}}
                addSubgroup={() => {}}
                setSubgroupMap={setSubgroupsMap}
                // datasetInfo={datasetInfo}
              /> */}
            </div>
          </div>
        </div>
        <div className="right">
          <div className="card2">
            <div className="card-title">
              <div className="title">
                <img className="title-icon" src={CovariatesIcon} alt="" />
                Covariates Projection View
              </div>
              <div className="under-line"></div>
            </div>
            <div className="card-content Subgroup-view">
              <CovariatesProjectionView
                conceptsMap={conceptsMap}
                setConceptsMap={setConceptsMap}
                unitsInSubgroup={unitsInSubgroup}
              />
              {/* <SubgroupView conceptsMap={conceptsMap}></SubgroupView> */}
            </div>
          </div>
        </div>
      </div>
      <div className="bottom">
        <div className="card3">
          <div className="card-title">
            <div className="title">
              <img className="title-icon" src={TreatmentEffectValidationViewIcon} alt="" />
              Treatment Effect Validation View
            </div>
            <div className="under-line"></div>
          </div>
          <div className="card-content validation-view">
            <ValidationView />
          </div>
        </div>
      </div>
    </div>
  )
}
