import React, { useEffect, useState } from "react"

import { useNotification } from "~components/common/notification"
import { GITHUB_BTN_DES_GEN } from "./github-servers"
import { useGitHubPRMessaging } from "~hook/use-api-messaging"
import { getButtonStyles } from "../../../lib/utils/styles"

import { SparklesIcon } from "../../../lib/icons/heroicon"

export const AddDescription = () => {
  const { addNotification } = useNotification()
  const { execute, loading, error } = useGitHubPRMessaging()
  const [ticket, setTicket] = useState("")

  useEffect(() => {
    setTicket(location.pathname.match(/UC-\d+/)?.[0] || "")
  }, [])

  // 监听错误变化并显示通知
  useEffect(() => {
    if (error) {
      addNotification({
        type: "error",
        title: "生成失败",
        message: error
      })
    }
  }, [error, addNotification])

  const handleClick = async () => {
    // 获取页面中的描述文本
    const descriptionElement = document.querySelector("#description-val")
    const description = descriptionElement?.textContent || ""
    
    if (!description.trim()) {
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
    
    console.log("🚀 开始生成GitHub PR (使用Messaging API)...")
    console.log("任务描述:", description)
    
    addNotification({
      type: "info", 
      title: "生成中",
      message: "正在生成PR描述，请稍候..."
    })

    // 从GitHub页面获取相关信息
    const prTitleInput = document.querySelector("input[name='pull_request[title]']") as HTMLInputElement
    const prTitle = prTitleInput?.value || ""
    const branchName = location.pathname.split("/compare/")[1]?.split("?")[0] || ""
    
    // 使用Plasmo Messaging API调用后台脚本
    const result = await execute({
      pr_title: prTitle,
      code_changes: description,
      branch_name: branchName,
      commit_messages: []
    })

    // 如果成功，设置生成的内容到文本框
    if (result) {
      console.log("✅ 生成成功:", result)
      await setCommentArea(result.generated_description)
      addNotification({
        type: "info",
        title: "生成成功",
        message: "PR描述已生成并填入表单"
      })
    } else {
      console.error("❌ 生成失败，结果为空")
    }
  }

  const setCommentArea = async (text: string) => {
    const $desTextarea = document.querySelector(
      "textarea#pull_request_body"
    ) as HTMLTextAreaElement
    if (!$desTextarea) {
      console.warn("未找到PR描述文本框")
      return
    }
    $desTextarea.value = text
    $desTextarea.innerText = text
    
    // 触发输入事件以确保React等框架能检测到变化
    const event = new Event('input', { bubbles: true })
    $desTextarea.dispatchEvent(event)
  }

  return (
    <div 
      className={getButtonStyles(loading)}
      onClick={handleClick}
    >
      <a
        title={GITHUB_BTN_DES_GEN.tooltip}
        className="plasmo-flex plasmo-items-center plasmo-px-3 plasmo-py-2 plasmo-rounded-md plasmo-text-sm"
      >
        <SparklesIcon className="plasmo-w-5 plasmo-h-5 plasmo-mr-2" />
        <span className="trigger-label" title={GITHUB_BTN_DES_GEN.tooltip}>
          {loading ? "生成中..." : GITHUB_BTN_DES_GEN.name}
        </span>
      </a>
    </div>
  )
}
