/**
 * Sprint Planning related TypeScript type definitions
 */

// Basic Jira entities
export interface JiraUser {
  id: string
  name: string
  displayName: string
  avatar?: string
  emailAddress?: string
}

export interface JiraIssue {
  id: string
  key: string
  summary: string
  description?: string
  issueType: {
    id: string
    name: string
    iconUrl?: string
  }
  status: {
    id: string
    name: string
    statusCategory: string
  }
  assignee?: JiraUser
  reporter?: JiraUser
  priority: {
    id: string
    name: string
    iconUrl?: string
  }
  storyPoints?: number
  originalEstimate?: number
  remainingEstimate?: number
  timeSpent?: number
  labels: string[]
  components: Array<{
    id: string
    name: string
  }>
  fixVersions: Array<{
    id: string
    name: string
  }>
  created: string
  updated: string
}

export interface JiraSprint {
  id: string
  name: string
  state: 'future' | 'active' | 'closed'
  startDate?: string
  endDate?: string
  completeDate?: string
  goal?: string
  boardId: string
}

export interface JiraBoard {
  id: string
  name: string
  type: string
  projectKey: string
  projectName: string
}

// Sprint Planning specific types
export interface SprintData {
  sprint: JiraSprint
  issues: JiraIssue[]
  totalStoryPoints: number
  issuesByStatus: Record<string, JiraIssue[]>
  issuesByAssignee: Record<string, JiraIssue[]>
}

export interface TeamMember {
  id: string
  name: string
  displayName: string
  avatar?: string
  capacity?: number // Story points capacity per sprint
  availability?: number // Percentage availability (0-100)
  timezone?: string
  role?: string
}

export interface MemberWorkload {
  memberId: string
  memberName: string
  currentSprintPoints: number
  carryOverPoints: number
  totalWorkload: number
  issueCount: number
  status: 'normal' | 'high' | 'overloaded'
  capacity?: number
  utilizationPercentage?: number
}

export interface SprintMetrics {
  totalStoryPoints: number
  teamVelocity: number[] // Historical velocity data
  avgVelocity: number
  utilizationRate: number
  teamSize: number
  completionRate?: number
  burndownData?: Array<{
    date: string
    remaining: number
    ideal: number
  }>
}

export interface AIRecommendation {
  id: string
  type: 'workload' | 'capacity' | 'risk' | 'optimization'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  actionable: boolean
  suggestedAction?: string
  confidence?: number
}

export interface HolidayImpact {
  region: string
  country: string
  holidayName: string
  dateRange: string
  startDate: string
  endDate: string
  affectedMembers: string[]
  capacityReduction: number // Percentage
}

// API Request/Response types
export interface SprintPlanningRequest {
  boardId: string
  sprintData: SprintData
  teamMembers: TeamMember[]
  includeAIRecommendations?: boolean
  stream?: boolean
}

export interface SprintPlanningResponse {
  analysisResult: {
    boardId: string
    sprintSummary: {
      sprintName: string
      sprintState: string
      issueCount: number
      startDate?: string
      endDate?: string
    }
    analysisTimestamp: string
  }
  aiRecommendations: AIRecommendation[]
  teamWorkload: {
    memberWorkloads: Record<string, MemberWorkload>
    unassignedPoints: number
    totalAssignedPoints: number
  }
  holidayImpact?: HolidayImpact[]
  metrics: SprintMetrics
  model: string
  tokensUsed: number
  success: boolean
  error?: string
}

export interface BoardInfoResponse {
  boardId: string
  boardName: string
  projectKey: string
  success: boolean
  error?: string
}

export interface SprintDataResponse {
  sprintId: string
  sprintName: string
  sprintState: string
  issues: JiraIssue[]
  totalStoryPoints: number
  success: boolean
  error?: string
}

// DOM parsing types
export interface DOMParsingResult {
  boardId?: string
  sprintData?: SprintData
  teamMembers?: TeamMember[]
  error?: string
}

export interface BoardDetectionResult {
  boardId?: string
  boardName?: string
  projectKey?: string
  url: string
  method: 'url' | 'dom' | 'api'
  confidence: number
  error?: string
}

// UI Component props types
export interface SprintPlanningWidgetProps {
  boardId?: string
  onClose?: () => void
  onRefresh?: () => void
}

export interface TeamWorkloadTableProps {
  workloads: MemberWorkload[]
  onMemberClick?: (memberId: string) => void
  onRebalance?: (fromMember: string, toMember: string, points: number) => void
}

export interface MetricsOverviewProps {
  metrics: SprintMetrics
  targetVelocity?: number
  showTrends?: boolean
}

export interface AIRecommendationsProps {
  recommendations: AIRecommendation[]
  onApplyRecommendation?: (recommendationId: string) => void
  onDismissRecommendation?: (recommendationId: string) => void
}

export interface HolidayImpactProps {
  holidays: HolidayImpact[]
  currentCapacity: number
  onAdjustCapacity?: (newCapacity: number) => void
}

// Hook return types
export interface UseSprintPlanningReturn {
  data: SprintPlanningResponse | null
  loading: boolean
  error: string | null
  analyze: (request: SprintPlanningRequest) => Promise<void>
  reset: () => void
}

export interface UseBoardDetectionReturn {
  boardId: string | null
  boardInfo: BoardInfoResponse | null
  loading: boolean
  error: string | null
  detectBoard: () => Promise<void>
  refreshBoardInfo: () => Promise<void>
}

export interface UseSprintDataReturn {
  sprintData: SprintData | null
  loading: boolean
  error: string | null
  fetchSprintData: (boardId: string, sprintId?: string) => Promise<void>
  refreshData: () => Promise<void>
}

// Configuration types
export interface SprintPlanningConfig {
  enableAIRecommendations: boolean
  autoRefreshInterval: number
  defaultCapacityPerMember: number
  holidayRegions: string[]
  velocityHistoryLength: number
  workloadThresholds: {
    normal: number
    high: number
    overloaded: number
  }
}
