import React from 'react'

interface OrderProgressTrackerProps {
  status: 'pending' | 'preparing' | 'ready' | 'collected' | 'completed'
}

export default function OrderProgressTracker({ status }: OrderProgressTrackerProps) {
  const steps = ['pending', 'preparing', 'ready', 'collected']
  // Map 'completed' to 'collected' for the UI
  const mappedStatus = status === 'completed' ? 'collected' : status
  const currentIndex = steps.indexOf(mappedStatus)
  
  return (
    <div className="py-6">
      {/* 4 Dots with connecting lines */}
      <div className="relative flex justify-between items-center mb-6 max-w-lg mx-auto">
        {steps.map((step, index) => {
          const isCompleted = index <= currentIndex
          const icons = ['📝', '👨‍🍳', '✅', '🎉']
          const labels = ['Order Placed', 'Preparing', 'Ready', 'Completed']
          
          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center z-10">
                <div 
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold transition-all duration-500 ${
                    isCompleted 
                      ? (mappedStatus === 'collected' && index === 3 
                          ? 'bg-green-500 text-white shadow-lg scale-110 animate-pulse' 
                          : 'bg-blue-500 text-white shadow-md'
                        )
                      : 'bg-gray-300 text-gray-500'
                  }`}
                >
                  {icons[index]}
                </div>
                <p className={`text-sm font-medium mt-2 text-center ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                  {labels[index]}
                </p>
              </div>
              
              {/* Connecting line between dots */}
              {index < 3 && (
                <div className="flex-1 mx-3">
                  <div 
                    className={`h-2 rounded-full transition-all duration-700 ${
                      index < currentIndex ? 'bg-blue-500' : 'bg-gray-300'
                    }`} 
                  />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
      
      {/* Status Message */}
      <div className="text-center">
        <div className={`inline-block px-6 py-3 rounded-full font-bold text-lg ${
          mappedStatus === 'collected' 
            ? 'bg-green-100 text-green-800 border-2 border-green-400' 
            : 'bg-blue-100 text-blue-800 border-2 border-blue-400'
        }`}>
          {mappedStatus === 'collected' ? '🎉 ORDER COMPLETED!' : `Current Status: ${status.toUpperCase()}`}
        </div>
      </div>
      
      {/* Celebration for completed */}
      {mappedStatus === 'collected' && (
        <div className="text-center mt-4 animate-bounce">
          <div className="text-6xl">🎉</div>
          <p className="text-green-700 font-bold text-xl">Thank you for your order!</p>
        </div>
      )}
    </div>
  )
}