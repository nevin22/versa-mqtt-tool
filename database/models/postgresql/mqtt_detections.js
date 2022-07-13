'use strict';
module.exports = (sequelize, DataTypes) => {
  const sb_snapshots = sequelize.define('mqtt_detections', {
    serial_id: DataTypes.STRING,
    api_key: DataTypes.STRING,
    snapshot_generated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    track_object: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    timestamp_str: {
      type: DataTypes.STRING,
      allowNull: true
    },
    retry_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    processing: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    image_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    type: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {});

  return sb_snapshots;
};