'use strict';
module.exports = (sequelize, DataTypes) => {
  const snapshot_queues = sequelize.define('snapshot_queues', {
    serial_id: DataTypes.STRING,
    api_key: DataTypes.STRING,
    snapshot_generated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    payload:  {
        type: DataTypes.JSONB,
        allowNull: true
    },
    features: {
        type: DataTypes.JSONB,
        allowNull: true
    },
    feeder_id: {
      type : DataTypes.INTEGER,
      onDelete : 'NO ACTION',
      references : {
          model : 'feeders',
          key : 'id',
          as : 'feeder_id'
      }
    },
    oid: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    track_object: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    timestamp_str: {
      type: DataTypes.STRING,
      allowNull: true
    },
    image_url: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {});
  snapshot_queues.associate = function(models) {
    snapshot_queues.belongsTo(models.feeders, {
      onDelete : "NO ACTION",
      foreignKey : 'feeder_id'
  });
  };
  return snapshot_queues;
};