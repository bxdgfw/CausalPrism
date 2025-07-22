import { useEffect, useState } from 'react'

import * as d3 from 'd3'
import { HierarchyNode, HierarchyLink } from 'd3-hierarchy/index'
import './DecisionTree.scss'

interface MyHierarchyNode extends HierarchyNode<any> {
  x?: number
  y?: number
  x0?: number
  y0?: number
  i?: number
  _children?: MyHierarchyNode[] | undefined
}

interface MyHierarchyLink extends HierarchyLink<any> {
  x?: number
  y?: number
  x0?: number
  y0?: number
  source: MyHierarchyNode
  target: MyHierarchyNode
}

interface diagonalNode {
  x: number
  y: number
}

export default function DecisionTree() {
  const margin = { top: 20, right: 90, bottom: 30, left: 90 }
  const width = 1960 - margin.left - margin.right
  const height = 500 - margin.top - margin.bottom
  function diagonal(s: diagonalNode, d: diagonalNode) {
    let path = `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`

    return path
  }
  const tree = d3.tree().size([height, width])
  const data = {
    name: 'C1',
    condition: '',
    children: [
      {
        name: 'C2',
        condition: '∈',
        children: []
      },
      {
        name: 'C3',
        condition: '∉',
        children: [
          {
            name: 'C4',
            condition: '∈',
            children: []
          }
        ]
      }
    ]
  }
  const [root, setRoot] = useState<MyHierarchyNode | null>(null)

  const update = (source: MyHierarchyNode) => {
    if (source === null || root === null) {
      return
    }
    const duration = 750
    const nodes = root.descendants().reverse()
    const links: MyHierarchyLink[] = root.links()
    const svg = d3.select('#graph').select('svg')
    const gNode = svg.select('.nodes')
    const gLink = svg.select('.links')
    const gCondition = svg.select('.conditions')

    // 重新计算图中点的位置
    tree(root) // 计算纵坐标
    // 赋值横坐标
    nodes.forEach(function (d) {
      d.y = d.depth * 180
    })

    // 节点的加入、更新、删除
    const node = gNode.selectAll('g').data(nodes, (d: any) => d.i)
    // 新加入的节点
    const nodeEnter = node
      .enter()
      .append('g')
      .attr('transform', (d) => `translate(${source.y0},${source.x0})`)
      .on('click', (event, d) => {
        d.children = d.children ? undefined : d._children
        update(d)
      })
    // 节点增加圈
    nodeEnter
      .append('circle')
      .attr('class', 'node')
      .attr('r', 1e-6)
      .style('fill', function (d) {
        return d._children ? 'lightsteelblue' : '#fff'
      })
    // 节点描述文本
    nodeEnter
      .append('text')
      .attr('dy', '.35em')
      .attr('x', function (d) {
        return d.children || d._children ? -13 : 13
      })
      .attr('text-anchor', function (d) {
        return d.children || d._children ? 'end' : 'start'
      })
      .text(function (d) {
        return d.data.name
      })
      .style('fill-opacity', 1e-6)

    // 节点更新
    const nodeUpdate = nodeEnter.merge(node as any)
    // 更新动画
    nodeUpdate
      .transition()
      .duration(duration)
      .attr('transform', function (d) {
        return 'translate(' + d.y + ',' + d.x + ')'
      })
    // 更新节点样式
    nodeUpdate
      .select('circle')
      .attr('r', 10)
      .style('fill', function (d) {
        return d._children ? 'lightsteelblue' : '#fff'
      })
      .attr('cursor', 'pointer')
    // 更新描述样式
    nodeUpdate.select('text').style('fill-opacity', 1).attr('cursor', 'pointer')

    // 移除节点
    const nodeExit = node
      .exit()
      .transition()
      .duration(duration)
      .attr('transform', function (d) {
        return 'translate(' + source.y + ',' + source.x + ')'
      })
      .remove()

    // 更新移除节点、描述的样式
    nodeExit.select('circle').attr('r', 1e-6)
    nodeExit.select('text').style('fill-opacity', 1e-6)

    // 边的加入、更新、删除
    const link = gLink.selectAll('path').data(links, (d: any) => d.target.i)

    // 边的加入
    const linkEnter = link
      .enter()
      .append('path')
      .attr('d', (d: any) => {
        const o = { x: source.x0 as number, y: source.y0 as number }
        return diagonal(o, o)
      })

    // 更新边动画
    const linkUpdate = linkEnter.merge(link as any)
    linkUpdate
      .transition()
      .duration(duration)
      .attr('d', function (d: any) {
        return diagonal(d.target, d.source)
      })

    // 移除边动画
    link
      .exit()
      .transition()
      .duration(duration)
      .attr('d', (d: any) => {
        const o = { x: source.x0 as number, y: source.y0 as number }
        return diagonal(o, o)
      })
      .remove()

    // 条件的加入、更新、删除
    const condition = gCondition.selectAll('text').data(links, (d: any) => d.target.i)

    // 条件的加入
    const noteEnter = condition
      .enter()
      .append('text')
      .text((d) => {
        return d.target.data.condition
      })
      .attr('x', source.y as number)
      .attr('y', source.x as number)
      .attr('dy', -10)
      .style('fill-opacity', 1e-6)
      .attr('text-anchor', 'middle')
    noteEnter
      .merge(condition as any)
      .transition()
      .duration(duration)
      .attr('x', (d) => {
        return (d.source.y! + d.target.y!) / 2
      })
      .attr('y', (d) => {
        return (d.source.x! + d.target.x!) / 2
      })
      .style('fill-opacity', 1)
    condition
      .exit()
      .transition()
      .duration(duration)
      .attr('x', source.y as number)
      .attr('y', source.x as number)
      .style('fill-opacity', 1e-6)
      .remove()

    // Stash the old positions for transition.
    root.eachBefore((d) => {
      d.x0 = d.x
      d.y0 = d.y
    })
  }

  useEffect(() => {
    let _root: MyHierarchyNode = d3.hierarchy(data)
    _root.x0 = height / 2
    _root.y0 = 0
    _root.descendants().forEach((d, i) => {
      d.i = i
      d._children = d.children
      // 决定展开几层
      // if (d.depth) d.children = undefined
    })
    setRoot(_root)
    d3.select('#graph')
      .select('svg')
      .attr('width', width + margin.right + margin.left)
      .attr('height', height + margin.top + margin.bottom)
      .selectAll('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (root === null) {
      return
    }
    update(root)
    return () => {
      d3.select('#graph').select('svg').select('.nodes').selectAll('g').on('click', null)
    }
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root])

  return (
    <div id="graph">
      <svg width={1960} height={500}>
        <g className="links" fill="none" stroke="#555"></g>
        <g className="conditions"></g>
        <g className="nodes"></g>
      </svg>
    </div>
  )
}
