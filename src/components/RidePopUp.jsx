import React, { useState } from 'react';
import { formatDistance, formatDuration } from '../utils/formatters';
import { toast } from 'react-hot-toast';

const RidePopUp = ({ ride, setRidePopupPanel, confirmRide, isLoading }) => {
    const [error, setError] = useState(null);

    if (!ride) return null;

    const handleAccept = async () => {
        try {
            setError(null);
            await confirmRide();
        } catch (error) {
            console.error("Error accepting ride:", error);
            setError(error.message || 'Failed to accept ride. Please try again.');
            toast.error(error.message || 'Failed to accept ride. Please try again.');
        }
    };

    const handleDecline = () => {
        setRidePopupPanel(false);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">New Ride Request</h2>
                <button
                    onClick={handleDecline}
                    className="text-gray-500 hover:text-gray-700"
                    disabled={isLoading}
                >
                    <i className="ri-close-line text-2xl"></i>
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{error}</p>
                </div>
            )}

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
                            <p className="text-gray-900">{ride.pickup?.address || 'Loading...'}</p>
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
                            <p className="text-gray-900">{ride.destination?.address || 'Loading...'}</p>
                        </div>
                    </div>
                </div>

                {/* Ride Information */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <h4 className="text-sm font-medium text-gray-500">Distance</h4>
                            <p className="text-gray-900">{ride.distance ? formatDistance(ride.distance) : '---'}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-500">Duration</h4>
                            <p className="text-gray-900">{ride.duration ? formatDuration(ride.duration) : '---'}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-500">Fare</h4>
                            <p className="text-gray-900">₹{ride.fare?.amount?.toFixed(2) ?? '---'}</p>
                        </div>
                    </div>
                </div>

                {/* User Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Passenger</h3>
                    <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <i className="ri-user-line text-gray-600"></i>
                        </div>
                        <div>
                            <p className="text-gray-900 font-medium">
                                {ride.user?.fullname?.firstname} {ride.user?.fullname?.lastname}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex space-x-4">
                <button
                    onClick={handleDecline}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                >
                    Decline
                </button>
                <button
                    onClick={handleAccept}
                    className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Accepting...
                        </div>
                    ) : (
                        "Accept"
                    )}
                </button>
            </div>
        </div>
    );
};

export default RidePopUp;