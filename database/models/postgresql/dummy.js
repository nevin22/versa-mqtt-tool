const path = require('path');
const modelName = path.parse(__filename).name;
const tableName = 'dummy'; // change this to match database table name
const timestamps = false;

module.exports = function(sequelize, DataTypes) {
    return sequelize.define(modelName, {
        pk: {
			type: DataTypes.INTEGER,
			allowNull: false,
			primaryKey: true,
			autoIncrement: true
        },
        remarks: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
    }, {
		tableName: tableName,
		timestamps: timestamps // `createdAt` and `updatedAt`
    });
}