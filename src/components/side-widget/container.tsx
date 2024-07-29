"use client"

import { SparklesIcon } from "@heroicons/react/24/outline"
import { Card } from "@mantine/core"
import React from "react"

import { useDrag } from "~hook/use-drag"





export default function RightSide() {
  // const [settings, setSettings] = useState(defaultPromptOptions)

  const { position, handleMouseDown } = useDrag()

  return (
    // <div className="plasmo-bg-white plasmo-p-4 plasmo-z-50 plasmo-flex plasmo-fixed plasmo-top-[40vh] plasmo-right-0 plasmo-shadow-lg">
    <Card
      shadow="lg"
      style={{ position: "fixed" }}
      className="plasmo-fixed -plasmo-bottom-0 plasmo-right-0">
      {/*<ParsePictureForm data={settings} onChange={v => setSettings(v)}/>*/}
      <SparklesIcon className="plasmo-w-8 plasmo-h-8 plasmo-mx-auto plasmo-mb-4" />
    </Card>
  )
}
