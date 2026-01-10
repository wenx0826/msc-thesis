// build-bpmn.js
//
// Creates BPMN XML from two inputs:
//   - data-pos-matrix.json  (matrix with x/width/type/label and more optional per cell)
//   - data-con-list.json    (list of connections {row,col} → {row,col})
//
// Pipeline:
//   1) parseMatrix    → flat Cell-List (inkl. Typ-Normalisierung & Flags)
//   2) buildLayout    → Shapes with Bounds/Kind/Name (Events/Tasks/Gateways)
//   3) buildFlows     → Flows with Stop-/PassThrough-Compression & Pruning
//   4) waypointsForEdge → rule-based DI-Waypoints
//   5) generateXML    → write BPMN-XML (Process + DI)
//

const G = 45; //vertical offset between lines
const DX = 20; //horizontal reserve for orthogonal edges
const GW_INSET_X = 20; //for diagonal gw approach
const GW_INSET_Y = 40; //for diagonal gw approach
const AXIS = { col1: 145, col2: 280 };
const AXIS_STEP = AXIS.col2 - AXIS.col1;
const COL_MIN_GAP = 12.5; //px gap between neighboring shapes within same row when using dynamic step

// Standard Sizes for BPMN Shapes (w: width, h: height)
const SIZES = {
    start: { w: 30, h: 30 },
    end: { w: 30, h: 30 },
    gateway: { w: 40, h: 40 },
    intermediate: { w: 30, h: 30 },
    taskH: 80, // task height (width from dpm)
};

//Min width for Task and Script
const MIN_TASK_W = 90; //user/service/generic
const MIN_SCRIPT_W = 60; //rawtype = "manipulate"

// Normalizing Raw-Types from dpm
// consistent pattern { type: string, flags?: { dhSuffix?: boolean } }
// Flags used in parseMatrix (cell.flags)
const TYPE_MAP = {
    description: { type: "start" },
    start_event: { type: "start_message" },
    end_event: { type: "end_message" },
    event_end: { type: "end_terminate" },
    terminate: { type: "end_terminate" },
    call: { type: "task_generic" },
    callmanipulate: { type: "task_generic", flags: { dhSuffix: true } }, // (+DH)
    loop_tail: { type: "gateway_exclusive_in" },
    loop_finish: { type: "gateway_exclusive_out" },
    stop: { type: "stop" }, // (just Pass-Through)
    end: { type: "end" },
    parallel_start: { type: "gateway_parallel_in" },
    parallel_simple: { type: "gateway_parallel_out" },
    parallel_complex: { type: "gateway_complex" },
    parallel_eventbased_parallel: { type: "gateway_complex" },
    parallel_branch_event: { type: "event_parallel_branch" },
    loop_head: { type: "gateway_exclusive_in" },
    choose_exclusive: { type: "gateway_exclusive_in" },
    choose_exclusive_finish: { type: "gateway_exclusive_out" },
    alternative: { type: "xor_case_anchor" }, // like otherwise (Anchor), but no Default; Label set as Flow-Name
    otherwise: { type: "xor_default_anchor" } // otherwise is Default-Anchor; Label if available set later as Name of sequenceFlow, unlabeled ⇒ real Default-Flow
};

// Gateways based on general Types
const GATEWAY_TYPES = new Set([
    "gateway_exclusive_in", "gateway_exclusive_out",
    "gateway_parallel_in", "gateway_parallel_out",
    "gateway_complex",
]);
const isGatewayType = (t) => GATEWAY_TYPES.has(t);

//Anchor Types not created as Shapes, relevant for Edge Labeling
const ANCHOR_TYPES = new Set(["xor_default_anchor", "xor_case_anchor"]);
const isAnchorType = (t) => ANCHOR_TYPES.has(t);

// BPMN-Helpers & Subtype-Maps
const TASK_BPMN_KINDS = new Set(["task", "userTask", "serviceTask", "scriptTask", "subProcess"]); //for Layout/Flows/Waypoints
const GATEWAY_BPMN_KINDS = new Set(["exclusiveGateway", "parallelGateway", "complexGateway"]); //for Layout/Flows/Waypoints
const TASK_SUBTYPE_MAP = Object.freeze({ //concrete Bpmn-Tasktype
    user: "userTask",
    service: "serviceTask",
    script: "scriptTask",
});
const EVENT_SUBTYPE_MAP = Object.freeze({
    timer: { kind: "intermediateCatchEvent", def: "timer" },
    message_receive: { kind: "intermediateCatchEvent", def: "message" },
    message_send: { kind: "intermediateThrowEvent", def: "message" }
});

const EVENT_DEFAULT_LABEL = Object.freeze({
    message: "Message",
    timer: "Timer"
});

function isTaskBpmnKind(k) { return TASK_BPMN_KINDS.has(k); }
function isGatewayBpmnKind(k) { return GATEWAY_BPMN_KINDS.has(k); }
function isEventBpmnKind(k) { return k === "intermediateCatchEvent" || k === "intermediateThrowEvent"; }
function isTaskOrEventBpmnKind(k) { return isTaskBpmnKind(k) || isEventBpmnKind(k); }

// Helpers for number format, ID counter, Key-creating, XML-Escaping
const fmt = (n) => Number(n).toFixed(6).replace(/\.?0+$/, "");
const id = (() => { let n = 0; return (p) => `${p}${++n}`; })();
const key = (r, c) => `r:${r},c:${c}`;
// order is relevant (first & -> &amp;) otherwise escaping doesnt work
function xmlEscape(s = "") {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

// Lookup & Event-Definitions
function lookupType(raw) {
    const e = TYPE_MAP[raw];
    return e ? { type: e.type, flags: e.flags || {} } : { type: "task_generic", flags: {} };
}
function xmlEventDef(def) {
    return def === "message" ? "<messageEventDefinition/>" :
		def === "timer" ? "<timerEventDefinition/>" :
		def === "terminate" ? `<terminateEventDefinition id="${id('term')}" />` :
		def === "signal" ? `<signalEventDefinition id="${id('sig')}" />` :
	"";
}

// 1) parseMatrix → flat Cell-List (incl. Typ/Flags/Subtype)
function parseMatrix(matrix) {
    const cells = [];
    matrix.forEach((row, rIdx) => {
        if (!row) return;
        for (let ci = 1; ci < row.length; ci++) {
            const cell = row[ci];
            if (!cell) continue;
            const raw = String(cell.type || "");
            const rawNorm = raw === "startEvent" ? "start_event" : raw === "endEvent" ? "end_event" : raw;
	    const isTechnicalParallelBranch = /^parallel_branch/.test(rawNorm) && rawNorm !== "parallel_branch_event";
            const norm = isTechnicalParallelBranch ? { type: "stop", flags: {} } : lookupType(rawNorm); // "parallel_branch_*" excl parallel_branch_event treated as Stop (placeholder, no Shape)
            cells.push({
                row: rIdx,
                col: `col${ci}`,
                colIndex: ci,
                type: norm.type,
                width: cell.width || null,
                xRaw: cell.x,
                label: (typeof cell.label === "string" ? cell.label : null),
                subtype: (typeof cell.subtype === "string" ? cell.subtype : null),
                rawType: cell.type || "",
                flags: norm.flags,
                fill: (typeof cell.fill === "string" ? cell.fill : null),
            });
        }
    });
    return cells;
}

// 2) Build Layout (Bounds & Shapes)
// only for visible cells
function buildLayout(cells) {
    const shapes = [];
    const byRowCol = new Map(); // Map(key(row,col)) -> shape-objects or "stop"

    // 1) add "stop"-cells as Sentinel in Map (byRowCol), but dont create shape

    cells.forEach((c) => {
        if (c.type === "stop") {
            byRowCol.set(key(c.row, c.col), "stop");
        } else if (isAnchorType(c.type)) {
            byRowCol.set(key(c.row, c.col), {
                anchor: c.type,
                label: (typeof c.label === "string" ? c.label : null),
                xRaw: (typeof c.xRaw === "number" ? c.xRaw : undefined),
                wRaw: (typeof c.width === "number" ? c.width : undefined),
                colIndex: c.colIndex
            }); // preserve Anchor infos incl. raw position (x/width)
        }
    });

    // 2) determine all rows with visible non-stop-type cells
    const rowIndices = Array.from(
        new Set(cells.filter(c => c.type !== "stop" && !isAnchorType(c.type)).map(c => c.row)) //Anchor not created as shape (invisible, no influence on line height, layout)
    ).sort((a, b) => a - b);

    // helper for bounds/bpmn-child/sizes
    const makeBounds = (axisX, width, height, y) => ({
        x: axisX - width / 2,
        y,
        w: width,
        h: height,
    });

    // Height per Kind
    // Start/End (incl. *_message) have fixed height
    // Gw use SIZES.gateway
    // Events (intermediate) get SIZES.intermediate
    // Tasks (SIZES.taskH)
    const KIND_HEIGHT = new Map([
        ["start", SIZES.start.h], ["start_message", SIZES.start.h],
        ["end", SIZES.end.h], ["end_message", SIZES.end.h],
	["event_parallel_branch", SIZES.intermediate.h],
    ]);
    const heightForType = (t) => KIND_HEIGHT.get(t) ?? (isGatewayType(t) ? SIZES.gateway.h : SIZES.taskH);

    // Normalized Type -> BPMN-Node Kind (Start/End/Exclusive/Parallel/Task)
    // Gateway-Detection by prefix (gateway_exclusive*/gateway_parallel*)
    const TYPE_TO_BPMN_KIND = new Map([
        ["start", "startEvent"], ["start_message", "startEvent"],
        ["end", "endEvent"], ["end_message", "endEvent"], ["end_terminate", "endEvent"],
    ]);
    const bpmnKindFor = (t) => TYPE_TO_BPMN_KIND.get(t)
        ?? (t && t.startsWith("gateway_exclusive") ? "exclusiveGateway"
            : t && t.startsWith("gateway_parallel") ? "parallelGateway"
                : t && t.startsWith("gateway_complex") ? "complexGateway"
                    : "task");

    // TASK-Family: Subtype-Mapping
    // Default: serviceTask (no Subtype)
    // Subtypes resolved with TASK_SUBTYPE_MAP ("task/user|service|script")
    function mapTaskKindFromSubtype(subtype, rawType) {
        if (!subtype) {
            if (rawType === "manipulate") return "scriptTask";
            return "serviceTask";
        }
	if (subtype === "marker/subprocess") return "subProcess";
        if (subtype.startsWith("task/")) {
            const part = subtype.split("/")[1];
            return TASK_SUBTYPE_MAP[part] || "serviceTask";
        }
        if (rawType === "manipulate") return "scriptTask";
        return "serviceTask";
    }

    // EVENT-Family: "event/*" → intermediate Event with definition (message/timer)
    // other Subtypes (non event/*) ignored and directed to TASK-Family
    function eventInfoFromSubtype(subtype) {
        if (!subtype || !subtype.startsWith("event/")) return null;
        const parts = subtype.split("/");
        const cat = parts[1] || "";
	const dir = parts[2] || "";

	const key = dir ? `${cat}_${dir}` : cat;
	const base = EVENT_SUBTYPE_MAP[key] || EVENT_SUBTYPE_MAP[cat];
   	if (base) return base;

	//default return generic intermediateCatchEvent
	return { kind: "intermediateCatchEvent", def: undefined };
    }

    // Fallback-Label for each column (O(1) counter) + decorateLabel
    const colTaskCount = new Map();
    const nextTaskLabel = (col) => { //creates "Call n" per column
    const n = (colTaskCount.get(col) || 0) + 1; colTaskCount.set(col, n); return `Call ${n}`;
    };
    const colScriptCount = new Map();
    const nextScriptLabel = (col) => {
        const n = (colScriptCount.get(col) || 0) + 1; colScriptCount.set(col, n); return `Script ${n}`;
    };

    // helpers for suffix
    const decorateLabel = (name, flags) => (flags && flags.dhSuffix) ? (name + " (+DH)") : name;

    function baseLabelForCell(cell, evInfo) {
        if (evInfo) {
            // Intermediate Event: explicit label preferred, else subtype default
            const lbl = (cell.label && String(cell.label).trim().length) ? cell.label : null;
            return lbl || (EVENT_DEFAULT_LABEL[evInfo.def] || "Event");
        }
        // Task family (incl. call/callmanipulate/manipulate)
        if (cell.label && String(cell.label).trim().length) return cell.label;
        return (cell.rawType === "manipulate") ? nextScriptLabel(cell.col) : nextTaskLabel(cell.col);
    }

    // Start y-cursor for first row
    let yCursor = 50;

	  for (const r of rowIndices) {
        // all visible cells of row r (without stop-type), ordered left to right
        const rowCells = cells
            .filter(c => c.row === r && c.type !== "stop" && !isAnchorType(c.type))
            .sort((a, b) => a.colIndex - b.colIndex);

        if (rowCells.length === 0) continue;

        // Compute dynamic column step for THIS row so that neighbors do not overlap
        const estWidthForCell = (c) => {
            if (c.type === "start" || c.type === "start_message") return SIZES.start.w;
            if (c.type === "end" || c.type === "end_message" || c.type === "end_terminate") return SIZES.end.w;
            if (isGatewayType(c.type)) return SIZES.gateway.w;
            const evTmp = eventInfoFromSubtype(c.subtype);
            if (evTmp) return SIZES.intermediate.w;
            // Task family (incl. call/callmanipulate/manipulate)
            const minW = (c.rawType === "manipulate") ? MIN_SCRIPT_W : MIN_TASK_W;
            const requestedW = (typeof c.width === "number") ? c.width : minW;
            return Math.max(minW, requestedW);
        };
        const widths = rowCells.map(estWidthForCell);
        let rowStep = AXIS_STEP;
        for (let k = 0; k < widths.length - 1; k++) {
            const required = Math.ceil(widths[k] / 2 + widths[k + 1] / 2 + COL_MIN_GAP);
            if (required > rowStep) rowStep = required;
        }
        const axisXForColIndexInRow = (ci) => AXIS.col1 + (ci - 1) * rowStep;

        // row height = max(height of all shapes in that row)
        const rowH = Math.max(...rowCells.map(c => heightForType(c.type)));

        // Row-Geometrie an in dieser Zeile liegende Anchor-Objekte anheften (für Label-Platzierung)
        for (const [K, V] of byRowCol.entries()) {
            if (!V || V === "stop" || !V.anchor) continue;
            const m = /r:(\d+),c:col(\d+)/.exec(K);
            if (!m) continue;
            const rKey = Number(m[1]);
            if (rKey !== r) continue;
            V.rowY = yCursor;
            V.rowH = rowH;
        }

        for (const cell of rowCells) {
            const axisX = axisXForColIndexInRow(cell.colIndex);
            let width, bpmnType, label;

            if (cell.type === "start" || cell.type === "start_message") {
                width = SIZES.start.w;
                bpmnType = bpmnKindFor(cell.type);
                const b = makeBounds(axisX, width, SIZES.start.h, yCursor);
                const evDef = (cell.type === "start_message") ? "Start Message" : undefined;
                pushShapeGeneric(
                    cell, bpmnType, b, cell.label,
                    { ...(evDef ? { eventDef: evDef } : {}), fill: cell.fill }
                );
            } else if (cell.type === "end" || cell.type === "end_message" || cell.type === "end_terminate") {
                width = SIZES.end.w;
                bpmnType = bpmnKindFor(cell.type);
                const b = makeBounds(axisX, width, SIZES.end.h, yCursor);
                const evDef = (cell.type === "end_message") ? "message" : (cell.type === "end_terminate" ? "terminate" : undefined);
                const nameForEnd = (cell.label && String(cell.label).trim())
                    ? cell.label
                    : (cell.type === "end_message" ? "End Message" : (cell.type === "end_terminate" ? "End Terminate" : "End"));
                pushShapeGeneric(
                    cell, bpmnType, b, nameForEnd,
                    { ...(evDef ? { eventDef: evDef } : {}), fill: cell.fill }
                );
            } else if (isGatewayType(cell.type)) {
                width = SIZES.gateway.w;
                bpmnType = bpmnKindFor(cell.type);
                const b = makeBounds(axisX, width, SIZES.gateway.h, yCursor);
                pushShapeGeneric(cell, bpmnType, b, cell.label || undefined, { fill: cell.fill });
            } else if (cell.type === "event_parallel_branch") {
	        const width = SIZES.intermediate.w;
                const b = makeBounds(axisX, width, SIZES.intermediate.h, yCursor);
		const name = "Parallel Branch Event";
	        pushShapeGeneric(cell, "intermediateThrowEvent", b, name, { eventDef: "signal", fill: cell.fill });
	    } else {
                // Decide between EVENT-family and TASK-family using `subtype`
                const ev = eventInfoFromSubtype(cell.subtype);
                if (ev) {
                    // --- EVENT family: intermediate catch events (message/timer/…)
                    const b = makeBounds(axisX, SIZES.intermediate.w, SIZES.intermediate.h, yCursor);
                    const name = decorateLabel(baseLabelForCell(cell, ev), cell.flags);
                    pushShapeGeneric(cell, ev.kind, b, name, { eventDef: ev.def, fill: cell.fill });
                } else {
                    // --- TASK family: user/service/script/generic
                    const concreteTaskKind = mapTaskKindFromSubtype(cell.subtype, cell.rawType);
                    const minW = (cell.rawType === "manipulate") ? MIN_SCRIPT_W : MIN_TASK_W;
                    const requestedW = (typeof cell.width === "number") ? cell.width : minW;
                    const w = Math.max(minW, requestedW);
                    const b = makeBounds(axisX, w, SIZES.taskH, yCursor);
                    const name = decorateLabel(baseLabelForCell(cell, null), cell.flags);
                    pushShapeGeneric(cell, concreteTaskKind, b, name, { fill: cell.fill });
                }
            }
        }

        // increase y-cursor for next row
        yCursor += rowH + G;
    }

    return { shapes, byRowCol };

    // helper: build and identify shape-objects
 function pushShapeGeneric(cell, bpmnType, bounds, label, extra) {
        const shapeId = id(
            bpmnType === "startEvent"
                ? "start"
                : bpmnType === "endEvent"
                    ? "end"
                    : (bpmnType === "exclusiveGateway" || bpmnType === "parallelGateway" || bpmnType === "complexGateway") //damit die richtigen IDs für Gateways
                        ? "gw"
                        : "t"
        );
        const el = {
            id: shapeId,
            row: cell.row,
            col: cell.col,
            kind: bpmnType,
	    _rawName: (label != null) ? String(label) : undefined,
            name: (label != null) ? xmlEscape(label) : label,
            ...bounds,
            axisX: bounds.x + bounds.w / 2,
            ...(extra || {}),
        };
        shapes.push(el);
        byRowCol.set(key(cell.row, cell.col), el);
        return el;
    }
}


// remove identical from/to-Edges (r|c → r|c)
function dedupeEdgeList(list) {
    const seen = new Set();
    const out = [];
    for (const e of list || []) {
        if (!e || !e.from || !e.to) continue;
        const k = `${e.from.row}|${e.from.col}->${e.to.row}|${e.to.col}`;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(e);
    }
    return out;
}

// 3) buildFlows (incl. Stop-/PassThrough-Compression and Pruning)
function buildFlows(conList, byRowCol, shapes) {
    // k(r,c) -> Map-Key "r:x,c:colN" (c is number)
    // Preprocessing
    const conListDeduped = dedupeEdgeList(conList);
    let conListFiltered = pruneVerticalGatewayToGatewayShortcuts(conListDeduped, byRowCol); // Pruning 2

    //Important for subprocess signal start shape not available in dpm
    (function setVirtualStartEventForSequenceFlowWithoutRealSrc() {
	    const created = new Set(); //save all created Keys
	    const axisXForColIndex = (colIndex) => AXIS.col1 + (colIndex - 1) * AXIS_STEP;
	    function yForRow(row) { //get Y-position of other shapes in same row
		    for (const V of byRowCol.values()) {
			    if (!V || V === "stop" || V.anchor) continue;
			    if (V.row === row) {
				    return V.y;
			    }
		    }
		    return 50; //default Y-value
	    }
	    for (const edge of conListFiltered) {
		    if(!edge || !edge.from) continue;
		    const rowFrom = edge.from.row;
		    const colFrom = edge.from.col;
		    if(!Number.isFinite(rowFrom) || !Number.isFinite(colFrom)) continue;
		    const srcKey = key(rowFrom, `col${colFrom}`);
		    //only continue if there is not already a shape at this position
		    if(byRowCol.has(srcKey)) continue;
	  	    if(created.has(srcKey)) continue;
	 	    created.add(srcKey);
		const axisX = axisXForColIndex(colFrom);
		const y = yForRow(rowFrom);
		const w = SIZES.start.w;
		const h = SIZES.start.h;
		const x = axisX - w / 2;
		const shape = {
			id: id("start"),
			row: rowFrom,
			col: `col${colFrom}`,
			kind: "startEvent",
			_rawName: "Signal Start",
			name: "Signal Start",
			x,
			y,
			w,
			h,
			axisX,
			eventDef: "signal", //to get signalEventDefinition
			fill: null
		};
		shapes.push(shape);
		    byRowCol.set(srcKey, shape);
	    }
    })();


    const k = (r, c) => key(r, `col${c}`);
    const out = new Map(), inc = new Map(); // Adjacency Lists forward/backward
    const ins = (m, kk, v) => m.set(kk, (m.get(kk) || []).concat([v]));

    // 1) sort raw edges in Maps
    conListFiltered.forEach(({ from, to }) => {
        const Kf = k(from.row, from.col);
        const Kt = k(to.row, to.col);
        ins(out, Kf, Kt);
        ins(inc, Kt, Kf);
    });

    //Inject direct default edges for `otherwise` anchors without label
    (function injectDefaultShortcuts() {
        const parseKey = (K) => {
            const m = /r:(\d+),c:col(\d+)/.exec(K);
            return m ? { row: Number(m[1]), col: Number(m[2]) } : null;
        };
        const extra = [];
        for (const [K, V] of byRowCol.entries()) {
            if (!V || V === "stop") continue;
            if (V.anchor === "xor_default_anchor") {
                const lbl = (V.label && String(V.label).trim()) || "";
                if (lbl === "") {
                    const preds = inc.get(K) || [];
                    const succs = out.get(K) || [];
                    if (preds.length && succs.length) {
                        for (const p of preds) {
                            for (const s of succs) {
                                const F = parseKey(p);
                                const T = parseKey(s);
                                if (F && T) extra.push({ from: F, to: T });
                            }
                        }
                    }
                }
            }
        }
        if (extra.length) {
            // Merge and dedupe to avoid inflating the edge list
            conListFiltered = dedupeEdgeList(conListFiltered.concat(extra));
        }
    })();

    //anchors treated as pass-through
	const isStopOrPassThrough = (K, dir) => {
        const v = byRowCol.get(K);
        if (v === "stop" || (v && v.anchor)) return true;
        if (!v) {
            if (dir === "fwd") return (out.get(K) || []).length === 1;
            if (dir === "bwd") return (inc.get(K) || []).length === 1;
        }
        return false;
    };

    const resolveForward = (K0) => {
        let cur = K0, seen = new Set();
        while (isStopOrPassThrough(cur, "fwd")) {
            if (seen.has(cur)) break; seen.add(cur);
            const outs = (out.get(cur) || []);
            if (outs.length !== 1) break;
            cur = outs[0];
        }
        return cur;
    };

    const resolveBackward = (K0) => {
        let cur = K0, seen = new Set();
        while (isStopOrPassThrough(cur, "bwd")) {
            if (seen.has(cur)) break; seen.add(cur);
            const insArr = (inc.get(cur) || []);
            if (insArr.length !== 1) break;
            cur = insArr[0];
        }
        return cur;
    };

	//create visible Edges
    const uniq = new Set(), flows = [];
    conListFiltered.forEach(({ from, to }) => {
        let KF = k(from.row, from.col);
        let KT = k(to.row, to.col);
        // resolve stop/PassThrough-Chains
        KF = resolveBackward(KF);
        KT = resolveForward(KT);
        let src = byRowCol.get(KF);
        let dst = byRowCol.get(KT);
        if (!src || !dst || src === "stop" || dst === "stop" || src.anchor || dst.anchor) return; //skip anchors and stop

        // Cross-column: dst is gateway if in column
        const colIdxOf = (s) => Number(String(s.col).replace("col", ""));
        const findGatewayOnColumnBetween = (colIdx, rA, rB) => {
            const lo = Math.min(rA, rB), hi = Math.max(rA, rB);
            for (let r = lo; r <= hi; r++) {
                const g = byRowCol.get(key(r, `col${colIdx}`));
                if (g && isGatewayBpmnKind(g.kind)) return g;
            }
            return null;
        };

        const ciS = colIdxOf(src), ciD = colIdxOf(dst);
        if (ciS !== ciD) {
            if (ciS < ciD) {
                const g = findGatewayOnColumnBetween(ciS, src.row, dst.row);
                if (g) src = g; // Diverging -> src is Gw
            } else {
                const g = findGatewayOnColumnBetween(ciD, src.row, dst.row);
                if (g) dst = g; // Converging -> dst is Gw
            }
        }

        const sig = `${src.id}->${dst.id}`;
        if (uniq.has(sig)) return;
        uniq.add(sig);
        flows.push({ src, dst });
    });

    // 3b) Remove flows of tasks that skip gw-paths
    function pruneTaskEdgesThatBypassGateway(flowsArr) {
        const isGwShape = (s) => s && isGatewayBpmnKind(s.kind);
        const isTask = (s) => s && isTaskBpmnKind(s.kind);
        const outById = new Map();
        for (const f of flowsArr) {
            if (!outById.has(f.src.id)) outById.set(f.src.id, []);
            outById.get(f.src.id).push(f.dst);
        }
        function reachable(startId, targetId) {
            if (startId === targetId) return false;
            const q = [startId];
            const seen = new Set([startId]);
            while (q.length) {
                const v = q.shift();
                const outs = outById.get(v) || [];
                for (const n of outs) {
                    if (n.id === targetId) return true;
                    if (!seen.has(n.id)) { seen.add(n.id); q.push(n.id); }
                }
            }
            return false;
        }
        return flowsArr.filter((f) => {
            if (isGwShape(f.dst)) return true;
            if (!isTask(f.src)) return true;
            const outs = outById.get(f.src.id) || [];
            for (const mid of outs) {
                if (!isGwShape(mid)) continue;
                if (reachable(mid.id, f.dst.id)) {
                    return false;
                }
            }
            return true;
        });
    }

    const flowsNoGwBypass = pruneTaskEdgesThatBypassGateway(flows);

    // Preserve Set for real Default Edges (unlabeled otherwise Flows)
    const preserveDefaultGwPairs = new Set();
    (function markDefaultGwPairs() {
        const isUnlabeledDefault = (V) =>
            V && V.anchor === "xor_default_anchor" && !((V.label && String(V.label).trim()));
        for (const [K, V] of byRowCol.entries()) {
            if (!isUnlabeledDefault(V)) continue;
            const preds = inc.get(K) || [];
            const succs = out.get(K) || [];
            for (const p of preds) {
                for (const s of succs) {
                    const pR = resolveBackward(p);
                    const sR = resolveForward(s);
                    const src = byRowCol.get(pR);
                    const dst = byRowCol.get(sR);
                    if (!src || !dst || src === "stop" || dst === "stop" || src.anchor || dst.anchor) continue;
                    if (isGatewayBpmnKind(src.kind) && isGatewayBpmnKind(dst.kind)) {
                        preserveDefaultGwPairs.add(`${src.id}->${dst.id}`);
                    }
                }
            }
        }
    })();

    // Pruning 3: remove direct Gw→Gw edge, if exists 2-Hop-Path via Non-Gw
    const isGwShape = (s) => s && isGatewayBpmnKind(s.kind);
    const outById = new Map();
    for (const f of flowsNoGwBypass) {
        if (!outById.has(f.src.id)) outById.set(f.src.id, []);
        outById.get(f.src.id).push(f.dst);
    }
    const filtered = flowsNoGwBypass.filter((f) => {
        // preserve direct gw→gw-Edge, if it is unlabeled-otherwise default
        if (isGwShape(f.src) && isGwShape(f.dst)) {
            const sig = `${f.src.id}->${f.dst.id}`;
            if (preserveDefaultGwPairs.has(sig)) return true;
        }
        if (!isGwShape(f.src) || !isGwShape(f.dst)) return true;
        const mids = outById.get(f.src.id) || [];
        for (const m of mids) {
            if (m.id === f.dst.id) continue;
            if (!isGwShape(m)) {
                const mOut = outById.get(m.id) || [];
                if (mOut.some((n) => n.id === f.dst.id)) return false;
            }
        }
        return true;
    });

    // Anchor-Processing: use Label/Default of XOR-Anchor (alternative/otherwise) for outgoing edge of exclusiveGw
    const Key_of_Shape = (s) => key(s.row, s.col);
    for (const f of filtered) {
        if (f.src && f.src.kind === "exclusiveGateway") {
            const kSrc = Key_of_Shape(f.src);
            const kDst = Key_of_Shape(f.dst);
            const outFromSrc = out.get(kSrc) || [];
            for (const outK of outFromSrc) {
                const a = byRowCol.get(outK);
                if (a && (a.anchor === "xor_default_anchor" || a.anchor === "xor_case_anchor")) {
                    const resolvedDst = resolveForward(outK);
                    if (resolvedDst === kDst) {
                        const label = (a.label && String(a.label).trim()) || "";
                        if (a.anchor === "xor_case_anchor") {
                            // "alternative": Label (if available) as Name, no Default
                            if (label) f.name = label;
                        } else {
                            // "otherwise": with label → name; no Label → real Default-Flow
                            if (label) {
                                f.name = label;
                            } else {
                                f.isDefault = true;
                            }
                        }
                        // add raw label position of anchor if available
                        if (label && (typeof a.xRaw === "number" || typeof a.wRaw === "number")) {
                            f._labelFromAnchor = {
                                x: a.xRaw,
                                w: a.wRaw,
                                rowY: a.rowY,
                                rowH: a.rowH,
                                colIndex: a.colIndex // same as for calls
                            };
                        }
                        break;
                    }
                }
            }
        }
    }

    // check for invisible nodes between two lines outside given column
    function hasVisibleBetweenRowsOutsideColumn(byRowCol, excludedColNumber, rowFrom, rowTo) {
        for (const [K, V] of byRowCol.entries()) {
            if (!V || V === "stop") continue;
            const m = /r:(\d+),c:col(\d+)/.exec(K);
            if (!m) continue;
            const r = Number(m[1]);
            const c = Number(m[2]);
            if (r > rowFrom && r < rowTo && c !== excludedColNumber) return true;
        }
        return false;
    }

    // Prune: remove vertical Parallel-Gw->Gw-Shortcuts in same column, if in between a real visible shape in different column
    function pruneVerticalGatewayToGatewayShortcuts(conList, byRowCol) {
        const isParGw = (v) => v && v.kind === "parallelGateway";
        return conList.filter(({ from, to }) => {
            const src = byRowCol.get(key(from.row, `col${from.col}`));
            const dst = byRowCol.get(key(to.row, `col${to.col}`));
            if (!(isParGw(src) && isParGw(dst))) return true;
            if (from.col !== to.col) return true;
            const lo = Math.min(from.row, to.row);
            const hi = Math.max(from.row, to.row);
            if (hasVisibleBetweenRowsOutsideColumn(byRowCol, from.col, lo, hi)) {
                return false;
            }
            return true;
        });
    }

    //add GatewayRoles (opening/closing) based on incoming/outgoing edges for edge routing
    (function annotateGatewayRoles() {
        const inCount = new Map();
        const outCount = new Map();
        for (const f of filtered) {
            outCount.set(f.src.id, (outCount.get(f.src.id) || 0) + 1)
            inCount.set(f.dst.id, (inCount.get(f.dst.id) || 0) + 1);
        }
        //annotate roles
        for (const [K, V] of byRowCol.entries()) {
                if (!V || V === "stop" || V.anchor) continue; //skip invisible nodes
		if (isGatewayBpmnKind(V.kind)) {
                V._in = inCount.get(V.id) || 0;
                V._out = outCount.get(V.id) || 0;
                V._gwRole =
                    (V._out > 1 && V._out >= V._in) ? "opening" :
                        (V._in > 1 && V._in >= V._out) ? "closing" :
                            null;
            }
        }
    }());
    return filtered;
}

// 4) Waypoints (DI):
function waypointsForEdge(src, dst) {

    if (!src || !dst ||
        !Number.isFinite(src.x) || !Number.isFinite(src.y) || !Number.isFinite(src.w) || !Number.isFinite(src.h) ||
        !Number.isFinite(dst.x) || !Number.isFinite(dst.y) || !Number.isFinite(dst.w) || !Number.isFinite(dst.h)) {
        return [];
    }
    const pts = [];

    const colIdx = (s) => Number(String(s.col).replace("col", ""));
    const i = colIdx(src);
    const j = colIdx(dst);

    const srcMidX = src.axisX;
    const srcBottom = src.y + src.h;
    const srcMidY = src.y + src.h / 2;
    const srcLeft = src.x;
    const srcRight = src.x + src.w;

    const dstMidX = dst.axisX;
    const dstTop = dst.y;
    const dstMidY = dst.y + dst.h / 2;
    const dstLeft = dst.x;
    const dstRight = dst.x + dst.w;

    // Gateway and Task Logic
    const srcIsGw = isGatewayBpmnKind(src.kind);
    const dstIsGw = isGatewayBpmnKind(dst.kind);
    const srcIsClosingGw = srcIsGw && src._gwRole === "closing";
    const dstIsOpeningGw = dstIsGw && dst._gwRole === "opening";
    const dstIsClosingGw = dstIsGw && dst._gwRole === "closing";
    const dstIsEndEvent = dst.kind === "endEvent";
    const srcIsEventOrTask = isTaskOrEventBpmnKind(src.kind);
    const dstIsEventOrTask = isTaskOrEventBpmnKind(dst.kind);

    // Tasks/Events/Gws seen as "Tasks",
    let srcIsTask = srcIsEventOrTask || srcIsClosingGw;
    let dstIsTask = dstIsEventOrTask || dstIsGw || dstIsEndEvent;

    const dstIsComplexGateway = dstIsGw && dst.kind === "complexGateway";
    if (dstIsComplexGateway) {
        // Complex Gateway as target: keep bottom-start at source for clearance
        srcIsTask = true;
    }

    if (srcIsTask && dstIsClosingGw) {
        dstIsTask = false;
    }

    // ClosingGw → OpeningGw (different IDs) => dst sideways (Gateway-Logic)
    if (srcIsClosingGw && dstIsOpeningGw && src.id !== dst.id) {
        dstIsTask = false;
    }

    // ClosingGw → Task/Event => src sideways (Gateway-Logic)
    if (srcIsClosingGw && dstIsEventOrTask) {
        srcIsTask = false;
    }

    // Same column:
    // Default: straight vertical segment bottom(src) → top(dst)
    // maybe bring back vertical JOG for Gw -> Gw in same clumn
    if (i === j){
	    pts.push({ x: srcMidX, y: srcBottom});
	    pts.push({ x: dstMidX, y: dstTop });
	    return pts;
    }

    // Cross-column upward into a Gateway
    // first horizontal to xApproach
    // then vertical up to yNearCenter
    // finally short diagonal into the center of the destination gateway
    // Waypoint counts (without counting the implicit src/dst points):
    // for src Task/Event (or closing-GW treated task-like): 3
    // for src Gateway (side exit): 2
    if (isGatewayBpmnKind(dst.kind) && (i !== j) && (srcMidY > dstMidY)) {
        const moveRight = i < j; // src column left of dst column
        const xApproach = moveRight ? (dstMidX - GW_INSET_X) : (dstMidX + GW_INSET_X);
        const yNearCenter = dstMidY + GW_INSET_Y; //y increases down

        if (isTaskOrEventBpmnKind(src.kind) || (isGatewayBpmnKind(src.kind) && src._gwRole === "closing")) {
            // bottom out, then horizontal to xApproach, then vertical to yNearCenter
            const yClear = srcBottom + DX;
            pts.push({ x: srcMidX, y: srcBottom });
            pts.push({ x: srcMidX, y: yClear });
            pts.push({ x: xApproach, y: yClear });
            pts.push({ x: xApproach, y: yNearCenter });
        } else {
            // Gw src
            if (moveRight) {
                pts.push({ x: srcRight, y: srcMidY });
            } else {
                pts.push({ x: srcLeft, y: srcMidY });
            }
            pts.push({ x: xApproach, y: srcMidY });
            pts.push({ x: xApproach, y: yNearCenter });
        }
        // Short diagonal into the mid center of the destination gateway
        pts.push({ x: dstMidX, y: dstMidY });
        return pts;
    }

    //Cross-column downward with dst is opening exclusive Gw
	//src is Task Event and srcMidY < dstMidY (going downward)
    if(isGatewayBpmnKind(dst.kind) && dst.kind === "exclusiveGateway" &&
	    dstIsOpeningGw && (i !== j) && srcIsTask && srcMidY < dstMidY) {
	    const moveRight = i < j;
	    const xApproach = moveRight ? (dstMidX - GW_INSET_X) : (dstMidX + GW_INSET_X);
	    const yClear = srcBottom + DX; //for Task like Exit
	    pts.push({ x: srcMidX, y: srcBottom });
	    pts.push({ x: srcMidX, y: yClear });
	    pts.push({ x: xApproach, y: yClear });
	    pts.push({ x: dstMidX, y: dstMidY });
	    return pts; }
    if (srcIsTask) {
        // Exit from bottom center of the source (task-like) for clearance
        const yClear = srcBottom + DX;
        pts.push({ x: srcMidX, y: srcBottom });
        pts.push({ x: srcMidX, y: yClear });

        // Destination handling
        const dstIsGateway = dstIsGw;
        const dstNeedsGwSide = dstIsGateway && (
            dstIsClosingGw ||
            dstIsComplexGateway ||
            (srcIsClosingGw && dstIsOpeningGw && src.id !== dst.id)
        );

        if (dstIsTask && !dstNeedsGwSide) {
            // Treat like task: go to center then up
            pts.push({ x: dstMidX, y: yClear });
            pts.push({ x: dstMidX, y: dstTop });
        } else if (dstIsGateway) {
            // Side approach into gateway
            if (i < j) {
                pts.push({ x: dstLeft, y: yClear });
            } else {
                pts.push({ x: dstRight, y: yClear });
            }
        } else if (i < j) {
            // Fallback non-task, non-gateway
            pts.push({ x: dstLeft - DX, y: yClear });
            pts.push({ x: dstLeft - DX, y: dstMidY });
            pts.push({ x: dstLeft, y: dstMidY });
        } else {
            pts.push({ x: dstRight + DX, y: yClear });
            pts.push({ x: dstRight + DX, y: dstMidY });
            pts.push({ x: dstRight, y: dstMidY });
        }
        return pts;
    }

    // If destination is a task: end at TOP center of the task
    if (dstIsTask) {
        if (i < j) {
            // left -> right: exit right of src, align to center, then up to top
            pts.push({ x: srcRight, y: srcMidY });
            pts.push({ x: srcRight + DX, y: srcMidY });
            pts.push({ x: dstMidX, y: srcMidY });
            pts.push({ x: dstMidX, y: dstTop });
        } else {
            // right -> left: exit left of src, align to center, then up to top
            pts.push({ x: srcLeft, y: srcMidY });
            pts.push({ x: srcLeft - DX, y: srcMidY });
            pts.push({ x: dstMidX, y: srcMidY });
            pts.push({ x: dstMidX, y: dstTop });
        }
        return pts;
    }

    // Default behavior (non-task destinations and non-task sources): side-to-side with orthogonal bends
    if (i < j) {
        // left -> right: from right border of src-node to left border of dst-node
        pts.push({ x: srcRight, y: srcMidY });
        pts.push({ x: srcRight + DX, y: srcMidY });
        pts.push({ x: dstLeft - DX, y: srcMidY });
        pts.push({ x: dstLeft - DX, y: dstMidY });
        pts.push({ x: dstLeft, y: dstMidY });
    } else {
        // right -> left: from left border of src to right border of dst
        pts.push({ x: srcLeft, y: srcMidY });
        pts.push({ x: srcLeft - DX, y: srcMidY });
        pts.push({ x: dstRight + DX, y: srcMidY });
        pts.push({ x: dstRight + DX, y: dstMidY });
        pts.push({ x: dstRight, y: dstMidY });
    }

    return pts;
}



//  5) Generate XML (Process-Nodes, SequenceFlows, DI)
function generateXML(shapes, flows, metadata) {

    //Metadata - Execution comment
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const startedAt = metadata && typeof metadata.startedAt === "number" ? metadata.startedAt : null;
    const duration = startedAt ? (now - startedAt) : null;
    const execComment = `<!-- Generated by david_bpmn_convert${` in ${duration} ms`} on ${nowIso} -->`;

    // Edge label formatting Const
    const EDGE_LABEL_W = 140; // px fixed width for edge labels
    const EVENT_LABEL_W = 100; // px fixed width for event labels
    const LABEL_LINE_H = 12;  // px per line
    const LABEL_PAD_Y = 10;  // px gap above the bend

    function formatWrappedLabel(s, maxWidthPx = EDGE_LABEL_W) {
        if (!s) return "";
        const text = String(s);
        const CHARS_PER_LINE = Math.floor(maxWidthPx / 6); // using 6px per char
        if (text.length <= CHARS_PER_LINE) return text;

        // Preferred break: after the first occurrence of token within first-line budget
        const TOKENS = ['==', '>', '<', '+', '-'];
        let breakPos = -1;
        for (const tok of TOKENS) {
            const idx = text.indexOf(tok);
            if (idx >= 0) {
                const candidate = idx + tok.length; // break after the token
                if (candidate <= CHARS_PER_LINE) {
                    if (breakPos === -1 || candidate < breakPos) breakPos = candidate;
                }
            }
        }
        if (breakPos === -1) {
            // Otherwise break at the last whitespace within the first line; if none, hard break
            const ws = text.lastIndexOf(' ', CHARS_PER_LINE);
            breakPos = (ws > 0 ? ws : CHARS_PER_LINE);
        }
        const first = text.slice(0, breakPos).trimEnd();
        let rest = text.slice(breakPos).trimStart();
        if (rest.length > CHARS_PER_LINE) {
            rest = rest.slice(0, Math.max(0, CHARS_PER_LINE - 3)) + '...';
        }
        return first + "\n" + rest; // max one line break
    }

    //Escape XML and encode new lines
    function escapeWithNewlines(s) {
        const placeholder = "\x01";
        return xmlEscape(String(s).replace(/\n/g, placeholder)).replace(new RegExp(placeholder, 'g'), "&#10;");
    }

    //combination of both helpers escapeWithNewlines and formatWrappedLabel
    function wrapAndEscapeForName(raw, maxWidthPx = EDGE_LABEL_W) {
        if (!raw) return { display: "", attr: "" };
        const wrapped = formatWrappedLabel(raw, maxWidthPx);
        const attr = ` name="${escapeWithNewlines(wrapped)}"`;
        return { display: wrapped, attr };
    }

    // find the first bend point of a polyline (corner where dir changes)
    function findFirstBendPoint(points) {
        for (let i = 1; i < points.length - 1; i++) {
            const dx1 = points[i].x - points[i - 1].x;
            const dy1 = points[i].y - points[i - 1].y;
            const dx2 = points[i + 1].x - points[i].x;
            const dy2 = points[i + 1].y - points[i].y;
            const seg1Vert = (dx1 === 0) && (dy1 !== 0);
            const seg1Hori = (dy1 === 0) && (dx1 !== 0);
            const seg2Vert = (dx2 === 0) && (dy2 !== 0);
            const seg2Hori = (dy2 === 0) && (dx2 !== 0);
            if ((seg1Vert && seg2Hori) || (seg1Hori && seg2Vert)) {
                return points[i];
            }
        }
        return null;
    }

    function directionOfFirstBendPoint(points) {
        for (let i = 1; i < points.length - 1; i++) {
            const a = points[i - 1];
            const b = points[i];
            const c = points[i + 1];
            const dx1 = b.x - a.x;
            const dy1 = b.y - a.y;
            const dx2 = c.x - b.x;
            const dy2 = c.y - b.y;
            const seg1Vert = (dx1 === 0) && (dy1 !== 0);
            const seg1Hori = (dy1 === 0) && (dx1 !== 0);
            const seg2Vert = (dx2 === 0) && (dy2 !== 0);
            const seg2Hori = (dy2 === 0) && (dx2 !== 0);

            if (!((seg1Vert && seg2Hori) || (seg1Hori && seg2Vert))) continue;

            const dir1 = seg1Hori ? (dx1 > 0 ? "R" : "L") : (dy1 > 0 ? "D" : "U");
            const dir2 = seg2Hori ? (dx2 > 0 ? "R" : "L") : (dy2 > 0 ? "D" : "U");

            return { index: i, from: dir1, to: dir2 };
        }
        return null;
    }

    // sequenceFlow-Nodes (Prozess-Edges)
    // Flows with optional condition (conditionExpression) and Default-Flag (xsi:type necessary)
    const seqXml = flows.map((f, i) => {
        const sid = `e${i + 1}`;
        f._edgeId = sid;
	const { display, attr: nameAttr } = wrapAndEscapeForName(f.name, EDGE_LABEL_W);
        f._displayName = display;
        const cond = (!f.isDefault && f.condition)
            ? `\n      <conditionExpression xsi:type="tFormalExpression">${xmlEscape(f.condition)}</conditionExpression>`
            : "";
        return `    <sequenceFlow id="${sid}" sourceRef="${f.src.id}" targetRef="${f.dst.id}"${nameAttr}>${cond}</sequenceFlow>`;
    }).join("\n");

    //set default="flowID"
    const gwDefaults = new Map();
    for (const f of flows) {
        if (f.isDefault && f.src && f.src.kind === "exclusiveGateway") {
            gwDefaults.set(f.src.id, f._edgeId);
        }
    }

    // Process-Nodes (Tasks, Events, Gateways)
    const procNodes = shapes.map((s) => {
        switch (s.kind) {
            case "startEvent": {
                const raw = (s._rawName && String(s._rawName).trim()) ? s._rawName : "";
                const { attr: nameAttr } = wrapAndEscapeForName(raw, EVENT_LABEL_W);
                return `    <startEvent id="${s.id}"${nameAttr}>${xmlSignavioBg(s.fill)}${xmlEventDef(s.eventDef)}</startEvent>`;
            }
            case "endEvent": {
                const raw = (s._rawName && String(s._rawName).trim()) ? s._rawName : "";
                const { attr: nameAttr } = wrapAndEscapeForName(raw, EVENT_LABEL_W);
                return `    <endEvent id="${s.id}"${nameAttr}>${xmlSignavioBg(s.fill)}${xmlEventDef(s.eventDef)}</endEvent>`;
            }
	    case "exclusiveGateway": {
                const def = gwDefaults.get(s.id);
                const defAttr = def ? ` default="${def}"` : "";
                return `    <exclusiveGateway id="${s.id}" name="${s.name || ""}"${defAttr}>${xmlSignavioBg(s.fill)}</exclusiveGateway>`;
            }
            case "parallelGateway":
                return `    <parallelGateway id="${s.id}" name="${s.name || ""}">${xmlSignavioBg(s.fill)}</parallelGateway>`;
            case "complexGateway":
                return `    <complexGateway id="${s.id}" name="${s.name || ""}">${xmlSignavioBg(s.fill)}</complexGateway>`;
            case "intermediateCatchEvent": {
                const raw = (s._rawName && String(s._rawName).trim()) ? s._rawName : "";
                const { attr: nameAttr } = wrapAndEscapeForName(raw, EVENT_LABEL_W);
                return `    <intermediateCatchEvent id="${s.id}"${nameAttr}>${xmlSignavioBg(s.fill)}${xmlEventDef(s.eventDef)}</intermediateCatchEvent>`;
            }
	    case "intermediateThrowEvent": {
		const raw = (s._rawName && String(s._rawName).trim()) ? s._rawName : "";
		const { attr: nameAttr } = wrapAndEscapeForName(raw, EVENT_LABEL_W);
	        return `    <intermediateThrowEvent id="${s.id}"${nameAttr}>${xmlSignavioBg(s.fill)}${xmlEventDef(s.eventDef)}</intermediateThrowEvent>`;
	    }
	    case "userTask":
                return `    <userTask id="${s.id}" name="${s.name || "Task"}">${xmlSignavioBg(s.fill)}</userTask>`;
            case "serviceTask":
                return `    <serviceTask id="${s.id}" name="${s.name || "Task"}">${xmlSignavioBg(s.fill)}</serviceTask>`;
            case "scriptTask":
                return `    <scriptTask id="${s.id}" name="${s.name || "Task"}">${xmlSignavioBg(s.fill)}</scriptTask>`;
	    case "subProcess":
	        return `    <subProcess id="${s.id}" name="${s.name || "Sub-Process"}">${xmlSignavioBg(s.fill)}</subProcess>`;
	    case "task":
                return `    <task id="${s.id}" name="${s.name || "Task"}">${xmlSignavioBg(s.fill)}</task>`;
            default:
                return "";
        }
    }).join("\n");

    // BPMN DI: Shapes (Bounds etc.)
    const shapeXml = shapes.map((s) => {
        const guiId = `${s.id}_gui`;
        const marker = isGatewayBpmnKind(s.kind) ? ' isMarkerVisible="true"' : '';

        // For event shape with name label position label to the RIGHT of the element.
        let labelBlock = "";
        const isEventShape = (s.kind === "startEvent" || s.kind === "endEvent" || s.kind === "intermediateCatchEvent" || s.kind === "intermediateThrowEvent");
        if (isEventShape) {
	    const raw = (s._rawName && String(s._rawName).trim()) ? s._rawName : (s.name || "");
	    if (raw && String(raw).trim()) {
            const PAD = 10; // horizontal padding to the right of the shape
            const wrapped = formatWrappedLabel(raw, EVENT_LABEL_W);
 	    const lines = wrapped.indexOf("\n") >= 0 ? 2 : 1;
	    const h = LABEL_LINE_H * lines; // label height (px)
	    const w = EVENT_LABEL_W;
            const x = s.x + s.w + PAD; // right of shape
            const y = s.y + (s.h - h) / 2; // vertically centered to shape
            labelBlock = [
                `        <bpmndi:BPMNLabel>`,
                `          <omgdc:Bounds x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" />`,
                `        </bpmndi:BPMNLabel>`
            ].join("\n");
        }
	}
	else if (isGatewayBpmnKind(s.kind) && s.name && String(s.name).trim()) {
	    const PAD = 10; // horizontal padding to right of the shape
            const h = 12; // label height (px)
            const w = Math.min(220, Math.max(40, String(s.name).length * 6)); // width based on char count of name (approx 6px per char)
            const x = s.x + s.w + PAD; // right of shape
            const y = s.y // top right of shape
	    labelBlock = [
                `        <bpmndi:BPMNLabel>`,
                `          <omgdc:Bounds x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" />`,
                `        </bpmndi:BPMNLabel>`
            ].join("\n");
	}
        return [
            `      <bpmndi:BPMNShape id="${guiId}" bpmnElement="${s.id}"${marker}>`,
            `        <omgdc:Bounds x="${fmt(s.x)}" y="${fmt(s.y)}" width="${fmt(s.w)}" height="${fmt(s.h)}" />`,
            labelBlock,
            `      </bpmndi:BPMNShape>`,
        ].join("\n");
    }).join("\n");

    // BPMN DI: Edges (Waypoints etc.)
    // Fixed-width label box above the first bend with max 1 line break
    const edgeXml = flows.map((f) => {
        const pts = waypointsForEdge(f.src, f.dst);
        const wp = pts.map((p) => `        <omgdi:waypoint x="${fmt(p.x)}" y="${fmt(p.y)}" />`).join("\n");

	const bend = findFirstBendPoint(pts);
        const dir = directionOfFirstBendPoint(pts);

        let labelXml = "";
        if (f._displayName) {
            const bend = findFirstBendPoint(pts);
            const dir = directionOfFirstBendPoint(pts);
            if (bend && dir) {
                const lines = f._displayName.indexOf("\n") >= 0 ? 2 : 1;
                const w = EDGE_LABEL_W;
                const h = LABEL_LINE_H * lines;
                const x = bend.x - w / 2;
                const belowBend = (dir.from === "D");
                const y = belowBend ? (bend.y + LABEL_PAD_Y) : (bend.y - (h + LABEL_PAD_Y));
                labelXml = [
                    `      <bpmndi:BPMNLabel>`,
                    `        <omgdc:Bounds x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" />`,
                    `      </bpmndi:BPMNLabel>`
                ].join("\n");
            } else if (bend) {
                // Fallback: place above the bend point
                const lines = f._displayName.indexOf("\n") >= 0 ? 2 : 1;
                const w = EDGE_LABEL_W;
                const h = LABEL_LINE_H * lines;
                const x = bend.x - w / 2;
                const y = bend.y - (h + LABEL_PAD_Y);
                labelXml = [
                    `      <bpmndi:BPMNLabel>`,
                    `        <omgdc:Bounds x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" />`,
                    `      </bpmndi:BPMNLabel>`
                ].join("\n");
            }
        }

        return [
            `      <bpmndi:BPMNEdge id="${f._edgeId}_gui" bpmnElement="${f._edgeId}">`,
            wp,
            labelXml,
            `      </bpmndi:BPMNEdge>`,
        ].join("\n");
    }).join("\n");


    // Complete XML Document
    return `<?xml version="1.0" encoding="UTF-8"?>
    ${execComment}
<definitions
  xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:omgdi="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:omgdc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:signavio="http://www.signavio.com"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  targetNamespace="https://example.com/bpmn"
>
  <!-- Semantic Process Definition (BPMN Model) -->
  <process id="process1" isExecutable="false">
  <!-- Process Nodes -->
${procNodes}
  <!-- Sequence Flows -->
${seqXml}
  </process>

  <!-- BPMN Diagram Interchange (BPMN DI) -->
  <bpmndi:BPMNDiagram id="diagram1">
    <bpmndi:BPMNPlane id="plane1" bpmnElement="process1">
  <!-- Shape DI -->
${shapeXml}
  <!-- Edge DI -->
${edgeXml}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;
}


// Signavio: color Hex-Code per Shape; Default white (#ffffff)
function xmlSignavioBg(color) {
    const c = color || "#ffffff"; // DefaultColor
    return `
      <extensionElements>
        <signavio:signavioMetaData metaKey="bgcolor" metaValue="${xmlEscape(c)}"/>
      </extensionElements>`;
}


function david_bpmn_convert(dpm, dcl) {
 	const startedAt = Date.now();
	const matrix = dpm;
    	const conlist = dcl;

    if (!Array.isArray(matrix)) {
        throw new Error('david_bpmn_convert: dpm muss Array oder JSON-String sein');
    }
    if (!Array.isArray(conlist)) {
        throw new Error('david_bpmn_convert: dcl muss Array oder JSON-String sein');
    }

    const cells = parseMatrix(matrix);
    const { shapes, byRowCol } = buildLayout(cells);
    const flows = buildFlows(conlist, byRowCol, shapes);
    const xml = generateXML(shapes, flows, {startedAt});

    return {
        serializePrettyXML: () => xml,
        toString: () => xml,
        xml
    };
}

    if (typeof window !== 'undefined') {
        window.david_bpmn_convert = david_bpmn_convert;
    }
