import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 30);
const renderer = new THREE.WebGLRenderer(
	{
		antialias:true
	}
);
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
const controls = new OrbitControls( camera, renderer.domElement );

// Lighting
const directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
directionalLight.position.x = 10;
directionalLight.position.y = 0;
directionalLight.position.z = 0;
scene.add(directionalLight );

const light = new THREE.AmbientLight(0x303030);
scene.add(light)

//Space
const space_geometry = new THREE.SphereGeometry(20, 128, 64 );
const space_txtr = new THREE.TextureLoader().load('artifacts/starmap_2020_4k_print.jpg')
const space_material = new THREE.MeshBasicMaterial({map: space_txtr, side: 1});
space_material.color.r = 0.05;
space_material.color.b = 0.05;
space_material.color.g = 0.05;
const space = new THREE.Mesh( space_geometry, space_material);
space.name = 'space'
//scene.add( space );

// Earth
const earth_geometry = new THREE.SphereGeometry(1 , 64, 32 );
const earth_txtr = new THREE.TextureLoader().load('artifacts/8081_earthmap4k.jpg');
//earth_txtr.anisotropy = renderer.capabilities.getMaxAnisotropy();
const earth_material = new THREE.MeshPhongMaterial({map: earth_txtr});
const earth = new THREE.Mesh( earth_geometry, earth_material );
earth.name = 'earth'
scene.add( earth );

// Sun
const sun_geometry = new THREE.SphereGeometry(0.1 , 64, 32 );
const sun_material = new THREE.MeshBasicMaterial({color: 0xffffdd});
const sun = new THREE.Mesh( sun_geometry, sun_material );
sun.position.x = 10;
sun.position.y = 0;
sun.position.z = 0;
sun.name = 'sun'
scene.add( sun );

console.log(scene)

camera.position.z = 6;

function animate() {
	requestAnimationFrame( animate );

	earth.rotation.x += 0;
	earth.rotation.y += 0.001;

	renderer.render( scene, camera );
}

animate();