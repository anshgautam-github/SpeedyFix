import { IS_DEMO } from '../../portal/config';
import { demoCenterAdapter } from './demoAdapter';
import { remoteCenterAdapter } from './remoteAdapter';

/** Service-center screens import `centerServices` only. Authentication is shared with the other portals. */
export const centerServices = IS_DEMO ? demoCenterAdapter : remoteCenterAdapter;
export const centerDemo = centerServices.demo;
