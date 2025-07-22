import './Header.scss'
import { InputNumber, Radio, Select, Slider, Col, Row } from 'antd'
import { CausalPrismIcon, help } from '../../assets/index'
import { useSelector, useDispatch } from 'react-redux'
import {
  init,
  updateMaxLength,
  updateMinCoverage,
  updateOutcome,
  updateTable,
  updateTreatment
} from '../../features/concept/conceptSlice'
import useAxios from '../../hooks/useAxios'
import { useState, useEffect } from 'react'

export default function Header() {
  const selectTable = useSelector((state: any) => state.concept.selectTable)
  const selectTreatment = useSelector((state: any) => state.concept.selectTreatment)
  const selectOutcome = useSelector((state: any) => state.concept.selectOutcome)
  const minCoverage = useSelector((state: any) => state.concept.minCoverage)
  const maxLength = useSelector((state: any) => state.concept.maxLength)
  const [MinCoverageFilter, setMinCoverageFilter] = useState<number>(minCoverage)
  const dispatch = useDispatch()

  const {
    data: tableData,
    error: tableError,
    refetch: tableRefetch
  } = useAxios({ url: '/api/get_tables', method: 'get' }, { trigger: false })

  const {
    data: TreatmentData,
    error: TreatmentError,
    refetch: TreatmentRefetch
  } = useAxios(
    { url: '/api/get_treatments?data_table=' + selectTable, method: 'get' },
    { trigger: false }
  )
  const {
    data: outComeData,
    error: outComeError,
    refetch: outComeRefetch
  } = useAxios(
    { url: '/api/get_outcomes?data_table=' + selectTable, method: 'get' },
    { trigger: false }
  )

  const [tableList, setTableList] = useState<string[]>([])
  const [treatmentList, setTreatmentList] = useState<string[]>([])
  const [outcomeList, setOutcomeList] = useState<string[]>([])

  // 页面加载，请求表格列表
  useEffect(() => {
    tableRefetch()
  }, [])

  // 完成请求表格列表后，更新表格列表
  useEffect(() => {
    if (tableData) {
      setTableList(tableData?.data?.data)
      dispatch(init())
    }
  }, [tableData])

  // 选择表格后，请求treatment列表
  useEffect(() => {
    if (!selectTable) return
    dispatch(updateTreatment(''))
    TreatmentRefetch({ url: '/api/get_treatments?data_table=' + selectTable, method: 'get' })
  }, [selectTable])

  // 完成请求treatment列表后，更新treatment列表
  useEffect(() => {
    if (TreatmentData) {
      setTreatmentList(TreatmentData?.data?.data)
      dispatch(updateTreatment(TreatmentData?.data?.treatment))
    }
  }, [TreatmentData])

  // 选择表格后，请求outcome列表
  useEffect(() => {
    if (!selectTable) return
    dispatch(updateOutcome(''))
    outComeRefetch({ url: '/api/get_outcomes?data_table=' + selectTable, method: 'get' })
  }, [selectTable])

  // 完成请求outcome列表后，更新outcome列表
  useEffect(() => {
    if (outComeData) {
      setOutcomeList(outComeData?.data?.data)
      dispatch(updateOutcome(outComeData?.data?.outcome))
    }
  }, [outComeData])

  useEffect(() => {
    setMinCoverageFilter(minCoverage)
  }, [minCoverage])

  return (
    <>
      <div id="header">
        <div id="header-title">
          <img className="header-icon" src={CausalPrismIcon} alt="" />
          <div>CausalPrism</div>
        </div>
        <div id="header-icons">
          <span className="tables">Dataset</span>
          <Select
            defaultValue=""
            style={{ width: '12rem', lineHeight: '1.5rem' }}
            onChange={(value) => dispatch(updateTable(value))}
            size="small"
            options={tableList.map((item: any) => {
              return { label: item, value: item }
            })}
          />
          <span className="tables">Treatment</span>
          <Select
            defaultValue=""
            style={{ width: '12rem', lineHeight: '1.5rem' }}
            value={selectTreatment}
            onChange={(value) => dispatch(updateTreatment(value))}
            size="small"
            options={treatmentList.map((item: any) => {
              return { label: item, value: item }
            })}
          />
          <span className="tables">Outcome</span>
          <Select
            defaultValue=""
            style={{ width: '12rem', lineHeight: '1.5rem' }}
            onChange={(value) => dispatch(updateOutcome(value))}
            size="small"
            value={selectOutcome}
            options={outcomeList.map((item: any) => {
              return { label: item, value: item }
            })}
          />
          <span className="tables" style={{ marginRight: '10px' }}>
            Max Length
          </span>
          <InputNumber value={maxLength} onChange={(v) => dispatch(updateMaxLength(v))} />
          <span className="tables">Min Coverage</span>
          <Row style={{ width: '10rem' }}>
            <Col span={12}>
              <Slider
                min={0}
                max={20}
                onChangeComplete={(newValue) => {
                  dispatch(updateMinCoverage(newValue))
                }}
                value={MinCoverageFilter}
                onChange={setMinCoverageFilter}
                //disabled={showType === 'matched'}
              />
            </Col>
            <Col span={12}>
              <InputNumber
                className="MinCoverage"
                onChange={(newValue) => {
                  if (newValue) dispatch(updateMinCoverage(newValue))
                }}
                value={minCoverage}
                //disabled={showType === 'matched'}
                controls={false}
              />
            </Col>
          </Row>
          <div className="hr"></div>
          <img className="header-icon" src={help} alt="" />
          <span>Help</span>
        </div>
      </div>
    </>
  )
}
