import React, { useState, useEffect, useMemo } from "react"
import type { SprintMetrics } from "~types/sprint-planning"

interface SprintMetricsDashboardProps {
  metrics: SprintMetrics
  sprintData?: any
  teamMembers?: any[]
  onRefresh?: () => void
  realTimeUpdates?: boolean
}

interface BurndownDataPoint {
  date: string
  remaining: number
  ideal: number
  actual?: number
}

export const SprintMetricsDashboard: React.FC<SprintMetricsDashboardProps> = ({
  metrics,
  sprintData,
  teamMembers = [],
  onRefresh,
  realTimeUpdates = false
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'burndown' | 'velocity' | 'capacity'>('burndown')
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null)

  // Generate burndown chart data
  const burndownData = useMemo(() => {
    if (!sprintData) return []
    
    const totalPoints = sprintData.totalStoryPoints || 0
    const sprintDays = 10 // Assume 2-week sprint
    
    // Generate ideal burndown line
    const data: BurndownDataPoint[] = []
    for (let day = 0; day <= sprintDays; day++) {
      const date = new Date()
      date.setDate(date.getDate() - (sprintDays - day))
      
      data.push({
        date: date.toISOString().split('T')[0],
        remaining: totalPoints - (totalPoints * day / sprintDays),
        ideal: totalPoints - (totalPoints * day / sprintDays),
        actual: totalPoints - (totalPoints * Math.min(day / sprintDays, 1) * 0.8) // Simulated actual progress
      })
    }
    
    return data
  }, [sprintData])

  // Calculate completion probability
  const completionProbability = useMemo(() => {
    if (!metrics.utilizationRate) return 0
    
    const baseProb = Math.min(100, 100 - Math.abs(metrics.utilizationRate - 100) * 0.5)
    const velocityFactor = metrics.avgVelocity > 0 ? Math.min(1.2, metrics.totalStoryPoints / metrics.avgVelocity) : 1
    
    return Math.round(baseProb * velocityFactor)
  }, [metrics])

  // Detect bottlenecks
  const bottlenecks = useMemo(() => {
    const detected = []
    
    if (metrics.utilizationRate > 120) {
      detected.push({ type: 'capacity', severity: 'high', description: '容量过载' })
    }
    
    if (teamMembers.length > 0) {
      const avgWorkload = metrics.totalStoryPoints / teamMembers.length
      if (avgWorkload > 15) {
        detected.push({ type: 'workload', severity: 'medium', description: '工作负载过重' })
      }
    }
    
    return detected
  }, [metrics, teamMembers])

  // Setup real-time updates
  useEffect(() => {
    if (realTimeUpdates && onRefresh) {
      const interval = setInterval(() => {
        onRefresh()
      }, 30000) // Refresh every 30 seconds
      
      setRefreshInterval(interval)
      
      return () => {
        if (interval) clearInterval(interval)
      }
    }
  }, [realTimeUpdates, onRefresh])

  const renderBurndownChart = () => (
    <div style={styles.chartContainer}>
      <h4 style={styles.chartTitle}>📈 燃尽图</h4>
      <div style={styles.chart}>
        <svg width="100%" height="200" viewBox="0 0 400 200">
          {/* Chart background */}
          <rect width="400" height="200" fill="#f8f9fa" stroke="#dee2e6" />
          
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <g key={i}>
              <line x1={i * 80 + 40} y1="20" x2={i * 80 + 40} y2="180" stroke="#e9ecef" strokeWidth="1" />
              <line x1="40" y1={i * 40 + 20} x2="360" y2={i * 40 + 20} stroke="#e9ecef" strokeWidth="1" />
            </g>
          ))}
          
          {/* Ideal line */}
          <line x1="40" y1="20" x2="360" y2="180" stroke="#6c757d" strokeWidth="2" strokeDasharray="5,5" />
          
          {/* Actual progress line */}
          {burndownData.length > 1 && (
            <polyline
              points={burndownData.map((point, index) => 
                `${40 + (index * 320 / (burndownData.length - 1))},${20 + ((metrics.totalStoryPoints - (point.actual || 0)) * 160 / metrics.totalStoryPoints)}`
              ).join(' ')}
              fill="none"
              stroke="#007bff"
              strokeWidth="3"
            />
          )}
          
          {/* Labels */}
          <text x="200" y="15" textAnchor="middle" fontSize="12" fill="#495057">Sprint 进度</text>
          <text x="20" y="105" textAnchor="middle" fontSize="10" fill="#6c757d" transform="rotate(-90 20 105)">故事点</text>
          <text x="200" y="195" textAnchor="middle" fontSize="10" fill="#6c757d">天数</text>
        </svg>
        
        <div style={styles.chartLegend}>
          <div style={styles.legendItem}>
            <div style={{...styles.legendColor, backgroundColor: '#6c757d'}}></div>
            <span>理想进度</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{...styles.legendColor, backgroundColor: '#007bff'}}></div>
            <span>实际进度</span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderVelocityTrend = () => (
    <div style={styles.chartContainer}>
      <h4 style={styles.chartTitle}>🚀 速度趋势</h4>
      <div style={styles.chart}>
        <svg width="100%" height="200" viewBox="0 0 400 200">
          {/* Chart background */}
          <rect width="400" height="200" fill="#f8f9fa" stroke="#dee2e6" />
          
          {/* Velocity bars */}
          {metrics.teamVelocity.map((velocity, index) => {
            const barHeight = (velocity / Math.max(...metrics.teamVelocity)) * 140
            const x = 50 + index * 60
            const y = 160 - barHeight
            
            return (
              <g key={index}>
                <rect
                  x={x}
                  y={y}
                  width="40"
                  height={barHeight}
                  fill={index === metrics.teamVelocity.length - 1 ? "#007bff" : "#6c757d"}
                  opacity="0.8"
                />
                <text x={x + 20} y={y - 5} textAnchor="middle" fontSize="10" fill="#495057">
                  {velocity}
                </text>
                <text x={x + 20} y="180" textAnchor="middle" fontSize="9" fill="#6c757d">
                  S{index + 1}
                </text>
              </g>
            )
          })}
          
          {/* Average line */}
          <line 
            x1="40" 
            y1={160 - (metrics.avgVelocity / Math.max(...metrics.teamVelocity)) * 140}
            x2="360" 
            y2={160 - (metrics.avgVelocity / Math.max(...metrics.teamVelocity)) * 140}
            stroke="#dc3545" 
            strokeWidth="2" 
            strokeDasharray="3,3" 
          />
          
          <text x="200" y="15" textAnchor="middle" fontSize="12" fill="#495057">团队速度趋势</text>
        </svg>
        
        <div style={styles.velocityStats}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>平均速度:</span>
            <span style={styles.statValue}>{metrics.avgVelocity} SP</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>当前速度:</span>
            <span style={styles.statValue}>{metrics.teamVelocity[metrics.teamVelocity.length - 1]} SP</span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderCapacityUtilization = () => (
    <div style={styles.chartContainer}>
      <h4 style={styles.chartTitle}>⚡ 容量利用率</h4>
      <div style={styles.capacityChart}>
        <div style={styles.capacityGauge}>
          <svg width="200" height="120" viewBox="0 0 200 120">
            {/* Gauge background */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="#e9ecef"
              strokeWidth="20"
            />
            
            {/* Gauge fill */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={
                metrics.utilizationRate > 120 ? "#dc3545" :
                metrics.utilizationRate > 100 ? "#ffc107" : "#28a745"
              }
              strokeWidth="20"
              strokeDasharray={`${(metrics.utilizationRate / 150) * 251.2} 251.2`}
              transform="rotate(-90 100 100)"
            />
            
            {/* Center text */}
            <text x="100" y="85" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#495057">
              {metrics.utilizationRate}%
            </text>
            <text x="100" y="105" textAnchor="middle" fontSize="12" fill="#6c757d">
              容量利用率
            </text>
          </svg>
        </div>
        
        <div style={styles.capacityDetails}>
          <div style={styles.capacityItem}>
            <span style={styles.capacityLabel}>总故事点:</span>
            <span style={styles.capacityValue}>{metrics.totalStoryPoints} SP</span>
          </div>
          <div style={styles.capacityItem}>
            <span style={styles.capacityLabel}>团队规模:</span>
            <span style={styles.capacityValue}>{metrics.teamSize} 人</span>
          </div>
          <div style={styles.capacityItem}>
            <span style={styles.capacityLabel}>人均负载:</span>
            <span style={styles.capacityValue}>
              {metrics.teamSize > 0 ? Math.round(metrics.totalStoryPoints / metrics.teamSize) : 0} SP
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>📊 Sprint 指标仪表板</h3>
        <div style={styles.headerActions}>
          {realTimeUpdates && (
            <div style={styles.realTimeIndicator}>
              <div style={styles.pulseIcon}></div>
              <span>实时更新</span>
            </div>
          )}
          <button onClick={onRefresh} style={styles.refreshButton}>
            🔄 刷新
          </button>
        </div>
      </div>

      {/* Key Metrics Summary */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricIcon}>🎯</div>
          <div style={styles.metricContent}>
            <div style={styles.metricValue}>{completionProbability}%</div>
            <div style={styles.metricLabel}>完成概率</div>
          </div>
        </div>
        
        <div style={styles.metricCard}>
          <div style={styles.metricIcon}>⚡</div>
          <div style={styles.metricContent}>
            <div style={styles.metricValue}>{metrics.utilizationRate}%</div>
            <div style={styles.metricLabel}>容量利用率</div>
          </div>
        </div>
        
        <div style={styles.metricCard}>
          <div style={styles.metricIcon}>🚀</div>
          <div style={styles.metricContent}>
            <div style={styles.metricValue}>{metrics.avgVelocity}</div>
            <div style={styles.metricLabel}>平均速度</div>
          </div>
        </div>
        
        <div style={styles.metricCard}>
          <div style={styles.metricIcon}>⚠️</div>
          <div style={styles.metricContent}>
            <div style={styles.metricValue}>{bottlenecks.length}</div>
            <div style={styles.metricLabel}>瓶颈数量</div>
          </div>
        </div>
      </div>

      {/* Chart Navigation */}
      <div style={styles.chartNavigation}>
        <button
          onClick={() => setSelectedMetric('burndown')}
          style={{
            ...styles.chartNavButton,
            ...(selectedMetric === 'burndown' ? styles.activeChartNav : {})
          }}
        >
          📈 燃尽图
        </button>
        <button
          onClick={() => setSelectedMetric('velocity')}
          style={{
            ...styles.chartNavButton,
            ...(selectedMetric === 'velocity' ? styles.activeChartNav : {})
          }}
        >
          🚀 速度趋势
        </button>
        <button
          onClick={() => setSelectedMetric('capacity')}
          style={{
            ...styles.chartNavButton,
            ...(selectedMetric === 'capacity' ? styles.activeChartNav : {})
          }}
        >
          ⚡ 容量分析
        </button>
      </div>

      {/* Chart Display */}
      <div style={styles.chartSection}>
        {selectedMetric === 'burndown' && renderBurndownChart()}
        {selectedMetric === 'velocity' && renderVelocityTrend()}
        {selectedMetric === 'capacity' && renderCapacityUtilization()}
      </div>

      {/* Bottlenecks Alert */}
      {bottlenecks.length > 0 && (
        <div style={styles.bottlenecksSection}>
          <h4 style={styles.bottlenecksTitle}>⚠️ 检测到的瓶颈</h4>
          <div style={styles.bottlenecksList}>
            {bottlenecks.map((bottleneck, index) => (
              <div key={index} style={{
                ...styles.bottleneckItem,
                borderLeftColor: bottleneck.severity === 'high' ? '#dc3545' : '#ffc107'
              }}>
                <div style={styles.bottleneckType}>{bottleneck.type}</div>
                <div style={styles.bottleneckDescription}>{bottleneck.description}</div>
              </div>
            ))}
          </div>
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
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  realTimeIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#28a745'
  },
  pulseIcon: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#28a745',
    animation: 'pulse 2s infinite'
  },
  refreshButton: {
    padding: '6px 12px',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '12px'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    padding: '20px'
  },
  metricCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef'
  },
  metricIcon: {
    fontSize: '24px',
    marginRight: '12px'
  },
  metricContent: {
    flex: 1
  },
  metricValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#333',
    marginBottom: '2px'
  },
  metricLabel: {
    fontSize: '12px',
    color: '#6c757d'
  },
  chartNavigation: {
    display: 'flex',
    borderBottom: '1px solid #dee2e6',
    backgroundColor: '#f8f9fa'
  },
  chartNavButton: {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6c757d',
    transition: 'all 0.2s ease'
  },
  activeChartNav: {
    color: '#007bff',
    backgroundColor: 'white',
    borderBottom: '3px solid #007bff'
  },
  chartSection: {
    padding: '20px'
  },
  chartContainer: {
    backgroundColor: 'white'
  },
  chartTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#333'
  },
  chart: {
    position: 'relative' as const
  },
  chartLegend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    marginTop: '12px'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#6c757d'
  },
  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '2px'
  },
  velocityStats: {
    display: 'flex',
    justifyContent: 'space-around',
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px'
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px'
  },
  statLabel: {
    fontSize: '12px',
    color: '#6c757d'
  },
  statValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333'
  },
  capacityChart: {
    display: 'flex',
    alignItems: 'center',
    gap: '40px'
  },
  capacityGauge: {
    flex: 'none'
  },
  capacityDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px'
  },
  capacityItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px'
  },
  capacityLabel: {
    fontSize: '14px',
    color: '#6c757d'
  },
  capacityValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333'
  },
  bottlenecksSection: {
    padding: '20px',
    borderTop: '1px solid #dee2e6',
    backgroundColor: '#fff3cd'
  },
  bottlenecksTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#856404'
  },
  bottlenecksList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px'
  },
  bottleneckItem: {
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '6px',
    borderLeft: '4px solid',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  bottleneckType: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize' as const
  },
  bottleneckDescription: {
    fontSize: '14px',
    color: '#6c757d'
  }
}
