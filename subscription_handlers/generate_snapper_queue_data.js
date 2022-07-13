const postgres = require('../database/viana');
const { QueryTypes } = require('sequelize');

let generate_snapper_queue_data = async function (topicz, track, cb) {
  let topic = topicz.split("/");
  if (topic[3] === "raw_detections") {
    // verify topic type
    let payloadObject = track;
    if (payloadObject.objects.length !== 0) {
      // verify if data has objects
      for (const object of payloadObject.objects) {
        // proces each object
        let snapshot = {
          serial_id: topic[2],
          payload: track,
          oid: object.oid,
          track_object: object,
          timestamp_str: payloadObject.ts.toString(),
        };

        let feeder_data = await postgres.postgres
          .query(
            `
                  select feeders.id, feeders.name, feeders.api_key, array_remove(array_agg(apps.code), NULL) as apps
                  from feeders
                  left join feeder_apps on feeders.id = feeder_apps.feeder_id
                  left join apps on feeder_apps.app_id = apps.id
                  where feeders.serial_id = '${snapshot.serial_id}' and feeders.is_active = true
                  group by feeders.id;
              `,
            {
              raw: true,
              type: QueryTypes.SELECT,
            }
          )
          .then(async (fd) => {
            return (fd && fd[0]) || null;
          })
          .catch(err => {
            console.log('err', err);
          })
        if (feeder_data) {
          if (feeder_data.apps.length !== 0) {
            snapshot.api_key = feeder_data.api_key;
            snapshot.feeder_id = feeder_data.id;

            let snapshot_with_same_oid_count =
              await postgres.snapshot_queues.count({
                where: { oid: object.oid, serial_id: topic[2] },
              })
              .catch(err => {
                console.log('err', err);
              })
            // process.env.ACCEPTED_CONFIDENCE_RATE
            let verify_if_oid_has_acceptable_confidence_from_genie =
              await postgres.postgres
                .query(
                  `
                      SELECT *
                      FROM snapshot_queues
                      where
                          oid = ${object.oid} and
                          serial_id = '${topic[2]}' and
                          (features->>'confidence')::float >= ${parseFloat(0.86)}
                  `,
                  {
                    raw: true,
                    type: QueryTypes.SELECT,
                  }
                )
                .catch((err) => {
                  console.log("err", err);
                  reject(err.message);
                });
            if (
              verify_if_oid_has_acceptable_confidence_from_genie &&
              verify_if_oid_has_acceptable_confidence_from_genie.length > 0
            ) {
              console.log(`Already generated acceptable data for this oid`);
              cb();
            } else {
              if (snapshot_with_same_oid_count < 3) {
                console.log('snapshot_with_same_oid_count', `oid ${object.oid} ${topic[2]} - `, snapshot_with_same_oid_count)
                await postgres.postgres
                  .query(
                    `
                      INSERT 
                      INTO snapshot_queues (serial_id,payload,oid,track_object,timestamp_str,api_key,feeder_id, "createdAt", "updatedAt")
                      VALUES
                      ('${topic[2]}','${JSON.stringify(track)}'::jsonb,${object.oid},'${JSON.stringify(object)}'::jsonb,'${payloadObject.ts.toString()}','${snapshot.api_key}', '${snapshot.feeder_id}', now(),  now())
                    `,
                    {
                      raw: true,
                      type: QueryTypes.SELECT
                    }
                  )
                  .then((res) => {
                    console.log("Successfully added to queue");
                    cb();
                  })
                  .catch((err) => {
                    console.log("err", err);
                    cb();
                  });
              } else {
                await postgres.postgres
                  .query(
                    `
                        select *
                        from snapshot_queues sq
                        where oid = ${object.oid}
                        and serial_id = '${topic[2]}'
                        and (track_object->>'confidence')::int = (select min(CAST (track_object->>'confidence' AS INTEGER)) from snapshot_queues sq2 where oid = ${object.oid} and serial_id = '${topic[2]}')
                    `,
                    {
                      raw: true,
                      type: QueryTypes.SELECT,
                    }
                  )
                  .then(async (snapshots) => {
                    let dataToCompare = snapshots[0];
                    if (dataToCompare && dataToCompare.track_object) {
                      if (
                        object.confidence >
                        dataToCompare.track_object.confidence
                      ) {
                        // compare confidence of new data vs stored data with lowest confidence
                        await postgres.postgres
                          .query(
                            `
                                update snapshot_queues
                                set 
                                    payload = '${JSON.stringify(
                                      snapshot.payload
                                    )}'::jsonb,
                                    track_object = '${JSON.stringify(
                                      object
                                    )}'::jsonb,
                                    timestamp_str = '${
                                      snapshot.timestamp_str
                                    }',
                                    snapshot_generated = false,
                                    processing = false,
                                    retry_count = 0
                                where id = ${dataToCompare.id}
                            `
                          )
                          .then((res) => {
                            console.log("successfuly updated snapshot");
                            cb();
                          });
                      } else {
                        console.log(`new data confidence is lower than existing data of ${object.oid}`);
                        cb();
                      }
                    } else {
                      console.log(`no data to compare ${object.oid}`);
                      cb();
                    }
                  })
                  .catch((err) => {
                    console.log("err", err);
                    cb();
                  });
              }
            }
          } else {
            console.log(`Sensor does not have apps`);
            cb();    
          }
        } else {
          console.log('no feeder data');
          cb();
        }
      }
    } else {
      console.log(`Objects data is empty`);
      cb();
    }
  } else {
    console.log('Not raw detection');
    cb();
  }
};

module.exports = generate_snapper_queue_data;
