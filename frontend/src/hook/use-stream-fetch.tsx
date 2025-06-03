// use this hook to fetch data from a stream
// get the cumulative response as it is read
import {useCallback, useEffect, useRef, useState} from 'react'

interface TError extends Record<string, any> {
    error: string,
    status?: number
}

interface FetchStreamingDataParams {
    api: string
    headers?: HeadersInit
    body?: Record<string, any>
    onData: (data: string, params?: any) => void
    onDone?: (data: string, params?: any) => void
    onError?: (error: TError, params?: any) => void
    maxTimeout?: number
}

interface UseFetchStreamingDataReturn {
    fetchData: (params?: any) => Promise<void>
    abort: () => void
}

/**
 * A custom React hook to fetch data from a streaming API.
 * It handles the streaming response, timeout, and cancellation.
 *
 * @param api - The API endpoint to fetch data from.
 * @param body - (Optional) The request body for the API.
 * @param onData - A callback function to handle the received data.
 * @param onDone - (Optional) A callback function to handle the completion of the stream.
 * @param onError - (Optional) A callback function to handle any errors.
 * @param maxTimeout - (Optional) The maximum timeout for the stream in milliseconds. Default is 30000.
 *
 * @returns An object with `fetchData` and `abort` functions.
 * - `fetchData`: A function to initiate the streaming data fetch.
 * - `abort`: A function to cancel the fetch operation.
 */
export const useFetchStreamingData = ({
                                          api,
                                          body,
                                          headers,
                                          onData,
                                          onDone,
                                          onError,
                                          maxTimeout = 30000
                                      }: FetchStreamingDataParams): UseFetchStreamingDataReturn => {
    const controller = useRef(new AbortController())
    const timeoutId = useRef<NodeJS.Timeout | null>(null)

    // 清除超时定时器
    const clearFetchTimeout = () => {
        if (timeoutId.current) {
            clearTimeout(timeoutId.current)
            timeoutId.current = null
        }
    }

    // 设置活动超时定时器
    const setActivityTimeout = () => {
        clearFetchTimeout()
        if (timeoutId.current) {
            timeoutId.current = setTimeout(() => {
                controller.current.abort()
                onError?.({error: 'Stream timeout due to inactivity'})
            }, maxTimeout)
        }
    }

    const fnFetchData = async (
        // controller: MutableRefObject<AbortController>,
        params?: any
    ) => {
        try {
            setActivityTimeout()
            console.log('Fetch data from:', api)
            const response = await fetch(api, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                body: params ? JSON.stringify(params) : JSON.stringify(body),
                signal: controller.current.signal
            })

            // 清除超时定时器
            clearFetchTimeout()

            if (response.status !== 200) {
                console.log('response:', response)
                onError?.({error: response.statusText, status: response.status}, params || body)
                return
            }

            const stream = response.body
            if (!stream) {
                onError?.({
                    error:
                        'Oops, something went wrong with the generation, please try again.'
                }, params || body)
                return
            }

            const reader = stream.getReader()
            const decoder = new TextDecoder()
            let done = false
            let responseString = ''

            while (!done) {
                setActivityTimeout() // 重置活动超时

                if (controller.current.signal.aborted) {
                    console.log('Fetch aborted by the user.')
                    return
                }
                const {value, done: doneReading} = await reader.read()
                done = doneReading
                if (value) {
                    responseString += decoder.decode(value, {stream: true})
                    onData(responseString, params || body)
                }
            }

            onDone?.(responseString, params || body)
        } catch (error) {
            if (controller.current.signal.aborted) {
                console.log('Fetch aborted by the user.')
            } else {
                console.error('Fetch error:', error as Error)
                onError?.({
                    error:
                        'Oops, something went wrong with the generation, please try again.'
                })
            }
        } finally {
            clearFetchTimeout() // 清除任何现存的超时定时器
        }
    }
    const fetchData = useCallback(
        async (params?: Record<string, any>) => {
            controller.current = new AbortController()
            fnFetchData(params)
        },
        [api, body, onData, onDone, onError, fnFetchData]
    )

    const abort = useCallback(() => {
        if (!controller.current.signal.aborted) {
            controller.current.abort()
        }
    }, [controller])

    return {fetchData, abort}
}

interface UseFetchOptions {
    timeout?: number // 超时时间（毫秒）
}

interface UseFetchReturn<T> {
    fetchData: (url: string, options?: RequestInit) => Promise<T>
    cancel: () => void
}

/**
 * A custom React hook to fetch data with an optional timeout.
 * It handles cancellation and rethrows fetch errors.
 *
 * @param timeout - (Optional) The timeout for the fetch in milliseconds. Default is 300000.
 *
 * @returns An object with `fetchData` and `cancel` functions.
 * - `fetchData`: A function to initiate the fetch operation.
 * - `cancel`: A function to cancel the fetch operation.
 */
export function useFetch<T = any>({
                                      timeout = 300 * 1000
                                  }: UseFetchOptions = {}): UseFetchReturn<T> {
    const [controller, setController] = useState<AbortController | null>(null)
    const fetchData = useCallback(
        async (url: string, options: RequestInit = {}) => {
            const abortCtrl = new AbortController()
            const signal = abortCtrl.signal
            setController(abortCtrl)

            const timeoutId = setTimeout(() => abortCtrl.abort(), timeout)

            try {
                const response = await fetch(url, {...options, signal})
                clearTimeout(timeoutId) // 清除超时计时器
                if (!response.ok) {
                    throw new Error(`${response.status} ${response.statusText}`)
                }
                const contentType = response.headers.get('content-type')
                if (contentType && contentType.includes('application/json')) {
                    return response.json()
                } else {
                    return response.text() as unknown as T // 非 JSON 响应的默认处理
                }
            } catch (error: any) {
                clearTimeout(timeoutId) // 清除超时计时器
                if (error?.name === 'AbortError') {
                    console.log('Fetch aborted by the user.')
                } else {
                    console.error('Fetch error:', error as Error)
                }
                throw error // 重新抛出错误，以便外部调用者可以捕获
            }
        },
        [timeout]
    )
    const cancel = useCallback(() => {
        controller?.abort()
    }, [controller])

    useEffect(() => {
        return () => {
            controller?.abort() // 组件卸载时取消请求
        }
    }, [controller])

    return {fetchData, cancel}
}



interface UseFetchSSEReturn {
  data: string[];
  error: Event | null;
  close: () => void;
}

interface UseFetchSSEOptions {
  onOpen?: (e: Event) => void;
  onMessage?: (e: MessageEvent) => void;
  onError?: (e: Event) => void;
  customEvents?: Record<string, (e: MessageEvent) => void>;
}

/**
 * A custom React hook to fetch data from a server-sent event (SSE) endpoint.
 * It handles the connection, data, and error events.
 *
 * @param url - The URL of the SSE endpoint.
 * @param options - (Optional) An object with callbacks for open, message, and error events.
 *
 * @returns An object with `data`, `error`, and `close` functions.
 * - `data`: An array of received data.
 * - `error`: The error event object.
 * - `close`: A function to close the SSE connection.
 */
export const useFetchSSE = (url: string, options?: UseFetchSSEOptions): UseFetchSSEReturn => {
  const [data, setData] = useState<string[]>([]);
  const [error, setError] = useState<Event | null>(null);

  useEffect(() => {
    const source = new EventSource(url);

    source.onopen = options?.onOpen || (() => console.log('SSE opened'));
    source.onmessage = (event) => {
      setData((prevData) => [...prevData, event.data]);
      if (options?.onMessage) options.onMessage(event);
    };
    source.onerror = (event) => {
      setError(event);
      if (options?.onError) options.onError(event);
    };

    // Handling custom events
    if (options?.customEvents) {
      Object.keys(options.customEvents).forEach((eventName) => {
        source.addEventListener(eventName, options.customEvents![eventName]);
      });
    }

    return () => {
      source.close();
    };
  }, [url, options]);

  const close = () => {
    if (typeof EventSource !== 'undefined') {
      const source = new EventSource(url);
      source.close();
    }
  };

  return { data, error, close };
};