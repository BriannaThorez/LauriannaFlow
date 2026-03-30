import { Object3DNode } from '@react-three/fiber';
import { ShaderMaterial } from 'three';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      shapeSDFMaterial: Object3DNode<ShaderMaterial, typeof ShaderMaterial>;
    }
  }
}
