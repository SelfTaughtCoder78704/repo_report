/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as encryption from "../encryption.js";
import type * as github from "../github.js";
import type * as githubUtils from "../githubUtils.js";
import type * as http from "../http.js";
import type * as prSummaries from "../prSummaries.js";
import type * as providerActions from "../providerActions.js";
import type * as providers from "../providers.js";
import type * as pullRequests from "../pullRequests.js";
import type * as repos from "../repos.js";
import type * as reposActions from "../reposActions.js";
import type * as summarize from "../summarize.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  encryption: typeof encryption;
  github: typeof github;
  githubUtils: typeof githubUtils;
  http: typeof http;
  prSummaries: typeof prSummaries;
  providerActions: typeof providerActions;
  providers: typeof providers;
  pullRequests: typeof pullRequests;
  repos: typeof repos;
  reposActions: typeof reposActions;
  summarize: typeof summarize;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
