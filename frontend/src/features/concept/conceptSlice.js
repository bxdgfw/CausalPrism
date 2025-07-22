import { createSlice } from '@reduxjs/toolkit'

export const conceptSlice = createSlice({
  name: 'concept',
  initialState: {
    selectTable: '',
    selectTreatment: '',
    selectOutcome: '',
    maxLength: 4,
    minCoverage: 5,
    attributesOrder: [],
    conceptsOrder: [],
    subgroupsOrder: [],
    rulesOrder: [],
    selectConcept: -1,
    selectSubgroups: [],
    selectRules: [],
    editConcept: -1,
    editSubgroup: -1,
    selectPair: '-1&-1',
    selectRelationship: -1,
    floatWindowType: 'all',
    confirm: false,
    selectScatterId: []
  },
  reducers: {
    init: (state) => {
      state.maxLength = 4
      state.minCoverage = 5
      state.attributesOrder = []
      state.conceptsOrder = []
      state.subgroupsOrder = []
      state.rulesOrder = []
      state.selectConcept = -1
      state.selectSubgroups = []
      state.selectRules = []
      state.editConcept = -1
      state.editSubgroup = -1
      state.selectPair = '-1&-1'
      state.selectRelationship = -1
      state.selectScatterId = []
    },
    updateTable: (state, action) => {
      state.selectTable = action.payload
    },
    updateTreatment: (state, action) => {
      state.selectTreatment = action.payload
    },
    updateOutcome: (state, action) => {
      state.selectOutcome = action.payload
    },
    updateMaxLength: (state, action) => {
      state.maxLength = action.payload
    },
    updateMinCoverage: (state, action) => {
      state.minCoverage = action.payload
    },
    setAttributesOrder: (state, action) => {
      state.attributesOrder = action.payload
    },
    setConceptsOrder: (state, action) => {
      state.conceptsOrder = action.payload
    },
    setSubgroupsOrder: (state, action) => {
      state.subgroupsOrder = action.payload
    },
    setRulesOrder: (state, action) => {
      state.rulesOrder = action.payload
    },
    setSelectConcept: (state, action) => {
      state.selectConcept = action.payload
    },
    updateSelectSubgroups: (state, action) => {
      const id = action.payload
      const selectSubgroups = state.selectSubgroups
      if (selectSubgroups.includes(id)) {
        state.selectSubgroups = selectSubgroups.filter((subgroup) => subgroup !== id)
      } else {
        state.selectSubgroups = [...selectSubgroups, id]
      }
      // const selection = action.payload
      // const selectSubgroups = state.selectSubgroups
      // if (JSON.stringify(selection) === JSON.stringify(Array.from(selectSubgroups))) return
      // let res = []
      // // 新增一个或者删除的只剩一个
      // if (selection.length === 1) {
      //   // 包含，说明删除的只剩一个
      //   if (selectSubgroups.includes(selection[0])) {
      //     res = selection
      //   } else {
      //     res = [...selectSubgroups, selection[0]]
      //   }
      // } else {
      //   if (selection.length === 0) {
      //     res = selectSubgroups
      //   } else {
      //     res = selection
      //   }
      // }
      // state.selectSubgroups = res
    },
    setSelectSubgroups: (state, action) => {
      state.selectSubgroups = action.payload
    },
    setSelectRules: (state, action) => {
      state.selectRules = action.payload
    },
    updateEditConcept: (state, action) => {
      state.editConcept = action.payload
    },
    updateEditSubgroup: (state, action) => {
      state.editSubgroup = action.payload
    },
    setSelectPair: (state, action) => {
      state.selectPair = action.payload
    },
    setSelectRelationship: (state, action) => {
      state.selectRelationship = action.payload
    },
    setFloatWindowType: (state, action) => {
      state.floatWindowType = action.payload
    },
    setConfirm: (state, action) => {
      state.confirm = action.payload
    },
    setSelectScatterId: (state, action) => {
      state.selectScatterId = action.payload
    }
  }
})

export const {
  init,
  updateTable,
  updateTreatment,
  updateOutcome,
  updateMaxLength,
  updateMinCoverage,
  setAttributesOrder,
  setConceptsOrder,
  setSubgroupsOrder,
  setRulesOrder,
  setSelectConcept,
  updateSelectSubgroups,
  setSelectSubgroups,
  setSelectRules,
  updateEditConcept,
  updateEditSubgroup,
  setSelectPair,
  setSelectRelationship,
  setFloatWindowType,
  setConfirm
} = conceptSlice.actions

export default conceptSlice.reducer
