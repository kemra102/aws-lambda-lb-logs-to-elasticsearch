// Import required modules
const AWS = require('aws-sdk'),
      { Client: Client6 } = require('es6'),
      Grok = require('grok-js').loadDefaultSync(),
      zlib = require('zlib');

const s3Client = new AWS.S3({region: process.env.REGION ? process.env.REGION : process.env.AWS_REGION});
const esClient = new Client6({ node: process.env.ELASTICSEARCH_URL });

const albGrok = '%{NOTSPACE:type} %{TIMESTAMP_ISO8601:timestamp} %{NOTSPACE:elb} %{HOSTPORT:client} %{HOSTPORT:target} %{NUMBER:request_processing_time} %{NUMBER:target_processing_time} %{NUMBER:response_processing_time} %{INT:elb_status_code} %{INT:target_status_code} %{INT:received_bytes} %{INT:sent_bytes} "%{DATA:request}" "%{DATA:user_agent}" %{NOTSPACE:ssl_cipher} %{NOTSPACE:ssl_protocol} %{NOTSPACE:target_group_arn} %{NOTSPACE:trace_id} "%{DATA:domain_name}" "%{DATA:chosen_cert_arn}" %{INT:matched_rule_priority} %{TIMESTAMP_ISO8601:request_creation_time} "%{DATA:actions_executed}" "%{DATA:redirect_url}" %{DATA:error_reason}"'

function getGzipped(stream, callback) {
    // buffer to store the streamed decompression
    var buffer = [];
    
    // pipe the response into the gunzip to decompress
    const gunzip = zlib.createGunzip(); 
    stream.pipe(gunzip)

    gunzip.on('data', (data) => {
        // decompression chunk ready, add it to the buffer
        buffer.push(data.toString())
    }).on("end", () => {
        // response and decompression complete, join the buffer and return
        callback(null, buffer.join(""));
    }).on("error", (e) => {
        callback(e);
    })
}

function formatLogs(logString) {
    const pattern = Grok.createPattern(albGrok);
    var formattedLogs = [];
    logString.split('\n')
             .filter((log) => {
                 return log != '';
             }).map((log) => {
                return pattern.parseSync(log);
             }).map((log) => {
                 formattedLogs.push({
                     index: {}
                 });
                 formattedLogs.push(log);
             });
    return formattedLogs;
}

exports.handler =  async (event, _context) => {
    var stream = s3Client.getObject({
        Bucket: event.Records[0].s3.bucket.name,
        Key: event.Records[0].s3.object.key
    }, (err, _data) => {
        if (err) console.log(err);
    }).createReadStream();

    getGzipped(stream, (err, data) => {
        if (err) {
            console.log(err);
        } else {
            const formattedLogs = formatLogs(data);

            esClient.bulk({
                index: 'access-logs-' + new Date().getFullYear() + '.' + new Date().getMonth() + '.' + new Date().getDate(),
                type: 'access-log',
                body: formattedLogs
            }, (err, _resp) => {
                if (err) console.log(err);
            });
        }
    });
}
