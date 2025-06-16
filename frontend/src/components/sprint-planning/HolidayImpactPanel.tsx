import React, { useState } from "react"
import type { HolidayImpactProps, HolidayImpact } from "~types/sprint-planning"

interface HolidayImpactPanelProps {
  holidayImpact?: {
    holidaysInSprint: Array<{
      region: string
      country: string
      holidayName: string
      startDate: string
      endDate: string
      dateRange: string
      workingDaysAffected: number
    }>
    impactAnalysis: {
      affectedMembers: Array<{
        memberId: string
        memberName: string
        holidayName: string
        region: string
        capacityReduction: number
        workingDaysLost: number
      }>
      totalCapacityReduction: number
      holidaysCount: number
      teamSize: number
    }
    recommendations: string[]
    totalCapacityReduction: number
    affectedMembersCount: number
    success: boolean
  }
  onAdjustCapacity?: (newCapacity: number) => void
}

export const HolidayImpactPanel: React.FC<HolidayImpactPanelProps> = ({
  holidayImpact,
  onAdjustCapacity
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  if (!holidayImpact || !holidayImpact.success) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>🏖️ 假期影响分析</h3>
          <span style={styles.noDataBadge}>无数据</span>
        </div>
        <div style={styles.noData}>
          <p>暂无假期影响数据</p>
        </div>
      </div>
    )
  }

  const { holidaysInSprint, impactAnalysis, recommendations, totalCapacityReduction } = holidayImpact
  const hasSignificantImpact = totalCapacityReduction > 10

  const getImpactSeverity = (reduction: number) => {
    if (reduction >= 30) return { level: 'critical', color: '#dc3545', icon: '🔴' }
    if (reduction >= 20) return { level: 'high', color: '#fd7e14', icon: '🟠' }
    if (reduction >= 10) return { level: 'medium', color: '#ffc107', icon: '🟡' }
    return { level: 'low', color: '#28a745', icon: '🟢' }
  }

  const severity = getImpactSeverity(totalCapacityReduction)

  return (
    <div style={styles.container}>
      <div style={styles.header} onClick={() => setIsExpanded(!isExpanded)}>
        <h3 style={styles.title}>🏖️ 假期影响分析</h3>
        <div style={styles.headerRight}>
          <div style={{
            ...styles.impactBadge,
            backgroundColor: severity.color,
            color: 'white'
          }}>
            {severity.icon} {totalCapacityReduction}% 容量减少
          </div>
          <button style={styles.expandButton}>
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div style={styles.content}>
          {/* Summary */}
          <div style={styles.summary}>
            <div style={styles.summaryGrid}>
              <div style={styles.summaryItem}>
                <div style={styles.summaryValue}>{holidaysInSprint.length}</div>
                <div style={styles.summaryLabel}>假期数量</div>
              </div>
              <div style={styles.summaryItem}>
                <div style={styles.summaryValue}>{impactAnalysis.affectedMembers.length}</div>
                <div style={styles.summaryLabel}>受影响成员</div>
              </div>
              <div style={styles.summaryItem}>
                <div style={{
                  ...styles.summaryValue,
                  color: severity.color
                }}>
                  {totalCapacityReduction}%
                </div>
                <div style={styles.summaryLabel}>容量减少</div>
              </div>
            </div>
          </div>

          {/* Holidays List */}
          {holidaysInSprint.length > 0 && (
            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>📅 Sprint 期间假期</h4>
              <div style={styles.holidaysList}>
                {holidaysInSprint.map((holiday, index) => (
                  <div key={index} style={styles.holidayItem}>
                    <div style={styles.holidayInfo}>
                      <div style={styles.holidayName}>{holiday.holidayName}</div>
                      <div style={styles.holidayDetails}>
                        {holiday.country} • {holiday.dateRange} • {holiday.workingDaysAffected} 工作日
                      </div>
                    </div>
                    <div style={styles.holidayFlag}>
                      {holiday.region === 'CN' ? '🇨🇳' : 
                       holiday.region === 'US' ? '🇺🇸' : 
                       holiday.region === 'IN' ? '🇮🇳' : '🌍'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Affected Members */}
          {impactAnalysis.affectedMembers.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h4 style={styles.sectionTitle}>👥 受影响团队成员</h4>
                <button 
                  onClick={() => setShowDetails(!showDetails)}
                  style={styles.detailsButton}
                >
                  {showDetails ? '隐藏详情' : '显示详情'}
                </button>
              </div>
              
              <div style={styles.membersList}>
                {impactAnalysis.affectedMembers.map((member, index) => (
                  <div key={index} style={styles.memberItem}>
                    <div style={styles.memberInfo}>
                      <div style={styles.memberName}>{member.memberName}</div>
                      {showDetails && (
                        <div style={styles.memberDetails}>
                          {member.holidayName} • {member.workingDaysLost} 工作日损失
                        </div>
                      )}
                    </div>
                    <div style={styles.memberImpact}>
                      <span style={{
                        ...styles.capacityBadge,
                        backgroundColor: getImpactSeverity(member.capacityReduction).color
                      }}>
                        -{member.capacityReduction}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>💡 建议</h4>
              <div style={styles.recommendationsList}>
                {recommendations.map((recommendation, index) => (
                  <div key={index} style={styles.recommendationItem}>
                    {recommendation}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Capacity Adjustment */}
          {hasSignificantImpact && onAdjustCapacity && (
            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>⚙️ 容量调整</h4>
              <div style={styles.adjustmentPanel}>
                <p style={styles.adjustmentText}>
                  建议根据假期影响调整 Sprint 容量：
                </p>
                <div style={styles.adjustmentActions}>
                  <button
                    onClick={() => onAdjustCapacity(Math.round(100 - totalCapacityReduction))}
                    style={styles.adjustButton}
                  >
                    自动调整到 {Math.round(100 - totalCapacityReduction)}%
                  </button>
                  <button
                    onClick={() => onAdjustCapacity(80)}
                    style={styles.conservativeButton}
                  >
                    保守调整到 80%
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
    overflow: 'hidden',
    marginBottom: '16px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #dee2e6',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#333'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  impactBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600'
  },
  expandButton: {
    background: 'none',
    border: 'none',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#666'
  },
  noDataBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    backgroundColor: '#e9ecef',
    color: '#6c757d'
  },
  content: {
    padding: '20px'
  },
  noData: {
    padding: '20px',
    textAlign: 'center' as const,
    color: '#6c757d'
  },
  summary: {
    marginBottom: '20px'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '16px'
  },
  summaryItem: {
    textAlign: 'center' as const,
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },
  summaryValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#333',
    marginBottom: '4px'
  },
  summaryLabel: {
    fontSize: '12px',
    color: '#6c757d',
    fontWeight: '500'
  },
  section: {
    marginBottom: '20px'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  sectionTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#333'
  },
  detailsButton: {
    padding: '4px 8px',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    fontSize: '12px',
    backgroundColor: 'white',
    cursor: 'pointer',
    color: '#495057'
  },
  holidaysList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px'
  },
  holidayItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '6px'
  },
  holidayInfo: {
    flex: 1
  },
  holidayName: {
    fontWeight: '600',
    color: '#856404',
    marginBottom: '2px'
  },
  holidayDetails: {
    fontSize: '12px',
    color: '#856404'
  },
  holidayFlag: {
    fontSize: '20px'
  },
  membersList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px'
  },
  memberItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px'
  },
  memberInfo: {
    flex: 1
  },
  memberName: {
    fontWeight: '500',
    color: '#333',
    marginBottom: '2px'
  },
  memberDetails: {
    fontSize: '12px',
    color: '#6c757d'
  },
  memberImpact: {
    display: 'flex',
    alignItems: 'center'
  },
  capacityBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white'
  },
  recommendationsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px'
  },
  recommendationItem: {
    padding: '12px',
    backgroundColor: '#d1ecf1',
    border: '1px solid #bee5eb',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#0c5460'
  },
  adjustmentPanel: {
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px'
  },
  adjustmentText: {
    margin: '0 0 12px 0',
    color: '#495057'
  },
  adjustmentActions: {
    display: 'flex',
    gap: '8px'
  },
  adjustButton: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  conservativeButton: {
    padding: '8px 16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  }
}
