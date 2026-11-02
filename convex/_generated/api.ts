/* Offline API typing. convex dev replaces this file with generated bindings. */
import { anyApi } from "convex/server";
import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
import type * as automation from "../automation";
import type * as delivery from "../delivery";
import type * as loans from "../loans";
import type * as members from "../members";
import type * as tools from "../tools";
const fullApi = anyApi as unknown as ApiFromModules<{automation:typeof automation;delivery:typeof delivery;loans:typeof loans;members:typeof members;tools:typeof tools}>;
export const api:FilterApi<typeof fullApi,FunctionReference<"query"|"mutation"|"action","public">>=anyApi as unknown as FilterApi<typeof fullApi,FunctionReference<"query"|"mutation"|"action","public">>;
export const internal:FilterApi<typeof fullApi,FunctionReference<"query"|"mutation"|"action","internal">>=anyApi as unknown as FilterApi<typeof fullApi,FunctionReference<"query"|"mutation"|"action","internal">>;
