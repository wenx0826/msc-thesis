const express = require('express');
const fs = require("fs");
const formidable = require('express-formidable')
const YAML = require('yaml');

const app = express();
const PORT = 12233;

app.get('/', (req, res) => {
  res.send('Log server is listening.');
})

app.post('/log', formidable(), (req, res) => {
  try {
    const notification = JSON.parse(req.fields.notification);
    const {
      instance,
      topic,
      timestamp,
      name,
      content,
    } = notification
    let event = {};
    const {
      label,
      activity,
      activity-uuid
    } = content;
    if (label) event['concept:name'] = label;
    if (activity) {
      event['id:id'] = activity;
      event['cpee:activity'] = activity;
      event['cpee:activity_uuid'] = activity-uuid;
    } else {
      event['id:id'] = 'external';
    }
    event['lifecycle:transition'] = 'unknown';
    event['cpee:lifecycle:transition'] = topic + '/' + name;
    
    switch (topic) {
      case 'activity':
        const {
          endpoint
        } = content;
        event['concept:endpoint'] = endpoint;
        event['lifecycle:transition'] = ['calling'].includes(name) ? 'start' : ['done', 'failed'].includes(name) ?
          'complete' :
          'unknown';
        break;
      case 'dataelements':
        const {
          changed: data_changer,
          values: data_values
        } = content
        event['data'] = {
          data_changer,
          data_values
        }
        break;
      case 'state':
        event['cpee:state'] = content.state;
        break;
    }
    event['time:timestamp'] = timestamp;

    const log = YAML.parse(fs.readFileSync('log.yml', 'utf8')).log;
    if (!log.traces) log.traces = [];
    const traces = log.traces;
    let trace;
    for (const item of traces) {
      if (item['concept:instance'] === instance) {
        trace = item;
        break;
      }
    }
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
    // const events = JSON.parse(fs.readFileSync('events.json', 'utf8'));
    // events.push(notification)
    // fs.writeFileSync('events.json', JSON.stringify(events, null, "  "));
  } catch (e) {
    console.error(e);
  } finally {
    res.end();
  }
});

app.post('/data', formidable(), (req, res) => {
  try {
    const notification = JSON.parse(req.fields.notification)
    const {
      instance,
      content,
    } = notification
    const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
    console.log('data',data)
    let elements
    for (const [key, value] of Object.entries(data)) {
      if (key === instance.toString()) {
        elements = value;
        break;
      }
    }
    console.log('elements',elements)
    if (!elements) {
      elements = {};
      data[instance] = elements;
    }
    for (const [key, value] of Object.entries(content.values)) {
      elements[key] = value
    }
    fs.writeFileSync('data.json', JSON.stringify(data, null, "  "));
  } catch (e) {
    console.error(e);
  } finally {
    res.end();
  }
});

app.listen(PORT, () => console.log("Log server listening on Port", PORT))
