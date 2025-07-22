import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import useAxios from '../../hooks/useAxios'
import DensityBar, { DensityBarProps } from './DensityBar'

import DotPlot, { DotPlotProps } from './DotPlot'
import ForestPlot, { ForestPlotProps } from './ForestPlot'
import './ValidationView.scss'

export default function ValidationView() {
  const selectSubgroups: number[] = useSelector((state: any) => state.concept.selectSubgroups)
  const [subgroupId, setSubgroupId] = useState<number>(-1)

  const {
    data: dotData,
    error: dotError,
    refetch: dotRefetch
  } = useAxios(
    {
      url: '/api/get_dotplot',
      method: 'post',
      data: { subgroup_id: subgroupId }
    },
    { trigger: false }
  )
  const [barChartData, setBarChartData] = useState<DensityBarProps>({
    range: [0, 1],
    treatment: [],
    control: []
  })

  const [dotDetails, setDotDetails] = useState<DotPlotProps>({
    range: [0, 0],
    pairs: {},
    mean: 0,
    confidence: [0, 0],
    treatment: '',
    outcome: '',
    length: 0
  })

  const [treatmentCount, setTreatmentCount] = useState(0)
  const [controlCount, setControlCount] = useState(0)
  const [matchedCount, setMatchedCount] = useState(0)

  useEffect(() => {
    if (selectSubgroups.length === 0) {
      setSubgroupId(-1)
      return
    }
    if (subgroupId === selectSubgroups[0]) return
    setSubgroupId(selectSubgroups[0])
  }, [selectSubgroups])

  useEffect(() => {
    if (subgroupId === -1) return
    dotRefetch()
  }, [subgroupId])

  useEffect(() => {
    if (!dotData) return
    setDotDetails({
      range: [Math.floor(dotData.data.range[0]), Math.ceil(dotData.data.range[1])],
      pairs: dotData.data.pairs,
      length: dotData.data.length,
      mean: dotData.data.mean,
      confidence: dotData.data.confidence,
      treatment: dotData.data.treatment,
      outcome: dotData.data.outcome
    })
    setBarChartData(dotData.data.barchart)
    setTreatmentCount(
      dotData.data.barchart.treatment.reduce((pre: number, cur: number) => {
        return pre + cur
      }, 0)
    )
    setControlCount(
      dotData.data.barchart.control.reduce((pre: number, cur: number) => {
        return pre + cur
      }, 0)
    )
    setMatchedCount(dotData.data.length)
  }, [dotData])

  return (
    <>
      <div className="rootrow">
        <div className="validation-info">
          <div className="column">
            <div className="row">
              {subgroupId !== -1 && dotData && (
                <>
                  <div>
                    #Treatment: <span>{treatmentCount}</span>
                  </div>
                  <div>
                    #Control: <span>{controlCount}</span>
                  </div>
                  <div>
                    #Matched pairs: <span>{matchedCount}</span>
                  </div>
                </>
              )}
            </div>
            {subgroupId !== -1 && dotData && <DensityBar barChartData={barChartData}></DensityBar>}
          </div>
        </div>
        {subgroupId !== -1 && dotData && <DotPlot data={dotDetails}></DotPlot>}
      </div>
    </>
  )
}
