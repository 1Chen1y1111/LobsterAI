import { configureStore } from '@reduxjs/toolkit'
import { modelReducer } from './slices/modelSlice'
import { coworkReducer } from './slices/coworkSlice'
import { skillReducer } from './slices/skillSlice'
import { mcpReducer } from './slices/mcpSlice'
import { scheduledTaskReducer } from './slices/scheduledTaskSlice'
import { quickActionReducer } from './slices/quickActionSlice'

export const store = configureStore({
  reducer: {
    model: modelReducer,
    cowork: coworkReducer,
    skill: skillReducer,
    mcp: mcpReducer,
    scheduledTask: scheduledTaskReducer,
    quickAction: quickActionReducer
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
