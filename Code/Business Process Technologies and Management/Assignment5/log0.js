const express = require('express');
const fs = require("fs");
const formidable = require('express-formidable')
const YAML = require('yaml');

const app = express();
const PORT = 12235;

const findTrace = (traces, instance) => {
  for (const trace of traces) {
    if (trace['concept:instance'] === instance) return trace;
  }
  return undefined;
}

app.post('/log', formidable(), (req, res) => {
  try {
    const data = req.fields;
    const notification = JSON.parse(data.notification)
    const {
      instance,
      topic,
      timestamp,
      name,
      content,
    } = notification

    let event = {};
    if (topic === 'activity') {
      const {
        activity,
        label,
        endpoint
      } = content
      event['concept:name'] = label
      event['concept:endpoint'] = endpoint
      event['id:id'] = activity
      event['lifecycle:transition'] = ['calling'].includes(name) ? 'start' : ['done', 'failed'].includes(name) ?
        'complete' :
        'unknown';
    } else {
      event['id:id'] = 'external'
      event['lifecycle:transition'] = 'unknown'
    } 
    event['cpee:lifecycle:transition'] = topic + '/' + name;
    if (topic === 'state') event['cpee:state'] = content.state;
    event['time:timestamp'] = timestamp
    
    const log = YAML.parse(fs.readFileSync('log.yml', 'utf8')).log;
    const events = JSON.parse(fs.readFileSync('events.json', 'utf8'));
    if (!log.traces) log.traces = [];
    const traces = log.traces;
    const trace = findTrace(traces, instance);
    if (!trace) traces.push({
      'concept:name': notification['instance-name'],
      'concept:instance': instance,
      'cpee:instance_uuid': notification['instance-uuid'],
      'events': [event],
    })
    else trace.events.push(event);
    fs.writeFileSync('log.yml', YAML.stringify({
      log
    }, 2));
    
    events.push(notification)
    fs.writeFileSync('events.json', JSON.stringify(events, null, "  "));
    
  } catch (e) {
    console.error(e);
  } finally {
    res.end();
  }
});

app.listen(PORT, () => console.log("Log server listening on Port", PORT))
