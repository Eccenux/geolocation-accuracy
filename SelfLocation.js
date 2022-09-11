/**
 * Very simple logger.
 */
 function LOG() {
	var args = Array.prototype.slice.call(arguments); // Make real array from arguments
	args.unshift("[selfLocation] ");
	console.log.apply(console, args);
}
function LOGwarn() {
	var args = Array.prototype.slice.call(arguments); // Make real array from arguments
	args.unshift("[selfLocation] ");
	console.warn.apply(console, args);
}

/**
 * Self/device location testing tool.
 * 
 * Based on a real tool:
 * https://github.com/Eccenux/iitc-plugin-self-location/blob/master/self-location.user.js
 */
class SelfLocation {

	/**
	 * Initial initialization of the plugin.
	 */
	init () {
		this.setupWatch();
		this.setupDraw();
		this.setupContent();
	}

	/**
	 * Preapre map element.
	 *	
	 *	
	 *	Attributes of the element (with example values):
	 *	<li>data-zoom="15"
	 *	<li>data-lat="54.50"
	 *	<li>data-lng="18.00" 
	 *
	 *	Note! Some assumptions for the custom image are:
	 *	<li>It should be a square image.
	 *	<li>It should be SVG or scale nicely to 32x32px.
	 *	<li>It should have the pointy part in the middle of the bottom edge. So a cone like in "V".
	*/
	prepareMap(mapElement) {
		var mapData = {
			lat : mapElement.getAttribute('data-lat'),
			lng : mapElement.getAttribute('data-lng'),
			zoom : mapElement.getAttribute('data-zoom'),
		};

		var map = L.map(mapElement).setView([mapData.lat, mapData.lng], mapData.zoom);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(map);

		return map;
	}

	/**
	 * Location receiver.
	 *
	 * @param {Position} location
	 */
	receiver (location) {
		if (this._centerOnNextLocation) {
			this.centerMap(location);
			this._centerOnNextLocation = false;
		}
		if (this._keepAllLocationsHistory) {
			this._locations.push(location);
		}
		this.updateTrace(location);
		this.addCurrentLocation(location);
	}

	/**
	 * Show location in debug console.
	 * @param {Position} location
	 */
	logLocation (location) {
		console.log('[SelfLocation] '
			+ unixTimeToString(location.timestamp)
			+ `; accuracy [m]: ${location.coords.accuracy}`
			+ `; speed [m/s]: ${location.coords.speed}`
			+ `; location: ${location.coords.latitude}, ${location.coords.longitude}`
		);
	}

	/**
	 * Dump locations (after testing).
	 *
	 * Dumping from console (e.g. FF WebIDE):
	 * copy(plugin.selfLocation.dump());
	 */
	dump () {
		// dump-able locations array
		var locations = this._locations.map(function(location){
			return {
					ll: {
						latitude: location.coords.latitude,
						longitude: location.coords.longitude
					},
					accuracy: location.coords.accuracy,
					speed: location.coords.speed,
					timestamp: location.timestamp
			};
		});

		return JSON.stringify(locations);
	}

	/**
	 * Should location be left as a trace.
	 * 
	 * @param {Position} location
	 * @returns {Boolean} true If location should not be filtered out.
	 */
	shouldAddAsTrace (location) {
		if (location.coords.accuracy > this.config.filter.accuracyMinimum) {
			return false;
		}
		if (location.coords.speed < this.config.filter.speedMinimum) {
			return false;
		}
		return true;
	}

	/**
	 * Shows current location on the map.
	 * @param {Position} location
	 */
	addCurrentLocation (location) {
		// remove previous
		if (this._prevMarker) {
			this._drawLayer.removeLayer(this._prevMarker);
			this._prevMarker = null;
		}
		// add current position marker
		var marker = this.createMarker(location, true);
		this._drawLayer.addLayer(marker);
		// remember added
		this._prevMarker = marker;
	}

	/**
	 * Adds location to future trace and updates trace.
	 *
	 * Note that this only adds previous location so that only one marker is added for current location.
	 *
	 * @param {Position} location
	 */
	updateTrace (location) {
		// add previous location to trace
		if (this._prevLocationToTrace) {
			// add trace marker
			var marker = this.createMarker(this._prevLocationToTrace, false);
			this._drawLayer.addLayer(marker);
			this._prevLocationToTrace = null;
			// remember added
			this._traceMarkers.push(marker);
		}
		// remove old if required
		if (this._traceMarkers.length > this.config.filter.lengthMaximum) {
			var oldMarker = this._traceMarkers.shift();
			this._drawLayer.removeLayer(oldMarker);
		}
		// add as trace later
		if (this.shouldAddAsTrace(location)) {
			this._prevLocationToTrace = location;
		}
	}

	/**
	 * Create position marker.
	 * 
	 * @param {Position} location
	 * @param {Boolean} isCurrent Is the location a current location (determines marker style).
	 * @returns {L.CircleMarker}
	 */
	createMarker (location, isCurrent) {
		var accuracy = location.coords.accuracy;
		var ll = [location.coords.latitude, location.coords.longitude];
		// current
		if (isCurrent) {
			var radius = (accuracy > 50 ? 50 : (accuracy < 5 ? 5 : accuracy)); // in meters
			var fillColor = (PLAYER.team === 'ENLIGHTENED') ? 'green' : 'blue';
		// trace
		} else {
			var radius = 5;
			var fillColor = 'red';
		}
		return L.circleMarker(ll,
			{
				radius: radius,	// in pixels
				weight: 5,
				opacity: isCurrent ? 1 : 0.2,
				color: isCurrent ? 'gold' : 'red',
				fill: true,
				fillColor: fillColor,
				fillOpacity: isCurrent ? 0.2 : 0.1,
				dashArray: null,
				clickable: false
			}
		);
	}

	/**
	 * Setup location watch.
	 * 
	 * @param {Boolean?} userAction If true then re-setup after user action.
	 * @param {Function?} callback Success callback.
	 */
	setupWatch (userAction, callback) {
		var me = this;
		function success(location) {
			me.receiver(location);
			const accuracy = location.coords.accuracy;
			if (accuracy > 200) {
				LOGwarn('Note! Very low accuracy in coordinates: '+ accuracy);
				// brake watch (might be a temporary bug in FF)
				navigator.geolocation.clearWatch(me._watchId);
				me._watchId = null;
			}
			else if (accuracy > 20) {
				LOGwarn('Low accuracy in coordinates: '+ accuracy);
			}
			if (typeof callback == 'function') {
				callback(location.coords);
			}
		}
		function error(err) {
			LOGwarn('location error(' + err.code + '): ' + err.message);
			// brake watch
			navigator.geolocation.clearWatch(me._watchId);
			me._watchId = null;
			if (userAction) {
				// probably Fox fo Android
				if (navigator.userAgent.search(/mobile.+firefox/i)) {
					var info = 'Please make sure location is enabled for the intel page (check lock icon in Firefox). Also check your app permissions.';
				} else {
					var info = 'Please make sure location is enabled for the application and in your system.';
				}
				alert(`Unable to get location (code: ${err.code}). \n\n${info}`);
			}
		}
		// see: https://developer.mozilla.org/en-US/docs/Web/API/PositionOptions
		var options = {
			enableHighAccuracy: true,	// Ingress will probably enfoce it anyway
			//timeout: 5000,
			maximumAge: 0				// we want real position, no cache
		};
		this._watchId = navigator.geolocation.watchPosition(success, error, options);
	}
}

/**
 * Filtered and possibly smoothed out locations.
 *
 * Smoothing is done to avoid showing wrong location.
 * Not using locations with too high accuracy errors.
 * (?) Also doing simple average with previous location to even out bumps. Or maybe just use accuracy.
 *
 * Filtering is done to avoid adding points that don't add too much meaning
 * and might provide too much load on user's browser (and device).
 * So points too close of previous point are not added to the map. (speed close to 0?)
 * Also points that get too far from current postion will be removed. (or maybe filter by time? e.g. ~30min)
 *
 * Note that locations are of type `Position`:
 * https://developer.mozilla.org/en-US/docs/Web/API/Position
 *
 * Most important properties:
 * <li>coords.latitude, coords.longitude -- [decimal degrees] actual position.
 * <li>coords.accuracy -- [meters] strictly positive double representing the accuracy, with a 95% confidence level, of the Coordinates.latitude and Coordinates.longitude properties expressed in meters
 * <li>coords.speed -- [m/s] the velocity of the device (can be null!).
 * <li>timestamp -- [ms] date and time of the creation of the Position.
 */
 SelfLocation.prototype._locations = [];

 /**
  * If true then `_locations` history will be kept intact (until page reload).
  * This should probably only be used for debugging.
  */
 SelfLocation.prototype._keepAllLocationsHistory = true;
 
 /**
  * Array of markers that form the player's trace.
  */
 SelfLocation.prototype._traceMarkers = [];
 
 /**
  * Configuration of location filtering.
  *
  * Filters only apply to polyline.
  *
  * Accuracy experiments:
  * <li>PC at home on FF: 1638. Note! Speed was NaN!
  * <li>Phone at home on FF: 20-25 meters on first measurement. Sometimes above 100 m.
  *	Actual location was really somewhere in that range.
  */
 SelfLocation.prototype.config = {
	 filter : {
		 accuracyMinimum: 30,// [m]
		 speedMinimum: 0.2,	// [m/s] 1 km/h ~= 0.2778 m/s
		 ageMaximum: 60,		// [minutes]
		 lengthMaximum: 200	// max locations quee
	 },
	 goto : {
		 longpress : 1000,	// [ms] how long is a long press (click/tap)
		 minInterval : 20,	// [s] minimum time elapsed when following. Need to be long enough to allow the map to load.
		 minDistance : 5,	// [%] minimum, relative distance (relative to shorter edge of the map)
							 // should be in 0-50% range
		 minZoom : 9,		// things might break around zoom level 7 (too much of the map visible)
		 clickedTimeout : 3000,
		 states : {
			 normal: '⌖',
			 clicked: '⊕',
			 follow: '🎯'
		 }
	 }
 };
 
 /**
  * Location watch ID.
  *
  * To stop watching location use:
  * navigator.geolocation.clearWatch(SelfLocation.prototype._watchId);
  */
 SelfLocation.prototype._watchId = null;
 
 /**
  * Layer for agent's location.
  *
  * @type L.LayerGroup
  */
 SelfLocation.prototype._drawLayer = null;
 