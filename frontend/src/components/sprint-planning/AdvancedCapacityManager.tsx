import React, { useState, useMemo } from "react"
import type { TeamMember, MemberWorkload } from "~types/sprint-planning"

interface SkillSet {
  id: string
  name: string
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  category: 'frontend' | 'backend' | 'fullstack' | 'devops' | 'testing' | 'design'
}

interface EnhancedTeamMember extends TeamMember {
  skills: SkillSet[]
  workSchedule: {
    hoursPerDay: number
    workingDays: number[]  // 0-6, Monday-Sunday
    availability: number   // 0-100%
    timeZone: string
  }
  currentCapacity: number
  historicalVelocity: number[]
  preferredTaskTypes: string[]
}

interface CapacityForecast {
  sprintNumber: number
  totalCapacity: number
  memberCapacities: Record<string, number>
  riskFactors: string[]
  confidence: number
}

interface AdvancedCapacityManagerProps {
  teamMembers: EnhancedTeamMember[]
  currentWorkloads: MemberWorkload[]
  onCapacityUpdate?: (memberId: string, newCapacity: number) => void
  onWorkloadRebalance?: (rebalanceActions: any[]) => void
  onForecastGenerate?: (forecast: CapacityForecast[]) => void
}

export const AdvancedCapacityManager: React.FC<AdvancedCapacityManagerProps> = ({
  teamMembers,
  currentWorkloads,
  onCapacityUpdate,
  onWorkloadRebalance,
  onForecastGenerate
}) => {
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [forecastPeriod, setForecastPeriod] = useState(3) // 3 sprints
  const [autoBalanceMode, setAutoBalanceMode] = useState(false)
  const [skillFilter, setSkillFilter] = useState<string>('all')

  // Calculate enhanced member data
  const enhancedMembers = useMemo(() => {
    return teamMembers.map(member => {
      const workload = currentWorkloads.find(w => w.memberId === member.id)
      const avgVelocity = member.historicalVelocity.length > 0 
        ? member.historicalVelocity.reduce((a, b) => a + b, 0) / member.historicalVelocity.length 
        : 0

      return {
        ...member,
        currentWorkload: workload?.totalWorkload || 0,
        utilizationRate: workload ? (workload.totalWorkload / member.currentCapacity) * 100 : 0,
        avgVelocity: avgVelocity,
        skillScore: member.skills.reduce((score, skill) => {
          const levelScore = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 }[skill.level]
          return score + levelScore
        }, 0),
        availabilityFactor: member.workSchedule.availability / 100
      }
    })
  }, [teamMembers, currentWorkloads])

  // Generate capacity forecast
  const capacityForecast = useMemo(() => {
    const forecasts: CapacityForecast[] = []
    
    for (let sprint = 1; sprint <= forecastPeriod; sprint++) {
      const memberCapacities: Record<string, number> = {}
      let totalCapacity = 0
      const riskFactors: string[] = []
      
      enhancedMembers.forEach(member => {
        // Base capacity calculation
        let sprintCapacity = member.currentCapacity
        
        // Adjust for availability
        sprintCapacity *= member.availabilityFactor
        
        // Adjust for historical velocity trend
        if (member.historicalVelocity.length >= 2) {
          const trend = member.historicalVelocity[member.historicalVelocity.length - 1] - 
                       member.historicalVelocity[member.historicalVelocity.length - 2]
          sprintCapacity += trend * 0.1 // Small trend adjustment
        }
        
        // Future sprint adjustments (simulate capacity changes)
        if (sprint > 1) {
          sprintCapacity *= (0.95 + Math.random() * 0.1) // Slight variation
        }
        
        memberCapacities[member.id] = Math.round(sprintCapacity)
        totalCapacity += sprintCapacity
        
        // Identify risk factors
        if (member.utilizationRate > 120) {
          riskFactors.push(`${member.name} 过载风险`)
        }
        if (member.availabilityFactor < 0.8) {
          riskFactors.push(`${member.name} 可用性降低`)
        }
      })
      
      forecasts.push({
        sprintNumber: sprint,
        totalCapacity: Math.round(totalCapacity),
        memberCapacities,
        riskFactors: [...new Set(riskFactors)],
        confidence: Math.max(0.5, 1 - (sprint - 1) * 0.15) // Confidence decreases over time
      })
    }
    
    return forecasts
  }, [enhancedMembers, forecastPeriod])

  // Generate auto-balance suggestions
  const autoBalanceSuggestions = useMemo(() => {
    if (!autoBalanceMode) return []
    
    const overloaded = enhancedMembers.filter(m => m.utilizationRate > 120)
    const underutilized = enhancedMembers.filter(m => m.utilizationRate < 70)
    
    const suggestions = []
    
    for (const overloadedMember of overloaded) {
      const excessPoints = Math.ceil((overloadedMember.utilizationRate - 100) / 100 * overloadedMember.currentCapacity)
      
      // Find best candidate to transfer work to
      const candidates = underutilized
        .filter(m => {
          // Check skill compatibility
          const hasCompatibleSkills = overloadedMember.skills.some(skill1 =>
            m.skills.some(skill2 => 
              skill1.category === skill2.category && 
              skill2.level !== 'beginner'
            )
          )
          return hasCompatibleSkills && (m.currentCapacity - m.currentWorkload) >= excessPoints
        })
        .sort((a, b) => (a.currentCapacity - a.currentWorkload) - (b.currentCapacity - b.currentWorkload))
      
      if (candidates.length > 0) {
        suggestions.push({
          from: overloadedMember.id,
          to: candidates[0].id,
          points: Math.min(excessPoints, candidates[0].currentCapacity - candidates[0].currentWorkload),
          reason: `技能匹配且有可用容量`
        })
      }
    }
    
    return suggestions
  }, [enhancedMembers, autoBalanceMode])

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'expert': return '#28a745'
      case 'advanced': return '#17a2b8'
      case 'intermediate': return '#ffc107'
      case 'beginner': return '#6c757d'
      default: return '#6c757d'
    }
  }

  const getUtilizationColor = (rate: number) => {
    if (rate > 120) return '#dc3545'
    if (rate > 100) return '#ffc107'
    if (rate < 70) return '#17a2b8'
    return '#28a745'
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>⚙️ 高级容量管理</h3>
        <div style={styles.headerControls}>
          <select 
            value={skillFilter} 
            onChange={(e) => setSkillFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">所有技能</option>
            <option value="frontend">前端</option>
            <option value="backend">后端</option>
            <option value="fullstack">全栈</option>
            <option value="devops">DevOps</option>
            <option value="testing">测试</option>
            <option value="design">设计</option>
          </select>
          
          <button
            onClick={() => setAutoBalanceMode(!autoBalanceMode)}
            style={{
              ...styles.toggleButton,
              backgroundColor: autoBalanceMode ? '#007bff' : '#6c757d'
            }}
          >
            {autoBalanceMode ? '🤖 自动平衡: 开' : '🤖 自动平衡: 关'}
          </button>
        </div>
      </div>

      {/* Team Capacity Overview */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>👥 团队容量概览</h4>
        <div style={styles.membersGrid}>
          {enhancedMembers
            .filter(member => skillFilter === 'all' || member.skills.some(s => s.category === skillFilter))
            .map(member => (
            <div 
              key={member.id} 
              style={{
                ...styles.memberCard,
                borderColor: getUtilizationColor(member.utilizationRate),
                backgroundColor: selectedMember === member.id ? '#e3f2fd' : 'white'
              }}
              onClick={() => setSelectedMember(selectedMember === member.id ? null : member.id)}
            >
              <div style={styles.memberHeader}>
                <div style={styles.memberName}>{member.name}</div>
                <div style={{
                  ...styles.utilizationBadge,
                  backgroundColor: getUtilizationColor(member.utilizationRate)
                }}>
                  {Math.round(member.utilizationRate)}%
                </div>
              </div>
              
              <div style={styles.memberStats}>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>容量:</span>
                  <span style={styles.statValue}>{member.currentCapacity} SP</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>负载:</span>
                  <span style={styles.statValue}>{member.currentWorkload} SP</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>可用性:</span>
                  <span style={styles.statValue}>{Math.round(member.workSchedule.availability)}%</span>
                </div>
              </div>
              
              <div style={styles.skillsContainer}>
                {member.skills.slice(0, 3).map(skill => (
                  <div 
                    key={skill.id}
                    style={{
                      ...styles.skillBadge,
                      backgroundColor: getSkillLevelColor(skill.level)
                    }}
                  >
                    {skill.name}
                  </div>
                ))}
                {member.skills.length > 3 && (
                  <div style={styles.moreSkills}>+{member.skills.length - 3}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Auto-Balance Suggestions */}
      {autoBalanceMode && autoBalanceSuggestions.length > 0 && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>🤖 自动平衡建议</h4>
          <div style={styles.suggestionsList}>
            {autoBalanceSuggestions.map((suggestion, index) => {
              const fromMember = enhancedMembers.find(m => m.id === suggestion.from)
              const toMember = enhancedMembers.find(m => m.id === suggestion.to)
              
              return (
                <div key={index} style={styles.suggestionItem}>
                  <div style={styles.suggestionContent}>
                    <div style={styles.suggestionText}>
                      将 <strong>{suggestion.points} SP</strong> 从 
                      <strong> {fromMember?.name}</strong> 转移给 
                      <strong> {toMember?.name}</strong>
                    </div>
                    <div style={styles.suggestionReason}>{suggestion.reason}</div>
                  </div>
                  <button 
                    onClick={() => onWorkloadRebalance && onWorkloadRebalance([suggestion])}
                    style={styles.applyButton}
                  >
                    应用
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Capacity Forecast */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>📈 容量预测</h4>
        <div style={styles.forecastControls}>
          <label style={styles.forecastLabel}>
            预测周期:
            <select 
              value={forecastPeriod} 
              onChange={(e) => setForecastPeriod(Number(e.target.value))}
              style={styles.forecastSelect}
            >
              <option value={2}>2 个 Sprint</option>
              <option value={3}>3 个 Sprint</option>
              <option value={4}>4 个 Sprint</option>
              <option value={6}>6 个 Sprint</option>
            </select>
          </label>
          
          <button 
            onClick={() => onForecastGenerate && onForecastGenerate(capacityForecast)}
            style={styles.generateButton}
          >
            生成详细预测
          </button>
        </div>
        
        <div style={styles.forecastChart}>
          {capacityForecast.map(forecast => (
            <div key={forecast.sprintNumber} style={styles.forecastItem}>
              <div style={styles.forecastHeader}>
                <div style={styles.forecastTitle}>Sprint {forecast.sprintNumber}</div>
                <div style={styles.forecastCapacity}>{forecast.totalCapacity} SP</div>
                <div style={{
                  ...styles.confidenceBadge,
                  backgroundColor: forecast.confidence > 0.8 ? '#28a745' : 
                                  forecast.confidence > 0.6 ? '#ffc107' : '#dc3545'
                }}>
                  {Math.round(forecast.confidence * 100)}% 置信度
                </div>
              </div>
              
              {forecast.riskFactors.length > 0 && (
                <div style={styles.riskFactors}>
                  <div style={styles.riskTitle}>⚠️ 风险因素:</div>
                  {forecast.riskFactors.map((risk, index) => (
                    <div key={index} style={styles.riskItem}>{risk}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Member Detail Panel */}
      {selectedMember && (
        <div style={styles.detailPanel}>
          {(() => {
            const member = enhancedMembers.find(m => m.id === selectedMember)
            if (!member) return null
            
            return (
              <div style={styles.detailContent}>
                <div style={styles.detailHeader}>
                  <h4 style={styles.detailTitle}>{member.name} - 详细信息</h4>
                  <button 
                    onClick={() => setSelectedMember(null)}
                    style={styles.closeButton}
                  >
                    ✕
                  </button>
                </div>
                
                <div style={styles.detailGrid}>
                  <div style={styles.detailSection}>
                    <h5 style={styles.detailSectionTitle}>工作安排</h5>
                    <div style={styles.scheduleInfo}>
                      <div>每日工作时间: {member.workSchedule.hoursPerDay} 小时</div>
                      <div>工作日: {member.workSchedule.workingDays.length} 天/周</div>
                      <div>时区: {member.workSchedule.timeZone}</div>
                    </div>
                  </div>
                  
                  <div style={styles.detailSection}>
                    <h5 style={styles.detailSectionTitle}>技能详情</h5>
                    <div style={styles.skillsDetail}>
                      {member.skills.map(skill => (
                        <div key={skill.id} style={styles.skillDetailItem}>
                          <span style={styles.skillName}>{skill.name}</span>
                          <span style={{
                            ...styles.skillLevel,
                            color: getSkillLevelColor(skill.level)
                          }}>
                            {skill.level}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div style={styles.detailSection}>
                    <h5 style={styles.detailSectionTitle}>历史速度</h5>
                    <div style={styles.velocityChart}>
                      {member.historicalVelocity.map((velocity, index) => (
                        <div key={index} style={styles.velocityBar}>
                          <div 
                            style={{
                              ...styles.velocityFill,
                              height: `${(velocity / Math.max(...member.historicalVelocity)) * 40}px`
                            }}
                          />
                          <div style={styles.velocityLabel}>S{index + 1}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div style={styles.capacityAdjustment}>
                  <label style={styles.adjustmentLabel}>
                    调整容量:
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={member.currentCapacity}
                      onChange={(e) => onCapacityUpdate && onCapacityUpdate(member.id, Number(e.target.value))}
                      style={styles.capacitySlider}
                    />
                    <span style={styles.capacityValue}>{member.currentCapacity} SP</span>
                  </label>
                </div>
              </div>
            )
          })()}
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
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  filterSelect: {
    padding: '6px 12px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '14px'
  },
  toggleButton: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  section: {
    padding: '20px',
    borderBottom: '1px solid #f1f3f4'
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#333'
  },
  membersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px'
  },
  memberCard: {
    padding: '16px',
    border: '2px solid',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  memberHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  memberName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333'
  },
  utilizationBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white'
  },
  memberStats: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    marginBottom: '12px'
  },
  statItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px'
  },
  statLabel: {
    color: '#6c757d'
  },
  statValue: {
    fontWeight: '500',
    color: '#333'
  },
  skillsContainer: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '4px'
  },
  skillBadge: {
    padding: '2px 6px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '500',
    color: 'white'
  },
  moreSkills: {
    padding: '2px 6px',
    borderRadius: '10px',
    fontSize: '10px',
    backgroundColor: '#e9ecef',
    color: '#6c757d'
  },
  suggestionsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px'
  },
  suggestionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#e3f2fd',
    borderRadius: '6px',
    border: '1px solid #bbdefb'
  },
  suggestionContent: {
    flex: 1
  },
  suggestionText: {
    fontSize: '14px',
    color: '#333',
    marginBottom: '4px'
  },
  suggestionReason: {
    fontSize: '12px',
    color: '#6c757d'
  },
  applyButton: {
    padding: '6px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  forecastControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  forecastLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#495057'
  },
  forecastSelect: {
    padding: '4px 8px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '14px'
  },
  generateButton: {
    padding: '8px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  forecastChart: {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto' as const
  },
  forecastItem: {
    minWidth: '200px',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef'
  },
  forecastHeader: {
    marginBottom: '12px'
  },
  forecastTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '4px'
  },
  forecastCapacity: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#007bff',
    marginBottom: '8px'
  },
  confidenceBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '600',
    color: 'white'
  },
  riskFactors: {
    marginTop: '12px'
  },
  riskTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#dc3545',
    marginBottom: '6px'
  },
  riskItem: {
    fontSize: '11px',
    color: '#dc3545',
    marginBottom: '2px'
  },
  detailPanel: {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '600px',
    maxHeight: '80vh',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    zIndex: 1000,
    overflow: 'auto'
  },
  detailContent: {
    padding: '20px'
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '1px solid #dee2e6'
  },
  detailTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#333'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#6c757d'
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '20px',
    marginBottom: '20px'
  },
  detailSection: {
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px'
  },
  detailSectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#495057'
  },
  scheduleInfo: {
    fontSize: '12px',
    color: '#6c757d',
    lineHeight: '1.5'
  },
  skillsDetail: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px'
  },
  skillDetailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px'
  },
  skillName: {
    color: '#333'
  },
  skillLevel: {
    fontWeight: '600',
    textTransform: 'capitalize' as const
  },
  velocityChart: {
    display: 'flex',
    alignItems: 'end',
    gap: '4px',
    height: '60px'
  },
  velocityBar: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    flex: 1
  },
  velocityFill: {
    width: '100%',
    backgroundColor: '#007bff',
    borderRadius: '2px 2px 0 0'
  },
  velocityLabel: {
    fontSize: '10px',
    color: '#6c757d',
    marginTop: '4px'
  },
  capacityAdjustment: {
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px'
  },
  adjustmentLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    color: '#495057'
  },
  capacitySlider: {
    flex: 1,
    margin: '0 12px'
  },
  capacityValue: {
    fontWeight: '600',
    color: '#007bff'
  }
}
