
using UUIDs, JSON3, OrderedCollections,Base64
abstract type Geometry end

m2a =  1/6.3781e6 


function animate_sc(sc::Spacecraft,sol)
    #earthjpg = read("earth.jpg")
    #earthint = base64encode(earthjpg)
    i_earth = OrderedDict(
        "uuid" => string(uuid1()),
        #"url" => "https://i.imgur.com/kFoWvzw.jpg",
        "url" => "https://i.imgur.com/n6rwQ2M.jpeg",
    )
    i_earthbump = OrderedDict(
        "uuid" => string(uuid1()),
        "url" => "https://i.imgur.com/WwRc40b.jpg",
    )
    t_earthbump = OrderedDict(
        "uuid" => string(uuid1()),
        "image" => i_earthbump["uuid"]
    )

    t_earth = OrderedDict(
        	"uuid" => string(uuid1()),			
			"image" => i_earth["uuid"],		            			
    )

    g_earth = OrderedDict(
        "name" => "earth.geometry",
        "uuid" => string(uuid1()),
        "type" => "SphereGeometry",      
        "radius"  =>  6.3781e6 *m2a,
        "widthSegments" => 64,
        "heightSegments" => 64,
    )

    
    m_earth = OrderedDict(
        "name" => "earth.material",
        "uuid" => string(uuid1()),
        "type" => "MeshPhongMaterial",
        "color" => 16777215,
        "map" => t_earth["uuid"],
        "bumpMap" => t_earthbump["uuid"],
        "bumpScale"=> 0.01,
    )

    earth = OrderedDict(
        "uuid" => string(uuid1()),
        "type" => "Mesh",
        "name" => "Earth",        
        "up"=> [0,1,0],
        "geometry"=> g_earth["uuid"],
        "material"=> m_earth["uuid"],
    )

    g_galaxy = OrderedDict(
        "name" => "galaxy.geometry",
        "uuid" => string(uuid1()),
        "type" => "SphereGeometry",      
        "radius"  => 500,
    )

    i_galaxy = OrderedDict(
        "uuid" => string(uuid1()),
        "url" => "https://i.imgur.com/5NYZNs1.jpeg"
    )
    #https://svs.gsfc.nasa.gov/4851
    t_galaxy = OrderedDict(
        	"uuid" => string(uuid1()),			
			"image" => i_galaxy["uuid"],		            			
    )

    m_galaxy = OrderedDict(
        "name" => "galaxy.material",
        "uuid" => string(uuid1()),
        "type" => "MeshBasicMaterial",
        "color" => 8224125,
        "map" => t_galaxy["uuid"],
        "side" => 1,
        "shininess" => 0,
    )

    galaxy = OrderedDict(
        "uuid" => string(uuid1()),
        "type" => "Mesh",
        "name" => "Galaxy",        
        "up"=> [0,1,0],
        "geometry"=> g_galaxy["uuid"],
        "material"=> m_galaxy["uuid"],
    )
    camera = OrderedDict(
        "uuid"=> string(uuid1()),
        "type"=> "PerspectiveCamera",
        "name"=> "PerspectiveCamera",
        "matrix"=> [0,0,-1,0,0,1,0,0,1,0,0,0, (1.5 +10*m2a) ,0,0,1],
        "up"=> [0,1,0],
        "fov"=> 30,
        "zoom"=> 1,
        "near"=> 1e-9,
        "far"=> 1,
    )

    scene = OrderedDict(
        "name" => "Scene",
        "uuid" => string(uuid1()),
        "background" => OrderedDict("color"=>0),
        "animations" => [],
        "children" => [
            OrderedDict(
                "name" => "Directional Light",
                "uuid" => string(uuid1()),
                "type" => "DirectionalLight",
                "position" => [1, 0, 0],
                "intensity" => 2
            ),
            OrderedDict(
                "name" => "Ambient Light",
                "uuid"=> string(uuid1()),
                "type"=> "AmbientLight",
                "intensity"=> 0.1
            ),            
            earth,
            galaxy,
            camera
        ]
    )

    D = OrderedDict(
        "metadata" => OrderedDict(
            "generator" => "JSAT",
            "type" => "Object"
        ),
        "geometries" => [g_earth,g_galaxy],
        "materials" => [m_earth,m_galaxy],
        "shapes" => Vector{Dict}(undef, 0),
        "object" => scene,
        "animations" => Vector{Dict}(undef, 0),
        "images" => [i_earth,i_galaxy,i_earthbump],
        "textures" => [t_earth,t_galaxy,t_earthbump],
    )

    append_sc!(D, sc.body, sol)

    io = open("jsat_animation.json", "w")
    JSON3.pretty(io, D)
    close(io)
end

function append_sc!(D, C::Body,sol)#;kwargs...)
    material = OrderedDict(
        "name" => "$(C.name).materials",
        "uuid" => string(uuid1()),
        "type" => "MeshPhongMaterial",
        "color" => 12632256,

    )

    geometry = OrderedDict(
        "name" => "$(C.name).geometry",
        "uuid" => string(uuid1()),
        "type" => "BoxGeometry",
        "width" => 0.01,#3*m2a,
        "height" => 0.01,#3*m2a,
        "depth" => 0.02,#5*m2a,
    )

    mesh_uuid = string(uuid1())
    mesh = OrderedDict(
        "name" => "$(C.name).mesh",
        "uuid" => mesh_uuid,
        "type" => "Mesh",
        "geometry" => geometry["uuid"],
        "material" => material["uuid"],
        "position" => [1.5,0,0], #replace with r when ready
        "quaternion" => C.q
    )

    q = sol[C.sys.q]
    k_q = [OrderedDict("time" => sol.t[i], "value" => q[i]) for i in eachindex(sol.t)]
    r = sol[C.sys.r]
    k_r = [OrderedDict("time" => sol.t[i], "value" => r[i]*m2a) for i in eachindex(sol.t)]
    qtrack = OrderedDict(
        "name" => "$(mesh_uuid).quaternion",
        "type" => "quaternion",
        "keys" => k_q,
        "uuid" => string(uuid1())
    )
    rtrack = OrderedDict(
        "name" => "$(mesh_uuid).position",
        "type" => "vector3",
        "keys" => k_r,
        "uuid" => string(uuid1())
    )

    animation_uuid = string(uuid1())
    animation = OrderedDict(
        "uuid" => animation_uuid,
        "tracks" => [qtrack,rtrack],
    )
    #@infiltrate
    append!(D["geometries"], [geometry])
    append!(D["materials"], [material])    
    append!(D["animations"], [animation])
    append!(D["object"]["children"], [mesh])
    append!(D["object"]["animations"], [animation_uuid])
end