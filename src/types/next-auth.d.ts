import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      organizationId: number;
      defaultBranchId: number | null;
      allowedBranches: number[];
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    organizationId: number;
    defaultBranchId: number | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    organizationId: number;
    defaultBranchId: number | null;
    allowedBranches: number[];
  }
}































