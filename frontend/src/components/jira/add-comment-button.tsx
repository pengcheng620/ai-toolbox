import { marked } from "marked"
import React, { useEffect, useState } from "react"

import { useNotification } from "~components/common/notification"
import { JIRA_BTN_COMMENT_DES } from "~components/jira/jira-servers"
import { useJiraCommentMessaging } from "~hook/use-api-messaging"

import { SparklesIcon } from "../../../lib/icons/heroicon"

export const AddCommentButton = () => {
  const { addNotification } = useNotification()
  const { execute, loading, error } = useJiraCommentMessaging()
  const [streamingContent, setStreamingContent] = useState("")

  // 监听错误变化并显示通知
  useEffect(() => {
    if (error) {
      console.error("Jira API错误:", error)
      addNotification({
        type: "error",
        title: "生成失败",
        message: error
      })
    }
  }, [error, addNotification])

  const handleClick = async () => {
    const $commentIframe = document.querySelector("#mce_0_ifr")
    if (!$commentIframe) {
      const $commentEditor = document.querySelector("#footer-comment-button")
      if (!$commentEditor) return
      const clickEvent = new MouseEvent("click", {
        bubbles: true, // 事件是否冒泡
        cancelable: true, // 事件是否可以取消
        view: window // 指定事件的视图（通常是 window）
      })
      $commentEditor.dispatchEvent(clickEvent)
    }

    const $commentField = document.querySelector("textarea#comment")
    if (!$commentField) return
    const description = document.querySelector("#description-val")?.textContent
    
    if (!description?.trim()) {
      addNotification({
        type: "warning",
        title: "警告",
        message: "未找到任务描述，请确保页面已完全加载"
      })
      return
    }

    await handleGenerate(description)
  }

  const handleGenerate = async (description: string) => {
    if (loading) return

    console.log("🚀 开始生成Jira评论 (流式响应)...")
    console.log("任务描述:", description)

    // 首先测试健康检查以验证消息系统是否正常工作
    console.log("🔍 测试消息系统连接...")
    try {
      const healthCheck = await fetch("http://localhost:8000/api/v1/ai/health")
      console.log("🔍 后端API健康检查:", healthCheck.status)
    } catch (error) {
      console.error("🔍 后端API连接失败:", error)
      addNotification({
        type: "error",
        title: "连接失败",
        message: "无法连接到后端API服务器，请确保服务器正在运行"
      })
      return
    }

    // 清空之前的流式内容
    setStreamingContent("")

    addNotification({
      type: "info",
      title: "生成中", 
      message: "正在实时生成Jira评论..."
    })

    // 使用Plasmo Messaging API调用后台脚本，默认使用流式响应
    const result = await execute({
      task_description: description,
      task_type: "development",
      context: {
        source: "jira_page",
        timestamp: new Date().toISOString(),
        url: window.location.href
      }
    }, {
      onChunk: (chunk: string, fullText: string) => {
        console.log("📝 收到流式内容:", chunk)
        setStreamingContent(fullText)
        // 实时更新评论区域
        setCommentAreaRealtime(fullText)
      }
    })

    // 如果成功，确保最终内容已设置
    if (result) {
      console.log("✅ 生成成功:", result)
      const finalContent = result.generated_content || streamingContent
      // 确保最终内容已正确设置
      await setCommentArea(finalContent)
      addNotification({
        type: "info",
        title: "生成成功",
        message: "Jira评论已生成并填入表单"
      })
      setStreamingContent("")
    } else {
      console.error("❌ 生成失败，结果为空")
    }
  }

  // 实时更新评论区域（用于流式响应）
  const setCommentAreaRealtime = async (text: string) => {
    const $commentField = document.querySelector(
      "textarea#comment"
    ) as HTMLTextAreaElement
    if ($commentField) {
      $commentField.value = text
      // 触发输入事件
      const event = new Event('input', { bubbles: true })
      $commentField.dispatchEvent(event)
    }

    // 同时更新富文本编辑器
    const $commentEditor = document.querySelector(
      "#mce_0_ifr"
    ) as HTMLIFrameElement
    if ($commentEditor) {
      const iframeDocument =
        $commentEditor.contentDocument || $commentEditor.contentWindow?.document
      const targetElement = iframeDocument?.getElementById("tinymce")
      if (targetElement) {
        try {
          const comment = await marked(text)
          const paragraph = targetElement.querySelector("p")
          if (paragraph) {
            paragraph.innerHTML = comment
          }
        } catch (e) {
          console.warn("Markdown转换失败:", e)
        }
      }
    }
  }

  const setCommentArea = async (text: string) => {
    const $commentField = document.querySelector(
      "textarea#comment"
    ) as HTMLTextAreaElement
    if (!$commentField) {
      console.warn("未找到评论文本框")
      return
    }
    $commentField.value = text
    
    // 触发输入事件
    const event = new Event('input', { bubbles: true })
    $commentField.dispatchEvent(event)

    const $commentEditor = document.querySelector(
      "#mce_0_ifr"
    ) as HTMLIFrameElement
    if (!$commentEditor) return
    
    const iframeDocument =
      $commentEditor.contentDocument || $commentEditor.contentWindow?.document
    const targetElement = iframeDocument?.getElementById("tinymce")
    if (targetElement) {
      const comment = await marked(text)
      console.log("设置富文本编辑器内容:", comment)
      const paragraph = targetElement.querySelector("p")
      if (paragraph) {
        paragraph.innerHTML = comment
      }
    }
  }

  return (
    <div 
      className="aui-buttons" 
      onClick={handleClick}
      style={{ cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}
    >
      <a
        title={`${JIRA_BTN_COMMENT_DES.tooltip} (实时生成)`}
        className="aui-button toolbar-trigger issueaction-comment-issue add-issue-comment inline-comment"
        style={{ display: "flex", alignItems: "center" }}>
        <SparklesIcon style={{ width: 20, marginRight: 5 }} />
        <span className="trigger-label">
          {loading ? "实时生成中..." : JIRA_BTN_COMMENT_DES.name}
        </span>
      </a>
    </div>
  )
}
