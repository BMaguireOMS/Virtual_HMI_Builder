const $ = (id) => document.getElementById(id);

const canvas = $("canvas");


// ============================================================
// DEFAULT OBJECT TYPES
// ============================================================

const defaults = {

    label: {
        text: "Label",
        w: 160,
        h: 40,
        bg: "#d8eeee",
        fg: "#111111"
    },

    button: {
        text: "START",
        w: 120,
        h: 55,
        bg: "#9fcfcf",
        fg: "#111111"
    },

    num: {
        text: "0.0",
        w: 140,
        h: 50,
        bg: "#9fcfcf",
        fg: "#111111"
    },

    input: {
        text: "0.0",
        w: 140,
        h: 50,
        bg: "#ffffff",
        fg: "#111111"
    },

    lamp: {
        text: "",
        w: 50,
        h: 50,
        bg: "#777777",
        fg: "#111111"
    },

    toggle: {
        text: "TOGGLE",
        w: 110,
        h: 50,
        bg: "#9fcfcf",
        fg: "#111111"
    },

    gauge: {
        text: "0",
        w: 120,
        h: 120,
        bg: "#ffffff",
        fg: "#111111"
    },

    bar: {
        text: "0 %",
        w: 200,
        h: 45,
        bg: "#dddddd",
        fg: "#111111"
    },

    alarm: {
        text: "NO ACTIVE ALARMS",
        w: 380,
        h: 42,
        bg: "#ffea00",
        fg: "#111111"
    },

    trend: {
        text: "TREND",
        w: 320,
        h: 180,
        bg: "#111111",
        fg: "#66ff66"
    },

    image: {
        text: "IMAGE",
        w: 180,
        h: 120,
        bg: "#eeeeee",
        fg: "#333333"
    },

    nav: {
        text: "NEXT",
        w: 110,
        h: 50,
        bg: "#9fcfcf",
        fg: "#111111"
    }
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
// CREATE OBJECT
// ============================================================

function createObject(type) {

    const d = defaults[type];

    const obj = {

        id: uid(),

        type: type,

        name:
            type +
            "_" +
            (currentScreen().objects.length + 1),

        text: d.text,

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


    currentScreen().objects.push(obj);

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

    element.style.background =
        obj.bg;

    element.style.color =
        obj.fg;

    element.style.fontSize =
        obj.fontSize + "px";


    element.innerText =
        obj.text +
        (
            obj.units
                ? " " + obj.units
                : ""
        );


    const resizeHandle =
        document.createElement("div");

    resizeHandle.className =
        "handle";


    element.appendChild(
        resizeHandle
    );


    element.addEventListener(
        "pointerdown",
        event =>
            beginDrag(
                event,
                obj,
                element
            )
    );


    resizeHandle.addEventListener(
        "pointerdown",
        event =>
            beginResize(
                event,
                obj,
                element
            )
    );


    canvas.appendChild(
        element
    );
}


// ============================================================
// SELECTION
// ============================================================

function selectObject(id) {

    selectedId = id;


    document
        .querySelectorAll(".obj")
        .forEach(element => {

            element.classList.toggle(
                "selected",
                element.dataset.id === id
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
            "No selection";

        return;
    }


    $("selectionStatus").innerText =
        "Selected: " + obj.name;


    updatePropertyPanel();
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
// DRAG
// ============================================================

function beginDrag(
    event,
    obj,
    element
) {

    if (
        event.target.classList.contains(
            "handle"
        )
    ) {
        return;
    }


    event.preventDefault();
    event.stopPropagation();


    selectObject(obj.id);


    const startX =
        event.clientX;

    const startY =
        event.clientY;


    const originalX =
        obj.x;

    const originalY =
        obj.y;


    function move(event) {

        obj.x =
            snapValue(
                originalX +
                event.clientX -
                startX
            );

        obj.y =
            snapValue(
                originalY +
                event.clientY -
                startY
            );


        element.style.left =
            obj.x + "px";

        element.style.top =
            obj.y + "px";


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
// RESIZE
// ============================================================

function beginResize(
    event,
    obj,
    element
) {

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

    if (!selectedId) {
        return;
    }


    currentScreen().objects =
        currentScreen()
            .objects
            .filter(
                obj =>
                    obj.id !== selectedId
            );


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

        if (
            event.key ===
            "Delete"
        ) {

            deleteSelected();
        }


        if (
            event.ctrlKey &&
            event.key.toLowerCase() ===
            "d"
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

        const startResponse = await fetch(
            "/api/start-runtime",
            {
                method: "POST"
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