import { IS_DEMO } from '../config';
import { demoAdapter } from './demoAdapter';
import { remoteAdapter } from './remoteAdapter';

/** Screens import `services` only. Swapping demo for real data never touches a component. */
export const services = IS_DEMO ? demoAdapter : remoteAdapter;
/** Simulation controls. null outside demo mode. */
export const demoTools = services.demo;
