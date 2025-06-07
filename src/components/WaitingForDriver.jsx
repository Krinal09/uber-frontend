import React from 'react'
import { useNavigate } from 'react-router-dom'

const WaitingForDriver = ({ ride, onCancel }) => {
    const navigate = useNavigate()

    console.log('WaitingForDriver rendered with ride:', ride);
    console.log('OTP in WaitingForDriver:', ride?.otp);

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-20">
            <div className="flex flex-col items-center">
                {ride?.otp ? (
                    <>
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                             <i className="ri-check-line text-3xl text-green-500"></i>
                        </div>
                        <h2 className="text-xl font-semibold mb-2">Driver Found!</h2>
                        <p className="text-gray-600 text-center mb-4">
                            Your driver has accepted the ride. Please provide the following OTP to your driver.
                        </p>
                         <div className="text-4xl font-bold text-green-600 mb-6">
                             {ride.otp}
                         </div>
                    </>
                ) : (
                    <>
                         <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                             <i className="ri-taxi-line text-3xl text-yellow-500"></i>
                         </div>
                         <h2 className="text-xl font-semibold mb-2">Looking for a Driver</h2>
                         <p className="text-gray-600 text-center mb-6">
                             We're finding the best driver for your ride. This may take a few moments.
                         </p>
                    </>
                )}

                <div className="w-full space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                            <i className="ri-map-pin-user-fill text-green-500"></i>
                            <div>
                                <h3 className="text-sm font-medium text-gray-900">Pickup</h3>
                                <p className="text-sm text-gray-600">{ride?.pickup?.address}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                            <i className="ri-map-pin-2-fill text-red-500"></i>
                            <div>
                                <h3 className="text-sm font-medium text-gray-900">Destination</h3>
                                <p className="text-sm text-gray-600">{ride?.destination?.address}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                            <i className="ri-currency-line text-blue-500"></i>
                            <div>
                                <h3 className="text-sm font-medium text-gray-900">Fare</h3>
                                <p className="text-sm text-gray-600">₹{typeof ride?.fare === 'object' ? ride?.fare?.amount : ride?.fare}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full mt-6 space-y-3">
                    <button
                        onClick={onCancel}
                        className="w-full bg-red-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
                    >
                        <i className="ri-close-line mr-2"></i>
                        Cancel Ride
                    </button>
                </div>
            </div>
        </div>
    )
}

export default WaitingForDriver