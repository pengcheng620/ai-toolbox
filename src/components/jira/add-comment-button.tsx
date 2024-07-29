import { streamText } from "ai"
import { marked } from "marked"
import React from "react"

import {
  generateSnippet,
  JIRA_BTN_COMMENT_DES
} from "~components/jira/jira-servers"

import { awAzure } from "../../../lib/ai/azure"
import { SparklesIcon } from "../../../lib/icons/heroicon"


export const AddCommentButton = () => {
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
    await handleGenerate(description)
  }

  const handleGenerate = async (description: string) => {
    let comment = ""
    const result = await streamText({
      model: awAzure("gpt-4o"),
      messages: generateSnippet(description)
    })

    for await (const textPart of result.textStream) {
      comment += textPart
      setCommentArea(comment).then()
    }
  }

  const setCommentArea = async (text: string) => {
    const $commentField = document.querySelector(
      "textarea#comment"
    ) as HTMLTextAreaElement
    if (!$commentField) return
    $commentField.value = text
    const $commentEditor = document.querySelector(
      "#mce_0_ifr"
    ) as HTMLIFrameElement
    if (!$commentEditor) return
    const iframeDocument =
      $commentEditor.contentDocument || $commentEditor.contentWindow.document
    const targetElement = iframeDocument.getElementById("tinymce")
    if (targetElement) {
      const comment = await marked(text)
      console.log("targetElement", comment)
      targetElement.querySelector("p").innerHTML = comment
    }
  }

  return (
    <div className="aui-buttons" onClick={handleClick}>
      <a
        title={JIRA_BTN_COMMENT_DES.tooltip}
        className="aui-button toolbar-trigger issueaction-comment-issue add-issue-comment inline-comment"
        style={{ display: "flex", alignItems: "center" }}>
        <SparklesIcon style={{ width: 20, marginRight: 5 }} />
        <span className="trigger-label">{JIRA_BTN_COMMENT_DES.name}</span>
      </a>
    </div>
  )
}
