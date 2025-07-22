import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import './Table.scss'

interface TableProps {
  columns: columnProps[]
  dataSource: any[]
}

interface columnProps {
  key: string
  fixed: boolean
  width: number
  title: string
}

export default function Table(props: TableProps) {
  const { columns, dataSource } = props
  const tableRef = useRef(null)
  const columnsKeys = columns.map((column) => column.title)

  useEffect(() => {
    // 获取表格容器和表头行
    const tableContainer = d3.select(tableRef.current).select('.table-body')
    const tableHeader = d3.select(tableRef.current).select('.table-columns')

    // 监听滚动事件
    tableContainer.on('scroll', () => {
      const scrollLeft: number = (tableContainer.node() as any).scrollLeft
      const tableHeaderNode = tableHeader.node() as any
      tableHeaderNode.scrollLeft = scrollLeft

      // 修复表头和表格内容错位的问题
      tableHeader.selectAll('.fixed').style('transform', `translateX(${scrollLeft}px)`)
      tableContainer.selectAll('.fixed').style('transform', `translateX(${scrollLeft}px)`)
    })
  }, [])

  return (
    <div className="table-container" ref={tableRef}>
      <div className="table-columns">
        <table>
          <thead>
            <tr>
              {columns.map((column) => {
                return (
                  <th className={column.fixed ? 'fixed' : ''} style={{ width: column.width }}>
                    {column.title}
                  </th>
                )
              })}
            </tr>
          </thead>
        </table>
      </div>
      <div className="table-body">
        <table>
          <colgroup>
            {columnsKeys.map((key, i) => {
              return <col style={{ width: columns[i].width }} />
            })}
          </colgroup>
          <tbody>
            {dataSource.map((data) => {
              return (
                <tr>
                  {columnsKeys.map((key, i) => {
                    return (
                      <td scope="col" className={columns[i].fixed ? 'fixed' : ''}>
                        {data[key]}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
