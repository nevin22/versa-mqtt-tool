require('dotenv').config();
const fs = require('fs');
const moment = require('moment');
var CERT = fs.readFileSync('./ca.pem');

const mqtt = require('mqtt');
const mqttClient = mqtt.connect(process.env.mqttHost, { clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8), ca: CERT });

const db = require('./database/viana');
const { QueryTypes } = require('sequelize');

const { EventHubProducerClient } = require("@azure/event-hubs");
const AZURE_EVENT_HUB_CONNECTION_STRING = process.env.AZURE_EVENT_HUB_CONNECTION_STRING;
const AZURE_EVENT_HUB_NAME = process.env.AZURE_EVENT_HUB_NAME;
const producer = new EventHubProducerClient(AZURE_EVENT_HUB_CONNECTION_STRING, AZURE_EVENT_HUB_NAME);

let sensors_list = [];

let open = true;

mqttClient.on('connect', () => {
  console.log(`mqtt client connected`);
  db.postgres.query(
    `
      select s.id, s.content ->> 'serial_id' as serial_id, s.content as sensor, sa.content -> 'scene' as scene from sensors s
      inner join samdt sa on s.id = CAST (sa."content" ->> 'feeder_id' AS INTEGER)
      where s."content" ->> 'serial_id' in ('Q2TV-ND7F-9DHJ', 'Q2TV-9PBP-ZFY3', 'Q2MV-RLRY-Q5HY', 'Q2MV-GTGY-PB5D', 'Q2MV-FVHP-5QKB', 'Q2JV-H5GQ-JBM2')
    `,
    {
      raw: true,
      type: QueryTypes.SELECT,
    }
  ).then(async (result) => {
    sensors_list = result;
    // mqttClient.subscribe('/merakimv/Q2TV-ND7F-9DHJ/custom_analytics');
    mqttClient.subscribe('/merakimv/Q2TV-9PBP-ZFY3/custom_analytics');
    // mqttClient.subscribe('/merakimv/Q2MV-RLRY-Q5HY/custom_analytics');
    // mqttClient.subscribe('/merakimv/Q2MV-GTGY-PB5D/custom_analytics');
    // mqttClient.subscribe('/merakimv/Q2MV-FVHP-5QKB/custom_analytics');
    // mqttClient.subscribe('/merakimv/Q2JV-H5GQ-JBM2/custom_analytics');
  })
  .catch((err) => {
    console.log("error fetching sensor details");
  });
})

mqttClient.on('message', async (topic, message) => {
  if (global_database_connected) {
    let mqtt_data = JSON.parse(message.toString());
    if (mqtt_data.outputs.length > 0) {
      let serial_id = topic.split('/')[2];
      let index = sensors_list.map(s => s.serial_id).indexOf(serial_id);
      let sensor_data = sensors_list[index];
  
      let data_to_send = {
        timestamp: mqtt_data.timestamp,
        outputs: mqtt_data.outputs,
        serial_id,
        scene: sensor_data.scene,
        sensor: sensor_data.sensor
      }

      if (open) {
        console.log(`saving detection...`);
        open = false;
        db.mqtt_detections.create({
          serial_id,
          api_key: process.env.API_KEY,
          snapshot_generated: false,
          track_object: data_to_send.outputs,
          timestamp_str: data_to_send.timestamp,
          processing: false,
          timestamp_date: moment(data_to_sent.timestamp),
          type: {
            name: 'pullup_window_tool'
          }
        })
        .then(res => {
          setTimeout(() => {
            open = true
          }, 1)
        })
      }

      // try {
      //   const batch = await producer.createBatch();
      //   batch.tryAdd({ 
      //       body: data_to_send
      //   });
    
      //   await producer.sendBatch(batch);
      //   console.log(`sent topic ${topic}`);
      // } catch (error) {
      //   console.log('error when sending to event hub ', error)
      // }
    }
  }
})

mqttClient.on('close', () => {
  console.log(`mqtt client disconnected`);
  mqttClient.reconnect();
});


mqttClient.on('reconnect', () => {
  console.log(`mqtt client reconnected`);
});

mqttClient.on('error', (err) => {
  console.log('mqtt error ', err);
  mqttClient.reconnect();
});

module.exports = mqttClient;