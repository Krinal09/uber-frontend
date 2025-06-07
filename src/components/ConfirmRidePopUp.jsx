import React, { useState, useEffect, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { toast } from 'react-hot-toast'
import { SocketContext } from '../context/SocketContext'

const ConfirmRidePopUp = (props) => {
    const [otp, setOtp] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [countdown, setCountdown] = useState(300) // 5 minutes countdown
    const navigate = useNavigate()
    const { socket } = useContext(SocketContext)

    useEffect(() => {
        // Only start countdown if we have a valid ride
        if (props.ride?._id) {
            if (countdown > 0) {
                const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
                return () => clearTimeout(timer)
            } else {
                handleCancel('OTP expired')
            }
        }
    }, [countdown, props.ride])

    const submitHandler = async (e) => {
        e.preventDefault()
        if (!props.ride?._id) {
            toast.error('Invalid ride data')
            return
        }

        if (!otp) {
            toast.error('Please enter the OTP')
            return
        }

        setIsLoading(true)
        try {
            const response = await api.post(`/api/ride/start?rideId=${props.ride._id}&otp=${otp}`)

            if (response.data.success) {
                toast.success('Ride started successfully!')
                props.setConfirmRidePopupPanel(false)
                props.setRidePopupPanel(false)
                
                // Emit ride status update
                // socket.emit('ride:status', {
                //     rideId: props.ride._id,
                //     status: 'in-progress',
                //     data: { 
                //         rideId: props.ride._id,
                //         otp
                //     }
                // })

                navigate('/captain-riding', { state: { ride: response.data.data } })
            } else {
                throw new Error(response.data.message || 'Failed to start ride')
            }
        } catch (error) {
            console.error('Error starting ride:', error)
            toast.error(error.response?.data?.message || 'Failed to start ride. Please try again.')
            setOtp('')
        } finally {
            setIsLoading(false)
        }
    }

    const handleCancel = async (reason = 'Cancelled by captain') => {
        if (!props.ride?._id) {
            toast.error('Invalid ride data')
            return
        }

        try {
            const response = await api.post('/api/ride/cancel', {
                rideId: props.ride._id,
                reason
            })

            if (response.data.success) {
                toast.success('Ride cancelled successfully')
                props.setConfirmRidePopupPanel(false)
                props.setRidePopupPanel(false)
                
                // Emit ride status update
                socket.emit('ride:status', {
                    rideId: props.ride._id,
                    status: 'cancelled',
                    data: { 
                        rideId: props.ride._id,
                        reason
                    }
                })
            } else {
                throw new Error(response.data.message || 'Failed to cancel ride')
            }
        } catch (error) {
            console.error('Error cancelling ride:', error)
            toast.error('Failed to cancel ride. Please try again.')
        }
    }

    // Format countdown time
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // If no ride data, show error
    if (!props.ride) {
        return (
            <div className="flex flex-col h-full items-center justify-center">
                <div className="text-red-600 font-bold text-xl mb-2">
                    Invalid Ride Data
                </div>
                <p className="text-gray-600">
                    Please try again or contact support.
                </p>
                <button
                    onClick={() => props.setConfirmRidePopupPanel(false)}
                    className="mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                    Close
                </button>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Confirm Ride</h2>
                <button
                    onClick={() => handleCancel()}
                    className="text-gray-500 hover:text-gray-700"
                    disabled={isLoading}
                >
                    <i className="ri-close-line text-2xl"></i>
                </button>
            </div>

            {/* OTP Timer */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="text-yellow-800">
                        <i className="ri-time-line mr-2"></i>
                        OTP expires in: {formatTime(countdown)}
                    </div>
                </div>
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
                            <p className="text-sm text-gray-500">2.2 KM away</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                            <i className="ri-map-pin-line mr-1"></i>
                            2.2 KM
                        </span>
                    </div>
                </div>
            </div>

            {/* Ride Details */}
            <div className="flex-1 overflow-y-auto">
                {/* Pickup Location */}
                <div className="mb-6">
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <i className="ri-map-pin-line text-green-600"></i>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-500">Pickup</h3>
                            <p className="text-gray-900">{props.ride?.pickup.address}</p>
                        </div>
                    </div>
                </div>

                {/* Destination Location */}
                <div className="mb-6">
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                            <i className="ri-flag-line text-red-600"></i>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-500">Destination</h3>
                            <p className="text-gray-900">{props.ride?.destination.address}</p>
                        </div>
                    </div>
                </div>

                {/* Ride Information */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <h4 className="text-sm font-medium text-gray-500">Distance</h4>
                            <p className="text-gray-900">{props.ride?.distance} km</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-500">Duration</h4>
                            <p className="text-gray-900">{props.ride?.duration} min</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-500">Fare</h4>
                            <p className="text-900">₹{props.ride?.fare?.amount || '---'} (Cash Payment)</p>
                        </div>
                    </div>
                </div>

                {/* OTP Input */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Enter OTP</h3>
                    <form onSubmit={submitHandler} className="space-y-4">
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="Enter 6-digit OTP"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            maxLength={6}
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            className="w-full px-4 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    Starting Ride...
                                </div>
                            ) : (
                                "Start Ride"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default ConfirmRidePopUp