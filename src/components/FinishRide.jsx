import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import { useNavigate } from 'react-router-dom'
import { SocketContext } from '../context/SocketContext'
import { toast } from 'react-hot-toast'

const FinishRide = (props) => {
    const navigate = useNavigate()
    const { socket } = useContext(SocketContext)

    async function endRide() {
        try {
            const response = await api.post('/api/ride/end', {
                rideId: props.ride._id
            })

            if (response.data.success) {
                toast.success('Ride completed successfully')
                navigate('/captain-home')
            } else {
                throw new Error(response.data.message || 'Failed to end ride')
            }
        } catch (error) {
            console.error('Error ending ride:', error)
            toast.error(error.response?.data?.message || 'Failed to end ride. Please try again.')
        }
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold text-gray-900">Finish Ride</h3>
                <button 
                    onClick={() => props.setFinishRidePanel(false)}
                    className="text-gray-400 hover:text-gray-600"
                >
                    <i className="text-2xl ri-close-line"></i>
                </button>
            </div>

            {/* User Info */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <img 
                            className="h-12 w-12 rounded-full object-cover border-2 border-yellow-400"
                            src="https://i.pinimg.com/236x/af/26/28/af26280b0ca305be47df0b799ed1b12b.jpg" 
                            alt="User Profile" 
                        />
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 capitalize">
                                {props.ride?.user.fullname.firstname} {props.ride?.user.fullname.lastname}
                            </h2>
                            <p className="text-sm text-gray-500">Ride Completed</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            <i className="ri-check-line mr-1"></i>
                            Completed
                        </span>
                    </div>
                </div>
            </div>

            {/* Ride Details */}
            <div className="space-y-4 mb-6">
                <div className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                        <i className="text-xl text-indigo-500 ri-map-pin-user-fill"></i>
                    </div>
                    <div>
                        <h3 className="text-base font-medium text-gray-900">Pickup Location</h3>
                        <p className="text-sm text-gray-600 mt-1">{props.ride?.pickup?.address}</p>
                    </div>
                </div>

                <div className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                        <i className="text-xl text-indigo-500 ri-map-pin-2-fill"></i>
                    </div>
                    <div>
                        <h3 className="text-base font-medium text-gray-900">Destination</h3>
                        <p className="text-sm text-gray-600 mt-1">{props.ride?.destination?.address}</p>
                    </div>
                </div>

                <div className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                        <i className="text-xl text-indigo-500 ri-currency-line"></i>
                    </div>
                    <div>
                        <h3 className="text-base font-medium text-gray-900">Fare</h3>
                        <p className="text-sm text-gray-600 mt-1">₹{typeof props.ride?.fare === 'object' ? props.ride?.fare?.amount : props.ride?.fare} (Cash Payment)</p>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
                <button
                    onClick={endRide}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
                >
                    <i className="ri-check-line mr-2"></i>
                    Complete Ride
                </button>

                <button
                    onClick={() => props.setFinishRidePanel(false)}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
                >
                    <i className="ri-close-line mr-2"></i>
                    Cancel
                </button>
            </div>
        </div>
    )
}

export default FinishRide