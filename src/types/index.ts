import {
  Supply as PrismaSupply,
  Request as PrismaRequest,
  RequestStatus,
} from "@prisma/client";

export interface Supply extends PrismaSupply {}

export interface Request extends PrismaRequest {
  supply: {
    name: string;
    quantity: number;
  };
  user: {
    username: string;
  };
}

export interface RequestWithSupply extends Request {
  supply: Supply;
}
