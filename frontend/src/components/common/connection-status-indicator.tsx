import React from 'react'
import { SparklesIcon } from '../../../lib/icons/heroicon'

export interface ConnectionStatusIndicatorProps {
  portName: string
  size?: number
  showText?: boolean
  className?: string
  style?: React.CSSProperties
}

/**
 * 🎯 Simplified connection status indicator
 * In the new architecture, connection is automatically managed, here only the AI tool availability status is displayed
 */
export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  portName,
  size = 20,
  showText = false,
  className = '',
  style = {}
}) => {
  return (
    <div 
      className={`inline-flex items-center gap-2 ${className}`}
      style={style}
      title={`AI Toolbox - Service: ${portName.replace('-', ' ')}`}
    >
      <div className="relative">
        <SparklesIcon 
          width={size} 
          height={size}
        />
      </div>
      
      {showText && (
        <span 
          className="text-sm font-medium"
          style={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}
        >
          Ready
        </span>
      )}
    </div>
  )
}

export default ConnectionStatusIndicator