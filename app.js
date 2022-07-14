var express = require("express");
var bodyParser = require("body-parser");
var app = express();
const path = require('path');
var mqttHandler = require('./mqtt_handler');
const db = require('./database/viana');
const { QueryTypes } = require('sequelize');
require('dotenv').config();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))

global.global_database_connected = false;

app.use(express.static(path.join(__dirname, 'build')))

app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.setHeader('Content-Type', 'application/json');

  res.setHeader("Access-Control-Allow-Headers", "*");
  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  // Pass to next layer of middleware
  next();
});

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
})


app.get("/detections/:page", async (req, res) => {
  const offset = (req.params.page - 1) * 100;

  await db.postgres
    .query(
      `
    SELECT
        sq.lpr_result,
        sq.timestamp_str,
        sq.api_key,
        sq.serial_id,
        sq.track_object,  
        sq.id,
        sq.image_url,
        "createdAt"
    FROM mqtt_detections sq
    WHERE snapshot_generated = true and image_url is not null and type ->> 'name' = 'pullup_window_tool'
    ${
      req.query.lastItemCreatedAt
        ? `and "timestamp_str" < '${req.query.lastItemCreatedAt}'`
        : ""
    }
    ORDER BY "timestamp_str" desc
    LIMIT 100 OFFSET ${offset}
    `,
      {
        raw: true,
        type: QueryTypes.SELECT,
      }
    )
    .then(async (result) => {
      res.status(200).json({
        detections: result,
        message: "Success",
      });
    })
    .catch((err) => {
      console.log("filter err", err);
      res.status(500).json({
        message: err.message,
      });
    });
});

app.get("/detections_filter/:page", async (req, res) => {
  const filters = {
    serial_id: req.query.serial_id || undefined,
    oid: req.query.oid || undefined,
    EDTdate: req.query.EDTdate || undefined,
    playback: req.query.playback || undefined
  };
  const offset = (req.params.page - 1) * 100;
  let debug_mode = req.query.serial_id === 'debug_mode';

  let filters_query = [];
  Object.keys(filters).forEach(d => {
    if (filters[d] && filters[d] !== undefined) {
      if (d === 'serial_id') {
        if (debug_mode) {
          filters_query = [`and (track_object ->> 'is_test') = 'true'`]
        } else {
          filters_query.push(`and ((track_object ->> 'is_test') = 'false' OR (track_object ->> 'is_test') is null)`);
          filters_query.push(`and sq.serial_id = '${filters[d]}'`)
        }  
      } else if (d === 'EDTdate') {
        filters_query.push(`and sq.timestamp_date < '${filters[d]}'`)
      } else if (d === 'oid') {
        filters_query.push(`and sq.oid = '${filters[d]}'`)
      }
    }
  })
  
  await db.postgres
    .query(
      `
      SELECT
        sq.lpr_result,
        sq.timestamp_str,
        sq.api_key,
        sq.serial_id,
        sq.track_object,  
        sq.id,
        sq.image_url,
        "createdAt"
      FROM mqtt_detections sq
      WHERE snapshot_generated = true and image_url is not null and type ->> 'name' = 'pullup_window_tool'
        ${filters_query.join(" ")}
        ${
          req.query.lastItemCreatedAt
            ? `and timestamp_str < ${req.query.lastItemCreatedAt}`
            : ""
        }
        ORDER BY timestamp_str desc
        ${""}
      LIMIT 100 OFFSET ${offset}
      `,
      {
        raw: true,
        type: QueryTypes.SELECT,
      }
    )
    .then(async (result) => {
      res.status(200).json({
        detections: result,
        message: "Success",
      });
    })
    .catch((err) => {
      console.log("filter err", err);
      res.status(500).json({
        message: err.message,
      });
    });
});

app.listen(8080, function () {
  console.log("app running on port ", 8080);
});


exports.app = app;