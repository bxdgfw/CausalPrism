import './App.scss'
import Header from './components/Header/Header'
import Content from './components/Content/Content'
import { ConfigProvider } from 'antd'

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#6494c1'
        }
      }}
    >
      <div className="App">
        <Header></Header>
        <Content></Content>
      </div>
    </ConfigProvider>
  )
}

export default App
