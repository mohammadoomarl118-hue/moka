import { useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

function CupModel() {
  const { scene } = useGLTF('/models/paper_coffee_cup.glb')

  const groupRef = useRef(null)
  const targetRotation = useRef({
    x: 0,
    y: 0,
    z: 0,
  })

  useEffect(() => {
    if (!scene || !groupRef.current) return

    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    const maxSize = Math.max(size.x, size.y, size.z)

    if (maxSize > 0) {
      // الكوب صغير
      const scale = 1.8 / maxSize

      groupRef.current.scale.setScalar(scale)

      groupRef.current.position.set(
        -center.x * scale,
        -center.y * scale,
        -center.z * scale
      )
    }

    const handleScroll = () => {
      const scrollY = window.scrollY
      const viewportHeight = window.innerHeight

      // نحسب تقدم السكرول لأول شاشة
      const progress = THREE.MathUtils.clamp(
        scrollY / viewportHeight,
        0,
        1
      )

      // دوران الكوب على جنبه
      targetRotation.current.x =
        progress * Math.PI * 0.45

      targetRotation.current.y =
        progress * Math.PI * 1.2

      targetRotation.current.z =
        progress * Math.PI * 0.9
    }

    handleScroll()

    window.addEventListener('scroll', handleScroll, {
      passive: true,
    })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [scene])

  useFrame(() => {
    if (!groupRef.current) return

    // حركة ناعمة بدل القفز
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetRotation.current.x,
      0.08
    )

    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotation.current.y,
      0.08
    )

    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      targetRotation.current.z,
      0.08
    )
  })

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  )
}

export default function HeroCup() {
  return (
    <div className="hero-cup-3d">
      <Canvas
        camera={{
          position: [0, 0, 5],
          fov: 40,
        }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
        }}
      >
        <ambientLight intensity={1.6} />

        <directionalLight
          position={[4, 6, 5]}
          intensity={4}
        />

        <directionalLight
          position={[-4, 2, -3]}
          intensity={2}
        />

        <Environment preset="studio" />

        <CupModel />
      </Canvas>
    </div>
  )
}

useGLTF.preload('/models/paper_coffee_cup.glb')