'use strict';

// Academic SOS never accepts device coordinates, even when numerically valid.
function hasLocationFields(body) {
  return ['latitude', 'longitude', 'accuracy'].some((key) =>
    Object.prototype.hasOwnProperty.call(body || {}, key));
}

module.exports = { hasLocationFields };
