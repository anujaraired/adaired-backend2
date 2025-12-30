import { v4 as uuidv4 } from "uuid";

export function generateUserId() {
  const randomString = uuidv4().split("-")[0];
  const customId = `guest-${randomString}`;
  return customId;
}
