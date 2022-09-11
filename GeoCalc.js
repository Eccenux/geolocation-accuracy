/**
 * Geo calculation library (part of it actually).
 *
 * @author Chris Veness 2002-2012
 * @author Maciej Nux Jaros 2013-2014
 *
 * Licensed under (at ones choosing)
 *   <li>MIT License: http://www.opensource.org/licenses/mit-license
 *   <li>or CC-BY: http://creativecommons.org/licenses/by/3.0/
 */
function GeoCalc() {
}

/**
 * Converts degrees to radians.
 * @param {Number} degrees
 * @returns {Number}
 */
GeoCalc.toRad = function(degrees) {
	return degrees * Math.PI / 180;
};

/**
 * Converts radians to degrees.
 * @param {Number} radians
 * @returns {Number}
 */
GeoCalc.toDeg = function(radians) {
	return radians * 180 / Math.PI;
};

/**
 * Aproximate distance between to points.
 *
 * Note! This is rough estimation designed for speed. See:
 * https://www.movable-type.co.uk/scripts/latlong.html#equirectangular
 *
 * @param {Number} lat1 Float in degrees (same for other params).
 * @param {Number} lon1
 * @param {Number} lat2
 * @param {Number} lon2
 * @returns {Number} Distance in meters.
 */
GeoCalc.distanceAproximation = function(lat1, lon1, lat2, lon2) {
	var R = 6371000;  // radius of the Earth in m

	lat1 = GeoCalc.toRad(lat1);
	lat2 = GeoCalc.toRad(lat2);
	lon1 = GeoCalc.toRad(lon1);
	lon2 = GeoCalc.toRad(lon2);

	var x = (lon2 - lon1) * Math.cos(0.5 * (lat2+lat1));
	var y = lat2 - lat1;
	var d = R * Math.sqrt(x*x + y*y);
	return d;
};