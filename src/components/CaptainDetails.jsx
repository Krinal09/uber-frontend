import React, { useContext } from "react";
import { CaptainContext } from "../context/CaptainContext";

const CaptainDetails = () => {
  const { captain } = useContext(CaptainContext);

  return (
    <div className="space-y-6 text-black px-4 sm:px-6 lg:px-8">
      {/* Profile Section */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                className="h-16 w-16 rounded-full object-cover border-2 border-black"
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdlMd7stpWUCmjpfRjUsQ72xSWikidbgaI1w&s"
                alt="Captain Profile"
              />
              <div className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <h4 className="text-xl font-semibold capitalize">
                {captain.fullname.firstname} {captain.fullname.lastname}
              </h4>
              <p className="text-sm">Online</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <h4 className="text-2xl font-bold">₹295.20</h4>
            <p className="text-sm">Today's Earnings</p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div>
            <div className="flex justify-center mb-2">
              <i className="text-3xl ri-timer-2-line"></i>
            </div>
            <h5 className="text-xl font-semibold">10.2</h5>
            <p className="text-sm">Hours Online</p>
          </div>
          <div>
            <div className="flex justify-center mb-2">
              <i className="text-3xl ri-speed-up-line"></i>
            </div>
            <h5 className="text-xl font-semibold">8.5</h5>
            <p className="text-sm">Avg. Speed</p>
          </div>
          <div>
            <div className="flex justify-center mb-2">
              <i className="text-3xl ri-booklet-line"></i>
            </div>
            <h5 className="text-xl font-semibold">12</h5>
            <p className="text-sm">Total Rides</p>
          </div>
        </div>
      </div>

      {/* Vehicle Info Section */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-lg font-semibold mb-4">Vehicle Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm">Vehicle Type</p>
            <p className="font-medium capitalize">{captain.vehicle.vehicleType}</p>
          </div>
          <div>
            <p className="text-sm">Color</p>
            <p className="font-medium capitalize">{captain.vehicle.color}</p>
          </div>
          <div>
            <p className="text-sm">Plate Number</p>
            <p className="font-medium uppercase">{captain.vehicle.plate}</p>
          </div>
          <div>
            <p className="text-sm">Capacity</p>
            <p className="font-medium">{captain.vehicle.capacity} seats</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaptainDetails;
