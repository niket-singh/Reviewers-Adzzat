'use client'

interface BarChartProps {
  data: {
    label: string
    value: number
    color: string
  }[]
  title: string
}

export function BarChart({ data, title }: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-6">{title}</h3>
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">{item.label}</span>
              <span className="text-lg font-bold text-gray-900">{item.value}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${item.color}`}
                style={{
                  width: `${(item.value / maxValue) * 100}%`,
                  animationDelay: `${index * 0.1}s`
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface DonutChartProps {
  data: {
    label: string
    value: number
    color: string
  }[]
  title: string
}

export function DonutChart({ data, title }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  let currentAngle = -90

  const slices = data.map((item) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0
    const angle = (percentage / 100) * 360

    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle

    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180

    const largeArc = angle > 180 ? 1 : 0

    const outerRadius = 80
    const innerRadius = 50

    const x1 = 100 + outerRadius * Math.cos(startRad)
    const y1 = 100 + outerRadius * Math.sin(startRad)
    const x2 = 100 + outerRadius * Math.cos(endRad)
    const y2 = 100 + outerRadius * Math.sin(endRad)

    const x3 = 100 + innerRadius * Math.cos(endRad)
    const y3 = 100 + innerRadius * Math.sin(endRad)
    const x4 = 100 + innerRadius * Math.cos(startRad)
    const y4 = 100 + innerRadius * Math.sin(startRad)

    const pathData = [
      `M ${x1} ${y1}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
      'Z'
    ].join(' ')

    return {
      ...item,
      percentage,
      pathData
    }
  })

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-6">{title}</h3>
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="relative">
          <svg width="200" height="200" viewBox="0 0 200 200">
            {slices.map((slice, index) => (
              <g key={index}>
                <path
                  d={slice.pathData}
                  className={slice.color}
                  opacity="0.9"
                />
              </g>
            ))}
          </svg>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="text-3xl font-bold text-gray-800">{total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          {slices.map((slice, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${slice.color}`}></div>
                <span className="text-sm font-medium text-gray-700">{slice.label}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-gray-900">{slice.value}</div>
                <div className="text-xs text-gray-500">{slice.percentage.toFixed(1)}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: number
  icon: string
  color: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function StatCard({ title, value, icon, color, trend }: StatCardProps) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-400 to-yellow-500',
    red: 'from-red-500 to-red-600',
    orange: 'from-orange-500 to-orange-600',
    cyan: 'from-cyan-500 to-cyan-600',
  }

  return (
    <div className={`bg-gradient-to-br ${colorMap[color] || colorMap.blue} rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105`}>
      <div className="flex items-start justify-between mb-4">
        <div className="text-5xl opacity-90">{icon}</div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded ${trend.isPositive ? 'bg-white/20' : 'bg-black/20'}`}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <div className="text-4xl font-bold mb-2">{value}</div>
      <div className="text-sm font-medium opacity-90">{title}</div>
    </div>
  )
}
