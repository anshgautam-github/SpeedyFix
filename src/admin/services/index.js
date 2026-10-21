import { IS_DEMO } from '../../portal/config';
import { demoAdminAdapter } from './demoAdapter';
import { remoteAdminAdapter } from './remoteAdapter';

/** Admin screens import `adminServices` only. Authentication is shared with the other portals. */
export const adminServices = IS_DEMO ? demoAdminAdapter : remoteAdminAdapter;
export const adminDemo = adminServices.demo;
