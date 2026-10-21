import { IS_DEMO } from '../../portal/config';
import { demoDriverAdapter } from './demoAdapter';
import { remoteDriverAdapter } from './remoteAdapter';

/** Driver screens import `driverServices` only. Authentication is shared with the customer portal (portal/services). */
export const driverServices = IS_DEMO ? demoDriverAdapter : remoteDriverAdapter;
export const driverDemo = driverServices.demo;
