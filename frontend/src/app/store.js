import { configureStore } from '@reduxjs/toolkit'
import conceptReducer from '../features/concept/conceptSlice'

export default configureStore({
  reducer: {
    concept: conceptReducer
  }
})
