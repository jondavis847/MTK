JSAT = {
    sc: {},
    sim:{
        tspan: "(0,10)"
    },
};

let SPACECRAFT // current spacecraft
let SPACECRAFT_DIV //current spacecraft div
let COMPONENT // current component 
let COMPONENT_BUTTON //current component button

function init() {
    document.getElementById('connect_button').onclick = function () { connectToJsat('connect'); };
    document.getElementById('simulate_button').onclick = function () { connectToJsat('simulate'); };
    document.getElementById('plot_state').onclick = function () { connectToJsat('plot'); };
    document.getElementById('sim_start_time').onblur = getSimOptions;
    document.getElementById('sim_stop_time').onblur = getSimOptions;
    loadSavedSpacecraft()
}
window.onload = init;

function connectToJsat(type) {
    var log = document.getElementById('console_log');
    switch (type) {
        case 'connect':
            // Create WebSocket connection.    
            log.value += '\nconnecting to jsat...';
            socket = new WebSocket("ws://127.0.0.1:8081");

            // Connection errored
            socket.addEventListener("error", (event) => {
                log.value += 'websocket error :('
            });

            // Connection opened
            socket.addEventListener("open", (event) => {
                log.value += 'done!';
                var status = document.getElementById('connect_status');
                status.innerHTML = "connected";
                status.style.color = "lime";
            });
            // Connection closed
            socket.addEventListener("close", (event) => {
                log.value += '\nwebsocket closed!';
                var status = document.getElementById('connect_status');
                status.innerHTML = "disconnected";
                status.style.color = "crimson";
            });

            // Listen for messages
            socket.addEventListener("message", (event) => {
                var obj = JSON.parse(event.data)
                switch (obj.type) {
                    case 'console':
                        log.value += '\n' + (obj.data);
                        break;
                    case 'data':
                        log.value += '\nreceived data from jsat server';
                        log.value += '\nplotting...';
                        jsat_plot(obj.data)
                        log.value += 'done!';
                        break;
                    case 'states':
                        log.value += '\nreceived states from jsat server';
                        var select = document.getElementById("state_select");
                        var data = obj.data;
                        for (let i of data.sort()) {
                            var opt = document.createElement('option')
                            opt.value = i;
                            opt.innerHTML = i;
                            select.appendChild(opt);
                        }
                        break;
                }
            });
            break;
        case 'simulate':
            socket.send(JSON.stringify({ "type": "simulate", "data": {"sim":JSAT.sim, "sc": JSAT.sc } }))
            break;
        case 'plot':
            var select = document.getElementById("state_select");
            socket.send(JSON.stringify({ "type": "plot", "data": select.value }))
            break;
    }
}

function getSimOptions() {
    tstart = document.getElementById("sim_start_time").value;
    tstop = document.getElementById("sim_stop_time").value;
    JSAT.sim.tspan = `(${tstart},${tstop})`;
    console.log(JSAT)
}
function jsat_plot(data) {
    var x_data = data.time;
    var y_data = data.data;
    var name = data.name;
    // Check if array of arrays
    if (Array.isArray(y_data[0])) {
        var data = [];
        for (let i = 0; i < y_data[0].length; i++) {
            data.push({ x: x_data, y: y_data.map(x => x[i]), xaxis: 'x' + (i + 1), yaxis: 'y' + (i + 1), mode: "lines", type: "scatter" })
        }
    } else {
        var data = [{ x: x_data, y: y_data, mode: "lines" }]
    }

    // Define Layout
    var layout = {
        title: name,
        grid: { rows: y_data[0].length, columns: 1, pattern: 'independent' },
        template: plotlyDark,
    };
    console.log("Plotting")
    Plotly.newPlot("plots", data, layout, { scrollZoom: true });
}

function changeTab(evt, newTab) {
    // Declare all variables
    var i, tabcontent, tablinks;

    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tab_links");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active_border");
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(newTab).style.display = "block";
    evt.currentTarget.classList.add("active_border");
}

// called when user clicks +spacecraft, prompts user for the name, will save and add component on enter or click
function addSpacecraft() {
    document.getElementById("spacecraft_popup").style.display = "block";
    document.getElementById("add_spacecraft_button").classList.add("active");
    document.getElementById("spacecraft_name").focus();
}

// called when used saves the +spacecraft prompt, adds the forms for user input for spacecraft params
function saveSpacecraft() {
    //create new spacecraft button
    const button = document.createElement('button');
    const name = document.getElementById('spacecraft_name').value;
    button.innerText = name;
    button.className = "spacecraft_buttons";

    //place button in div
    document.getElementById("spacecraft_builder_div").appendChild(button);
    //hide the popup
    document.getElementById("spacecraft_popup").style.display = "none";
    //deactivate button
    document.getElementById("add_spacecraft_button").classList.remove("active");
    //reset input field
    document.getElementById("spacecraft_name").value = "enter name";

    //create div for new spacecraft to add components
    const new_div = document.createElement('div');
    const div_id = name.concat("_div");
    new_div.id = div_id;
    new_div.classList.add("component_div");
    document.getElementById("component_builder_div").appendChild(new_div);
    //onclick to switch component divs between spacecraft
    button.onclick = function () {
        //display none all component_divs
        comp_divs = document.getElementsByClassName("component_div");
        for (let i = 0; i < comp_divs.length; i++) {
            comp_divs[i].style.display = "none";
        }
        //show this sc component div
        document.getElementById(div_id).style.display = "block";
        //set global variable with active element for components to be added to
        SPACECRAFT_DIV = document.getElementById(div_id);
        //unfocus any currently active spacecraft
        scb = document.getElementsByClassName("spacecraft_buttons");
        for (let i = 0; i < scb.length; i++) {
            scb[i].classList.remove("active_border");
            scb[i].classList.add("not_active_border");
        }
        //focus new button
        button.classList.remove("not_active_border");
        button.classList.add("active_border");

        //set global sc to this sc
        //SPACECRAFT = JSAT.sc.find(x => x.name === name);
        SPACECRAFT = JSAT.sc;
    };
    var tmpSc = {
        name: name,
        body: {},
        reactionWheels: [],
        thrusters: [],
        iru: {},
        controller: {},
    }
    JSAT.sc = tmpSc; //current only 1 sc allowed    
    button.click();
}

// cancels  the +spacecraft prompt without saving
function cancelSpacecraft() {
    document.getElementById("spacecraft_popup").style.display = "none";
    document.getElementById("add_spacecraft_button").classList.remove("active");
}

//component enumeration, freeze makes it immutable
const component = Object.freeze({
    body: Symbol(1),
    reactionWheel: Symbol(2),
    thruster: Symbol(3),
    iru: Symbol(4),
    controller: Symbol(5)
})

function component_menu() {
    cm = document.getElementById("component_menu");
    if (cm.style.display == "none" || cm.style.display == "") {
        cm.style.display = "block";
    } else if (cm.style.display == "block") {
        cm.style.display = "none";
    }
}

function cancelComponentMenu() {
    document.getElementById("component_menu").style.display = "none";
}

function cancelComponentPopup() {
    document.getElementById("component_popup").style.display = "none";
}

function addComponentInput(table, name, attr, value, comp) { // change comp to enum
    var tr = document.createElement("tr");

    //create label    
    var td1 = document.createElement("td");
    var l = document.createElement("label");
    l.setAttribute('for', `${comp}_${name}`);
    l.innerHTML = name;
    l.classList.add("form_font");
    var brl = document.createElement("br");
    td1.appendChild(l);
    td1.appendChild(brl);

    //create input    
    var td2 = document.createElement("td2");
    var i = document.createElement("input");
    i.setAttribute('type', "text");
    i.id = `${comp}_${name}`;
    i.setAttribute(attr, value);
    i.classList.add("form_input");
    var bri = document.createElement("br");
    td2.appendChild(i);
    td2.appendChild(bri);

    //append to table
    tr.appendChild(td1);
    tr.appendChild(td2);
    table.appendChild(tr);

    //add onblur event caller to update global SC
    i.onblur = function () {
        COMPONENT[name] = i.value;
        //if this is name property, update the button text
        if (name === "name") {
            COMPONENT_BUTTON.innerText = i.value;
        }
    }
}

function addComponent(componentType) {

    const name = document.getElementById('component_name').value;

    //create new component button
    const button = document.createElement('button');
    button.innerText = name;
    button.id = `${SPACECRAFT.name}_${name}`;
    button.className = "component_buttons";

    //add button to current spacecraft div
    SPACECRAFT_DIV.appendChild(button);
    //hide the popup
    document.getElementById("component_popup").style.display = "none";
    //deactivate button
    document.getElementById("add_component_button").classList.remove("active");
    //reset input field
    document.getElementById("component_name").value = "enter name"; // make placeholder?

    //create div for new component
    const newDiv = document.createElement('div');
    const div_id = name.concat("_div");
    newDiv.id = div_id;
    newDiv.classList.add("component_details_form_div");

    //add component to global SC
    switch (componentType) {
        case component.body:
            var tmp = {
                name: name,
                ixx: "",
                iyy: "",
                izz: "",
                ixy: "",
                ixz: "",
                iyz: "",
                q: "",
                w: "",
                r: "",
                v: "",
            }
            SPACECRAFT.body = tmp;
            break;
        case component.reactionWheel:
            var tmp = {
                name: name,
                J: "",
                kt: "",
                a: "",
                w: "",
            }
            SPACECRAFT.reactionWheels.push(tmp);
            break;
        case component.thruster:
            var tmp = {
                name: name,
                F: "",
                r: "",
                R: "",
            }
            SPACECRAFT.thrusters.push(tmp);
            break;
        case component.iru:
            var tmp = {
                name: name,
                sigma: "",
            }
            SPACECRAFT.iru = tmp;
            break;
        case component.controller:
            var tmp = {
                name: name,
            }
            SPACECRAFT.controller = tmp;
            break;
    }
    button.component = tmp;
    var t = tableFromObject(tmp);
    newDiv.appendChild(t); //append table made in add<Component>()

    var c = document.createElement("button"); //input element, Submit button    
    c.innerText = "close";
    c.classList.add("saveComponentDetailsButton")
    c.onclick = function () {
        document.getElementById(div_id).style.display = "none";
        button.classList.remove("active_border");
        button.classList.add("not_active_border");
    }
    newDiv.appendChild(c);

    document.getElementById("component_details_div").appendChild(newDiv);

    //change the name field to the current name
    document.getElementById(`${name}_name`).value = name;

    //onclick to switch component divs between spacecraft
    button.onclick = function () {
        var comp_divs = document.getElementsByClassName("component_details_form_div");
        for (let i = 0; i < comp_divs.length; i++) {
            comp_divs[i].style.display = "none";
        }
        document.getElementById(div_id).style.display = "block";
        //deactivate any currently active component
        var scb = document.getElementsByClassName("component_buttons");
        for (let i = 0; i < scb.length; i++) {
            scb[i].classList.remove("active_border");
            scb[i].classList.add("not_active_border");
        }
        //focus new button
        button.classList.remove("not_active_border");
        button.classList.add("active_border");

        //set global component
        COMPONENT = button.component;        
        COMPONENT_BUTTON = button;
    };
    button.click();
}

function tableFromObject(object) {
    var t = document.createElement("table");
    t.classList.add("table");

    var k = Object.keys(object);
    for (let i = 0; i < k.length; i++) {
        addComponentInput(t, k[i], 'placeholder', `enter ${k[i]}`, object.name); //change body to enum    
    }
    return t;
}

function addBody() {
    document.getElementById("component_menu").style.display = "none";
    document.getElementById("component_popup").style.display = "block";
    document.getElementById("component_name").focus();
    document.getElementById("add_component_save_button").onclick = addComponent.bind(this, component.body);
}

function addRw() {
    document.getElementById("component_menu").style.display = "none";
    document.getElementById("component_popup").style.display = "block";
    document.getElementById("component_name").focus();
    document.getElementById("add_component_save_button").onclick = addComponent.bind(this, component.reactionWheel);
}

function addThr() {
    document.getElementById("component_menu").style.display = "none";
    document.getElementById("component_popup").style.display = "block";
    document.getElementById("component_name").focus();
    document.getElementById("add_component_save_button").onclick = addComponent.bind(this, component.thruster);
}

function addIru() {
    document.getElementById("component_menu").style.display = "none";
    document.getElementById("component_popup").style.display = "block";
    document.getElementById("component_name").focus();
    document.getElementById("add_component_save_button").onclick = addComponent.bind(this, component.iru);
}

function addController() {
    document.getElementById("component_menu").style.display = "none";
    document.getElementById("component_popup").style.display = "block";
    document.getElementById("component_name").focus();
    document.getElementById("add_component_save_button").onclick = addComponent.bind(this, component.controller);
}

// just loads the options from savedSpacecraft when the window loads and adds it to the loadselect
function loadSavedSpacecraft() {
    var select = document.getElementById("spacecraft_loader_select");
    for (let i=0;i<savedSpacecraft.length;i++){
        var option = document.createElement("option");
        option.text = savedSpacecraft[i].name;        
        option.value = i;        
        select.add(option)
    }
}

//actually loads the selected savedSpacecraft into the console and makes buttons
function loadSpacecraft() {
    scIndex = document.getElementById("spacecraft_loader_select").value;
    sc = savedSpacecraft[scIndex].sc;    
    addSpacecraft()
    document.getElementById("spacecraft_name").value = savedSpacecraft[scIndex].name;
    saveSpacecraft()

    //add the body
    addBody()
    document.getElementById("component_name").value = sc.body.name;
    addComponent(component.body);
    populateInputFields(sc.body);
    
    //add the rws
    for (let i=0;i<sc.reactionwheels.length;i++) {        
        addRw()
        document.getElementById("component_name").value = sc.reactionwheels[i].name;
        addComponent(component.reactionWheel);
        populateInputFields(sc.reactionwheels[i]);
    }    

    //add the thrusters
    for (let i=0;i<sc.thrusters.length;i++) {
        addThr()
        document.getElementById("component_name").value = sc.thrusters[i].name;
        addComponent(component.thruster);
        populateInputFields(sc.thrusters[i]);
    }    
    
    //add the iru    
    addIru()
    document.getElementById("component_name").value = sc.iru.name;
    addComponent(component.iru);
    populateInputFields(sc.iru);  

    //add the controller    
    addController()
    document.getElementById("component_name").value = sc.controller.name;
    addComponent(component.controller);
    populateInputFields(sc.controller);  

    console.log(JSAT.sc)
}

//takes fields from savedSpacecraft components and populates thier component fields when loaded
function populateInputFields(comp) {
    k = Object.keys(comp);
    for (let i=0;i<k.length;i++) {
        //focus first so that onblur will populate JSAT.sc
        document.getElementById(`${comp.name}_${k[i]}`).focus()       
        //replace input field text with the savedSpacecraft values         
        document.getElementById(`${comp.name}_${k[i]}`).value = comp[k[i]];   
        //blur the field so that it updates SPACECRAFT and JSAT.sc
        document.getElementById(`${comp.name}_${k[i]}`).blur()
    } 
}

const savedSpacecraft = [
    {
        name: "fake_pace",
        sc: {
            body: {
                name: "body",
                ixx: "1000",
                iyy: "1000",
                izz: "1000",
                ixy: "0",
                ixz: "0",
                iyz: "0",
                q: "[0, 0, 0, 1]",
                w: "zeros(3)",
                r: "[-3.9292738554734, 5.71264013167723, 1.31199443874228]*1e6",
                v: "[84.5551344721184, 1749.4937756303016, -7311.912202797997]",
            },
            reactionwheels: [
                {
                    name: "rw1",
                    J: "0.25",
                    kt: "0.075",
                    a: "[1, 0, 0]",
                    w: "0",
                },
                {
                    name: "rw2",
                    J: "0.25",
                    kt: "0.075",
                    a: "[0, 1, 0]",
                    w: "0",
                },
                {
                    name: "rw3",
                    J: "0.25",
                    kt: "0.075",
                    a: "[0, 0, 1]",
                    w: "0",
                },
            ],
            thrusters: [
                {
                    name: "thr1",
                    F: "1",
                    r: "[1, 0, -1]",
                    R: "[0 1 0; 1 0 0; 0 0 1]"
                },
                {
                    name: "thr2",
                    F: "1",
                    r: "[-1, 0, 1]",
                    R: "[0 1 0; 1 0 0; 0 0 1]"
                },
                {
                    name: "thr3",
                    F: "1",
                    r: "[0, 1, -1]",
                    R: "[0 1 0; 1 0 0; 0 0 1]"
                },
                {
                    name: "thr4",
                    F: "1",
                    r: "[0, -1, -1]",
                    R: "[0 1 0; 1 0 0; 0 0 1]"
                },
            ],
            iru: {
                name: "iru",
                sigma: "0.01",
            },
            controller: {
                name: "controller"
            },
        }
    }
]





const plotlyDark = {
    "data": {
        "barpolar": [
            {
                "marker": {
                    "line": {
                        "color": "rgb(17,17,17)",
                        "width": 0.5
                    },
                    "pattern": {
                        "fillmode": "overlay",
                        "size": 10,
                        "solidity": 0.2
                    }
                },
                "type": "barpolar"
            }
        ],
        "bar": [
            {
                "error_x": {
                    "color": "#f2f5fa"
                },
                "error_y": {
                    "color": "#f2f5fa"
                },
                "marker": {
                    "line": {
                        "color": "rgb(17,17,17)",
                        "width": 0.5
                    },
                    "pattern": {
                        "fillmode": "overlay",
                        "size": 10,
                        "solidity": 0.2
                    }
                },
                "type": "bar"
            }
        ],
        "carpet": [
            {
                "aaxis": {
                    "endlinecolor": "#A2B1C6",
                    "gridcolor": "#506784",
                    "linecolor": "#506784",
                    "minorgridcolor": "#506784",
                    "startlinecolor": "#A2B1C6"
                },
                "baxis": {
                    "endlinecolor": "#A2B1C6",
                    "gridcolor": "#506784",
                    "linecolor": "#506784",
                    "minorgridcolor": "#506784",
                    "startlinecolor": "#A2B1C6"
                },
                "type": "carpet"
            }
        ],
        "choropleth": [
            {
                "colorbar": {
                    "outlinewidth": 0,
                    "ticks": ""
                },
                "type": "choropleth"
            }
        ],
        "contourcarpet": [
            {
                "colorbar": {
                    "outlinewidth": 0,
                    "ticks": ""
                },
                "type": "contourcarpet"
            }
        ],
        "contour": [
            {
                "colorbar": {
                    "outlinewidth": 0,
                    "ticks": ""
                },
                "colorscale": [
                    [
                        0.0,
                        "#0d0887"
                    ],
                    [
                        0.1111111111111111,
                        "#46039f"
                    ],
                    [
                        0.2222222222222222,
                        "#7201a8"
                    ],
                    [
                        0.3333333333333333,
                        "#9c179e"
                    ],
                    [
                        0.4444444444444444,
                        "#bd3786"
                    ],
                    [
                        0.5555555555555556,
                        "#d8576b"
                    ],
                    [
                        0.6666666666666666,
                        "#ed7953"
                    ],
                    [
                        0.7777777777777778,
                        "#fb9f3a"
                    ],
                    [
                        0.8888888888888888,
                        "#fdca26"
                    ],
                    [
                        1.0,
                        "#f0f921"
                    ]
                ],
                "type": "contour"
            }
        ],
        "heatmapgl": [
            {
                "colorbar": {
                    "outlinewidth": 0,
                    "ticks": ""
                },
                "colorscale": [
                    [
                        0.0,
                        "#0d0887"
                    ],
                    [
                        0.1111111111111111,
                        "#46039f"
                    ],
                    [
                        0.2222222222222222,
                        "#7201a8"
                    ],
                    [
                        0.3333333333333333,
                        "#9c179e"
                    ],
                    [
                        0.4444444444444444,
                        "#bd3786"
                    ],
                    [
                        0.5555555555555556,
                        "#d8576b"
                    ],
                    [
                        0.6666666666666666,
                        "#ed7953"
                    ],
                    [
                        0.7777777777777778,
                        "#fb9f3a"
                    ],
                    [
                        0.8888888888888888,
                        "#fdca26"
                    ],
                    [
                        1.0,
                        "#f0f921"
                    ]
                ],
                "type": "heatmapgl"
            }
        ],
        "heatmap": [
            {
                "colorbar": {
                    "outlinewidth": 0,
                    "ticks": ""
                },
                "colorscale": [
                    [
                        0.0,
                        "#0d0887"
                    ],
                    [
                        0.1111111111111111,
                        "#46039f"
                    ],
                    [
                        0.2222222222222222,
                        "#7201a8"
                    ],
                    [
                        0.3333333333333333,
                        "#9c179e"
                    ],
                    [
                        0.4444444444444444,
                        "#bd3786"
                    ],
                    [
                        0.5555555555555556,
                        "#d8576b"
                    ],
                    [
                        0.6666666666666666,
                        "#ed7953"
                    ],
                    [
                        0.7777777777777778,
                        "#fb9f3a"
                    ],
                    [
                        0.8888888888888888,
                        "#fdca26"
                    ],
                    [
                        1.0,
                        "#f0f921"
                    ]
                ],
                "type": "heatmap"
            }
        ],
        "histogram2dcontour": [
            {
                "colorbar": {
                    "outlinewidth": 0,
                    "ticks": ""
                },
                "colorscale": [
                    [
                        0.0,
                        "#0d0887"
                    ],
                    [
                        0.1111111111111111,
                        "#46039f"
                    ],
                    [
                        0.2222222222222222,
                        "#7201a8"
                    ],
                    [
                        0.3333333333333333,
                        "#9c179e"
                    ],
                    [
                        0.4444444444444444,
                        "#bd3786"
                    ],
                    [
                        0.5555555555555556,
                        "#d8576b"
                    ],
                    [
                        0.6666666666666666,
                        "#ed7953"
                    ],
                    [
                        0.7777777777777778,
                        "#fb9f3a"
                    ],
                    [
                        0.8888888888888888,
                        "#fdca26"
                    ],
                    [
                        1.0,
                        "#f0f921"
                    ]
                ],
                "type": "histogram2dcontour"
            }
        ],
        "histogram2d": [
            {
                "colorbar": {
                    "outlinewidth": 0,
                    "ticks": ""
                },
                "colorscale": [
                    [
                        0.0,
                        "#0d0887"
                    ],
                    [
                        0.1111111111111111,
                        "#46039f"
                    ],
                    [
                        0.2222222222222222,
                        "#7201a8"
                    ],
                    [
                        0.3333333333333333,
                        "#9c179e"
                    ],
                    [
                        0.4444444444444444,
                        "#bd3786"
                    ],
                    [
                        0.5555555555555556,
                        "#d8576b"
                    ],
                    [
                        0.6666666666666666,
                        "#ed7953"
                    ],
                    [
                        0.7777777777777778,
                        "#fb9f3a"
                    ],
                    [
                        0.8888888888888888,
                        "#fdca26"
                    ],
                    [
                        1.0,
                        "#f0f921"
                    ]
                ],
                "type": "histogram2d"
            }
        ],
        "histogram": [
            {
                "marker": {
                    "pattern": {
                        "fillmode": "overlay",
                        "size": 10,
                        "solidity": 0.2
                    }
                },
                "type": "histogram"
            }
        ],
        "mesh3d": [
            {
                "colorbar": {
                    "outlinewidth": 0,
                    "ticks": ""
                },
                "type": "mesh3d"
            }
        ],
        "parcoords": [
            {
                "line": {
                    "colorbar": {
                        "outlinewidth": 0,
                        "ticks": ""
                    }
                },
                "type": "parcoords"
            }
        ],
        "pie": [
            {
                "automargin": true,
                "type": "pie"
            }
        ],
        "scatter3d": [
            {
                "line": {
                    "colorbar": {
                        "outlinewidth": 0,
                        "ticks": ""
                    }
                },
                "marker": {
                    "colorbar": {
                        "outlinewidth": 0,
                        "ticks": ""
                    }
                },
                "type": "scatter3d"
            }
        ],
        "scattercarpet": [
            {
                "marker": {
                    "colorbar": {
                        "outlinewidth": 0,
                        "ticks": ""
                    }
                },
                "type": "scattercarpet"
            }
        ],
        "scattergeo": [
            {
                "marker": {
                    "colorbar": {
                        "outlinewidth": 0,
                        "ticks": ""
                    }
                },
                "type": "scattergeo"
            }
        ],
        "scattergl": [
            {
                "marker": {
                    "line": {
                        "color": "#283442"
                    }
                },
                "type": "scattergl"
            }
        ],
        "scattermapbox": [
            {
                "marker": {
                    "colorbar": {
                        "outlinewidth": 0,
                        "ticks": ""
                    }
                },
                "type": "scattermapbox"
            }
        ],
        "scatterpolargl": [
            {
                "marker": {
                    "colorbar": {
                        "outlinewidth": 0,
                        "ticks": ""
                    }
                },
                "type": "scatterpolargl"
            }
        ],
        "scatterpolar": [
            {
                "marker": {
                    "colorbar": {
                        "outlinewidth": 0,
                        "ticks": ""
                    }
                },
                "type": "scatterpolar"
            }
        ],
        "scatter": [
            {
                "marker": {
                    "line": {
                        "color": "#283442"
                    }
                },
                "type": "scatter"
            }
        ],
        "scatterternary": [
            {
                "marker": {
                    "colorbar": {
                        "outlinewidth": 0,
                        "ticks": ""
                    }
                },
                "type": "scatterternary"
            }
        ],
        "surface": [
            {
                "colorbar": {
                    "outlinewidth": 0,
                    "ticks": ""
                },
                "colorscale": [
                    [
                        0.0,
                        "#0d0887"
                    ],
                    [
                        0.1111111111111111,
                        "#46039f"
                    ],
                    [
                        0.2222222222222222,
                        "#7201a8"
                    ],
                    [
                        0.3333333333333333,
                        "#9c179e"
                    ],
                    [
                        0.4444444444444444,
                        "#bd3786"
                    ],
                    [
                        0.5555555555555556,
                        "#d8576b"
                    ],
                    [
                        0.6666666666666666,
                        "#ed7953"
                    ],
                    [
                        0.7777777777777778,
                        "#fb9f3a"
                    ],
                    [
                        0.8888888888888888,
                        "#fdca26"
                    ],
                    [
                        1.0,
                        "#f0f921"
                    ]
                ],
                "type": "surface"
            }
        ],
        "table": [
            {
                "cells": {
                    "fill": {
                        "color": "#506784"
                    },
                    "line": {
                        "color": "rgb(17,17,17)"
                    }
                },
                "header": {
                    "fill": {
                        "color": "#2a3f5f"
                    },
                    "line": {
                        "color": "rgb(17,17,17)"
                    }
                },
                "type": "table"
            }
        ]
    },
    "layout": {
        "annotationdefaults": {
            "arrowcolor": "#f2f5fa",
            "arrowhead": 0,
            "arrowwidth": 1
        },
        "autotypenumbers": "strict",
        "coloraxis": {
            "colorbar": {
                "outlinewidth": 0,
                "ticks": ""
            }
        },
        "colorscale": {
            "diverging": [
                [
                    0,
                    "#8e0152"
                ],
                [
                    0.1,
                    "#c51b7d"
                ],
                [
                    0.2,
                    "#de77ae"
                ],
                [
                    0.3,
                    "#f1b6da"
                ],
                [
                    0.4,
                    "#fde0ef"
                ],
                [
                    0.5,
                    "#f7f7f7"
                ],
                [
                    0.6,
                    "#e6f5d0"
                ],
                [
                    0.7,
                    "#b8e186"
                ],
                [
                    0.8,
                    "#7fbc41"
                ],
                [
                    0.9,
                    "#4d9221"
                ],
                [
                    1,
                    "#276419"
                ]
            ],
            "sequential": [
                [
                    0.0,
                    "#0d0887"
                ],
                [
                    0.1111111111111111,
                    "#46039f"
                ],
                [
                    0.2222222222222222,
                    "#7201a8"
                ],
                [
                    0.3333333333333333,
                    "#9c179e"
                ],
                [
                    0.4444444444444444,
                    "#bd3786"
                ],
                [
                    0.5555555555555556,
                    "#d8576b"
                ],
                [
                    0.6666666666666666,
                    "#ed7953"
                ],
                [
                    0.7777777777777778,
                    "#fb9f3a"
                ],
                [
                    0.8888888888888888,
                    "#fdca26"
                ],
                [
                    1.0,
                    "#f0f921"
                ]
            ],
            "sequentialminus": [
                [
                    0.0,
                    "#0d0887"
                ],
                [
                    0.1111111111111111,
                    "#46039f"
                ],
                [
                    0.2222222222222222,
                    "#7201a8"
                ],
                [
                    0.3333333333333333,
                    "#9c179e"
                ],
                [
                    0.4444444444444444,
                    "#bd3786"
                ],
                [
                    0.5555555555555556,
                    "#d8576b"
                ],
                [
                    0.6666666666666666,
                    "#ed7953"
                ],
                [
                    0.7777777777777778,
                    "#fb9f3a"
                ],
                [
                    0.8888888888888888,
                    "#fdca26"
                ],
                [
                    1.0,
                    "#f0f921"
                ]
            ]
        },
        "colorway": [
            "#636efa",
            "#EF553B",
            "#00cc96",
            "#ab63fa",
            "#FFA15A",
            "#19d3f3",
            "#FF6692",
            "#B6E880",
            "#FF97FF",
            "#FECB52"
        ],
        "font": {
            "color": "#f2f5fa"
        },
        "geo": {
            "bgcolor": "rgb(17,17,17)",
            "lakecolor": "rgb(17,17,17)",
            "landcolor": "rgb(17,17,17)",
            "showlakes": true,
            "showland": true,
            "subunitcolor": "#506784"
        },
        "hoverlabel": {
            "align": "left"
        },
        "hovermode": "closest",
        "mapbox": {
            "style": "dark"
        },
        "paper_bgcolor": "rgb(17,17,17)",
        "plot_bgcolor": "rgb(17,17,17)",
        "polar": {
            "angularaxis": {
                "gridcolor": "#506784",
                "linecolor": "#506784",
                "ticks": ""
            },
            "bgcolor": "rgb(17,17,17)",
            "radialaxis": {
                "gridcolor": "#506784",
                "linecolor": "#506784",
                "ticks": ""
            }
        },
        "scene": {
            "xaxis": {
                "backgroundcolor": "rgb(17,17,17)",
                "gridcolor": "#506784",
                "gridwidth": 2,
                "linecolor": "#506784",
                "showbackground": true,
                "ticks": "",
                "zerolinecolor": "#C8D4E3"
            },
            "yaxis": {
                "backgroundcolor": "rgb(17,17,17)",
                "gridcolor": "#506784",
                "gridwidth": 2,
                "linecolor": "#506784",
                "showbackground": true,
                "ticks": "",
                "zerolinecolor": "#C8D4E3"
            },
            "zaxis": {
                "backgroundcolor": "rgb(17,17,17)",
                "gridcolor": "#506784",
                "gridwidth": 2,
                "linecolor": "#506784",
                "showbackground": true,
                "ticks": "",
                "zerolinecolor": "#C8D4E3"
            }
        },
        "shapedefaults": {
            "line": {
                "color": "#f2f5fa"
            }
        },
        "sliderdefaults": {
            "bgcolor": "#C8D4E3",
            "bordercolor": "rgb(17,17,17)",
            "borderwidth": 1,
            "tickwidth": 0
        },
        "ternary": {
            "aaxis": {
                "gridcolor": "#506784",
                "linecolor": "#506784",
                "ticks": ""
            },
            "baxis": {
                "gridcolor": "#506784",
                "linecolor": "#506784",
                "ticks": ""
            },
            "bgcolor": "rgb(17,17,17)",
            "caxis": {
                "gridcolor": "#506784",
                "linecolor": "#506784",
                "ticks": ""
            }
        },
        "title": {
            "x": 0.05
        },
        "updatemenudefaults": {
            "bgcolor": "#506784",
            "borderwidth": 0
        },
        "xaxis": {
            "automargin": true,
            "gridcolor": "#283442",
            "linecolor": "#506784",
            "ticks": "",
            "title": {
                "standoff": 15
            },
            "zerolinecolor": "#283442",
            "zerolinewidth": 2
        },
        "yaxis": {
            "automargin": true,
            "gridcolor": "#283442",
            "linecolor": "#506784",
            "ticks": "",
            "title": {
                "standoff": 15
            },
            "zerolinecolor": "#283442",
            "zerolinewidth": 2
        }
    }
}
