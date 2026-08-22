import { environment } from "@/src/config/environment";
import { PublicAccountGateway } from "@/src/features/auth/account/PublicAccountGateway";
import { FetchPublicAccountGateway } from "@/src/infrastructure/auth/FetchPublicAccountGateway";

export const createPublicAccountGateway = (): PublicAccountGateway =>
  new FetchPublicAccountGateway(environment.apiBaseUrl);
