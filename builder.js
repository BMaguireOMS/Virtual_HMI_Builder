const $ = (id) => document.getElementById(id);

const canvas = $("canvas");

const wrap = document.querySelector(".wrap");


// ============================================================
// DEFAULT OBJECT TYPES
// ============================================================

const defaults = {

    label: {
        text: "Label",
        w: 160,
        h: 40,
        bg: "#eef2f4",
        fg: "#1b252d"
    },

    button: {
        text: "START",
        w: 120,
        h: 55,
        bg: "#d6dde2",
        fg: "#17212b"
    },

    num: {
        text: "0.0",
        w: 140,
        h: 50,
        bg: "#ffffff",
        fg: "#17212b"
    },

    input: {
        text: "0.0",
        w: 140,
        h: 50,
        bg: "#ffffff",
        fg: "#17212b"
    },

    lamp: {
        text: "",
        w: 50,
        h: 50,
        bg: "#7f8b94",
        fg: "#ffffff"
    },

    status: {
        text: "READY",
        w: 150,
        h: 42,
        bg: "#2e9d58",
        fg: "#ffffff"
    },

    toggle: {
        text: "TOGGLE",
        w: 110,
        h: 50,
        bg: "#d6dde2",
        fg: "#17212b"
    },

    gauge: {
        text: "0",
        w: 120,
        h: 120,
        bg: "#ffffff",
        fg: "#17212b"
    },

    bar: {
        text: "0 %",
        w: 200,
        h: 45,
        bg: "#d9dfe3",
        fg: "#17212b"
    },

    alarm: {
        text: "NO ACTIVE ALARMS",
        w: 380,
        h: 42,
        bg: "#f2c94c",
        fg: "#17212b"
    },

    trend: {
        text: "TREND",
        w: 320,
        h: 180,
        bg: "#202a32",
        fg: "#54c77a"
    },

    image: {
        text: "IMAGE",
        w: 180,
        h: 120,
        bg: "#ffffff",
        fg: "#59656e"
    },

    nav: {
        text: "NEXT",
        w: 110,
        h: 50,
        bg: "#344957",
        fg: "#ffffff"
    },

    panel: {
        text: "",
        w: 300,
        h: 180,
        bg: "#ffffff",
        fg: "#17212b"
    },

    line: {
        text: "",
        w: 300,
        h: 2,
        bg: "#aab4bd",
        fg: "#aab4bd"
    },
};

// ============================================================
// PROJECT
// ============================================================

let project = {

    name: "MyVirtualHMI",

    canvas: {
        width: 1280,
        height: 720
    },

    opc: {
        endpoint: "opc.tcp://10.200.200.45:4840",
        policy: "Basic256Sha256",
        mode: "SignAndEncrypt",
        username: "admin"
    },

    screens: [
        {
            name: "Main",
            objects: []
        }
    ],

    currentScreen: "Main"
};


let selectedId = null;
let zCounter = 10;
let clipboardObjects = [];

let selectedIds = new Set();

let selectionBox = null;

let selectionStartX = 0;
let selectionStartY = 0;

let isSelecting = false;

let undoStack = [];
let redoStack = [];

const MAX_HISTORY = 50;

// ============================================================
// HELPERS
// ============================================================

function uid() {

    return "obj_" +
        Math.random()
            .toString(36)
            .substring(2, 10);
}


function currentScreen() {

    return project.screens.find(
        screen =>
            screen.name === project.currentScreen
    );
}


function snapValue(value) {

    if ($("snap").checked) {

        return Math.round(value / 10) * 10;
    }

    return value;
}


function getSelectedObject() {

    if (!selectedId) {
        return null;
    }

    return currentScreen().objects.find(
        obj => obj.id === selectedId
    );
}

// ============================================================
// CLEAR OBJECT SELECTION
// ============================================================

function clearSelection() {

    selectedIds.clear();

    selectedId = null;

    render();
}

function updateSelectionVisuals() {

    document
        .querySelectorAll(".obj")
        .forEach(element => {

            const id =
                element.dataset.id;

            element.classList.toggle(
                "multi-selected",
                selectedIds.has(id)
            );

            element.classList.toggle(
                "selected",
                id === selectedId
            );
        });


    const obj =
        getSelectedObject();


    $("none").hidden =
        !!obj;

    $("panel").hidden =
        !obj;


    if (!obj) {

        $("selectionStatus").innerText =
            selectedIds.size > 0
                ? `${selectedIds.size} objects selected`
                : "No selection";

        return;
    }


    if (selectedIds.size > 1) {

        $("selectionStatus").innerText =
            `${selectedIds.size} objects selected`;

    } else {

        $("selectionStatus").innerText =
            "Selected: " + obj.name;
    }


    updatePropertyPanel();
}

// ============================================================
// MULTI-SELECTION
// ============================================================

function clearSelection() {

    selectedIds.clear();

    selectedId = null;

    updateSelectionVisuals();
}


function selectOnly(id) {

    selectedIds.clear();

    selectedIds.add(id);

    selectedId = id;

    updateSelectionVisuals();
}


function toggleSelection(id) {

    if (selectedIds.has(id)) {

        selectedIds.delete(id);

        if (selectedId === id) {

            const remaining =
                Array.from(selectedIds);

            selectedId =
                remaining.length
                    ? remaining[remaining.length - 1]
                    : null;
        }

    } else {

        selectedIds.add(id);

        selectedId = id;
    }
    updateSelectionVisuals();
}


function getSelectedObjects() {

    return currentScreen().objects.filter(
        obj => selectedIds.has(obj.id)
    );
}

// ============================================================
// CREATE OBJECT
// ============================================================

function createObject(type) {

    let d = defaults[type];


    // Fallback for Panel / Rectangle
    if (type === "panel" && !d) {

        d = {
            text: "",
            w: 300,
            h: 180,
            bg: "#ffffff",
            fg: "#17212b"
        };
    }


    // Prevent crashes from unknown object types
    if (!d) {

        console.error(
            "Unknown object type:",
            type
        );

        return;
    }


    const obj = {

        id: uid(),

        type: type,

        name:
            type +
            "_" +
            (currentScreen().objects.length + 1),

        text: d.text,

        trueText: "RUNNING",
        falseText: "STOPPED",

        trueColor: "#2e9d58",
        falseColor: "#c83b3b",

        animateColor: false,
        animateVisibility: false,
        animateBlink: false,

        blinkSpeed: 0.8,
        blinkOpacity: 0.2,

        x: 50,
        y: 50,

        w: d.w,
        h: d.h,

        z: ++zCounter,

        fontSize: 20,

        bg: d.bg,
        fg: d.fg,

        node: "",

        binding: "none",

        dataType: "BOOL",

        buttonMode: "toggle",

        writeValue: "true",

        min: 0,
        max: 100,

        units: "",

        navTarget: ""
    };


    saveHistory();


    currentScreen().objects.push(obj);


    // Make newly created object the only selected object
    selectedIds.clear();

    selectedIds.add(obj.id);

    selectedId = obj.id;


    render();
}

// ============================================================
// RENDER
// ============================================================

function render() {

    canvas.innerHTML = "";

    canvas.style.width =
        project.canvas.width + "px";

    canvas.style.height =
        project.canvas.height + "px";


    currentScreen()
        .objects
        .sort((a, b) => a.z - b.z)
        .forEach(obj => {

            createObjectElement(obj);

        });


    renderScreenList();

    selectObject(selectedId);
}

// ============================================================
// CREATE VISUAL OBJECT
// ============================================================

function createObjectElement(obj) {

    const element =
        document.createElement("div");


    element.classList.add(
        "obj",
        obj.type
    );


    element.dataset.id =
        obj.id;


    // ========================================================
    // MULTI-SELECTION
    // ========================================================

    if (selectedIds.has(obj.id)) {

        element.classList.add(
            "multi-selected"
        );
    }


    // ========================================================
    // POSITION / SIZE
    // ========================================================

    element.style.left =
        obj.x + "px";

    element.style.top =
        obj.y + "px";

    element.style.width =
        obj.w + "px";

    element.style.height =
        obj.h + "px";

    element.style.zIndex =
        obj.z;

    // ========================================================
    // BASIC APPEARANCE
    // ========================================================

    element.style.background =
        obj.bg;

    element.style.color =
        obj.fg;

    element.style.fontSize =
        obj.fontSize + "px";

    element.style.boxSizing =
        "border-box";

    // ========================================================
    // MODERN INDUSTRIAL OBJECT STYLING
    // ========================================================

    switch (obj.type) {

        // ----------------------------------------------------
        // LABEL
        // ----------------------------------------------------

        case "label":

            element.style.border =
                "none";

            element.style.borderRadius =
                "0";

            element.style.fontWeight =
                "600";

            element.style.justifyContent =
                "flex-start";

            element.style.padding =
                "0 8px";

            break;
        
        // ----------------------------------------------------
        // LINE
        // ----------------------------------------------------

        case "line":

            element.style.border =
                "none";

            element.style.borderRadius =
                "0";

            element.style.padding =
                "0";

            element.style.minHeight =
                "1px";

            break;

        // ----------------------------------------------------
        // STATUS INDICATOR
        // ----------------------------------------------------

        case "status":

            element.style.border =
                "1px solid rgba(0,0,0,0.20)";

            element.style.borderRadius =
                "4px";

            element.style.fontWeight =
                "700";

            element.style.letterSpacing =
                "0.5px";

            element.style.boxShadow =
                "inset 0 1px 0 rgba(255,255,255,0.20)";

            break;

        // ----------------------------------------------------
        // PUSH BUTTON
        // ----------------------------------------------------

        case "button":

            element.style.border =
                "1px solid #9aa7b1";

            element.style.borderRadius =
                "4px";

            element.style.fontWeight =
                "600";

            element.style.boxShadow =
                "0 1px 2px rgba(0,0,0,0.12)";

            element.style.cursor =
                "pointer";

            break;

        // ----------------------------------------------------
        // NUMERIC DISPLAY
        // ----------------------------------------------------

        case "num":

            element.style.border =
                "1px solid #aab4bd";

            element.style.borderRadius =
                "3px";

            element.style.fontWeight =
                "600";

            element.style.fontVariantNumeric =
                "tabular-nums";

            element.style.boxShadow =
                "inset 0 1px 2px rgba(0,0,0,0.06)";

            break;

        // ----------------------------------------------------
        // NUMERIC INPUT
        // ----------------------------------------------------

        case "input":

            element.style.border =
                "1px solid #8795a1";

            element.style.borderRadius =
                "3px";

            element.style.fontWeight =
                "600";

            element.style.fontVariantNumeric =
                "tabular-nums";

            element.style.boxShadow =
                "inset 0 1px 2px rgba(0,0,0,0.08)";

            break;

        // ----------------------------------------------------
        // INDICATOR LAMP
        // ----------------------------------------------------

        case "lamp":

            element.style.border =
                "3px solid #5f6b73";

            element.style.borderRadius =
                "50%";

            element.style.boxShadow =
                "inset 0 0 5px rgba(0,0,0,0.35)";

            break;

        // ----------------------------------------------------
        // TOGGLE
        // ----------------------------------------------------

        case "toggle":

            element.style.border =
                "1px solid #8d9aa5";

            element.style.borderRadius =
                "18px";

            element.style.fontWeight =
                "600";

            element.style.cursor =
                "pointer";

            break;

        // ----------------------------------------------------
        // GAUGE
        // ----------------------------------------------------

        case "gauge":

            element.style.border =
                "6px solid #667580";

            element.style.borderRadius =
                "50%";

            element.style.fontWeight =
                "700";

            element.style.fontVariantNumeric =
                "tabular-nums";

            element.style.boxShadow =
                "inset 0 0 0 3px #dce2e6";

            break;

        // ----------------------------------------------------
        // BAR
        // ----------------------------------------------------

        case "bar":

            element.style.border =
                "1px solid #9ca8b1";

            element.style.borderRadius =
                "3px";

            element.style.fontWeight =
                "600";

            element.style.overflow =
                "hidden";

            break;

        // ----------------------------------------------------
        // ALARM
        // ----------------------------------------------------

        case "alarm":

            element.style.border =
                "1px solid #c69d21";

            element.style.borderRadius =
                "3px";

            element.style.fontWeight =
                "700";

            element.style.justifyContent =
                "flex-start";

            element.style.padding =
                "0 12px";

            break;

        // ----------------------------------------------------
        // TREND
        // ----------------------------------------------------

        case "trend":

            element.style.border =
                "1px solid #56636c";

            element.style.borderRadius =
                "3px";

            element.style.fontFamily =
                "Consolas, monospace";

            break;

        // ----------------------------------------------------
        // IMAGE
        // ----------------------------------------------------

        case "image":

            element.style.border =
                "1px solid #b7c0c7";

            element.style.borderRadius =
                "3px";

            break;

        // ----------------------------------------------------
        // PANEL
        // ----------------------------------------------------

        case "panel":

            element.style.border =
                "1px solid #c5cdd3";

            element.style.borderRadius =
                "4px";

            element.style.boxShadow =
                "0 1px 2px rgba(0,0,0,0.05)";

            element.style.justifyContent =
                "flex-start";

            element.style.alignItems =
                "flex-start";

            element.style.padding =
                "8px";

            break;

        // ----------------------------------------------------
        // NAVIGATION BUTTON
        // ----------------------------------------------------

        case "nav":

            element.style.border =
                "1px solid #24343f";

            element.style.borderRadius =
                "3px";

            element.style.fontWeight =
                "600";

            element.style.cursor =
                "pointer";

            element.style.boxShadow =
                "0 1px 2px rgba(0,0,0,0.15)";

            break;
    }

    // ========================================================
    // TEXT
    // ========================================================

    element.innerText =
        obj.text +
        (
            obj.units
                ? " " + obj.units
                : ""
        );

    // ========================================================
    // RESIZE HANDLE
    // ========================================================

    const resizeHandle =
        document.createElement("div");

    resizeHandle.className =
        "handle";


    element.appendChild(
        resizeHandle
    );

    // ========================================================
    // DRAG
    // ========================================================

    element.addEventListener(
        "pointerdown",
        event =>
            beginDrag(
                event,
                obj,
                element
            )
    );

    // ========================================================
    // RESIZE
    // ========================================================

    resizeHandle.addEventListener(
        "pointerdown",
        event =>
            beginResize(
                event,
                obj,
                element
            )
    );

    // ========================================================
    // ADD TO CANVAS
    // ========================================================

    canvas.appendChild(
        element
    );
}

// ============================================================
// SELECTION
// ============================================================

function selectObject(id) {

    selectedId = id;


        if (id) {

            if (!selectedIds.has(id)) {

                selectedIds.clear();

                selectedIds.add(id);
            }

        } else {

            selectedIds.clear();
        }


    updateSelectionVisuals();
}

// ============================================================
// PROPERTY PANEL
// ============================================================

function updatePropertyPanel() {

    const obj =
        getSelectedObject();


    if (!obj) {
        return;
    }


    $("name").value =
        obj.name;

    $("text").value =
        obj.text;

    $("x").value =
        obj.x;

    $("y").value =
        obj.y;

    $("w").value =
        obj.w;

    $("h").value =
        obj.h;

    $("font").value =
        obj.fontSize;

    $("bg").value =
        obj.bg;

    $("fg").value =
        obj.fg;
    
    $("trueText").value =
    obj.trueText || "RUNNING";

    $("falseText").value =
        obj.falseText || "STOPPED";

    $("trueColor").value =
        obj.trueColor || "#2e9d58";

    $("falseColor").value =
        obj.falseColor || "#c83b3b";
    
    $("animateColor").checked =
        obj.animateColor || false;

    $("animateVisibility").checked =
        obj.animateVisibility || false;

    $("animateVisibility").checked =
        obj.animateVisibility || false;
    
    $("blinkSpeed").value =
        obj.blinkSpeed ?? 0.8;

    $("blinkOpacity").value =
        obj.blinkOpacity ?? 0.2;

    $("node").value =
        obj.node;

    $("bind").value =
        obj.binding;

    $("dtype").value =
        obj.dataType;

    $("buttonMode").value =
        obj.buttonMode || "toggle";

    $("write").value =
        obj.writeValue;

    $("min").value =
        obj.min;

    $("max").value =
        obj.max;

    $("units").value =
        obj.units;

    $("navTarget").value =
        obj.navTarget || "";
}

// ============================================================
// APPLY PROPERTIES
// ============================================================

function applyProperties(renderAfter = true) {

    const obj =
        getSelectedObject();


    if (!obj) {
        return;
    }

    saveHistory();

    obj.name =
        $("name").value;

    obj.text =
        $("text").value;

    obj.x =
        Number($("x").value);

    obj.y =
        Number($("y").value);

    obj.w =
        Number($("w").value);

    obj.h =
        Number($("h").value);

    obj.fontSize =
        Number($("font").value);

    obj.bg =
        $("bg").value;

    obj.fg =
        $("fg").value;
    
    obj.trueText =
        $("trueText").value;

    obj.falseText =
        $("falseText").value;

    obj.trueColor =
        $("trueColor").value;

    obj.falseColor =
        $("falseColor").value;

    obj.animateColor =
        $("animateColor").checked;

    obj.animateVisibility =
        $("animateVisibility").checked;
    
    obj.animateBlink =
        $("animateBlink").checked;

    obj.blinkSpeed =
        Number($("blinkSpeed").value);

    obj.blinkOpacity =
        Number($("blinkOpacity").value);

    obj.node =
        $("node").value.trim();

    obj.binding =
        $("bind").value;

    obj.dataType =
        $("dtype").value;

    obj.buttonMode =
        $("buttonMode").value;

    obj.writeValue =
        $("write").value;

    obj.min =
        Number($("min").value);

    obj.max =
        Number($("max").value);

    obj.units =
        $("units").value;

    obj.navTarget =
        $("navTarget").value;

    if (renderAfter) {
        render();
    }
}

// ============================================================
// LIVE OBJECT SIZE UPDATE
// ============================================================

$("w").addEventListener(
    "input",
    () => {

        const obj = getSelectedObject();

        if (!obj) {
            return;
        }

        obj.w = Number($("w").value);

        const element =
            document.querySelector(
                `[data-id="${obj.id}"]`
            );

        if (element) {
            element.style.width =
                obj.w + "px";
        }
    }
);

$("h").addEventListener(
    "input",
    () => {

        const obj = getSelectedObject();

        if (!obj) {
            return;
        }

        obj.h = Number($("h").value);

        const element =
            document.querySelector(
                `[data-id="${obj.id}"]`
            );

        if (element) {
            element.style.height =
                obj.h + "px";
        }
    }
);

// ============================================================
// LIVE OBJECT POSITION UPDATE
// ============================================================

$("x").addEventListener(
    "input",
    () => {

        const obj = getSelectedObject();

        if (!obj) {
            return;
        }

        obj.x = Number($("x").value);

        const element =
            document.querySelector(
                `[data-id="${obj.id}"]`
            );

        if (element) {
            element.style.left =
                obj.x + "px";
        }
    }
);

$("y").addEventListener(
    "input",
    () => {

        const obj = getSelectedObject();

        if (!obj) {
            return;
        }

        obj.y = Number($("y").value);

        const element =
            document.querySelector(
                `[data-id="${obj.id}"]`
            );

        if (element) {
            element.style.top =
                obj.y + "px";
        }
    }
);

// Font Size
$("font").addEventListener(
    "input",
    () => {

        const obj = getSelectedObject();

        if (!obj) {
            return;
        }

        obj.fontSize =
            Number(
                $("font").value
            );

        const element =
            document.querySelector(
                `[data-id="${obj.id}"]`
            );

        if (element) {

            element.style.fontSize =
                obj.fontSize + "px";
        }
    }
);

// ============================================================
// DRAG
// ============================================================

function beginDrag(
    event,
    obj,
    element
) {

    if (event.shiftKey) {
    return;
    }

    if (
        event.target.classList.contains(
            "handle"
        )
    ) {
        return;
    }


    event.preventDefault();
    event.stopPropagation();


    // ========================================================
    // HANDLE SELECTION
    // ========================================================

    if (event.ctrlKey) {

        toggleSelection(obj.id);

        // If Ctrl+Click removed this object from selection,
        // don't start dragging it.
        if (!selectedIds.has(obj.id)) {
            return;
        }

    } else {

        // Clicking an object that isn't already selected
        // makes it the only selected object.
        if (!selectedIds.has(obj.id)) {

            selectOnly(obj.id);
        }
    }

    // ========================================================
    // START DRAG
    // ========================================================
    saveHistory();

    const startX =
        event.clientX;

    const startY =
        event.clientY;


    // Get ALL selected objects
    const selectedObjects =
        getSelectedObjects();


    // Store the original position of every selected object
    const startPositions =
        new Map();

    selectedObjects.forEach(
        selectedObj => {

            startPositions.set(
                selectedObj.id,
                {
                    x: selectedObj.x,
                    y: selectedObj.y
                }
            );

        }
    );

    // ========================================================
    // MOVE
    // ========================================================

    function move(event) {

        let deltaX =
            event.clientX -
            startX;

        let deltaY =
            event.clientY -
            startY;


        // Snap the movement itself to the grid
        if ($("snap").checked) {

            deltaX =
                Math.round(deltaX / 10) * 10;

            deltaY =
                Math.round(deltaY / 10) * 10;
        }

        selectedObjects.forEach(
            selectedObj => {

                const original =
                    startPositions.get(
                        selectedObj.id
                    );


                selectedObj.x =
                    original.x +
                    deltaX;

                selectedObj.y =
                    original.y +
                    deltaY;

                // Find this object's visual element
                const selectedElement =
                    document.querySelector(
                        `[data-id="${selectedObj.id}"]`
                    );


                if (selectedElement) {

                    selectedElement.style.left =
                        selectedObj.x + "px";

                    selectedElement.style.top =
                        selectedObj.y + "px";
                }

            }
        );

        // Update X/Y fields for the primary selected object
        updatePropertyPanel();
    }

    // ========================================================
    // STOP DRAG
    // ========================================================

    function stop() {

        window.removeEventListener(
            "pointermove",
            move
        );

        window.removeEventListener(
            "pointerup",
            stop
        );
    }

    window.addEventListener(
        "pointermove",
        move
    );

    window.addEventListener(
        "pointerup",
        stop
    );
}

// ============================================================
// DRAG SELECTION BOX
// ============================================================

wrap.addEventListener(
    "pointerdown",
    event => {

        // Do not start selection when clicking an HMI object
        if (
            event.target.closest(".obj") &&
            !event.shiftKey
        ) {
            return;
        }

        const rect =
            canvas.getBoundingClientRect();

        selectionStartX =
            event.clientX - rect.left;

        selectionStartY =
            event.clientY - rect.top;

        isSelecting = true;

        // Clear old selection unless Ctrl is held
        if (!event.ctrlKey) {

            selectedIds.clear();
            selectedId = null;

            updateSelectionVisuals();
        }

        selectionBox =
            document.createElement("div");

        selectionBox.className =
            "selection-box";


        selectionBox.style.left =
            selectionStartX + "px";

        selectionBox.style.top =
            selectionStartY + "px";

        selectionBox.style.width =
            "0px";

        selectionBox.style.height =
            "0px";

        canvas.appendChild(
            selectionBox
        );
    }
);

// ============================================================
// CLICK OUTSIDE OBJECTS TO DESELECT
// ============================================================

document.addEventListener(
    "pointerdown",
    event => {

        // Keep selection when clicking an HMI object
        if (event.target.closest(".obj")) {
            return;
        }

        // Keep selection while editing properties
        if (event.target.closest(".props")) {
            return;
        }

        // Don't interfere with toolbox buttons
        if (event.target.closest(".tool")) {
            return;
        }

        clearSelection();
    }
);

document.addEventListener(
    "pointermove",
    event => {

        if (
            !isSelecting ||
            !selectionBox
        ) {
            return;
        }

        const rect =
            canvas.getBoundingClientRect();


        const currentX =
            event.clientX - rect.left;

        const currentY =
            event.clientY - rect.top;

        const left =
            Math.min(
                selectionStartX,
                currentX
            );

        const top =
            Math.min(
                selectionStartY,
                currentY
            );

        const width =
            Math.abs(
                currentX -
                selectionStartX
            );

        const height =
            Math.abs(
                currentY -
                selectionStartY
            );

        selectionBox.style.left =
            left + "px";

        selectionBox.style.top =
            top + "px";

        selectionBox.style.width =
            width + "px";

        selectionBox.style.height =
            height + "px";
    }
);

document.addEventListener(
    "pointerup",
    event => {

        if (
            !isSelecting ||
            !selectionBox
        ) {
            return;
        }

        const boxRect =
            selectionBox.getBoundingClientRect();


        currentScreen().objects.forEach(
            obj => {

                const element =
                    document.querySelector(
                        `[data-id="${obj.id}"]`
                    );

                if (!element) {
                    return;
                }

                const objectRect =
                    element.getBoundingClientRect();

                const inside =
                    objectRect.left >= boxRect.left &&
                    objectRect.right <= boxRect.right &&
                    objectRect.top >= boxRect.top &&
                    objectRect.bottom <= boxRect.bottom;

                if (inside) {

                    selectedIds.add(
                        obj.id
                    );

                    selectedId =
                        obj.id;
                }
            }
        );

        selectionBox.remove();

        selectionBox = null;

        isSelecting = false;


        updateSelectionVisuals();
    }
);

// ============================================================
// RESIZE
// ============================================================

function beginResize(
    event,
    obj,
    element
) {
    saveHistory();
    event.preventDefault();
    event.stopPropagation();


    const startX =
        event.clientX;

    const startY =
        event.clientY;


    const originalWidth =
        obj.w;

    const originalHeight =
        obj.h;

    function move(event) {

        obj.w =
            Math.max(
                30,
                snapValue(
                    originalWidth +
                    event.clientX -
                    startX
                )
            );

        obj.h =
            Math.max(
                24,
                snapValue(
                    originalHeight +
                    event.clientY -
                    startY
                )
            );

        element.style.width =
            obj.w + "px";

        element.style.height =
            obj.h + "px";

        updatePropertyPanel();
    }

    function stop() {

        window.removeEventListener(
            "pointermove",
            move
        );

        window.removeEventListener(
            "pointerup",
            stop
        );
    }

    window.addEventListener(
        "pointermove",
        move
    );

    window.addEventListener(
        "pointerup",
        stop
    );
}

// ============================================================
// DELETE
// ============================================================

function deleteSelected() {

    if (
        selectedIds.size === 0 &&
        !selectedId
    ) {
        return;
    }

    saveHistory();

    // If there are multiple selected objects,
    // delete all of them.
    if (selectedIds.size > 0) {

        currentScreen().objects =
            currentScreen()
                .objects
                .filter(
                    obj =>
                        !selectedIds.has(obj.id)
                );

    } else {

        currentScreen().objects =
            currentScreen()
                .objects
                .filter(
                    obj =>
                        obj.id !== selectedId
                );
    }

    selectedIds.clear();
    selectedId = null;

    render();
}

// ============================================================
// DUPLICATE
// ============================================================

function duplicateSelected() {

    const obj =
        getSelectedObject();


    if (!obj) {
        return;
    }

    const copy =
        JSON.parse(
            JSON.stringify(obj)
        );

    copy.id =
        uid();

    copy.name +=
        "_copy";

    copy.x +=
        20;

    copy.y +=
        20;

    copy.z =
        ++zCounter;

    currentScreen()
        .objects
        .push(copy);

    selectedId =
        copy.id;

    render();
}

// ============================================================
// COPY / PASTE / CUT
// ============================================================

function copySelected() {

    const objects =
        getSelectedObjects();

    if (objects.length === 0) {

        const obj =
            getSelectedObject();

        if (!obj) {
            return;
        }

        clipboardObjects = [
            JSON.parse(
                JSON.stringify(obj)
            )
        ];

        return;
    }

    clipboardObjects =
        objects.map(
            obj =>
                JSON.parse(
                    JSON.stringify(obj)
                )
        );

    console.log(
        "Copied objects:",
        clipboardObjects.length
    );
}

function pasteObject() {

    console.log(
    "PASTE START - clipboard contains:",
    clipboardObjects.length,
    clipboardObjects
    );

    if (
        !clipboardObjects ||
        clipboardObjects.length === 0
    ) {
        return;
    }

    saveHistory();

    const newObjects = [];

    clipboardObjects.forEach(
        original => {

            const copy =
                JSON.parse(
                    JSON.stringify(original)
                );

            copy.id =
                uid();

            copy.name =
                copy.name +
                "_copy";

            copy.x +=
                20;

            copy.y +=
                20;

            copy.z =
                ++zCounter;

            currentScreen()
                .objects
                .push(copy);

            newObjects.push(copy);

        }
    );

    // Select all newly pasted objects
    selectedIds.clear();

    newObjects.forEach(
        obj => {

            selectedIds.add(
                obj.id
            );

        }
    );

    selectedId =
        newObjects.length
            ? newObjects[
                newObjects.length - 1
            ].id
            : null;

    // Move clipboard forward so repeated Ctrl+V
    // continues offsetting the group
    clipboardObjects =
        newObjects.map(
            obj =>
                JSON.parse(
                    JSON.stringify(obj)
                )
        );

    render();
}

function cutSelected() {

    copySelected();

    if (
        clipboardObjects.length === 0
    ) {
        return;
    }

    deleteSelected();
}

// ============================================================
// SCREEN LIST
// ============================================================

function renderScreenList() {

    $("screenSel").innerHTML =
        "";

    $("navTarget").innerHTML =
        '<option value="">None</option>';

    project.screens.forEach(
        screen => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                screen.name;

            option.innerText =
                screen.name;

            if (
                screen.name ===
                project.currentScreen
            ) {

                option.selected =
                    true;
            }

            $("screenSel")
                .appendChild(
                    option
                );

            const navOption =
                document.createElement(
                    "option"
                );

            navOption.value =
                screen.name;

            navOption.innerText =
                screen.name;

            $("navTarget")
                .appendChild(
                    navOption
                );

        }
    );
}

// ============================================================
// ADD SCREEN
// ============================================================

function addScreen() {

    const name =
        prompt(
            "Screen name:",
            "Screen" +
            (project.screens.length + 1)
        );

    if (!name) {
        return;
    }

    project.screens.push({

        name: name,

        objects: []

    });

    project.currentScreen =
        name;

    selectedId = null;

    render();
}

// ============================================================
// RENAME SCREEN
// ============================================================

function renameScreen() {

    const screen =
        currentScreen();


    const newName =
        prompt(
            "New screen name:",
            screen.name
        );

    if (!newName) {
        return;
    }

    const oldName =
        screen.name;

    screen.name =
        newName;

    project.screens.forEach(
        s => {

            s.objects.forEach(
                obj => {

                    if (
                        obj.navTarget ===
                        oldName
                    ) {

                        obj.navTarget =
                            newName;
                    }

                }
            );

        }
    );

    project.currentScreen =
        newName;

    render();
}

// ============================================================
// PROJECT SETTINGS
// ============================================================

function updateProjectSettings() {

    project.name =
        $("projectName").value;

    project.canvas.width =
        Number(
            $("cw").value
        );

    project.canvas.height =
        Number(
            $("ch").value
        );

    // Update the visual HMI canvas size
    canvas.style.width =
        project.canvas.width + "px";

    canvas.style.height =
        project.canvas.height + "px";

    project.opc.endpoint =
        $("endpoint").value;

    project.opc.policy =
        $("policy").value;

    project.opc.mode =
        $("mode").value;

    project.opc.username =
        $("user").value;
}

// ============================================================
// LIVE CANVAS SIZE UPDATE
// ============================================================

$("cw").addEventListener(
    "input",
    () => {

        updateProjectSettings();

        render();
    }
);

$("ch").addEventListener(
    "input",
    () => {

        updateProjectSettings();

        render();
    }
);

// ============================================================
// SAVE PROJECT
// ============================================================

function saveProject() {

    if (getSelectedObject()) {

        applyProperties(false);
    }

    updateProjectSettings();

    const data =
        JSON.stringify(
            project,
            null,
            2
        );

    downloadBlob(
        new Blob(
            [data],
            {
                type:
                    "application/json"
            }
        ),

        project.name +
        ".json"
    );
}

// ============================================================
// OPEN PROJECT
// ============================================================

async function openProject(event) {

    const file =
        event.target.files[0];


    if (!file) {
        return;
    }

    const text =
        await file.text();

    project =
        JSON.parse(text);

    selectedId =
        null;

    $("projectName").value =
        project.name;

    $("cw").value =
        project.canvas.width;

    $("ch").value =
        project.canvas.height;

    $("endpoint").value =
        project.opc.endpoint;

    $("policy").value =
        project.opc.policy;

    $("mode").value =
        project.opc.mode;

    $("user").value =
        project.opc.username || "";

    render();
}

// ============================================================
// NEW PROJECT
// ============================================================

function newProject() {

    if (
        !confirm(
            "Create a new project?"
        )
    ) {

        return;
    }

    project = {

        name:
            "MyVirtualHMI",

        canvas: {
            width: 1280,
            height: 720
        },

        opc: {

            endpoint:
                "opc.tcp://10.200.200.45:4840",

            policy:
                "Basic256Sha256",

            mode:
                "SignAndEncrypt",

            username:
                "admin"
        },

        screens: [
            {
                name:
                    "Main",

                objects:
                    []
            }
        ],

        currentScreen:
            "Main"
    };

    selectedId =
        null;


    render();
}

// ============================================================
// UNDO / REDO HISTORY
// ============================================================

function saveHistory() {

    const snapshot =
        JSON.stringify(project);

    // Don't save identical consecutive states
    if (
        undoStack.length > 0 &&
        undoStack[undoStack.length - 1] === snapshot
    ) {
        return;
    }

    undoStack.push(snapshot);

    // Limit memory usage
    if (undoStack.length > MAX_HISTORY) {
        undoStack.shift();
    }

    // A new change invalidates redo history
    redoStack = [];
}

function undo() {

    if (undoStack.length === 0) {
        return;
    }

    // Save current state for Redo
    redoStack.push(
        JSON.stringify(project)
    );

    // Restore previous state
    project =
        JSON.parse(
            undoStack.pop()
        );

    selectedId = null;
    selectedIds.clear();

    render();

    console.log("Undo");
}

function redo() {

    if (redoStack.length === 0) {
        return;
    }

    // Current state becomes undoable
    undoStack.push(
        JSON.stringify(project)
    );

    // Restore redo state
    project =
        JSON.parse(
            redoStack.pop()
        );

    selectedId = null;
    selectedIds.clear();

    render();

    console.log("Redo");
}

// ============================================================
// CREATE RUNTIME HTML
// ============================================================

function createRuntimeHTML() {

    if (getSelectedObject()) {

        applyProperties(false);
    }

    updateProjectSettings();

    const projectJSON =
        JSON.stringify(project)
            .replace(
                /</g,
                "\\u003c"
            );

    return `<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0">

<title>${project.name}</title>

<style>

body {

    margin: 0;

    background: #222;

    font-family:
        Arial,
        Helvetica,
        sans-serif;
}

#screen {

    position: relative;

    margin: auto;

    background: #d8eeee;

    overflow: hidden;
}

.runtime-object {

    position: absolute;

    display: flex;

    align-items: center;

    justify-content: center;

    box-sizing: border-box;
}

@keyframes hmiBlink {

    0% {
        opacity: 1;
    }

    50% {
        opacity: var(--blink-opacity, 0.2);
    }

    100% {
        opacity: 1;
    }
}

.blink-active {

    animation:
        hmiBlink
        var(--blink-speed, 0.8s)
        infinite;
}

.panel {
    border: 1px solid #c5cdd3;

    border-radius: 4px;

    box-sizing: border-box;
}

.button,
.nav,
.toggle {

    border:
        2px outset #d8eeee;

    cursor: pointer;

    touch-action: none;
}

.button:active,
.toggle:active {

    border:
        2px inset #d8eeee;
}

.num,
.input {

    border:
        1px solid #222;
}

.lamp {

    border-radius: 50%;

    border:
        2px solid #333;
}

.gauge {

    border-radius: 50%;

    border:
        8px solid #34495e;
}

.alarm {

    border:
        1px solid black;

    font-weight: bold;
}

.trend {

    border:
        1px solid #555;
}

</style>

</head>

<body>

<div id="screen"></div>

<script>

const project =
    ${projectJSON};


let currentScreen =
    project.currentScreen;

// Contains the newest values received
// from the PLC.

let latestValues = {};

// ==========================================================
// DRAW SCREEN
// ==========================================================

function renderScreen() {

    const screen =
        project.screens.find(
            s =>
                s.name ===
                currentScreen
        );

    const root =
        document.getElementById(
            "screen"
        );

    root.innerHTML =
        "";

    root.style.width =
        project.canvas.width +
        "px";

    root.style.height =
        project.canvas.height +
        "px";

    screen.objects.forEach(
        obj => {

            let element;

            if (
                obj.type ===
                "input"
            ) {

                element =
                    document.createElement(
                        "input"
                    );

                element.value =
                    obj.text;

            }

            else {

                element =
                    document.createElement(
                        "div"
                    );

                element.innerText =
                    obj.text;
            }

            element.className =
                "runtime-object " +
                obj.type;

            element.style.left =
                obj.x + "px";

            element.style.top =
                obj.y + "px";

            element.style.width =
                obj.w + "px";

            element.style.height =
                obj.h + "px";

            element.style.background =
                obj.bg;

            element.style.color =
                obj.fg;

            element.style.fontSize =
                obj.fontSize + "px";

            element.dataset.node =
                obj.node;

            element.dataset.binding =
                obj.binding;

            element.dataset.dtype =
                obj.dataType;

            element.dataset.objectId =
                obj.id;

            // ==============================================
            // NAVIGATION BUTTON
            // ==============================================

            if (
                obj.type ===
                "nav"
            ) {

                element.onclick =
                    () => {

                        if (
                            obj.navTarget
                        ) {

                            currentScreen =
                                obj.navTarget;

                            renderScreen();

                            updateDisplay();
                        }

                    };
            }

            // ==============================================
            // BOOL / WRITE BUTTONS
            // ==============================================

            if (
                obj.type ===
                "button" ||
                obj.type ===
                "toggle"
            ) {

                configureButton(
                    element,
                    obj
                );
            }

            // ==============================================
            // NUMERIC INPUT
            // ==============================================

            if (
                obj.type ===
                "input"
            ) {

                element.addEventListener(
                    "change",
                    () => {

                        let value =
                            element.value;


                        if (
                            obj.dataType ===
                            "DINT"
                        ) {

                            value =
                                parseInt(
                                    value
                                );
                        }

                        else if (
                            obj.dataType ===
                            "REAL" ||
                            obj.dataType ===
                            "LREAL"
                        ) {

                            value =
                                parseFloat(
                                    value
                                );
                        }

                        writePLCValue(
                            obj.node,
                            value,
                            obj.dataType
                        );
                    }
                );
            }

            root.appendChild(
                element
            );

        }
    );
}

// ==========================================================
// CONFIGURE BUTTON BEHAVIOR
// ==========================================================

function configureButton(
    element,
    obj
) {

    if (!obj.node) {
        return;
    }

    const mode =
        obj.buttonMode ||
        "toggle";

    // ------------------------------------------------------
    // TOGGLE
    // ------------------------------------------------------

    if (
        mode ===
        "toggle"
    ) {

        element.addEventListener(
            "click",
            async () => {

                const current =
                    Boolean(
                        latestValues[
                            obj.node
                        ]
                    );

                await writePLCValue(
                    obj.node,
                    !current,
                    "BOOL"
                );
            }
        );

        return;
    }

    // ------------------------------------------------------
    // SET TRUE
    // ------------------------------------------------------

    if (
        mode ===
        "setTrue"
    ) {

        element.addEventListener(
            "click",
            () => {

                writePLCValue(
                    obj.node,
                    true,
                    "BOOL"
                );
            }
        );

        return;
    }

    // ------------------------------------------------------
    // SET FALSE
    // ------------------------------------------------------

    if (
        mode ===
        "setFalse"
    ) {

        element.addEventListener(
            "click",
            () => {

                writePLCValue(
                    obj.node,
                    false,
                    "BOOL"
                );
            }
        );

        return;
    }

    // ------------------------------------------------------
    // MOMENTARY
    // ------------------------------------------------------

    if (
        mode ===
        "momentary"
    ) {

        const press =
            event => {

                event.preventDefault();

                writePLCValue(
                    obj.node,
                    true,
                    "BOOL"
                );
            };

        const release =
            event => {

                event.preventDefault();

                writePLCValue(
                    obj.node,
                    false,
                    "BOOL"
                );
            };

        element.addEventListener(
            "pointerdown",
            press
        );

        element.addEventListener(
            "pointerup",
            release
        );

        element.addEventListener(
            "pointercancel",
            release
        );

        element.addEventListener(
            "pointerleave",
            event => {

                if (
                    event.buttons !== 0
                ) {

                    release(event);
                }
            }
        );

        return;
    }

    // ------------------------------------------------------
    // GENERIC WRITE VALUE
    // ------------------------------------------------------

    element.addEventListener(
        "click",
        () => {

            let value =
                obj.writeValue;


            if (
                obj.dataType ===
                "BOOL"
            ) {

                value =
                    String(value)
                        .toLowerCase()
                        ===
                        "true";
            }

            else if (
                obj.dataType ===
                "DINT"
            ) {

                value =
                    parseInt(value);
            }

            else if (
                obj.dataType ===
                "REAL" ||
                obj.dataType ===
                "LREAL"
            ) {

                value =
                    parseFloat(value);
            }

            writePLCValue(
                obj.node,
                value,
                obj.dataType
            );
        }
    );
}

// ==========================================================
// WRITE VALUE TO PYTHON BACKEND
// ==========================================================

async function writePLCValue(
    node,
    value,
    dataType
) {

    if (!node) {
        return;
    }

    try {

        const response =
            await fetch(
                "/api/write",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            {

                                node:
                                    node,

                                value:
                                    value,

                                dataType:
                                    dataType
                            }
                        )
                }
            );

        const result =
            await response.json();

        if (
            !result.success
        ) {

            console.error(
                "PLC write failed:",
                result.error
            );
        }

    }

    catch (error) {

        console.error(
            "PLC write error:",
            error
        );
    }
}

// ==========================================================
// GET TAG VALUES FROM PYTHON
// ==========================================================

async function updateTags() {

    try {

        const response =
            await fetch(
                "/api/tags"
            );

        latestValues =
            await response.json();


        updateDisplay();

    }

    catch (error) {

        console.error(
            "PLC read error:",
            error
        );
    }
}

// ==========================================================
// UPDATE DISPLAYED VALUES
// ==========================================================

function updateDisplay() {

    document
        .querySelectorAll(
            "[data-node]"
        )
        .forEach(
            element => {

                const node =
                    element.dataset.node;


                if (
                    !node ||
                    !(node in latestValues)
                ) {

                    return;
                }

                const value =
                    latestValues[node];

                const objectId =
                    element.dataset.objectId;

                const obj =
                    project.screens
                        .flatMap(
                            s =>
                                s.objects
                        )
                        .find(
                            o =>
                                o.id ===
                                objectId
                        );

                if (!obj) {
                    return;
                }

                // ------------------------------------------
                // INPUT
                // ------------------------------------------

                if (
                    element.tagName ===
                    "INPUT"
                ) {

                    if (
                        document.activeElement
                        !==
                        element
                    ) {

                        element.value =
                            value;
                    }

                    return;
                }

                // ------------------------------------------
                // BUTTON
                // ------------------------------------------

                if (
                    obj.type ===
                    "button" ||
                    obj.type ===
                    "toggle"
                ) {

                    if (
                        obj.dataType ===
                        "BOOL"
                    ) {

                        element.dataset.state =
                            value
                            ? "true"
                            : "false";


                        if (value) {

                            element.style.boxShadow =
                                "inset 0 0 0 4px #36a852";

                        }

                        else {

                            element.style.boxShadow =
                                "none";
                        }
                    }

                    return;
                }

                // ------------------------------------------
                // LAMP
                // ------------------------------------------

                if (
                    obj.type ===
                    "lamp"
                ) {

                    element.style.background =
                        value
                        ? "#33cc55"
                        : "#777777";

                    return;
                }

                // ------------------------------------------
                // STATUS INDICATOR
                // ------------------------------------------

                if (
                    obj.type ===
                    "status"
                ) {

                    if (obj.dataType === "BOOL") {

                        if (value) {

                            element.innerText =
                                obj.trueText ||
                                "RUNNING";

                            element.style.background =
                                obj.trueColor ||
                                "#2e9d58";

                        } else {

                            element.innerText =
                                obj.falseText ||
                                "STOPPED";

                            element.style.background =
                                obj.falseColor ||
                                "#c83b3b";
                        }

                        element.style.color =
                            "#ffffff";
                    }

                    return;
                }

                // ------------------------------------------
                // GENERIC BOOL COLOR ANIMATION
                // ------------------------------------------

                if (
                    obj.animateColor === true &&
                    obj.dataType === "BOOL"
                ) {

                    element.style.background =
                        value
                            ? (obj.trueColor || "#2e9d58")
                            : (obj.falseColor || "#c83b3b");
                }

                // ------------------------------------------
                // GENERIC BOOL VISIBILITY ANIMATION
                // ------------------------------------------

                    if (
                        obj.animateVisibility === true &&
                        obj.dataType === "BOOL"
                    ) {

                        element.style.display =
                            value
                                ? "flex"
                                : "none";
                    }

                                if (
                    obj.animateBlink === true &&
                    obj.dataType === "BOOL"
                    ) {

                    if (value) {

                        const speed =
                            obj.blinkSpeed ?? 0.8;

                        const opacity =
                            obj.blinkOpacity ?? 0.2;


                        element.style.setProperty(
                            "--blink-speed",
                            speed + "s"
                        );

                        element.style.setProperty(
                            "--blink-opacity",
                            opacity
                        );

                        element.classList.add(
                            "blink-active"
                        );

                    } else {

                        element.classList.remove(
                            "blink-active"
                        );

                        element.style.opacity =
                            "1";
                    }
                }

                // ------------------------------------------
                // EVERYTHING ELSE
                // ------------------------------------------

                let displayValue =
                    value;

                if (
                    obj.units
                ) {

                    displayValue +=
                        " " +
                        obj.units;
                }

                element.innerText =
                    displayValue;

            }
        );
}

// ==========================================================
// START RUNTIME
// ==========================================================

renderScreen();

updateTags();

setInterval(
    updateTags,
    250
);

<\/script>

</body>

</html>`;
}

// ============================================================
// PREVIEW
// ============================================================

function previewRuntime() {

    const html =
        createRuntimeHTML();

    const blob =
        new Blob(
            [html],
            {
                type:
                    "text/html"
            }
        );

    const url =
        URL.createObjectURL(
            blob
        );

    $("previewFrame").src =
        url;

    $("previewModal").hidden =
        false;
}

// ============================================================
// EXPORT
// ============================================================

function exportRuntime() {

    if (getSelectedObject()) {

        applyProperties(false);
    }

    updateProjectSettings();

    const html =
        createRuntimeHTML();

    downloadBlob(

        new Blob(
            [html],
            {
                type:
                    "text/html"
            }
        ),

        "index.html"
    );

    downloadBlob(

        new Blob(
            [
                JSON.stringify(
                    project,
                    null,
                    2
                )
            ],

            {
                type:
                    "application/json"
            }
        ),

        "project.json"
    );

    alert(
        "Runtime exported successfully."
    );
}

// ============================================================
// DOWNLOAD
// ============================================================

function downloadBlob(
    blob,
    filename
) {

    const link =
        document.createElement(
            "a"
        );

    const url =
        URL.createObjectURL(
            blob
        );

    link.href =
        url;

    link.download =
        filename;

    link.click();

    setTimeout(
        () =>
            URL.revokeObjectURL(
                url
            ),
        1000
    );
}

// ============================================================
// EVENTS
// ============================================================

document
    .querySelectorAll(
        ".tool"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () =>
                    createObject(
                        button.dataset.t
                    )
            );

        }
    );

canvas.addEventListener(
    "pointerdown",
    event => {

        if (
            event.target ===
            canvas
        ) {

            selectObject(null);
        }

    }
);

canvas.addEventListener(
    "mousemove",
    event => {

        const rect =
            canvas.getBoundingClientRect();

        $("mouseStatus").innerText =
            "X: " +
            Math.round(
                event.clientX -
                rect.left
            )
            +
            " Y: "
            +
            Math.round(
                event.clientY -
                rect.top
            );
    }
);

$("apply").onclick =
    () =>
        applyProperties(true);

$("delBtn").onclick =
    deleteSelected;

$("dupBtn").onclick =
    duplicateSelected;

$("frontBtn").onclick =
    () => {

        const obj =
            getSelectedObject();

        if (!obj) {
            return;
        }

        obj.z =
            ++zCounter;

        render();
    };

$("backBtn").onclick =
    () => {

        const obj =
            getSelectedObject();

        if (!obj) {
            return;
        }

        obj.z =
            0;

        render();
    };

$("addScreen").onclick =
    addScreen;

$("renameScreen").onclick =
    renameScreen;

$("screenSel").onchange =
    event => {

        project.currentScreen =
            event.target.value;

        selectedId =
            null;

        render();
    };

$("grid").onchange =
    () => {

        canvas.classList.toggle(
            "grid",
            $("grid").checked
        );
    };

$("zoom").onchange =
    () => {

        canvas.style.transform =
            "scale(" +
            $("zoom").value +
            ")";

        canvas.style.transformOrigin =
            "top left";
    };

$("saveBtn").onclick =
    saveProject;

$("openFile").onchange =
    openProject;

$("newBtn").onclick =
    newProject;

$("previewBtn").onclick =
    previewRuntime;

$("closePreview").onclick =
    () => {

        $("previewModal").hidden =
            true;
    };

$("exportBtn").onclick =
    exportRuntime;

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

document.addEventListener(
    "keydown",
    event => {

        // Don't trigger builder shortcuts while typing
        // inside an input/select field.
        const active =
            document.activeElement;

        const typing =
            active &&
            (
                active.tagName === "INPUT" ||
                active.tagName === "TEXTAREA" ||
                active.tagName === "SELECT"
            );

        // DELETE
        if (
            event.key === "Delete" &&
            !typing
        ) {

            deleteSelected();
        }

        // ESCAPE = CLEAR SELECTION
        if (
            event.key === "Escape" &&
            !typing
        ) {

            event.preventDefault();

            clearSelection();
        }

        // CTRL + Z = UNDO
if (
    event.ctrlKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === "z" &&
    !typing
) {

    event.preventDefault();

    undo();
}

        // CTRL + Y = REDO
        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "y" &&
            !typing
        ) {

            event.preventDefault();

            redo();
        }

        // CTRL + SHIFT + Z = REDO
        if (
            event.ctrlKey &&
            event.shiftKey &&
            event.key.toLowerCase() === "z" &&
            !typing
        ) {

            event.preventDefault();

            redo();
        }

        // CTRL + C
        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "c" &&
            !typing
        ) {

            event.preventDefault();

            copySelected();
        }

        // CTRL + V
        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "v" &&
            !typing
        ) {

            event.preventDefault();

            pasteObject();
        }

        // CTRL + X
        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "x" &&
            !typing
        ) {

            event.preventDefault();

            cutSelected();
        }

        // CTRL + D
        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "d" &&
            !typing
        ) {

            event.preventDefault();

            duplicateSelected();
        }

    }
);

// ============================================================
// RUN HMI DIRECTLY FROM BUILDER
// ============================================================

async function runHMI() {

    console.log("RUN HMI clicked");

    try {

        // Save any currently edited object properties
        if (getSelectedObject()) {
            applyProperties(false);
        }

        updateProjectSettings();

        // Generate the actual runtime HTML
        const runtimeHTML =
            createRuntimeHTML();

        // Send BOTH project JSON and runtime HTML
        // to builder_server.py

        const saveResponse = await fetch(
            "/api/save-runtime",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    project: project,
                    runtimeHTML: runtimeHTML
                })
            }
        );

        const saveResult =
            await saveResponse.json();

        console.log(
            "Save runtime:",
            saveResult
        );

        if (!saveResult.success) {

            alert(
                "Could not build HMI runtime."
            );

            return;
        }

        // Start runtime_server.py

        const opcPassword =
            $("password").value;

        const startResponse = await fetch(
            "/api/start-runtime",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    password: opcPassword
                })
            }
        );

        const startResult =
            await startResponse.json();

        if (!startResult.success) {

            alert(
                "Could not start HMI runtime."
            );

            return;
        }

        // Open actual runtime HMI

        setTimeout(
            () => {

                window.open(
                    "http://localhost:8000",
                    "_blank"
                );

            },
            1200
        );

    }

    catch (error) {

        console.error(
            "RUN HMI ERROR:",
            error
        );

        alert(
            "Could not run HMI. Check browser console."
        );
    }
}

// ============================================================
// STOP HMI
// ============================================================

async function stopHMI() {

    console.log("STOP HMI clicked");

    try {

        const response = await fetch(
            "/api/stop-runtime",
            {
                method: "POST"
            }
        );

        const result =
            await response.json();

        console.log(
            "Stop runtime result:",
            result
        );

    }

    catch (error) {

        console.error(
            "STOP HMI ERROR:",
            error
        );
    }
}

// ============================================================
// BUTTON EVENTS
// ============================================================

$("runBtn").onclick =
    runHMI;

$("stopBtn").onclick =
    stopHMI;

// ============================================================
// START BUILDER
// ============================================================

render();