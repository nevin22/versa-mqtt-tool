module.exports = (sequelize, DataTypes) => {
    let Feeder = sequelize.define('feeders',{
        
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
            autoIncrement: true,
            unique: true
        },
        name : DataTypes.STRING,
        description : DataTypes.STRING,
        date_created: {
            type: DataTypes.DATE,
            defaultValue: sequelize.NOW
        },
        date_updated: {
            type: DataTypes.DATE,
            defaultValue: sequelize.NOW
        },
        sub_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'subscriptions',
                key: 'sub_id'
            }
        },
        device_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'devices',
                key: 'device_id'
            }
        },
        location_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'locations',
                key: 'location_id'
            }
        },
        usecase_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'usecases',
                key: 'usecase_id'
            }
        },
        network_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'networks',
                key: 'network_id'
            }
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        camera:{
            type: DataTypes.JSONB,
            allowNull: true
        },
        points:{
            type: DataTypes.JSONB,
            allowNull: true
        },
        floorplan_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'floorplans',
                key: 'floorplan_id'
            }
        },
        serial_id: {
            type: DataTypes.STRING,
            allowNull: true
        },
        api_key: {
            type: DataTypes.STRING,
            allowNull: true
        },
        status: {
            type: DataTypes.STRING,
            allowNull: true
        },
        certificate: {
            type: DataTypes.STRING,
            allowNull: true
        },
        certificate: {
            type: DataTypes.STRING,
            allowNull: true
        },
        date_paired: {
            type: DataTypes.DATE,
            allowNull: true
        },
        date_unpaired: {
            type: DataTypes.DATE,
            allowNull: true
        },
    },
    {
        tableName: 'feeders',
        timestamps: false
    });

    return Feeder;
}
