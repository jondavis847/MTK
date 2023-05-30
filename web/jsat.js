function init() {
    document.getElementById('connect_button').onclick = function () { connect_to_jsat('connect'); };
    document.getElementById('simulate_button').onclick = function () { connect_to_jsat('simulate'); };
    document.getElementById('plot_state').onclick = function () { connect_to_jsat('plot'); };
}
window.onload = init;


function connect_to_jsat(type) {
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
                        for (i of data.sort()) {
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
            sc = get_form_data()
            socket.send(JSON.stringify({ "type": "simulate", "data": {"sc": sc }}))            
            break;
        case 'plot':
            var select = document.getElementById("state_select");            
            socket.send(JSON.stringify({ "type": "plot", "data": select.value }))
            break;
    }
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
        template: plotly_dark,
    };
    console.log("Plotting")
    Plotly.newPlot("plots", data, layout, { scrollZoom: true });
}

function get_form_data() {
    var sc = {
        body: {
            name: document.getElementById("body_name").value,
            ixx: document.getElementById("ixx").value,
            iyy: document.getElementById("iyy").value,
            izz: document.getElementById("izz").value,
            ixy: document.getElementById("ixy").value,
            ixz: document.getElementById("ixz").value,
            iyz: document.getElementById("iyz").value,
            q: document.getElementById("quat").value,
            w: document.getElementById("rate").value,
            r: document.getElementById("pos").value,
            v: document.getElementById("vel").value,
        },
        thrusters: [
            {
                name: document.getElementById("thr1_name").value,
                F: document.getElementById("thr1_F").value,
                r: document.getElementById("thr1_r").value,
                R: document.getElementById("thr1_R").value,
            },
            {
                name: document.getElementById("thr2_name").value,
                F: document.getElementById("thr2_F").value,
                r: document.getElementById("thr2_r").value,
                R: document.getElementById("thr2_R").value,
            },
            {
                name: document.getElementById("thr3_name").value,
                F: document.getElementById("thr3_F").value,
                r: document.getElementById("thr3_r").value,
                R: document.getElementById("thr3_R").value,
            },
            {
                name: document.getElementById("thr4_name").value,
                F: document.getElementById("thr4_F").value,
                r: document.getElementById("thr4_r").value,
                R: document.getElementById("thr4_R").value,
            },
        ],
        reactionwheels: [{
            name: document.getElementById("rw1_name").value,
            J: document.getElementById("rw1_J").value,
            kt: document.getElementById("rw1_kt").value,
            a: document.getElementById("rw1_a").value,
            w: document.getElementById("rw1_w").value,
        },
        {
            name: document.getElementById("rw2_name").value,
            J: document.getElementById("rw2_J").value,
            kt: document.getElementById("rw2_kt").value,
            a: document.getElementById("rw2_a").value,
            w: document.getElementById("rw2_w").value,
        },
        {
            name: document.getElementById("rw3_name").value,
            J: document.getElementById("rw3_J").value,
            kt: document.getElementById("rw3_kt").value,
            a: document.getElementById("rw3_a").value,
            w: document.getElementById("rw3_w").value,
        }],
        iru: {
            name: document.getElementById("iru_name").value,
            sigma: document.getElementById("iru_noise").value,
        },
        controller: {
            name: document.getElementById("controller").value,
        },
    }
    return sc;
}

const plotly_dark = {
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