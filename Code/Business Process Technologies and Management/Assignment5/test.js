const fs = require("fs");
const YAML = require('yaml');

const findTrace = (traces, instance) => {
  for (const trace of traces) {
    if (trace['concept:instance'] === instance) return trace;
  }
  return undefined;
}

const data = {
  type: 'event',
  topic: 'state',
  event: 'change',
  notification: '{"cpee":"https://cpee.org/flow/engine/","instance-url":"https://cpee.org/flow/engine/64413","instance":64412,"topic":"activity","type":"event","name":"calling","timestamp":"2022-07-30T18:18:13.799+02:00","content":{"activity-uuid":"0ff347bc430fb18d636f7ced679b224e","label":"Collect requirements","activity":"u1","passthrough":null,"endpoint":"https-post://cpee.org/services/timeout-user.php","parameters":{"label":"Collect requirements"},"annotations":null,"attributes":{"uuid":"422aedc8-fea3-4f3a-887e-6947fd55125b","info":"Build a treee house","modeltype":"CPEE","theme":"default","customer":"user","status":"development","creator":"ga94hor","author":"ga94hor","design_stage":"development"}},"instance-uuid":"422aedc8-fea3-4f3a-887e-6947fd55125b","instance-name":"Build a treee house"}'
}

const {
   instance,
   timestamp,
   name
} = JSON.parse(data.notification);
const event = {
   'time:timestamp': timestamp,
   'lifecycle:transition': name,
}
console.log(event)

const events = JSON.parse(fs.readFileSync('events.json', 'utf8'));
const log = YAML.parse(fs.readFileSync('test.yml', 'utf8')).log;
if (!log.traces) log.traces = []
const traces = log.traces

const trace = findTrace(traces, instance);
if (!trace) traces.push({
   'concept:instance': instance,
   events: [event]
})
else trace.events.push(event)
fs.writeFileSync('test.yml', YAML.stringify({log}, 2))
events.push(event)
fs.writeFileSync('events.json', JSON.stringify(events, null, "  "));