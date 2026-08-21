jest.mock("ioredis");
import Redis from "ioredis";

beforeEach(() => {
  (Redis as any).reset();
});
