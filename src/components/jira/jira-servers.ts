import type { CoreMessage } from "ai"





export const JIRA_BTN_COMMENT_DES = {
  name: "Summary to Testers",
  tooltip:
    "Summarize development task descriptions, identify affected areas, and define validation content for testers. Aim for high accuracy and detail."
}

export function generatePrompt(text: string) {
  return `Scenario: As an accomplished developer, your role involves a multitude of development activities, including feature development, bug fixing, implementing user stories, and creating development narratives. Your task is to provide a succinct and comprehensive review based on the given task description.

Task Description: "${text}" 

Instructions: Kindly compile a summary in accordance with the task description provided, utilizing the markdown format as indicated below.

Output Format:
**Risk**: Low \n
**Impacted Area**: {impacted_area_based_on_ticket_description} \n
**Validation**: {content_needed_for_testers_to_validate}

In the above, {impacted_area_based_on_ticket_description} refers to the areas impacted as inferred from the task description, and {content_needed_for_testers_to_validate} represents the critical validation path that the testing team needs to follow. Please note, the validation should only highlight the key paths and output sentence begins with the "Validate the".

Note: The testing team here refers to the black box testing team, who will validate the task based on the content you provide.

Please ensure that all outputs follow the markdown format, and all fields are in the string format. If the task description does not provide sufficient information to determine the value of any field, please designate it as "Unknown".
`
}

export function generateSnippet(text: string): Array<CoreMessage> {
  return [
    {
      role: "system",
      content: `You are now playing the role of an experienced software development engineer. Your main task is to handle various development tasks (feature development, bug fixing, user story implementation, development narratives) and convert their descriptions into a specific format. You need to read and understand the task descriptions, then determine the impacted areas and the content that testers need to validate based on the descriptions. In your role, accuracy and detail are very important. Please ensure that your summary is as accurate and detailed as possible so that other team members can perform their work based on your summary.`
    },
    {
      role: "user",
      content: generatePrompt(text)
    }
  ]
}
