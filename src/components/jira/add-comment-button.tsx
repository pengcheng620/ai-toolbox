import { marked } from "marked"
import React, { useEffect } from "react"

import { useNotification } from "~components/common/notification"
import { JIRA_BTN_COMMENT_DES } from "~components/jira/jira-servers"
import { useJiraCommentMessaging } from "~hook/use-api-messaging"

import { SparklesIcon } from "../../../lib/icons/heroicon"

export const AddCommentButton = () => {
  const { addNotification } = useNotification()
  const { execute, loading, error } = useJiraCommentMessaging()

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

    console.log("🚀 开始生成Jira评论 (使用Messaging API)...")
    console.log("任务描述:", description)

    addNotification({
      type: "info",
      title: "生成中", 
      message: "正在生成Jira评论，请稍候..."
    })

    // 使用Plasmo Messaging API调用后台脚本
    const result = await execute({
      task_description: description,
      task_type: "development",
      context: {
        source: "jira_page",
        timestamp: new Date().toISOString(),
        url: window.location.href
      }
    })

    // 如果成功，设置生成的内容到评论区域
    if (result) {
      console.log("✅ 生成成功:", result)
      await setCommentArea(result.generated_content)
      addNotification({
        type: "info",
        title: "生成成功",
        message: "Jira评论已生成并填入表单"
      })
    } else {
      console.error("❌ 生成失败，结果为空")
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
        title={JIRA_BTN_COMMENT_DES.tooltip}
        className="aui-button toolbar-trigger issueaction-comment-issue add-issue-comment inline-comment"
        style={{ display: "flex", alignItems: "center" }}>
        <SparklesIcon style={{ width: 20, marginRight: 5 }} />
        <span className="trigger-label">
          {loading ? "生成中..." : JIRA_BTN_COMMENT_DES.name}
        </span>
      </a>
    </div>
  )
}
