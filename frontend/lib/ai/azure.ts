import { createAzure } from "@ai-sdk/azure"

import { ACCESS_TOKEN } from "../models/variables"


export const awAzure = createAzure({
  resourceName: "cog-sandbox-dev-westus3-001", // Azure resource name
  apiKey: "your-api-key",
  baseURL:
    "https://cog-sandbox-dev-westus3-001.openai.azure.com/openai/deployments",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ACCESS_TOKEN}`
  }
})
