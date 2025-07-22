import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.scss'
import './_globals.scss'
import App from './App'
import store from './app/store'
import { Provider } from 'react-redux'

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <Provider store={store}>
    {/* <React.StrictMode> */}
    <App />
    {/* </React.StrictMode> */}
  </Provider>
)
