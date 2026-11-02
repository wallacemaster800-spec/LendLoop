import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.interval("Deliver pending notifications", { minutes: 1 }, internal.delivery.dispatch, {});
export default crons;
