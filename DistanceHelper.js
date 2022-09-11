class DistanceHelper {
	constructor(map) {
		this.map = map;
	}

	/**
	 * Get aproximate map size for current zoom.
	 *
	 * Note! This returns smallest dimmesion from width and height.
	 */
	_getMapSize() {
		// calculate
		var bounds = this.map.getBounds();
		var ne = bounds.getNorthEast();
		var sw = bounds.getSouthWest();
		var w = GeoCalc.distanceAproximation(
			ne.lat, ne.lng,
			ne.lat, sw.lng
		);
		var h = GeoCalc.distanceAproximation(
			ne.lat, ne.lng,
			sw.lat, ne.lng
		);
		var size = Math.min(w, h);
		// finalize
		return size;
	};
	
	/**
	 * Get distance relative to map size.
	 */
	getRelativeDistance (distance) {
		var size = _getMapSize();
		return 100 * distance / size;
	};
	
	/**
	 * Calculate distance from the center of the map.
	 * @param {Object} location Current location.
	 * @returns {Number} Distance in meters from center.
	 */
	getDistanceFromCenter (location) {
		var center = this.map.getCenter();
		// location to simple object
		var distance = GeoCalc.distanceAproximation(
			location.coords.latitude, location.coords.longitude,
			center.lat, center.lng
		);
		return distance;
	};
}
