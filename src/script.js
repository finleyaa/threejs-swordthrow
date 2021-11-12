import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as dat from 'dat.gui'

const gui = new dat.GUI()

const params = {
  gravity: 0.42
}

gui.add(params, 'gravity', 0, 5, 0.001)

const canvas = document.querySelector('canvas.webgl')

const scene = new THREE.Scene()

let sword
const swordPoints = []
const swordStickLength = 1.67


const gltfLoader = new GLTFLoader()
gltfLoader.load('./sword.gltf', (gltf) => {
  sword = gltf.scene.children[0]
  scene.add(sword)

  const ambientLight = new THREE.AmbientLight(0xffffff, 2)
  scene.add(ambientLight)
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.target = sword
  scene.add(directionalLight.target)
  scene.add(directionalLight)

  // points for swinging
  swordPoints.push({
    position: sword.position.clone(),
    previousPosition: null,
    locked: true,
    physics: false
  })
  swordPoints.push({
    position: new THREE.Vector3().addVectors(sword.position, new THREE.Vector3(0, -swordStickLength, 0)),
    previousPosition: null,
    locked: false,
    physics: true
  })

  const basicMaterial = new THREE.MeshBasicMaterial(0xffffff)

  swordPoints.forEach(point => {
    point.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 16),
      basicMaterial
    )
    point.mesh.position.copy(point.position)
    // scene.add(point.mesh)
  })
})



/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

window.addEventListener('resize', () => {
  // Update sizes
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight

  // Update camera
  camera.left = sizes.width * -0.005
  camera.right = sizes.width * 0.005
  camera.top = sizes.height * 0.005
  camera.bottom = sizes.height * -0.005
  camera.updateProjectionMatrix()

  // Update renderer
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

let holdingSword = false

window.addEventListener('mousedown', (e) => {
  const touchVec = new THREE.Vector3(
    (e.clientX / window.innerWidth) * 2 - 1,
    -(e.clientY / window.innerHeight) * 2 + 1,
    0.5
  )
  touchVec.unproject(camera)
  touchVec.z = 0

  if (sword) {
    const distanceToSword = new THREE.Vector3().subVectors(touchVec, sword.position)
    if (distanceToSword.length() < swordStickLength) {
      holdingSword = true

      swordPoints[0].physics = false
      swordPoints[0].locked = true
      swordPoints[1].physics = true
      swordPoints[1].locked = false
    }
  }
})

window.addEventListener('mousemove', (e) => {
  if (holdingSword) {
    const touchVec = new THREE.Vector3(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1,
      0.5
    )
    touchVec.unproject(camera)
    touchVec.z = 0

    swordPoints[0].physics = false
    swordPoints[0].locked = true
    swordPoints[1].physics = true
    swordPoints[1].locked = false

    sword.position.copy(touchVec)
    swordPoints[0].position.copy(sword.position)
  }
})

window.addEventListener('mouseup', () => {
  holdingSword = false

  swordPoints[0].physics = true
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.OrthographicCamera(sizes.width * -0.005, sizes.width * 0.005, sizes.height * 0.005, sizes.height * -0.005)
camera.position.z = 3
scene.add(camera)

// Controls
// const controls = new OrbitControls(camera, canvas)
// controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor(0xa1ffcb)

/**
 * Animate
 */
const clock = new THREE.Clock()
let previousElapsedTime = 0

const tick = () => {
  const elapsedTime = clock.getElapsedTime()
  const deltaTime = elapsedTime - previousElapsedTime
  previousElapsedTime = elapsedTime

  // update points
  swordPoints.forEach(p => {
    const positionBeforeUpdate = p.position.clone()
    if (p.physics) {
      const length = new THREE.Vector3().subVectors(swordPoints[0].position, swordPoints[1].position).length()
      if (p.previousPosition) {
        p.position.add(new THREE.Vector3().subVectors(p.position, p.previousPosition))
      }
      p.position.add(new THREE.Vector3(0, -1, 0).multiplyScalar(params.gravity * deltaTime))
    }
    p.previousPosition = positionBeforeUpdate.clone()

    p.mesh.position.copy(p.position)
  })

  if (swordPoints.length > 0) {
    for (let i = 0; i < 50; i++) {
      const dist = new THREE.Vector3().subVectors(swordPoints[0].position, swordPoints[1].position).length()
      const error = Math.abs(dist - swordStickLength)

      const changeDir = new THREE.Vector3()
      if (dist > swordStickLength) {
        changeDir.subVectors(swordPoints[0].position, swordPoints[1].position).normalize()
      } else if (dist < swordStickLength) {
        changeDir.subVectors(swordPoints[1].position, swordPoints[0].position).normalize()
      }

      const changeAmount = changeDir.clone().multiplyScalar(error)
      swordPoints[1].position.add(changeAmount)
    }
    swordPoints.forEach(p => {
      p.mesh.position.copy(p.position)
    })
    const stickCentre = new THREE.Vector3().addVectors(swordPoints[0].position, swordPoints[1].position).divideScalar(2)
    const stickDir = new THREE.Vector3().subVectors(swordPoints[0].position, swordPoints[1].position).normalize()
    let swordRotation = Math.atan2(stickDir.y, stickDir.x)
    if (swordRotation < 0) {
      swordRotation += Math.PI * 2
    }
    sword.rotation.z = swordRotation - Math.PI / 2

    if (stickCentre.x > camera.right || stickCentre.x < camera.left || stickCentre.y > camera.top || stickCentre.y < camera.bottom) {
      swordPoints[0].physics = false
      swordPoints[1].physics = false
      swordPoints[0].locked = true
      swordPoints[1].locked = true
    }

    console.log(swordPoints[1].position)
  }

  if (swordPoints[0]) {
    sword.position.copy(swordPoints[0].position)
  }

  // Render
  renderer.render(scene, camera)

  // Call tick again on the next frame
  window.requestAnimationFrame(tick)
}

tick()
