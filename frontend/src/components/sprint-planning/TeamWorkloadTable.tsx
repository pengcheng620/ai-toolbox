import React, { useState } from "react"
import type { TeamWorkloadTableProps, MemberWorkload } from "~types/sprint-planning"

export const TeamWorkloadTable: React.FC<TeamWorkloadTableProps> = ({
  workloads,
  onMemberClick,
  onRebalance
}) => {
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [rebalanceMode, setRebalanceMode] = useState(false)
  const [rebalancePoints, setRebalancePoints] = useState(1)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return '#28a745'
      case 'high': return '#ffc107'
      case 'overloaded': return '#dc3545'
      default: return '#6c757d'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal': return '✅'
      case 'high': return '⚠️'
      case 'overloaded': return '🔴'
      default: return '❓'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'normal': return '正常'
      case 'high': return '偏高'
      case 'overloaded': return '过载'
      default: return '未知'
    }
  }

  const getUtilizationPercentage = (workload: MemberWorkload) => {
    if (!workload.capacity || workload.capacity === 0) return 0
    return Math.round((workload.totalWorkload / workload.capacity) * 100)
  }

  const handleMemberClick = (memberId: string) => {
    setSelectedMember(selectedMember === memberId ? null : memberId)
    if (onMemberClick) {
      onMemberClick(memberId)
    }
  }

  const handleRebalance = (fromMemberId: string, toMemberId: string) => {
    if (onRebalance && rebalancePoints > 0) {
      onRebalance(fromMemberId, toMemberId, rebalancePoints)
      setRebalanceMode(false)
      setSelectedMember(null)
    }
  }

  const sortedWorkloads = [...workloads].sort((a, b) => {
    // Sort by status priority: overloaded > high > normal
    const statusPriority = { overloaded: 3, high: 2, normal: 1 }
    const aPriority = statusPriority[a.status] || 0
    const bPriority = statusPriority[b.status] || 0
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority
    }
    
    // Then sort by total workload descending
    return b.totalWorkload - a.totalWorkload
  })

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>👥 团队工作负载详情</h3>
        <div style={styles.headerActions}>
          <button
            onClick={() => setRebalanceMode(!rebalanceMode)}
            style={{
              ...styles.actionButton,
              backgroundColor: rebalanceMode ? '#dc3545' : '#007bff'
            }}
          >
            {rebalanceMode ? '取消重新分配' : '重新分配'}
          </button>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={styles.headerCell}>成员</th>
              <th style={styles.headerCell}>当前Sprint</th>
              <th style={styles.headerCell}>上周遗留</th>
              <th style={styles.headerCell}>总负载</th>
              <th style={styles.headerCell}>容量利用率</th>
              <th style={styles.headerCell}>状态</th>
              {rebalanceMode && <th style={styles.headerCell}>操作</th>}
            </tr>
          </thead>
          <tbody>
            {sortedWorkloads.map((workload) => {
              const utilizationPercentage = getUtilizationPercentage(workload)
              const isSelected = selectedMember === workload.memberId
              
              return (
                <tr
                  key={workload.memberId}
                  style={{
                    ...styles.dataRow,
                    backgroundColor: isSelected ? '#e3f2fd' : 'transparent'
                  }}
                  onClick={() => handleMemberClick(workload.memberId)}
                >
                  <td style={styles.memberCell}>
                    <div style={styles.memberInfo}>
                      <div style={styles.memberAvatar}>
                        {workload.memberName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={styles.memberName}>{workload.memberName}</div>
                        <div style={styles.memberSubtext}>
                          {workload.issueCount} 个任务
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td style={styles.dataCell}>
                    <span style={styles.pointsBadge}>
                      {workload.currentSprintPoints} SP
                    </span>
                  </td>
                  
                  <td style={styles.dataCell}>
                    <span style={{
                      ...styles.pointsBadge,
                      backgroundColor: workload.carryOverPoints > 0 ? '#fff3cd' : '#f8f9fa',
                      color: workload.carryOverPoints > 0 ? '#856404' : '#6c757d'
                    }}>
                      {workload.carryOverPoints} SP
                    </span>
                  </td>
                  
                  <td style={styles.dataCell}>
                    <div style={styles.totalWorkloadCell}>
                      <span style={{
                        ...styles.pointsBadge,
                        backgroundColor: getStatusColor(workload.status),
                        color: 'white',
                        fontWeight: '600'
                      }}>
                        {workload.totalWorkload} SP
                      </span>
                      {workload.capacity && (
                        <div style={styles.capacityText}>
                          / {workload.capacity} SP
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td style={styles.dataCell}>
                    <div style={styles.utilizationCell}>
                      <div style={styles.utilizationBar}>
                        <div
                          style={{
                            ...styles.utilizationFill,
                            width: `${Math.min(utilizationPercentage, 100)}%`,
                            backgroundColor: getStatusColor(workload.status)
                          }}
                        />
                      </div>
                      <span style={styles.utilizationText}>
                        {utilizationPercentage}%
                      </span>
                    </div>
                  </td>
                  
                  <td style={styles.dataCell}>
                    <div style={styles.statusBadge}>
                      <span style={styles.statusIcon}>
                        {getStatusIcon(workload.status)}
                      </span>
                      <span style={{
                        color: getStatusColor(workload.status),
                        fontWeight: '500'
                      }}>
                        {getStatusText(workload.status)}
                      </span>
                    </div>
                  </td>
                  
                  {rebalanceMode && (
                    <td style={styles.dataCell}>
                      {workload.status === 'overloaded' && (
                        <div style={styles.rebalanceActions}>
                          <input
                            type="number"
                            min="1"
                            max={workload.totalWorkload}
                            value={rebalancePoints}
                            onChange={(e) => setRebalancePoints(parseInt(e.target.value) || 1)}
                            style={styles.pointsInput}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleRebalance(workload.memberId, e.target.value)
                              }
                            }}
                            style={styles.memberSelect}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">转移给...</option>
                            {sortedWorkloads
                              .filter(w => w.memberId !== workload.memberId && w.status === 'normal')
                              .map(w => (
                                <option key={w.memberId} value={w.memberId}>
                                  {w.memberName}
                                </option>
                              ))
                            }
                          </select>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Statistics */}
      <div style={styles.summary}>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>总分配点数:</span>
          <span style={styles.summaryValue}>
            {workloads.reduce((sum, w) => sum + w.totalWorkload, 0)} SP
          </span>
        </div>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>平均负载:</span>
          <span style={styles.summaryValue}>
            {Math.round(workloads.reduce((sum, w) => sum + w.totalWorkload, 0) / workloads.length)} SP
          </span>
        </div>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>过载成员:</span>
          <span style={{
            ...styles.summaryValue,
            color: workloads.filter(w => w.status === 'overloaded').length > 0 ? '#dc3545' : '#28a745'
          }}>
            {workloads.filter(w => w.status === 'overloaded').length} 人
          </span>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #dee2e6'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#333'
  },
  headerActions: {
    display: 'flex',
    gap: '8px'
  },
  actionButton: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    color: 'white',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease'
  },
  tableContainer: {
    overflowX: 'auto' as const
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '14px'
  },
  headerRow: {
    backgroundColor: '#f8f9fa'
  },
  headerCell: {
    padding: '12px 16px',
    textAlign: 'left' as const,
    fontWeight: '600',
    color: '#495057',
    borderBottom: '2px solid #dee2e6'
  },
  dataRow: {
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  },
  dataCell: {
    padding: '12px 16px',
    borderBottom: '1px solid #dee2e6',
    verticalAlign: 'middle' as const
  },
  memberCell: {
    padding: '12px 16px',
    borderBottom: '1px solid #dee2e6'
  },
  memberInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  memberAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#007bff',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '14px'
  },
  memberName: {
    fontWeight: '500',
    color: '#333',
    marginBottom: '2px'
  },
  memberSubtext: {
    fontSize: '12px',
    color: '#6c757d'
  },
  pointsBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    backgroundColor: '#e9ecef',
    color: '#495057'
  },
  totalWorkloadCell: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    gap: '2px'
  },
  capacityText: {
    fontSize: '11px',
    color: '#6c757d'
  },
  utilizationCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  utilizationBar: {
    width: '60px',
    height: '8px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  utilizationFill: {
    height: '100%',
    transition: 'width 0.3s ease'
  },
  utilizationText: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#495057'
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  statusIcon: {
    fontSize: '14px'
  },
  rebalanceActions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px'
  },
  pointsInput: {
    width: '60px',
    padding: '4px 6px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '12px'
  },
  memberSelect: {
    padding: '4px 6px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '12px',
    minWidth: '120px'
  },
  summary: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '16px 20px',
    backgroundColor: '#f8f9fa',
    borderTop: '1px solid #dee2e6'
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px'
  },
  summaryLabel: {
    fontSize: '12px',
    color: '#6c757d',
    fontWeight: '500'
  },
  summaryValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333'
  }
}
