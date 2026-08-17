import * as THREE from 'three';

/**
 * Walk up the object tree to find the ancestor tagged with a `cubieId` in userData.
 */
export function findCubieAncestor(object: THREE.Object3D | null): {
  cubieId: number;
  group: THREE.Object3D;
} | null {
  let cur: THREE.Object3D | null = object;
  while (cur) {
    const id = cur.userData?.cubieId;
    if (typeof id === 'number') return { cubieId: id, group: cur };
    cur = cur.parent;
  }
  return null;
}

const tmpQuat = new THREE.Quaternion();

/**
 * Convert a face normal from an object's local space to world space using its
 * world quaternion (rotations only — normals ignore translation and scale).
 */
export function normalToWorld(
  object: THREE.Object3D,
  normalLocal: THREE.Vector3,
  out: THREE.Vector3,
): THREE.Vector3 {
  object.getWorldQuaternion(tmpQuat);
  return out.copy(normalLocal).applyQuaternion(tmpQuat).normalize();
}

/**
 * Given normalized device coords, a camera, and a world-space plane
 * (point + normal), compute where the ray from the camera through the pointer
 * intersects the plane. Returns the same `out` on success, null if parallel.
 */
export function raycastToPlane(
  ndc: THREE.Vector2,
  camera: THREE.Camera,
  planePoint: THREE.Vector3,
  planeNormal: THREE.Vector3,
  raycaster: THREE.Raycaster,
  plane: THREE.Plane,
  out: THREE.Vector3,
): THREE.Vector3 | null {
  raycaster.setFromCamera(ndc, camera);
  plane.setFromNormalAndCoplanarPoint(planeNormal, planePoint);
  const hit = raycaster.ray.intersectPlane(plane, out);
  return hit ?? null;
}
