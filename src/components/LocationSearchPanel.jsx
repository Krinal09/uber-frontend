import React, { useState, useEffect } from 'react';
import debounce from 'lodash/debounce';

const LocationSearchPanel = (props) => {
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = debounce(async (query) => {
    if (!query || query.length < 3) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      props.setSuggestions(data);
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
    } finally {
      setLoading(false);
    }
  }, 300);

  useEffect(() => {
    if (props.searchQuery) {
      fetchSuggestions(props.searchQuery);
    }
  }, [props.searchQuery]);

  const handleSuggestionClick = (suggestion) => {
    if (props.activeField === 'pickup') {
      props.setPickup(suggestion.display_name);
      props.setPickupCoords({
        lat: parseFloat(suggestion.lat),
        lng: parseFloat(suggestion.lon)
      });
    } else {
      props.setDestination(suggestion.display_name);
      props.setDestinationCoords({
        lat: parseFloat(suggestion.lat),
        lng: parseFloat(suggestion.lon)
      });
    }
    props.setPanelOpen(false);
  };

  const formatSuggestion = (suggestion) => {
    if (typeof suggestion === 'string') return suggestion;
    
    const details = suggestion.address_details;
    if (!details) return suggestion.display_name || suggestion.address;

    const parts = [];
    if (details.house_number) parts.push(details.house_number);
    if (details.road) parts.push(details.road);
    if (details.suburb) parts.push(details.suburb);
    if (details.city) parts.push(details.city);
    if (details.state) parts.push(details.state);
    if (details.country) parts.push(details.country);

    return parts.join(', ');
  };

  return (
    <div className='p-3 sm:p-4 max-w-lg mx-auto w-full'>
      {loading ? (
        <div className="p-3 text-gray-500 text-center">
          Loading suggestions...
        </div>
      ) : props.suggestions && props.suggestions.length > 0 ? (
        props.suggestions.map((suggestion, index) => (
          <div
            key={suggestion.place_id || index}
            onClick={() => handleSuggestionClick(suggestion)}
            className='p-3 sm:p-4 border-b-2 cursor-pointer hover:bg-gray-100 text-base sm:text-lg transition flex items-start gap-3'
          >
            <div className="flex-shrink-0 mt-1">
              <i className="ri-map-pin-line text-gray-500 text-xl"></i>
            </div>
            <div className="flex-grow">
              <div className="font-medium">{formatSuggestion(suggestion)}</div>
              <div className="text-sm text-gray-500 mt-1">
                {suggestion.type && suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="p-3 text-gray-500 text-center">
          No suggestions found
        </div>
      )}
    </div>
  );
};

export default LocationSearchPanel;