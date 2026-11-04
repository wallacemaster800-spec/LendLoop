/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as automation from "../automation.js";
import type * as crons from "../crons.js";
import type * as delivery from "../delivery.js";
import type * as http from "../http.js";
import type * as loans from "../loans.js";
import type * as members from "../members.js";
import type * as model from "../model.js";
import type * as photoHttp from "../photoHttp.js";
import type * as photos from "../photos.js";
import type * as tools from "../tools.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";

const fullApi: ApiFromModules<{
  automation: typeof automation;
  crons: typeof crons;
  delivery: typeof delivery;
  http: typeof http;
  loans: typeof loans;
  members: typeof members;
  model: typeof model;
  photoHttp: typeof photoHttp;
  photos: typeof photos;
  tools: typeof tools;
}> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
> = anyApi as any;

export const components = componentsGeneric() as unknown as {};
