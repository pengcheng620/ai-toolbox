import React, { useState, useEffect } from "react"
import type { SprintPlanningWidgetProps, MemberWorkload } from "~types/sprint-planning"
import { boardDetector } from "~services/board-detector"
import { jiraDOMParser } from "~services/jira-dom-parser"
import { useSprintPlanning, useBoardDetection } from "~hook/use-sprint-planning"
import { useNotification } from "~components/common/notification"
import { TeamWorkloadTable } from "./TeamWorkloadTable"
import { HolidayImpactPanel } from "./HolidayImpactPanel"
import { getApiConfigSync } from "../../../lib/config/api-config"

export const SprintPlanningWidget: React.FC<SprintPlanningWidgetProps> = ({
  onClose,
  onRefresh
}) => {
  const [sprintData, setSprintData] = useState<any>(null)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'workload' | 'holidays'>('overview')
  const [streamingText, setStreamingText] = useState<string>("")

  // Use custom hooks
  const { addNotification } = useNotification()
  const boardDetection = useBoardDetection()
  const sprintPlanning = useSprintPlanning({
    enableStreaming: true,
    onStreamChunk: (chunk, fullText) => {
      setStreamingText(fullText)
    },
    onStreamComplete: (response) => {
      console.log("✅ Streaming completed:", response)
      addNotification({
        type: "info",
        title: "分析完成",
        message: "Sprint 规划分析已完成，可以查看详细建议和工作负载分布"
      })
    },
    onStreamError: (error) => {
      console.error("❌ Sprint Planning streaming error:", error)
      addNotification({
        type: "error", 
        title: "分析失败",
        message: error
      })
    }
  })

  // Monitor error changes and display notifications
  useEffect(() => {
    if (sprintPlanning.error) {
      console.error("Sprint Planning API Error:", sprintPlanning.error)
      addNotification({
        type: "error",
        title: "Sprint Planning 失败",
        message: sprintPlanning.error
      })
    }
  }, [sprintPlanning.error, addNotification])

  useEffect(() => {
    if (boardDetection.error) {
      console.error("Board Detection Error:", boardDetection.error)
      addNotification({
        type: "error",
        title: "Board 检测失败",
        message: boardDetection.error
      })
    }
  }, [boardDetection.error, addNotification])

  useEffect(() => {
    initializeWidget()
  }, [])
  
  const apiConfig = getApiConfigSync()
  const initializeWidget = async () => {
    try {
      // Health check first to verify backend connection
      console.log("🔍 Testing backend connection...")
      try {
        const healthCheck = await fetch(apiConfig.endpoints.ai.health)
        console.log("🔍 Backend API health check:", healthCheck.status)
      } catch (error) {
        console.error("🔍 Backend API connection failed:", error)
        addNotification({
          type: "error",
          title: "连接失败",
          message: "无法连接到后端 API 服务器，请确保服务器正在运行"
        })
        return
      }

      addNotification({
        type: "info",
        title: "开始分析",
        message: "正在检测 Board ID 和解析 Sprint 数据..."
      })

      // Step 1: Detect board ID
      console.log("🔍 Detecting board ID...")
      await boardDetection.detectBoard()

      if (!boardDetection.boardId) {
        throw new Error(boardDetection.error || "Could not detect board ID")
      }

      console.log("✅ Board detected:", boardDetection.boardId)

      // Step 2: Parse DOM for sprint data
      console.log("📊 Parsing sprint data from DOM...")
      const domData = await jiraDOMParser.parseCurrentPage(boardDetection.boardId)

      if (domData.error) {
        console.warn("⚠️ DOM parsing warning:", domData.error)
        addNotification({
          type: "warning",
          title: "解析警告",
          message: domData.error
        })
      }

      setSprintData(domData.sprintData)
      setTeamMembers(domData.teamMembers || [])
      console.log("✅ Sprint data parsed:", domData)

      // Step 3: Analyze with backend (if we have data)
      if (domData.sprintData && domData.teamMembers) {
        console.log("🤖 Analyzing sprint planning...")
        addNotification({
          type: "info",
          title: "AI 分析中",
          message: "正在使用 AI 分析 Sprint 数据并生成建议..."
        })

        await sprintPlanning.analyze({
          boardId: boardDetection.boardId,
          sprintData: domData.sprintData,
          teamMembers: domData.teamMembers,
          includeAIRecommendations: true
        })
      } else {
        addNotification({
          type: "warning",
          title: "数据不完整",
          message: "Sprint 数据或团队成员信息不完整，部分功能可能不可用"
        })
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "初始化失败"
      console.error("❌ Widget initialization failed:", err)
      addNotification({
        type: "error",
        title: "初始化失败",
        message: errorMessage
      })
    }
  }

  const handleRefresh = async () => {
    if (onRefresh) {
      onRefresh()
    }
    
    addNotification({
      type: "info",
      title: "刷新中",
      message: "重新加载 Sprint 数据..."
    })

    sprintPlanning.reset()
    boardDetection.reset()
    setSprintData(null)
    setTeamMembers([])
    setStreamingText("")
    await initializeWidget()
  }

  const handleClose = () => {
    sprintPlanning.reset()
    if (onClose) {
      onClose()
    }
  }

  const handleMemberClick = (memberId: string) => {
    console.log("👤 Member clicked:", memberId)
    // Could implement member detail view here
  }

  const handleWorkloadRebalance = (fromMember: string, toMember: string, points: number) => {
    console.log("⚖️ Rebalancing workload:", { fromMember, toMember, points })
    // Could implement workload rebalancing logic here
  }

  const handleCapacityAdjustment = (newCapacity: number) => {
    console.log("⚙️ Adjusting capacity to:", newCapacity)
    // Could implement capacity adjustment logic here
  }

  const handleDebugDetection = async () => {
    console.log("🔧 Manual debug detection triggered...")
    await boardDetector.debugDetection()
  }

  // Transform team workload data for the table
  const getWorkloadData = (): MemberWorkload[] => {
    if (!sprintPlanning.data?.teamWorkload?.memberWorkloads) return []

    return Object.entries(sprintPlanning.data.teamWorkload.memberWorkloads).map(([memberId, workload]: [string, any]) => ({
      memberId,
      memberName: workload.name || `Member ${memberId}`,
      currentSprintPoints: workload.current_sprint_points || 0,
      carryOverPoints: workload.carry_over_points || 0,
      totalWorkload: workload.total_workload || 0,
      issueCount: workload.issue_count || 0,
      status: workload.status || 'normal',
      capacity: 10, // Default capacity
      utilizationPercentage: workload.total_workload ? Math.round((workload.total_workload / 10) * 100) : 0
    }))
  }

  return (
    <div style={widgetStyles.container}>
      {/* Header */}
      <div style={widgetStyles.header}>
        <div style={widgetStyles.headerTitle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: "8px" }}>
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
          </svg>
          Sprint Planning Assistant
          {boardDetection.boardId && (
            <span style={widgetStyles.boardBadge}>Board {boardDetection.boardId}</span>
          )}
        </div>
        <div style={widgetStyles.headerActions}>
          <button
            onClick={handleRefresh}
            style={widgetStyles.iconButton}
            title="Refresh"
            disabled={boardDetection.loading || sprintPlanning.loading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
          </button>
          <button
            onClick={handleClose}
            style={widgetStyles.iconButton}
            title="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={widgetStyles.tabNavigation}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            ...widgetStyles.tabButton,
            ...(activeTab === 'overview' ? widgetStyles.activeTab : {})
          }}
        >
          📊 概览
        </button>
        <button
          onClick={() => setActiveTab('workload')}
          style={{
            ...widgetStyles.tabButton,
            ...(activeTab === 'workload' ? widgetStyles.activeTab : {})
          }}
        >
          👥 工作负载
        </button>
        <button
          onClick={() => setActiveTab('holidays')}
          style={{
            ...widgetStyles.tabButton,
            ...(activeTab === 'holidays' ? widgetStyles.activeTab : {})
          }}
        >
          🏖️ 假期影响
        </button>
      </div>

      {/* Content */}
      <div style={widgetStyles.content}>
        {(boardDetection.loading || sprintPlanning.loading) && (
          <div style={widgetStyles.loading}>
            <div style={widgetStyles.spinner}></div>
            <div>
              {boardDetection.loading ? "检测 Board ID..." :
               sprintPlanning.loading ? "分析 Sprint 数据..." : "加载中..."}
            </div>
            {streamingText && (
              <div style={widgetStyles.streamingText}>
                <div style={widgetStyles.streamingTitle}>🤖 AI 分析中...</div>
                <div style={widgetStyles.streamingContent}>
                  {streamingText.split('\n').slice(-3).map((line, index) => (
                    <div key={index} style={widgetStyles.streamingLine}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {(boardDetection.error || sprintPlanning.error) && (
          <div style={widgetStyles.error}>
            <div style={widgetStyles.errorTitle}>⚠️ 错误</div>
            <div style={widgetStyles.errorMessage}>
              {boardDetection.error || sprintPlanning.error}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button onClick={handleRefresh} style={widgetStyles.retryButton}>
                重试
              </button>
              {boardDetection.error && (
                <button onClick={handleDebugDetection} style={{
                  ...widgetStyles.retryButton,
                  backgroundColor: '#e67e22',
                  borderColor: '#d35400'
                }}>
                  🔧 调试检测
                </button>
              )}
            </div>
          </div>
        )}

        {!boardDetection.loading && !sprintPlanning.loading && !boardDetection.error && !sprintPlanning.error && (
          <div style={widgetStyles.tabContent}>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div style={widgetStyles.overviewTab}>
                {/* Board Info */}
                {boardDetection.boardId && (
                  <div style={widgetStyles.section}>
                    <div style={widgetStyles.sectionTitle}>📋 Board 信息</div>
                    <div style={widgetStyles.infoGrid}>
                      <div style={widgetStyles.infoItem}>
                        <strong>Board ID:</strong> {boardDetection.boardId}
                      </div>
                      {boardDetection.boardInfo && (
                        <>
                          <div style={widgetStyles.infoItem}>
                            <strong>Board Name:</strong> {boardDetection.boardInfo.boardName}
                          </div>
                          <div style={widgetStyles.infoItem}>
                            <strong>Project:</strong> {boardDetection.boardInfo.projectKey}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Sprint Summary */}
                {sprintData && (
                  <div style={widgetStyles.section}>
                    <div style={widgetStyles.sectionTitle}>🚀 Sprint 概览</div>
                    <div style={widgetStyles.infoGrid}>
                      <div style={widgetStyles.infoItem}>
                        <strong>Sprint:</strong> {sprintData.sprint.name}
                      </div>
                      <div style={widgetStyles.infoItem}>
                        <strong>任务数量:</strong> {sprintData.issues.length}
                      </div>
                      <div style={widgetStyles.infoItem}>
                        <strong>Story Points:</strong> {sprintData.totalStoryPoints} SP
                      </div>
                      <div style={widgetStyles.infoItem}>
                        <strong>团队成员:</strong> {teamMembers.length} 人
                      </div>
                    </div>
                  </div>
                )}

                {/* Metrics */}
                {sprintPlanning.data?.metrics && (
                  <div style={widgetStyles.section}>
                    <div style={widgetStyles.sectionTitle}>📊 关键指标</div>
                    <div style={widgetStyles.metricsGrid}>
                      <div style={widgetStyles.metricCard}>
                        <div style={widgetStyles.metricValue}>{sprintPlanning.data.metrics.totalStoryPoints}</div>
                        <div style={widgetStyles.metricLabel}>总点数</div>
                      </div>
                      <div style={widgetStyles.metricCard}>
                        <div style={widgetStyles.metricValue}>{sprintPlanning.data.metrics.avgVelocity}</div>
                        <div style={widgetStyles.metricLabel}>平均速度</div>
                      </div>
                      <div style={widgetStyles.metricCard}>
                        <div style={widgetStyles.metricValue}>{sprintPlanning.data.metrics.utilizationRate}%</div>
                        <div style={widgetStyles.metricLabel}>利用率</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Recommendations */}
                {sprintPlanning.data?.aiRecommendations && sprintPlanning.data.aiRecommendations.length > 0 && (
                  <div style={widgetStyles.section}>
                    <div style={widgetStyles.sectionTitle}>💡 AI 建议</div>
                    <div style={widgetStyles.recommendationsList}>
                      {sprintPlanning.data.aiRecommendations.slice(0, 5).map((rec: any, index: number) => (
                        <div key={index} style={widgetStyles.recommendation}>
                          {rec.description || rec}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Workload Tab */}
            {activeTab === 'workload' && (
              <div style={widgetStyles.workloadTab}>
                <TeamWorkloadTable
                  workloads={getWorkloadData()}
                  onMemberClick={handleMemberClick}
                  onRebalance={handleWorkloadRebalance}
                />
              </div>
            )}

            {/* Holidays Tab */}
            {activeTab === 'holidays' && (
              <div style={widgetStyles.holidaysTab}>
                <HolidayImpactPanel
                  holidayImpact={sprintPlanning.data?.holidayImpact ? {
                    holidaysInSprint: sprintPlanning.data.holidayImpact.map(h => ({
                      region: h.region,
                      country: h.country,
                      holidayName: h.holidayName,
                      startDate: h.startDate,
                      endDate: h.endDate,
                      dateRange: h.dateRange,
                      workingDaysAffected: 1 // Default value
                    })),
                    impactAnalysis: {
                      affectedMembers: sprintPlanning.data.holidayImpact.map(h => ({
                        memberId: h.affectedMembers[0] || 'unknown',
                        memberName: h.affectedMembers[0] || 'Unknown Member',
                        holidayName: h.holidayName,
                        region: h.region,
                        capacityReduction: h.capacityReduction,
                        workingDaysLost: 1
                      })),
                      totalCapacityReduction: sprintPlanning.data.holidayImpact.reduce((sum, h) => sum + h.capacityReduction, 0),
                      holidaysCount: sprintPlanning.data.holidayImpact.length,
                      teamSize: teamMembers.length
                    },
                    recommendations: ["根据假期影响调整 Sprint 容量", "重新分配工作负载"],
                    totalCapacityReduction: sprintPlanning.data.holidayImpact.reduce((sum, h) => sum + h.capacityReduction, 0),
                    affectedMembersCount: sprintPlanning.data.holidayImpact.reduce((count, h) => count + h.affectedMembers.length, 0),
                    success: true
                  } : undefined}
                  onAdjustCapacity={handleCapacityAdjustment}
                />
              </div>
            )}

            {/* No Data State */}
            {!sprintData && !boardDetection.error && !sprintPlanning.error && (
              <div style={widgetStyles.noData}>
                <div>📝 未找到 Sprint 数据</div>
                <div style={widgetStyles.noDataSubtext}>
                  请确保您在包含可见任务的 Jira Board 或 Backlog 页面上。
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Styles
const widgetStyles = {
  container: {
    width: "100%",
    maxWidth: "1200px",
    backgroundColor: "white",
    border: "1px solid #ddd",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: "14px",
    zIndex: 10000,
    margin: "0 auto"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid #eee",
    backgroundColor: "#f8f9fa"
  },
  headerTitle: {
    display: "flex",
    alignItems: "center",
    fontWeight: "600",
    color: "#333",
    gap: "12px"
  },
  boardBadge: {
    padding: "2px 8px",
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "500"
  },
  headerActions: {
    display: "flex",
    gap: "4px"
  },
  iconButton: {
    background: "none",
    border: "none",
    padding: "4px",
    cursor: "pointer",
    borderRadius: "4px",
    color: "#666",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  tabNavigation: {
    display: "flex",
    borderBottom: "1px solid #dee2e6",
    backgroundColor: "#f8f9fa"
  },
  tabButton: {
    flex: 1,
    padding: "12px 16px",
    border: "none",
    backgroundColor: "transparent",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    color: "#6c757d",
    transition: "all 0.2s ease",
    borderBottom: "3px solid transparent"
  },
  activeTab: {
    color: "#007bff",
    backgroundColor: "white",
    borderBottomColor: "#007bff"
  },
  content: {
    maxHeight: "600px",
    overflowY: "auto" as const,
    padding: "0"
  },
  tabContent: {
    padding: "20px"
  },
  overviewTab: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "20px"
  },
  workloadTab: {
    padding: "0"
  },
  holidaysTab: {
    padding: "0"
  },
  loading: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    padding: "32px 16px",
    color: "#666"
  },
  streamingText: {
    marginTop: "20px",
    padding: "16px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    border: "1px solid #dee2e6",
    width: "100%",
    maxWidth: "400px"
  },
  streamingTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#495057",
    marginBottom: "8px"
  },
  streamingContent: {
    fontSize: "13px",
    color: "#6c757d",
    lineHeight: "1.4"
  },
  streamingLine: {
    marginBottom: "4px",
    opacity: 0.8
  },
  spinner: {
    width: "24px",
    height: "24px",
    border: "2px solid #f3f3f3",
    borderTop: "2px solid #0052CC",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "12px"
  },
  error: {
    padding: "16px",
    textAlign: "center" as const
  },
  errorTitle: {
    fontWeight: "600",
    color: "#d73a49",
    marginBottom: "8px"
  },
  errorMessage: {
    color: "#666",
    marginBottom: "12px"
  },
  retryButton: {
    backgroundColor: "#0052CC",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "4px",
    cursor: "pointer"
  },
  section: {
    marginBottom: "20px",
    backgroundColor: "#f8f9fa",
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid #e9ecef"
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px"
  },
  sectionTitle: {
    fontWeight: "600",
    marginBottom: "8px",
    color: "#333"
  },
  infoItem: {
    marginBottom: "4px",
    color: "#666"
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "8px",
    marginBottom: "12px"
  },
  metricCard: {
    textAlign: "center" as const,
    padding: "8px",
    backgroundColor: "#f8f9fa",
    borderRadius: "4px"
  },
  metricValue: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#0052CC"
  },
  metricLabel: {
    fontSize: "12px",
    color: "#666",
    marginTop: "2px"
  },
  recommendationsList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px"
  },
  recommendation: {
    padding: "12px",
    backgroundColor: "#d1ecf1",
    border: "1px solid #bee5eb",
    borderRadius: "6px",
    fontSize: "14px",
    color: "#0c5460",
    lineHeight: "1.4"
  },
  noData: {
    textAlign: "center" as const,
    padding: "32px 16px",
    color: "#666"
  },
  noDataSubtext: {
    fontSize: "12px",
    marginTop: "8px",
    color: "#999"
  }
}
