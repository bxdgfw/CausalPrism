import { useState, useEffect } from 'react'
import axios from 'axios'
import { AxiosRequestConfig } from 'axios'

export default function useAxios(config: AxiosRequestConfig, options: { trigger: boolean }) {
  const [output, setOutput] = useState<{ data: any; error: any; loading: boolean }>({
    data: undefined,
    error: undefined,
    loading: false
  })

  const refetch = (overwriteConfig?: AxiosRequestConfig) => {
    setOutput({ data: null, error: null, loading: true })
    return axios
      .request(Object.assign({}, config, overwriteConfig))
      .then((data) => setOutput({ ...output, data, loading: false }))
      .catch((error) => setOutput({ ...output, error, loading: false }))
  }

  useEffect(() => {
    if (options.trigger) {
      refetch()
    }
  }, [])
  return { ...output, refetch }
}
