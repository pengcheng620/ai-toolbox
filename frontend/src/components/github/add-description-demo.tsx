import React, { useState, useRef, useCallback } from "react"

import { SparklesIcon } from "../../../lib/icons/heroicon"
import { getGitHubPageStrategy } from "../../../lib/utils/github"
import styles from "./add-description-demo.module.css"

// 固定的模板内容
const DEMO_TEMPLATE = `## Jira ticket
<!--- Complete the link below with the Jira ticket number -->
https://jira.autodesk.com/browse/UC-74354

<!-- Put an \`x\` in all the boxes that apply -->
- [x] Story/UX Story/Sub-task
- [ ] Bug/Story Bug
- [ ] Spike

Make sure to review all steps specified in [DOs and DON'Ts](https://wiki.autodesk.com/display/UP/Backend+DOs+and+DON%27Ts)

Make sure to clean up code as specified in [Code anti-patterns](https://wiki.autodesk.com/display/~cunkoi/How+to+Deal+with+code+anti-patterns)

## Description, context
<!--- Describe your changes in detail to help the reviewer get some context -->
<!--- Why is this change required? What problem does it solve? -->
<!--- Also, comment parts of your PR that could be harder to understand (the reviewer may not know the code you are modifying) -->
**Context:**
If customer try to check in big assembly, it would cause out of memory, we try to improve the workflow, if we found there is big structure need check, and over the limitation, we show dialog ask customer to do root check in.

**Solution:**
add check total node count in current structure at beginning of fillCbomAndEbomNodes
1. define custom properties data as limit
2. collect total node size
3. compare the node size and limit
4. if total node size large than limit stop check in with error message
Notes: if limit is not set or set as negative number, check would be skipped

BDD test case added.

## Screenshots, videos`

interface StreamingState {
  isGenerating: boolean
  isPaused: boolean
  isCompleted: boolean
  currentText: string
  progress: number
  status: string
  error: string | null
}

export const AddDescriptionDemo = () => {
  const [state, setState] = useState<StreamingState>({
    isGenerating: false,
    isPaused: false,
    isCompleted: false,
    currentText: "",
    progress: 0,
    status: "Ready to generate",
    error: null
  })
  
  const streamingRef = useRef<{
    timeoutId?: NodeJS.Timeout
    shouldStop: boolean
    activeTextarea?: HTMLTextAreaElement
  }>({ shouldStop: false })

  // 流式输出函数
  const streamText = useCallback(async (
    text: string,
    onChunk: (chunk: string, fullText: string, progress: number) => void
  ) => {
    const words = text.split(' ')
    let currentText = ''
    
    for (let i = 0; i < words.length; i++) {
      if (streamingRef.current.shouldStop) {
        break
      }
      
      const word = words[i] + (i < words.length - 1 ? ' ' : '')
      currentText += word
      const progress = ((i + 1) / words.length) * 100
      
      onChunk(word, currentText, progress)
      
      // 动态延迟：在标点符号和换行后停顿更长
      let delay = 30 // 基础延迟
      if (word.includes('\n\n')) {
        delay = 200 // 段落间停顿
      } else if (word.includes('\n')) {
        delay = 100 // 换行停顿
      } else if (word.includes('.') || word.includes(':') || word.includes('!')) {
        delay = 80 // 句子结束停顿
      } else if (word.includes(',')) {
        delay = 50 // 逗号停顿
      }
      
      await new Promise(resolve => {
        streamingRef.current.timeoutId = setTimeout(resolve, delay)
      })
    }
  }, [])

  // 查找并激活编辑模式
  const activateEditMode = useCallback(async (): Promise<HTMLTextAreaElement | null> => {
    console.log("🚀 [Demo] 激活编辑模式...")
    
    try {
      const strategy = getGitHubPageStrategy()
      
      // 尝试点击编辑按钮
      const editButton = strategy.findEditButton()
      if (editButton) {
        console.log("📝 [Demo] 点击编辑按钮...")
        editButton.click()
        
        // 等待编辑模式加载
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      // 查找编辑模式的 textarea
      const editTextarea = strategy.findEditModeTextarea()
      if (editTextarea) {
        console.log("✅ [Demo] 找到编辑模式 textarea")
        return editTextarea
      }
      
      // 回退：查找任何可用的 textarea
      const fallbackSelectors = [
        "textarea#pull_request_body",
        "textarea[name='pull_request[body]']",
        "textarea[placeholder*='description']",
        "textarea[placeholder*='Description']"
      ]
      
      for (const selector of fallbackSelectors) {
        const textarea = document.querySelector(selector) as HTMLTextAreaElement
        if (textarea) {
          console.log(`✅ [Demo] 使用回退 textarea: ${selector}`)
          return textarea
        }
      }
      
      console.warn("⚠️ [Demo] 未找到可用的 textarea")
      return null
    } catch (error) {
      console.error("❌ [Demo] 激活编辑模式失败:", error)
      return null
    }
  }, [])

  // 更新 textarea 内容
  const updateTextarea = useCallback((textarea: HTMLTextAreaElement, content: string) => {
    textarea.value = content
    textarea.textContent = content
    
    // 触发事件确保变更被注册
    const inputEvent = new Event("input", { bubbles: true })
    const changeEvent = new Event("change", { bubbles: true })
    
    textarea.dispatchEvent(inputEvent)
    textarea.dispatchEvent(changeEvent)
    
    // 自动调整高度
    textarea.style.height = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
    
    // 聚焦
    textarea.focus()
  }, [])

  // 开始生成
  const handleGenerate = useCallback(async () => {
    if (state.isGenerating && !state.isPaused) {
      // 暂停
      setState(prev => ({ ...prev, isPaused: true, status: "Paused" }))
      return
    }

    if (state.isPaused) {
      // 继续
      setState(prev => ({ ...prev, isPaused: false, status: "Generating..." }))
      return
    }

    // 重置状态
    streamingRef.current.shouldStop = false
    setState({
      isGenerating: true,
      isPaused: false,
      isCompleted: false,
      currentText: "",
      progress: 0,
      status: "Analyzing Jira ticket and code changes...",
      error: null
    })

    try {
      // 模拟 API 调用延迟
      await new Promise(resolve => setTimeout(resolve, 1500))

      if (streamingRef.current.shouldStop) return

      setState(prev => ({ ...prev, status: "Activating edit mode..." }))

      // 激活编辑模式
      const textarea = await activateEditMode()
      if (!textarea) {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          error: "Could not find edit area. Please ensure you're on a GitHub PR page.",
          status: "Error"
        }))
        return
      }
      
      streamingRef.current.activeTextarea = textarea
      setState(prev => ({ ...prev, status: "Generating PR description..." }))

      // 开始流式输出
      await streamText(DEMO_TEMPLATE, (_chunk, fullText, progress) => {
        if (streamingRef.current.shouldStop) return

        setState(prev => ({
          ...prev,
          currentText: fullText,
          progress,
          status: `Generating... ${Math.round(progress)}%`
        }))

        // 更新 textarea
        if (streamingRef.current.activeTextarea) {
          updateTextarea(streamingRef.current.activeTextarea, fullText)
        }
      })

      if (!streamingRef.current.shouldStop) {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          isCompleted: true,
          progress: 100,
          status: "Generation completed successfully",
          error: null
        }))
      }
    } catch (error) {
      console.error("❌ [Demo] Generation failed:", error)
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: "Generation failed. Please try again.",
        status: "Error"
      }))
    }
  }, [state, streamText, activateEditMode, updateTextarea])

  // 停止生成
  const handleStop = useCallback(() => {
    streamingRef.current.shouldStop = true
    if (streamingRef.current.timeoutId) {
      clearTimeout(streamingRef.current.timeoutId)
    }
    setState({
      isGenerating: false,
      isPaused: false,
      isCompleted: false,
      currentText: "",
      progress: 0,
      status: "Generation stopped",
      error: null
    })
  }, [])

  // 清除内容
  const handleClear = useCallback(() => {
    if (streamingRef.current.activeTextarea) {
      updateTextarea(streamingRef.current.activeTextarea, "")
    }
    setState({
      isGenerating: false,
      isPaused: false,
      isCompleted: false,
      currentText: "",
      progress: 0,
      status: "Content cleared",
      error: null
    })
  }, [updateTextarea])

  const LoadingSpinner = () => (
    <svg className={styles.spinner} viewBox="0 0 16 16" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M8 2.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2.046 8A5.954 5.954 0 018 2.046v.033a.75.75 0 010 1.434V4.5a3.5 3.5 0 106.954 0V3.516a.75.75 0 110-1.434v-.033A5.954 5.954 0 0113.954 8h-.033a.75.75 0 01-1.434 0H12.5a3.5 3.5 0 100 6.954h.016a.75.75 0 111.434 0h.033A5.954 5.954 0 018 13.954v.033a.75.75 0 010-1.434V12.5a3.5 3.5 0 10-6.954 0v.016a.75.75 0 11-1.434 0v.033A5.954 5.954 0 012.046 8z"
      />
    </svg>
  )

  const getButtonText = () => {
    if (state.isGenerating && state.isPaused) return "Resume"
    if (state.isGenerating) return "Pause"
    if (state.isCompleted) return "Regenerate"
    return "Generate"
  }

  const getButtonIcon = () => {
    if (state.isGenerating && !state.isPaused) {
      return <LoadingSpinner />
    }
    return <SparklesIcon className={styles.icon} />
  }

  return (
    <div className={styles.container}>
      <div
        className={`dropdown-item ${styles.mainButton}`}
        onClick={handleGenerate}
        data-generating={state.isGenerating}
        data-completed={state.isCompleted}
        data-paused={state.isPaused}
        style={{
          cursor: "pointer",
          opacity: 1,
          marginRight: 10,
        }}
        title="Demo AI-powered PR description generation with streaming output">
        {getButtonIcon()}
        <span>{getButtonText()}</span>
        {state.isGenerating && (
          <span className={styles.progress}>
            {Math.round(state.progress)}%
          </span>
        )}
      </div>

      {/* Status display */}
      {(state.status !== "Ready to generate" || state.error) && (
        <div className={styles.statusBar}>
          {state.error ? (
            <span className={styles.errorText}>{state.error}</span>
          ) : (
            <span className={styles.statusText}>{state.status}</span>
          )}
        </div>
      )}

      {(state.isGenerating || state.isCompleted) && (
        <div className={styles.controls}>
          {state.isGenerating && (
            <button
              className={`dropdown-item ${styles.controlButton}`}
              onClick={handleStop}
              title="Stop generation">
              Stop
            </button>
          )}

          {(state.isCompleted || state.currentText) && (
            <button
              className={`dropdown-item ${styles.controlButton}`}
              onClick={handleClear}
              title="Clear content">
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}
