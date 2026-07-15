import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfileTool from "./tools/get-my-profile";
import listMyBookingsTool from "./tools/list-my-bookings";
import listMyListingsTool from "./tools/list-my-listings";
import searchApprovedListingsTool from "./tools/search-approved-listings";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "spotvault-mcp",
  title: "SpotVault MCP",
  version: "0.1.0",
  instructions:
    "Tools for SpotVault, a Quebec parking and storage marketplace. Use these tools only after the user has connected with OAuth. RLS and app policies decide which rows the signed-in user can access.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getMyProfileTool,
    searchApprovedListingsTool,
    listMyListingsTool,
    listMyBookingsTool,
  ],
});