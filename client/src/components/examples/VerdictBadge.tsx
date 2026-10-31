import VerdictBadge from '../VerdictBadge'

export default function VerdictBadgeExample() {
  return (
    <div className="p-8 space-y-6">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Small Size</h3>
        <div className="flex flex-wrap gap-3">
          <VerdictBadge verdict="TRUE" size="sm" />
          <VerdictBadge verdict="FALSE" size="sm" />
          <VerdictBadge verdict="PARTIALLY_TRUE" size="sm" />
          <VerdictBadge verdict="MISLEADING" size="sm" />
        </div>
      </div>
      
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Large Size</h3>
        <div className="flex flex-wrap gap-4">
          <VerdictBadge verdict="TRUE" size="lg" />
          <VerdictBadge verdict="FALSE" size="lg" />
        </div>
      </div>
    </div>
  )
}
