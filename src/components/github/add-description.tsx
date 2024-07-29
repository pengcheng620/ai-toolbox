import { streamText } from "ai"
import React, { useEffect } from "react"

import { useNotification } from "~components/common/notification"
import {
  generateMessages,
  GITHUB_BTN_DES_GEN
} from "~components/github/github-servers"

import { awAzure } from "../../../lib/ai/azure"
import { SparklesIcon } from "../../../lib/icons/heroicon"


export const AddDescription = () => {
  const { addNotification } = useNotification()
  const [ticket, setTicket] = React.useState("")

  useEffect(() => {
    setTicket(location.pathname.match(/UC-\d+/)[0] || "")
  }, [])

  const handleClick = async () => {}

  const handleGenerate = async (description: string) => {
    let comment = ""
    const result = await streamText({
      model: awAzure("gpt-4o"),
      messages: generateMessages(description)
    })

    for await (const textPart of result.textStream) {
      comment += textPart
      setCommentArea(comment).then()
    }
  }

  const setCommentArea = async (text: string) => {
    const $desTextarea = document.querySelector(
      "textarea#pull_request_body"
    ) as HTMLTextAreaElement
    if (!$desTextarea) return
    $desTextarea.value = text
    $desTextarea.innerText = text
  }

  return (
    <div style={{ cursor: "pointer" }} onClick={handleClick}>
      <a
        title={GITHUB_BTN_DES_GEN.tooltip}
        style={{ display: "flex", alignItems: "center" }}>
        <SparklesIcon style={{ width: 20, marginRight: 5 }} />
        <span className="trigger-label" title={GITHUB_BTN_DES_GEN.tooltip}>
          {GITHUB_BTN_DES_GEN.name}
        </span>
      </a>
    </div>
  )
}
