#!/usr/bin/env node

const tpnFileName = process.argv[2]
const fs = require('fs')
const tpn = fs.readFileSync(`${tpnFileName}`, {
  encoding: 'utf8',
})
const data = tpn.replace(/[\n\r]/g, '').split(';')

const places = [], transitions = [], M0 = [], nets = [];
let output = '', reachability = 'M    ', interpretation = '';

for (const str of data) {
  if (str.search('place') !== -1) {
    const placeDef = str.split(' ')
    M0.push(placeDef.length === 4 ? placeDef[3] / 1 : 0)
    places.push(placeDef[1])
    reachability += `${placeDef[1]} `
  }
  if (str.search('trans') !== -1) {
    const transDef = str.replace(/,/g, '').split(/\s+/)
    const transName = transDef[1]
    const labelIndex = transName.indexOf("~")
    const name = transName.slice(0, labelIndex === -1 ? undefined : labelIndex)
    const label = labelIndex === -1 ? undefined : transName.slice(labelIndex + 1)
    const inIndex = transDef.indexOf('in')
    const outIndex = transDef.indexOf('out')
    const trans = {
      name,
      in: transDef.slice(inIndex + 1, outIndex),
      out: transDef.slice(outIndex + 1)
    }
    transitions.push(trans)
    output += `${name} ... ${label}\n`
  }
}

for (const { in: transIN, out } of transitions) {
  transIN.forEach((p, i) => {
    transIN[i] = places.indexOf(p)
  })
  out.forEach((p, i) => {
    out[i] = places.indexOf(p)
  })
}

reachability += 'Transitions\n'

function addNet(state) {
  const name = 'M' + nets.length
  nets.push({
    name,
    state,
    enabledTrans: [],
    firingTrans: [],
  })
  return name;
}

addNet(M0)

function getCurrentNet() {
  for (const net of nets) {
    if (net.enabledTrans.length) return net
    else if (!net.firingTrans.length) return net
  }
  return nets[nets.length - 1];
}

function isEnabled({ in: transIN, out }, state) {
  let isEnabled = true
  transIN.forEach(index => {
    if (!state[index]) isEnabled = false
  })
  out.forEach(index => {
    if (state[index] && (!transIN.includes(index))) isEnabled = false
  })
  return isEnabled
}

function fire({ name: transName, in: transIN, out }, { state: currentState, firingTrans }) {
  const newState = [...currentState]
  transIN.forEach(index => newState[index] = 0)
  out.forEach(index => newState[index] = 1)
  for (const { name, state } of nets) {
    if (JSON.stringify(state) === JSON.stringify(newState)) {
      if (!firingTrans.some(ele => ele.transName === transName)) firingTrans.push({ transName, stateName: name })
      return;
    }
  }
  const stateName = addNet(newState)
  firingTrans.push({ transName, stateName })
}

for (let i = 1; i < 1000; i++) {
  const net = getCurrentNet()
  const { state, enabledTrans } = net
  if (!enabledTrans.length) {
    for (const trans of transitions) {
      if (isEnabled(trans, state)) enabledTrans.push(trans)
    }
    if (!enabledTrans.length) break;
  }
  let trans = enabledTrans.shift();
  fire(trans, net);
}

let B = 0, isM0Live = false;
const firedTrans = [], finalStates = [];
nets.forEach(({ name, state, firingTrans }, index) => {
  const len = index.toString().length
  reachability += `${name}${len === 1 ? '   ' : len === 2 ? '  ' : ' '}`
  state.forEach((val, i) => {
    if (val > B) B = val
    const len = (i + 1).toString().length
    reachability += `${val}${len === 1 ? '  ' : '   '}`
  })
  if (firingTrans.length) {
    firingTrans.forEach(({ transName, stateName }, i) => {
      if (firedTrans.indexOf(transName) === -1) firedTrans.push(transName)
      if (stateName === 'M0') isM0Live = true
      reachability += `${transName}-${stateName}${i < firingTrans.length - 1 ? ', ' : '\n'}`
    })
  }
  else {
    finalStates.push(name)
    reachability += '\n'
  }
})
const isAllTransFired = (firedTrans.length === transitions.length)

const paths = [], loops = [];
for (const ele of nets[0].firingTrans) {
  let path = [ele]
  paths.push(path)
  function findNextTrans(stateName) {
    const { firingTrans } = nets.find(net => net.name === stateName)
    const currentPath = [...path]
    for (let i in firingTrans) {
      const ele = firingTrans[i]
      const { stateName } = ele
      if (i > 0) {
        path = [...currentPath]
        paths.push(path)
      }
      const index = path.findIndex(val => val.stateName === stateName)
      if (index > -1) {
        path.push(ele);
        loops.push(path.slice(index, path.length - 1))
      }
      else {
        path.push(ele);
        findNextTrans(stateName)
      }
    }
  }
  findNextTrans(ele.stateName);
}

interpretation += 'Final: '
finalStates.length ?
  finalStates.forEach((name, i) => interpretation += `${name}${i < finalStates.length - 1 ? ', ' : '\n'}`)
  : interpretation += 'The process does not end.\n'
interpretation += `Bounded: ${typeof B === 'number' ? B + '-bounded' : 'none'}\n`
interpretation += `Safe: ${typeof B === 'number' ? 'true' : 'false'}\n`
const liveTrans = []
loops.forEach(path =>
  path.forEach(({ transName }) => {
    if (liveTrans.indexOf(transName) === -1) liveTrans.push(transName)
  })
)
const isAllTransLive = (liveTrans.length === transitions.length)

let live = !finalStates.length && isM0Live && isAllTransLive
interpretation += `Live: ${live}\n`

interpretation += `Quasi-live: ${!live && !finalStates.length ? 'true' : 'false'}\n`

const livelocks = []
if (!live && loops.length) {
  loops.forEach(path => {
    let livedock = ''
    path.forEach((ele, i) => {
      livedock += `${ele.stateName}${i < path.length - 1 ? '->' : ''}`
    })
    if (livelocks.indexOf(livedock) === -1) livelocks.push(livedock)
  })
}
interpretation += 'Livelock: '
livelocks.length ?
  livelocks.forEach((ele, index) => interpretation += `${ele}${(index < livelocks.length - 1) ? ', ' : '\n'}`)
  : interpretation += 'empty\n'

output += '\n' + reachability + '\n' + interpretation
console.log(output)
