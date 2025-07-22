import './LineUpComponent.scss';
import React, { useEffect, useRef } from 'react';
import * as LineUpJS from 'lineupjs'; 

function MyLineUpComponent({ data }) {    
  const myRef = useRef(null);    
  
  useEffect(() => {    
    // 检查data是否有效
    if (!data || data.length === 0) return; // 如果没有数据则不执行
    
    // 生成数据列配置
    const columns = [
      { type: 'string', column: 'd', label: 'Label' },
      // 注意: 如果数据实际上有 'cat', 'cat2' 字段，以下注释可以取消
      // { type: 'categorical', column: 'cat', categories: ['c1', 'c2', 'c3'], color: 'green' },
      // { type: 'categorical', column: 'cat2', categories: ['c1', 'c2', 'c3'], color: 'blue' },
      { type: 'number', column: 'metric1', domain: [0, 10], color: 'grey' },
      { type: 'number', column: 'metric2', domain: [0, 5], color: 'grey' },
      { type: 'number', column: 'metric3', domain: [0, 2], color: 'grey' },
    ];

    // 创建LineUp的数据提供者
    const provider = new LineUpJS.LocalDataProvider(data, columns);

    // 使用LineUp的builder配置LineUp实例
    const lineup = new LineUpJS.Builder(provider)
      .column(LineUpJS.buildStringColumn('d').label('Label').width(100))
      // .column(LineUpJS.buildCategoricalColumn('cat', ['c1', 'c2', 'c3']).color('green'))
      // .column(LineUpJS.buildCategoricalColumn('cat2', ['c1', 'c2', 'c3']).color('blue'))
      .column(LineUpJS.buildNumberColumn('metric1', [0, 10]).color('grey'))
      .column(LineUpJS.buildNumberColumn('metric2', [0, 5]).color('grey'))
      .column(LineUpJS.buildNumberColumn('metric3', [0, 2]).color('grey'))
      .ranking(LineUpJS.buildRanking().allColumns()) // 添加所有列到排名
      .build(myRef.current); // 构建LineUp实例并关联到DOM元素
    
    return () => {
      lineup.destroy(); // 清理资源，销毁LineUp实例
    };    
  }, [data]); // 依赖项数组中包含data，确保数据更新时重新渲染组件

  return <div ref={myRef} style={{ height: '1000px', width: '100%' }}></div>;    
}

export default MyLineUpComponent;
