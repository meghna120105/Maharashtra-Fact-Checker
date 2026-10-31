import AccuracyMeter from '../AccuracyMeter'

export default function AccuracyMeterExample() {
  return (
    <div className="p-8 space-y-8 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold mb-4">High Accuracy</h3>
        <AccuracyMeter accuracy={87} />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4">Medium Accuracy</h3>
        <AccuracyMeter accuracy={55} />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4">Low Accuracy</h3>
        <AccuracyMeter accuracy={25} />
      </div>
    </div>
  )
}
